"""
RAG Query Processing Service
Handles query embedding, semantic search, context assembly, and response generation
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
import asyncio
from datetime import datetime
import re

import openai
from langdetect import detect, LangDetectException
from pydantic import BaseModel

from .embedding_service import EmbeddingService

logger = logging.getLogger(__name__)

class ConversationMessage(BaseModel):
    """Single message in conversation"""
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime
    sources: Optional[List[str]] = None

class ConversationContext(BaseModel):
    """Conversation context for maintaining history"""
    session_id: str
    user_id: str
    messages: List[ConversationMessage]
    max_history: int = 3

class UserContext(BaseModel):
    """User context for personalized responses"""
    user_id: str
    grade: int
    subject: Optional[str] = None
    language_preference: str = "bangla"

class RAGResponse(BaseModel):
    """Response from RAG system"""
    answer: str
    sources: List[Dict[str, Any]]
    language: str
    confidence_score: float
    context_used: List[str]
    processing_time: float

class QueryProcessor:
    """Main RAG query processing service"""
    
    def __init__(self, embedding_service: EmbeddingService, openai_api_key: str):
        self.embedding_service = embedding_service
        self.openai_client = openai.OpenAI(api_key=openai_api_key)
        
        # System prompts for different scenarios
        self.system_prompts = {
            "bangla": """তুমি একজন সহায়ক AI শিক্ষক যিনি বাংলাদেশের NCTB পাঠ্যক্রম অনুসরণ করেন। 
তোমার কাজ হল শিক্ষার্থীদের বিষয়বস্তু বুঝতে সাহায্য করা, ধাপে ধাপে ব্যাখ্যা প্রদান করা এবং 
বাংলাদেশের প্রেক্ষাপটে প্রাসঙ্গিক উদাহরণ দেওয়া। সবসময় সঠিক এবং শিক্ষামূলক তথ্য প্রদান করো।""",
            
            "english": """You are a helpful AI tutor following the Bangladesh NCTB curriculum. 
