"""
Classroom management API endpoints for teacher dashboard.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from sqlalchemy.orm import Session

from app.core.deps import get_current_teacher, get_db
from app.models.teacher import Teacher
from app.services.classroom_service import ClassroomService
from app.schemas.classroom import (
    ClassroomStudent,
    ClassroomStudentCreate,
    ClassroomStudentUpdate,
    ClassroomSettings,
    ClassroomSettingsUpdate,
    StudentPermissions,
    BulkOperationRequest,
    BulkOperationResult,
    StudentImportResult,
    StudentRosterFilter,
    StudentRosterResponse
)

router = APIRouter()


@router.get("/classes/{class_id}/students", response_model=List[ClassroomStudent])
async def get_class_students(
    class_id: str,
    search_query: Optional[str] = None,
    status_filter: Optional[str] = None,
    grade_filter: Optional[int] = None,
    show_inactive: bool = False,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """Get all students in a teacher's class with optional filtering."""
    classroom_service = ClassroomService(db)
    
    try:
        students = await classroom_service.get_class_students(
            class_id=class_id,
            teacher_id=str(current_teacher.id)
        )
        
        # Apply filters if provided
        if search_query:
            search_lower = search_query.lower()
            students = [
                s for s in students 
                if search_lower in s['name'].lower() 
                or search_lower in s['email'].lower()
                or (s.get('studentId') and search_lower in s['studentId'].lower())
            ]
        
        if status_filter and status_filter != 'all':
            if status_filter == 'active':
                students = [s for s in students if s['isActive']]
            elif status_filter == 'inactive':
                students = [s for s in students if not s['isActive']]
            elif status_filter == 'at_risk':
                students = [s for s in students if s['isAtRisk']]
            elif status_filter == 'high_performer':
                students = [s for s in students if s['isHighPerformer']]
        
        if grade_filter:
            students = [s for s in students if s.get('grade') == grade_filter]
        
        if not show_inactive:
            students = [s for s in students if s['isActive']]
        
        return students
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/classes/{class_id}/students", response_model=ClassroomStudent)
async def add_student_to_class(
    class_id: str,
    student_data: ClassroomStudentCreate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """Add a new student to the class."""
    classroom_service = ClassroomService(db)
    
    try:
        student = await classroom_service.add_student_to_class(
            class_id=class_id,
            teacher_id=str(current_teacher.id),
            student_data=student_data
        )
        return student
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/classes/{class_id}/students/{student_id}", response_model=ClassroomStudent)
async def update_student_in_class(
    class_id: str,
    student_id: str,
    student_data: ClassroomStudentUpdate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """Update student information in the class."""
    classroom_service = ClassroomService(db)
    
    try:
        student = await classroom_service.update_student_in_class(
            class_id=class_id,
            student_id=student_id,
            teacher_id=str(current_teacher.id),
            student_data=student_data
        )
        return student
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/classes/{class_id}/students/{student_id}")
async def remove_student_from_class(
    class_id: str,
    student_id: str,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """Remove student from the class."""
    classroom_service = ClassroomService(db)
    
    try:
        await classroom_service.remove_student_from_class(
            class_id=class_id,
            student_id=student_id,
            teacher_id=str(current_teacher.id)
        )
        return {"message": "Student removed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/classes/{class_id}/students/bulk", response_model=BulkOperationResult)
async def bulk_update_students(
    class_id: str,
    bulk_request: BulkOperationRequest,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """Perform bulk operations on students."""
    classroom_service = ClassroomService(db)
    
    try:
        result = await classroom_service.bulk_update_students(
            class_id=class_id,
            teacher_id=str(current_teacher.id),
            bulk_request=bulk_request
        )
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/classes/{class_id}/students/import", response_model=StudentImportResult)
async def import_students_from_csv(
    class_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """Import students from CSV file."""
    classroom_service = ClassroomService(db)
    
    try:
        result = await classroom_service.import_students_from_csv(
            class_id=class_id,
            teacher_id=str(current_teacher.id),
            file=file
        )
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/classes/{class_id}/students/export")
async def export_students_to_csv(
    class_id: str,
    student_ids: Optional[str] = None,  # Comma-separated list
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """Export students to CSV file."""
    classroom_service = ClassroomService(db)
    
    try:
        # Parse student IDs if provided
        student_id_list = None
        if student_ids:
            student_id_list = [id.strip() for id in student_ids.split(',') if id.strip()]
        
        csv_content = await classroom_service.export_students_to_csv(
            class_id=class_id,
            teacher_id=str(current_teacher.id),
            student_ids=student_id_list
        )
        
        # Return CSV as downloadable file
        filename = f"students_{class_id}_{current_teacher.id}.csv"
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/classes/{class_id}/settings", response_model=ClassroomSettings)
async def get_classroom_settings(
    class_id: str,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """Get classroom settings."""
    classroom_service = ClassroomService(db)
    
    try:
        settings = await classroom_service.get_classroom_settings(
            class_id=class_id,
            teacher_id=str(current_teacher.id)
        )
        return settings
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/classes/{class_id}/settings", response_model=ClassroomSettings)
async def update_classroom_settings(
    class_id: str,
    settings_update: ClassroomSettingsUpdate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """Update classroom settings."""
    classroom_service = ClassroomService(db)
    
    try:
        settings = await classroom_service.update_classroom_settings(
            class_id=class_id,
            teacher_id=str(current_teacher.id),
            settings_update=settings_update
        )
        return settings
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/classes/{class_id}/students/{student_id}/permissions")
async def get_student_permissions(
    class_id: str,
    student_id: str,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """Get permissions for a specific student."""
    classroom_service = ClassroomService(db)
    
    try:
        permissions = await classroom_service.get_student_permissions(
            class_id=class_id,
            student_id=student_id,
            teacher_id=str(current_teacher.id)
        )
        return permissions
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/classes/{class_id}/students/{student_id}/permissions")
async def update_student_permissions(
    class_id: str,
    student_id: str,
    permissions: StudentPermissions,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """Update permissions for a specific student."""
    classroom_service = ClassroomService(db)
    
    try:
        student = await classroom_service.update_student_permissions(
            class_id=class_id,
            student_id=student_id,
            teacher_id=str(current_teacher.id),
            permissions=permissions
        )
        return student
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/classes/{class_id}/content-restrictions")
async def apply_content_restrictions(
    class_id: str,
    restrictions: List[str],
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """Apply content restrictions to all students in the class."""
    classroom_service = ClassroomService(db)
    
    try:
        result = await classroom_service.apply_content_restrictions(
            class_id=class_id,
            teacher_id=str(current_teacher.id),
            restrictions=restrictions
        )
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/classes/{class_id}/time-restrictions")
async def apply_time_restrictions(
    class_id: str,
    time_restrictions: Dict[str, Any],
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """Apply time restrictions to all students in the class."""
    classroom_service = ClassroomService(db)
    
    try:
        result = await classroom_service.apply_time_restrictions(
            class_id=class_id,
            teacher_id=str(current_teacher.id),
            time_restrictions=time_restrictions
        )
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/classes/{class_id}/overview")
async def get_classroom_overview(
    class_id: str,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """Get classroom overview with basic metrics."""
    classroom_service = ClassroomService(db)
    
    try:
        students = await classroom_service.get_class_students(
            class_id=class_id,
            teacher_id=str(current_teacher.id)
        )
        
        # Calculate metrics
        total_students = len(students)
        active_students = len([s for s in students if s['isActive']])
        at_risk_students = len([s for s in students if s['isAtRisk']])
        high_performers = len([s for s in students if s['isHighPerformer']])
        
        # Get last activity
        last_activities = [s['lastActive'] for s in students if s['lastActive']]
        last_activity = max(last_activities) if last_activities else None
        
        return {
            "id": class_id,
            "name": f"Class {class_id}",  # TODO: Get actual class name
            "grade": 10,  # TODO: Get actual grade
            "subject": "General",  # TODO: Get actual subject
            "total_students": total_students,
            "active_students": active_students,
            "at_risk_students": at_risk_students,
            "high_performers": high_performers,
            "last_activity": last_activity
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))