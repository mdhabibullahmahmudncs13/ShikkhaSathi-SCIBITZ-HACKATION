"""
Admin Panel API endpoints
Comprehensive admin functionality for ShikkhaSathi platform
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc
from datetime import datetime, timedelta
import logging

from app.core import deps
from app.core.deps import get_current_admin_user
from app.models.user import User, UserRole, Medium
from app.models.student_progress import StudentProgress
from app.models.quiz_attempt import QuizAttempt
from app.models.gamification import Gamification
from app.services.content_ingestion_service import content_service
from app.schemas.admin import (
    AdminDashboardStats, UserListResponse, UserDetail, UserCreate, UserUpdate,
    ContentStats, SystemHealth, AdminSettings, BulkUserAction
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Dashboard & Analytics
@router.get("/dashboard", response_model=AdminDashboardStats)
def get_admin_dashboard(
    db: Session = Depends(deps.get_db),
    current_admin = Depends(get_current_admin_user)
):
    """Get comprehensive admin dashboard statistics"""
    try:
        # User statistics
        total_users = db.query(User).count()
        active_users = db.query(User).filter(User.is_active == True).count()
        students_count = db.query(User).filter(User.role == UserRole.STUDENT).count()
        teachers_count = db.query(User).filter(User.role == UserRole.TEACHER).count()
        parents_count = db.query(User).filter(User.role == UserRole.PARENT).count()
        
        # Recent registrations (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_registrations = db.query(User).filter(
            User.created_at >= thirty_days_ago
        ).count()
        
        # Learning statistics
        total_quiz_attempts = db.query(QuizAttempt).count()
        completed_quizzes = db.query(QuizAttempt).filter(
            QuizAttempt.is_completed == True
        ).count()
        
        # Content statistics
        textbooks = content_service.get_available_textbooks()
        total_textbooks = len(textbooks)
        
        # Calculate total learning modules
        total_modules = 0
        for filename in textbooks:
            textbook = content_service.parse_textbook_file(filename)
            if textbook:
                total_modules += len(textbook.chapters)
        
        # System health metrics
        db_status = "healthy"  # Could add actual DB health check
        
        # Top performing students (by XP)
        top_students = db.query(
            User.full_name,
            Gamification.total_xp
        ).join(Gamification).filter(
            User.role == UserRole.STUDENT
        ).order_by(desc(Gamification.total_xp)).limit(5).all()
        
        return AdminDashboardStats(
            total_users=total_users,
            active_users=active_users,
            students_count=students_count,
            teachers_count=teachers_count,
            parents_count=parents_count,
            recent_registrations=recent_registrations,
            total_quiz_attempts=total_quiz_attempts,
            completed_quizzes=completed_quizzes,
            total_textbooks=total_textbooks,
            total_learning_modules=total_modules,
            system_status=db_status,
            top_students=[
                {"name": name, "xp": xp} for name, xp in top_students
            ]
        )
        
    except Exception as e:
        logger.error(f"Error fetching admin dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard data")

# User Management
@router.get("/users", response_model=UserListResponse)
def get_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    role: Optional[UserRole] = Query(None),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: Session = Depends(deps.get_db),
    current_admin = Depends(get_current_admin_user)
):
    """Get paginated list of users with filtering and search"""
    try:
        query = db.query(User)
        
        # Apply filters
        if role:
            query = query.filter(User.role == role)
        if is_active is not None:
            query = query.filter(User.is_active == is_active)
        if search:
            query = query.filter(
                User.full_name.ilike(f"%{search}%") |
                User.email.ilike(f"%{search}%") |
                User.school.ilike(f"%{search}%")
            )
        
        # Apply sorting
        sort_column = getattr(User, sort_by, User.created_at)
        if sort_order == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * limit
        users = query.offset(offset).limit(limit).all()
        
        return UserListResponse(
            users=users,
            total=total,
            page=page,
            limit=limit,
            total_pages=(total + limit - 1) // limit
        )
        
    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch users")

@router.get("/users/{user_id}", response_model=UserDetail)
def get_user_detail(
    user_id: str,
    db: Session = Depends(deps.get_db),
    current_admin = Depends(get_current_admin_user)
):
    """Get detailed information about a specific user"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get user's progress and gamification data
        progress = db.query(StudentProgress).filter(
            StudentProgress.user_id == user_id
        ).all()
        
        gamification = db.query(Gamification).filter(
            Gamification.user_id == user_id
        ).first()
        
        quiz_attempts = db.query(QuizAttempt).filter(
            QuizAttempt.user_id == user_id
        ).count()
        
        return UserDetail(
            user=user,
            total_progress_entries=len(progress),
            total_xp=gamification.total_xp if gamification else 0,
            current_level=gamification.current_level if gamification else 1,
            quiz_attempts=quiz_attempts,
            last_activity=user.last_login
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user detail: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch user details")

@router.post("/users", response_model=Dict[str, Any])
def create_user(
    user_data: UserCreate,
    db: Session = Depends(deps.get_db),
    current_admin = Depends(get_current_admin_user)
):
    """Create a new user"""
    try:
        # Check if email already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create new user
        new_user = User(
            email=user_data.email,
            password_hash="temp_hash",  # In real app, hash the password
            full_name=user_data.full_name,
            phone=user_data.phone,
            date_of_birth=user_data.date_of_birth,
            school=user_data.school,
            district=user_data.district,
            grade=user_data.grade,
            medium=user_data.medium,
            role=user_data.role,
            is_active=user_data.is_active
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Initialize gamification for students
        if new_user.role == UserRole.STUDENT:
            gamification = Gamification(
                user_id=new_user.id,
                total_xp=0,
                current_level=1,
                current_streak=0
            )
            db.add(gamification)
            db.commit()
        
        return {
            "message": "User created successfully",
            "user_id": str(new_user.id)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create user")

@router.put("/users/{user_id}", response_model=Dict[str, Any])
def update_user(
    user_id: str,
    user_data: UserUpdate,
    db: Session = Depends(deps.get_db),
    current_admin = Depends(get_current_admin_user)
):
    """Update user information"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update user fields
        update_data = user_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        
        db.commit()
        db.refresh(user)
        
        return {"message": "User updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update user")

@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    db: Session = Depends(deps.get_db),
    current_admin = Depends(get_current_admin_user)
):
    """Delete a user (soft delete by deactivating)"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Soft delete by deactivating
        user.is_active = False
        db.commit()
        
        return {"message": "User deactivated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete user")

@router.post("/users/bulk-action")
def bulk_user_action(
    action_data: BulkUserAction,
    db: Session = Depends(deps.get_db),
    current_admin = Depends(get_current_admin_user)
):
    """Perform bulk actions on multiple users"""
    try:
        users = db.query(User).filter(User.id.in_(action_data.user_ids)).all()
        
        if len(users) != len(action_data.user_ids):
            raise HTTPException(status_code=400, detail="Some users not found")
        
        if action_data.action == "activate":
            for user in users:
                user.is_active = True
        elif action_data.action == "deactivate":
            for user in users:
                user.is_active = False
        elif action_data.action == "delete":
            for user in users:
                user.is_active = False  # Soft delete
        else:
            raise HTTPException(status_code=400, detail="Invalid action")
        
        db.commit()
        
        return {
            "message": f"Bulk {action_data.action} completed",
            "affected_users": len(users)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error performing bulk action: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to perform bulk action")

# Content Management
@router.get("/content/stats", response_model=ContentStats)
def get_content_stats(
    current_admin = Depends(get_current_admin_user)
):
    """Get content statistics"""
    try:
        textbooks = content_service.get_available_textbooks()
        
        content_stats = {
            "total_textbooks": len(textbooks),
            "subjects": {},
            "total_chapters": 0,
            "textbook_details": []
        }
        
        for filename in textbooks:
            textbook = content_service.parse_textbook_file(filename)
            if textbook:
                subject = textbook.subject
                chapters = len(textbook.chapters)
                
                content_stats["total_chapters"] += chapters
                
                if subject not in content_stats["subjects"]:
                    content_stats["subjects"][subject] = {
                        "textbooks": 0,
                        "chapters": 0
                    }
                
                content_stats["subjects"][subject]["textbooks"] += 1
                content_stats["subjects"][subject]["chapters"] += chapters
                
                content_stats["textbook_details"].append({
                    "filename": filename,
                    "subject": subject,
                    "grade": textbook.grade,
                    "chapters": chapters,
                    "total_pages": textbook.total_pages
                })
        
        return ContentStats(**content_stats)
        
    except Exception as e:
        logger.error(f"Error fetching content stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch content statistics")

# System Health & Settings
@router.get("/system/health", response_model=SystemHealth)
def get_system_health(
    db: Session = Depends(deps.get_db),
    current_admin = Depends(get_current_admin_user)
):
    """Get system health status"""
    try:
        # Database health check
        try:
            db.execute("SELECT 1")
            db_status = "healthy"
            db_response_time = "< 100ms"  # Mock value
        except:
            db_status = "unhealthy"
            db_response_time = "timeout"
        
        # Content service health
        try:
            textbooks = content_service.get_available_textbooks()
            content_status = "healthy" if textbooks else "warning"
        except:
            content_status = "unhealthy"
        
        return SystemHealth(
            database_status=db_status,
            database_response_time=db_response_time,
            content_service_status=content_status,
            total_textbooks=len(textbooks) if 'textbooks' in locals() else 0,
            system_uptime="24h 30m",  # Mock value
            memory_usage="45%",  # Mock value
            cpu_usage="12%"  # Mock value
        )
        
    except Exception as e:
        logger.error(f"Error checking system health: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to check system health")

# Analytics & Reports
@router.get("/analytics/user-growth")
def get_user_growth_analytics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(deps.get_db),
    current_admin = Depends(get_current_admin_user)
):
    """Get user growth analytics over time"""
    try:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get daily user registrations
        daily_registrations = db.query(
            func.date(User.created_at).label('date'),
            func.count(User.id).label('count')
        ).filter(
            User.created_at >= start_date
        ).group_by(
            func.date(User.created_at)
        ).order_by('date').all()
        
        # Get user role distribution
        role_distribution = db.query(
            User.role,
            func.count(User.id).label('count')
        ).group_by(User.role).all()
        
        return {
            "daily_registrations": [
                {"date": str(date), "count": count}
                for date, count in daily_registrations
            ],
            "role_distribution": [
                {"role": role.value, "count": count}
                for role, count in role_distribution
            ]
        }
        
    except Exception as e:
        logger.error(f"Error fetching user growth analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch analytics")

@router.get("/analytics/learning-activity")
def get_learning_activity_analytics(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(deps.get_db),
    current_admin = Depends(get_current_admin_user)
):
    """Get learning activity analytics"""
    try:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Quiz attempts over time
        quiz_activity = db.query(
            func.date(QuizAttempt.created_at).label('date'),
            func.count(QuizAttempt.id).label('attempts'),
            func.sum(func.cast(QuizAttempt.is_completed, Integer)).label('completed')
        ).filter(
            QuizAttempt.created_at >= start_date
        ).group_by(
            func.date(QuizAttempt.created_at)
        ).order_by('date').all()
        
        # Most active subjects (based on quiz attempts)
        subject_activity = db.query(
            QuizAttempt.subject,
            func.count(QuizAttempt.id).label('attempts')
        ).filter(
            QuizAttempt.created_at >= start_date
        ).group_by(
            QuizAttempt.subject
        ).order_by(desc('attempts')).limit(10).all()
        
        return {
            "quiz_activity": [
                {
                    "date": str(date),
                    "attempts": attempts,
                    "completed": completed or 0
                }
                for date, attempts, completed in quiz_activity
            ],
            "subject_activity": [
                {"subject": subject, "attempts": attempts}
                for subject, attempts in subject_activity
            ]
        }
        
    except Exception as e:
        logger.error(f"Error fetching learning activity analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch learning analytics")