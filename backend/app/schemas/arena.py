"""
Pydantic schemas for Arena, Adventure, and StudyMaterial models
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

# Arena Schemas
class ArenaBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    subject: str = Field(..., min_length=1, max_length=100)
    grade: int = Field(..., ge=6, le=12)
    difficulty_level: str = Field(default="beginner", pattern="^(beginner|intermediate|advanced)$")
    learning_objectives: List[str] = Field(default_factory=list)
    prerequisites: List[str] = Field(default_factory=list)

class ArenaCreate(ArenaBase):
    pass

class ArenaUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, min_length=1)
    subject: Optional[str] = Field(None, min_length=1, max_length=100)
    grade: Optional[int] = Field(None, ge=6, le=12)
    difficulty_level: Optional[str] = Field(None, pattern="^(beginner|intermediate|advanced)$")
    learning_objectives: Optional[List[str]] = None
    prerequisites: Optional[List[str]] = None
    is_active: Optional[bool] = None

class Arena(ArenaBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    created_by: int
    adventures_count: Optional[int] = 0
    students_enrolled: Optional[int] = 0

    class Config:
        from_attributes = True

# Adventure Schemas
class AdventureBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    arena_id: int = Field(..., gt=0)
    difficulty_level: str = Field(default="beginner", pattern="^(beginner|intermediate|advanced)$")
    estimated_duration: int = Field(..., ge=5, le=180)  # 5 minutes to 3 hours
    content_type: str = Field(default="interactive", pattern="^(interactive|quiz|simulation|video|reading)$")
    learning_objectives: List[str] = Field(default_factory=list)
    bloom_levels: List[int] = Field(default_factory=list)
    content_data: Dict[str, Any] = Field(default_factory=dict)

class AdventureCreate(AdventureBase):
    pass

class AdventureUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, min_length=1)
    arena_id: Optional[int] = Field(None, gt=0)
    difficulty_level: Optional[str] = Field(None, pattern="^(beginner|intermediate|advanced)$")
    estimated_duration: Optional[int] = Field(None, ge=5, le=180)
    content_type: Optional[str] = Field(None, pattern="^(interactive|quiz|simulation|video|reading)$")
    learning_objectives: Optional[List[str]] = None
    bloom_levels: Optional[List[int]] = None
    content_data: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class Adventure(AdventureBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    created_by: int
    arena_name: Optional[str] = None

    class Config:
        from_attributes = True

# Study Material Schemas
class StudyMaterialBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    subject: str = Field(..., min_length=1, max_length=100)
    grade: int = Field(..., ge=6, le=12)
    material_type: str = Field(..., pattern="^(audio|video|mindmap|report|flashcard|infographic|slides)$")
    tags: List[str] = Field(default_factory=list)
    adventure_id: Optional[int] = Field(None, gt=0)
    arena_id: Optional[int] = Field(None, gt=0)

class StudyMaterialCreate(StudyMaterialBase):
    pass

class StudyMaterialUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, min_length=1)
    subject: Optional[str] = Field(None, min_length=1, max_length=100)
    grade: Optional[int] = Field(None, ge=6, le=12)
    material_type: Optional[str] = Field(None, pattern="^(audio|video|mindmap|report|flashcard|infographic|slides)$")
    tags: Optional[List[str]] = None
    adventure_id: Optional[int] = Field(None, gt=0)
    arena_id: Optional[int] = Field(None, gt=0)
    is_active: Optional[bool] = None

class StudyMaterial(StudyMaterialBase):
    id: int
    file_name: str
    file_size: int
    file_type: str
    is_active: bool
    download_count: int
    created_at: datetime
    updated_at: datetime
    uploaded_by: int
    file_size_formatted: Optional[str] = None

    class Config:
        from_attributes = True

# Response Schemas
class ArenaListResponse(BaseModel):
    arenas: List[Arena]
    total: int
    page: int
    per_page: int

class AdventureListResponse(BaseModel):
    adventures: List[Adventure]
    total: int
    page: int
    per_page: int

class StudyMaterialListResponse(BaseModel):
    materials: List[StudyMaterial]
    total: int
    page: int
    per_page: int

# File Upload Schema
class FileUploadResponse(BaseModel):
    message: str
    material_id: int
    file_path: str
    file_size: int