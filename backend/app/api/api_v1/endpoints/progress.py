from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.models.student_progress import StudentProgress
from app.models.gamification import Gamification
from app.models.quiz_attempt import QuizAttempt
from app.services.gamification_service import GamificationService
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/dashboard")
async def get_dashboard_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get comprehensive dashboard data for student"""
    try:
        # Get gamification data
        gamification = db.query(Gamification).filter(
            Gamification.user_id == current_user.id
        ).first()
        
        if not gamification:
            # Create default gamification record
            gamification = Gamification(
                user_id=current_user.id,
                total_xp=0,
                current_level=1,
                current_streak=0,
                longest_streak=0,
                achievements=[],
                streak_freeze_count=0
            )
            db.add(gamification)
            db.commit()
            db.refresh(gamification)
        
        # Get subject progress
        progress_records = db.query(StudentProgress).filter(
            StudentProgress.user_id == current_user.id
        ).all()
        
        # Group by subject
        subject_progress = {}
        for progress in progress_records:
            if progress.subject not in subject_progress:
                subject_progress[progress.subject] = {
                    "subject": progress.subject,
                    "completion_percentage": 0.0,
                    "time_spent": 0,
                    "topics_completed": 0,
                    "total_topics": 0,
                    "bloom_level_progress": [0] * 6,
                    "last_accessed": None
                }
            
            subject_data = subject_progress[progress.subject]
            subject_data["completion_percentage"] = max(
                subject_data["completion_percentage"], 
                progress.completion_percentage
            )
            subject_data["time_spent"] += progress.time_spent_minutes
            if progress.completion_percentage >= 80:
                subject_data["topics_completed"] += 1
            subject_data["total_topics"] += 1
            
            # Update bloom level progress
            if progress.bloom_level and 1 <= progress.bloom_level <= 6:
                subject_data["bloom_level_progress"][progress.bloom_level - 1] += 1
            
            if not subject_data["last_accessed"] or progress.last_accessed > subject_data["last_accessed"]:
                subject_data["last_accessed"] = progress.last_accessed
        
        # Get recent quiz attempts for weak areas
        recent_attempts = db.query(QuizAttempt).filter(
            QuizAttempt.user_id == current_user.id
        ).order_by(QuizAttempt.completed_at.desc()).limit(20).all()
        
        # Calculate weak areas
        weak_areas = []
        topic_performance = {}
        
        for attempt in recent_attempts:
            # Extract topic from quiz metadata if available
            topic = f"Quiz {attempt.quiz_id}"  # Simplified for now
            if topic not in topic_performance:
                topic_performance[topic] = []
            
            success_rate = (attempt.score / attempt.max_score) * 100
            topic_performance[topic].append(success_rate)
        
        for topic, scores in topic_performance.items():
            avg_score = sum(scores) / len(scores)
            if avg_score < 60:  # Below 60% considered weak
                weak_areas.append({
                    "topic": topic,
                    "average_score": avg_score,
                    "attempts": len(scores),
                    "improvement_needed": 100 - avg_score
                })
        
        # Sort weak areas by improvement needed
        weak_areas.sort(key=lambda x: x["improvement_needed"], reverse=True)
        
        # Generate learning path recommendations
        recommendations = []
        if weak_areas:
            recommendations.append({
                "type": "weakness_focus",
                "title": f"Focus on {weak_areas[0]['topic']}",
                "description": f"Your performance in this area is {weak_areas[0]['average_score']:.1f}%",
                "priority": "high",
                "estimated_time": "30 minutes"
            })
        
        # Add progression recommendations
        for subject, data in subject_progress.items():
            if data["completion_percentage"] > 70:
                recommendations.append({
                    "type": "progression",
                    "title": f"Advance in {subject}",
                    "description": f"You've completed {data['completion_percentage']:.1f}% - ready for next level",
                    "priority": "medium",
                    "estimated_time": "45 minutes"
                })
        
        return {
            "user_info": {
                "name": current_user.full_name,
                "grade": current_user.grade,
                "medium": current_user.medium
            },
            "gamification": {
                "total_xp": gamification.total_xp,
                "current_level": gamification.current_level,
                "current_streak": gamification.current_streak,
                "longest_streak": gamification.longest_streak,
                "achievements": gamification.achievements,
                "streak_freeze_count": gamification.streak_freeze_count
            },
            "subject_progress": list(subject_progress.values()),
            "weak_areas": weak_areas[:5],  # Top 5 weak areas
            "recommendations": recommendations[:3],  # Top 3 recommendations
            "total_time_spent": sum(data["time_spent"] for data in subject_progress.values()),
            "total_topics_completed": sum(data["topics_completed"] for data in subject_progress.values()),
            "overall_completion": (
                sum(data["completion_percentage"] for data in subject_progress.values()) / 
                len(subject_progress) if subject_progress else 0
            )
        }
        
    except Exception as e:
        logger.error(f"Error getting dashboard data: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard data")

@router.get("/analytics")
async def get_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get detailed analytics for student progress"""
    try:
        # Get quiz performance over time
        quiz_attempts = db.query(QuizAttempt).filter(
            QuizAttempt.user_id == current_user.id
        ).order_by(QuizAttempt.completed_at.asc()).all()
        
        performance_timeline = []
        for attempt in quiz_attempts:
            performance_timeline.append({
                "date": attempt.completed_at.isoformat(),
                "score": attempt.score,
                "max_score": attempt.max_score,
                "percentage": (attempt.score / attempt.max_score) * 100,
                "difficulty_level": attempt.difficulty_level,
                "bloom_level": attempt.bloom_level,
                "time_taken": attempt.time_taken_seconds
            })
        
        # Get learning time distribution
        progress_records = db.query(StudentProgress).filter(
            StudentProgress.user_id == current_user.id
        ).all()
        
        time_distribution = {}
        for progress in progress_records:
            if progress.subject not in time_distribution:
                time_distribution[progress.subject] = 0
            time_distribution[progress.subject] += progress.time_spent_minutes
        
        return {
            "performance_timeline": performance_timeline,
            "time_distribution": time_distribution,
            "total_quizzes": len(quiz_attempts),
            "average_score": (
                sum(attempt.score / attempt.max_score for attempt in quiz_attempts) / 
                len(quiz_attempts) * 100 if quiz_attempts else 0
            ),
            "improvement_trend": "positive" if len(quiz_attempts) >= 2 and 
                                quiz_attempts[-1].score / quiz_attempts[-1].max_score > 
                                quiz_attempts[0].score / quiz_attempts[0].max_score else "stable"
        }
        
    except Exception as e:
        logger.error(f"Error getting analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch analytics data")