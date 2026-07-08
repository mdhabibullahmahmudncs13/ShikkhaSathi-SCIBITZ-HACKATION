#!/usr/bin/env python3
"""
Fix missing teacher profiles for existing teacher users
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.models.teacher import Teacher


def fix_teacher_profiles():
    """Create missing teacher profiles for existing teacher users"""
    db = SessionLocal()
    
    try:
        # Find all teacher users without teacher profiles
        teacher_users = db.query(User).filter(User.role == UserRole.TEACHER).all()
        
        fixed_count = 0
        for user in teacher_users:
            # Check if teacher profile exists
            existing_profile = db.query(Teacher).filter(Teacher.user_id == user.id).first()
            
            if not existing_profile:
                print(f"Creating teacher profile for user: {user.email}")
                
                # Create teacher profile
                teacher_profile = Teacher(
                    user_id=user.id,
                    subjects=[],  # Will be updated by teacher later
                    grade_levels=[],  # Will be updated by teacher later
                    phone=user.phone,
                    is_active=True
                )
                
                db.add(teacher_profile)
                fixed_count += 1
        
        if fixed_count > 0:
            db.commit()
            print(f"✅ Created {fixed_count} missing teacher profiles")
        else:
            print("✅ All teacher users already have profiles")
            
    except Exception as e:
        print(f"❌ Error fixing teacher profiles: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    fix_teacher_profiles()