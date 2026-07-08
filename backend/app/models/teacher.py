"""
Teacher Models
Database models for teachers, classes, and student assignments
"""

from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, JSON, ForeignKey, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import uuid

from app.db.session import Base


# Association table for many-to-many relationship between students and teacher classes
student_class_association = Table(
    'student_class_assignments',
    Base.metadata,
    Column('student_id', UUID(as_uuid=True), ForeignKey('users.id'), primary_key=True),
    Column('teacher_class_id', UUID(as_uuid=True), ForeignKey('teacher_classes.id'), primary_key=True),
    Column('assigned_at', DateTime, default=datetime.utcnow),
    Column('is_active', Boolean, default=True)
)


class Teacher(Base):
    """Teacher profile model extending the User model"""
    __tablename__ = "teachers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    employee_id = Column(String(50), unique=True, nullable=True)
    
    # Teaching subjects and grades
    subjects = Column(JSON, nullable=False, default=list)  # List of subjects taught
    grade_levels = Column(JSON, nullable=False, default=list)  # List of grades taught (6-12)
    
    # Professional information
    department = Column(String(100), nullable=True)
    qualification = Column(String(200), nullable=True)
    experience_years = Column(Integer, nullable=True)
    
    # Contact and preferences
    phone = Column(String(20), nullable=True)
    bio = Column(Text, nullable=True)
    preferences = Column(JSON, nullable=False, default=dict)  # UI preferences, notification settings
    
    # Status and metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", backref="teacher_profile")
    classes = relationship("TeacherClass", back_populates="teacher", cascade="all, delete-orphan")
    # Note: assessments relationship will be added when Assessment model is updated to reference teachers


class TeacherClass(Base):
    """Teacher's class/section model"""
    __tablename__ = "teacher_classes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("teachers.id"), nullable=False)
    
    # Class information
    class_name = Column(String(100), nullable=False)  # e.g., "Class 9A", "Physics Advanced"
    subject = Column(String(50), nullable=False)
    grade_level = Column(Integer, nullable=False)  # 6-12
    section = Column(String(10), nullable=True)  # A, B, C, etc.
    
    # Google Classroom-style join code
    class_code = Column(String(10), unique=True, nullable=False)  # e.g., "ABC123XYZ"
    code_enabled = Column(Boolean, default=True)  # Teacher can disable code joining
    code_expires_at = Column(DateTime, nullable=True)  # Optional expiration
    
    # Class details
    description = Column(Text, nullable=True)
    room_number = Column(String(20), nullable=True)
    schedule = Column(JSON, nullable=False, default=dict)  # Class schedule/timing
    
    # Academic information
    academic_year = Column(String(20), nullable=False)  # e.g., "2024-2025"
    semester = Column(String(20), nullable=True)  # "Spring", "Fall", etc.
    
    # Settings
    max_students = Column(Integer, default=50)
    is_active = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    teacher = relationship("Teacher", back_populates="classes")
    students = relationship(
        "User", 
        secondary=student_class_association,
        backref="enrolled_classes"
    )


class TeacherPermission(Base):
    """Teacher permissions and access control"""
    __tablename__ = "teacher_permissions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("teachers.id"), nullable=False)
    
    # Permission categories
    permission_type = Column(String(50), nullable=False)  # 'assessment', 'analytics', 'communication', etc.
    permission_level = Column(String(20), nullable=False)  # 'read', 'write', 'admin'
    
    # Scope limitations
    scope_data = Column(JSON, nullable=False, default=dict)  # Additional scope restrictions
    
    # Status
    is_active = Column(Boolean, default=True)
    granted_at = Column(DateTime, default=datetime.utcnow)
    granted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    expires_at = Column(DateTime, nullable=True)
    
    # Relationships
    teacher = relationship("Teacher")
    granted_by_user = relationship("User", foreign_keys=[granted_by])


class ClassAnnouncement(Base):
    """Announcements for teacher classes"""
    __tablename__ = "class_announcements"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_class_id = Column(UUID(as_uuid=True), ForeignKey("teacher_classes.id"), nullable=False)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("teachers.id"), nullable=False)
    
    # Announcement content
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    priority = Column(String(20), default="normal")  # low, normal, high, urgent
    
    # Scheduling
    scheduled_for = Column(DateTime, nullable=True)  # For scheduled announcements
    expires_at = Column(DateTime, nullable=True)
    
    # Targeting
    target_students = Column(JSON, nullable=False, default=list)  # Empty list = all students
    
    # Status
    is_published = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    published_at = Column(DateTime, nullable=True)
    
    # Relationships
    teacher_class = relationship("TeacherClass")
    teacher = relationship("Teacher")


class StudentClass(Base):
    """Student enrollment in a teacher's class with detailed information"""
    __tablename__ = "student_classes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    teacher_class_id = Column(UUID(as_uuid=True), ForeignKey("teacher_classes.id"), nullable=False)
    
    # Enrollment details
    grade = Column(Integer, nullable=True)  # Student's grade level
    is_active = Column(Boolean, default=True)
    enrolled_at = Column(DateTime, default=datetime.utcnow)
    
    # Additional information
    notes = Column(Text, nullable=True)  # Teacher notes about the student
    permissions = Column(JSON, nullable=False, default=dict)  # Student-specific permissions
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student = relationship("User", foreign_keys=[student_id])
    teacher_class = relationship("TeacherClass")


class StudentClassProgress(Base):
    """Track student progress within a specific teacher's class"""
    __tablename__ = "student_class_progress"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    teacher_class_id = Column(UUID(as_uuid=True), ForeignKey("teacher_classes.id"), nullable=False)
    
    # Progress metrics
    overall_progress = Column(Integer, default=0)  # 0-100 percentage
    total_xp_earned = Column(Integer, default=0)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    
    # Activity tracking
    last_activity = Column(DateTime, nullable=True)
    total_time_spent = Column(Integer, default=0)  # in minutes
    quiz_attempts = Column(Integer, default=0)
    assessments_completed = Column(Integer, default=0)
    
    # Performance metrics
    average_score = Column(Integer, default=0)  # 0-100 percentage
    improvement_trend = Column(String(20), default="stable")  # improving, declining, stable
    
    # Flags
    is_at_risk = Column(Boolean, default=False)
    needs_attention = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student = relationship("User", foreign_keys=[student_id])
    teacher_class = relationship("TeacherClass")