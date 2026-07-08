"""
Teacher-related Pydantic schemas for API serialization
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, validator
from uuid import UUID


class TeacherCreate(BaseModel):
    """Schema for creating a new teacher"""
    email: str = Field(..., description="Teacher's email address")
    password: str = Field(..., min_length=8, description="Password (minimum 8 characters)")
    full_name: str = Field(..., min_length=2, description="Teacher's full name")
    employee_id: Optional[str] = Field(None, description="Employee/Staff ID")
    subjects: List[str] = Field(..., min_length=1, description="Subjects taught")
    grade_levels: List[int] = Field(..., min_length=1, description="Grade levels taught (6-12)")
    department: Optional[str] = Field(None, description="Department/Faculty")
    phone: Optional[str] = Field(None, description="Contact phone number")
    bio: Optional[str] = Field(None, max_length=500, description="Teacher biography")
    is_active: bool = Field(True, description="Account active status")
    
    @validator('subjects')
    def validate_subjects(cls, v):
        """Validate subjects list"""
        if not v or len(v) == 0:
            raise ValueError('At least one subject is required')
        
        valid_subjects = [
            'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Bangla',
            'History', 'Geography', 'Economics', 'Civics', 'ICT', 'Religion'
        ]
        
        for subject in v:
            if subject not in valid_subjects:
                raise ValueError(f'Invalid subject: {subject}. Valid subjects: {", ".join(valid_subjects)}')
        
        return v
    
    @validator('grade_levels')
    def validate_grade_levels(cls, v):
        """Validate grade levels"""
        if not v or len(v) == 0:
            raise ValueError('At least one grade level is required')
        
        for grade in v:
            if grade < 6 or grade > 12:
                raise ValueError('Grade levels must be between 6 and 12')
        
        return sorted(list(set(v)))  # Remove duplicates and sort
    
    @validator('email')
    def validate_email(cls, v):
        """Basic email validation"""
        if '@' not in v or '.' not in v:
            raise ValueError('Invalid email format')
        return v.lower()


class TeacherLogin(BaseModel):
    """Schema for teacher login"""
    email: str = Field(..., description="Teacher's email address")
    password: str = Field(..., description="Password")
    
    @validator('email')
    def validate_email(cls, v):
        return v.lower()


class TeacherUpdate(BaseModel):
    """Schema for updating teacher profile"""
    employee_id: Optional[str] = Field(None, description="Employee/Staff ID")
    subjects: Optional[List[str]] = Field(None, description="Subjects taught")
    grade_levels: Optional[List[int]] = Field(None, description="Grade levels taught")
    department: Optional[str] = Field(None, description="Department/Faculty")
    phone: Optional[str] = Field(None, description="Contact phone number")
    bio: Optional[str] = Field(None, max_length=500, description="Teacher biography")
    
    @validator('subjects')
    def validate_subjects(cls, v):
        if v is not None:
            return TeacherCreate.validate_subjects(v)
        return v
    
    @validator('grade_levels')
    def validate_grade_levels(cls, v):
        if v is not None:
            return TeacherCreate.validate_grade_levels(v)
        return v


class TeacherPermissionCreate(BaseModel):
    """Schema for creating teacher permissions"""
    teacher_id: UUID = Field(..., description="Teacher ID")
    permission_name: str = Field(..., description="Permission name")
    granted_by: str = Field(..., description="ID of user granting permission")


class TeacherPermissionResponse(BaseModel):
    """Schema for teacher permission response"""
    id: UUID
    teacher_id: UUID
    permission_name: str
    granted_by: str
    granted_at: datetime
    is_active: bool
    revoked_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class TeacherProfileResponse(BaseModel):
    """Schema for teacher profile response"""
    id: UUID
    user_id: UUID
    employee_id: Optional[str]
    subjects: List[str]
    grade_levels: List[int]
    department: Optional[str]
    phone: Optional[str]
    bio: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class TeacherResponse(BaseModel):
    """Schema for complete teacher response"""
    id: UUID
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime]
    teacher_profile: TeacherProfileResponse
    permissions: List[str]
    
    class Config:
        from_attributes = True


class TeacherAuthResponse(BaseModel):
    """Schema for teacher authentication response"""
    access_token: str
    token_type: str = "bearer"
    user: TeacherResponse
    expires_in: int = Field(default=60 * 60 * 24 * 8, description="Token expiry in seconds")


class TeacherSessionData(BaseModel):
    """Schema for teacher session data"""
    user_id: str
    email: str
    role: str
    teacher_id: str
    employee_id: Optional[str]
    subjects: List[str]
    grade_levels: List[int]
    department: Optional[str]
    permissions: List[str]
    created_at: str


class TeacherAccessValidation(BaseModel):
    """Schema for teacher access validation"""
    valid: bool
    reason: Optional[str] = None
    missing_permissions: Optional[List[str]] = None
    user: Optional[Dict[str, Any]] = None
    teacher_profile: Optional[Dict[str, Any]] = None
    permissions: Optional[List[str]] = None


class TeacherClassAssignment(BaseModel):
    """Schema for assigning teachers to classes"""
    teacher_id: UUID = Field(..., description="Teacher ID")
    class_ids: List[UUID] = Field(..., min_length=1, description="List of class IDs to assign")
    assigned_by: str = Field(..., description="ID of user making the assignment")


class TeacherDashboardSummary(BaseModel):
    """Schema for teacher dashboard summary data"""
    total_students: int
    total_classes: int
    active_assessments: int
    pending_grading: int
    at_risk_students: int
    recent_activity: List[Dict[str, Any]]
    class_performance_summary: Dict[str, Any]