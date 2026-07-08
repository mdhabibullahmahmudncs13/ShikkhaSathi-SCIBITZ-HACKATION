from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid

from app.core.deps import get_db, get_current_user
from app.models.user import User, UserRole
from app.services.parent_service import ParentService

router = APIRouter()


@router.get("/dashboard")
def get_parent_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get parent dashboard data including children progress and notifications"""
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Access denied. Parent role required.")
    
    parent_service = ParentService(db)
    dashboard_data = parent_service.get_parent_dashboard_data(str(current_user.id))
    
    return {
        "success": True,
        "data": dashboard_data
    }


@router.get("/children")
def get_children_list(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get list of children for the parent"""
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Access denied. Parent role required.")
    
    parent_service = ParentService(db)
    dashboard_data = parent_service.get_parent_dashboard_data(str(current_user.id))
    
    return {
        "success": True,
        "data": {
            "children": dashboard_data["children"]
        }
    }


@router.get("/child/{child_id}/analytics")
def get_child_analytics(
    child_id: str,
    time_range_days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get detailed analytics for a specific child"""
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Access denied. Parent role required.")
    
    # Validate child_id format
    try:
        uuid.UUID(child_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid child ID format")
    
    # In a real implementation, verify that the child belongs to this parent
    child = db.query(User).filter(
        User.id == child_id,
        User.role == UserRole.STUDENT,
        User.is_active == True
    ).first()
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    parent_service = ParentService(db)
    analytics = parent_service.get_child_analytics(child_id, time_range_days)
    
    return {
        "success": True,
        "data": analytics
    }


@router.get("/notifications")
def get_parent_notifications(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get parent notifications with pagination"""
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Access denied. Parent role required.")
    
    parent_service = ParentService(db)
    dashboard_data = parent_service.get_parent_dashboard_data(str(current_user.id))
    
    notifications = dashboard_data["notifications"]
    
    # Filter unread if requested
    if unread_only:
        notifications = [n for n in notifications if not n.get("read", False)]
    
    # Apply pagination
    total = len(notifications)
    paginated_notifications = notifications[offset:offset + limit]
    
    return {
        "success": True,
        "data": {
            "notifications": paginated_notifications,
            "total": total,
            "limit": limit,
            "offset": offset,
            "hasMore": offset + limit < total
        }
    }


@router.post("/notifications/{notification_id}/mark-read")
def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Mark a notification as read"""
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Access denied. Parent role required.")
    
    parent_service = ParentService(db)
    success = parent_service.mark_notification_as_read(str(current_user.id), notification_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {
        "success": True,
        "message": "Notification marked as read"
    }


@router.get("/notification-preferences")
def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get parent notification preferences"""
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Access denied. Parent role required.")
    
    parent_service = ParentService(db)
    dashboard_data = parent_service.get_parent_dashboard_data(str(current_user.id))
    
    return {
        "success": True,
        "data": dashboard_data["notificationPreferences"]
    }


@router.put("/notification-preferences")
def update_notification_preferences(
    preferences: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Update parent notification preferences"""
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Access denied. Parent role required.")
    
    # Validate preferences structure
    required_fields = [
        "achievements", "weeklyReports", "performanceAlerts", 
        "streakMilestones", "teacherMessages", "emailNotifications", 
        "smsNotifications", "frequency"
    ]
    
    for field in required_fields:
        if field not in preferences:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
    
    # Validate frequency value
    if preferences["frequency"] not in ["immediate", "daily", "weekly"]:
        raise HTTPException(status_code=400, detail="Invalid frequency value")
    
    # Validate quiet hours if provided
    if "quietHours" in preferences:
        quiet_hours = preferences["quietHours"]
        if not isinstance(quiet_hours, dict) or "enabled" not in quiet_hours:
            raise HTTPException(status_code=400, detail="Invalid quietHours format")
        
        if quiet_hours["enabled"]:
            if "startTime" not in quiet_hours or "endTime" not in quiet_hours:
                raise HTTPException(status_code=400, detail="startTime and endTime required when quiet hours enabled")
    
    parent_service = ParentService(db)
    updated_preferences = parent_service.update_notification_preferences(
        str(current_user.id), 
        preferences
    )
    
    return {
        "success": True,
        "data": updated_preferences,
        "message": "Notification preferences updated successfully"
    }


@router.get("/child/{child_id}/progress")
def get_child_progress(
    child_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get detailed progress for a specific child"""
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Access denied. Parent role required.")
    
    # Validate child_id format
    try:
        uuid.UUID(child_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid child ID format")
    
    # In a real implementation, verify that the child belongs to this parent
    child = db.query(User).filter(
        User.id == child_id,
        User.role == UserRole.STUDENT,
        User.is_active == True
    ).first()
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    parent_service = ParentService(db)
    dashboard_data = parent_service.get_parent_dashboard_data(str(current_user.id))
    
    # Find the specific child's data
    child_data = None
    for child_info in dashboard_data["children"]:
        if child_info["id"] == child_id:
            child_data = child_info
            break
    
    if not child_data:
        raise HTTPException(status_code=404, detail="Child data not found")
    
    return {
        "success": True,
        "data": child_data
    }


@router.get("/weekly-reports")
def get_weekly_reports(
    child_id: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get weekly reports for children"""
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Access denied. Parent role required.")
    
    parent_service = ParentService(db)
    
    # Generate sample reports for demo
    reports = []
    if child_id:
        # Validate child_id format
        try:
            uuid.UUID(child_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid child ID format")
        
        # Generate report for specific child
        week_start = datetime.now() - timedelta(days=7)
        try:
            report = parent_service.generate_weekly_report(child_id, week_start)
            reports = [report]
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))
    else:
        # Generate reports for all children
        reports = parent_service.send_weekly_reports(str(current_user.id))
    
    # Apply pagination
    total = len(reports)
    paginated_reports = reports[offset:offset + limit]
    
    return {
        "success": True,
        "data": {
            "reports": paginated_reports,
            "total": total,
            "limit": limit,
            "offset": offset,
            "hasMore": offset + limit < total
        }
    }


@router.post("/child/{child_id}/weekly-report")
def generate_weekly_report(
    child_id: str,
    week_start: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Generate a weekly report for a specific child"""
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Access denied. Parent role required.")
    
    # Validate child_id format
    try:
        uuid.UUID(child_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid child ID format")
    
    # In a real implementation, verify that the child belongs to this parent
    child = db.query(User).filter(
        User.id == child_id,
        User.role == UserRole.STUDENT,
        User.is_active == True
    ).first()
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    if not week_start:
        # Default to start of current week
        today = datetime.now().date()
        week_start = datetime.combine(
            today - timedelta(days=today.weekday()), 
            datetime.min.time()
        )
    
    parent_service = ParentService(db)
    
    try:
        report = parent_service.generate_weekly_report(child_id, week_start)
        
        # Create notification for the generated report
        parent_service.create_weekly_report_notification(
            str(current_user.id),
            child_id,
            child.full_name,
            report['id']
        )
        
        return {
            "success": True,
            "message": "Weekly report generated successfully",
            "data": report
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


@router.post("/notifications/achievement")
def create_achievement_notification(
    notification_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Create an achievement notification for parent"""
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Access denied. Parent role required.")
    
    # Validate required fields
    required_fields = ['childId', 'childName', 'achievement']
    for field in required_fields:
        if field not in notification_data:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
    
    parent_service = ParentService(db)
    
    try:
        notification = parent_service.create_achievement_notification(
            str(current_user.id),
            notification_data['childId'],
            notification_data['childName'],
            notification_data['achievement']
        )
        
        return {
            "success": True,
            "data": notification,
            "message": "Achievement notification created successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create notification: {str(e)}")


@router.post("/notifications/performance-alert")
def create_performance_alert(
    alert_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Create a performance alert notification for parent"""
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Access denied. Parent role required.")
    
    # Validate required fields
    required_fields = ['childId', 'childName', 'alertType', 'details']
    for field in required_fields:
        if field not in alert_data:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
    
    parent_service = ParentService(db)
    
    try:
        notification = parent_service.create_performance_alert(
            str(current_user.id),
            alert_data['childId'],
            alert_data['childName'],
            alert_data['alertType'],
            alert_data['details']
        )
        
        return {
            "success": True,
            "data": notification,
            "message": "Performance alert created successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create alert: {str(e)}")


@router.post("/notifications/streak-milestone")
def create_streak_milestone_notification(
    milestone_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Create a streak milestone notification for parent"""
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Access denied. Parent role required.")
    
    # Validate required fields
    required_fields = ['childId', 'childName', 'streakDays']
    for field in required_fields:
        if field not in milestone_data:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
    
    parent_service = ParentService(db)
    
    try:
        notification = parent_service.create_streak_milestone_notification(
            str(current_user.id),
            milestone_data['childId'],
            milestone_data['childName'],
            milestone_data['streakDays']
        )
        
        return {
            "success": True,
            "data": notification,
            "message": "Streak milestone notification created successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create notification: {str(e)}")


@router.post("/send-weekly-reports")
def send_weekly_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Generate and send weekly reports for all children"""
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Access denied. Parent role required.")
    
    parent_service = ParentService(db)
    
    try:
        reports = parent_service.send_weekly_reports(str(current_user.id))
        
        return {
            "success": True,
            "data": {
                "reports": reports,
                "count": len(reports)
            },
            "message": f"Generated and sent {len(reports)} weekly reports"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send weekly reports: {str(e)}")