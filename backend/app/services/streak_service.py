"""
Streak tracking service for daily activity streaks and freeze functionality.
"""
from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.models.gamification import Gamification
from app.models.user import User


class StreakService:
    """Service for managing daily activity streaks and freeze functionality"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def update_streak(self, user_id, activity_date: date = None) -> Dict[str, Any]:
        """
        Update user's streak based on activity.
        
        Args:
            user_id: User UUID (can be UUID object or string)
            activity_date: Date of activity (defaults to today)
        
        Returns:
            Dict with streak information and any changes
        """
        # Ensure user_id is a UUID object, not a string
        from uuid import UUID
        if isinstance(user_id, str):
            user_id = UUID(user_id)
        elif not hasattr(user_id, 'hex'):  # Not a UUID object
            user_id = UUID(str(user_id))
            
        if activity_date is None:
            activity_date = date.today()
        
        # Get or create gamification record
        gamification = self.db.query(Gamification).filter(
            Gamification.user_id == user_id
        ).first()
        
        if not gamification:
            gamification = Gamification(
                user_id=user_id,
                current_streak=1,
                longest_streak=1,
                last_activity_date=activity_date
            )
            self.db.add(gamification)
            self.db.commit()
            
            return {
                "current_streak": 1,
                "longest_streak": 1,
                "streak_increased": True,
                "new_record": True,
                "last_activity_date": activity_date
            }
        
        last_activity = gamification.last_activity_date
        current_streak = gamification.current_streak
        longest_streak = gamification.longest_streak
        
        # Calculate days difference
        if last_activity:
            days_diff = (activity_date - last_activity).days
        else:
            days_diff = 1  # First activity
        
        streak_increased = False
        new_record = False
        
        if days_diff == 0:
            # Same day activity - no change to streak
            pass
        elif days_diff == 1:
            # Consecutive day - increase streak
            current_streak += 1
            streak_increased = True
            
            # Check if new record
            if current_streak > longest_streak:
                longest_streak = current_streak
                new_record = True
        elif days_diff > 1:
            # Streak broken - reset to 1
            current_streak = 1
            streak_increased = False
        else:
            # Future date - invalid
            raise ValueError("Activity date cannot be in the future")
        
        # Update gamification record
        gamification.current_streak = current_streak
        gamification.longest_streak = longest_streak
        gamification.last_activity_date = activity_date
        
        self.db.commit()
        
        return {
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "streak_increased": streak_increased,
            "new_record": new_record,
            "last_activity_date": activity_date,
            "days_since_last": days_diff
        }
    
    def use_streak_freeze(self, user_id) -> Dict[str, Any]:
        """
        Use a streak freeze to maintain streak despite missing a day.
        Users get 2 streak freezes per month.
        
        Args:
            user_id: User UUID (can be UUID object or string)
        
        Returns:
            Dict with freeze usage result
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
            raise ValueError("User gamification record not found")
        
        # Check if user has freezes available (2 per month)
        current_month = date.today().replace(day=1)
        
        # For simplicity, we'll track freeze count per month in the streak_freeze_count field
        # In production, you'd want a separate table to track freeze usage by month
        if gamification.streak_freeze_count >= 2:
            return {
                "success": False,
                "reason": "No streak freezes available this month",
                "freezes_remaining": 0
            }
        
        # Use freeze
        gamification.streak_freeze_count += 1
        
        # Extend last activity date by 1 day to maintain streak
        if gamification.last_activity_date:
            gamification.last_activity_date = gamification.last_activity_date + timedelta(days=1)
        
        self.db.commit()
        
        return {
            "success": True,
            "freezes_used": gamification.streak_freeze_count,
            "freezes_remaining": 2 - gamification.streak_freeze_count,
            "new_last_activity_date": gamification.last_activity_date
        }
    
    def get_streak_info(self, user_id) -> Dict[str, Any]:
        """Get comprehensive streak information for a user"""
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
            return {
                "current_streak": 0,
                "longest_streak": 0,
                "last_activity_date": None,
                "days_since_last_activity": None,
                "streak_at_risk": False,
                "freezes_used": 0,
                "freezes_remaining": 2
            }
        
        today = date.today()
        days_since_last = None
        streak_at_risk = False
        
        if gamification.last_activity_date:
            days_since_last = (today - gamification.last_activity_date).days
            # Streak is at risk if it's been more than 1 day since last activity
            streak_at_risk = days_since_last > 1 and gamification.current_streak > 0
        
        return {
            "current_streak": gamification.current_streak,
            "longest_streak": gamification.longest_streak,
            "last_activity_date": gamification.last_activity_date,
            "days_since_last_activity": days_since_last,
            "streak_at_risk": streak_at_risk,
            "freezes_used": gamification.streak_freeze_count,
            "freezes_remaining": max(0, 2 - gamification.streak_freeze_count)
        }
    
    def get_streak_milestones(self, current_streak: int) -> List[Dict[str, Any]]:
        """Get streak milestones and progress"""
        milestones = [
            {"days": 7, "name": "Week Warrior", "icon": "🔥"},
            {"days": 14, "name": "Two Week Champion", "icon": "⚡"},
            {"days": 30, "name": "Monthly Master", "icon": "🌟"},
            {"days": 60, "name": "Consistency King", "icon": "👑"},
            {"days": 100, "name": "Century Achiever", "icon": "💯"},
            {"days": 365, "name": "Year Long Legend", "icon": "🏆"}
        ]
        
        result = []
        for milestone in milestones:
            achieved = current_streak >= milestone["days"]
            progress = min(100, (current_streak / milestone["days"]) * 100) if not achieved else 100
            
            result.append({
                "days": milestone["days"],
                "name": milestone["name"],
                "icon": milestone["icon"],
                "achieved": achieved,
                "progress_percentage": progress
            })
        
        return result
    
    def reset_monthly_freezes(self) -> int:
        """
        Reset streak freeze counts for all users at the start of each month.
        This should be called by a scheduled job.
        
        Returns:
            Number of users whose freeze counts were reset
        """
        result = self.db.query(Gamification).update(
            {"streak_freeze_count": 0}
        )
        self.db.commit()
        return result