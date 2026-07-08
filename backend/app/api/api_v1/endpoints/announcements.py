"""
Announcement and Notification API Endpoints

REST API endpoints for announcement creation, automated notifications,
progress reports, and weekly summaries.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.models.message import MessagePriority
from app.services.announcement_service import AnnouncementService, NotificationType
from app.schemas.message import MessageResponse

router = APIRouter()


# Request/Response Schemas
class AnnouncementCreate(BaseModel):
    """Schema for creating announcements"""
    title: str = Field(..., min_length=1, max_length=255, description="Announcement title")
    content: str = Field(..., min_length=1, description="Announcement content")
    target_classes: List[str] = Field(..., min_items=1, description="List of class IDs")
    priority: MessagePriority = Field(default=MessagePriority.NORMAL, description="Announcement priority")
    scheduled_at: Optional[datetime] = Field(None, description="Schedule announcement for later")
    include_parents: bool = Field(default=False, description="Include parents in announcement")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class ProgressReportRequest(BaseModel):
    """Schema for progress report generation"""
    student_id: str = Field(..., description="Student ID for report")
    report_period_days: int = Field(default=7, ge=1, le=30, description="Number of days to include")
    include_parents: bool = Field(default=True, description="Include parents in notification")


class ProgressReportResponse(BaseModel):
    """Schema for progress report response"""
    student_id: str
    student_name: str
    report_period: Dict[str, Any]
    metrics: Dict[str, Any]
    weak_areas: List[Dict[str, Any]]
    recommendations: List[str]
    generated_at: datetime


class PerformanceAlertRequest(BaseModel):
    """Schema for performance alert configuration"""
    class_ids: List[str] = Field(..., min_items=1, description="List of class IDs to monitor")
    performance_threshold: float = Field(default=70.0, ge=0, le=100, description="Score threshold for alerts")
    days_to_check: int = Field(default=7, ge=1, le=30, description="Number of days to analyze")


class WeeklySummaryResponse(BaseModel):
    """Schema for weekly summary response"""
    class_id: str
    class_name: str
    week_period: Dict[str, Any]
    metrics: Dict[str, Any]
    subject_performance: Dict[str, Any]
    top_performers: List[Dict[str, Any]]
    generated_at: datetime


class NotificationScheduleRequest(BaseModel):
    """Schema for scheduling automated notifications"""
    notification_type: NotificationType
    schedule_config: Dict[str, Any] = Field(..., description="Schedule configuration")
    target_classes: Optional[List[str]] = Field(None, description="Target classes for notifications")
    enabled: bool = Field(default=True, description="Whether the schedule is enabled")


class NotificationScheduleResponse(BaseModel):
    """Schema for notification schedule response"""
    teacher_id: str
    notification_type: NotificationType
    schedule_config: Dict[str, Any]
    scheduled_at: datetime
    status: str
    next_execution: Optional[datetime]


@router.post("/announcements", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    announcement_data: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new announcement for classes
    
    - **title**: Announcement title (required)
    - **content**: Announcement content (required)
    - **target_classes**: List of class IDs to send to
    - **priority**: Announcement priority (low, normal, high, urgent)
    - **scheduled_at**: Optional scheduled delivery time
    - **include_parents**: Whether to include parents
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can create announcements"
        )
    
    service = AnnouncementService(db)
    try:
        message = await service.create_announcement(
            teacher_id=current_user.id,
            title=announcement_data.title,
            content=announcement_data.content,
            target_classes=announcement_data.target_classes,
            priority=announcement_data.priority,
            scheduled_at=announcement_data.scheduled_at,
            include_parents=announcement_data.include_parents,
            metadata=announcement_data.metadata
        )
        
        # Convert to response format
        return await service.message_service.get_message(message.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/progress-reports/generate", response_model=ProgressReportResponse)
async def generate_progress_report(
    report_request: ProgressReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate a progress report for a student
    
    - **student_id**: ID of the student for the report
    - **report_period_days**: Number of days to include (1-30)
    - **include_parents**: Whether to include parents in notification
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can generate progress reports"
        )
    
    service = AnnouncementService(db)
    try:
        report_data = await service.generate_progress_report(
            teacher_id=current_user.id,
            student_id=report_request.student_id,
            report_period_days=report_request.report_period_days
        )
        
        return ProgressReportResponse(**report_data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/progress-reports/send", response_model=MessageResponse)
async def send_progress_notification(
    report_request: ProgressReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate and send a progress report notification
    
    - **student_id**: ID of the student for the report
    - **report_period_days**: Number of days to include (1-30)
    - **include_parents**: Whether to include parents in notification
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can send progress notifications"
        )
    
    service = AnnouncementService(db)
    try:
        # Generate report data
        report_data = await service.generate_progress_report(
            teacher_id=current_user.id,
            student_id=report_request.student_id,
            report_period_days=report_request.report_period_days
        )
        
        # Send notification
        message = await service.send_progress_notification(
            teacher_id=current_user.id,
            student_id=report_request.student_id,
            report_data=report_data,
            include_parents=report_request.include_parents
        )
        
        return await service.message_service.get_message(message.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/performance-alerts/check", response_model=List[MessageResponse])
async def check_performance_alerts(
    alert_request: PerformanceAlertRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check for performance issues and send alerts
    
    - **class_ids**: List of class IDs to monitor
    - **performance_threshold**: Score threshold for alerts (0-100)
    - **days_to_check**: Number of days to analyze (1-30)
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can check performance alerts"
        )
    
    service = AnnouncementService(db)
    try:
        alert_messages = await service.detect_and_alert_performance_issues(
            teacher_id=current_user.id,
            class_ids=alert_request.class_ids,
            performance_threshold=alert_request.performance_threshold,
            days_to_check=alert_request.days_to_check
        )
        
        # Convert to response format
        responses = []
        for message in alert_messages:
            response = await service.message_service.get_message(message.id)
            responses.append(response)
        
        return responses
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/weekly-summary/{class_id}", response_model=WeeklySummaryResponse)
async def get_weekly_summary(
    class_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate weekly summary for a class
    
    - **class_id**: ID of the class for the summary
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can access weekly summaries"
        )
    
    service = AnnouncementService(db)
    try:
        summary_data = await service.generate_weekly_summary(
            teacher_id=current_user.id,
            class_id=class_id
        )
        
        return WeeklySummaryResponse(**summary_data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/weekly-summary/{class_id}/send", response_model=MessageResponse)
async def send_weekly_summary(
    class_id: str,
    include_parents: bool = Query(default=False, description="Include parents in summary"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate and send weekly summary notification
    
    - **class_id**: ID of the class for the summary
    - **include_parents**: Whether to include parents in notification
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can send weekly summaries"
        )
    
    service = AnnouncementService(db)
    try:
        # Generate summary data
        summary_data = await service.generate_weekly_summary(
            teacher_id=current_user.id,
            class_id=class_id
        )
        
        # Send notification
        message = await service.send_weekly_summary_notification(
            teacher_id=current_user.id,
            summary_data=summary_data,
            include_parents=include_parents
        )
        
        return await service.message_service.get_message(message.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/notifications/schedule", response_model=NotificationScheduleResponse)
async def schedule_notifications(
    schedule_request: NotificationScheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Schedule automated notifications
    
    - **notification_type**: Type of notification to schedule
    - **schedule_config**: Configuration for the schedule (cron expression, frequency, etc.)
    - **target_classes**: Optional list of target classes
    - **enabled**: Whether the schedule is enabled
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can schedule notifications"
        )
    
    service = AnnouncementService(db)
    try:
        schedule_result = await service.schedule_automated_notifications(
            teacher_id=current_user.id,
            notification_type=schedule_request.notification_type,
            schedule_config=schedule_request.schedule_config
        )
        
        return NotificationScheduleResponse(**schedule_result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/notifications/types", response_model=List[Dict[str, str]])
async def get_notification_types():
    """
    Get available notification types
    
    Returns list of available automated notification types with descriptions
    """
    return [
        {
            "type": NotificationType.PROGRESS_REPORT,
            "name": "Progress Report",
            "description": "Automated progress reports for individual students"
        },
        {
            "type": NotificationType.PERFORMANCE_ALERT,
            "name": "Performance Alert",
            "description": "Alerts when student performance drops below threshold"
        },
        {
            "type": NotificationType.WEEKLY_SUMMARY,
            "name": "Weekly Summary",
            "description": "Weekly class performance summaries"
        },
        {
            "type": NotificationType.ACHIEVEMENT_NOTIFICATION,
            "name": "Achievement Notification",
            "description": "Notifications for student achievements and milestones"
        },
        {
            "type": NotificationType.ASSESSMENT_REMINDER,
            "name": "Assessment Reminder",
            "description": "Reminders for upcoming assessments and deadlines"
        },
        {
            "type": NotificationType.MILESTONE_COMPLETION,
            "name": "Milestone Completion",
            "description": "Notifications when students complete learning milestones"
        }
    ]


@router.get("/announcements/templates", response_model=List[Dict[str, Any]])
async def get_announcement_templates():
    """
    Get predefined announcement templates
    
    Returns list of common announcement templates for quick creation
    """
    return [
        {
            "id": "class_update",
            "name": "Class Update",
            "subject_template": "Important Update for {class_name}",
            "content_template": "Dear Students and Parents,\n\nI wanted to share an important update regarding {class_name}:\n\n{update_content}\n\nPlease let me know if you have any questions.\n\nBest regards,\n{teacher_name}",
            "variables": ["class_name", "update_content", "teacher_name"]
        },
        {
            "id": "assignment_reminder",
            "name": "Assignment Reminder",
            "subject_template": "Reminder: {assignment_name} Due {due_date}",
            "content_template": "This is a friendly reminder that {assignment_name} is due on {due_date}.\n\nAssignment Details:\n{assignment_details}\n\nPlease make sure to submit your work on time. If you need any help, don't hesitate to ask.\n\nGood luck!",
            "variables": ["assignment_name", "due_date", "assignment_details"]
        },
        {
            "id": "achievement_celebration",
            "name": "Achievement Celebration",
            "subject_template": "Celebrating Our Class Achievements!",
            "content_template": "I'm excited to share some wonderful achievements from our class:\n\n{achievements}\n\nKeep up the excellent work, everyone!\n\nProud of you all,\n{teacher_name}",
            "variables": ["achievements", "teacher_name"]
        },
        {
            "id": "parent_conference",
            "name": "Parent Conference",
            "subject_template": "Parent-Teacher Conference: {student_name}",
            "content_template": "Dear {parent_name},\n\nI would like to schedule a parent-teacher conference to discuss {student_name}'s progress.\n\nAvailable times:\n{available_times}\n\nPlease let me know which time works best for you.\n\nLooking forward to our conversation,\n{teacher_name}",
            "variables": ["parent_name", "student_name", "available_times", "teacher_name"]
        }
    ]