"""
Teacher Analytics and Authentication API Endpoints
Provides comprehensive analytics, performance tracking, and authentication for teachers
"""

from typing import Any, List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, require_teacher
from app.models.user import User
from app.services.teacher_analytics_service import TeacherAnalyticsService
from app.services.teacher_auth_service import TeacherAuthService
from app.schemas.teacher import (
    TeacherCreate, TeacherLogin, TeacherUpdate, TeacherAuthResponse,
    TeacherResponse, TeacherProfileResponse, TeacherPermissionCreate,
    TeacherPermissionResponse, TeacherAccessValidation
)
from app.core.security import verify_token
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


# Authentication Endpoints

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


# Analytics Endpoints (existing functionality)


@router.get("/class-performance")
async def get_class_performance_metrics(
    class_id: Optional[str] = Query(None, description="Class ID to filter by"),
    time_range: str = Query("month", regex="^(week|month|quarter)$", description="Time range for analysis"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
) -> Any:
    """
    Get comprehensive class performance metrics
    
    **Validates: Requirements 6.1, 6.2, 6.3**
    """
    try:
        analytics_service = TeacherAnalyticsService(db)
        metrics = analytics_service.get_class_performance_metrics(
            teacher_id=str(current_user.id),
            class_id=class_id,
            time_range=time_range
        )
        return metrics
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get class performance metrics: {str(e)}"
        )


@router.get("/student-analytics/{student_id}")
async def get_student_analytics(
    student_id: str,
    time_range: str = Query("month", regex="^(week|month|quarter)$", description="Time range for analysis"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
) -> Any:
    """
    Get detailed analytics for a specific student
    
    **Validates: Requirements 6.1, 6.2, 6.3**
    """
    try:
        analytics_service = TeacherAnalyticsService(db)
        analytics = analytics_service.get_student_analytics(
            teacher_id=str(current_user.id),
            student_id=student_id,
            time_range=time_range
        )
        return analytics
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get student analytics: {str(e)}"
        )


@router.get("/at-risk-students")
async def get_at_risk_students(
    class_id: Optional[str] = Query(None, description="Class ID to filter by"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
) -> Any:
    """
    Identify students who are at risk and need intervention
    
    **Validates: Requirements 6.2, 6.3**
    """
    try:
        analytics_service = TeacherAnalyticsService(db)
        at_risk_students = analytics_service.identify_at_risk_students(
            teacher_id=str(current_user.id),
            class_id=class_id
        )
        return {"at_risk_students": at_risk_students}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to identify at-risk students: {str(e)}"
        )


@router.get("/comparative-analysis")
async def get_comparative_analysis(
    class_ids: List[str] = Query(..., description="List of class IDs to compare"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
) -> Any:
    """
    Get comparative analysis across multiple classes
    
    **Validates: Requirements 6.1, 6.3**
    """
    try:
        analytics_service = TeacherAnalyticsService(db)
        analysis = analytics_service.get_comparative_analysis(
            teacher_id=str(current_user.id),
            class_ids=class_ids
        )
        return analysis
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get comparative analysis: {str(e)}"
        )


@router.get("/weakness-patterns")
async def get_weakness_patterns(
    class_id: Optional[str] = Query(None, description="Class ID to filter by"),
    time_range: str = Query("month", regex="^(week|month|quarter)$", description="Time range for analysis"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
) -> Any:
    """
    Get identified weakness patterns for intervention planning
    
    **Validates: Requirements 6.2, 6.3**
    """
    try:
        analytics_service = TeacherAnalyticsService(db)
        metrics = analytics_service.get_class_performance_metrics(
            teacher_id=str(current_user.id),
            class_id=class_id,
            time_range=time_range
        )
        return {"weakness_patterns": metrics["weaknessPatterns"]}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get weakness patterns: {str(e)}"
        )


