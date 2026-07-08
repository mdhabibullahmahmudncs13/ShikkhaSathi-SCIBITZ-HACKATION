"""
Gradebook integration API endpoints for teacher dashboard.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from sqlalchemy.orm import Session

from app.core.deps import get_current_teacher, get_db
from app.models.teacher import Teacher
from app.services.gradebook_service import GradebookService
from app.schemas.gradebook import (
    GradebookEntry,
    GradebookExportRequest,
    GradebookImportResult,
    GradeScaleMapping,
    GradeSyncResult,
    ExternalSystemConfig,
    ClassGradeStatistics,
    StudentGradeSummary,
    GradebookSyncConfig,
    GradeMappingSuggestion,
    ExternalGradebookFormat,
    GradeScale
)

router = APIRouter()


@router.post("/classes/{class_id}/gradebook/export")
async def export_gradebook(
    class_id: str,
    export_request: GradebookExportRequest,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """Export gradebook data to CSV format."""
    gradebook_service = GradebookService(db)
    
    try:
        csv_content = await gradebook_service.export_gradebook(
            class_id=class_id,
            teacher_id=str(current_teacher.id),
            export_request=export_request
        )
        
        # Generate filename
        format_suffix = export_request.format.value
        filename = f"gradebook_{class_id}_{format_suffix}_{current_teacher.id}.csv"
        
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/classes/{class_id}/gradebook/import", response_model=GradebookImportResult)
async def import_gradebook(
    class_id: str,
    file: UploadFile = File(...),
    grade_scale: GradeScale = GradeScale.percentage,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """Import gradebook data from CSV file."""
    gradebook_service = GradebookService(db)
    
    try:
        result = await gradebook_service.import_gradebook(
            class_id=class_id,
            teacher_id=str(current_teacher.id),
            file=file,
            grade_scale=grade_scale.value
        )
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/classes/{class_id}/gradebook/statistics", response_model=ClassGradeStatistics)
async def get_class_grade_statistics(
    class_id: str,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """Get grade statistics for a class."""
    gradebook_service = GradebookService(db)
    
    try:
        # Get grade mapping suggestions which includes statistics
        suggestions = await gradebook_service.get_grade_mapping_suggestions(
            class_id=class_id,
            teacher_id=str(current_teacher.id)
        )
        
        stats = suggestions["class_statistics"]
        
        return ClassGradeStatistics(
            class_id=class_id,
            total_students=stats.get("total_students", 0),
            total_assignments=stats.get("total_grades", 0),
            average_score=stats.get("average_score", 0),
            median_score=stats.get("median_score", 0),
            min_score=stats.get("min_score", 0),
            max_score=stats.get("max_score", 0),
            grade_distribution=stats.get("grade_distribution", {})
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/classes/{class_id}/gradebook/mapping-suggestions")
async def get_grade_mapping_suggestions(
    class_id: str,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """Get suggested grade mappings based on class performance."""
    gradebook_service = GradebookService(db)
    
    try:
        suggestions = await gradebook_service.get_grade_mapping_suggestions(
            class_id=class_id,
            teacher_id=str(current_teacher.id)
        )
        return suggestions
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/classes/{class_id}/gradebook/sync", response_model=GradeSyncResult)
async def sync_with_external_system(
    class_id: str,
    external_system: str,
    mapping_config: Dict[str, Any],
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """Sync grades with external gradebook system."""
    gradebook_service = GradebookService(db)
    
    try:
        result = await gradebook_service.sync_grades_with_external(
            class_id=class_id,
            teacher_id=str(current_teacher.id),
            external_system=external_system,
            mapping_config=mapping_config
        )
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/gradebook/formats")
async def get_supported_formats():
    """Get list of supported gradebook formats."""
    return {
        "export_formats": [
            {
                "id": "standard",
                "name": "Standard CSV",
                "description": "Basic student information with overall grades"
            },
            {
                "id": "detailed",
                "name": "Detailed CSV",
                "description": "Individual assignment grades with student information"
            },
            {
                "id": "google_classroom",
                "name": "Google Classroom",
                "description": "Format compatible with Google Classroom import"
            },
            {
                "id": "canvas",
                "name": "Canvas LMS",
                "description": "Format compatible with Canvas gradebook"
            },
            {
                "id": "blackboard",
                "name": "Blackboard",
                "description": "Format compatible with Blackboard gradebook"
            },
            {
                "id": "moodle",
                "name": "Moodle",
                "description": "Format compatible with Moodle gradebook"
            }
        ],
        "grade_scales": [
            {
                "id": "percentage",
                "name": "Percentage (0-100%)",
                "description": "Standard percentage-based grading"
            },
            {
                "id": "4_point",
                "name": "4.0 GPA Scale",
                "description": "Traditional 4.0 grade point average scale"
            },
            {
                "id": "bangladesh",
                "name": "Bangladesh Grading",
                "description": "Standard Bangladesh educational grading system"
            }
        ]
    }


@router.get("/gradebook/templates/{format}")
async def get_gradebook_template(
    format: ExternalGradebookFormat,
    include_sample: bool = False
):
    """Get CSV template for specific gradebook format."""
    templates = {
        "standard": {
            "name": "Standard Gradebook Template",
            "description": "Basic template with student info and overall grades",
            "required_columns": ["student_id", "student_name", "email"],
            "optional_columns": ["overall_grade", "letter_grade", "notes"],
            "sample_data": {
                "student_id": "12345",
                "student_name": "John Doe",
                "email": "john.doe@example.com",
                "overall_grade": "85.5",
                "letter_grade": "B",
                "notes": "Good progress"
            } if include_sample else None
        },
        "detailed": {
            "name": "Detailed Gradebook Template",
            "description": "Detailed template with individual assignment grades",
            "required_columns": ["student_id", "student_name", "email"],
            "optional_columns": ["quiz_1", "quiz_2", "assignment_1", "midterm", "final", "overall_grade"],
            "sample_data": {
                "student_id": "12345",
                "student_name": "John Doe",
                "email": "john.doe@example.com",
                "quiz_1": "90",
                "quiz_2": "85",
                "assignment_1": "88",
                "midterm": "82",
                "final": "87",
                "overall_grade": "86.4"
            } if include_sample else None
        }
    }
    
    if format.value not in templates:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return templates[format.value]


@router.post("/classes/{class_id}/gradebook/validate-csv")
async def validate_gradebook_csv(
    class_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """Validate gradebook CSV before import."""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    try:
        import pandas as pd
        import io
        
        # Read CSV content
        content = await file.read()
        csv_content = content.decode('utf-8')
        df = pd.read_csv(io.StringIO(csv_content))
        
        # Basic validation
        required_columns = ["student_id", "student_name"]
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        validation_result = {
            "valid": len(missing_columns) == 0,
            "total_rows": len(df),
            "columns": list(df.columns),
            "missing_required_columns": missing_columns,
            "warnings": [],
            "errors": []
        }
        
        if not validation_result["valid"]:
            validation_result["errors"].append(f"Missing required columns: {', '.join(missing_columns)}")
        
        # Check for duplicates
        if df["student_id"].duplicated().any():
            validation_result["warnings"].append("Duplicate student IDs found")
        
        # Check for empty values in required columns
        for col in required_columns:
            if col in df.columns and df[col].isnull().any():
                validation_result["warnings"].append(f"Empty values found in {col}")
        
        return validation_result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error validating CSV: {str(e)}")


@router.get("/classes/{class_id}/gradebook/students/{student_id}/summary", response_model=StudentGradeSummary)
async def get_student_grade_summary(
    class_id: str,
    student_id: str,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """Get grade summary for individual student."""
    gradebook_service = GradebookService(db)
    
    try:
        # Get student grades
        grades = await gradebook_service._get_student_grades(student_id, class_id)
        
        if not grades:
            return StudentGradeSummary(
                student_id=student_id,
                student_name="Unknown Student",
                overall_average=0,
                letter_grade="N/A",
                total_assignments=0,
                assignments_completed=0,
                completion_rate=0,
                recent_performance=[],
                subject_averages={}
            )
        
        # Calculate statistics
        overall_average = sum(g["percentage"] for g in grades) / len(grades)
        letter_grade = gradebook_service._percentage_to_letter(
            overall_average, 
            gradebook_service.GRADE_SCALES["percentage"]
        )
        
        # Group by subject
        subject_averages = {}
        for grade in grades:
            subject = grade.get("subject", "General")
            if subject not in subject_averages:
                subject_averages[subject] = []
            subject_averages[subject].append(grade["percentage"])
        
        # Calculate subject averages
        for subject in subject_averages:
            subject_averages[subject] = sum(subject_averages[subject]) / len(subject_averages[subject])
        
        # Get recent performance (last 5 grades)
        recent_performance = sorted(grades, key=lambda x: x["date"], reverse=True)[:5]
        
        return StudentGradeSummary(
            student_id=student_id,
            student_name=grades[0].get("student_name", "Unknown Student"),
            overall_average=overall_average,
            letter_grade=letter_grade,
            total_assignments=len(grades),
            assignments_completed=len(grades),
            completion_rate=100.0,  # All grades are completed by definition
            recent_performance=[
                {
                    "name": g["name"],
                    "score": g["percentage"],
                    "date": g["date"].isoformat(),
                    "subject": g.get("subject", "General")
                } for g in recent_performance
            ],
            subject_averages=subject_averages
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))