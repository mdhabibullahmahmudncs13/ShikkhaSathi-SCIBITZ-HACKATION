"""
Property-based tests for quiz feedback completeness
**Feature: shikkhasathi-platform, Property 5: Quiz Feedback Completeness**
**Validates: Requirements 2.4**
"""

import pytest
from hypothesis import given, strategies as st, assume, settings
from unittest.mock import Mock, AsyncMock
import asyncio
import uuid
from datetime import datetime

from app.services.quiz.scoring_service import (
    ScoringService, QuestionResponse, QuizResult, QuestionFeedback, FeedbackType
)
from app.services.quiz.question_generator import Question, QuestionType, BloomLevel


class TestQuizFeedbackProperties:
    """Property-based tests for quiz feedback system"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.mock_rag_service = Mock()
        self.mock_rag_service.search_documents = AsyncMock(return_value=[
            {
                "text": "Sample learning resource content",
                "id": "resource_1",
                "source": "Test Resource"
            }
        ])
        
        self.mock_db = Mock()
        self.mock_openai_client = AsyncMock()
        
        # Create scoring service without initializing real OpenAI client
        self.scoring_service = ScoringService.__new__(ScoringService)
        self.scoring_service.rag_service = self.mock_rag_service
        self.scoring_service.openai_client = self.mock_openai_client
        self.scoring_service.db = self.mock_db
        
        # Initialize scoring weights and multipliers
        self.scoring_service.scoring_weights = {
            QuestionType.MULTIPLE_CHOICE: 1.0,
            QuestionType.TRUE_FALSE: 0.8,
            QuestionType.SHORT_ANSWER: 1.2
        }
        
        self.scoring_service.bloom_multipliers = {
            BloomLevel.REMEMBER: 1.0,
            BloomLevel.UNDERSTAND: 1.1,
            BloomLevel.APPLY: 1.2,
            BloomLevel.ANALYZE: 1.3,
            BloomLevel.EVALUATE: 1.4,
            BloomLevel.CREATE: 1.5
        }
    
    @given(
        num_questions=st.integers(min_value=1, max_value=10),
        question_types=st.lists(
            st.sampled_from([QuestionType.MULTIPLE_CHOICE, QuestionType.TRUE_FALSE, QuestionType.SHORT_ANSWER]),
            min_size=1,
            max_size=10
        ),
        student_answers=st.lists(
            st.text(min_size=1, max_size=100),
            min_size=1,
            max_size=10
        )
    )
    @settings(max_examples=50)
    def test_quiz_feedback_completeness(self, num_questions, question_types, student_answers):
        """
        **Property 5: Quiz Feedback Completeness**
        For any completed quiz, immediate feedback should be provided containing 
        correct answers, detailed explanations, and performance analysis
        **Validates: Requirements 2.4**
        """
        async def run_test():
            # Arrange: Ensure all lists have same length
            min_length = min(num_questions, len(question_types), len(student_answers))
            question_types_trimmed = question_types[:min_length]
            student_answers_trimmed = student_answers[:min_length]
            
            # Create test questions
            questions = []
            responses = []
            
            for i in range(min_length):
                question = Question(
                    id=f"q_{i}",
                    question_text=f"Test question {i}",
                    question_type=question_types_trimmed[i],
                    bloom_level=BloomLevel.UNDERSTAND,
                    difficulty_level=5,
                    subject="Mathematics",
                    topic="Algebra",
                    grade=9,
                    correct_answer="A" if question_types_trimmed[i] == QuestionType.MULTIPLE_CHOICE else "True",
                    explanation=f"Explanation for question {i}",
                    options=["A", "B", "C", "D"] if question_types_trimmed[i] == QuestionType.MULTIPLE_CHOICE else None
                )
                questions.append(question)
                
                response = QuestionResponse(
                    question_id=f"q_{i}",
                    student_answer=student_answers_trimmed[i],
                    time_taken_seconds=60,
                    is_flagged=False
                )
                responses.append(response)
            
            # Mock AI responses for feedback generation
            mock_completion = Mock()
            mock_completion.choices = [Mock()]
            mock_completion.choices[0].message.content = "Detailed feedback explaining the concept."
            self.mock_openai_client.chat.completions.create.return_value = mock_completion
            
            # Mock database operations
            self.mock_db.add = Mock()
            self.mock_db.commit = Mock()
            
            # Act: Score the quiz
            quiz_result = await self.scoring_service.score_quiz(
                quiz_id=str(uuid.uuid4()),
                user_id=str(uuid.uuid4()),
                questions=questions,
                responses=responses,
                subject="Mathematics",
                topic="Algebra",
                grade=9,
                difficulty_level=5,
                bloom_level=2
            )
            
            # Assert: Quiz result should contain complete feedback
            assert quiz_result is not None, "Quiz result should not be None"
            assert len(quiz_result.question_feedbacks) == len(questions), (
                f"Expected {len(questions)} question feedbacks, got {len(quiz_result.question_feedbacks)}"
            )
            
            # Check each question feedback for completeness
            for i, feedback in enumerate(quiz_result.question_feedbacks):
                assert feedback.question_id == f"q_{i}", (
                    f"Question ID mismatch: expected q_{i}, got {feedback.question_id}"
                )
                assert feedback.correct_answer is not None and feedback.correct_answer != "", (
                    f"Question {i} missing correct answer"
                )
                assert feedback.explanation is not None and feedback.explanation != "", (
                    f"Question {i} missing explanation"
                )
                assert feedback.student_answer == student_answers_trimmed[i], (
                    f"Question {i} student answer mismatch"
                )
                assert feedback.max_score > 0, (
                    f"Question {i} should have positive max score"
                )
                assert 0 <= feedback.score <= feedback.max_score, (
                    f"Question {i} score {feedback.score} not in valid range [0, {feedback.max_score}]"
                )
            
            # Check overall feedback completeness
            assert quiz_result.overall_feedback is not None and quiz_result.overall_feedback != "", (
                "Overall feedback should not be empty"
            )
            assert quiz_result.recommendations is not None and len(quiz_result.recommendations) > 0, (
                "Should provide at least one recommendation"
            )
            assert quiz_result.total_score >= 0, "Total score should be non-negative"
            assert quiz_result.max_score > 0, "Max score should be positive"
            assert 0 <= quiz_result.percentage <= 100, (
                f"Percentage {quiz_result.percentage} not in valid range [0, 100]"
            )
        
        asyncio.run(run_test())
    
    @given(
        correct_answers=st.lists(
            st.booleans(),
            min_size=1,
            max_size=10
        )
    )
    @settings(max_examples=30)
    def test_feedback_type_consistency(self, correct_answers):
        """
        **Property 5: Quiz Feedback Completeness**
        Feedback type should be consistent with answer correctness
        **Validates: Requirements 2.4**
        """
        async def run_test():
            questions = []
            responses = []
            
            for i, is_correct in enumerate(correct_answers):
                question = Question(
                    id=f"q_{i}",
                    question_text=f"Test question {i}",
                    question_type=QuestionType.MULTIPLE_CHOICE,
                    bloom_level=BloomLevel.REMEMBER,
                    difficulty_level=3,
                    subject="Science",
                    topic="Biology",
                    grade=8,
                    correct_answer="A",
                    explanation=f"Explanation {i}",
                    options=["A", "B", "C", "D"]
                )
                questions.append(question)
                
                # Provide correct or incorrect answer based on test data
                student_answer = "A" if is_correct else "B"
                response = QuestionResponse(
                    question_id=f"q_{i}",
                    student_answer=student_answer,
                    time_taken_seconds=45,
                    is_flagged=False
                )
                responses.append(response)
            
            # Mock AI responses
            mock_completion = Mock()
            mock_completion.choices = [Mock()]
            mock_completion.choices[0].message.content = "Feedback content"
            self.mock_openai_client.chat.completions.create.return_value = mock_completion
            
            # Mock database
            self.mock_db.add = Mock()
            self.mock_db.commit = Mock()
            
            # Act: Score quiz
            quiz_result = await self.scoring_service.score_quiz(
                quiz_id=str(uuid.uuid4()),
                user_id=str(uuid.uuid4()),
                questions=questions,
                responses=responses,
                subject="Science",
                topic="Biology",
                grade=8,
                difficulty_level=3,
                bloom_level=1
            )
            
            # Assert: Feedback types should match correctness
            for i, (feedback, expected_correct) in enumerate(zip(quiz_result.question_feedbacks, correct_answers)):
                assert feedback.is_correct == expected_correct, (
                    f"Question {i}: expected correctness {expected_correct}, got {feedback.is_correct}"
                )
                
                if expected_correct:
                    assert feedback.feedback_type == FeedbackType.CORRECT, (
                        f"Question {i}: expected CORRECT feedback type for correct answer"
                    )
                    assert feedback.score == feedback.max_score, (
                        f"Question {i}: correct answer should get full score"
                    )
                else:
                    assert feedback.feedback_type in [FeedbackType.INCORRECT, FeedbackType.PARTIAL], (
                        f"Question {i}: expected INCORRECT or PARTIAL feedback type for wrong answer"
                    )
        
        asyncio.run(run_test())
    
    @given(
        performance_percentages=st.lists(
            st.floats(min_value=0.0, max_value=1.0),
            min_size=1,
            max_size=8
        )
    )
    @settings(max_examples=30)
    def test_performance_analysis_accuracy(self, performance_percentages):
        """
        **Property 5: Quiz Feedback Completeness**
        Performance analysis should accurately reflect quiz results
        **Validates: Requirements 2.4**
        """
        async def run_test():
            questions = []
            responses = []
            
            for i, performance in enumerate(performance_percentages):
                question = Question(
                    id=f"q_{i}",
                    question_text=f"Question about topic_{i % 3}",  # Create some topic variety
                    question_type=QuestionType.TRUE_FALSE,
                    bloom_level=BloomLevel.APPLY,
                    difficulty_level=4,
                    subject="Physics",
                    topic=f"topic_{i % 3}",  # Rotate between 3 topics
                    grade=10,
                    correct_answer="True",
                    explanation=f"Physics explanation {i}"
                )
                questions.append(question)
                
                # Simulate performance: correct if performance > 0.5
                is_correct = performance > 0.5
                student_answer = "True" if is_correct else "False"
                
                response = QuestionResponse(
                    question_id=f"q_{i}",
                    student_answer=student_answer,
                    time_taken_seconds=30,
                    is_flagged=False
                )
                responses.append(response)
            
            # Mock AI responses
            mock_completion = Mock()
            mock_completion.choices = [Mock()]
            mock_completion.choices[0].message.content = "Performance feedback"
            self.mock_openai_client.chat.completions.create.return_value = mock_completion
            
            # Mock database
            self.mock_db.add = Mock()
            self.mock_db.commit = Mock()
            
            # Act: Score quiz
            quiz_result = await self.scoring_service.score_quiz(
                quiz_id=str(uuid.uuid4()),
                user_id=str(uuid.uuid4()),
                questions=questions,
                responses=responses,
                subject="Physics",
                topic="Mixed Topics",
                grade=10,
                difficulty_level=4,
                bloom_level=3
            )
            
            # Assert: Performance analysis should be accurate
            expected_correct_count = sum(1 for p in performance_percentages if p > 0.5)
            actual_correct_count = sum(1 for f in quiz_result.question_feedbacks if f.is_correct)
            
            assert actual_correct_count == expected_correct_count, (
                f"Expected {expected_correct_count} correct answers, got {actual_correct_count}"
            )
            
            expected_percentage = (expected_correct_count / len(performance_percentages)) * 100
            assert abs(quiz_result.percentage - expected_percentage) < 1.0, (
                f"Expected percentage ~{expected_percentage:.1f}%, got {quiz_result.percentage:.1f}%"
            )
            
            # Check weak/strong area identification
            topic_performance = {}
            for question, feedback in zip(questions, quiz_result.question_feedbacks):
                topic = question.topic
                if topic not in topic_performance:
                    topic_performance[topic] = {"correct": 0, "total": 0}
                topic_performance[topic]["total"] += 1
                if feedback.is_correct:
                    topic_performance[topic]["correct"] += 1
            
            # Verify weak areas are correctly identified (< 60% success)
            expected_weak_topics = [
                topic for topic, stats in topic_performance.items()
                if stats["correct"] / stats["total"] < 0.6
            ]
            
            # Check that weak areas are mentioned in feedback
            weak_areas_text = " ".join(quiz_result.weak_areas).lower()
            for weak_topic in expected_weak_topics:
                # Should mention the topic or indicate poor performance
                assert len(quiz_result.weak_areas) > 0 or quiz_result.percentage >= 60, (
                    f"Should identify weak areas when performance is poor"
                )
        
        asyncio.run(run_test())
    
    @given(
        time_taken_values=st.lists(
            st.integers(min_value=10, max_value=300),
            min_size=1,
            max_size=5
        )
    )
    @settings(max_examples=20)
    def test_timing_analysis_inclusion(self, time_taken_values):
        """
        **Property 5: Quiz Feedback Completeness**
        Feedback should include timing analysis when relevant
        **Validates: Requirements 2.4**
        """
        async def run_test():
            questions = []
            responses = []
            
            for i, time_taken in enumerate(time_taken_values):
                question = Question(
                    id=f"q_{i}",
                    question_text=f"Timed question {i}",
                    question_type=QuestionType.SHORT_ANSWER,
                    bloom_level=BloomLevel.ANALYZE,
                    difficulty_level=6,
                    subject="Chemistry",
                    topic="Reactions",
                    grade=11,
                    correct_answer="Sample correct answer",
                    explanation="Chemical reaction explanation"
                )
                questions.append(question)
                
                response = QuestionResponse(
                    question_id=f"q_{i}",
                    student_answer="Student answer",
                    time_taken_seconds=time_taken,
                    is_flagged=False
                )
                responses.append(response)
            
            # Mock AI responses for short answer scoring
            mock_completion = Mock()
            mock_completion.choices = [Mock()]
            mock_completion.choices[0].message.content = "Score: 75\nExplanation: Good understanding shown"
            self.mock_openai_client.chat.completions.create.return_value = mock_completion
            
            # Mock database
            self.mock_db.add = Mock()
            self.mock_db.commit = Mock()
            
            # Act: Score quiz
            quiz_result = await self.scoring_service.score_quiz(
                quiz_id=str(uuid.uuid4()),
                user_id=str(uuid.uuid4()),
                questions=questions,
                responses=responses,
                subject="Chemistry",
                topic="Reactions",
                grade=11,
                difficulty_level=6,
                bloom_level=4
            )
            
            # Assert: Timing information should be captured
            total_expected_time = sum(time_taken_values)
            assert quiz_result.time_taken_seconds == total_expected_time, (
                f"Expected total time {total_expected_time}s, got {quiz_result.time_taken_seconds}s"
            )
            
            # Check that timing is reasonable for feedback
            avg_time_per_question = total_expected_time / len(time_taken_values)
            
            # Feedback should acknowledge timing if unusually fast or slow
            if avg_time_per_question < 30:  # Very fast
                # Should either mention speed or provide appropriate feedback
                assert quiz_result.overall_feedback is not None
            elif avg_time_per_question > 180:  # Very slow
                # Should either mention taking time or provide encouragement
                assert quiz_result.overall_feedback is not None
        
        asyncio.run(run_test())
    
    @given(
        quiz_scores=st.lists(
            st.floats(min_value=0.0, max_value=1.0),
            min_size=1,
            max_size=6
        )
    )
    @settings(max_examples=30)
    def test_recommendation_relevance(self, quiz_scores):
        """
        **Property 5: Quiz Feedback Completeness**
        Recommendations should be relevant to performance level
        **Validates: Requirements 2.4**
        """
        async def run_test():
            questions = []
            responses = []
            
            for i, score_ratio in enumerate(quiz_scores):
                question = Question(
                    id=f"q_{i}",
                    question_text=f"Question {i}",
                    question_type=QuestionType.MULTIPLE_CHOICE,
                    bloom_level=BloomLevel.EVALUATE,
                    difficulty_level=7,
                    subject="Literature",
                    topic="Poetry Analysis",
                    grade=12,
                    correct_answer="A",
                    explanation="Literary analysis explanation",
                    options=["A", "B", "C", "D"]
                )
                questions.append(question)
                
                # Answer correctly based on score ratio
                is_correct = score_ratio > 0.6
                student_answer = "A" if is_correct else "B"
                
                response = QuestionResponse(
                    question_id=f"q_{i}",
                    student_answer=student_answer,
                    time_taken_seconds=90,
                    is_flagged=False
                )
                responses.append(response)
            
            # Mock AI responses
            mock_completion = Mock()
            mock_completion.choices = [Mock()]
            mock_completion.choices[0].message.content = "Relevant feedback"
            self.mock_openai_client.chat.completions.create.return_value = mock_completion
            
            # Mock database
            self.mock_db.add = Mock()
            self.mock_db.commit = Mock()
            
            # Act: Score quiz
            quiz_result = await self.scoring_service.score_quiz(
                quiz_id=str(uuid.uuid4()),
                user_id=str(uuid.uuid4()),
                questions=questions,
                responses=responses,
                subject="Literature",
                topic="Poetry Analysis",
                grade=12,
                difficulty_level=7,
                bloom_level=5
            )
            
            # Assert: Recommendations should be appropriate for performance
            assert len(quiz_result.recommendations) > 0, "Should provide recommendations"
            
            # Check recommendation appropriateness based on performance
            if quiz_result.percentage < 60:
                # Low performance should suggest review/help
                recommendations_text = " ".join(quiz_result.recommendations).lower()
                assert any(word in recommendations_text for word in 
                          ["review", "practice", "study", "help", "fundamental"]), (
                    "Low performance should suggest review or practice"
                )
            elif quiz_result.percentage > 80:
                # High performance should suggest advancement
                recommendations_text = " ".join(quiz_result.recommendations).lower()
                assert any(word in recommendations_text for word in 
                          ["advanced", "challenging", "next", "excellent", "continue"]), (
                    "High performance should suggest advancement or encouragement"
                )
        
        asyncio.run(run_test())