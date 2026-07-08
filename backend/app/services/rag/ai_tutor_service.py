"""
AI Tutor Service for ShikkhaSathi
Handles conversation with local LLM using Ollama and RAG context
"""

import logging
from typing import List, Dict, Any, Optional

# Optional imports for AI features
try:
    from langchain_ollama import ChatOllama
    from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
    LANGCHAIN_AVAILABLE = True
except ImportError:
    ChatOllama = None
    HumanMessage = None
    AIMessage = None
    SystemMessage = None
    LANGCHAIN_AVAILABLE = False

from .rag_service import get_rag_service

logger = logging.getLogger(__name__)

class AITutorService:
    def __init__(self, model_name: str = "llama3.2:1b"):
        """
        Initialize AI Tutor service with Ollama
        
        Args:
            model_name: Ollama model name to use
        """
        self.model_name = model_name
        
        if not LANGCHAIN_AVAILABLE:
            logger.warning("LangChain dependencies not available. AI Tutor will run in limited mode.")
            self.llm = None
            return
            
        self.llm = ChatOllama(model=model_name, temperature=0.7)
        
        # System prompt for the AI tutor
        self.system_prompt = """You are ShikkhaSathi, an AI tutor designed specifically for Bangladesh students in grades 6-12. You help students learn various subjects including Physics, Chemistry, Mathematics, Biology, Bangla, and English.

Your role:
- Provide clear, educational explanations appropriate for the student's grade level
- Use examples relevant to Bangladesh context when possible
- Encourage critical thinking and problem-solving
- Be patient and supportive
- Adapt your language to be accessible for both Bangla and English medium students
- Use the provided curriculum context to give accurate, curriculum-aligned answers

Guidelines:
- Always be encouraging and positive
- Break down complex concepts into simple steps
- Ask follow-up questions to check understanding
- Provide practical examples and applications
- If you don't know something, admit it and suggest how the student can find the answer
- Keep responses concise but comprehensive

Remember: You're here to guide learning, not just give answers. Help students understand the 'why' behind concepts."""

    async def chat(self, 
                   message: str, 
                   conversation_history: List[Dict[str, str]] = None,
                   subject: Optional[str] = None,
                   grade: Optional[int] = None) -> Dict[str, Any]:
        """
        Process a chat message and return AI tutor response
        
        Args:
            message: User's message
            conversation_history: Previous conversation messages
            subject: Current subject context
            grade: Student's grade level
            
        Returns:
            Dict containing response and metadata
        """
        try:
            # Get relevant context from RAG system
            rag_service = get_rag_service()
            if rag_service:
                context = await rag_service.get_context_for_query(message, subject)
            else:
                context = ""
            
            # Build conversation messages
            messages = [SystemMessage(content=self._build_system_prompt(subject, grade, context))]
            
            # Add conversation history
            if conversation_history:
                for msg in conversation_history[-10:]:  # Keep last 10 messages for context
                    if msg['role'] == 'user':
                        messages.append(HumanMessage(content=msg['content']))
                    elif msg['role'] == 'assistant':
                        messages.append(AIMessage(content=msg['content']))
            
            # Add current message
            messages.append(HumanMessage(content=message))
            
            # Get response from Ollama
            response = await self.llm.ainvoke(messages)
            
            # Extract sources from context
            sources = self._extract_sources_from_context(context)
            
            return {
                "response": response.content,
                "sources": sources,
                "context_used": bool(context and context != "No relevant context found in the curriculum documents."),
                "model": self.model_name
            }
            
        except Exception as e:
            logger.error(f"Error in AI tutor chat: {str(e)}")
            return {
                "response": "I'm sorry, I'm having trouble processing your question right now. Please try again in a moment.",
                "sources": [],
                "context_used": False,
                "error": str(e)
            }
    
    async def explain_concept(self, 
                            concept: str, 
                            subject: str, 
                            grade: int,
                            difficulty_level: str = "basic") -> Dict[str, Any]:
        """
        Provide a detailed explanation of a specific concept
        
        Args:
            concept: The concept to explain
            subject: Subject area
            grade: Student grade level
            difficulty_level: "basic", "intermediate", or "advanced"
            
        Returns:
            Structured explanation
        """
        try:
            # Get relevant context
            rag_service = get_rag_service()
            if rag_service:
                context = await rag_service.get_context_for_query(f"{concept} {subject}", subject)
            else:
                context = ""
            
            # Build specific prompt for concept explanation
            prompt = f"""Explain the concept of "{concept}" in {subject} for a grade {grade} student.

Difficulty level: {difficulty_level}

Please structure your explanation as follows:
1. Simple definition
2. Key points (3-5 main points)
3. Real-world example relevant to Bangladesh
4. Common misconceptions to avoid
5. Practice suggestion

Context from curriculum:
{context}

Make it engaging and easy to understand."""

            messages = [
                SystemMessage(content=self.system_prompt),
                HumanMessage(content=prompt)
            ]
            
            response = await self.llm.ainvoke(messages)
            sources = self._extract_sources_from_context(context)
            
            return {
                "explanation": response.content,
                "concept": concept,
                "subject": subject,
                "grade": grade,
                "difficulty_level": difficulty_level,
                "sources": sources
            }
            
        except Exception as e:
            logger.error(f"Error explaining concept {concept}: {str(e)}")
            return {
                "explanation": f"I'm sorry, I couldn't generate an explanation for {concept} right now.",
                "error": str(e)
            }
    
    async def generate_practice_questions(self, 
                                        topic: str, 
                                        subject: str, 
                                        grade: int,
                                        count: int = 3) -> List[Dict[str, Any]]:
        """
        Generate practice questions for a topic
        
        Args:
            topic: Topic to generate questions for
            subject: Subject area
            grade: Student grade level
            count: Number of questions to generate
            
        Returns:
            List of practice questions
        """
        try:
            rag_service = get_rag_service()
            if rag_service:
                context = await rag_service.get_context_for_query(f"{topic} {subject}", subject)
            else:
                context = ""
            
            prompt = f"""Generate {count} practice questions about "{topic}" in {subject} for grade {grade} students.

For each question, provide:
1. The question text
2. 4 multiple choice options (A, B, C, D)
3. The correct answer
4. A brief explanation of why it's correct

Make questions appropriate for grade {grade} level and based on Bangladesh curriculum.

Context from curriculum:
{context}

Format as a clear list."""

            messages = [
                SystemMessage(content=self.system_prompt),
                HumanMessage(content=prompt)
            ]
            
            response = await self.llm.ainvoke(messages)
            
            # Parse the response into structured questions
            # This is a simplified parser - in production, you might want more robust parsing
            questions = self._parse_questions_from_response(response.content)
            
            return questions
            
        except Exception as e:
            logger.error(f"Error generating practice questions: {str(e)}")
            return []
    
    def _build_system_prompt(self, subject: Optional[str], grade: Optional[int], context: str) -> str:
        """Build system prompt with context"""
        prompt = self.system_prompt
        
        if subject:
            prompt += f"\n\nCurrent subject focus: {subject}"
        
        if grade:
            prompt += f"\nStudent grade level: {grade}"
        
        if context and context != "No relevant context found in the curriculum documents.":
            prompt += f"\n\nRelevant curriculum context:\n{context}"
            prompt += "\n\nUse this context to provide accurate, curriculum-aligned responses."
        
        return prompt
    
    def _extract_sources_from_context(self, context: str) -> List[str]:
        """Extract source information from context"""
        sources = []
        if context and "Source" in context:
            lines = context.split('\n')
            for line in lines:
                if line.startswith("Source") and "(" in line and ")" in line:
                    # Extract filename from "Source 1 (filename.pdf):"
                    start = line.find("(") + 1
                    end = line.find(")")
                    if start > 0 and end > start:
                        sources.append(line[start:end])
        return sources
    
    def _parse_questions_from_response(self, response: str) -> List[Dict[str, Any]]:
        """Parse generated questions from LLM response"""
        # This is a simplified parser
        # In production, you might want to use more sophisticated parsing
        questions = []
        
        # Split response into sections and try to extract questions
        # This is a placeholder implementation
        lines = response.split('\n')
        current_question = {}
        
        for line in lines:
            line = line.strip()
            if line and not line.startswith('#'):
                # Simple heuristic to identify questions
                if '?' in line and len(line) > 20:
                    if current_question:
                        questions.append(current_question)
                    current_question = {
                        'question': line,
                        'options': [],
                        'correct_answer': '',
                        'explanation': ''
                    }
                elif line.startswith(('A)', 'B)', 'C)', 'D)')):
                    if current_question:
                        current_question['options'].append(line)
        
        if current_question:
            questions.append(current_question)
        
        return questions[:3]  # Return max 3 questions

# Global AI tutor service instance
ai_tutor_service = AITutorService()