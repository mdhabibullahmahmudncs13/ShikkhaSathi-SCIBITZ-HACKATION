"""
Property-based tests for adaptive difficulty adjustment
**Feature: shikkhasathi-platform, Property 3: Adaptive Difficulty Adjustment**
**Validates: Requirements 2.1, 2.2**
"""

import pytest
from hypothesis import given, strategies as st, assume, settings
from datetime import datetime, timedelta
from unittest.mock import Mock, MagicMock
import uuid

from app.services.quiz.adaptive_engine import (
    AdaptiveDifficultyEngine, TopicPerformance, DifficultyAdjustment
)
from app.models.quiz_attempt import QuizAttempt


class TestAdaptiveDifficultyProperties:
    """Property-based tests for adaptive difficulty system"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.mock_db = Mock()
        self.engine = AdaptiveDifficultyEngine(self.mock_db)
    
    @given(
        success_rate=st.floats(min_value=0.81, max_value=1.0),  # Only high success rates
        current_difficulty=st.integers(min_value=1, max_value=9),  # Room to increase
        attempts=st.integers(min_value=3, max_value=20)
    )
    @settings(max_examples=50)
    def test_difficulty_increases_with_high_success_rate(
        self, success_rate, current_difficulty, attempts
    ):
        """
        **Property 3: Adaptive Difficulty Adjustment**
        For any quiz performance above 80%, the next quiz difficulty should increase
        **Validates: Requirements 2.1, 2.2**
        """
        # Arrange: Create performance data with high success rate
        # success_rate and current_difficulty are already constrained by @given
        
        # Create mock topic performance
        topic_performance = TopicPerformance(
            topic="test_topic",
            subject="test_subject", 
            grade=9,
            attempts=attempts,
            total_score=int(success_rate * 100 * attempts),
            max_possible_score=100 * attempts,
            current_difficulty=current_difficulty,
            recent_scores=[success_rate] * min(5, attempts)
        )
        
        # Act: Calculate next difficulty
        adjustment = self.engine.calculate_next_difficulty(
            user_id="test_user",
            subject="test_subject",
            topic="test_topic", 
            grade=9,
            current_performance=topic_performance
        )
        
        # Assert: Difficulty should increase for high success rates
        assert adjustment.new_difficulty > adjustment.old_difficulty, (
            f"Expected difficulty to increase from {adjustment.old_difficulty} "
            f"with success rate {success_rate:.2%}, but got {adjustment.new_difficulty}"
        )
        assert adjustment.new_difficulty <= 10, "Difficulty should not exceed maximum"
    
    @given(
        success_rate=st.floats(min_value=0.0, max_value=0.49),
        current_difficulty=st.integers(min_value=2, max_value=10),
        attempts=st.integers(min_value=3, max_value=20)
    )
    @settings(max_examples=100)
    def test_difficulty_decreases_with_low_success_rate(
        self, success_rate, current_difficulty, attempts
    ):
        """
        **Property 3: Adaptive Difficulty Adjustment**
        For any quiz performance below 50%, the next quiz difficulty should decrease
        **Validates: Requirements 2.1, 2.2**
        """
        # Arrange: Create performance data with low success rate
        assume(current_difficulty > 1)  # Room to decrease
        
        # Create mock topic performance
        topic_performance = TopicPerformance(
            topic="test_topic",
            subject="test_subject",
            grade=9,
            attempts=attempts,
            total_score=int(success_rate * 100 * attempts),
            max_possible_score=100 * attempts,
            current_difficulty=current_difficulty,
            recent_scores=[success_rate] * min(5, attempts)
        )
        
        # Act: Calculate next difficulty
        adjustment = self.engine.calculate_next_difficulty(
            user_id="test_user",
            subject="test_subject",
            topic="test_topic",
            grade=9,
            current_performance=topic_performance
        )
        
        # Assert: Difficulty should decrease for low success rates
        assert adjustment.new_difficulty < adjustment.old_difficulty, (
            f"Expected difficulty to decrease from {adjustment.old_difficulty} "
            f"with success rate {success_rate:.2%}, but got {adjustment.new_difficulty}"
        )
        assert adjustment.new_difficulty >= 1, "Difficulty should not go below minimum"
    
    @given(
        success_rate=st.floats(min_value=0.50, max_value=0.80),
        current_difficulty=st.integers(min_value=1, max_value=10),
        attempts=st.integers(min_value=3, max_value=20)
    )
    @settings(max_examples=100)
    def test_difficulty_stable_with_moderate_success_rate(
        self, success_rate, current_difficulty, attempts
    ):
        """
        **Property 3: Adaptive Difficulty Adjustment**
        For moderate success rates (50-80%), difficulty should remain stable or adjust minimally
        **Validates: Requirements 2.1, 2.2**
        """
        # Arrange: Create performance data with moderate success rate
        topic_performance = TopicPerformance(
            topic="test_topic",
            subject="test_subject",
            grade=9,
            attempts=attempts,
            total_score=int(success_rate * 100 * attempts),
            max_possible_score=100 * attempts,
            current_difficulty=current_difficulty,
            recent_scores=[success_rate] * min(5, attempts)
        )
        
        # Act: Calculate next difficulty
        adjustment = self.engine.calculate_next_difficulty(
            user_id="test_user",
            subject="test_subject",
            topic="test_topic",
            grade=9,
            current_performance=topic_performance
        )
        
        # Assert: Difficulty should not change dramatically for moderate performance
        difficulty_change = abs(adjustment.new_difficulty - adjustment.old_difficulty)
        assert difficulty_change <= 1, (
            f"Expected minimal difficulty change for moderate success rate {success_rate:.2%}, "
            f"but difficulty changed from {adjustment.old_difficulty} to {adjustment.new_difficulty}"
        )
    
    @given(
        attempts=st.integers(min_value=0, max_value=2)
    )
    @settings(max_examples=50)
    def test_insufficient_attempts_maintains_difficulty(self, attempts):
        """
        **Property 3: Adaptive Difficulty Adjustment**
        With insufficient attempts, difficulty should remain unchanged
        **Validates: Requirements 2.1, 2.2**
        """
        # Arrange: Create performance data with insufficient attempts
        topic_performance = TopicPerformance(
            topic="test_topic",
            subject="test_subject",
            grade=9,
            attempts=attempts,
            total_score=50,
            max_possible_score=100,
            current_difficulty=5,
            recent_scores=[]
        )
        
        # Act: Calculate next difficulty
        adjustment = self.engine.calculate_next_difficulty(
            user_id="test_user",
            subject="test_subject",
            topic="test_topic",
            grade=9,
            current_performance=topic_performance
        )
        
        # Assert: Difficulty should remain unchanged with insufficient data
        assert adjustment.new_difficulty == adjustment.old_difficulty, (
            f"Expected difficulty to remain unchanged with {attempts} attempts, "
            f"but changed from {adjustment.old_difficulty} to {adjustment.new_difficulty}"
        )
        assert "insufficient" in adjustment.reason.lower(), (
            "Reason should indicate insufficient attempts"
        )
    
    @given(
        quiz_scores=st.lists(
            st.floats(min_value=0.0, max_value=1.0),
            min_size=5,
            max_size=10
        ),
        max_scores=st.lists(
            st.integers(min_value=10, max_value=100),
            min_size=5,
            max_size=10
        )
    )
    @settings(max_examples=50)
    def test_performance_tracking_consistency(self, quiz_scores, max_scores):
        """
        **Property 3: Adaptive Difficulty Adjustment**
        Performance tracking should be consistent across multiple quiz attempts
        **Validates: Requirements 2.1, 2.2**
        """
        # Arrange: Ensure lists are same length
        min_length = min(len(quiz_scores), len(max_scores))
        quiz_scores = quiz_scores[:min_length]
        max_scores = max_scores[:min_length]
        
        # Create quiz attempts
        user_id = str(uuid.uuid4())
        quiz_attempts = []
        
        for i, (score_pct, max_score) in enumerate(zip(quiz_scores, max_scores)):
            attempt = QuizAttempt(
                id=uuid.uuid4(),
                user_id=user_id,
                quiz_id=uuid.uuid4(),
                score=int(score_pct * max_score),
                max_score=max_score,
                time_taken_seconds=300,
                difficulty_level=5,
                bloom_level=2,
                subject="test_subject",
                topic="test_topic",
                grade=9,
                completed_at=datetime.utcnow() - timedelta(days=i),
                answers={}
            )
            quiz_attempts.append(attempt)
        
        # Track performance for each attempt
        topic_performance = TopicPerformance(
            topic="test_topic",
            subject="test_subject",
            grade=9
        )
        
        # Manually update performance to simulate tracking
        for attempt in quiz_attempts:
            topic_performance.attempts += 1
            topic_performance.total_score += attempt.score
            topic_performance.max_possible_score += attempt.max_score
            topic_performance.last_attempt = attempt.completed_at
            
            score_percentage = attempt.score / attempt.max_score if attempt.max_score > 0 else 0
            topic_performance.recent_scores.append(score_percentage)
            if len(topic_performance.recent_scores) > 10:
                topic_performance.recent_scores = topic_performance.recent_scores[-10:]
        
        # Assert: Performance metrics should be consistent
        expected_total_score = sum(int(score * max_score) for score, max_score in zip(quiz_scores, max_scores))
        expected_max_score = sum(max_scores)
        expected_success_rate = expected_total_score / expected_max_score if expected_max_score > 0 else 0
        
        assert topic_performance.attempts == len(quiz_attempts), (
            f"Expected {len(quiz_attempts)} attempts, got {topic_performance.attempts}"
        )
        assert topic_performance.total_score == expected_total_score, (
            f"Expected total score {expected_total_score}, got {topic_performance.total_score}"
        )
        assert abs(topic_performance.success_rate - expected_success_rate) < 0.01, (
            f"Expected success rate {expected_success_rate:.3f}, got {topic_performance.success_rate:.3f}"
        )
    
    @given(
        difficulty_levels=st.lists(
            st.integers(min_value=1, max_value=10),
            min_size=1,
            max_size=10
        )
    )
    @settings(max_examples=50)
    def test_difficulty_bounds_respected(self, difficulty_levels):
        """
        **Property 3: Adaptive Difficulty Adjustment**
        Difficulty adjustments should always respect minimum and maximum bounds
        **Validates: Requirements 2.1, 2.2**
        """
        for current_difficulty in difficulty_levels:
            # Test with very high success rate (should increase but not exceed max)
            high_performance = TopicPerformance(
                topic="test_topic",
                subject="test_subject",
                grade=9,
                attempts=5,
                total_score=450,  # 90% success rate
                max_possible_score=500,
                current_difficulty=current_difficulty,
                recent_scores=[0.9] * 5
            )
            
            adjustment = self.engine.calculate_next_difficulty(
                user_id="test_user",
                subject="test_subject",
                topic="test_topic",
                grade=9,
                current_performance=high_performance
            )
            
            assert 1 <= adjustment.new_difficulty <= 10, (
                f"Difficulty {adjustment.new_difficulty} is outside valid range [1, 10]"
            )
            
            # Test with very low success rate (should decrease but not go below min)
            low_performance = TopicPerformance(
                topic="test_topic",
                subject="test_subject",
                grade=9,
                attempts=5,
                total_score=100,  # 20% success rate
                max_possible_score=500,
                current_difficulty=current_difficulty,
                recent_scores=[0.2] * 5
            )
            
            adjustment = self.engine.calculate_next_difficulty(
                user_id="test_user",
                subject="test_subject",
                topic="test_topic",
                grade=9,
                current_performance=low_performance
            )
            
            assert 1 <= adjustment.new_difficulty <= 10, (
                f"Difficulty {adjustment.new_difficulty} is outside valid range [1, 10]"
            )