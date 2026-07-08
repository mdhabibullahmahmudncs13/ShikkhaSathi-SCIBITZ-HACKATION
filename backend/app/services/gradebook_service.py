"""
Gradebook integration service for teacher dashboard.
Handles CSV import/export, grade mapping, and external system synchronization.
"""

import csv
import io
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from fastapi import HTTPException, UploadFile
import pandas as pd
import json

from app.models.teacher import TeacherClass, StudentClass
from app.models.user import User
from app.models.quiz_attempt import QuizAttempt
from app.models.assessment import Assessment
from app.schemas.gradebook import (
    GradebookEntry,
    GradebookImportResult,
    GradebookExportRequest,
    GradeScaleMapping,
    GradeSyncResult,
    ExternalGradebookFormat
)


class GradebookService:
    """Service for gradebook integration and grade management."""

    def __init__(self, db: Session):
        self.db = db

    # Standard grade scale mappings
    GRADE_SCALES = {
        "percentage": {
            "A+": (97, 100),
            "A": (93, 96),
            "A-": (90, 92),
            "B+": (87, 89),
            "B": (83, 86),
            "B-": (80, 82),
            "C+": (77, 79),
            "C": (73, 76),
            "C-": (70, 72),
            "D+": (67, 69),
            "D": (63, 66),
            "D-": (60, 62),
            "F": (0, 59)
        },
        "4_point": {
            "A": (3.7, 4.0),
            "A-": (3.3, 3.6),
            "B+": (3.0, 3.2),
            "B": (2.7, 2.9),
            "B-": (2.3, 2.6),
            "C+": (2.0, 2.2),
            "C": (1.7, 1.9),
            "C-": (1.3, 1.6),
            "D+": (1.0, 1.2),
            "D": (0.7, 0.9),
            "D-": (0.0, 0.6),
            "F": (0.0, 0.0)
        },
        "bangladesh": {
            "A+": (80, 100),
            "A": (70, 79),
            "A-": (60, 69),
            "B": (50, 59),
            "C": (40, 49),
            "D": (33, 39),
            "F": (0, 32)
        }
    }

    async def export_gradebook(
        self, 
        class_id: str, 
        teacher_id: str, 
        export_request: GradebookExportRequest
    ) -> str:
        """Export gradebook data to CSV format."""
        # Verify teacher owns this class
        teacher_class = self.db.query(TeacherClass).filter(
            and_(
                TeacherClass.id == class_id,
                TeacherClass.teacher_id == teacher_id
            )
        ).first()
        
        if not teacher_class:
            raise HTTPException(status_code=404, detail="Class not found")

        # Get students in the class
        students_query = self.db.query(
            StudentClass,
            User
        ).join(
            User, StudentClass.student_id == User.id
        ).filter(
            StudentClass.teacher_class_id == class_id
        )

        if export_request.student_ids:
            students_query = students_query.filter(
                StudentClass.student_id.in_(export_request.student_ids)
            )

        students = students_query.all()

        # Get grade data based on date range
        grade_data = []
        for student_class, user in students:
            student_grades = await self._get_student_grades(
                user.id, 
                class_id, 
                export_request.date_from, 
                export_request.date_to
            )
            
            # Apply grade scale mapping
            mapped_grades = self._map_grades(
                student_grades, 
                export_request.grade_scale or "percentage"
            )
            
            grade_data.append({
                "student_id": user.id,
                "student_name": user.full_name or f"{user.first_name} {user.last_name}",
                "email": user.email,
                "grades": mapped_grades
            })

        # Generate CSV based on format
        return self._generate_gradebook_csv(grade_data, export_request.format)

    async def import_gradebook(
        self, 
        class_id: str, 
        teacher_id: str, 
        file: UploadFile,
        grade_scale: str = "percentage"
    ) -> GradebookImportResult:
        """Import gradebook data from CSV file."""
        # Verify teacher owns this class
        teacher_class = self.db.query(TeacherClass).filter(
            and_(
                TeacherClass.id == class_id,
                TeacherClass.teacher_id == teacher_id
            )
        ).first()
        
        if not teacher_class:
            raise HTTPException(status_code=404, detail="Class not found")

        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="File must be a CSV")

        successful = 0
        failed = 0
        warnings = []
        errors = []

        try:
            # Read CSV content
            content = await file.read()
            csv_content = content.decode('utf-8')
            
            # Parse CSV using pandas for better handling
            df = pd.read_csv(io.StringIO(csv_content))
            
            # Validate CSV structure
            validation_result = self._validate_gradebook_csv(df)
            if not validation_result["valid"]:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid CSV format: {validation_result['error']}"
                )

            # Process each row
            for index, row in df.iterrows():
                try:
                    result = await self._process_gradebook_row(
                        row, class_id, grade_scale, index + 2
                    )
                    
                    if result["success"]:
                        successful += 1
                    else:
                        failed += 1
                        errors.append({
                            "row": index + 2,
                            "error": result["error"],
                            "data": row.to_dict()
                        })
                        
                    if result.get("warnings"):
                        warnings.extend(result["warnings"])

                except Exception as e:
                    failed += 1
                    errors.append({
                        "row": index + 2,
                        "error": str(e),
                        "data": row.to_dict()
                    })

        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error processing CSV: {str(e)}")

        return GradebookImportResult(
            successful=successful,
            failed=failed,
            warnings=warnings,
            errors=errors if errors else None
        )

    async def sync_grades_with_external(
        self, 
        class_id: str, 
        teacher_id: str, 
        external_system: str,
        mapping_config: Dict[str, Any]
    ) -> GradeSyncResult:
        """Sync grades with external gradebook system."""
        # Verify teacher owns this class
        teacher_class = self.db.query(TeacherClass).filter(
            and_(
                TeacherClass.id == class_id,
                TeacherClass.teacher_id == teacher_id
            )
        ).first()
        
        if not teacher_class:
            raise HTTPException(status_code=404, detail="Class not found")

        # This would integrate with external systems like Google Classroom, Canvas, etc.
        # For now, return a mock result
        return GradeSyncResult(
            synced_students=0,
            failed_syncs=0,
            last_sync=datetime.utcnow(),
            external_system=external_system,
            sync_status="not_implemented",
            errors=["External system integration not yet implemented"]
        )

    async def get_grade_mapping_suggestions(
        self, 
        class_id: str, 
        teacher_id: str
    ) -> Dict[str, Any]:
        """Get suggested grade mappings based on class performance."""
        # Verify teacher owns this class
        teacher_class = self.db.query(TeacherClass).filter(
            and_(
                TeacherClass.id == class_id,
                TeacherClass.teacher_id == teacher_id
            )
        ).first()
        
        if not teacher_class:
            raise HTTPException(status_code=404, detail="Class not found")

        # Get class performance statistics
        stats = await self._get_class_grade_statistics(class_id)
        
        # Generate mapping suggestions based on performance distribution
        suggestions = {
            "recommended_scale": "percentage",
            "class_statistics": stats,
            "mapping_suggestions": {
                "high_performing_class": stats["average_score"] > 85,
                "suggested_adjustments": self._generate_mapping_suggestions(stats),
                "grade_distribution": stats["grade_distribution"]
            },
            "available_scales": list(self.GRADE_SCALES.keys())
        }
        
        return suggestions

    async def _get_student_grades(
        self, 
        student_id: str, 
        class_id: str, 
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """Get all grades for a student in a class."""
        # Get quiz attempts
        quiz_query = self.db.query(QuizAttempt).filter(
            QuizAttempt.user_id == student_id
        )
        
        if date_from:
            quiz_query = quiz_query.filter(QuizAttempt.created_at >= date_from)
        if date_to:
            quiz_query = quiz_query.filter(QuizAttempt.created_at <= date_to)
            
        quiz_attempts = quiz_query.all()
        
        grades = []
        for attempt in quiz_attempts:
            grades.append({
                "type": "quiz",
                "id": str(attempt.id),
                "name": f"Quiz {attempt.quiz_id}",
                "score": attempt.score,
                "max_score": attempt.max_score,
                "percentage": (attempt.score / attempt.max_score * 100) if attempt.max_score > 0 else 0,
                "date": attempt.created_at,
                "subject": attempt.subject or "General"
            })
        
        # TODO: Add assessment grades when assessment system is integrated
        
        return grades

    def _map_grades(self, grades: List[Dict[str, Any]], scale: str) -> List[Dict[str, Any]]:
        """Map numerical grades to specified scale."""
        if scale not in self.GRADE_SCALES:
            scale = "percentage"
            
        scale_mapping = self.GRADE_SCALES[scale]
        mapped_grades = []
        
        for grade in grades:
            percentage = grade["percentage"]
            letter_grade = self._percentage_to_letter(percentage, scale_mapping)
            
            mapped_grade = grade.copy()
            mapped_grade["letter_grade"] = letter_grade
            mapped_grade["scale"] = scale
            mapped_grades.append(mapped_grade)
            
        return mapped_grades

    def _percentage_to_letter(self, percentage: float, scale_mapping: Dict[str, Tuple[float, float]]) -> str:
        """Convert percentage to letter grade based on scale."""
        for letter, (min_score, max_score) in scale_mapping.items():
            if min_score <= percentage <= max_score:
                return letter
        return "F"  # Default to F if no match

    def _validate_gradebook_csv(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Validate the structure of a gradebook CSV."""
        required_columns = ["student_id", "student_name"]
        
        # Check for required columns
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            return {
                "valid": False,
                "error": f"Missing required columns: {', '.join(missing_columns)}"
            }
        
        # Check for empty dataframe
        if df.empty:
            return {
                "valid": False,
                "error": "CSV file is empty"
            }
        
        # Check for duplicate student IDs
        if df["student_id"].duplicated().any():
            return {
                "valid": False,
                "error": "Duplicate student IDs found in CSV"
            }
        
        return {"valid": True}

    async def _process_gradebook_row(
        self, 
        row: pd.Series, 
        class_id: str, 
        grade_scale: str, 
        row_number: int
    ) -> Dict[str, Any]:
        """Process a single row from gradebook CSV."""
        try:
            student_id = str(row["student_id"])
            student_name = str(row["student_name"])
            
            # Verify student exists in class
            student_class = self.db.query(StudentClass).filter(
                and_(
                    StudentClass.student_id == student_id,
                    StudentClass.teacher_class_id == class_id
                )
            ).first()
            
            if not student_class:
                return {
                    "success": False,
                    "error": f"Student {student_name} not found in class"
                }
            
            # Process grade columns (any column that's not student_id or student_name)
            grade_columns = [col for col in row.index if col not in ["student_id", "student_name"]]
            processed_grades = 0
            warnings = []
            
            for col in grade_columns:
                grade_value = row[col]
                if pd.notna(grade_value):
                    # TODO: Store grade in database
                    # For now, just count as processed
                    processed_grades += 1
                else:
                    warnings.append(f"Empty grade for {col} in row {row_number}")
            
            return {
                "success": True,
                "processed_grades": processed_grades,
                "warnings": warnings
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def _generate_gradebook_csv(
        self, 
        grade_data: List[Dict[str, Any]], 
        format_type: ExternalGradebookFormat
    ) -> str:
        """Generate CSV content based on format type."""
        output = io.StringIO()
        
        if format_type == "standard":
            # Standard format with basic columns
            fieldnames = ["student_id", "student_name", "email", "overall_grade", "letter_grade"]
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            
            for student in grade_data:
                # Calculate overall grade
                grades = student["grades"]
                if grades:
                    overall_percentage = sum(g["percentage"] for g in grades) / len(grades)
                    letter_grade = self._percentage_to_letter(overall_percentage, self.GRADE_SCALES["percentage"])
                else:
                    overall_percentage = 0
                    letter_grade = "N/A"
                
                writer.writerow({
                    "student_id": student["student_id"],
                    "student_name": student["student_name"],
                    "email": student["email"],
                    "overall_grade": f"{overall_percentage:.1f}%",
                    "letter_grade": letter_grade
                })
                
        elif format_type == "detailed":
            # Detailed format with individual assignments
            # This would include columns for each assignment/quiz
            all_assignments = set()
            for student in grade_data:
                for grade in student["grades"]:
                    all_assignments.add(grade["name"])
            
            fieldnames = ["student_id", "student_name", "email"] + sorted(all_assignments) + ["overall_grade"]
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            
            for student in grade_data:
                row_data = {
                    "student_id": student["student_id"],
                    "student_name": student["student_name"],
                    "email": student["email"]
                }
                
                # Add individual assignment grades
                grade_dict = {g["name"]: f"{g['percentage']:.1f}%" for g in student["grades"]}
                row_data.update(grade_dict)
                
                # Calculate overall grade
                if student["grades"]:
                    overall_percentage = sum(g["percentage"] for g in student["grades"]) / len(student["grades"])
                    row_data["overall_grade"] = f"{overall_percentage:.1f}%"
                else:
                    row_data["overall_grade"] = "N/A"
                
                writer.writerow(row_data)
        
        return output.getvalue()

    async def _get_class_grade_statistics(self, class_id: str) -> Dict[str, Any]:
        """Get grade statistics for a class."""
        # Get all students in class
        students = self.db.query(StudentClass).filter(
            StudentClass.teacher_class_id == class_id
        ).all()
        
        all_grades = []
        for student in students:
            student_grades = await self._get_student_grades(student.student_id, class_id)
            all_grades.extend([g["percentage"] for g in student_grades])
        
        if not all_grades:
            return {
                "average_score": 0,
                "median_score": 0,
                "min_score": 0,
                "max_score": 0,
                "grade_distribution": {},
                "total_grades": 0
            }
        
        # Calculate statistics
        average_score = sum(all_grades) / len(all_grades)
        sorted_grades = sorted(all_grades)
        median_score = sorted_grades[len(sorted_grades) // 2]
        
        # Grade distribution
        grade_distribution = {}
        for grade in all_grades:
            letter = self._percentage_to_letter(grade, self.GRADE_SCALES["percentage"])
            grade_distribution[letter] = grade_distribution.get(letter, 0) + 1
        
        return {
            "average_score": average_score,
            "median_score": median_score,
            "min_score": min(all_grades),
            "max_score": max(all_grades),
            "grade_distribution": grade_distribution,
            "total_grades": len(all_grades)
        }

    def _generate_mapping_suggestions(self, stats: Dict[str, Any]) -> List[str]:
        """Generate grade mapping suggestions based on class statistics."""
        suggestions = []
        
        if stats["average_score"] > 90:
            suggestions.append("Consider using a more challenging grade scale")
        elif stats["average_score"] < 60:
            suggestions.append("Consider adjusting grade scale to be more lenient")
        
        if stats["min_score"] < 30:
            suggestions.append("Some students may need additional support")
        
        if stats["max_score"] - stats["min_score"] > 50:
            suggestions.append("Large grade spread - consider differentiated instruction")
        
        return suggestions