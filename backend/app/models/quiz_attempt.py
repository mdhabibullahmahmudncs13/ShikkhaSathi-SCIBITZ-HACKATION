from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.db.session import Base


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    quiz_id = Column(UUID(as_uuid=True), nullable=False)
    score = Column(Integer, nullable=False)
    max_score = Column(Integer, nullable=False)
    time_taken_seconds = Column(Integer, nullable=False)
    difficulty_level = Column(Integer, nullable=False)
    bloom_level = Column(Integer, nullable=False)
    subject = Column(String(50), nullable=False)
    topic = Column(String(100), nullable=False)
    grade = Column(Integer, nullable=False)
    completed_at = Column(DateTime(timezone=True), server_default=func.now())
    answers = Column(JSON, nullable=False)  # Store answers as JSON
    
    # Relationship
    user = relationship("User", back_populates="quiz_attempts")