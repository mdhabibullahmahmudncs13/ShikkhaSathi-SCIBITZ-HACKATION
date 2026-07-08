"""
Admin Panel Pydantic schemas
Data models for admin API endpoints
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime, date
from app.models.user import UserRole, Medium

# Dashboard & Analytics Schemas
class AdminDashboardStats(BaseModel):
    total_users: int
    active_users: int
    students_count: int
    teachers_count: int
    parents_count: int
    recent_registrations: int
    total_quiz_attempts: int
    completed_quizzes: int
    total_textbooks: int
    total_learning_modules: int
    system_status: str
    top_students: List[Dict[str, Any]]

# User Management Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    school: Optional[str] = None
    district: Optional[str] = None
    grade: Optional[int] = None
    medium: Optional[Medium] = None
    role: UserRole
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    school: Optional[str] = None
    district: Optional[str] = None
    grade: Optional[int] = None
    medium: Optional[Medium] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class UserInDB(UserBase):
    id: str
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UserDetail(BaseModel):
    user: UserInDB
    total_progress_entries: int
    total_xp: int
    current_level: int
    quiz_attempts: int
    last_activity: Optional[datetime]

class UserListResponse(BaseModel):
    users: List[UserInDB]
    total: int
    page: int
    limit: int
    total_pages: int

class BulkUserAction(BaseModel):
    user_ids: List[str]
    action: str  # "activate", "deactivate", "delete"

# Content Management Schemas
class TextbookDetail(BaseModel):
    filename: str
    subject: str
    grade: str
    chapters: int
    total_pages: int

class SubjectStats(BaseModel):
    textbooks: int
    chapters: int

class ContentStats(BaseModel):
    total_textbooks: int
    subjects: Dict[str, SubjectStats]
    total_chapters: int
    textbook_details: List[TextbookDetail]

# System Health Schemas
class SystemHealth(BaseModel):
    database_status: str
    database_response_time: str
    content_service_status: str
    total_textbooks: int
    system_uptime: str
    memory_usage: str
    cpu_usage: str

# Settings Schemas
class AdminSettings(BaseModel):
    site_name: str = "ShikkhaSathi"
    maintenance_mode: bool = False
    registration_enabled: bool = True
    max_quiz_attempts: int = 3
    default_xp_per_question: int = 10
    email_notifications: bool = True
    backup_frequency: str = "daily"

# Analytics Schemas
class DailyRegistration(BaseModel):
    date: str
    count: int

class RoleDistribution(BaseModel):
    role: str
    count: int

class UserGrowthAnalytics(BaseModel):
    daily_registrations: List[DailyRegistration]
    role_distribution: List[RoleDistribution]

class QuizActivity(BaseModel):
    date: str
    attempts: int
    completed: int

class SubjectActivity(BaseModel):
    subject: str
    attempts: int

class LearningActivityAnalytics(BaseModel):
    quiz_activity: List[QuizActivity]
    subject_activity: List[SubjectActivity]