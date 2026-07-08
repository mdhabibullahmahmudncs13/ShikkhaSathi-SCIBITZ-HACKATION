"""
Admin Content Management API endpoints
Handles arenas, adventures, and study materials
"""

import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from app.core.deps import get_db, get_current_admin_user
from app.models.user import User
from app.models.arena import Arena, Adventure, StudyMaterial
from app.schemas.arena import (
    Arena as ArenaSchema,
    ArenaCreate,
    ArenaUpdate,
    ArenaListResponse,
    Adventure as AdventureSchema,
    AdventureCreate,
    AdventureUpdate,
    AdventureListResponse,
    StudyMaterial as StudyMaterialSchema,
    StudyMaterialCreate,
    StudyMaterialUpdate,
    StudyMaterialListResponse,
    FileUploadResponse
)
from app.core.config import settings

router = APIRouter()

# File upload configuration
UPLOAD_DIR = "uploads/study_materials"
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
ALLOWED_EXTENSIONS = {
    'audio': ['.mp3', '.wav', '.ogg', '.m4a'],
    'video': ['.mp4', '.webm', '.ogg', '.avi', '.mov'],
    'mindmap': ['.png', '.jpg', '.jpeg', '.svg', '.pdf'],
    'report': ['.pdf', '.doc', '.docx'],
    'flashcard': ['.png', '.jpg', '.jpeg', '.svg'],
    'infographic': ['.png', '.jpg', '.jpeg', '.svg', '.pdf'],
    'slides': ['.pdf', '.ppt', '.pptx']
}

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

