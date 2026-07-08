"""
Teacher Authentication API Endpoints
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.deps import get_db
from app.services.teacher_auth_service import TeacherAuthService
from app.schemas.teacher import (
    TeacherCreate, TeacherLogin, TeacherUpdate, TeacherAuthResponse,
    TeacherResponse, TeacherProfileResponse, TeacherPermissionCreate,
    TeacherPermissionResponse, TeacherAccessValidation
)
from app.core.security import verify_token
from app.models.user import User, UserRole
from app.models.teacher import Teacher
import uuid

router = APIRouter()
security = HTTPBearer()


def get_current_teacher(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get current authenticated teacher"""
    token = credentials.credentials
    user_id = verify_token(token)
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )
    
    auth_service = TeacherAuthService(db)
    validation = auth_service.validate_teacher_access(user_id)
    
    if not validation['valid']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=validation['reason']
        )
    
    return validation


@router.post("/register", response_model=TeacherAuthResponse)
async def register_teacher(
    teacher_data: TeacherCreate,
    db: Session = Depends(get_db)
):
    """Register a new teacher account"""
    try:
        auth_service = TeacherAuthService(db)
        
        # Create teacher user
        user = auth_service.create_teacher_user(teacher_data.dict())
        
        # Get teacher profile
        teacher_profile = auth_service.get_teacher_profile(str(user.id))
        if not teacher_profile:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create teacher profile"
            )
        
        # Create session token
        access_token = auth_service.create_teacher_session(user, teacher_profile)
        
        # Get permissions
        permissions = auth_service.get_teacher_permissions(teacher_profile.id)
        
        # Build response
        teacher_response = TeacherResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role.value,
            is_active=user.is_active,
            created_at=user.created_at,
            last_login=user.last_login,
            teacher_profile=TeacherProfileResponse.from_orm(teacher_profile),
            permissions=permissions
        )
        
        return TeacherAuthResponse(
            access_token=access_token,
            user=teacher_response
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@router.post("/login", response_model=TeacherAuthResponse)
async def login_teacher(
    login_data: TeacherLogin,
    db: Session = Depends(get_db)
):
    """Authenticate teacher login"""
    try:
        auth_service = TeacherAuthService(db)
        
        # Authenticate teacher
        auth_result = auth_service.authenticate_teacher(
            login_data.email, 
            login_data.password
        )
        
        if not auth_result:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        user = auth_result['user']
        teacher_profile = auth_result['teacher_profile']
        
        # Create session token
        access_token = auth_service.create_teacher_session(user, teacher_profile)
        
        # Get permissions
        permissions = auth_service.get_teacher_permissions(teacher_profile.id)
        
        # Build response
        teacher_response = TeacherResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role.value,
            is_active=user.is_active,
            created_at=user.created_at,
            last_login=user.last_login,
            teacher_profile=TeacherProfileResponse.from_orm(teacher_profile),
            permissions=permissions
        )
        
        return TeacherAuthResponse(
            access_token=access_token,
            user=teacher_response
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )


@router.get("/profile", response_model=TeacherResponse)
async def get_teacher_profile(
    current_teacher: Dict[str, Any] = Depends(get_current_teacher)
):
    """Get current teacher's profile"""
    user = current_teacher['user']
    teacher_profile = current_teacher['teacher_profile']
    permissions = current_teacher['permissions']
    
    return TeacherResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login,
        teacher_profile=TeacherProfileResponse.from_orm(teacher_profile),
        permissions=permissions
    )


@router.put("/profile", response_model=TeacherProfileResponse)
async def update_teacher_profile(
    update_data: TeacherUpdate,
    current_teacher: Dict[str, Any] = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Update teacher profile"""
    try:
        auth_service = TeacherAuthService(db)
        teacher_profile = current_teacher['teacher_profile']
        
        updated_profile = auth_service.update_teacher_profile(
            teacher_profile.id,
            update_data.dict(exclude_unset=True)
        )
        
        if not updated_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher profile not found"
            )
        
        return TeacherProfileResponse.from_orm(updated_profile)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Profile update failed: {str(e)}"
        )


@router.post("/logout")
async def logout_teacher(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Logout teacher and invalidate session"""
    try:
        token = credentials.credentials
        auth_service = TeacherAuthService(db)
        
        # Invalidate session
        success = auth_service.invalidate_teacher_session(token)
        
        return {
            "message": "Logged out successfully",
            "session_invalidated": success
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Logout failed: {str(e)}"
        )


@router.get("/permissions", response_model=list[str])
async def get_teacher_permissions(
    current_teacher: Dict[str, Any] = Depends(get_current_teacher)
):
    """Get current teacher's permissions"""
    return current_teacher['permissions']


@router.post("/permissions/grant")
async def grant_teacher_permission(
    permission_data: TeacherPermissionCreate,
    current_teacher: Dict[str, Any] = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Grant permission to a teacher (admin only)"""
    # Check if current teacher has admin permissions
    if 'admin_permissions' not in current_teacher['permissions']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to grant permissions"
        )
    
    try:
        auth_service = TeacherAuthService(db)
        
        success = auth_service.grant_permission(
            permission_data.teacher_id,
            permission_data.permission_name,
            permission_data.granted_by
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Permission already exists or could not be granted"
            )
        
        return {"message": "Permission granted successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Permission grant failed: {str(e)}"
        )


@router.delete("/permissions/{permission_name}")
async def revoke_teacher_permission(
    permission_name: str,
    teacher_id: uuid.UUID,
    current_teacher: Dict[str, Any] = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Revoke permission from a teacher (admin only)"""
    # Check if current teacher has admin permissions
    if 'admin_permissions' not in current_teacher['permissions']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to revoke permissions"
        )
    
    try:
        auth_service = TeacherAuthService(db)
        
        success = auth_service.revoke_permission(teacher_id, permission_name)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Permission not found or already revoked"
            )
        
        return {"message": "Permission revoked successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Permission revocation failed: {str(e)}"
        )


@router.get("/validate-access", response_model=TeacherAccessValidation)
async def validate_teacher_access(
    required_permissions: str = None,  # Comma-separated list
    current_teacher: Dict[str, Any] = Depends(get_current_teacher)
):
    """Validate teacher access and permissions"""
    permissions_list = []
    if required_permissions:
        permissions_list = [p.strip() for p in required_permissions.split(',')]
    
    # Check if teacher has all required permissions
    user_permissions = current_teacher['permissions']
    missing_permissions = [p for p in permissions_list if p not in user_permissions]
    
    if missing_permissions:
        return TeacherAccessValidation(
            valid=False,
            reason=f"Missing permissions: {', '.join(missing_permissions)}",
            missing_permissions=missing_permissions
        )
    
    return TeacherAccessValidation(
        valid=True,
        permissions=user_permissions
    )