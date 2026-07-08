"""
Classroom management service for teacher dashboard.
Handles student roster management, bulk operations, classroom settings, and permissions.
"""

import csv
import io
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from fastapi import HTTPException, UploadFile

from app.models.teacher import TeacherClass, StudentClass
from app.models.user import User
from app.models.student_progress import StudentProgress
from app.models.gamification import Gamification
from app.schemas.classroom import (
    ClassroomStudentCreate,
    ClassroomStudentUpdate,
    ClassroomSettingsUpdate,
    BulkOperationRequest,
    StudentImportResult,
    BulkOperationResult,
    ClassroomSettings,
    StudentPermissions
)


class ClassroomService:
    """Service for managing classroom operations."""

    def __init__(self, db: Session):
        self.db = db

    async def get_class_students(self, class_id: str, teacher_id: str) -> List[Dict[str, Any]]:
        """Get all students in a teacher's class with progress data."""
        # Verify teacher owns this class
        teacher_class = self.db.query(TeacherClass).filter(
            and_(
                TeacherClass.id == class_id,
                TeacherClass.teacher_id == teacher_id
            )
        ).first()
        
        if not teacher_class:
            raise HTTPException(status_code=404, detail="Class not found")

        # Get students with their progress data
        students_query = self.db.query(
            StudentClass,
            User,
            StudentProgress,
            Gamification
        ).join(
            User, StudentClass.student_id == User.id
        ).outerjoin(
            StudentProgress, StudentProgress.user_id == User.id
        ).outerjoin(
            Gamification, Gamification.user_id == User.id
        ).filter(
            StudentClass.teacher_class_id == class_id
        )

        students_data = []
        for student_class, user, progress, xp in students_query.all():
            # Calculate risk status based on recent activity and performance
            is_at_risk = self._calculate_risk_status(progress, xp)
            is_high_performer = self._calculate_high_performer_status(progress, xp)

            student_data = {
                "id": str(user.id),
                "name": user.full_name or f"{user.first_name} {user.last_name}",
                "email": user.email,
                "studentId": getattr(user, 'student_id', None),
                "grade": getattr(student_class, 'grade', None),
                "totalXP": xp.total_xp if xp else 0,
                "level": xp.level if xp else 1,
                "currentStreak": xp.current_streak if xp else 0,
                "lastActive": progress.last_activity_date if progress else user.last_login,
                "isActive": student_class.is_active,
                "isAtRisk": is_at_risk,
                "isHighPerformer": is_high_performer,
                "enrolledAt": student_class.enrolled_at,
                "parentEmail": getattr(user, 'parent_email', None),
                "parentPhone": getattr(user, 'parent_phone', None),
                "notes": student_class.notes,
                "permissions": student_class.permissions or {}
            }
            students_data.append(student_data)

        return students_data

    async def add_student_to_class(
        self, 
        class_id: str, 
        teacher_id: str, 
        student_data: ClassroomStudentCreate
    ) -> Dict[str, Any]:
        """Add a new student to the class."""
        # Verify teacher owns this class
        teacher_class = self.db.query(TeacherClass).filter(
            and_(
                TeacherClass.id == class_id,
                TeacherClass.teacher_id == teacher_id
            )
        ).first()
        
        if not teacher_class:
            raise HTTPException(status_code=404, detail="Class not found")

        # Check if user exists or create new one
        user = self.db.query(User).filter(User.email == student_data.email).first()
        
        if not user:
            # Create new user
            user = User(
                email=student_data.email,
                first_name=student_data.name.split()[0] if student_data.name else "",
                last_name=" ".join(student_data.name.split()[1:]) if len(student_data.name.split()) > 1 else "",
                full_name=student_data.name,
                role="student",
                is_active=True,
                created_at=datetime.utcnow()
            )
            self.db.add(user)
            self.db.flush()

        # Check if student is already in class
        existing_enrollment = self.db.query(StudentClass).filter(
            and_(
                StudentClass.student_id == user.id,
                StudentClass.teacher_class_id == class_id
            )
        ).first()

        if existing_enrollment:
            raise HTTPException(status_code=400, detail="Student already enrolled in class")

        # Create student class enrollment
        student_class = StudentClass(
            student_id=user.id,
            teacher_class_id=class_id,
            grade=student_data.grade,
            is_active=True,
            enrolled_at=datetime.utcnow(),
            notes=student_data.notes,
            permissions=student_data.permissions or {}
        )
        
        self.db.add(student_class)
        self.db.commit()

        # Return student data
        return {
            "id": str(user.id),
            "name": user.full_name or f"{user.first_name} {user.last_name}",
            "email": user.email,
            "studentId": getattr(user, 'student_id', None),
            "grade": student_class.grade,
            "totalXP": 0,
            "level": 1,
            "currentStreak": 0,
            "lastActive": None,
            "isActive": True,
            "isAtRisk": False,
            "isHighPerformer": False,
            "enrolledAt": student_class.enrolled_at,
            "parentEmail": student_data.parent_email,
            "parentPhone": student_data.parent_phone,
            "notes": student_class.notes,
            "permissions": student_class.permissions
        }

    async def update_student_in_class(
        self, 
        class_id: str, 
        student_id: str, 
        teacher_id: str, 
        student_data: ClassroomStudentUpdate
    ) -> Dict[str, Any]:
        """Update student information in the class."""
        # Verify teacher owns this class and student is in class
        student_class = self.db.query(StudentClass).join(
            TeacherClass, StudentClass.teacher_class_id == TeacherClass.id
        ).filter(
            and_(
                TeacherClass.id == class_id,
                TeacherClass.teacher_id == teacher_id,
                StudentClass.student_id == student_id
            )
        ).first()

        if not student_class:
            raise HTTPException(status_code=404, detail="Student not found in class")

        # Update student class data
        if student_data.grade is not None:
            student_class.grade = student_data.grade
        if student_data.is_active is not None:
            student_class.is_active = student_data.is_active
        if student_data.notes is not None:
            student_class.notes = student_data.notes
        if student_data.permissions is not None:
            student_class.permissions = student_data.permissions

        # Update user data if provided
        if student_data.name or student_data.email:
            user = self.db.query(User).filter(User.id == student_id).first()
            if user:
                if student_data.name:
                    user.full_name = student_data.name
                    name_parts = student_data.name.split()
                    user.first_name = name_parts[0] if name_parts else ""
                    user.last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
                if student_data.email:
                    user.email = student_data.email

        self.db.commit()

        # Return updated student data
        return await self._get_student_data(student_id, class_id)

    async def remove_student_from_class(
        self, 
        class_id: str, 
        student_id: str, 
        teacher_id: str
    ) -> None:
        """Remove student from the class."""
        # Verify teacher owns this class and student is in class
        student_class = self.db.query(StudentClass).join(
            TeacherClass, StudentClass.teacher_class_id == TeacherClass.id
        ).filter(
            and_(
                TeacherClass.id == class_id,
                TeacherClass.teacher_id == teacher_id,
                StudentClass.student_id == student_id
            )
        ).first()

        if not student_class:
            raise HTTPException(status_code=404, detail="Student not found in class")

        self.db.delete(student_class)
        self.db.commit()

    async def bulk_update_students(
        self, 
        class_id: str, 
        teacher_id: str, 
        bulk_request: BulkOperationRequest
    ) -> BulkOperationResult:
        """Perform bulk operations on students."""
        # Verify teacher owns this class
        teacher_class = self.db.query(TeacherClass).filter(
            and_(
                TeacherClass.id == class_id,
                TeacherClass.teacher_id == teacher_id
            )
        ).first()
        
        if not teacher_class:
            raise HTTPException(status_code=404, detail="Class not found")

        successful = 0
        failed = 0
        errors = []

        for student_id in bulk_request.student_ids:
            try:
                student_class = self.db.query(StudentClass).filter(
                    and_(
                        StudentClass.teacher_class_id == class_id,
                        StudentClass.student_id == student_id
                    )
                ).first()

                if not student_class:
                    errors.append({
                        "studentId": student_id,
                        "error": "Student not found in class"
                    })
                    failed += 1
                    continue

                # Perform the requested operation
                if bulk_request.operation == "activate":
                    student_class.is_active = True
                elif bulk_request.operation == "deactivate":
                    student_class.is_active = False
                elif bulk_request.operation == "remove":
                    self.db.delete(student_class)
                elif bulk_request.operation == "update_permissions":
                    if bulk_request.data and "permissions" in bulk_request.data:
                        student_class.permissions = bulk_request.data["permissions"]

                successful += 1

            except Exception as e:
                errors.append({
                    "studentId": student_id,
                    "error": str(e)
                })
                failed += 1

        self.db.commit()

        return BulkOperationResult(
            successful=successful,
            failed=failed,
            errors=errors if errors else None
        )

    async def import_students_from_csv(
        self, 
        class_id: str, 
        teacher_id: str, 
        file: UploadFile
    ) -> StudentImportResult:
        """Import students from CSV file."""
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
        duplicates = 0
        errors = []

        try:
            # Read CSV content
            content = await file.read()
            csv_content = content.decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(csv_content))

            for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 for header
                try:
                    # Validate required fields
                    if not row.get('name') or not row.get('email'):
                        errors.append({
                            "row": row_num,
                            "error": "Missing required fields: name, email",
                            "data": row
                        })
                        failed += 1
                        continue

                    # Check if student already exists in class
                    existing_user = self.db.query(User).filter(User.email == row['email']).first()
                    if existing_user:
                        existing_enrollment = self.db.query(StudentClass).filter(
                            and_(
                                StudentClass.student_id == existing_user.id,
                                StudentClass.teacher_class_id == class_id
                            )
                        ).first()
                        
                        if existing_enrollment:
                            duplicates += 1
                            continue

                    # Create student data
                    student_data = ClassroomStudentCreate(
                        name=row['name'],
                        email=row['email'],
                        student_id=row.get('student_id'),
                        grade=int(row['grade']) if row.get('grade') else None,
                        parent_email=row.get('parent_email'),
                        parent_phone=row.get('parent_phone'),
                        notes=row.get('notes')
                    )

                    # Add student to class
                    await self.add_student_to_class(class_id, teacher_id, student_data)
                    successful += 1

                except Exception as e:
                    errors.append({
                        "row": row_num,
                        "error": str(e),
                        "data": row
                    })
                    failed += 1

        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error processing CSV: {str(e)}")

        return StudentImportResult(
            successful=successful,
            failed=failed,
            duplicates=duplicates,
            errors=errors if errors else None
        )

    async def export_students_to_csv(
        self, 
        class_id: str, 
        teacher_id: str, 
        student_ids: Optional[List[str]] = None
    ) -> str:
        """Export students to CSV format."""
        students = await self.get_class_students(class_id, teacher_id)
        
        if student_ids:
            students = [s for s in students if s['id'] in student_ids]

        # Create CSV content
        output = io.StringIO()
        fieldnames = [
            'name', 'email', 'student_id', 'grade', 'total_xp', 'level', 
            'current_streak', 'last_active', 'is_active', 'is_at_risk', 
            'is_high_performer', 'enrolled_at', 'parent_email', 'parent_phone', 'notes'
        ]
        
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        
        for student in students:
            writer.writerow({
                'name': student['name'],
                'email': student['email'],
                'student_id': student.get('studentId', ''),
                'grade': student.get('grade', ''),
                'total_xp': student.get('totalXP', 0),
                'level': student.get('level', 1),
                'current_streak': student.get('currentStreak', 0),
                'last_active': student.get('lastActive', ''),
                'is_active': student['isActive'],
                'is_at_risk': student['isAtRisk'],
                'is_high_performer': student['isHighPerformer'],
                'enrolled_at': student['enrolledAt'],
                'parent_email': student.get('parentEmail', ''),
                'parent_phone': student.get('parentPhone', ''),
                'notes': student.get('notes', '')
            })

        return output.getvalue()

    async def get_classroom_settings(
        self, 
        class_id: str, 
        teacher_id: str
    ) -> ClassroomSettings:
        """Get classroom settings for a teacher's class."""
        # Verify teacher owns this class
        teacher_class = self.db.query(TeacherClass).filter(
            and_(
                TeacherClass.id == class_id,
                TeacherClass.teacher_id == teacher_id
            )
        ).first()
        
        if not teacher_class:
            raise HTTPException(status_code=404, detail="Class not found")

        # For now, return default settings since we don't have a settings table yet
        # In a full implementation, you would have a ClassroomSettings model
        default_settings = ClassroomSettings(
            id=f"settings_{class_id}",
            class_id=class_id,
            allow_self_enrollment=False,
            require_approval=True,
            max_students=None,
            default_permissions=StudentPermissions(
                can_access_chat=True,
                can_take_quizzes=True,
                can_view_leaderboard=True,
                content_restrictions=None,
                time_restrictions=None
            ),
            content_filters=[],
            assessment_settings={
                "allow_retakes": True,
                "max_attempts": None,
                "time_limit": None,
                "show_correct_answers": True
            },
            communication_settings={
                "allow_student_messages": True,
                "allow_parent_notifications": True,
                "auto_progress_reports": True
            },
            updated_at=datetime.utcnow()
        )
        
        return default_settings

    async def update_classroom_settings(
        self, 
        class_id: str, 
        teacher_id: str, 
        settings_update: ClassroomSettingsUpdate
    ) -> ClassroomSettings:
        """Update classroom settings for a teacher's class."""
        # Verify teacher owns this class
        teacher_class = self.db.query(TeacherClass).filter(
            and_(
                TeacherClass.id == class_id,
                TeacherClass.teacher_id == teacher_id
            )
        ).first()
        
        if not teacher_class:
            raise HTTPException(status_code=404, detail="Class not found")

        # In a full implementation, you would update the actual settings record
        # For now, return the updated settings based on the request
        updated_settings = ClassroomSettings(
            id=f"settings_{class_id}",
            class_id=class_id,
            allow_self_enrollment=settings_update.allow_self_enrollment or False,
            require_approval=settings_update.require_approval if settings_update.require_approval is not None else True,
            max_students=settings_update.max_students,
            default_permissions=settings_update.default_permissions or StudentPermissions(
                can_access_chat=True,
                can_take_quizzes=True,
                can_view_leaderboard=True,
                content_restrictions=None,
                time_restrictions=None
            ),
            content_filters=settings_update.content_filters or [],
            assessment_settings=settings_update.assessment_settings or {
                "allow_retakes": True,
                "max_attempts": None,
                "time_limit": None,
                "show_correct_answers": True
            },
            communication_settings=settings_update.communication_settings or {
                "allow_student_messages": True,
                "allow_parent_notifications": True,
                "auto_progress_reports": True
            },
            updated_at=datetime.utcnow()
        )
        
        return updated_settings

    async def update_student_permissions(
        self, 
        class_id: str, 
        student_id: str, 
        teacher_id: str, 
        permissions: StudentPermissions
    ) -> Dict[str, Any]:
        """Update permissions for a specific student in the class."""
        # Verify teacher owns this class and student is in class
        student_class = self.db.query(StudentClass).join(
            TeacherClass, StudentClass.teacher_class_id == TeacherClass.id
        ).filter(
            and_(
                TeacherClass.id == class_id,
                TeacherClass.teacher_id == teacher_id,
                StudentClass.student_id == student_id
            )
        ).first()

        if not student_class:
            raise HTTPException(status_code=404, detail="Student not found in class")

        # Update student permissions
        student_class.permissions = permissions.dict()
        self.db.commit()

        # Return updated student data
        return await self._get_student_data(student_id, class_id)

    async def get_student_permissions(
        self, 
        class_id: str, 
        student_id: str, 
        teacher_id: str
    ) -> StudentPermissions:
        """Get permissions for a specific student in the class."""
        # Verify teacher owns this class and student is in class
        student_class = self.db.query(StudentClass).join(
            TeacherClass, StudentClass.teacher_class_id == TeacherClass.id
        ).filter(
            and_(
                TeacherClass.id == class_id,
                TeacherClass.teacher_id == teacher_id,
                StudentClass.student_id == student_id
            )
        ).first()

        if not student_class:
            raise HTTPException(status_code=404, detail="Student not found in class")

        # Return student permissions or defaults
        permissions_data = student_class.permissions or {}
        return StudentPermissions(
            can_access_chat=permissions_data.get('can_access_chat', True),
            can_take_quizzes=permissions_data.get('can_take_quizzes', True),
            can_view_leaderboard=permissions_data.get('can_view_leaderboard', True),
            content_restrictions=permissions_data.get('content_restrictions'),
            time_restrictions=permissions_data.get('time_restrictions')
        )

    async def apply_content_restrictions(
        self, 
        class_id: str, 
        teacher_id: str, 
        restrictions: List[str]
    ) -> Dict[str, Any]:
        """Apply content restrictions to all students in the class."""
        # Verify teacher owns this class
        teacher_class = self.db.query(TeacherClass).filter(
            and_(
                TeacherClass.id == class_id,
                TeacherClass.teacher_id == teacher_id
            )
        ).first()
        
        if not teacher_class:
            raise HTTPException(status_code=404, detail="Class not found")

        # Get all students in the class
        student_classes = self.db.query(StudentClass).filter(
            StudentClass.teacher_class_id == class_id
        ).all()

        updated_count = 0
        for student_class in student_classes:
            # Update permissions to include content restrictions
            current_permissions = student_class.permissions or {}
            current_permissions['content_restrictions'] = restrictions
            student_class.permissions = current_permissions
            updated_count += 1

        self.db.commit()

        return {
            "message": f"Content restrictions applied to {updated_count} students",
            "restrictions": restrictions,
            "students_affected": updated_count
        }

    async def apply_time_restrictions(
        self, 
        class_id: str, 
        teacher_id: str, 
        time_restrictions: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Apply time restrictions to all students in the class."""
        # Verify teacher owns this class
        teacher_class = self.db.query(TeacherClass).filter(
            and_(
                TeacherClass.id == class_id,
                TeacherClass.teacher_id == teacher_id
            )
        ).first()
        
        if not teacher_class:
            raise HTTPException(status_code=404, detail="Class not found")

        # Get all students in the class
        student_classes = self.db.query(StudentClass).filter(
            StudentClass.teacher_class_id == class_id
        ).all()

        updated_count = 0
        for student_class in student_classes:
            # Update permissions to include time restrictions
            current_permissions = student_class.permissions or {}
            current_permissions['time_restrictions'] = time_restrictions
            student_class.permissions = current_permissions
            updated_count += 1

        self.db.commit()

        return {
            "message": f"Time restrictions applied to {updated_count} students",
            "time_restrictions": time_restrictions,
            "students_affected": updated_count
        }

    def _calculate_risk_status(self, progress: Optional[StudentProgress], xp: Optional[Gamification]) -> bool:
        """Calculate if student is at risk based on activity and performance."""
        if not progress:
            return True  # No progress data indicates risk

        # Check for inactivity (7+ days)
        if progress.last_activity_date:
            days_inactive = (datetime.utcnow() - progress.last_activity_date).days
            if days_inactive >= 7:
                return True

        # Check for low performance (average score < 60%)
        if progress.average_score and progress.average_score < 0.6:
            return True

        return False

    def _calculate_high_performer_status(self, progress: Optional[StudentProgress], xp: Optional[Gamification]) -> bool:
        """Calculate if student is a high performer."""
        if not progress or not xp:
            return False

        # High XP and good performance
        if xp.total_xp > 1000 and progress.average_score and progress.average_score > 0.85:
            return True

        # Consistent streak and good performance
        if xp.current_streak > 7 and progress.average_score and progress.average_score > 0.8:
            return True

        return False

    async def _get_student_data(self, student_id: str, class_id: str) -> Dict[str, Any]:
        """Get complete student data for a specific student in a class."""
        query = self.db.query(
            StudentClass,
            User,
            StudentProgress,
            Gamification
        ).join(
            User, StudentClass.student_id == User.id
        ).outerjoin(
            StudentProgress, StudentProgress.user_id == User.id
        ).outerjoin(
            Gamification, Gamification.user_id == User.id
        ).filter(
            and_(
                StudentClass.teacher_class_id == class_id,
                StudentClass.student_id == student_id
            )
        ).first()

        if not query:
            raise HTTPException(status_code=404, detail="Student not found")

        student_class, user, progress, xp = query

        return {
            "id": str(user.id),
            "name": user.full_name or f"{user.first_name} {user.last_name}",
            "email": user.email,
            "studentId": getattr(user, 'student_id', None),
            "grade": student_class.grade,
            "totalXP": xp.total_xp if xp else 0,
            "level": xp.level if xp else 1,
            "currentStreak": xp.current_streak if xp else 0,
            "lastActive": progress.last_activity_date if progress else user.last_login,
            "isActive": student_class.is_active,
            "isAtRisk": self._calculate_risk_status(progress, xp),
            "isHighPerformer": self._calculate_high_performer_status(progress, xp),
            "enrolledAt": student_class.enrolled_at,
            "parentEmail": getattr(user, 'parent_email', None),
            "parentPhone": getattr(user, 'parent_phone', None),
            "notes": student_class.notes,
            "permissions": student_class.permissions or {}
        }