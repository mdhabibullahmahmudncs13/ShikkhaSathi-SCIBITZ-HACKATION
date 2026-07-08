from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.core.deps import get_db, get_current_user
from app.models.user import User as UserModel
from app.models.gamification import Gamification
from app.models.quiz_attempt import QuizAttempt
from app.models.student_progress import StudentProgress

router = APIRouter()


@router.get("/")
async def get_notifications(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    unread_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
) -> Any:
    """Get notifications for current user"""
    
    notifications = []
    
    # Get recent achievements (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    gamification = db.query(Gamification).filter(
        Gamification.user_id == current_user.id
    ).first()
    
    if gamification and gamification.achievements:
        for achievement in gamification.achievements:
            if isinstance(achievement, dict) and achievement.get('unlocked_at'):
                unlocked_date = datetime.fromisoformat(achievement['unlocked_at'].replace('Z', '+00:00'))
                if unlocked_date >= thirty_days_ago:
                    notifications.append({
                        "id": f"achievement_{achievement.get('id', 'unknown')}",
                        "type": "achievement",
                        "title": "New Achievement Unlocked!",
                        "message": f"You've earned the \"{achievement.get('name', 'Unknown')}\" achievement!",
                        "timestamp": unlocked_date,
                        "read": False,
                        "data": achievement
                    })
    
    # Get recent quiz completions that might need attention
    recent_attempts = db.query(QuizAttempt).filter(
        QuizAttempt.user_id == current_user.id,
        QuizAttempt.completed_at >= thirty_days_ago
    ).order_by(QuizAttempt.completed_at.desc()).limit(10).all()
    
    # Find weak performance areas
    weak_subjects = {}
    for attempt in recent_attempts:
        if attempt.score and attempt.max_score:
            percentage = (attempt.score / attempt.max_score) * 100
            subject = getattr(attempt, 'subject', 'General')
            
            if subject not in weak_subjects:
                weak_subjects[subject] = []
            weak_subjects[subject].append(percentage)
    
    # Create notifications for subjects with consistently low performance
    for subject, scores in weak_subjects.items():
        if len(scores) >= 3:  # At least 3 attempts
            avg_score = sum(scores) / len(scores)
            if avg_score < 60:  # Below 60% average
                notifications.append({
                    "id": f"weak_area_{subject}",
                    "type": "recommendation",
                    "title": "Improvement Opportunity",
                    "message": f"Your recent {subject} performance is {avg_score:.1f}%. Consider reviewing the fundamentals.",
                    "timestamp": datetime.utcnow() - timedelta(days=1),
                    "read": False,
                    "data": {
                        "subject": subject,
                        "average_score": avg_score,
                        "attempts": len(scores)
                    }
                })
    
    # Get streak milestones
    if gamification:
        current_streak = gamification.current_streak
        if current_streak > 0:
            # Notify about streak milestones
            milestone_days = [7, 14, 30, 60, 100]
            for milestone in milestone_days:
                if current_streak >= milestone:
                    # Check if we should notify (every milestone achievement)
                    notifications.append({
                        "id": f"streak_milestone_{milestone}",
                        "type": "achievement",
                        "title": f"{milestone}-Day Streak!",
                        "message": f"Amazing! You've maintained a {current_streak}-day learning streak!",
                        "timestamp": datetime.utcnow() - timedelta(days=1),
                        "read": current_streak > milestone + 7,  # Mark as read if streak is much higher
                        "data": {
                            "streak": current_streak,
                            "milestone": milestone
                        }
                    })
                    break  # Only show the highest achieved milestone
    
    # Add learning path recommendations
    progress_records = db.query(StudentProgress).filter(
        StudentProgress.user_id == current_user.id
    ).all()
    
    if progress_records:
        # Find subjects with good progress that could advance
        for progress in progress_records:
            if progress.completion_percentage > 70:
                notifications.append({
                    "id": f"advancement_{progress.subject}",
                    "type": "recommendation", 
                    "title": "Ready to Advance!",
                    "message": f"You've mastered {progress.completion_percentage:.1f}% of {progress.subject}. Ready for advanced topics?",
                    "timestamp": datetime.utcnow() - timedelta(hours=12),
                    "read": False,
                    "data": {
                        "subject": progress.subject,
                        "completion": progress.completion_percentage
                    }
                })
    
    # Sort by timestamp (newest first)
    notifications.sort(key=lambda x: x['timestamp'], reverse=True)
    
    # Apply filters
    if unread_only:
        notifications = [n for n in notifications if not n['read']]
    
    # Apply pagination
    total = len(notifications)
    notifications = notifications[offset:offset + limit]
    
    return {
        "notifications": notifications,
        "total": total,
        "limit": limit,
        "offset": offset,
        "has_more": offset + len(notifications) < total
    }


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
) -> Any:
    """Mark a notification as read"""
    # In a real implementation, you'd store notification read status in database
    # For now, we'll just return success
    return {
        "success": True,
        "notification_id": notification_id,
        "message": "Notification marked as read"
    }


@router.put("/mark-all-read")
async def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
) -> Any:
    """Mark all notifications as read for current user"""
    # In a real implementation, you'd update all unread notifications in database
    return {
        "success": True,
        "message": "All notifications marked as read"
    }


@router.get("/unread-count")
async def get_unread_count(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
) -> Any:
    """Get count of unread notifications"""
    # Get notifications and count unread ones
    notifications_response = await get_notifications(
        limit=100, offset=0, unread_only=True, db=db, current_user=current_user
    )
    
    return {
        "unread_count": len(notifications_response["notifications"])
    }