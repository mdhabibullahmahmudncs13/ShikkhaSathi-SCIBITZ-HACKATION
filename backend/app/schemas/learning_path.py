"""
Learning Path Schemas

Pydantic models for learning path recommendation system.
"""

from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, field_validator


class DifficultyLevel(str, Enum):
    """Difficulty levels for learning content"""
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class TopicNode(BaseModel):
    """Represents a topic in a learning path with metadata"""
    topic_id: str = Field(..., description="Unique identifier for the topic")
    difficulty_level: DifficultyLevel = Field(..., description="Difficulty level for this student")
    current_mastery: float = Field(0.0, ge=0.0, le=1.0, description="Current mastery level (0-1)")
    target_mastery: float = Field(0.8, ge=0.0, le=1.0, description="Target mastery level (0-1)")
    estimated_days: int = Field(..., gt=0, description="Estimated days to complete")
    prerequisites: List[str] = Field(default_factory=list, description="List of prerequisite topic IDs")
    is_weak_area: bool = Field(False, description="Whether this is identified as a weak area")
    
    @field_validator('target_mastery')
    @classmethod
    def target_must_be_higher_than_current(cls, v, info):
        if info.data and 'current_mastery' in info.data and v <= info.data['current_mastery']:
            return max(info.data['current_mastery'] + 0.1, 0.8)
        return v


class PathMilestone(BaseModel):
    """Represents a milestone in a learning path"""
    id: str = Field(..., description="Unique milestone identifier")
    title: str = Field(..., description="Milestone title")
    description: str = Field(..., description="Milestone description")
    milestone_type: str = Field(..., description="Type: foundation, progress, mastery")
    topic_ids: List[str] = Field(..., description="Topics included in this milestone")
    target_date: datetime = Field(..., description="Target completion date")
    required_mastery: float = Field(0.8, ge=0.0, le=1.0, description="Required mastery level")
    reward_xp: int = Field(0, ge=0, description="XP reward for completing milestone")
    is_critical: bool = Field(False, description="Whether this is a critical milestone")
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")


class PersonalizedPath(BaseModel):
    """Complete personalized learning path for a student"""
    student_id: str = Field(..., description="Student identifier")
    subject: str = Field(..., description="Subject area")
    topics: List[TopicNode] = Field(..., description="Sequenced list of topics")
    milestones: List[PathMilestone] = Field(..., description="Path milestones")
    estimated_duration_days: int = Field(..., gt=0, description="Total estimated duration")
    difficulty_strategy: str = Field(..., description="Difficulty adjustment strategy used")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    performance_profile: Optional[Dict[str, Any]] = Field(None, description="Student performance profile")
    
    @field_validator('topics')
    @classmethod
    def topics_must_not_be_empty(cls, v):
        if not v:
            raise ValueError('Learning path must contain at least one topic')
        return v


class LearningPathRecommendation(BaseModel):
    """Learning path recommendation with confidence and reasoning"""
    path: PersonalizedPath = Field(..., description="The recommended learning path")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence in recommendation")
    reasoning: str = Field(..., description="Human-readable reasoning for the recommendation")
    alternative_paths: List[PersonalizedPath] = Field(default_factory=list, description="Alternative path options")


class PrerequisiteRule(BaseModel):
    """Rule defining prerequisite relationships between topics"""
    topic_id: str = Field(..., description="Topic that has prerequisites")
    prerequisite_topic_id: str = Field(..., description="Required prerequisite topic")
    mastery_threshold: float = Field(0.7, ge=0.0, le=1.0, description="Minimum mastery required")
    weight: float = Field(1.0, gt=0.0, description="Importance weight of this prerequisite")


class PathAssignmentRequest(BaseModel):
    """Request to assign a learning path to a student"""
    student_id: str = Field(..., description="Student to assign path to")
    path_id: str = Field(..., description="Learning path identifier")
    teacher_id: str = Field(..., description="Teacher making the assignment")
    custom_message: Optional[str] = Field(None, description="Custom message for the student")
    notify_parents: bool = Field(True, description="Whether to notify parents")
    start_date: Optional[datetime] = Field(None, description="When to start the path")


class PathAssignmentResponse(BaseModel):
    """Response after assigning a learning path"""
    assignment_id: str = Field(..., description="Unique assignment identifier")
    student_id: str = Field(..., description="Assigned student")
    path: PersonalizedPath = Field(..., description="Assigned learning path")
    assigned_at: datetime = Field(default_factory=datetime.utcnow)
    notifications_sent: List[str] = Field(default_factory=list, description="List of notification recipients")


class PathProgressUpdate(BaseModel):
    """Update on student progress through a learning path"""
    assignment_id: str = Field(..., description="Path assignment identifier")
    student_id: str = Field(..., description="Student identifier")
    completed_topics: List[str] = Field(..., description="List of completed topic IDs")
    current_topic: Optional[str] = Field(None, description="Currently active topic")
    completed_milestones: List[str] = Field(default_factory=list, description="Completed milestone IDs")
    overall_progress: float = Field(..., ge=0.0, le=1.0, description="Overall completion percentage")
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PathRecommendationRequest(BaseModel):
    """Request for learning path recommendations"""
    student_id: str = Field(..., description="Student to generate recommendations for")
    subject: str = Field(..., description="Subject area")
    target_topics: Optional[List[str]] = Field(None, description="Specific topics to include")
    max_path_length: int = Field(20, gt=0, le=50, description="Maximum number of topics")
    difficulty_preference: Optional[DifficultyLevel] = Field(None, description="Preferred difficulty level")
    time_constraint_days: Optional[int] = Field(None, gt=0, description="Time constraint in days")


