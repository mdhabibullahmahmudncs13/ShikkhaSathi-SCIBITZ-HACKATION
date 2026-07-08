from typing import Optional, Union
from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime, date
from uuid import UUID
from app.models.user import UserRole, Medium


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    school: Optional[str] = None
    district: Optional[str] = None
    grade: Optional[int] = None
    medium: Optional[Medium] = None
    role: UserRole = UserRole.STUDENT
    is_active: bool = True

    @field_validator('grade')
    @classmethod
    def validate_grade(cls, v):
        if v is not None and (v < 6 or v > 12):
            raise ValueError('Grade must be between 6 and 12')
        return v

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if v is not None and v.strip():
            # Bangladesh mobile number validation
            import re
            # Allow formats: 01XXXXXXXXX, +8801XXXXXXXXX, 8801XXXXXXXXX
            if not re.match(r'^(\+88|88)?01[3-9]\d{8}$', v):
                raise ValueError('Invalid Bangladesh mobile number format. Use format: 01XXXXXXXXX (11 digits)')
        return v


class UserCreate(UserBase):
    password: str

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    school: Optional[str] = None
    district: Optional[str] = None
    grade: Optional[int] = None
    medium: Optional[Medium] = None
    is_active: Optional[bool] = None

    @field_validator('grade')
    @classmethod
    def validate_grade(cls, v):
        if v is not None and (v < 6 or v > 12):
            raise ValueError('Grade must be between 6 and 12')
        return v

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if v is not None and v.strip():
            # Bangladesh mobile number validation
            import re
            # Allow formats: 01XXXXXXXXX, +8801XXXXXXXXX, 8801XXXXXXXXX
            if not re.match(r'^(\+88|88)?01[3-9]\d{8}$', v):
                raise ValueError('Invalid Bangladesh mobile number format. Use format: 01XXXXXXXXX (11 digits)')
        return v


class UserInDBBase(UserBase):
    id: str
    created_at: datetime
    last_login: Optional[datetime] = None

    @field_validator('id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        if isinstance(v, UUID):
            return str(v)
        return v

    model_config = {"from_attributes": True}


class User(UserInDBBase):
    pass


class UserInDB(UserInDBBase):
    password_hash: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenPayload(BaseModel):
    sub: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str