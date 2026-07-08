"""
Question Generation Service
Generates adaptive quiz questions using RAG and Bloom's taxonomy
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum
import json
import asyncio
from dataclasses import dataclass
import openai
from app.services.rag.rag_service import RAGService

logger = logging.getLogger(__name__)

class QuestionType(Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    SHORT_ANSWER = "short_answer"

class BloomLevel(Enum):
    REMEMBER = 1  # Recall facts and basic concepts
    UNDERSTAND = 2  # Explain ideas or concepts
    APPLY = 3  # Use information in new situations
    ANALYZE = 4  # Draw connections among ideas
    EVALUATE = 5  # Justify a stand or decision
    CREATE = 6  # Produce new or original work

@dataclass
class Question:
    """Represents a generated quiz question"""
    id: str
    question_text: str
    question_type: QuestionType
    bloom_level: BloomLevel
    difficulty_level: int  # 1-10 scale
    subject: str
    topic: str
    grade: int
    options: Optional[List[str]] = None  # For multiple choice
    correct_answer: str = ""
    explanation: str = ""
    source_references: List[str] = None
    quality_score: float = 0.0
    
    def __post_init__(self):
        if self.source_references is None:
            self.source_references = []

@dataclass
class QuestionGenerationRequest:
    """Request parameters for question generation"""
    subject: str
    topic: str
    grade: int
    question_type: QuestionType
    bloom_level: BloomLevel
    difficulty_level: int
    count: int = 1
    language: str = "bangla"

class QuestionGenerator:
    """Generates quiz questions using RAG and AI"""
    
    def __init__(self, rag_service: RAGService, openai_api_key: str):
        self.rag_service = rag_service
        self.openai_client = openai.AsyncOpenAI(api_key=openai_api_key)
        
        # Bloom's taxonomy prompts for different levels
        self.bloom_prompts = {
            BloomLevel.REMEMBER: "Create questions that test recall of facts, definitions, and basic concepts",
            BloomLevel.UNDERSTAND: "Create questions that test comprehension and explanation of concepts",
            BloomLevel.APPLY: "Create questions that test application of knowledge to new situations",
            BloomLevel.ANALYZE: "Create questions that test analysis and breaking down of complex ideas",
            BloomLevel.EVALUATE: "Create questions that test evaluation and judgment of information",
            BloomLevel.CREATE: "Create questions that test synthesis and creation of new ideas"
        }
        
        # Question type templates
        self.question_templates = {
            QuestionType.MULTIPLE_CHOICE: {
                "instruction": "Generate a multiple choice question with 4 options (A, B, C, D)",
                "format": "Question: [question]\nA) [option1]\nB) [option2]\nC) [option3]\nD) [option4]\nCorrect Answer: [letter]\nExplanation: [explanation]"
            },
            QuestionType.TRUE_FALSE: {
                "instruction": "Generate a true/false question",
                "format": "Statement: [statement]\nAnswer: [True/False]\nExplanation: [explanation]"
            },
            QuestionType.SHORT_ANSWER: {
                "instruction": "Generate a short answer question (2-3 sentences expected)",
                "format": "Question: [question]\nSample Answer: [answer]\nExplanation: [explanation]"
            }
        }
    
    async def generate_questions(
        self, 
        request: QuestionGenerationRequest
    ) -> List[Question]:
        """
        Generate quiz questions based on request parameters
        
        Args:
            request: Question generation parameters
            
        Returns:
            List of generated questions
        """
        try:
            logger.info(f"Generating {request.count} questions for {request.subject} - {request.topic}")
            
            # Get relevant content from RAG system
            context_chunks = await self._get_relevant_content(request)
            
            if not context_chunks:
                logger.warning(f"No relevant content found for {request.subject} - {request.topic}")
                return []
            
            # Generate questions using AI
            questions = []
            for i in range(request.count):
                try:
                    question = await self._generate_single_question(request, context_chunks, i)
                    if question:
                        questions.append(question)
                except Exception as e:
                    logger.error(f"Failed to generate question {i+1}: {e}")
                    continue
            
            # Validate and score questions
            validated_questions = []
            for question in questions:
                quality_score = self._calculate_quality_score(question)
                question.quality_score = quality_score
                
                if quality_score >= 0.6:  # Minimum quality threshold
                    validated_questions.append(question)
                else:
                    logger.warning(f"Question rejected due to low quality score: {quality_score}")
            
            logger.info(f"Generated {len(validated_questions)} valid questions out of {request.count} requested")
            return validated_questions
            
        except Exception as e:
            logger.error(f"Question generation failed: {e}")
            raise
    
    async def _get_relevant_content(
        self, 
        request: QuestionGenerationRequest
    ) -> List[Dict[str, Any]]:
        """Get relevant content chunks from RAG system"""
        try:
            # Search for content related to the topic
            search_query = f"{request.topic} {request.subject} grade {request.grade}"
            
            chunks = await self.rag_service.search_documents(
                query=search_query,
                subject=request.subject,
                grade=request.grade,
                top_k=5
            )
            
            return chunks
            
        except Exception as e:
            logger.error(f"Failed to get relevant content: {e}")
            return []
    
    async def _generate_single_question(
        self,
        request: QuestionGenerationRequest,
        context_chunks: List[Dict[str, Any]],
        question_index: int
    ) -> Optional[Question]:
        """Generate a single question using AI"""
        try:
            # Prepare context from chunks
            context_text = "\n\n".join([
                f"Source {i+1}: {chunk.get('text', '')[:500]}..."
                for i, chunk in enumerate(context_chunks[:3])
            ])
            
            # Get Bloom level and question type instructions
            bloom_instruction = self.bloom_prompts[request.bloom_level]
            question_template = self.question_templates[request.question_type]
            
            # Create prompt for AI
            prompt = self._create_generation_prompt(
                request, context_text, bloom_instruction, question_template
            )
            
            # Generate question using OpenAI
            response = await self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert educator creating quiz questions for Bangladesh NCTB curriculum. Generate high-quality, culturally appropriate questions."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            # Parse AI response
            ai_response = response.choices[0].message.content
            question = self._parse_ai_response(
                ai_response, request, context_chunks, question_index
            )
            
            return question
            
        except Exception as e:
            logger.error(f"Failed to generate single question: {e}")
            return None
    
    def _create_generation_prompt(
        self,
        request: QuestionGenerationRequest,
        context_text: str,
        bloom_instruction: str,
        question_template: Dict[str, str]
    ) -> str:
        """Create prompt for AI question generation"""
        
        language_instruction = ""
        if request.language == "bangla":
            language_instruction = "Generate the question in Bengali/Bangla language."
        else:
            language_instruction = "Generate the question in English."
        
        prompt = f"""
