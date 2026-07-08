"""
Teacher Authentication Service
Extends the base authentication system with teacher-specific functionality
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.user import User, UserRole
from app.models.teacher import Teacher, TeacherPermission
from app.schemas.user import UserCreate
from app.services.auth_service import AuthService
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.redis_client import redis_client
import json
import uuid


class TeacherAuthService(AuthService):
    """Extended authentication service for teachers"""
    
    def __init__(self, db: Session):
        super().__init__(db)
    
    def create_teacher_user(self, teacher_data: Dict[str, Any]) -> User:
        """Create a new teacher user account"""
        # Validate required fields
        required_fields = ['email', 'password', 'full_name', 'subjects', 'grade_levels']
        for field in required_fields:
            if field not in teacher_data:
                raise ValueError(f"Missing required field: {field}")
        
        # Check if user already exists
        existing_user = self.get_user_by_email(teacher_data['email'])
        if existing_user:
            raise ValueError("User with this email already exists")
        
        # Create user with teacher role
        hashed_password = get_password_hash(teacher_data['password'])
        db_user = User(
            email=teacher_data['email'],
            password_hash=hashed_password,
            full_name=teacher_data['full_name'],
            role=UserRole.TEACHER,
            is_active=teacher_data.get('is_active', True)
        )
        
        self.db.add(db_user)
        self.db.flush()  # Get the user ID
        
        # Create teacher profile
        teacher_profile = Teacher(
            id=uuid.uuid4(),
            user_id=db_user.id,
            employee_id=teacher_data.get('employee_id'),
            subjects=teacher_data['subjects'],
            grade_levels=teacher_data['grade_levels'],
            department=teacher_data.get('department'),
            phone=teacher_data.get('phone'),
            bio=teacher_data.get('bio'),
            is_active=True
        )
        
        self.db.add(teacher_profile)
        
        # Add default permissions
        default_permissions = [
            ('assessment', 'write'),
            ('analytics', 'read'),
            ('communication', 'write'),
            ('student_roster', 'read')
        ]
        
        for permission_type, permission_level in default_permissions:
            permission = TeacherPermission(
                id=uuid.uuid4(),
                teacher_id=teacher_profile.id,
                permission_type=permission_type,
                permission_level=permission_level,
                granted_by=str(db_user.id),  # Self-granted for initial setup
                granted_at=datetime.utcnow()
            )
            self.db.add(permission)
        
        self.db.commit()
        self.db.refresh(db_user)
        return db_user
    
    def get_teacher_profile(self, user_id: str) -> Optional[Teacher]:
        """Get teacher profile by user ID"""
        return self.db.query(Teacher).filter(
            Teacher.user_id == user_id,
            Teacher.is_active == True
        ).first()
    
    def authenticate_teacher(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate teacher and return user + teacher profile"""
        user = self.authenticate_user(email, password)
        if not user or user.role != UserRole.TEACHER:
            return None
        
        teacher_profile = self.get_teacher_profile(str(user.id))
        if not teacher_profile or not teacher_profile.is_active:
            return None
        
        return {
            'user': user,
            'teacher_profile': teacher_profile
        }
    
    def create_teacher_session(self, user: User, teacher_profile: Teacher) -> str:
        """Create teacher session with enhanced JWT claims"""
        access_token_expires = timedelta(minutes=60 * 24 * 8)  # 8 days
        
        # Get teacher permissions
        permissions = self.get_teacher_permissions(teacher_profile.id)
        
        # Create JWT with teacher-specific claims
        teacher_claims = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "teacher_id": str(teacher_profile.id),
            "employee_id": teacher_profile.employee_id,
            "subjects": teacher_profile.subjects,
            "grade_levels": teacher_profile.grade_levels,
            "department": teacher_profile.department,
            "permissions": permissions,
            "exp": datetime.utcnow() + access_token_expires,
            "iat": datetime.utcnow().timestamp()
        }
        
        access_token = create_access_token(
            subject=str(user.id), 
            expires_delta=access_token_expires
        )
        
        # Store enhanced session data in Redis
        session_data = {
            "user_id": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "teacher_id": str(teacher_profile.id),
            "employee_id": teacher_profile.employee_id,
            "subjects": teacher_profile.subjects,
            "grade_levels": teacher_profile.grade_levels,
            "department": teacher_profile.department,
            "permissions": permissions,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Store session in Redis
        if redis_client.client:
            try:
                # Note: This is a sync method calling async Redis
                # In production, this should be properly handled with async/await
                redis_key = f"teacher_session:{access_token}"
                redis_client.client.setex(
                    redis_key,
                    60 * 60 * 24 * 8,  # 8 days in seconds
                    json.dumps(session_data, default=str)
                )
            except Exception as e:
                # Log but don't fail if Redis is unavailable
                print(f"Redis teacher session storage failed: {e}")
        
        return access_token
    
    def get_teacher_permissions(self, teacher_id: uuid.UUID) -> List[str]:
        """Get list of permissions for a teacher"""
        permissions = self.db.query(TeacherPermission).filter(
            TeacherPermission.teacher_id == teacher_id,
            TeacherPermission.is_active == True
        ).all()
        
        # Format permissions as "type:level" strings
        return [f"{perm.permission_type}:{perm.permission_level}" for perm in permissions]
    
    def has_permission(self, teacher_id: uuid.UUID, permission_type: str, permission_level: str = None) -> bool:
        """Check if teacher has a specific permission"""
        query = self.db.query(TeacherPermission).filter(
            TeacherPermission.teacher_id == teacher_id,
            TeacherPermission.permission_type == permission_type,
            TeacherPermission.is_active == True
        )
        
        if permission_level:
            query = query.filter(TeacherPermission.permission_level == permission_level)
        
        permission = query.first()
        return permission is not None
    
    def grant_permission(self, teacher_id: uuid.UUID, permission_type: str, permission_level: str, granted_by: str) -> bool:
        """Grant a permission to a teacher"""
        # Check if permission already exists
        existing = self.db.query(TeacherPermission).filter(
            TeacherPermission.teacher_id == teacher_id,
            TeacherPermission.permission_type == permission_type,
            TeacherPermission.permission_level == permission_level
        ).first()
        
        if existing:
            if not existing.is_active:
                existing.is_active = True
                existing.granted_by = granted_by
                existing.granted_at = datetime.utcnow()
                self.db.commit()
                return True
            return False  # Already has permission
        
        # Create new permission
        permission = TeacherPermission(
            id=uuid.uuid4(),
            teacher_id=teacher_id,
            permission_type=permission_type,
            permission_level=permission_level,
            granted_by=granted_by,
            granted_at=datetime.utcnow()
        )
        
        self.db.add(permission)
        self.db.commit()
        return True
    
    def revoke_permission(self, teacher_id: uuid.UUID, permission_type: str, permission_level: str = None) -> bool:
        """Revoke a permission from a teacher"""
        query = self.db.query(TeacherPermission).filter(
            TeacherPermission.teacher_id == teacher_id,
            TeacherPermission.permission_type == permission_type,
            TeacherPermission.is_active == True
        )
        
        if permission_level:
            query = query.filter(TeacherPermission.permission_level == permission_level)
        
        permission = query.first()
        
        if permission:
            permission.is_active = False
            self.db.commit()
            return True
        
        return False
    
    def update_teacher_profile(self, teacher_id: uuid.UUID, update_data: Dict[str, Any]) -> Optional[Teacher]:
        """Update teacher profile information"""
        teacher = self.db.query(Teacher).filter(Teacher.id == teacher_id).first()
        if not teacher:
            return None
        
        # Update allowed fields
        allowed_fields = [
            'employee_id', 'subjects', 'grade_levels', 'department', 
            'phone', 'bio', 'qualification', 'experience_years'
        ]
        
        for field, value in update_data.items():
            if field in allowed_fields:
                setattr(teacher, field, value)
        
        teacher.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(teacher)
        return teacher
    
    def get_teacher_session(self, token: str) -> Optional[Dict[str, Any]]:
        """Get teacher session data from Redis"""
        try:
            if redis_client.client:
                redis_key = f"teacher_session:{token}"
                session_data = redis_client.client.get(redis_key)
                if session_data:
                    return json.loads(session_data)
        except Exception as e:
            print(f"Redis teacher session retrieval failed: {e}")
        return None
    
    def invalidate_teacher_session(self, token: str) -> bool:
        """Invalidate teacher session"""
        try:
            if redis_client.client:
                redis_key = f"teacher_session:{token}"
                redis_client.client.delete(redis_key)
                return True
        except Exception as e:
            print(f"Redis teacher session invalidation failed: {e}")
        return False
    
    def validate_teacher_access(self, user_id: str, required_permissions: List[str] = None) -> Dict[str, Any]:
        """Validate teacher access and return validation result"""
        user = self.get_user_by_id(user_id)
        if not user or user.role != UserRole.TEACHER or not user.is_active:
            return {
                'valid': False,
                'reason': 'Invalid user or not a teacher'
            }
        
        teacher_profile = self.get_teacher_profile(user_id)
        if not teacher_profile or not teacher_profile.is_active:
            return {
                'valid': False,
                'reason': 'Teacher profile not found or inactive'
            }
        
        # Check required permissions
        if required_permissions:
            user_permissions = self.get_teacher_permissions(teacher_profile.id)
            missing_permissions = [perm for perm in required_permissions if perm not in user_permissions]
            
            if missing_permissions:
                return {
                    'valid': False,
                    'reason': f'Missing permissions: {", ".join(missing_permissions)}',
                    'missing_permissions': missing_permissions
                }
        
        return {
            'valid': True,
            'user': user,
            'teacher_profile': teacher_profile,
            'permissions': self.get_teacher_permissions(teacher_profile.id)
        }