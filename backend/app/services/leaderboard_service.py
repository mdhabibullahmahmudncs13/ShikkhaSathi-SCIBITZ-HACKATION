"""
Leaderboard service for global, class, and subject-specific rankings.
"""
from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc, or_
from enum import Enum

from app.models.gamification import Gamification
from app.models.user import User
from app.models.student_progress import StudentProgress
from app.models.quiz_attempt import QuizAttempt


class LeaderboardType(str, Enum):
    GLOBAL = "global"
    CLASS = "class"
    SCHOOL = "school"
    FRIENDS = "friends"
    SUBJECT = "subject"


class TimeFrame(str, Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    ALL_TIME = "all_time"


class LeaderboardService:
    """Service for managing various types of leaderboards"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_xp_leaderboard(
        self, 
        leaderboard_type: LeaderboardType,
        time_frame: TimeFrame = TimeFrame.ALL_TIME,
        user_id: Optional[str] = None,
        grade: Optional[int] = None,
        subject: Optional[str] = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Get XP-based leaderboard with various filtering options.
        
        Args:
            leaderboard_type: Type of leaderboard (global, class, etc.)
            time_frame: Time period for ranking
            user_id: Current user ID (for privacy and friend filtering)
            grade: Grade filter for class leaderboards
            subject: Subject filter for subject-specific leaderboards
            limit: Maximum number of entries to return
        
        Returns:
            Dict with leaderboard data and user's position
        """
        # Base query joining users and gamification
        query = self.db.query(
            User.id,
            User.full_name,
            User.grade,
            Gamification.total_xp,
            Gamification.current_level,
            Gamification.current_streak
        ).join(Gamification, User.id == Gamification.user_id)
        
        # Apply filters based on leaderboard type
        if leaderboard_type == LeaderboardType.CLASS and grade is not None:
            query = query.filter(User.grade == grade)
        elif leaderboard_type == LeaderboardType.SUBJECT and subject is not None:
            # For subject leaderboards, we need to calculate XP from subject-specific activities
            # This is a simplified version - in production you'd track subject-specific XP
            query = query.join(
                StudentProgress, 
                User.id == StudentProgress.user_id
            ).filter(StudentProgress.subject == subject)
        
        # Apply time frame filters
        if time_frame == TimeFrame.WEEKLY:
            week_ago = datetime.utcnow() - timedelta(days=7)
            # For weekly, we'd need to track XP gains by date
            # This is simplified - in production you'd have an XP history table
            pass
        elif time_frame == TimeFrame.MONTHLY:
            month_ago = datetime.utcnow() - timedelta(days=30)
            # Similar to weekly, would need XP history
            pass
        
        # Order by total XP descending
        query = query.order_by(desc(Gamification.total_xp))
        
        # Get top entries
        top_entries = query.limit(limit).all()
        
        # Format leaderboard entries
        leaderboard = []
        user_position = None
        
        for i, entry in enumerate(top_entries):
            position = i + 1
            entry_data = {
                "position": position,
                "user_id": str(entry.id),
                "full_name": entry.full_name,
                "grade": entry.grade,
                "total_xp": entry.total_xp,
                "current_level": entry.current_level,
                "current_streak": entry.current_streak
            }
            
            # Check if this is the current user
            if user_id and str(entry.id) == user_id:
                user_position = position
                entry_data["is_current_user"] = True
            
            leaderboard.append(entry_data)
        
        # If user not in top entries, find their position
        if user_id and user_position is None:
            user_position = self._get_user_position(user_id, leaderboard_type, grade, subject)
        
        return {
            "leaderboard": leaderboard,
            "user_position": user_position,
            "total_participants": self._count_participants(leaderboard_type, grade, subject),
            "leaderboard_type": leaderboard_type,
            "time_frame": time_frame,
            "last_updated": datetime.utcnow()
        }
    
    def get_streak_leaderboard(
        self,
        leaderboard_type: LeaderboardType = LeaderboardType.GLOBAL,
        user_id: Optional[str] = None,
        grade: Optional[int] = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Get leaderboard based on current streaks"""
        query = self.db.query(
            User.id,
            User.full_name,
            User.grade,
            Gamification.current_streak,
            Gamification.longest_streak,
            Gamification.total_xp
        ).join(Gamification, User.id == Gamification.user_id)
        
        # Apply filters
        if leaderboard_type == LeaderboardType.CLASS and grade is not None:
            query = query.filter(User.grade == grade)
        
        # Order by current streak, then by longest streak as tiebreaker
        query = query.order_by(
            desc(Gamification.current_streak),
            desc(Gamification.longest_streak)
        )
        
        top_entries = query.limit(limit).all()
        
        leaderboard = []
        user_position = None
        
        for i, entry in enumerate(top_entries):
            position = i + 1
            entry_data = {
                "position": position,
                "user_id": str(entry.id),
                "full_name": entry.full_name,
                "grade": entry.grade,
                "current_streak": entry.current_streak,
                "longest_streak": entry.longest_streak,
                "total_xp": entry.total_xp
            }
            
            if user_id and str(entry.id) == user_id:
                user_position = position
                entry_data["is_current_user"] = True
            
            leaderboard.append(entry_data)
        
        return {
            "leaderboard": leaderboard,
            "user_position": user_position,
            "leaderboard_type": "streak",
            "last_updated": datetime.utcnow()
        }
    
    def get_subject_performance_leaderboard(
        self,
        subject: str,
        grade: Optional[int] = None,
        user_id: Optional[str] = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Get leaderboard based on subject-specific performance"""
        # Calculate average completion percentage per user for the subject
        query = self.db.query(
            User.id,
            User.full_name,
            User.grade,
            func.avg(StudentProgress.completion_percentage).label('avg_completion'),
            func.sum(StudentProgress.time_spent_minutes).label('total_time'),
            func.count(StudentProgress.id).label('topics_attempted')
        ).join(
            StudentProgress, User.id == StudentProgress.user_id
        ).filter(
            StudentProgress.subject == subject
        ).group_by(User.id, User.full_name, User.grade)
        
        if grade is not None:
            query = query.filter(User.grade == grade)
        
        # Order by average completion percentage
        query = query.order_by(desc('avg_completion'))
        
        top_entries = query.limit(limit).all()
        
        leaderboard = []
        user_position = None
        
        for i, entry in enumerate(top_entries):
            position = i + 1
            entry_data = {
                "position": position,
                "user_id": str(entry.id),
                "full_name": entry.full_name,
                "grade": entry.grade,
                "avg_completion": round(float(entry.avg_completion), 2),
                "total_time_minutes": entry.total_time,
                "topics_attempted": entry.topics_attempted
            }
            
            if user_id and str(entry.id) == user_id:
                user_position = position
                entry_data["is_current_user"] = True
            
            leaderboard.append(entry_data)
        
        return {
            "leaderboard": leaderboard,
            "user_position": user_position,
            "subject": subject,
            "grade": grade,
            "leaderboard_type": "subject_performance",
            "last_updated": datetime.utcnow()
        }
    
    def get_quiz_performance_leaderboard(
        self,
        grade: Optional[int] = None,
        subject: Optional[str] = None,
        user_id: Optional[str] = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Get leaderboard based on quiz performance (average score)"""
        # Calculate average quiz score per user
        query = self.db.query(
            User.id,
            User.full_name,
            User.grade,
            func.avg(QuizAttempt.score * 100.0 / QuizAttempt.max_score).label('avg_score'),
            func.count(QuizAttempt.id).label('quiz_count'),
            func.sum(QuizAttempt.score).label('total_score'),
            func.sum(QuizAttempt.max_score).label('total_max_score')
        ).join(
            QuizAttempt, User.id == QuizAttempt.user_id
        ).group_by(User.id, User.full_name, User.grade)
        
        if grade is not None:
            query = query.filter(User.grade == grade)
        
        # Filter by subject if specified (would need subject field in QuizAttempt)
        # if subject is not None:
        #     query = query.filter(QuizAttempt.subject == subject)
        
        # Order by average score, then by quiz count as tiebreaker
        query = query.order_by(desc('avg_score'), desc('quiz_count'))
        
        top_entries = query.limit(limit).all()
        
        leaderboard = []
        user_position = None
        
        for i, entry in enumerate(top_entries):
            position = i + 1
            entry_data = {
                "position": position,
                "user_id": str(entry.id),
                "full_name": entry.full_name,
                "grade": entry.grade,
                "avg_score": round(float(entry.avg_score), 2),
                "quiz_count": entry.quiz_count,
                "total_score": entry.total_score,
                "total_max_score": entry.total_max_score
            }
            
            if user_id and str(entry.id) == user_id:
                user_position = position
                entry_data["is_current_user"] = True
            
            leaderboard.append(entry_data)
        
        return {
            "leaderboard": leaderboard,
            "user_position": user_position,
            "grade": grade,
            "subject": subject,
            "leaderboard_type": "quiz_performance",
            "last_updated": datetime.utcnow()
        }
    
    def _get_user_position(
        self, 
        user_id: str, 
        leaderboard_type: LeaderboardType,
        grade: Optional[int] = None,
        subject: Optional[str] = None
    ) -> Optional[int]:
        """Get user's position in leaderboard if not in top entries"""
        # This would require a more complex query to count users with higher XP
        # Simplified implementation
        query = self.db.query(Gamification.total_xp).join(
            User, Gamification.user_id == User.id
        )
        
        if leaderboard_type == LeaderboardType.CLASS and grade is not None:
            query = query.filter(User.grade == grade)
        
        # Get user's XP
        user_gamification = self.db.query(Gamification).filter(
            Gamification.user_id == user_id
        ).first()
        
        if not user_gamification:
            return None
        
        # Count users with higher XP
        higher_xp_count = query.filter(
            Gamification.total_xp > user_gamification.total_xp
        ).count()
        
        return higher_xp_count + 1
    
    def _count_participants(
        self,
        leaderboard_type: LeaderboardType,
        grade: Optional[int] = None,
        subject: Optional[str] = None
    ) -> int:
        """Count total participants in leaderboard"""
        query = self.db.query(User).join(Gamification, User.id == Gamification.user_id)
        
        if leaderboard_type == LeaderboardType.CLASS and grade is not None:
            query = query.filter(User.grade == grade)
        elif leaderboard_type == LeaderboardType.SUBJECT and subject is not None:
            query = query.join(
                StudentProgress, User.id == StudentProgress.user_id
            ).filter(StudentProgress.subject == subject)
        
        return query.count()
    
    def get_user_leaderboard_summary(self, user_id: str) -> Dict[str, Any]:
        """Get summary of user's positions across different leaderboards"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return {}
        
        # Get positions in different leaderboards
        global_xp = self.get_xp_leaderboard(LeaderboardType.GLOBAL, user_id=user_id, limit=10)
        class_xp = self.get_xp_leaderboard(
            LeaderboardType.CLASS, 
            user_id=user_id, 
            grade=user.grade, 
            limit=10
        ) if user.grade else None
        
        streak_board = self.get_streak_leaderboard(
            LeaderboardType.GLOBAL, 
            user_id=user_id, 
            limit=10
        )
        
        return {
            "global_xp_position": global_xp.get("user_position"),
            "class_xp_position": class_xp.get("user_position") if class_xp else None,
            "global_streak_position": streak_board.get("user_position"),
            "grade": user.grade,
            "total_global_participants": global_xp.get("total_participants"),
            "last_updated": datetime.utcnow()
        }