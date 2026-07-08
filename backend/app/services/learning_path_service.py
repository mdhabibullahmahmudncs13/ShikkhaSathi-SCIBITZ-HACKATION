"""
Learning Path Recommendation Service

This service provides personalized learning path recommendations based on student
performance data, difficulty adjustment algorithms, and topic sequencing with
prerequisite handling.

Requirements validated:
- 4.1: Personalized learning path recommendations
- 4.2: Difficulty adjustment based on performance
"""

from typing import List, Dict, Optional, Set, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import logging
from collections import defaultdict, deque

from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.quiz_attempt import QuizAttempt
from app.models.student_progress import StudentProgress
from app.schemas.learning_path import (
    LearningPathRecommendation,
    TopicNode,
    DifficultyLevel,
    PrerequisiteRule,
    PersonalizedPath,
    PathMilestone
)

logger = logging.getLogger(__name__)


class DifficultyAdjustmentStrategy(Enum):
    """Strategies for adjusting difficulty based on performance"""
    CONSERVATIVE = "conservative"  # Slower progression
    BALANCED = "balanced"         # Standard progression
    AGGRESSIVE = "aggressive"     # Faster progression


@dataclass
class StudentPerformanceProfile:
    """Comprehensive student performance profile for path recommendations"""
    student_id: str
    overall_score: float
    subject_scores: Dict[str, float] = field(default_factory=dict)
    topic_mastery: Dict[str, float] = field(default_factory=dict)
    learning_velocity: float = 0.0  # Topics mastered per week
    consistency_score: float = 0.0  # How consistent performance is
    preferred_difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    weak_areas: List[str] = field(default_factory=list)
    strong_areas: List[str] = field(default_factory=list)
    recent_activity: datetime = field(default_factory=datetime.utcnow)
    engagement_level: float = 0.0  # 0-1 scale


@dataclass
class TopicPrerequisite:
    """Represents prerequisite relationships between topics"""
    topic_id: str
    prerequisite_topic_id: str
    mastery_threshold: float = 0.7  # Minimum mastery level required
    weight: float = 1.0  # Importance of this prerequisite


