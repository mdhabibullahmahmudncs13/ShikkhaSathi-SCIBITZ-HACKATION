#!/usr/bin/env python3
"""
Create an admin user for ShikkhaSathi platform
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.models.gamification import Gamification
import uuid
from datetime import datetime

def create_admin_user():
    """Create a default admin user"""
    db = SessionLocal()
    
    try:
        # Check if admin user already exists
        existing_admin = db.query(User).filter(
            User.email == "admin@shikkhaSathi.com"
        ).first()
        
        if existing_admin:
            print("Admin user already exists!")
            print(f"Email: {existing_admin.email}")
            print(f"Name: {existing_admin.full_name}")
            return
        
        # Create admin user
        admin_user = User(
            id=uuid.uuid4(),
            email="admin@shikkhaSathi.com",
            password_hash="admin123_hash",  # In production, use proper password hashing
            full_name="System Administrator",
            phone="+8801700000000",
            school="ShikkhaSathi Platform",
            district="Dhaka",
            role=UserRole.ADMIN,
            is_active=True,
            created_at=datetime.utcnow()
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print("✅ Admin user created successfully!")
        print(f"Email: {admin_user.email}")
        print(f"Name: {admin_user.full_name}")
        print(f"Role: {admin_user.role}")
        print(f"User ID: {admin_user.id}")
        print("\n🔐 Login Credentials:")
        print("Email: admin@shikkhaSathi.com")
        print("Password: admin123")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()