Your role is to help students understand concepts, provide step-by-step explanations, and 
give examples relevant to the Bangladesh context. Always provide accurate and educational information."""
        }
    
    def detect_query_language(self, query: str) -> str:
        """
        Detect language of query (Bangla or English)
        
        Args:
            query: User query text
            
        Returns:
            'bangla' or 'english'
        """
        try:
            # Use langdetect library
            detected = detect(query)
            
            # Map language codes
            if detected == 'bn':
                return 'bangla'
            elif detected == 'en':
                return 'english'
            else:
                # Fallback: check for Bangla Unicode characters
                bangla_chars = len(re.findall(r'[\u0980-\u09FF]', query))
                if bangla_chars > 0:
                    return 'bangla'
                return 'english'
                
        except LangDetectException:
            # Fallback to character-based detection
            bangla_chars = len(re.findall(r'[\u0980-\u09FF]', query))
            english_chars = len(re.findall(r'[a-zA-Z]', query))
            
            if bangla_chars > english_chars:
                return 'bangla'
            return 'english'
    
    def extract_conversation_context(
        self, 
        conversation: ConversationContext
    ) -> str:
        """
        Extract relevant context from conversation history
        
        Args:
            conversation: Conversation context with message history
            
        Returns:
            Formatted conversation context string
        """
        if not conversation.messages:
            return ""
        
        # Get last N messages (default 3)
        recent_messages = conversation.messages[-conversation.max_history:]
        
        context_parts = []
        for msg in recent_messages:
            role = "User" if msg.role == "user" else "Assistant"
            # Normalize whitespace: strip and replace internal newlines/tabs with spaces
            content = msg.content.strip()
            if content:  # Only include non-empty messages
                # Replace internal newlines and multiple whitespace with single spaces
                import re
                content = re.sub(r'\s+', ' ', content)
                context_parts.append(f"{role}: {content}")
        
        return "\n".join(context_parts)
    
    async def retrieve_relevant_context(
        self,
        query: str,
        user_context: UserContext,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Retrieve relevant document chunks from vector database
        
        Args:
            query: User query
            user_context: User context for filtering
            top_k: Number of chunks to retrieve
            
        Returns:
            List of relevant document chunks with metadata
        """
        try:
            # Search for similar chunks
            results = await self.embedding_service.search_similar_chunks(
                query=query,
                subject=user_context.subject,
                grade=user_context.grade,
                top_k=top_k,
                score_threshold=0.7
            )
            
            return results
            
        except Exception as e:
            logger.error(f"Context retrieval failed: {e}")
            return []
    
    def assemble_context_for_prompt(
        self,
        retrieved_chunks: List[Dict[str, Any]],
        max_context_length: int = 3000
    ) -> Tuple[str, List[str]]:
        """
        Assemble retrieved chunks into context for prompt
        
        Args:
            retrieved_chunks: List of retrieved document chunks
            max_context_length: Maximum context length in characters
            
        Returns:
            Tuple of (assembled_context, source_ids)
        """
        context_parts = []
        source_ids = []
        current_length = 0
        
        for i, chunk in enumerate(retrieved_chunks, 1):
            metadata = chunk.get('metadata', {})
            
            # Get text content from metadata (stored during upload)
            # In production, you'd fetch the actual text from MongoDB using content_id
            content_id = chunk.get('content_id', '')
            
            # Format context piece with source information
            source_info = f"[Source {i}: {metadata.get('textbook_name', 'Unknown')}, Page {metadata.get('page_number', 'N/A')}]"
            
            # For now, we'll use a placeholder since we don't have the actual text
            # In production, fetch from MongoDB using content_id
            context_piece = f"{source_info}\n(Content from {metadata.get('subject', 'Unknown')} - {metadata.get('topic', 'Unknown')})\n"
            
            # Check if adding this would exceed limit
            if current_length + len(context_piece) > max_context_length:
                break
            
            context_parts.append(context_piece)
            source_ids.append(content_id)
            current_length += len(context_piece)
        
        assembled_context = "\n\n".join(context_parts)
        return assembled_context, source_ids
    
    def build_prompt(
        self,
        query: str,
        context: str,
        conversation_history: str,
        language: str,
        user_context: UserContext
    ) -> List[Dict[str, str]]:
        """
        Build prompt messages for GPT-4
        
        Args:
            query: User query
            context: Retrieved context from documents
            conversation_history: Previous conversation context
            language: Detected language
            user_context: User context
            
        Returns:
            List of message dictionaries for OpenAI API
        """
        # Select system prompt based on language
        system_prompt = self.system_prompts.get(language, self.system_prompts["english"])
        
        # Add user context to system prompt
        system_prompt += f"\n\nStudent Grade: {user_context.grade}"
        if user_context.subject:
            system_prompt += f"\nCurrent Subject: {user_context.subject}"
        
        # Build user message with context
        user_message = ""
        
        if conversation_history:
            user_message += f"Previous Conversation:\n{conversation_history}\n\n"
        
        if context:
            user_message += f"Relevant Information from NCTB Textbooks:\n{context}\n\n"
        
        user_message += f"Student Question: {query}\n\n"
        
        if language == "bangla":
            user_message += "অনুগ্রহ করে বাংলায় বিস্তারিত ব্যাখ্যা প্রদান করুন। প্রয়োজনে ধাপে ধাপে সমাধান দিন এবং বাংলাদেশের প্রেক্ষাপটে উদাহরণ ব্যবহার করুন।"
        else:
            user_message += "Please provide a detailed explanation in English. Include step-by-step solutions if needed and use examples relevant to Bangladesh context."
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
        
        return messages
    
    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 1000
    ) -> str:
        """
        Generate response using GPT-4
        
        Args:
            messages: Prompt messages
            temperature: Sampling temperature
            max_tokens: Maximum response length
            
        Returns:
            Generated response text
        """
        try:
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.openai_client.chat.completions.create(
                    model="gpt-4",
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens
                )
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Response generation failed: {e}")
            raise
    
    async def process_query(
        self,
        query: str,
        user_context: UserContext,
        conversation: Optional[ConversationContext] = None
    ) -> RAGResponse:
        """
        Main query processing pipeline
        
        Args:
            query: User query
            user_context: User context
            conversation: Optional conversation context
            
        Returns:
            RAG response with answer and metadata
        """
        start_time = datetime.now()
        
        try:
            # Step 1: Detect language
            detected_language = self.detect_query_language(query)
            logger.info(f"Detected language: {detected_language}")
            
            # Step 2: Retrieve relevant context
            retrieved_chunks = await self.retrieve_relevant_context(
                query=query,
                user_context=user_context,
                top_k=5
            )
            
            # Step 3: Assemble context
            assembled_context, source_ids = self.assemble_context_for_prompt(
                retrieved_chunks=retrieved_chunks
            )
            
            # Step 4: Extract conversation history
            conversation_history = ""
            if conversation:
                conversation_history = self.extract_conversation_context(conversation)
            
            # Step 5: Build prompt
            messages = self.build_prompt(
                query=query,
                context=assembled_context,
                conversation_history=conversation_history,
                language=detected_language,
                user_context=user_context
            )
            
            # Step 6: Generate response
            answer = await self.generate_response(messages)
            
            # Step 7: Calculate confidence score based on retrieval quality
            confidence_score = 0.0
            if retrieved_chunks:
                avg_score = sum(chunk.get('score', 0) for chunk in retrieved_chunks) / len(retrieved_chunks)
                confidence_score = min(avg_score, 1.0)
            
            # Step 8: Prepare sources for response
            sources = []
            for chunk in retrieved_chunks:
                metadata = chunk.get('metadata', {})
                sources.append({
                    'content_id': chunk.get('content_id', ''),
                    'textbook_name': metadata.get('textbook_name', 'Unknown'),
                    'page_number': metadata.get('page_number', 'N/A'),
                    'subject': metadata.get('subject', 'Unknown'),
                    'topic': metadata.get('topic', 'Unknown'),
                    'relevance_score': chunk.get('score', 0.0)
                })
            
            # Calculate processing time
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # Build response
            response = RAGResponse(
                answer=answer,
                sources=sources,
                language=detected_language,
                confidence_score=confidence_score,
                context_used=source_ids,
                processing_time=processing_time
            )
            
            logger.info(f"Query processed successfully in {processing_time:.2f}s")
            return response
            
        except Exception as e:
            logger.error(f"Query processing failed: {e}")
            raise
    
    def format_response_with_citations(self, response: RAGResponse) -> str:
        """
        Format response with source citations
        
        Args:
            response: RAG response
            
        Returns:
            Formatted response string with citations
        """
        formatted = response.answer + "\n\n"
        
        if response.sources:
            if response.language == "bangla":
                formatted += "তথ্যসূত্র:\n"
            else:
                formatted += "Sources:\n"
            
            for i, source in enumerate(response.sources, 1):
                formatted += f"{i}. {source['textbook_name']}, Page {source['page_number']}\n"
        
        return formatted