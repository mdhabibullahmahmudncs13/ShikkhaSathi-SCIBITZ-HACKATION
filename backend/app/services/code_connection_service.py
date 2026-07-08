"""
Code-based Connection Service
Google Classroom-style connection system using simple codes
"""

import random
import string
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models.user import User, UserRole
from app.models.teacher import TeacherClass, Teacher
from app.models.parent_child import ParentChildInvitation, ParentChildRelationship, RelationshipType
from app.db.session import get_db


class CodeConnectionService:
    def __init__(self, db: Session):
        self.db = db

    def generate_class_code(self) -> str:
        """Generate a unique 7-character class code like Google Classroom"""
        while True:
            # Generate code: 3 letters + 4 numbers (e.g., ABC1234)
            letters = ''.join(random.choices(string.ascii_uppercase, k=3))
            numbers = ''.join(random.choices(string.digits, k=4))
            code = letters + numbers
            
            # Check if code already exists
            existing = self.db.query(TeacherClass).filter(
                TeacherClass.class_code == code
            ).first()
            
            if not existing:
                return code

    def generate_parent_code(self) -> str:
        """Generate a unique 8-character parent connection code"""
        while True:
            # Generate code: 4 letters + 4 numbers (e.g., ABCD1234)
            letters = ''.join(random.choices(string.ascii_uppercase, k=4))
            numbers = ''.join(random.choices(string.digits, k=4))
            code = letters + numbers
            
            # Check if code already exists
            existing = self.db.query(ParentChildInvitation).filter(
                ParentChildInvitation.invitation_code == code
            ).first()
            
            if not existing:
                return code

    def create_class_with_code(self, teacher_id: str, class_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new class with auto-generated join code"""
        try:
            # Generate unique class code
            class_code = self.generate_class_code()
            
            # Create class
            new_class = TeacherClass(
                teacher_id=teacher_id,
                class_name=class_data.get('class_name'),
                subject=class_data.get('subject'),
                grade_level=class_data.get('grade_level'),
                section=class_data.get('section'),
                description=class_data.get('description'),
                academic_year=class_data.get('academic_year', '2024-2025'),
                class_code=class_code,
                code_enabled=True,
                max_students=class_data.get('max_students', 50)
            )
            
            self.db.add(new_class)
            self.db.commit()
            self.db.refresh(new_class)
            
            return {
                "success": True,
                "class_id": str(new_class.id),
                "class_code": class_code,
                "message": f"Class created successfully! Share code '{class_code}' with students to join."
            }
            
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to create class: {str(e)}")

    def join_class_by_code(self, student_id: str, class_code: str) -> Dict[str, Any]:
        """Student joins a class using the class code"""
        try:
            # Find class by code
            teacher_class = self.db.query(TeacherClass).filter(
                and_(
                    TeacherClass.class_code == class_code.upper(),
                    TeacherClass.code_enabled == True,
                    TeacherClass.is_active == True
                )
            ).first()
            
            if not teacher_class:
                return {
                    "success": False,
                    "message": "Invalid class code or class is not accepting new students"
                }
            
            # Check if code is expired
            if teacher_class.code_expires_at and teacher_class.code_expires_at < datetime.utcnow():
                return {
                    "success": False,
                    "message": "Class code has expired"
                }
            
            # Check if student is already enrolled
            student = self.db.query(User).filter(User.id == student_id).first()
            if teacher_class in student.enrolled_classes:
                return {
                    "success": False,
                    "message": "You are already enrolled in this class"
                }
            
            # Check class capacity
            current_students = len(teacher_class.students)
            if current_students >= teacher_class.max_students:
                return {
                    "success": False,
                    "message": "Class is full. Cannot join at this time."
                }
            
            # Add student to class
            teacher_class.students.append(student)
            self.db.commit()
            
            # Get teacher info
            teacher = self.db.query(Teacher).join(User).filter(
                Teacher.id == teacher_class.teacher_id
            ).first()
            
            return {
                "success": True,
                "message": f"Successfully joined {teacher_class.class_name}!",
                "class_info": {
                    "id": str(teacher_class.id),
                    "name": teacher_class.class_name,
                    "subject": teacher_class.subject,
                    "grade": teacher_class.grade_level,
                    "teacher_name": teacher.user.full_name if teacher else "Unknown",
                    "students_count": current_students + 1
                }
            }
            
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to join class: {str(e)}")

    def create_parent_connection_code(self, parent_id: str, relationship_type: str = "guardian") -> Dict[str, Any]:
        """Parent creates a connection code for their child to use"""
        try:
            # Generate unique parent code
            parent_code = self.generate_parent_code()
            
            # Create invitation
            invitation = ParentChildInvitation(
                parent_id=parent_id,
                relationship_type=relationship_type,
                invitation_code=parent_code,
                code_type="parent_child",
                expires_at=datetime.utcnow() + timedelta(days=7)  # Expires in 7 days
            )
            
            self.db.add(invitation)
            self.db.commit()
            
            return {
                "success": True,
                "parent_code": parent_code,
                "expires_at": invitation.expires_at.isoformat(),
                "message": f"Parent connection code created! Share '{parent_code}' with your child."
            }
            
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to create parent code: {str(e)}")

    def connect_to_parent_by_code(self, student_id: str, parent_code: str) -> Dict[str, Any]:
        """Student connects to parent using the parent code"""
        try:
            # Find invitation by code
            invitation = self.db.query(ParentChildInvitation).filter(
                and_(
                    ParentChildInvitation.invitation_code == parent_code.upper(),
                    ParentChildInvitation.status == "pending"
                )
            ).first()
            
            if not invitation:
                return {
                    "success": False,
                    "message": "Invalid parent code or invitation has already been used"
                }
            
            # Check if code is expired
            if invitation.expires_at < datetime.utcnow():
                invitation.status = "expired"
                self.db.commit()
                return {
                    "success": False,
                    "message": "Parent code has expired"
                }
            
            # Check if relationship already exists
            existing = self.db.query(ParentChildRelationship).filter(
                and_(
                    ParentChildRelationship.parent_id == invitation.parent_id,
                    ParentChildRelationship.child_id == student_id,
                    ParentChildRelationship.is_active == True
                )
            ).first()
            
            if existing:
                return {
                    "success": False,
                    "message": "You are already connected to this parent"
                }
            
            # Create parent-child relationship
            relationship = ParentChildRelationship(
                parent_id=invitation.parent_id,
                child_id=student_id,
                relationship_type=invitation.relationship_type,
                is_primary=True,
                is_verified=True,  # Auto-verified through code
                verified_at=datetime.utcnow(),
                verification_method="code"
            )
            
            # Update invitation status
            invitation.status = "accepted"
            invitation.accepted_at = datetime.utcnow()
            invitation.accepted_by = student_id
            
            self.db.add(relationship)
            self.db.commit()
            
            # Get parent info
            parent = self.db.query(User).filter(User.id == invitation.parent_id).first()
            
            return {
                "success": True,
                "message": f"Successfully connected to {parent.full_name}!",
                "parent_info": {
                    "name": parent.full_name,
                    "email": parent.email,
                    "relationship": invitation.relationship_type
                }
            }
            
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to connect to parent: {str(e)}")

    def get_class_info_by_code(self, class_code: str) -> Dict[str, Any]:
        """Get class information by code (for preview before joining)"""
        try:
            teacher_class = self.db.query(TeacherClass).join(Teacher).join(User).filter(
                and_(
                    TeacherClass.class_code == class_code.upper(),
                    TeacherClass.is_active == True
                )
            ).first()
            
            if not teacher_class:
                return {
                    "success": False,
                    "message": "Class not found"
                }
            
            teacher = teacher_class.teacher
            current_students = len(teacher_class.students)
            
            return {
                "success": True,
                "class_info": {
                    "name": teacher_class.class_name,
                    "subject": teacher_class.subject,
                    "grade": teacher_class.grade_level,
                    "section": teacher_class.section,
                    "description": teacher_class.description,
                    "teacher_name": teacher.user.full_name,
                    "students_count": current_students,
                    "max_students": teacher_class.max_students,
                    "can_join": (
                        teacher_class.code_enabled and 
                        current_students < teacher_class.max_students and
                        (not teacher_class.code_expires_at or teacher_class.code_expires_at > datetime.utcnow())
                    )
                }
            }
            
        except Exception as e:
            raise Exception(f"Failed to get class info: {str(e)}")

    def get_parent_info_by_code(self, parent_code: str) -> Dict[str, Any]:
        """Get parent information by code (for preview before connecting)"""
        try:
            invitation = self.db.query(ParentChildInvitation).join(User).filter(
                and_(
                    ParentChildInvitation.invitation_code == parent_code.upper(),
                    ParentChildInvitation.status == "pending"
                )
            ).first()
            
            if not invitation:
                return {
                    "success": False,
                    "message": "Parent invitation not found or expired"
                }
            
            parent = invitation.parent
            
            return {
                "success": True,
                "parent_info": {
                    "name": parent.full_name,
                    "relationship_type": invitation.relationship_type,
                    "expires_at": invitation.expires_at.isoformat(),
                    "can_connect": invitation.expires_at > datetime.utcnow()
                }
            }
            
        except Exception as e:
            raise Exception(f"Failed to get parent info: {str(e)}")

    def disable_class_code(self, teacher_id: str, class_id: str) -> Dict[str, Any]:
        """Teacher disables class code to prevent new students from joining"""
        try:
            teacher_class = self.db.query(TeacherClass).filter(
                and_(
                    TeacherClass.id == class_id,
                    TeacherClass.teacher_id == teacher_id
                )
            ).first()
            
            if not teacher_class:
                return {
                    "success": False,
                    "message": "Class not found"
                }
            
            teacher_class.code_enabled = False
            self.db.commit()
            
            return {
                "success": True,
                "message": "Class code disabled. Students can no longer join using the code."
            }
            
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to disable class code: {str(e)}")

    def regenerate_class_code(self, teacher_id: str, class_id: str) -> Dict[str, Any]:
        """Teacher generates a new class code"""
        try:
            teacher_class = self.db.query(TeacherClass).filter(
                and_(
                    TeacherClass.id == class_id,
                    TeacherClass.teacher_id == teacher_id
                )
            ).first()
            
            if not teacher_class:
                return {
                    "success": False,
                    "message": "Class not found"
                }
            
            # Generate new code
            new_code = self.generate_class_code()
            teacher_class.class_code = new_code
            teacher_class.code_enabled = True
            self.db.commit()
            
            return {
                "success": True,
                "new_class_code": new_code,
                "message": f"New class code generated: {new_code}"
            }
            
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to regenerate class code: {str(e)}")