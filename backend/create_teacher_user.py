#!/usr/bin/env python3
"""
Create a teacher user for ShikkhaSathi platform testing
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.models.teacher import Teacher
from app.core.security import get_password_hash
import uuid
from datetime import datetime

def create_teacher_user():
    """Create a test teacher user"""
    db = SessionLocal()
    
    try:
        # Check if teacher user already exists
        existing_teacher = db.query(User).filter(
            User.email == "teacher@test.com"
        ).first()
        
        if existing_teacher:
            print("Teacher user already exists!")
            print(f"Email: {existing_teacher.email}")
            print(f"Name: {existing_teacher.full_name}")
            return existing_teacher
        
        # Create teacher user
        teacher_user = User(
            id=uuid.uuid4(),
            email="teacher@test.com",
            password_hash=get_password_hash("teacher123"),
            full_name="Test Teacher",
            phone="+8801700000001",
            school="Test School",
            district="Dhaka",
            role=UserRole.TEACHER,
            is_active=True,
            created_at=datetime.utcnow()
        )
        
        db.add(teacher_user)
        db.commit()
        db.refresh(teacher_user)
        
        # Create teacher profile
        teacher_profile = Teacher(
            id=uuid.uuid4(),
            user_id=teacher_user.id,
            employee_id="T001",
            subjects=["Physics", "Mathematics"],
            grade_levels=[9, 10, 11, 12],
            department="Science",
            qualification="M.Sc. in Physics",
            experience_years=5,
            phone="+8801700000001",
            bio="Test teacher for development",
            is_active=True,
            created_at=datetime.utcnow()
        )
        
        db.add(teacher_profile)
        db.commit()
        db.refresh(teacher_profile)
        
        print("✅ Teacher user created successfully!")
        print(f"Email: {teacher_user.email}")
        print(f"Name: {teacher_user.full_name}")
        print(f"Role: {teacher_user.role}")
        print(f"User ID: {teacher_user.id}")
        print(f"Teacher Profile ID: {teacher_profile.id}")
        print("\n🔐 Login Credentials:")
        print("Email: teacher@test.com")
        print("Password: teacher123")
        
        return teacher_user
        
    except Exception as e:
        print(f"❌ Error creating teacher user: {str(e)}")
        db.rollback()
        return None
    finally:
        db.close()

if __name__ == "__main__":
    create_teacher_user()