from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import redis
from app.core.deps import get_db, get_current_user, security
from app.services.auth_service import AuthService
from app.schemas.user import UserCreate, UserLogin, Token, User, UserUpdate
from app.models.user import User as UserModel

router = APIRouter()

# Rate limiting setup
limiter = Limiter(key_func=get_remote_address)
# Note: Rate limiter state and exception handlers are set up at the app level in main.py


@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register(
    user_create: UserCreate,
    db: Session = Depends(get_db)
) -> Any:
    """Register a new user"""
    auth_service = AuthService(db)
    
    try:
        user = auth_service.create_user(user_create)
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login(
    request: Request,
    user_login: UserLogin,
    db: Session = Depends(get_db)
) -> Any:
    """Login user and return access token"""
    auth_service = AuthService(db)
    
    try:
        user = auth_service.authenticate_user(user_login.email, user_login.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token = auth_service.create_session(user)
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        print(f"Login error details: {type(e).__name__}: {str(e)}")  # More detailed logging
        import traceback
        traceback.print_exc()  # Print full traceback
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed due to server error: {str(e)}"
        )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Any:
    """Refresh access token"""
    auth_service = AuthService(db)
    
    new_token = auth_service.refresh_session(credentials.credentials)
    if not new_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return {"access_token": new_token, "token_type": "bearer"}


@router.post("/logout")
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Any:
    """Logout user and invalidate session"""
    auth_service = AuthService(db)
    
    success = auth_service.invalidate_session(credentials.credentials)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not logout"
        )
    
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=User)
async def read_users_me(
    current_user: UserModel = Depends(get_current_user)
) -> Any:
    """Get current user information"""
    return current_user


@router.put("/me", response_model=User)
async def update_user_me(
    user_update: UserUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Update current user information"""
    auth_service = AuthService(db)
    
    updated_user = auth_service.update_user(str(current_user.id), user_update)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not update user"
        )
    
    return updated_user


@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(
    request: Request,
    email: str,
    db: Session = Depends(get_db)
) -> Any:
    """Request password reset (placeholder for now)"""
    # TODO: Implement email sending and password reset token generation
    auth_service = AuthService(db)
    user = auth_service.get_user_by_email(email)
    
    # Always return success to prevent email enumeration
    return {"message": "If the email exists, a password reset link has been sent"}


@router.post("/reset-password")
async def reset_password(
    token: str,
    new_password: str,
    db: Session = Depends(get_db)
) -> Any:
    """Reset password with token (placeholder for now)"""
    # TODO: Implement password reset token validation and password update
    return {"message": "Password reset functionality to be implemented"}