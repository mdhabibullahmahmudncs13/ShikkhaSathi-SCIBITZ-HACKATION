"""
Adaptive Difficulty Engine
Manages difficulty adjustment and performance tracking for personalized learning
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import statistics
import math
from sqlalchemy.orm import Session
from app.models.quiz_attempt import QuizAttempt
from app.models.student_progress import StudentProgress

logger = logging.getLogger(__name__)

class PerformanceTrend(Enum):
    IMPROVING = "improving"
    DECLINING = "declining"
    STABLE = "stable"
    INSUFFICIENT_DATA = "insufficient_data"

@dataclass
class TopicPerformance:
    """Performance tracking for a specific topic"""
    topic: str
    subject: str
    grade: int
    attempts: int = 0
    total_score: int = 0
    max_possible_score: int = 0
    current_difficulty: int = 5  # 1-10 scale
    target_success_rate: float = 0.65  # 65% target
    recent_scores: List[float] = field(default_factory=list)
    last_attempt: Optional[datetime] = None
    mastery_level: str = "beginner"  # beginner, intermediate, advanced, mastered
    
    @property
    def success_rate(self) -> float:
        """Calculate current success rate"""
        if self.max_possible_score == 0:
            return 0.0
        return self.total_score / self.max_possible_score
    
    @property
    def average_recent_score(self) -> float:
        """Calculate average of recent scores (last 5 attempts)"""
        if not self.recent_scores:
            return 0.0
        return statistics.mean(self.recent_scores[-5:])

@dataclass
class DifficultyAdjustment:
    """Represents a difficulty adjustment decision"""
    old_difficulty: int
    new_difficulty: int
    reason: str
    confidence: float  # 0.0 to 1.0
    recommended_bloom_level: int
    spaced_repetition_interval: int  # days

@dataclass
class SpacedRepetitionItem:
    """Item for spaced repetition scheduling"""
    topic: str
    subject: str
    grade: int
    user_id: str
    next_review_date: datetime
    interval_days: int
    ease_factor: float = 2.5  # Default ease factor
    repetition_count: int = 0

class AdaptiveDifficultyEngine:
    """Manages adaptive difficulty adjustment and performance tracking"""
    
    def __init__(self, db_session: Session):
        self.db = db_session
        
        # Configuration parameters
        self.min_difficulty = 1
        self.max_difficulty = 10
        self.target_success_rate = 0.65  # 65%
        self.success_rate_tolerance = 0.05  # ±5%
        self.min_attempts_for_adjustment = 3
        self.performance_window_size = 5  # Consider last 5 attempts
        
        # Difficulty adjustment thresholds
        self.increase_threshold = 0.80  # Increase difficulty if >80% success
        self.decrease_threshold = 0.50  # Decrease difficulty if <50% success
        
        # Spaced repetition parameters
        self.initial_interval = 1  # 1 day
        self.max_interval = 180  # 6 months
        self.min_ease_factor = 1.3
        self.max_ease_factor = 3.0
    
    def track_quiz_performance(
        self, 
        user_id: str, 
        quiz_attempt: QuizAttempt
    ) -> TopicPerformance:
        """
        Track performance for a quiz attempt and update topic performance
        
        Args:
            user_id: Student user ID
            quiz_attempt: Completed quiz attempt
            
        Returns:
            Updated topic performance
        """
        try:
            # Get or create topic performance record
            topic_key = f"{quiz_attempt.subject}_{quiz_attempt.topic}_{quiz_attempt.grade}"
            topic_performance = self._get_topic_performance(user_id, quiz_attempt)
            
            # Update performance metrics
            topic_performance.attempts += 1
            topic_performance.total_score += quiz_attempt.score
            topic_performance.max_possible_score += quiz_attempt.max_score
            topic_performance.last_attempt = quiz_attempt.completed_at
            
            # Update recent scores (keep last 10)
            score_percentage = quiz_attempt.score / quiz_attempt.max_score if quiz_attempt.max_score > 0 else 0
            topic_performance.recent_scores.append(score_percentage)
            if len(topic_performance.recent_scores) > 10:
                topic_performance.recent_scores = topic_performance.recent_scores[-10:]
            
            # Update mastery level
            topic_performance.mastery_level = self._calculate_mastery_level(topic_performance)
            
            logger.info(f"Updated performance for user {user_id}, topic {topic_key}: {score_percentage:.2%}")
            return topic_performance
            
        except Exception as e:
            logger.error(f"Failed to track quiz performance: {e}")
            raise
    
    def calculate_next_difficulty(
        self, 
        user_id: str, 
        subject: str, 
        topic: str, 
        grade: int,
        current_performance: Optional[TopicPerformance] = None
    ) -> DifficultyAdjustment:
        """
        Calculate optimal difficulty for next quiz
        
        Args:
            user_id: Student user ID
            subject: Subject name
            topic: Topic name
            grade: Grade level
            current_performance: Optional current performance data
            
        Returns:
            Difficulty adjustment recommendation
        """
        try:
            # Get performance data
            if current_performance is None:
                current_performance = self._get_topic_performance_from_db(
                    user_id, subject, topic, grade
                )
            
            old_difficulty = current_performance.current_difficulty
            
            # Check if we have enough data for adjustment
            if current_performance.attempts < self.min_attempts_for_adjustment:
                return DifficultyAdjustment(
                    old_difficulty=old_difficulty,
                    new_difficulty=old_difficulty,
                    reason="Insufficient attempts for adjustment",
                    confidence=0.3,
                    recommended_bloom_level=2,  # Start with understanding level
                    spaced_repetition_interval=1
                )
            
            # Calculate recent performance
            recent_success_rate = current_performance.average_recent_score
            overall_success_rate = current_performance.success_rate
            
            # Determine adjustment based on performance
            new_difficulty = old_difficulty
            reason = "No adjustment needed"
            confidence = 0.5
            
            # Performance-based adjustment
            if recent_success_rate > self.increase_threshold:
                # Increase difficulty
                new_difficulty = min(self.max_difficulty, old_difficulty + 1)
                reason = f"High success rate ({recent_success_rate:.1%}) - increasing difficulty"
                confidence = min(0.9, recent_success_rate)
                
            elif recent_success_rate < self.decrease_threshold:
                # Decrease difficulty
                new_difficulty = max(self.min_difficulty, old_difficulty - 1)
                reason = f"Low success rate ({recent_success_rate:.1%}) - decreasing difficulty"
                confidence = min(0.9, 1.0 - recent_success_rate)
                
            elif abs(recent_success_rate - self.target_success_rate) > self.success_rate_tolerance:
                # Fine-tune towards target
                if recent_success_rate > self.target_success_rate + self.success_rate_tolerance:
                    new_difficulty = min(self.max_difficulty, old_difficulty + 1)
                    reason = f"Above target rate ({recent_success_rate:.1%}) - fine-tuning up"
                    confidence = 0.6
                elif recent_success_rate < self.target_success_rate - self.success_rate_tolerance:
                    new_difficulty = max(self.min_difficulty, old_difficulty - 1)
                    reason = f"Below target rate ({recent_success_rate:.1%}) - fine-tuning down"
                    confidence = 0.6
            
            # Calculate recommended Bloom level
            recommended_bloom_level = self._calculate_recommended_bloom_level(
                current_performance, new_difficulty
            )
            
            # Calculate spaced repetition interval
            spaced_interval = self._calculate_spaced_repetition_interval(
                current_performance, recent_success_rate
            )
            
            # Update current difficulty in performance record
            current_performance.current_difficulty = new_difficulty
            
            logger.info(f"Difficulty adjustment for {user_id} - {subject}/{topic}: {old_difficulty} -> {new_difficulty} ({reason})")
            
            return DifficultyAdjustment(
                old_difficulty=old_difficulty,
                new_difficulty=new_difficulty,
                reason=reason,
                confidence=confidence,
                recommended_bloom_level=recommended_bloom_level,
                spaced_repetition_interval=spaced_interval
            )
            
        except Exception as e:
            logger.error(f"Failed to calculate next difficulty: {e}")
            raise
    
    def get_performance_analytics(
        self, 
        user_id: str, 
        subject: Optional[str] = None,
        days_back: int = 30
    ) -> Dict[str, Any]:
        """
        Get comprehensive performance analytics for a student
        
        Args:
            user_id: Student user ID
            subject: Optional subject filter
            days_back: Number of days to look back
            
        Returns:
            Performance analytics data
        """
        try:
            # Get quiz attempts from database
            cutoff_date = datetime.utcnow() - timedelta(days=days_back)
            
            query = self.db.query(QuizAttempt).filter(
                QuizAttempt.user_id == user_id,
                QuizAttempt.completed_at >= cutoff_date
            )
            
            if subject:
                query = query.filter(QuizAttempt.subject == subject)
            
            attempts = query.order_by(QuizAttempt.completed_at.desc()).all()
            
            if not attempts:
                return {
                    "total_attempts": 0,
                    "overall_success_rate": 0.0,
                    "performance_trend": PerformanceTrend.INSUFFICIENT_DATA.value,
                    "weak_areas": [],
                    "strong_areas": [],
                    "recommendations": []
                }
            
            # Calculate overall metrics
            total_score = sum(attempt.score for attempt in attempts)
            total_possible = sum(attempt.max_score for attempt in attempts)
            overall_success_rate = total_score / total_possible if total_possible > 0 else 0
            
            # Analyze performance by topic
            topic_performance = {}
            for attempt in attempts:
                topic_key = f"{attempt.subject}_{attempt.topic}"
                if topic_key not in topic_performance:
                    topic_performance[topic_key] = {
                        "scores": [],
                        "difficulties": [],
                        "bloom_levels": [],
                        "subject": attempt.subject,
                        "topic": attempt.topic
                    }
                
                score_pct = attempt.score / attempt.max_score if attempt.max_score > 0 else 0
                topic_performance[topic_key]["scores"].append(score_pct)
                topic_performance[topic_key]["difficulties"].append(attempt.difficulty_level)
                topic_performance[topic_key]["bloom_levels"].append(attempt.bloom_level)
            
            # Identify weak and strong areas
            weak_areas = []
            strong_areas = []
            
            for topic_key, data in topic_performance.items():
                avg_score = statistics.mean(data["scores"])
                if avg_score < 0.6:  # Below 60%
                    weak_areas.append({
                        "topic": data["topic"],
                        "subject": data["subject"],
                        "average_score": avg_score,
                        "attempts": len(data["scores"])
                    })
                elif avg_score > 0.8:  # Above 80%
                    strong_areas.append({
                        "topic": data["topic"],
                        "subject": data["subject"],
                        "average_score": avg_score,
                        "attempts": len(data["scores"])
                    })
            
            # Calculate performance trend
            trend = self._calculate_performance_trend(attempts)
            
            # Generate recommendations
            recommendations = self._generate_recommendations(
                weak_areas, strong_areas, overall_success_rate, trend
            )
            
            return {
                "total_attempts": len(attempts),
                "overall_success_rate": overall_success_rate,
                "performance_trend": trend.value,
                "weak_areas": sorted(weak_areas, key=lambda x: x["average_score"]),
                "strong_areas": sorted(strong_areas, key=lambda x: x["average_score"], reverse=True),
                "recommendations": recommendations,
                "topic_breakdown": topic_performance
            }
            
        except Exception as e:
            logger.error(f"Failed to get performance analytics: {e}")
            raise
    
    def schedule_spaced_repetition(
        self, 
        user_id: str, 
        topic_performance: TopicPerformance
    ) -> SpacedRepetitionItem:
        """
        Schedule spaced repetition for a topic based on performance
        
        Args:
            user_id: Student user ID
            topic_performance: Topic performance data
            
        Returns:
            Spaced repetition item
        """
        try:
            # Calculate interval based on performance
            success_rate = topic_performance.average_recent_score
            
            # Base interval calculation
            if success_rate >= 0.9:
                interval_multiplier = 2.5
            elif success_rate >= 0.8:
                interval_multiplier = 2.0
            elif success_rate >= 0.7:
                interval_multiplier = 1.5
            elif success_rate >= 0.6:
                interval_multiplier = 1.2
            else:
                interval_multiplier = 1.0  # Review soon if struggling
            
            # Calculate next interval
            base_interval = max(1, topic_performance.attempts // 2)  # Increase with attempts
            next_interval = min(self.max_interval, int(base_interval * interval_multiplier))
            
            # Calculate next review date
            next_review_date = datetime.utcnow() + timedelta(days=next_interval)
            
            # Adjust ease factor based on performance
            ease_factor = 2.5  # Default
            if success_rate >= 0.8:
                ease_factor = min(self.max_ease_factor, 2.5 + (success_rate - 0.8) * 2.5)
            elif success_rate < 0.6:
                ease_factor = max(self.min_ease_factor, 2.5 - (0.6 - success_rate) * 6.0)
            
            return SpacedRepetitionItem(
                topic=topic_performance.topic,
                subject=topic_performance.subject,
                grade=topic_performance.grade,
                user_id=user_id,
                next_review_date=next_review_date,
                interval_days=next_interval,
                ease_factor=ease_factor,
                repetition_count=topic_performance.attempts
            )
            
        except Exception as e:
            logger.error(f"Failed to schedule spaced repetition: {e}")
            raise
    
    def _get_topic_performance(
        self, 
        user_id: str, 
        quiz_attempt: QuizAttempt
    ) -> TopicPerformance:
        """Get or create topic performance record"""
        # This would typically load from database/cache
        # For now, create a new instance
        return TopicPerformance(
            topic=quiz_attempt.topic,
            subject=quiz_attempt.subject,
            grade=quiz_attempt.grade,
            current_difficulty=quiz_attempt.difficulty_level
        )
    
    def _get_topic_performance_from_db(
        self, 
        user_id: str, 
        subject: str, 
        topic: str, 
        grade: int
    ) -> TopicPerformance:
        """Get topic performance from database"""
        try:
            # Query recent attempts for this topic
            attempts = self.db.query(QuizAttempt).filter(
                QuizAttempt.user_id == user_id,
                QuizAttempt.subject == subject,
                QuizAttempt.topic == topic,
                QuizAttempt.grade == grade
            ).order_by(QuizAttempt.completed_at.desc()).limit(10).all()
            
            if not attempts:
                return TopicPerformance(
                    topic=topic,
                    subject=subject,
                    grade=grade
                )
            
            # Calculate performance metrics
            total_score = sum(attempt.score for attempt in attempts)
            max_possible = sum(attempt.max_score for attempt in attempts)
            recent_scores = [
                attempt.score / attempt.max_score 
                for attempt in attempts 
                if attempt.max_score > 0
            ]
            
            # Get current difficulty from most recent attempt
            current_difficulty = attempts[0].difficulty_level if attempts else 5
            
            performance = TopicPerformance(
                topic=topic,
                subject=subject,
                grade=grade,
                attempts=len(attempts),
                total_score=total_score,
                max_possible_score=max_possible,
                current_difficulty=current_difficulty,
                recent_scores=recent_scores,
                last_attempt=attempts[0].completed_at if attempts else None
            )
            
            performance.mastery_level = self._calculate_mastery_level(performance)
            
            return performance
            
        except Exception as e:
            logger.error(f"Failed to get topic performance from DB: {e}")
            return TopicPerformance(topic=topic, subject=subject, grade=grade)
    
    def _calculate_mastery_level(self, performance: TopicPerformance) -> str:
        """Calculate mastery level based on performance"""
        if performance.attempts < 3:
            return "beginner"
        
        success_rate = performance.success_rate
        consistency = self._calculate_consistency(performance.recent_scores)
        
        if success_rate >= 0.9 and consistency >= 0.8:
            return "mastered"
        elif success_rate >= 0.8 and consistency >= 0.7:
            return "advanced"
        elif success_rate >= 0.6 and consistency >= 0.6:
            return "intermediate"
        else:
            return "beginner"
    
    def _calculate_consistency(self, scores: List[float]) -> float:
        """Calculate consistency of performance (1.0 - coefficient of variation)"""
        if len(scores) < 2:
            return 0.0
        
        mean_score = statistics.mean(scores)
        if mean_score == 0:
            return 0.0
        
        std_dev = statistics.stdev(scores)
        coefficient_of_variation = std_dev / mean_score
        
        # Return consistency (inverse of variation, capped at 1.0)
        return max(0.0, min(1.0, 1.0 - coefficient_of_variation))
    
    def _calculate_recommended_bloom_level(
        self, 
        performance: TopicPerformance, 
        difficulty: int
    ) -> int:
        """Calculate recommended Bloom's taxonomy level"""
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
    
    def _calculate_spaced_repetition_interval(
        self, 
        performance: TopicPerformance, 
        recent_success_rate: float
    ) -> int:
        """Calculate spaced repetition interval in days"""
        base_interval = 1
        
        # Adjust based on success rate
        if recent_success_rate >= 0.9:
            multiplier = 7  # Weekly review
        elif recent_success_rate >= 0.8:
            multiplier = 5
        elif recent_success_rate >= 0.7:
            multiplier = 3
        elif recent_success_rate >= 0.6:
            multiplier = 2
        else:
            multiplier = 1  # Daily review if struggling
        
        # Adjust based on attempts (more attempts = longer intervals)
        attempt_multiplier = min(3, 1 + performance.attempts // 5)
        
        return min(30, base_interval * multiplier * attempt_multiplier)
    
    def _calculate_performance_trend(self, attempts: List[QuizAttempt]) -> PerformanceTrend:
        """Calculate performance trend from recent attempts"""
        if len(attempts) < 3:
            return PerformanceTrend.INSUFFICIENT_DATA
        
        # Get scores from recent attempts (chronological order)
        recent_attempts = sorted(attempts, key=lambda x: x.completed_at)[-10:]
        scores = [
            attempt.score / attempt.max_score 
            for attempt in recent_attempts 
            if attempt.max_score > 0
        ]
        
        if len(scores) < 3:
            return PerformanceTrend.INSUFFICIENT_DATA
        
        # Calculate trend using linear regression slope
        n = len(scores)
        x_values = list(range(n))
        
        # Calculate slope
        x_mean = statistics.mean(x_values)
        y_mean = statistics.mean(scores)
        
        numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_values, scores))
        denominator = sum((x - x_mean) ** 2 for x in x_values)
        
        if denominator == 0:
            return PerformanceTrend.STABLE
        
        slope = numerator / denominator
        
        # Classify trend
        if slope > 0.02:  # Improving by >2% per attempt
            return PerformanceTrend.IMPROVING
        elif slope < -0.02:  # Declining by >2% per attempt
            return PerformanceTrend.DECLINING
        else:
            return PerformanceTrend.STABLE
    
    def _generate_recommendations(
        self, 
        weak_areas: List[Dict], 
        strong_areas: List[Dict], 
        overall_success_rate: float,
        trend: PerformanceTrend
    ) -> List[str]:
        """Generate personalized recommendations"""
        recommendations = []
        
        # Recommendations based on weak areas
        if weak_areas:
            top_weak = weak_areas[0]
            recommendations.append(
                f"Focus on {top_weak['subject']} - {top_weak['topic']} "
                f"(current: {top_weak['average_score']:.1%})"
            )
        
        # Recommendations based on trend
        if trend == PerformanceTrend.DECLINING:
            recommendations.append("Consider reviewing fundamentals and taking breaks between study sessions")
        elif trend == PerformanceTrend.IMPROVING:
            recommendations.append("Great progress! Consider tackling more challenging topics")
        
        # Recommendations based on overall performance
        if overall_success_rate < 0.6:
            recommendations.append("Focus on understanding concepts before attempting quizzes")
        elif overall_success_rate > 0.8:
            recommendations.append("Ready for advanced topics and higher difficulty levels")
        
        # Recommendations based on strong areas
        if strong_areas and len(strong_areas) >= 2:
            recommendations.append("Leverage your strengths in " + 
                                 ", ".join([area['topic'] for area in strong_areas[:2]]))
        
        return recommendations[:5]  # Limit to 5 recommendations