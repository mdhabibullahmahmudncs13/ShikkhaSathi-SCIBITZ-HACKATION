"""
Code-based Connection API Endpoints
Google Classroom-style connection system using simple codes
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.deps import get_db, get_current_user, get_current_teacher
from app.models.user import User, UserRole
from app.services.code_connection_service import CodeConnectionService

router = APIRouter()


# Request/Response Models
class CreateClassRequest(BaseModel):
    class_name: str
    subject: str
    grade_level: int
    section: str = None
    description: str = None
    academic_year: str = "2024-2025"
    max_students: int = 50


class JoinClassRequest(BaseModel):
    class_code: str


class CreateParentCodeRequest(BaseModel):
    relationship_type: str = "guardian"


class ConnectParentRequest(BaseModel):
    parent_code: str


class ClassCodeRequest(BaseModel):
    class_code: str


class ParentCodeRequest(BaseModel):
    parent_code: str


# Teacher Endpoints

@router.post("/teacher/create-class")
def create_class_with_code(
    request: CreateClassRequest,
    current_teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Teacher creates a new class with auto-generated join code"""
    
    try:
        service = CodeConnectionService(db)
        
        result = service.create_class_with_code(
            teacher_id=str(current_teacher.id),
            class_data=request.dict()
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/teacher/disable-class-code/{class_id}")
def disable_class_code(
    class_id: str,
    current_teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Teacher disables class code to prevent new students from joining"""
    
    try:
        service = CodeConnectionService(db)
        
        result = service.disable_class_code(
            teacher_id=str(current_teacher.id),
            class_id=class_id
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/teacher/regenerate-class-code/{class_id}")
def regenerate_class_code(
    class_id: str,
    current_teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Teacher generates a new class code"""
    
    try:
        service = CodeConnectionService(db)
        
        result = service.regenerate_class_code(
            teacher_id=str(current_teacher.id),
            class_id=class_id
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# Student Endpoints

@router.post("/student/join-class")
def join_class_by_code(
    request: JoinClassRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Student joins a class using the class code"""
    
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can join classes"
        )
    
    try:
        service = CodeConnectionService(db)
        result = service.join_class_by_code(
            student_id=str(current_user.id),
            class_code=request.class_code
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/student/preview-class")
def preview_class_by_code(
    request: ClassCodeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Student previews class information before joining"""
    
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can preview classes"
        )
    
    try:
        service = CodeConnectionService(db)
        result = service.get_class_info_by_code(request.class_code)
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["message"]
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/student/connect-parent")
def connect_to_parent_by_code(
    request: ConnectParentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Student connects to parent using the parent code"""
    
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can connect to parents"
        )
    
    try:
        service = CodeConnectionService(db)
        result = service.connect_to_parent_by_code(
            student_id=str(current_user.id),
            parent_code=request.parent_code
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/student/preview-parent")
def preview_parent_by_code(
    request: ParentCodeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Student previews parent information before connecting"""
    
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can preview parent connections"
        )
    
    try:
        service = CodeConnectionService(db)
        result = service.get_parent_info_by_code(request.parent_code)
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["message"]
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# Parent Endpoints

@router.post("/parent/create-connection-code")
def create_parent_connection_code(
    request: CreateParentCodeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Parent creates a connection code for their child to use"""
    
    if current_user.role != UserRole.PARENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only parents can create connection codes"
        )
    
    try:
        service = CodeConnectionService(db)
        result = service.create_parent_connection_code(
            parent_id=str(current_user.id),
            relationship_type=request.relationship_type
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# General Endpoints (for all users)

@router.get("/my-classes")
def get_my_classes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get user's classes with codes (different view for teachers vs students)"""
    
    try:
        if current_user.role == UserRole.TEACHER:
            # Teacher view: show classes they created with codes
            teacher_profile = getattr(current_user, 'teacher_profile', None)
            if not teacher_profile:
                return {"classes": []}
            
            classes = []
            for teacher_class in teacher_profile.classes:
                classes.append({
                    "id": str(teacher_class.id),
                    "name": teacher_class.class_name,
                    "subject": teacher_class.subject,
                    "grade": teacher_class.grade_level,
                    "section": teacher_class.section,
                    "class_code": teacher_class.class_code,
                    "code_enabled": teacher_class.code_enabled,
                    "students_count": len(teacher_class.students),
                    "max_students": teacher_class.max_students,
                    "created_at": teacher_class.created_at.isoformat()
                })
            
            return {"classes": classes}
            
        elif current_user.role == UserRole.STUDENT:
            # Student view: show classes they joined
            classes = []
            for teacher_class in current_user.enrolled_classes:
                teacher = teacher_class.teacher
                classes.append({
                    "id": str(teacher_class.id),
                    "name": teacher_class.class_name,
                    "subject": teacher_class.subject,
                    "grade": teacher_class.grade_level,
                    "section": teacher_class.section,
                    "teacher_name": teacher.user.full_name if teacher else "Unknown",
                    "students_count": len(teacher_class.students),
                    "joined_at": teacher_class.created_at.isoformat()  # TODO: Get actual join date
                })
            
            return {"classes": classes}
        
        else:
            return {"classes": []}
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/my-connections")
def get_my_connections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get user's parent-child connections"""
    
    try:
        if current_user.role == UserRole.PARENT:
            # Parent view: show connected children
            children = []
            for relationship in current_user.children_relationships:
                if relationship.is_active:
                    child = relationship.child
                    children.append({
                        "id": str(child.id),
                        "name": child.full_name,
                        "email": child.email,
                        "grade": child.grade,
                        "school": child.school,
                        "relationship_type": relationship.relationship_type,
                        "connected_at": relationship.created_at.isoformat()
                    })
            
            return {"children": children}
            
        elif current_user.role == UserRole.STUDENT:
            # Student view: show connected parents
            parents = []
            for relationship in current_user.parent_relationships:
                if relationship.is_active:
                    parent = relationship.parent
                    parents.append({
                        "id": str(parent.id),
                        "name": parent.full_name,
                        "email": parent.email,
                        "relationship_type": relationship.relationship_type,
                        "is_primary": relationship.is_primary,
                        "connected_at": relationship.created_at.isoformat()
                    })
            
            return {"parents": parents}
        
        else:
            return {"connections": []}
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )