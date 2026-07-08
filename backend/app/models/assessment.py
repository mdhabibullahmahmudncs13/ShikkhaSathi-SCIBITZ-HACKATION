"""
Assessment Models
Database models for teacher-created assessments, rubrics, and grading
"""

from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, JSON, ForeignKey, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import uuid

from app.db.session import Base

class Assessment(Base):
    """Teacher-created assessment model"""
    __tablename__ = "assessments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    subject = Column(String(100), nullable=False)
    grade = Column(Integer, nullable=False)
    
    # Teacher who created the assessment
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Assessment configuration
    bloom_levels = Column(JSON, nullable=False)  # List of bloom levels [1,2,3,4,5,6]
    topics = Column(JSON, nullable=False)  # List of topics
    question_count = Column(Integer, nullable=False, default=10)
    time_limit = Column(Integer, nullable=False)  # Time limit in minutes
    difficulty = Column(String(20), nullable=False, default="medium")  # easy, medium, hard, adaptive
    
    # Scheduling
    scheduled_date = Column(DateTime)
    due_date = Column(DateTime)
    assigned_classes = Column(JSON, nullable=False)  # List of class IDs
    
    # Status and metadata
    is_published = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    teacher = relationship("User")
    questions = relationship("AssessmentQuestion", back_populates="assessment", cascade="all, delete-orphan")
    rubric = relationship("AssessmentRubric", back_populates="assessment", uselist=False, cascade="all, delete-orphan")
    attempts = relationship("AssessmentAttempt", back_populates="assessment")

class AssessmentQuestion(Base):
    """Individual questions within an assessment"""
    __tablename__ = "assessment_questions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assessment_id = Column(UUID(as_uuid=True), ForeignKey("assessments.id"), nullable=False)
    
    # Question content
    question_type = Column(String(50), nullable=False)  # multiple_choice, true_false, short_answer, essay
    question_text = Column(Text, nullable=False)
    options = Column(JSON)  # For multiple choice questions
    correct_answer = Column(Text, nullable=False)
    explanation = Column(Text)
    
    # Question metadata
    bloom_level = Column(Integer, nullable=False)
    topic = Column(String(200), nullable=False)
    difficulty = Column(Integer, nullable=False)  # 1-10 scale
    points = Column(Integer, nullable=False, default=1)
    order_index = Column(Integer, nullable=False)
    
    # AI generation metadata
    source_references = Column(JSON)  # References to NCTB content
    quality_score = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    assessment = relationship("Assessment", back_populates="questions")
    responses = relationship("AssessmentResponse", back_populates="question")

class AssessmentRubric(Base):
    """Rubric for assessment grading"""
    __tablename__ = "assessment_rubrics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assessment_id = Column(UUID(as_uuid=True), ForeignKey("assessments.id"), nullable=False)
    
    title = Column(String(255), nullable=False)
    description = Column(Text)
    total_points = Column(Integer, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    assessment = relationship("Assessment", back_populates="rubric")
    criteria = relationship("RubricCriterion", back_populates="rubric", cascade="all, delete-orphan")

class RubricCriterion(Base):
    """Individual criteria within a rubric"""
    __tablename__ = "rubric_criteria"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rubric_id = Column(UUID(as_uuid=True), ForeignKey("assessment_rubrics.id"), nullable=False)
    
    name = Column(String(255), nullable=False)
    description = Column(Text)
    weight = Column(Float, nullable=False, default=1.0)  # Weight in final score calculation
    order_index = Column(Integer, nullable=False)
    
    # Relationships
    rubric = relationship("AssessmentRubric", back_populates="criteria")
    levels = relationship("RubricLevel", back_populates="criterion", cascade="all, delete-orphan")

class RubricLevel(Base):
    """Performance levels within a rubric criterion"""
    __tablename__ = "rubric_levels"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    criterion_id = Column(UUID(as_uuid=True), ForeignKey("rubric_criteria.id"), nullable=False)
    
    name = Column(String(100), nullable=False)  # e.g., "Excellent", "Good", "Needs Improvement"
    description = Column(Text, nullable=False)
    points = Column(Integer, nullable=False)
    order_index = Column(Integer, nullable=False)
    
    # Relationships
    criterion = relationship("RubricCriterion", back_populates="levels")

class AssessmentAttempt(Base):
    """Student attempts at teacher-created assessments"""
    __tablename__ = "assessment_attempts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assessment_id = Column(UUID(as_uuid=True), ForeignKey("assessments.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Attempt details
    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    completed_at = Column(DateTime)
    time_taken_seconds = Column(Integer)
    
    # Scoring
    total_score = Column(Integer, default=0)
    max_score = Column(Integer, nullable=False)
    percentage = Column(Float)
    
    # Status
    is_submitted = Column(Boolean, default=False)
    is_graded = Column(Boolean, default=False)
    graded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))  # Teacher who graded
    graded_at = Column(DateTime)
    
    # Feedback
    teacher_feedback = Column(Text)
    rubric_scores = Column(JSON)  # Scores for each rubric criterion
    
    # Relationships
    assessment = relationship("Assessment", back_populates="attempts")
    student = relationship("User", foreign_keys=[student_id])
    grader = relationship("User", foreign_keys=[graded_by])
    responses = relationship("AssessmentResponse", back_populates="attempt", cascade="all, delete-orphan")

class AssessmentResponse(Base):
    """Individual question responses within an assessment attempt"""
    __tablename__ = "assessment_responses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id = Column(UUID(as_uuid=True), ForeignKey("assessment_attempts.id"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("assessment_questions.id"), nullable=False)
    
    # Response content
    student_answer = Column(Text, nullable=False)
    is_correct = Column(Boolean)
    points_earned = Column(Integer, default=0)
    time_taken_seconds = Column(Integer)
    
    # Flags and metadata
    is_flagged = Column(Boolean, default=False)  # Flagged for review
    teacher_comments = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    attempt = relationship("AssessmentAttempt", back_populates="responses")
    question = relationship("AssessmentQuestion", back_populates="responses")

class AssessmentAnalytics(Base):
    """Analytics data for assessments"""
    __tablename__ = "assessment_analytics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assessment_id = Column(UUID(as_uuid=True), ForeignKey("assessments.id"), nullable=False)
    
    # Overall metrics
    total_attempts = Column(Integer, default=0)
    completion_rate = Column(Float, default=0.0)
    average_score = Column(Float, default=0.0)
    average_time_minutes = Column(Float, default=0.0)
    
    # Question-level analytics
    question_analytics = Column(JSON)  # Detailed analytics per question
    
    # Class comparison data
    class_comparisons = Column(JSON)  # Performance by class
    
    # Difficulty analysis
    difficulty_analysis = Column(JSON)  # Performance by difficulty level
    
    # Last updated
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    assessment = relationship("Assessment")