Based on the following curriculum content, generate a quiz question with these specifications:

CONTENT:
{context_text}

REQUIREMENTS:
- Subject: {request.subject}
- Topic: {request.topic}
- Grade Level: {request.grade}
- Question Type: {request.question_type.value}
- Bloom's Taxonomy Level: {request.bloom_level.name} (Level {request.bloom_level.value})
- Difficulty Level: {request.difficulty_level}/10
- Language: {request.language}

BLOOM'S TAXONOMY GUIDANCE:
{bloom_instruction}

QUESTION FORMAT:
{question_template['instruction']}

Expected Format:
{question_template['format']}

ADDITIONAL GUIDELINES:
- {language_instruction}
- Make questions culturally relevant to Bangladesh
- Ensure questions are appropriate for Grade {request.grade} students
- Include clear, detailed explanations
- For multiple choice, make distractors plausible but clearly incorrect
- Difficulty level {request.difficulty_level}/10 should be reflected in complexity

Generate the question now:
"""
        return prompt
    
    def _parse_ai_response(
        self,
        ai_response: str,
        request: QuestionGenerationRequest,
        context_chunks: List[Dict[str, Any]],
        question_index: int
    ) -> Optional[Question]:
        """Parse AI response into Question object"""
        try:
            # Generate unique ID
            question_id = f"{request.subject}_{request.topic}_{request.bloom_level.value}_{question_index}"
            
            # Extract source references
            source_refs = [chunk.get('id', f'chunk_{i}') for i, chunk in enumerate(context_chunks)]
            
            if request.question_type == QuestionType.MULTIPLE_CHOICE:
                return self._parse_multiple_choice(
                    ai_response, question_id, request, source_refs
                )
            elif request.question_type == QuestionType.TRUE_FALSE:
                return self._parse_true_false(
                    ai_response, question_id, request, source_refs
                )
            elif request.question_type == QuestionType.SHORT_ANSWER:
                return self._parse_short_answer(
                    ai_response, question_id, request, source_refs
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to parse AI response: {e}")
            return None
    
    def _parse_multiple_choice(
        self, 
        response: str, 
        question_id: str, 
        request: QuestionGenerationRequest,
        source_refs: List[str]
    ) -> Optional[Question]:
        """Parse multiple choice question from AI response"""
        try:
            lines = response.strip().split('\n')
            question_text = ""
            options = []
            correct_answer = ""
            explanation = ""
            
            for line in lines:
                line = line.strip()
                if line.startswith("Question:"):
                    question_text = line.replace("Question:", "").strip()
                elif line.startswith(("A)", "B)", "C)", "D)")):
                    options.append(line[2:].strip())
                elif line.startswith("Correct Answer:"):
                    correct_answer = line.replace("Correct Answer:", "").strip()
                elif line.startswith("Explanation:"):
                    explanation = line.replace("Explanation:", "").strip()
            
            if question_text and len(options) == 4 and correct_answer and explanation:
                return Question(
                    id=question_id,
                    question_text=question_text,
                    question_type=request.question_type,
                    bloom_level=request.bloom_level,
                    difficulty_level=request.difficulty_level,
                    subject=request.subject,
                    topic=request.topic,
                    grade=request.grade,
                    options=options,
                    correct_answer=correct_answer,
                    explanation=explanation,
                    source_references=source_refs
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to parse multiple choice question: {e}")
            return None
    
    def _parse_true_false(
        self, 
        response: str, 
        question_id: str, 
        request: QuestionGenerationRequest,
        source_refs: List[str]
    ) -> Optional[Question]:
        """Parse true/false question from AI response"""
        try:
            lines = response.strip().split('\n')
            question_text = ""
            correct_answer = ""
            explanation = ""
            
            for line in lines:
                line = line.strip()
                if line.startswith("Statement:"):
                    question_text = line.replace("Statement:", "").strip()
                elif line.startswith("Answer:"):
                    correct_answer = line.replace("Answer:", "").strip()
                elif line.startswith("Explanation:"):
                    explanation = line.replace("Explanation:", "").strip()
            
            if question_text and correct_answer and explanation:
                return Question(
                    id=question_id,
                    question_text=question_text,
                    question_type=request.question_type,
                    bloom_level=request.bloom_level,
                    difficulty_level=request.difficulty_level,
                    subject=request.subject,
                    topic=request.topic,
                    grade=request.grade,
                    options=["True", "False"],
                    correct_answer=correct_answer,
                    explanation=explanation,
                    source_references=source_refs
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to parse true/false question: {e}")
            return None
    
    def _parse_short_answer(
        self, 
        response: str, 
        question_id: str, 
        request: QuestionGenerationRequest,
        source_refs: List[str]
    ) -> Optional[Question]:
        """Parse short answer question from AI response"""
        try:
            lines = response.strip().split('\n')
            question_text = ""
            correct_answer = ""
            explanation = ""
            
            for line in lines:
                line = line.strip()
                if line.startswith("Question:"):
                    question_text = line.replace("Question:", "").strip()
                elif line.startswith("Sample Answer:"):
                    correct_answer = line.replace("Sample Answer:", "").strip()
                elif line.startswith("Explanation:"):
                    explanation = line.replace("Explanation:", "").strip()
            
            if question_text and correct_answer and explanation:
                return Question(
                    id=question_id,
                    question_text=question_text,
                    question_type=request.question_type,
                    bloom_level=request.bloom_level,
                    difficulty_level=request.difficulty_level,
                    subject=request.subject,
                    topic=request.topic,
                    grade=request.grade,
                    correct_answer=correct_answer,
                    explanation=explanation,
                    source_references=source_refs
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to parse short answer question: {e}")
            return None
    
    def _calculate_quality_score(self, question: Question) -> float:
        """Calculate quality score for a question (0.0 to 1.0)"""
        try:
            score = 0.0
            
            # Check question text quality
            if len(question.question_text) >= 10:
                score += 0.2
            
            # Check if explanation exists and is substantial
            if len(question.explanation) >= 20:
                score += 0.3
            
            # Check correct answer exists
            if question.correct_answer:
                score += 0.2
            
            # Check options for multiple choice
            if question.question_type == QuestionType.MULTIPLE_CHOICE:
                if question.options and len(question.options) == 4:
                    score += 0.2
                else:
                    score -= 0.1
            
            # Check source references
            if question.source_references:
                score += 0.1
            
            return min(1.0, max(0.0, score))
            
        except Exception as e:
            logger.error(f"Failed to calculate quality score: {e}")
            return 0.0

class QuestionPool:
    """Manages a pool of generated questions"""
    
    def __init__(self):
        self.questions: Dict[str, List[Question]] = {}
        self.usage_stats: Dict[str, int] = {}
    
    def add_questions(self, questions: List[Question], pool_key: str):
        """Add questions to the pool"""
        if pool_key not in self.questions:
            self.questions[pool_key] = []
        
        self.questions[pool_key].extend(questions)
        logger.info(f"Added {len(questions)} questions to pool '{pool_key}'")
    
    def get_questions(
        self, 
        pool_key: str, 
        count: int, 
        min_quality: float = 0.6
    ) -> List[Question]:
        """Get questions from the pool"""
        if pool_key not in self.questions:
            return []
        
        # Filter by quality and get unused questions first
        available_questions = [
            q for q in self.questions[pool_key] 
            if q.quality_score >= min_quality
        ]
        
        # Sort by usage (least used first) and quality (highest first)
        available_questions.sort(
            key=lambda q: (self.usage_stats.get(q.id, 0), -q.quality_score)
        )
        
        selected = available_questions[:count]
        
        # Update usage stats
        for question in selected:
            self.usage_stats[question.id] = self.usage_stats.get(question.id, 0) + 1
        
        return selected
    
    def get_pool_stats(self, pool_key: str) -> Dict[str, Any]:
        """Get statistics for a question pool"""
        if pool_key not in self.questions:
            return {"total_questions": 0}
        
        questions = self.questions[pool_key]
        
        return {
            "total_questions": len(questions),
            "avg_quality_score": sum(q.quality_score for q in questions) / len(questions) if questions else 0,
            "bloom_level_distribution": self._get_bloom_distribution(questions),
            "difficulty_distribution": self._get_difficulty_distribution(questions),
            "question_type_distribution": self._get_type_distribution(questions)
        }
    
    def _get_bloom_distribution(self, questions: List[Question]) -> Dict[str, int]:
        """Get distribution of Bloom levels"""
        distribution = {}
        for question in questions:
            level = question.bloom_level.name
            distribution[level] = distribution.get(level, 0) + 1
        return distribution
    
    def _get_difficulty_distribution(self, questions: List[Question]) -> Dict[str, int]:
        """Get distribution of difficulty levels"""
        distribution = {}
        for question in questions:
            level = str(question.difficulty_level)
            distribution[level] = distribution.get(level, 0) + 1
        return distribution
    
    def _get_type_distribution(self, questions: List[Question]) -> Dict[str, int]:
        """Get distribution of question types"""
        distribution = {}
        for question in questions:
            qtype = question.question_type.value
            distribution[qtype] = distribution.get(qtype, 0) + 1
        return distribution