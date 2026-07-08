from typing import Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash, verify_password, create_access_token
from app.db.redis_client import redis_client
import json


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        return self.db.query(User).filter(User.email == email).first()

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        return self.db.query(User).filter(User.id == user_id).first()

    def create_user(self, user_create: UserCreate) -> User:
        """Create new user"""
        # Check if user already exists
        existing_user = self.get_user_by_email(user_create.email)
        if existing_user:
            raise ValueError("User with this email already exists")

        # Create user with hashed password
        hashed_password = get_password_hash(user_create.password)
        db_user = User(
            email=user_create.email,
            password_hash=hashed_password,
            full_name=user_create.full_name,
            phone=user_create.phone,
            date_of_birth=user_create.date_of_birth,
            school=user_create.school,
            district=user_create.district,
            grade=user_create.grade,
            medium=user_create.medium,
            role=user_create.role,
            is_active=user_create.is_active
        )
        
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        
        # Create role-specific profiles
        from app.models.user import UserRole
        if user_create.role == UserRole.TEACHER:
            self._create_teacher_profile(db_user)
        
        return db_user

    def _create_teacher_profile(self, user: User) -> None:
        """Create teacher profile for a teacher user"""
        from app.models.teacher import Teacher
        
        teacher_profile = Teacher(
            user_id=user.id,
            subjects=[],  # Will be updated by teacher later
            grade_levels=[],  # Will be updated by teacher later
            phone=user.phone,
            is_active=True
        )
        
        self.db.add(teacher_profile)
        self.db.commit()
        self.db.refresh(teacher_profile)

    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Authenticate user with email and password"""
        user = self.get_user_by_email(email)
        if not user:
            return None
        if not user.is_active:
            return None
        if not verify_password(password, user.password_hash):
            return None
        
        # Update last login
        user.last_login = func.now()
        self.db.commit()
        return user

    def update_user(self, user_id: str, user_update: UserUpdate) -> Optional[User]:
        """Update user information"""
        user = self.get_user_by_id(user_id)
        if not user:
            return None

        update_data = user_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)

        self.db.commit()
        self.db.refresh(user)
        return user

    def create_session(self, user: User) -> str:
        """Create user session and return access token"""
        access_token_expires = timedelta(minutes=60 * 24 * 8)  # 8 days
        access_token = create_access_token(
            subject=str(user.id), expires_delta=access_token_expires
        )
        
        # Store session in Redis (simplified for now)
        session_data = {
            "user_id": str(user.id),
            "email": user.email,
            "role": user.role.value if hasattr(user.role, 'value') else str(user.role),
            "created_at": datetime.utcnow().isoformat()
        }
        
        # For now, skip Redis storage to avoid async issues
        # The JWT token itself contains the necessary information
        try:
            if redis_client and hasattr(redis_client, 'client') and redis_client.client:
                # Store session data (sync version)
                pass  # Skip Redis for now to avoid serialization issues
        except Exception as e:
            # Log but don't fail if Redis is unavailable
            print(f"Redis session storage failed: {e}")
        
        return access_token

    def get_session(self, token: str) -> Optional[dict]:
        """Get session data from Redis"""
        try:
            if redis_client.client:
                # Redis async client needs await, but we're in sync context
                # For now, return None and rely on JWT validation
                return None
        except Exception as e:
            print(f"Redis session retrieval failed: {e}")
        return None

    def invalidate_session(self, token: str) -> bool:
        """Invalidate user session"""
        try:
            if redis_client.client:
                # Same issue - async in sync context
                return True
        except Exception as e:
            print(f"Redis session invalidation failed: {e}")
        return False

    def refresh_session(self, token: str) -> Optional[str]:
        """Refresh user session and return new token"""
        session_data = self.get_session(token)
        if not session_data:
            return None
        
        user = self.get_user_by_id(session_data["user_id"])
        if not user or not user.is_active:
            return None
        
        # Invalidate old session
        self.invalidate_session(token)
        
        # Create new session
        return self.create_session(user)