class LearningPathRecommendationEngine:
    """
    Advanced learning path recommendation engine that provides personalized
    learning paths based on student performance, prerequisites, and difficulty adjustment.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.topic_graph = self._build_topic_prerequisite_graph()
        self.difficulty_adjusters = {
            DifficultyAdjustmentStrategy.CONSERVATIVE: self._conservative_adjustment,
            DifficultyAdjustmentStrategy.BALANCED: self._balanced_adjustment,
            DifficultyAdjustmentStrategy.AGGRESSIVE: self._aggressive_adjustment
        }
    
    def generate_personalized_path(
        self,
        student_id: str,
        subject: str,
        target_topics: List[str],
        max_path_length: int = 20,
        strategy: DifficultyAdjustmentStrategy = DifficultyAdjustmentStrategy.BALANCED
    ) -> PersonalizedPath:
        """
        Generate a personalized learning path for a student.
        
        Args:
            student_id: ID of the student
            subject: Subject area for the path
            target_topics: List of topics the student should master
            max_path_length: Maximum number of topics in the path
            strategy: Difficulty adjustment strategy
            
        Returns:
            PersonalizedPath with recommended sequence and milestones
        """
        logger.info(f"Generating personalized path for student {student_id} in {subject}")
        
        # Build student performance profile
        profile = self._build_performance_profile(student_id, subject)
        
        # Determine prerequisite topics needed
        required_topics = self._resolve_prerequisites(target_topics, profile.topic_mastery)
        
        # Sequence topics based on prerequisites and difficulty
        sequenced_topics = self._sequence_topics(
            required_topics, 
            profile, 
            strategy,
            max_path_length
        )
        
        # Adjust difficulty levels for each topic
        adjusted_topics = self._adjust_topic_difficulties(sequenced_topics, profile, strategy)
        
        # Create milestones and checkpoints
        milestones = self._create_path_milestones(adjusted_topics, profile)
        
        # Estimate completion time
        estimated_duration = self._estimate_completion_time(adjusted_topics, profile)
        
        return PersonalizedPath(
            student_id=student_id,
            subject=subject,
            topics=adjusted_topics,
            milestones=milestones,
            estimated_duration_days=estimated_duration,
            difficulty_strategy=strategy.value,
            created_at=datetime.utcnow(),
            performance_profile=profile.__dict__
        )
    
    def _build_performance_profile(self, student_id: str, subject: str) -> StudentPerformanceProfile:
        """Build comprehensive performance profile for a student"""
        
        # Get recent quiz attempts (last 30 days)
        recent_cutoff = datetime.utcnow() - timedelta(days=30)
        attempts = self.db.query(QuizAttempt).filter(
            QuizAttempt.user_id == student_id,
            QuizAttempt.completed_at >= recent_cutoff
        ).all()
        
        # Get overall progress data
        progress = self.db.query(StudentProgress).filter(
            StudentProgress.user_id == student_id
        ).first()
        
        if not attempts:
            # Return default profile for new students
            return StudentPerformanceProfile(
                student_id=student_id,
                overall_score=0.5,
                preferred_difficulty=DifficultyLevel.EASY
            )
        
        # Calculate subject-specific scores
        subject_scores = defaultdict(list)
        topic_scores = defaultdict(list)
        
        for attempt in attempts:
            if attempt.subject == subject:
                subject_scores[subject].append(attempt.score / attempt.max_score)
                if attempt.topic:
                    topic_scores[attempt.topic].append(attempt.score / attempt.max_score)
        
        # Calculate averages
        overall_score = sum(subject_scores.get(subject, [0.5])) / len(subject_scores.get(subject, [1]))
        topic_mastery = {
            topic: sum(scores) / len(scores) 
            for topic, scores in topic_scores.items()
        }
        
        # Calculate learning velocity (topics mastered per week)
        mastered_topics = len([score for score in topic_mastery.values() if score >= 0.8])
        weeks_active = max(1, len(attempts) / 7)  # Rough estimate
        learning_velocity = mastered_topics / weeks_active
        
        # Calculate consistency score (1 - coefficient of variation)
        all_scores = [attempt.score for attempt in attempts]
        if len(all_scores) > 1:
            mean_score = sum(all_scores) / len(all_scores)
            variance = sum((score - mean_score) ** 2 for score in all_scores) / len(all_scores)
            std_dev = variance ** 0.5
            consistency_score = max(0, 1 - (std_dev / mean_score if mean_score > 0 else 1))
        else:
            consistency_score = 1.0
        
        # Determine preferred difficulty
        if overall_score >= 0.8:
            preferred_difficulty = DifficultyLevel.HARD
        elif overall_score >= 0.6:
            preferred_difficulty = DifficultyLevel.MEDIUM
        else:
            preferred_difficulty = DifficultyLevel.EASY
        
        # Identify weak and strong areas
        weak_areas = [topic for topic, score in topic_mastery.items() if score < 0.6]
        strong_areas = [topic for topic, score in topic_mastery.items() if score >= 0.8]
        
        # Calculate engagement level based on recent activity
        recent_attempts = [a for a in attempts if a.created_at >= datetime.utcnow() - timedelta(days=7)]
        engagement_level = min(1.0, len(recent_attempts) / 5)  # 5 attempts per week = full engagement
        
        return StudentPerformanceProfile(
            student_id=student_id,
            overall_score=overall_score,
            subject_scores={subject: overall_score},
            topic_mastery=topic_mastery,
            learning_velocity=learning_velocity,
            consistency_score=consistency_score,
            preferred_difficulty=preferred_difficulty,
            weak_areas=weak_areas,
            strong_areas=strong_areas,
            recent_activity=attempts[-1].completed_at if attempts else datetime.utcnow(),
            engagement_level=engagement_level
        )
    
    def _build_topic_prerequisite_graph(self) -> Dict[str, List[TopicPrerequisite]]:
        """Build a graph of topic prerequisites"""
        
        # This would typically be loaded from a database or configuration
        # For now, we'll define some common prerequisite relationships
        prerequisites = {
            # Mathematics prerequisites
            "algebra_basics": [],
            "linear_equations": [
                TopicPrerequisite("linear_equations", "algebra_basics", 0.7)
            ],
            "quadratic_equations": [
                TopicPrerequisite("quadratic_equations", "linear_equations", 0.8),
                TopicPrerequisite("quadratic_equations", "algebra_basics", 0.7)
            ],
            "calculus_basics": [
                TopicPrerequisite("calculus_basics", "quadratic_equations", 0.8),
                TopicPrerequisite("calculus_basics", "linear_equations", 0.8)
            ],
            
            # Science prerequisites
            "basic_chemistry": [],
            "atomic_structure": [
                TopicPrerequisite("atomic_structure", "basic_chemistry", 0.7)
            ],
            "chemical_bonding": [
                TopicPrerequisite("chemical_bonding", "atomic_structure", 0.8)
            ],
            "organic_chemistry": [
                TopicPrerequisite("organic_chemistry", "chemical_bonding", 0.8),
                TopicPrerequisite("organic_chemistry", "atomic_structure", 0.7)
            ],
            
            # English prerequisites
            "grammar_basics": [],
            "sentence_structure": [
                TopicPrerequisite("sentence_structure", "grammar_basics", 0.7)
            ],
            "paragraph_writing": [
                TopicPrerequisite("paragraph_writing", "sentence_structure", 0.8)
            ],
            "essay_writing": [
                TopicPrerequisite("essay_writing", "paragraph_writing", 0.8),
                TopicPrerequisite("essay_writing", "sentence_structure", 0.7)
            ]
        }
        
        return prerequisites
    
    def _resolve_prerequisites(
        self, 
        target_topics: List[str], 
        current_mastery: Dict[str, float]
    ) -> List[str]:
        """
        Resolve all prerequisite topics needed to master the target topics.
        Uses topological sorting to ensure proper ordering.
        """
        required_topics = set(target_topics)
        visited = set()
        
        def dfs(topic: str):
            if topic in visited:
                return
            visited.add(topic)
            
            prerequisites = self.topic_graph.get(topic, [])
            for prereq in prerequisites:
                prereq_topic = prereq.prerequisite_topic_id
                current_level = current_mastery.get(prereq_topic, 0.0)
                
                # Only include prerequisite if not already mastered
                if current_level < prereq.mastery_threshold:
                    required_topics.add(prereq_topic)
                    dfs(prereq_topic)
        
        # Perform DFS for each target topic
        for topic in target_topics:
            dfs(topic)
        
        return list(required_topics)
    
    def _sequence_topics(
        self,
        topics: List[str],
        profile: StudentPerformanceProfile,
        strategy: DifficultyAdjustmentStrategy,
        max_length: int
    ) -> List[TopicNode]:
        """
        Sequence topics based on prerequisites and student profile.
        Uses topological sorting with priority adjustments.
        """
        # Build dependency graph for the given topics
        in_degree = defaultdict(int)
        graph = defaultdict(list)
        
        for topic in topics:
            prerequisites = self.topic_graph.get(topic, [])
            for prereq in prerequisites:
                prereq_topic = prereq.prerequisite_topic_id
                if prereq_topic in topics:
                    graph[prereq_topic].append((topic, prereq.weight))
                    in_degree[topic] += 1
        
        # Initialize queue with topics that have no prerequisites
        queue = deque()
        for topic in topics:
            if in_degree[topic] == 0:
                queue.append(topic)
        
        # Topological sort with priority adjustments
        sequenced = []
        while queue and len(sequenced) < max_length:
            # Sort queue by priority (weak areas first, then by difficulty preference)
            queue = deque(sorted(queue, key=lambda t: self._topic_priority(t, profile)))
            
            current_topic = queue.popleft()
            sequenced.append(self._create_topic_node(current_topic, profile))
            
            # Add dependent topics to queue
            for next_topic, weight in graph[current_topic]:
                in_degree[next_topic] -= 1
                if in_degree[next_topic] == 0:
                    queue.append(next_topic)
        
        return sequenced
    
    def _topic_priority(self, topic: str, profile: StudentPerformanceProfile) -> float:
        """Calculate priority score for topic ordering (lower = higher priority)"""
        priority = 0.0
        
        # Prioritize weak areas
        if topic in profile.weak_areas:
            priority -= 2.0
        
        # Consider current mastery level
        current_mastery = profile.topic_mastery.get(topic, 0.0)
        priority += current_mastery  # Lower mastery = higher priority
        
        # Consider learning velocity for pacing
        if profile.learning_velocity > 1.0:  # Fast learner
            priority -= 0.5
        elif profile.learning_velocity < 0.5:  # Slow learner
            priority += 0.5
        
        return priority
    
    def _create_topic_node(self, topic: str, profile: StudentPerformanceProfile) -> TopicNode:
        """Create a topic node with appropriate difficulty and settings"""
        current_mastery = profile.topic_mastery.get(topic, 0.0)
        
        # Determine base difficulty
        if current_mastery >= 0.8:
            base_difficulty = DifficultyLevel.HARD
        elif current_mastery >= 0.5:
            base_difficulty = DifficultyLevel.MEDIUM
        else:
            base_difficulty = DifficultyLevel.EASY
        
        # Estimate time needed based on current mastery and learning velocity
        base_time = 7  # Base 7 days per topic
        mastery_factor = max(0.5, 1.0 - current_mastery)  # Less time if already partially mastered
        velocity_factor = max(0.5, 1.0 / max(0.1, profile.learning_velocity))  # Adjust for learning speed
        
        estimated_days = int(base_time * mastery_factor * velocity_factor)
        
        return TopicNode(
            topic_id=topic,
            difficulty_level=base_difficulty,
            current_mastery=current_mastery,
            target_mastery=0.8,
            estimated_days=estimated_days,
            prerequisites=[p.prerequisite_topic_id for p in self.topic_graph.get(topic, [])],
            is_weak_area=topic in profile.weak_areas
        )
    
    def _adjust_topic_difficulties(
        self,
        topics: List[TopicNode],
        profile: StudentPerformanceProfile,
        strategy: DifficultyAdjustmentStrategy
    ) -> List[TopicNode]:
        """Adjust topic difficulties based on strategy and performance"""
        adjuster = self.difficulty_adjusters[strategy]
        return [adjuster(topic, profile) for topic in topics]
    
    def _conservative_adjustment(
        self, 
        topic: TopicNode, 
        profile: StudentPerformanceProfile
    ) -> TopicNode:
        """Conservative difficulty adjustment - slower progression"""
        # Always start one level easier than recommended
        if topic.difficulty_level == DifficultyLevel.HARD:
            topic.difficulty_level = DifficultyLevel.MEDIUM
        elif topic.difficulty_level == DifficultyLevel.MEDIUM:
            topic.difficulty_level = DifficultyLevel.EASY
        
        # Increase time estimates by 50%
        topic.estimated_days = int(topic.estimated_days * 1.5)
        
        # Lower target mastery for weak areas
        if topic.is_weak_area:
            topic.target_mastery = 0.75
        
        return topic
    
    def _balanced_adjustment(
        self, 
        topic: TopicNode, 
        profile: StudentPerformanceProfile
    ) -> TopicNode:
        """Balanced difficulty adjustment - standard progression"""
        # Adjust based on consistency and engagement
        if profile.consistency_score < 0.6 or profile.engagement_level < 0.5:
            # Lower difficulty for inconsistent or disengaged students
            if topic.difficulty_level == DifficultyLevel.HARD:
                topic.difficulty_level = DifficultyLevel.MEDIUM
        
        # Adjust time based on engagement
        if profile.engagement_level < 0.5:
            topic.estimated_days = int(topic.estimated_days * 1.2)
        
        return topic
    
    def _aggressive_adjustment(
        self, 
        topic: TopicNode, 
        profile: StudentPerformanceProfile
    ) -> TopicNode:
        """Aggressive difficulty adjustment - faster progression"""
        # Increase difficulty for high performers
        if profile.overall_score >= 0.8 and profile.consistency_score >= 0.7:
            if topic.difficulty_level == DifficultyLevel.EASY:
                topic.difficulty_level = DifficultyLevel.MEDIUM
            elif topic.difficulty_level == DifficultyLevel.MEDIUM:
                topic.difficulty_level = DifficultyLevel.HARD
        
        # Reduce time estimates by 25% for fast learners
        if profile.learning_velocity > 1.0:
            topic.estimated_days = max(3, int(topic.estimated_days * 0.75))
        
        # Higher target mastery
        topic.target_mastery = 0.85
        
        return topic
    
    def _create_path_milestones(
        self, 
        topics: List[TopicNode], 
        profile: StudentPerformanceProfile
    ) -> List[PathMilestone]:
        """Create meaningful milestones throughout the learning path"""
        milestones = []
        
        # Create milestone every 3-5 topics or at natural breakpoints
        milestone_interval = max(3, min(5, len(topics) // 4)) if len(topics) > 3 else len(topics)
        
        for i in range(0, len(topics), milestone_interval):
            milestone_topics = topics[i:i + milestone_interval]
            
            # Calculate milestone completion date
            days_to_milestone = sum(topic.estimated_days for topic in milestone_topics)
            target_date = datetime.utcnow() + timedelta(days=days_to_milestone)
            
            # Determine milestone type
            is_last_milestone = (i + milestone_interval >= len(topics))
            
            if i == 0 and not is_last_milestone:
                milestone_type = "foundation"
                title = "Foundation Building"
                description = "Master the fundamental concepts"
            elif is_last_milestone:
                milestone_type = "mastery"
                title = "Subject Mastery"
                description = "Achieve mastery of all target topics"
            else:
                milestone_type = "progress"
                title = f"Progress Checkpoint {len(milestones) + 1}"
                description = f"Complete {len(milestone_topics)} topics"
            
            milestone = PathMilestone(
                id=f"milestone_{len(milestones) + 1}",
                title=title,
                description=description,
                milestone_type=milestone_type,
                topic_ids=[topic.topic_id for topic in milestone_topics],
                target_date=target_date,
                required_mastery=0.8,
                reward_xp=len(milestone_topics) * 100,
                is_critical=milestone_type in ["foundation", "mastery"]
            )
            
            milestones.append(milestone)
        
        return milestones
    
    def _estimate_completion_time(
        self, 
        topics: List[TopicNode], 
        profile: StudentPerformanceProfile
    ) -> int:
        """Estimate total completion time for the learning path"""
        base_days = sum(topic.estimated_days for topic in topics)
        
        # Adjust for student characteristics
        engagement_factor = max(0.7, profile.engagement_level)  # Low engagement = longer time
        consistency_factor = max(0.8, profile.consistency_score)  # Low consistency = longer time
        velocity_factor = max(0.5, profile.learning_velocity)  # Higher velocity = shorter time
        
        adjusted_days = int(base_days / (engagement_factor * consistency_factor) * (1.0 / velocity_factor))
        
        # Add buffer time (20% for review and reinforcement)
        return int(adjusted_days * 1.2)


class LearningPathService:
    """Service class for learning path operations"""
    
    def __init__(self, db: Session):
        self.db = db
        self.recommendation_engine = LearningPathRecommendationEngine(db)
    
    async def get_path_recommendations(
        self,
        student_id: str,
        subject: str,
        target_topics: Optional[List[str]] = None
    ) -> List[LearningPathRecommendation]:
        """Get learning path recommendations for a student"""
        
        if not target_topics:
            # Get recommended topics based on curriculum and student level
            target_topics = await self._get_recommended_topics(student_id, subject)
        
        # Generate paths with different strategies
        recommendations = []
        
        for strategy in DifficultyAdjustmentStrategy:
            path = self.recommendation_engine.generate_personalized_path(
                student_id=student_id,
                subject=subject,
                target_topics=target_topics,
                strategy=strategy
            )
            
            recommendation = LearningPathRecommendation(
                path=path,
                confidence_score=self._calculate_confidence_score(path),
                reasoning=self._generate_reasoning(path, strategy),
                alternative_paths=[]
            )
            
            recommendations.append(recommendation)
        
        # Sort by confidence score
        recommendations.sort(key=lambda r: r.confidence_score, reverse=True)
        
        return recommendations
    
    async def _get_recommended_topics(self, student_id: str, subject: str) -> List[str]:
        """Get recommended topics based on curriculum and student progress"""
        
        # This would typically query a curriculum database
        # For now, return some default topics based on subject
        topic_map = {
            "mathematics": [
                "algebra_basics", "linear_equations", "quadratic_equations"
            ],
            "science": [
                "basic_chemistry", "atomic_structure", "chemical_bonding"
            ],
            "english": [
                "grammar_basics", "sentence_structure", "paragraph_writing"
            ]
        }
        
        return topic_map.get(subject.lower(), ["general_topic_1", "general_topic_2"])
    
    def _calculate_confidence_score(self, path: PersonalizedPath) -> float:
        """Calculate confidence score for a learning path recommendation"""
        score = 0.8  # Base confidence
        
        # Adjust based on data quality
        profile = path.performance_profile
        
        # More data = higher confidence
        if len(profile.topic_mastery) > 5:
            score += 0.1
        elif len(profile.topic_mastery) < 2:
            score -= 0.2
        
        # Recent activity = higher confidence
        days_since_activity = (datetime.utcnow() - profile.recent_activity).days
        if days_since_activity < 7:
            score += 0.1
        elif days_since_activity > 30:
            score -= 0.1
        
        # High engagement = higher confidence
        if profile.engagement_level > 0.7:
            score += 0.1
        elif profile.engagement_level < 0.3:
            score -= 0.1
        
        return max(0.0, min(1.0, score))
    
    def _generate_reasoning(
        self, 
        path: PersonalizedPath, 
        strategy: DifficultyAdjustmentStrategy
    ) -> str:
        """Generate human-readable reasoning for the path recommendation"""
        profile = path.performance_profile
        
        reasoning_parts = []
        
        # Overall performance assessment
        if profile.overall_score >= 0.8:
            reasoning_parts.append("Strong overall performance suggests readiness for challenging content")
        elif profile.overall_score >= 0.6:
            reasoning_parts.append("Solid performance with room for growth")
        else:
            reasoning_parts.append("Building foundational skills is recommended")
        
        # Learning velocity
        if profile.learning_velocity > 1.0:
            reasoning_parts.append("Fast learning pace allows for accelerated progression")
        elif profile.learning_velocity < 0.5:
            reasoning_parts.append("Steady pace recommended to ensure mastery")
        
        # Weak areas
        if profile.weak_areas:
            reasoning_parts.append(f"Addressing weak areas: {', '.join(profile.weak_areas[:3])}")
        
        # Strategy explanation
        strategy_explanations = {
            DifficultyAdjustmentStrategy.CONSERVATIVE: "Conservative approach ensures solid foundation",
            DifficultyAdjustmentStrategy.BALANCED: "Balanced approach provides steady progression",
            DifficultyAdjustmentStrategy.AGGRESSIVE: "Accelerated approach maximizes learning potential"
        }
        reasoning_parts.append(strategy_explanations[strategy])
        
        return ". ".join(reasoning_parts) + "."