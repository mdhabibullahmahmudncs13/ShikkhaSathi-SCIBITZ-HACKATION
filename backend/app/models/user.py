from sqlalchemy import Column, String, Integer, Boolean, DateTime, Enum, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum
from app.db.session import Base


class UserRole(str, enum.Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    PARENT = "parent"
    ADMIN = "admin"


class Medium(str, enum.Enum):
    BANGLA = "bangla"
    ENGLISH = "english"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)  # Mobile number
    date_of_birth = Column(Date, nullable=True)  # Date of birth
    school = Column(String(255), nullable=True)  # School name
    district = Column(String(100), nullable=True)  # District/location
    grade = Column(Integer, nullable=True)  # For students, 6-12
    medium = Column(Enum(Medium), nullable=True)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.STUDENT)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    progress = relationship("StudentProgress", back_populates="user")
    quiz_attempts = relationship("QuizAttempt", back_populates="user")
    gamification = relationship("Gamification", back_populates="user", uselist=False)
    learning_paths = relationship("LearningPath", back_populates="user")