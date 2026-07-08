"""
Gamification service for XP, levels, achievements, and streaks.
"""
import math
from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.models.gamification import Gamification
from app.models.user import User
from app.models.quiz_attempt import QuizAttempt
from app.models.student_progress import StudentProgress


class XPActivity:
    """XP reward constants for different activities"""
    LESSON_COMPLETION = 50
    QUIZ_COMPLETION = 100
    DAILY_LOGIN = 10
    PERFECT_QUIZ = 150  # 100% score bonus
    STREAK_MILESTONE = 25  # Per day milestone (7, 14, 30 days)
    ACHIEVEMENT_UNLOCK = 200


class GamificationService:
    """Service for managing XP, levels, achievements, and streaks"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def calculate_level(self, total_xp: int) -> int:
        """Calculate level using sqrt formula: level = floor(sqrt(total_xp / 100))"""
        if total_xp is None or total_xp <= 0:
            return 1
        return max(1, math.floor(math.sqrt(total_xp / 100)))
    
    def calculate_xp_for_level(self, level: int) -> int:
        """Calculate minimum XP required for a given level"""
        if level <= 1:
            return 0
        return (level ** 2) * 100
    
    def calculate_xp_to_next_level(self, current_xp: int) -> Dict[str, int]:
        """Calculate XP needed to reach next level"""
        current_level = self.calculate_level(current_xp)
        next_level = current_level + 1
        xp_for_next_level = self.calculate_xp_for_level(next_level)
        xp_needed = xp_for_next_level - current_xp
        
        return {
            "current_level": current_level,
            "next_level": next_level,
            "current_xp": current_xp,
            "xp_for_next_level": xp_for_next_level,
            "xp_needed": xp_needed,
            "progress_percentage": min(100, (current_xp / xp_for_next_level) * 100) if xp_for_next_level > 0 else 100
        }
    
    def award_xp(self, user_id, activity_type: str, amount: int = None, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Award XP for an activity and update level if necessary.
        
        Args:
            user_id: User UUID (can be UUID object or string)
            activity_type: Type of activity (lesson_completion, quiz_completion, etc.)
            amount: Custom XP amount (overrides default)
            metadata: Additional data about the activity
        
        Returns:
            Dict with XP awarded, level changes, and notifications
        """
        # Ensure user_id is a UUID object, not a string
        from uuid import UUID
        if isinstance(user_id, str):
            user_id = UUID(user_id)
        elif not hasattr(user_id, 'hex'):  # Not a UUID object
            user_id = UUID(str(user_id))
        # Get or create gamification record
        gamification = self.db.query(Gamification).filter(
            Gamification.user_id == user_id
        ).first()
        
        if not gamification:
            gamification = Gamification(
                user_id=user_id,
                total_xp=0,
                current_level=1,
                current_streak=0,
                longest_streak=0,
                achievements=[],
                streak_freeze_count=0
            )
            self.db.add(gamification)
            self.db.flush()  # Flush to ensure defaults are set
        
        # Determine XP amount
        if amount is None:
            xp_amounts = {
                "lesson_completion": XPActivity.LESSON_COMPLETION,
                "quiz_completion": XPActivity.QUIZ_COMPLETION,
                "daily_login": XPActivity.DAILY_LOGIN,
                "perfect_quiz": XPActivity.PERFECT_QUIZ,
                "streak_milestone": XPActivity.STREAK_MILESTONE,
                "achievement_unlock": XPActivity.ACHIEVEMENT_UNLOCK
            }
            amount = xp_amounts.get(activity_type, 0)
        
        # Validate XP amount (anti-cheating measure)
        if amount < 0 or amount > 1000:  # Max 1000 XP per single activity
            raise ValueError(f"Invalid XP amount: {amount}")
        
        # Calculate level before XP award
        old_level = self.calculate_level(gamification.total_xp)
        
        # Award XP
        gamification.total_xp += amount
        new_level = self.calculate_level(gamification.total_xp)
        
        # Update level if changed
        level_up = False
        if new_level > old_level:
            gamification.current_level = new_level
            level_up = True
        
        # Update last activity date for streak tracking
        today = date.today()
        
        # Initialize result dictionary
        result = {
            "xp_awarded": amount,
            "total_xp": gamification.total_xp,
            "old_level": old_level,
            "new_level": new_level,
            "level_up": level_up,
            "activity_type": activity_type,
            "timestamp": datetime.utcnow(),
            "xp_progress": self.calculate_xp_to_next_level(gamification.total_xp)
        }
        
        # Update streak if this is a new day of activity
        if gamification.last_activity_date != today:
            from app.services.streak_service import StreakService
            streak_service = StreakService(self.db)
            streak_result = streak_service.update_streak(user_id, today)
            
            # Award bonus XP for streak milestones
            if streak_result["new_record"] and streak_result["current_streak"] in [7, 14, 30, 60, 100]:
                milestone_bonus = XPActivity.STREAK_MILESTONE * (streak_result["current_streak"] // 7)
                gamification.total_xp += milestone_bonus
                result["streak_milestone_bonus"] = milestone_bonus
                # Recalculate total_xp in result after bonus
                result["total_xp"] = gamification.total_xp
            
            result["streak_info"] = streak_result
        else:
            gamification.last_activity_date = today
        
        self.db.commit()
        
        if metadata:
            result["metadata"] = metadata
        
        return result
    
    def get_xp_history(self, user_id, days: int = 30) -> List[Dict[str, Any]]:
        """
        Get XP history for a user (would need separate XP history table in production).
        For now, we'll calculate from quiz attempts and other activities.
        """
        # Ensure user_id is a UUID object, not a string
        from uuid import UUID
        if isinstance(user_id, str):
            user_id = UUID(user_id)
        elif not hasattr(user_id, 'hex'):  # Not a UUID object
            user_id = UUID(str(user_id))
        # This is a simplified version - in production, you'd want a separate xp_history table
        since_date = datetime.utcnow() - timedelta(days=days)
        
        # Get quiz attempts as XP events
        quiz_attempts = self.db.query(QuizAttempt).filter(
            and_(
                QuizAttempt.user_id == user_id,
                QuizAttempt.completed_at >= since_date
            )
        ).order_by(QuizAttempt.completed_at.desc()).all()
        
        history = []
        for attempt in quiz_attempts:
            xp_amount = XPActivity.QUIZ_COMPLETION
            if attempt.score == attempt.max_score:  # Perfect score
                xp_amount += XPActivity.PERFECT_QUIZ
            
            history.append({
                "date": attempt.completed_at.date(),
                "activity_type": "quiz_completion",
                "xp_amount": xp_amount,
                "metadata": {
                    "quiz_id": str(attempt.quiz_id),
                    "score": attempt.score,
                    "max_score": attempt.max_score,
                    "perfect_score": attempt.score == attempt.max_score
                }
            })
        
        return history
    
    def validate_xp_integrity(self, user_id) -> Dict[str, Any]:
        """
        Validate XP integrity and detect potential cheating.
        Check for suspicious XP gains or impossible activity patterns.
        """
        # Ensure user_id is a UUID object, not a string
        from uuid import UUID
        if isinstance(user_id, str):
            user_id = UUID(user_id)
        elif not hasattr(user_id, 'hex'):  # Not a UUID object
            user_id = UUID(str(user_id))
        gamification = self.db.query(Gamification).filter(
            Gamification.user_id == user_id
        ).first()
        
        if not gamification:
            return {"valid": True, "issues": []}
        
        issues = []
        
        # Check if XP is reasonable based on quiz attempts
        quiz_count = self.db.query(QuizAttempt).filter(
            QuizAttempt.user_id == user_id
        ).count()
        
        # Rough estimate: each quiz should give 100-250 XP on average
        estimated_min_xp = quiz_count * 50  # Conservative estimate
        estimated_max_xp = quiz_count * 500  # Liberal estimate including bonuses
        
        if gamification.total_xp < estimated_min_xp * 0.5:
            issues.append("XP unusually low for activity level")
        elif gamification.total_xp > estimated_max_xp * 2:
            issues.append("XP unusually high for activity level")
        
        # Check level consistency
        calculated_level = self.calculate_level(gamification.total_xp)
        if gamification.current_level != calculated_level:
            issues.append(f"Level mismatch: stored {gamification.current_level}, calculated {calculated_level}")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "total_xp": gamification.total_xp,
            "quiz_count": quiz_count,
            "estimated_xp_range": [estimated_min_xp, estimated_max_xp]
        }
    
    def get_user_gamification(self, user_id) -> Optional[Gamification]:
        """Get gamification data for a user"""
        # Ensure user_id is a UUID object, not a string
        from uuid import UUID
        if isinstance(user_id, str):
            user_id = UUID(user_id)
        elif not hasattr(user_id, 'hex'):  # Not a UUID object
            user_id = UUID(str(user_id))
            
        return self.db.query(Gamification).filter(
            Gamification.user_id == user_id
        ).first()
    
    def create_user_gamification(self, user_id) -> Gamification:
        """Create initial gamification record for a new user"""
        # Ensure user_id is a UUID object, not a string
        from uuid import UUID
        if isinstance(user_id, str):
            user_id = UUID(user_id)
        elif not hasattr(user_id, 'hex'):  # Not a UUID object
            user_id = UUID(str(user_id))
            
        gamification = Gamification(
            user_id=user_id,
            total_xp=0,
            current_level=1,
            current_streak=0,
            longest_streak=0,
            achievements=[],
            last_activity_date=date.today(),
            streak_freeze_count=0
        )
        self.db.add(gamification)
        self.db.commit()
        return gamification