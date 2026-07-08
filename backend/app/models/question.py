"""
Question model for quiz question bank.
"""
from sqlalchemy import Column, String, Integer, Text, Boolean, JSON, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.db.session import Base


class Question(Base):
    """Question model for storing quiz questions"""
    __tablename__ = "questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Content
    question_text = Column(Text, nullable=False)
    question_text_bangla = Column(Text, nullable=True)  # Bangla translation
    
    # Multiple choice options
    option_a = Column(Text, nullable=False)
    option_b = Column(Text, nullable=False)
    option_c = Column(Text, nullable=False)
    option_d = Column(Text, nullable=False)
    
    # Bangla options
    option_a_bangla = Column(Text, nullable=True)
    option_b_bangla = Column(Text, nullable=True)
    option_c_bangla = Column(Text, nullable=True)
    option_d_bangla = Column(Text, nullable=True)
    
    # Correct answer (A, B, C, or D)
    correct_answer = Column(String(1), nullable=False)
    
    # Explanation
    explanation = Column(Text, nullable=False)
    explanation_bangla = Column(Text, nullable=True)
    
    # Classification
    subject = Column(String(50), nullable=False, index=True)
    topic = Column(String(100), nullable=False, index=True)
    subtopic = Column(String(100), nullable=True)
    grade = Column(Integer, nullable=False, index=True)  # 6-12
    
    # Difficulty and cognitive level
    difficulty_level = Column(Integer, nullable=False, index=True)  # 1-5 (1=easiest, 5=hardest)
    bloom_level = Column(Integer, nullable=False, index=True)  # 1-6 (Bloom's Taxonomy)
    
    # Metadata
    tags = Column(JSON, nullable=True)  # Additional tags for categorization
    source = Column(String(100), nullable=True)  # NCTB, Custom, etc.
    chapter = Column(String(100), nullable=True)
    
    # Quality metrics
    times_used = Column(Integer, default=0)
    times_correct = Column(Integer, default=0)
    average_time_seconds = Column(Integer, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)  # Teacher/admin verified
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Indexes for efficient querying
    __table_args__ = (
        Index('idx_question_lookup', 'subject', 'topic', 'grade', 'difficulty_level', 'bloom_level'),
        Index('idx_question_active', 'is_active', 'is_verified'),
    )
    
    def __repr__(self):
        return f"<Question {self.id} - {self.subject}/{self.topic} - Difficulty {self.difficulty_level}>"
    
    @property
    def difficulty_percentage(self):
        """Calculate difficulty as percentage based on usage"""
        if self.times_used == 0:
            return None
        return (self.times_correct / self.times_used) * 100
    
    def to_dict(self, include_answer=False, language='english'):
        """Convert question to dictionary"""
        data = {
            'id': str(self.id),
            'question_text': self.question_text_bangla if language == 'bangla' and self.question_text_bangla else self.question_text,
            'options': {
                'A': self.option_a_bangla if language == 'bangla' and self.option_a_bangla else self.option_a,
                'B': self.option_b_bangla if language == 'bangla' and self.option_b_bangla else self.option_b,
                'C': self.option_c_bangla if language == 'bangla' and self.option_c_bangla else self.option_c,
                'D': self.option_d_bangla if language == 'bangla' and self.option_d_bangla else self.option_d,
            },
            'subject': self.subject,
            'topic': self.topic,
            'difficulty_level': self.difficulty_level,
            'bloom_level': self.bloom_level,
        }
        
        if include_answer:
            data['correct_answer'] = self.correct_answer
            data['explanation'] = self.explanation_bangla if language == 'bangla' and self.explanation_bangla else self.explanation
        
        return data


class Quiz(Base):
    """Quiz model for storing generated quizzes"""
    __tablename__ = "quizzes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Configuration
    subject = Column(String(50), nullable=False)
    topic = Column(String(100), nullable=True)
    grade = Column(Integer, nullable=False)
    difficulty_level = Column(Integer, nullable=False)
    bloom_level = Column(Integer, nullable=False)
    question_count = Column(Integer, nullable=False)
    time_limit_minutes = Column(Integer, nullable=True)
    
    # Questions (stored as array of question IDs)
    question_ids = Column(JSON, nullable=False)
    
    # Status
    status = Column(String(20), default='active')  # active, completed, expired
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<Quiz {self.id} - {self.subject} - {self.question_count} questions>"
