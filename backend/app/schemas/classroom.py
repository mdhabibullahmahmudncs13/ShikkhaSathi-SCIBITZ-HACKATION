"""
Pydantic schemas for classroom management API.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class StudentPermissions(BaseModel):
    """Student permissions configuration."""
    can_access_chat: bool = True
    can_take_quizzes: bool = True
    can_view_leaderboard: bool = True
    content_restrictions: Optional[List[str]] = None
    time_restrictions: Optional[Dict[str, Any]] = None


class ClassroomStudentBase(BaseModel):
    """Base classroom student schema."""
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    student_id: Optional[str] = Field(None, max_length=50)
    grade: Optional[int] = Field(None, ge=1, le=12)
    parent_email: Optional[EmailStr] = None
    parent_phone: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = Field(None, max_length=500)
    permissions: Optional[StudentPermissions] = None


class ClassroomStudentCreate(ClassroomStudentBase):
    """Schema for creating a new student in classroom."""
    pass


class ClassroomStudentUpdate(BaseModel):
    """Schema for updating student in classroom."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    student_id: Optional[str] = Field(None, max_length=50)
    grade: Optional[int] = Field(None, ge=1, le=12)
    parent_email: Optional[EmailStr] = None
    parent_phone: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None
    permissions: Optional[StudentPermissions] = None


class ClassroomStudent(ClassroomStudentBase):
    """Complete classroom student schema with computed fields."""
    id: str
    total_xp: int = 0
    level: int = 1
    current_streak: int = 0
    last_active: Optional[datetime] = None
    is_active: bool = True
    is_at_risk: bool = False
    is_high_performer: bool = False
    enrolled_at: datetime
    permissions: StudentPermissions

    class Config:
        from_attributes = True


class BulkOperationRequest(BaseModel):
    """Schema for bulk operations on students."""
    student_ids: List[str] = Field(..., min_items=1)
    operation: str = Field(..., pattern="^(activate|deactivate|remove|update_permissions|send_message)$")
    data: Optional[Dict[str, Any]] = None


class BulkOperationResult(BaseModel):
    """Result of bulk operation."""
    successful: int
    failed: int
    errors: Optional[List[Dict[str, str]]] = None


class StudentImportResult(BaseModel):
    """Result of student import operation."""
    successful: int
    failed: int
    duplicates: int
    errors: Optional[List[Dict[str, Any]]] = None


class AssessmentSettings(BaseModel):
    """Assessment settings for classroom."""
    allow_retakes: bool = True
    max_attempts: Optional[int] = None
    time_limit: Optional[int] = None  # in minutes
    show_correct_answers: bool = True


class CommunicationSettings(BaseModel):
    """Communication settings for classroom."""
    allow_student_messages: bool = True
    allow_parent_notifications: bool = True
    auto_progress_reports: bool = True


class ClassroomSettingsBase(BaseModel):
    """Base classroom settings schema."""
    allow_self_enrollment: bool = False
    require_approval: bool = True
    max_students: Optional[int] = Field(None, ge=1, le=1000)
    default_permissions: StudentPermissions
    content_filters: List[str] = []
    assessment_settings: AssessmentSettings
    communication_settings: CommunicationSettings


class ClassroomSettingsCreate(ClassroomSettingsBase):
    """Schema for creating classroom settings."""
    pass


class ClassroomSettingsUpdate(BaseModel):
    """Schema for updating classroom settings."""
    allow_self_enrollment: Optional[bool] = None
    require_approval: Optional[bool] = None
    max_students: Optional[int] = Field(None, ge=1, le=1000)
    default_permissions: Optional[StudentPermissions] = None
    content_filters: Optional[List[str]] = None
    assessment_settings: Optional[AssessmentSettings] = None
    communication_settings: Optional[CommunicationSettings] = None


class ClassroomSettings(ClassroomSettingsBase):
    """Complete classroom settings schema."""
    id: str
    class_id: str
    updated_at: datetime

    class Config:
        from_attributes = True


class ClassroomOverview(BaseModel):
    """Overview of classroom with basic metrics."""
    id: str
    name: str
    grade: int
    subject: str
    total_students: int
    active_students: int
    at_risk_students: int
    high_performers: int
    last_activity: Optional[datetime] = None


class StudentRosterFilter(BaseModel):
    """Filter options for student roster."""
    search_query: Optional[str] = None
    status_filter: Optional[str] = Field(None, pattern="^(all|active|inactive|at_risk|high_performer)$")
    grade_filter: Optional[int] = Field(None, ge=1, le=12)
    show_inactive: bool = False


class StudentRosterResponse(BaseModel):
    """Response for student roster with filtering."""
    students: List[ClassroomStudent]
    total_count: int
    filtered_count: int
    filters_applied: StudentRosterFilter