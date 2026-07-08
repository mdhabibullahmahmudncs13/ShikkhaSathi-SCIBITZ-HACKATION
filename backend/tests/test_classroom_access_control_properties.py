"""
Property-based tests for classroom access control enforcement.
Tests that teachers can only access students in their assigned classes.

Feature: teacher-dashboard, Property 7: Access Control Enforcement
Validates: Requirements 6.1, 6.2
"""

import pytest
from hypothesis import given, strategies as st, assume
from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime, timedelta
import uuid

from app.services.classroom_service import ClassroomService
from app.models.teacher import Teacher, TeacherClass
from app.models.user import User
from app.models.teacher import StudentClass
from app.schemas.classroom import ClassroomStudentCreate, ClassroomStudentUpdate


# Hypothesis strategies for generating test data
@st.composite
def teacher_strategy(draw):
    """Generate a teacher with random data."""
    return {
        'id': str(uuid.uuid4()),
        'user_id': str(uuid.uuid4()),
        'employee_id': f"T{draw(st.integers(min_value=1000, max_value=9999))}",
        'subjects': draw(st.lists(st.sampled_from(['Math', 'Science', 'English', 'History']), min_size=1, max_size=3)),
        'grade_levels': draw(st.lists(st.integers(min_value=6, max_value=12), min_size=1, max_size=3))
    }


@st.composite
def class_strategy(draw):
    """Generate a class with random data."""
    return {
        'id': str(uuid.uuid4()),
        'class_name': f"Class {draw(st.integers(min_value=1, max_value=20))}",
        'subject': draw(st.sampled_from(['Math', 'Science', 'English', 'History'])),
        'grade_level': draw(st.integers(min_value=6, max_value=12))
    }


@st.composite
def student_strategy(draw):
    """Generate a student with random data."""
    first_name = draw(st.text(alphabet=st.characters(whitelist_categories=('Lu', 'Ll')), min_size=2, max_size=10))
    last_name = draw(st.text(alphabet=st.characters(whitelist_categories=('Lu', 'Ll')), min_size=2, max_size=10))
    return {
        'id': str(uuid.uuid4()),
        'email': f"{first_name.lower()}.{last_name.lower()}@example.com",
        'first_name': first_name,
        'last_name': last_name,
        'full_name': f"{first_name} {last_name}",
        'role': 'student',
        'is_active': True
    }


@st.composite
def student_class_strategy(draw):
    """Generate a student class enrollment with random data."""
    return {
        'grade': draw(st.integers(min_value=6, max_value=12)),
        'is_active': draw(st.booleans()),
        'enrolled_at': datetime.utcnow() - timedelta(days=draw(st.integers(min_value=1, max_value=365))),
        'notes': draw(st.text(max_size=100)) if draw(st.booleans()) else None,
        'permissions': {}
    }