@router.get("/engagement-metrics")
async def get_engagement_metrics(
    class_id: Optional[str] = Query(None, description="Class ID to filter by"),
    time_range: str = Query("month", regex="^(week|month|quarter)$", description="Time range for analysis"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
) -> Any:
    """
    Get detailed engagement metrics and time tracking
    
    **Validates: Requirements 6.1, 6.2**
    """
    try:
        analytics_service = TeacherAnalyticsService(db)
        metrics = analytics_service.get_class_performance_metrics(
            teacher_id=str(current_user.id),
            class_id=class_id,
            time_range=time_range
        )
        return {
            "engagement_metrics": metrics["engagementMetrics"],
            "time_analytics": metrics["timeAnalytics"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get engagement metrics: {str(e)}"
        )


@router.get("/performance-trends")
async def get_performance_trends(
    class_id: Optional[str] = Query(None, description="Class ID to filter by"),
    subject: Optional[str] = Query(None, description="Subject to filter by"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
) -> Any:
    """
    Get performance trends over time for analysis
    
    **Validates: Requirements 6.1, 6.3**
    """
    try:
        analytics_service = TeacherAnalyticsService(db)
        
        # Get metrics for different time ranges to show trends
        week_metrics = analytics_service.get_class_performance_metrics(
            teacher_id=str(current_user.id),
            class_id=class_id,
            time_range="week"
        )
        
        month_metrics = analytics_service.get_class_performance_metrics(
            teacher_id=str(current_user.id),
            class_id=class_id,
            time_range="month"
        )
        
        quarter_metrics = analytics_service.get_class_performance_metrics(
            teacher_id=str(current_user.id),
            class_id=class_id,
            time_range="quarter"
        )
        
        # Filter by subject if specified
        if subject:
            week_subject = [s for s in week_metrics["subjectPerformance"] if s["subject"] == subject]
            month_subject = [s for s in month_metrics["subjectPerformance"] if s["subject"] == subject]
            quarter_subject = [s for s in quarter_metrics["subjectPerformance"] if s["subject"] == subject]
            
            return {
                "subject": subject,
                "trends": {
                    "week": week_subject[0] if week_subject else None,
                    "month": month_subject[0] if month_subject else None,
                    "quarter": quarter_subject[0] if quarter_subject else None
                }
            }
        
        return {
            "trends": {
                "week": {
                    "averageScore": week_metrics["averageScore"],
                    "completionRate": week_metrics["completionRate"],
                    "engagementRate": week_metrics["engagementMetrics"]["dailyActiveUsers"]
                },
                "month": {
                    "averageScore": month_metrics["averageScore"],
                    "completionRate": month_metrics["completionRate"],
                    "engagementRate": month_metrics["engagementMetrics"]["dailyActiveUsers"]
                },
                "quarter": {
                    "averageScore": quarter_metrics["averageScore"],
                    "completionRate": quarter_metrics["completionRate"],
                    "engagementRate": quarter_metrics["engagementMetrics"]["dailyActiveUsers"]
                }
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get performance trends: {str(e)}"
        )


@router.get("/intervention-recommendations/{student_id}")
async def get_intervention_recommendations(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
) -> Any:
    """
    Get personalized intervention recommendations for a student
    
    **Validates: Requirements 6.2, 6.3**
    """
    try:
        analytics_service = TeacherAnalyticsService(db)
        analytics = analytics_service.get_student_analytics(
            teacher_id=str(current_user.id),
            student_id=student_id,
            time_range="month"
        )
        return {"recommendations": analytics["interventionRecommendations"]}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get intervention recommendations: {str(e)}"
        )


@router.get("/bloom-level-analysis")
async def get_bloom_level_analysis(
    class_id: Optional[str] = Query(None, description="Class ID to filter by"),
    subject: Optional[str] = Query(None, description="Subject to filter by"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
) -> Any:
    """
    Get Bloom's taxonomy level analysis for the class
    
    **Validates: Requirements 6.1, 6.3**
    """
    try:
        analytics_service = TeacherAnalyticsService(db)
        metrics = analytics_service.get_class_performance_metrics(
            teacher_id=str(current_user.id),
            class_id=class_id,
            time_range="month"
        )
        
        # Extract Bloom level data
        bloom_analysis = {}
        for subject_perf in metrics["subjectPerformance"]:
            if subject is None or subject_perf["subject"] == subject:
                bloom_analysis[subject_perf["subject"]] = subject_perf["bloomLevelDistribution"]
        
        return {"bloom_level_analysis": bloom_analysis}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get Bloom level analysis: {str(e)}"
        )


@router.get("/detailed-engagement-analysis")
async def get_detailed_engagement_analysis(
    class_id: Optional[str] = Query(None, description="Class ID to filter by"),
    time_range: str = Query("month", regex="^(week|month|quarter)$", description="Time range for analysis"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
) -> Any:
    """
    Get detailed engagement analysis with advanced metrics
    
    **Validates: Requirements 6.1, 6.2, 6.3**
    """
    try:
        analytics_service = TeacherAnalyticsService(db)
        analysis = analytics_service.get_detailed_engagement_analysis(
            teacher_id=str(current_user.id),
            class_id=class_id,
            time_range=time_range
        )
        return analysis
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get detailed engagement analysis: {str(e)}"
        )