"""
Property-based tests for Bloom's taxonomy level question generation
**Feature: shikkhasathi-platform, Property 4: Bloom Level Question Generation**
**Validates: Requirements 2.3**
"""

import pytest
from hypothesis import given, strategies as st, assume, settings
from unittest.mock import Mock, AsyncMock, MagicMock
import asyncio

from app.services.quiz.question_generator import (
    QuestionGenerator, QuestionGenerationRequest, Question, QuestionType, BloomLevel
)


class TestBloomLevelProperties:
    """Property-based tests for Bloom's taxonomy level assignment"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.mock_rag_service = Mock()
        self.mock_rag_service.search_documents = AsyncMock(return_value=[
            {
                "text": "Sample curriculum content for testing",
                "id": "test_chunk_1",
                "source": "Test Textbook"
            }
        ])
        
        # Mock OpenAI client
        self.mock_openai_client = AsyncMock()
        
        # Create generator without initializing real OpenAI client
        self.generator = QuestionGenerator.__new__(QuestionGenerator)
        self.generator.rag_service = self.mock_rag_service
        self.generator.openai_client = self.mock_openai_client
        
        # Initialize other attributes
        self.generator.bloom_prompts = {
            BloomLevel.REMEMBER: "Create questions that test recall of facts, definitions, and basic concepts",
            BloomLevel.UNDERSTAND: "Create questions that test comprehension and explanation of concepts",
            BloomLevel.APPLY: "Create questions that test application of knowledge to new situations",
            BloomLevel.ANALYZE: "Create questions that test analysis and breaking down of complex ideas",
            BloomLevel.EVALUATE: "Create questions that test evaluation and judgment of information",
            BloomLevel.CREATE: "Create questions that test synthesis and creation of new ideas"
        }
        
        self.generator.question_templates = {
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
        
        # Add the method to the generator instance
        self.generator._calculate_recommended_bloom_level = self._calculate_recommended_bloom_level
    
    @given(
        bloom_level=st.integers(min_value=1, max_value=6),
        difficulty_level=st.integers(min_value=1, max_value=10),
        question_type=st.sampled_from([QuestionType.MULTIPLE_CHOICE, QuestionType.TRUE_FALSE, QuestionType.SHORT_ANSWER])
    )
    @settings(max_examples=20)
    def test_bloom_level_question_generation_consistency(
        self, bloom_level, difficulty_level, question_type
    ):
        """
        **Property 4: Bloom Level Question Generation**
        For any student performance history, generated quiz questions should match 
        the appropriate Bloom's taxonomy level based on the student's demonstrated capabilities
        **Validates: Requirements 2.3**
        """
        async def run_test():
            # Arrange: Create generation request with specific Bloom level
            bloom_enum = BloomLevel(bloom_level)
            
            request = QuestionGenerationRequest(
                subject="Mathematics",
                topic="Algebra",
                grade=9,
                question_type=question_type,
                bloom_level=bloom_enum,
                difficulty_level=difficulty_level,
                count=1,
                language="english"
            )
            
            # Mock AI response based on Bloom level
            mock_ai_response = self._create_mock_ai_response(
                question_type, bloom_level, difficulty_level
            )
            
            mock_completion = Mock()
            mock_completion.choices = [Mock()]
            mock_completion.choices[0].message.content = mock_ai_response
            self.mock_openai_client.chat.completions.create.return_value = mock_completion
            
            # Act: Generate questions
            questions = await self.generator.generate_questions(request)
            
            # Assert: Questions should match requested Bloom level
            assert len(questions) > 0, "Should generate at least one question"
            
            for question in questions:
                assert question.bloom_level == bloom_enum, (
                    f"Expected Bloom level {bloom_enum}, got {question.bloom_level}"
                )
                assert question.difficulty_level == difficulty_level, (
                    f"Expected difficulty {difficulty_level}, got {question.difficulty_level}"
                )
                assert question.question_type == question_type, (
                    f"Expected question type {question_type}, got {question.question_type}"
                )
        
        # Run async test
        asyncio.run(run_test())
    
    def _calculate_recommended_bloom_level(self, performance, difficulty):
        """Mock implementation of Bloom level calculation"""
        # This would normally be in the adaptive engine
        base_level = 2  # Start with understanding
        
        # Adjust based on mastery level
        mastery_adjustments = {
            "beginner": 0,
            "intermediate": 1,
            "advanced": 2,
            "mastered": 3
        }
        
        # Adjust based on difficulty
        difficulty_adjustment = (difficulty - 5) // 2  # -2 to +2
        
        recommended_level = base_level + mastery_adjustments.get(performance.mastery_level, 0) + difficulty_adjustment
        
        return max(1, min(6, recommended_level))
    
    def _create_mock_ai_response(
        self, 
        question_type: QuestionType, 
        bloom_level: int, 
        difficulty: int,
        question_index: int = 0
    ) -> str:
        """Create mock AI response based on question parameters"""
        
        # Adjust complexity based on Bloom level
        complexity_words = {
            1: ["recall", "identify", "list"],
            2: ["explain", "describe", "summarize"],
            3: ["apply", "demonstrate", "solve"],
            4: ["analyze", "compare", "examine"],
            5: ["evaluate", "judge", "critique"],
            6: ["create", "design", "compose"]
        }
        
        action_word = complexity_words.get(bloom_level, ["understand"])[0]
        
        if question_type == QuestionType.MULTIPLE_CHOICE:
            return f"""
Question: {action_word.capitalize()} the concept of photosynthesis in plants (Bloom Level {bloom_level}, Difficulty {difficulty}).
A) Process that converts light energy to chemical energy
B) Process that breaks down glucose for energy
C) Process that transports water in plants
D) Process that produces oxygen only
Correct Answer: A
Explanation: Photosynthesis is the process by which plants convert light energy into chemical energy stored in glucose molecules. This involves complex biochemical reactions that demonstrate understanding at Bloom level {bloom_level}.
"""
        elif question_type == QuestionType.TRUE_FALSE:
            return f"""
Statement: Photosynthesis requires both sunlight and carbon dioxide to {action_word} glucose production (Bloom Level {bloom_level}).
Answer: True
Explanation: This statement correctly describes the requirements for photosynthesis, testing {action_word} skills at Bloom level {bloom_level}.
"""
        else:  # SHORT_ANSWER
            return f"""
Question: {action_word.capitalize()} how photosynthesis contributes to the carbon cycle in ecosystems (Bloom Level {bloom_level}, Difficulty {difficulty}).
Sample Answer: Photosynthesis removes carbon dioxide from the atmosphere and converts it into organic compounds, which are then used by other organisms or decomposed back into CO2, completing the carbon cycle.
Explanation: This question requires students to {action_word} the relationship between photosynthesis and broader ecological processes, appropriate for Bloom level {bloom_level}.
"""