class TestClassroomAccessControlProperties:
    """Property-based tests for classroom access control."""

    @given(
        teacher1=teacher_strategy(),
        teacher2=teacher_strategy(),
        class1=class_strategy(),
        class2=class_strategy(),
        student=student_strategy(),
        enrollment=student_class_strategy()
    )
    async def test_teacher_can_only_access_own_class_students(
        self, 
        teacher1, 
        teacher2, 
        class1, 
        class2, 
        student, 
        enrollment,
        db_session: Session
    ):
        """
        Property: Teachers can only access students in their assigned classes.
        
        For any teacher T1 with class C1 and teacher T2 with class C2,
        when T1 tries to access students in C2, the operation should fail.
        """
        assume(teacher1['id'] != teacher2['id'])
        assume(class1['id'] != class2['id'])
        
        # Create teachers
        teacher1_obj = Teacher(
            id=teacher1['id'],
            user_id=teacher1['user_id'],
            employee_id=teacher1['employee_id'],
            subjects=teacher1['subjects'],
            grade_levels=teacher1['grade_levels']
        )
        teacher2_obj = Teacher(
            id=teacher2['id'],
            user_id=teacher2['user_id'],
            employee_id=teacher2['employee_id'],
            subjects=teacher2['subjects'],
            grade_levels=teacher2['grade_levels']
        )
        
        # Create classes
        class1_obj = TeacherClass(
            id=class1['id'],
            teacher_id=teacher1['id'],
            class_name=class1['class_name'],
            subject=class1['subject'],
            grade_level=class1['grade_level']
        )
        class2_obj = TeacherClass(
            id=class2['id'],
            teacher_id=teacher2['id'],
            class_name=class2['class_name'],
            subject=class2['subject'],
            grade_level=class2['grade_level']
        )
        
        # Create student
        student_obj = User(
            id=student['id'],
            email=student['email'],
            first_name=student['first_name'],
            last_name=student['last_name'],
            full_name=student['full_name'],
            role=student['role'],
            is_active=student['is_active']
        )
        
        # Enroll student in teacher2's class
        student_class_obj = StudentClass(
            student_id=student['id'],
            teacher_class_id=class2['id'],
            grade=enrollment['grade'],
            is_active=enrollment['is_active'],
            enrolled_at=enrollment['enrolled_at'],
            notes=enrollment['notes'],
            permissions=enrollment['permissions']
        )
        
        # Add all objects to database
        db_session.add_all([
            teacher1_obj, teacher2_obj, class1_obj, class2_obj, 
            student_obj, student_class_obj
        ])
        db_session.commit()
        
        # Create classroom service
        classroom_service = ClassroomService(db_session)
        
        # Teacher1 should be able to access their own class (empty)
        teacher1_students = await classroom_service.get_class_students(
            class_id=class1['id'],
            teacher_id=teacher1['id']
        )
        assert isinstance(teacher1_students, list)
        assert len(teacher1_students) == 0  # No students in teacher1's class
        
        # Teacher2 should be able to access their own class (with student)
        teacher2_students = await classroom_service.get_class_students(
            class_id=class2['id'],
            teacher_id=teacher2['id']
        )
        assert isinstance(teacher2_students, list)
        assert len(teacher2_students) == 1
        assert teacher2_students[0]['id'] == student['id']
        
        # Teacher1 should NOT be able to access teacher2's class
        with pytest.raises(HTTPException) as exc_info:
            await classroom_service.get_class_students(
                class_id=class2['id'],
                teacher_id=teacher1['id']
            )
        assert exc_info.value.status_code == 404
        assert "Class not found" in str(exc_info.value.detail)

    @given(
        teacher1=teacher_strategy(),
        teacher2=teacher_strategy(),
        class1=class_strategy(),
        class2=class_strategy(),
        student=student_strategy(),
        enrollment=student_class_strategy()
    )
    async def test_teacher_cannot_modify_students_in_other_classes(
        self, 
        teacher1, 
        teacher2, 
        class1, 
        class2, 
        student, 
        enrollment,
        db_session: Session
    ):
        """
        Property: Teachers cannot modify students in classes they don't own.
        
        For any teacher T1 with class C1 and teacher T2 with class C2 containing student S,
        when T1 tries to modify S in C2, the operation should fail.
        """
        assume(teacher1['id'] != teacher2['id'])
        assume(class1['id'] != class2['id'])
        
        # Setup database objects (same as previous test)
        teacher1_obj = Teacher(
            id=teacher1['id'],
            user_id=teacher1['user_id'],
            employee_id=teacher1['employee_id'],
            subjects=teacher1['subjects'],
            grade_levels=teacher1['grade_levels']
        )
        teacher2_obj = Teacher(
            id=teacher2['id'],
            user_id=teacher2['user_id'],
            employee_id=teacher2['employee_id'],
            subjects=teacher2['subjects'],
            grade_levels=teacher2['grade_levels']
        )
        
        class1_obj = TeacherClass(
            id=class1['id'],
            teacher_id=teacher1['id'],
            class_name=class1['class_name'],
            subject=class1['subject'],
            grade_level=class1['grade_level']
        )
        class2_obj = TeacherClass(
            id=class2['id'],
            teacher_id=teacher2['id'],
            class_name=class2['class_name'],
            subject=class2['subject'],
            grade_level=class2['grade_level']
        )
        
        student_obj = User(
            id=student['id'],
            email=student['email'],
            first_name=student['first_name'],
            last_name=student['last_name'],
            full_name=student['full_name'],
            role=student['role'],
            is_active=student['is_active']
        )
        
        student_class_obj = StudentClass(
            student_id=student['id'],
            teacher_class_id=class2['id'],
            grade=enrollment['grade'],
            is_active=enrollment['is_active'],
            enrolled_at=enrollment['enrolled_at'],
            notes=enrollment['notes'],
            permissions=enrollment['permissions']
        )
        
        db_session.add_all([
            teacher1_obj, teacher2_obj, class1_obj, class2_obj, 
            student_obj, student_class_obj
        ])
        db_session.commit()
        
        classroom_service = ClassroomService(db_session)
        
        # Teacher1 should NOT be able to update student in teacher2's class
        update_data = ClassroomStudentUpdate(
            name="Updated Name",
            notes="Updated notes"
        )
        
        with pytest.raises(HTTPException) as exc_info:
            await classroom_service.update_student_in_class(
                class_id=class2['id'],
                student_id=student['id'],
                teacher_id=teacher1['id'],
                student_data=update_data
            )
        assert exc_info.value.status_code == 404
        assert "Student not found in class" in str(exc_info.value.detail)

    @given(
        teacher1=teacher_strategy(),
        teacher2=teacher_strategy(),
        class1=class_strategy(),
        class2=class_strategy(),
        student=student_strategy(),
        enrollment=student_class_strategy()
    )
    async def test_teacher_cannot_remove_students_from_other_classes(
        self, 
        teacher1, 
        teacher2, 
        class1, 
        class2, 
        student, 
        enrollment,
        db_session: Session
    ):
        """
        Property: Teachers cannot remove students from classes they don't own.
        
        For any teacher T1 with class C1 and teacher T2 with class C2 containing student S,
        when T1 tries to remove S from C2, the operation should fail.
        """
        assume(teacher1['id'] != teacher2['id'])
        assume(class1['id'] != class2['id'])
        
        # Setup database objects
        teacher1_obj = Teacher(
            id=teacher1['id'],
            user_id=teacher1['user_id'],
            employee_id=teacher1['employee_id'],
            subjects=teacher1['subjects'],
            grade_levels=teacher1['grade_levels']
        )
        teacher2_obj = Teacher(
            id=teacher2['id'],
            user_id=teacher2['user_id'],
            employee_id=teacher2['employee_id'],
            subjects=teacher2['subjects'],
            grade_levels=teacher2['grade_levels']
        )
        
        class1_obj = TeacherClass(
            id=class1['id'],
            teacher_id=teacher1['id'],
            class_name=class1['class_name'],
            subject=class1['subject'],
            grade_level=class1['grade_level']
        )
        class2_obj = TeacherClass(
            id=class2['id'],
            teacher_id=teacher2['id'],
            class_name=class2['class_name'],
            subject=class2['subject'],
            grade_level=class2['grade_level']
        )
        
        student_obj = User(
            id=student['id'],
            email=student['email'],
            first_name=student['first_name'],
            last_name=student['last_name'],
            full_name=student['full_name'],
            role=student['role'],
            is_active=student['is_active']
        )
        
        student_class_obj = StudentClass(
            student_id=student['id'],
            teacher_class_id=class2['id'],
            grade=enrollment['grade'],
            is_active=enrollment['is_active'],
            enrolled_at=enrollment['enrolled_at'],
            notes=enrollment['notes'],
            permissions=enrollment['permissions']
        )
        
        db_session.add_all([
            teacher1_obj, teacher2_obj, class1_obj, class2_obj, 
            student_obj, student_class_obj
        ])
        db_session.commit()
        
        classroom_service = ClassroomService(db_session)
        
        # Teacher1 should NOT be able to remove student from teacher2's class
        with pytest.raises(HTTPException) as exc_info:
            await classroom_service.remove_student_from_class(
                class_id=class2['id'],
                student_id=student['id'],
                teacher_id=teacher1['id']
            )
        assert exc_info.value.status_code == 404
        assert "Student not found in class" in str(exc_info.value.detail)

    @given(
        teacher=teacher_strategy(),
        class_data=class_strategy(),
        students=st.lists(student_strategy(), min_size=1, max_size=5),
        enrollments=st.lists(student_class_strategy(), min_size=1, max_size=5)
    )
    async def test_teacher_can_only_see_own_students_in_bulk_operations(
        self, 
        teacher, 
        class_data, 
        students, 
        enrollments,
        db_session: Session
    ):
        """
        Property: Bulk operations only affect students in teacher's own classes.
        
        For any teacher T with class C containing students S1, S2, ..., Sn,
        when T performs bulk operations, only students in C should be affected.
        """
        assume(len(students) == len(enrollments))
        
        # Create teacher and class
        teacher_obj = Teacher(
            id=teacher['id'],
            user_id=teacher['user_id'],
            employee_id=teacher['employee_id'],
            subjects=teacher['subjects'],
            grade_levels=teacher['grade_levels']
        )
        
        class_obj = TeacherClass(
            id=class_data['id'],
            teacher_id=teacher['id'],
            class_name=class_data['class_name'],
            subject=class_data['subject'],
            grade_level=class_data['grade_level']
        )
        
        # Create students and enrollments
        student_objs = []
        student_class_objs = []
        
        for student, enrollment in zip(students, enrollments):
            student_obj = User(
                id=student['id'],
                email=student['email'],
                first_name=student['first_name'],
                last_name=student['last_name'],
                full_name=student['full_name'],
                role=student['role'],
                is_active=student['is_active']
            )
            student_objs.append(student_obj)
            
            student_class_obj = StudentClass(
                student_id=student['id'],
                teacher_class_id=class_data['id'],
                grade=enrollment['grade'],
                is_active=enrollment['is_active'],
                enrolled_at=enrollment['enrolled_at'],
                notes=enrollment['notes'],
                permissions=enrollment['permissions']
            )
            student_class_objs.append(student_class_obj)
        
        # Add all objects to database
        db_session.add(teacher_obj)
        db_session.add(class_obj)
        db_session.add_all(student_objs)
        db_session.add_all(student_class_objs)
        db_session.commit()
        
        classroom_service = ClassroomService(db_session)
        
        # Get all student IDs
        student_ids = [s['id'] for s in students]
        
        # Add a fake student ID that doesn't exist in this class
        fake_student_id = str(uuid.uuid4())
        student_ids_with_fake = student_ids + [fake_student_id]
        
        # Perform bulk operation
        from app.schemas.classroom import BulkOperationRequest
        bulk_request = BulkOperationRequest(
            student_ids=student_ids_with_fake,
            operation="activate"
        )
        
        result = await classroom_service.bulk_update_students(
            class_id=class_data['id'],
            teacher_id=teacher['id'],
            bulk_request=bulk_request
        )
        
        # Should succeed for valid students, fail for fake student
        assert result.successful == len(students)
        assert result.failed == 1
        assert result.errors is not None
        assert len(result.errors) == 1
        assert result.errors[0]['studentId'] == fake_student_id
        assert "Student not found in class" in result.errors[0]['error']