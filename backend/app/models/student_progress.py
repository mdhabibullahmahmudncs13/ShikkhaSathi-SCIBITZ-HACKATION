from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum
from app.db.session import Base


class MasteryLevel(str, enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class StudentProgress(Base):
    __tablename__ = "student_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    subject = Column(String(50), nullable=False)
    topic = Column(String(100), nullable=False)
    bloom_level = Column(Integer, nullable=False)  # 1-6
    completion_percentage = Column(Numeric(5, 2), default=0.00)
    time_spent_minutes = Column(Integer, default=0)
    last_accessed = Column(DateTime(timezone=True), server_default=func.now())
    mastery_level = Column(String(20), default=MasteryLevel.BEGINNER)
    
    # Relationship
    user = relationship("User", back_populates="progress")