from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user, require_teacher, require_parent
from app.services.auth_service import AuthService
from app.schemas.user import User, UserUpdate
from app.models.user import User as UserModel, UserRole

router = APIRouter()


@router.get("/me", response_model=User)
async def get_current_user_info(
    current_user: UserModel = Depends(get_current_user)
) -> Any:
    """Get current authenticated user information"""
    return current_user


@router.get("/students", response_model=List[User])
async def get_students(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_teacher)
) -> Any:
    """Get all students (teacher access only)"""
    students = db.query(UserModel).filter(UserModel.role == UserRole.STUDENT).all()
    return students


@router.get("/children", response_model=List[User])
async def get_children(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_parent)
) -> Any:
    """Get children for parent (placeholder - needs parent-child relationship)"""
    # TODO: Implement parent-child relationship in database
    return []


@router.put("/me", response_model=User)
async def update_current_user(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
) -> Any:
    """Update current authenticated user information"""
    auth_service = AuthService(db)
    
    try:
        updated_user = auth_service.update_user(str(current_user.id), user_update)
        return updated_user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{user_id}", response_model=User)
async def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
) -> Any:
    """Get user by ID (with role-based access control)"""
    auth_service = AuthService(db)
    user = auth_service.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Role-based access control
    if current_user.role == UserRole.STUDENT:
        # Students can only access their own profile
        if str(current_user.id) != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
    elif current_user.role == UserRole.TEACHER:
        # Teachers can access student profiles
        if user.role not in [UserRole.STUDENT, UserRole.TEACHER]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
    elif current_user.role == UserRole.PARENT:
        # Parents can access their children's profiles (TODO: implement relationship check)
        if user.role != UserRole.STUDENT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
    
    return user