class PathAnalytics(BaseModel):
    """Analytics data for a learning path"""
    path_id: str = Field(..., description="Learning path identifier")
    total_students_assigned: int = Field(0, ge=0, description="Total students assigned this path")
    completion_rate: float = Field(0.0, ge=0.0, le=1.0, description="Overall completion rate")
    average_completion_time_days: Optional[float] = Field(None, description="Average time to complete")
    topic_success_rates: Dict[str, float] = Field(default_factory=dict, description="Success rate per topic")
    common_struggle_points: List[str] = Field(default_factory=list, description="Topics where students struggle")
    effectiveness_score: float = Field(0.0, ge=0.0, le=1.0, description="Overall path effectiveness")


class TopicMasteryUpdate(BaseModel):
    """Update on student mastery of a specific topic"""
    student_id: str = Field(..., description="Student identifier")
    topic_id: str = Field(..., description="Topic identifier")
    mastery_level: float = Field(..., ge=0.0, le=1.0, description="New mastery level")
    assessment_score: Optional[float] = Field(None, ge=0.0, le=1.0, description="Latest assessment score")
    time_spent_minutes: Optional[int] = Field(None, ge=0, description="Time spent on topic")
    attempts_count: int = Field(1, ge=1, description="Number of attempts")
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class DifficultyAdjustmentRequest(BaseModel):
    """Request to adjust difficulty for a student's path"""
    assignment_id: str = Field(..., description="Path assignment identifier")
    student_id: str = Field(..., description="Student identifier")
    new_difficulty: DifficultyLevel = Field(..., description="New difficulty level")
    reason: str = Field(..., description="Reason for adjustment")
    teacher_id: str = Field(..., description="Teacher making the adjustment")


class PathRecommendationResponse(BaseModel):
    """Response containing learning path recommendations"""
    student_id: str = Field(..., description="Student identifier")
    subject: str = Field(..., description="Subject area")
    recommendations: List[LearningPathRecommendation] = Field(..., description="List of recommendations")
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(..., description="When recommendations expire")
    
    @field_validator('expires_at', mode='before')
    @classmethod
    def set_expiry(cls, v, info):
        if v is None and info.data and 'generated_at' in info.data:
            # Recommendations expire after 7 days
            from datetime import timedelta
            return info.data['generated_at'] + timedelta(days=7)
        return v


# Request/Response models for API endpoints

class CreatePathRequest(BaseModel):
    """Request to create a new learning path template"""
    title: str = Field(..., description="Path title")
    description: str = Field(..., description="Path description")
    subject: str = Field(..., description="Subject area")
    grade_level: int = Field(..., ge=1, le=12, description="Target grade level")
    topics: List[str] = Field(..., description="List of topic IDs")
    difficulty_level: DifficultyLevel = Field(..., description="Default difficulty level")
    estimated_duration_days: int = Field(..., gt=0, description="Estimated completion time")
    prerequisites: List[PrerequisiteRule] = Field(default_factory=list, description="Prerequisite rules")


class PathTemplate(BaseModel):
    """Template for creating learning paths"""
    id: str = Field(..., description="Template identifier")
    title: str = Field(..., description="Template title")
    description: str = Field(..., description="Template description")
    subject: str = Field(..., description="Subject area")
    grade_level: int = Field(..., description="Target grade level")
    topics: List[str] = Field(..., description="Topic IDs in sequence")
    difficulty_level: DifficultyLevel = Field(..., description="Default difficulty")
    estimated_duration_days: int = Field(..., description="Estimated duration")
    prerequisites: List[PrerequisiteRule] = Field(default_factory=list)
    created_by: str = Field(..., description="Creator teacher ID")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    usage_count: int = Field(0, ge=0, description="Number of times used")
    effectiveness_rating: float = Field(0.0, ge=0.0, le=5.0, description="Average effectiveness rating")


class BulkPathAssignmentRequest(BaseModel):
    """Request to assign paths to multiple students"""
    student_ids: List[str] = Field(..., description="List of student IDs")
    path_template_id: str = Field(..., description="Path template to use")
    teacher_id: str = Field(..., description="Teacher making assignments")
    customize_per_student: bool = Field(True, description="Whether to customize for each student")
    start_date: Optional[datetime] = Field(None, description="When to start paths")
    notify_students: bool = Field(True, description="Whether to notify students")
    notify_parents: bool = Field(True, description="Whether to notify parents")


class BulkPathAssignmentResponse(BaseModel):
    """Response for bulk path assignment"""
    successful_assignments: List[PathAssignmentResponse] = Field(default_factory=list)
    failed_assignments: List[Dict[str, str]] = Field(default_factory=list, description="Failed assignments with reasons")
    total_requested: int = Field(..., description="Total assignments requested")
    total_successful: int = Field(..., description="Total successful assignments")
    notifications_sent: int = Field(0, description="Total notifications sent")