def format_file_size(size_bytes: int) -> str:
    """Format file size in human readable format"""
    if size_bytes == 0:
        return "0B"
    size_names = ["B", "KB", "MB", "GB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
    return f"{size_bytes:.1f}{size_names[i]}"

# ============================================================================
# ARENA ENDPOINTS
# ============================================================================

@router.get("/arenas", response_model=ArenaListResponse)
async def get_arenas(
    page: int = 1,
    per_page: int = 20,
    subject: Optional[str] = None,
    grade: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Get list of arenas with filtering and pagination"""
    
    query = db.query(Arena).filter(Arena.is_active == True)
    
    # Apply filters
    if subject:
        query = query.filter(Arena.subject == subject)
    if grade:
        query = query.filter(Arena.grade == grade)
    if search:
        query = query.filter(
            or_(
                Arena.name.ilike(f"%{search}%"),
                Arena.description.ilike(f"%{search}%")
            )
        )
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * per_page
    arenas = query.offset(offset).limit(per_page).all()
    
    # Add computed fields
    for arena in arenas:
        arena.adventures_count = db.query(Adventure).filter(
            and_(Adventure.arena_id == arena.id, Adventure.is_active == True)
        ).count()
        # TODO: Add students_enrolled count from enrollment data
        arena.students_enrolled = 0
    
    return ArenaListResponse(
        arenas=arenas,
        total=total,
        page=page,
        per_page=per_page
    )

@router.post("/arenas", response_model=ArenaSchema)
async def create_arena(
    arena_data: ArenaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Create a new arena"""
    
    # Check if arena with same name and subject exists
    existing_arena = db.query(Arena).filter(
        and_(
            Arena.name == arena_data.name,
            Arena.subject == arena_data.subject,
            Arena.is_active == True
        )
    ).first()
    
    if existing_arena:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arena with this name already exists for this subject"
        )
    
    # Create new arena
    arena = Arena(
        **arena_data.dict(),
        created_by=current_user.id
    )
    
    db.add(arena)
    db.commit()
    db.refresh(arena)
    
    return arena

@router.get("/arenas/{arena_id}", response_model=ArenaSchema)
async def get_arena(
    arena_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Get arena by ID"""
    
    arena = db.query(Arena).filter(
        and_(Arena.id == arena_id, Arena.is_active == True)
    ).first()
    
    if not arena:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arena not found"
        )
    
    # Add computed fields
    arena.adventures_count = db.query(Adventure).filter(
        and_(Adventure.arena_id == arena.id, Adventure.is_active == True)
    ).count()
    arena.students_enrolled = 0  # TODO: Implement enrollment tracking
    
    return arena

@router.put("/arenas/{arena_id}", response_model=ArenaSchema)
async def update_arena(
    arena_id: int,
    arena_data: ArenaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Update arena"""
    
    arena = db.query(Arena).filter(
        and_(Arena.id == arena_id, Arena.is_active == True)
    ).first()
    
    if not arena:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arena not found"
        )
    
    # Update fields
    update_data = arena_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(arena, field, value)
    
    db.commit()
    db.refresh(arena)
    
    return arena

@router.delete("/arenas/{arena_id}")
async def delete_arena(
    arena_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Soft delete arena"""
    
    arena = db.query(Arena).filter(
        and_(Arena.id == arena_id, Arena.is_active == True)
    ).first()
    
    if not arena:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arena not found"
        )
    
    # Soft delete arena and its adventures
    arena.is_active = False
    db.query(Adventure).filter(Adventure.arena_id == arena_id).update(
        {"is_active": False}
    )
    
    db.commit()
    
    return {"message": "Arena deleted successfully"}

# ============================================================================
# ADVENTURE ENDPOINTS
# ============================================================================

@router.get("/adventures", response_model=AdventureListResponse)
async def get_adventures(
    page: int = 1,
    per_page: int = 20,
    arena_id: Optional[int] = None,
    difficulty_level: Optional[str] = None,
    content_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Get list of adventures with filtering and pagination"""
    
    query = db.query(Adventure).filter(Adventure.is_active == True)
    
    # Apply filters
    if arena_id:
        query = query.filter(Adventure.arena_id == arena_id)
    if difficulty_level:
        query = query.filter(Adventure.difficulty_level == difficulty_level)
    if content_type:
        query = query.filter(Adventure.content_type == content_type)
    if search:
        query = query.filter(
            or_(
                Adventure.name.ilike(f"%{search}%"),
                Adventure.description.ilike(f"%{search}%")
            )
        )
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * per_page
    adventures = query.offset(offset).limit(per_page).all()
    
    # Add arena names
    for adventure in adventures:
        arena = db.query(Arena).filter(Arena.id == adventure.arena_id).first()
        adventure.arena_name = arena.name if arena else "Unknown Arena"
    
    return AdventureListResponse(
        adventures=adventures,
        total=total,
        page=page,
        per_page=per_page
    )

@router.post("/adventures", response_model=AdventureSchema)
async def create_adventure(
    adventure_data: AdventureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Create a new adventure"""
    
    # Verify arena exists
    arena = db.query(Arena).filter(
        and_(Arena.id == adventure_data.arena_id, Arena.is_active == True)
    ).first()
    
    if not arena:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arena not found"
        )
    
    # Check if adventure with same name exists in arena
    existing_adventure = db.query(Adventure).filter(
        and_(
            Adventure.name == adventure_data.name,
            Adventure.arena_id == adventure_data.arena_id,
            Adventure.is_active == True
        )
    ).first()
    
    if existing_adventure:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Adventure with this name already exists in this arena"
        )
    
    # Create new adventure
    adventure = Adventure(
        **adventure_data.dict(),
        created_by=current_user.id
    )
    
    db.add(adventure)
    db.commit()
    db.refresh(adventure)
    
    # Add arena name
    adventure.arena_name = arena.name
    
    return adventure

@router.get("/adventures/{adventure_id}", response_model=AdventureSchema)
async def get_adventure(
    adventure_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Get adventure by ID"""
    
    adventure = db.query(Adventure).filter(
        and_(Adventure.id == adventure_id, Adventure.is_active == True)
    ).first()
    
    if not adventure:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Adventure not found"
        )
    
    # Add arena name
    arena = db.query(Arena).filter(Arena.id == adventure.arena_id).first()
    adventure.arena_name = arena.name if arena else "Unknown Arena"
    
    return adventure

@router.put("/adventures/{adventure_id}", response_model=AdventureSchema)
async def update_adventure(
    adventure_id: int,
    adventure_data: AdventureUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Update adventure"""
    
    adventure = db.query(Adventure).filter(
        and_(Adventure.id == adventure_id, Adventure.is_active == True)
    ).first()
    
    if not adventure:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Adventure not found"
        )
    
    # Update fields
    update_data = adventure_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(adventure, field, value)
    
    db.commit()
    db.refresh(adventure)
    
    return adventure

@router.delete("/adventures/{adventure_id}")
async def delete_adventure(
    adventure_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Soft delete adventure"""
    
    adventure = db.query(Adventure).filter(
        and_(Adventure.id == adventure_id, Adventure.is_active == True)
    ).first()
    
    if not adventure:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Adventure not found"
        )
    
    # Soft delete adventure
    adventure.is_active = False
    db.commit()
    
    return {"message": "Adventure deleted successfully"}

# ============================================================================
# STUDY MATERIALS ENDPOINTS
# ============================================================================

@router.get("/study-materials", response_model=StudyMaterialListResponse)
async def get_study_materials(
    page: int = 1,
    per_page: int = 20,
    material_type: Optional[str] = None,
    subject: Optional[str] = None,
    grade: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Get list of study materials with filtering and pagination"""
    
    query = db.query(StudyMaterial).filter(StudyMaterial.is_active == True)
    
    # Apply filters
    if material_type:
        query = query.filter(StudyMaterial.material_type == material_type)
    if subject:
        query = query.filter(StudyMaterial.subject == subject)
    if grade:
        query = query.filter(StudyMaterial.grade == grade)
    if search:
        query = query.filter(
            or_(
                StudyMaterial.title.ilike(f"%{search}%"),
                StudyMaterial.description.ilike(f"%{search}%")
            )
        )
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * per_page
    materials = query.offset(offset).limit(per_page).all()
    
    # Add formatted file sizes
    for material in materials:
        material.file_size_formatted = format_file_size(material.file_size)
    
    return StudyMaterialListResponse(
        materials=materials,
        total=total,
        page=page,
        per_page=per_page
    )

@router.post("/study-materials", response_model=FileUploadResponse)
async def upload_study_material(
    title: str = Form(...),
    description: str = Form(...),
    subject: str = Form(...),
    grade: int = Form(...),
    material_type: str = Form(...),
    tags: str = Form(""),
    adventure_id: Optional[int] = Form(None),
    arena_id: Optional[int] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Upload a new study material"""
    
    # Validate file size
    if file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Validate file extension
    file_extension = os.path.splitext(file.filename)[1].lower()
    if material_type in ALLOWED_EXTENSIONS:
        if file_extension not in ALLOWED_EXTENSIONS[material_type]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {file_extension} not allowed for {material_type} materials"
            )
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    
    # Parse tags
    tags_list = [tag.strip() for tag in tags.split(",") if tag.strip()] if tags else []
    
    # Create study material record
    study_material = StudyMaterial(
        title=title,
        description=description,
        subject=subject,
        grade=grade,
        material_type=material_type,
        tags=tags_list,
        adventure_id=adventure_id,
        arena_id=arena_id,
        file_path=file_path,
        file_name=file.filename,
        file_size=file.size,
        file_type=file.content_type,
        uploaded_by=current_user.id
    )
    
    db.add(study_material)
    db.commit()
    db.refresh(study_material)
    
    return FileUploadResponse(
        message="File uploaded successfully",
        material_id=study_material.id,
        file_path=file_path,
        file_size=file.size
    )

@router.get("/study-materials/{material_id}", response_model=StudyMaterialSchema)
async def get_study_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Get study material by ID"""
    
    material = db.query(StudyMaterial).filter(
        and_(StudyMaterial.id == material_id, StudyMaterial.is_active == True)
    ).first()
    
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study material not found"
        )
    
    material.file_size_formatted = format_file_size(material.file_size)
    return material

@router.get("/study-materials/{material_id}/download")
async def download_study_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Download study material file"""
    
    material = db.query(StudyMaterial).filter(
        and_(StudyMaterial.id == material_id, StudyMaterial.is_active == True)
    ).first()
    
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study material not found"
        )
    
    if not os.path.exists(material.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on server"
        )
    
    # Increment download count
    material.download_count += 1
    db.commit()
    
    return FileResponse(
        path=material.file_path,
        filename=material.file_name,
        media_type=material.file_type
    )

@router.put("/study-materials/{material_id}", response_model=StudyMaterialSchema)
async def update_study_material(
    material_id: int,
    material_data: StudyMaterialUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Update study material metadata"""
    
    material = db.query(StudyMaterial).filter(
        and_(StudyMaterial.id == material_id, StudyMaterial.is_active == True)
    ).first()
    
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study material not found"
        )
    
    # Update fields
    update_data = material_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(material, field, value)
    
    db.commit()
    db.refresh(material)
    
    return material

@router.delete("/study-materials/{material_id}")
async def delete_study_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Delete study material"""
    
    material = db.query(StudyMaterial).filter(
        and_(StudyMaterial.id == material_id, StudyMaterial.is_active == True)
    ).first()
    
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study material not found"
        )
    
    # Soft delete material
    material.is_active = False
    db.commit()
    
    # Optionally delete file from filesystem
    # if os.path.exists(material.file_path):
    #     os.remove(material.file_path)
    
    return {"message": "Study material deleted successfully"}