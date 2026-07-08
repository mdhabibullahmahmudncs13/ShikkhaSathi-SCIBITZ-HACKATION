"""
Achievement system for tracking and unlocking student achievements.
"""
from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional, Set
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from dataclasses import dataclass
from enum import Enum

from app.models.gamification import Gamification
from app.models.user import User
from app.models.quiz_attempt import QuizAttempt
from app.models.student_progress import StudentProgress


class AchievementCategory(str, Enum):
    LEARNING = "learning"
    QUIZ = "quiz"
    STREAK = "streak"
    SOCIAL = "social"
    MILESTONE = "milestone"
    SPECIAL = "special"


@dataclass
class Achievement:
    """Achievement definition"""
    id: str
    name: str
    description: str
    category: AchievementCategory
    icon: str
    xp_reward: int
    unlock_condition: Dict[str, Any]
    hidden: bool = False  # Hidden until unlocked
    rare: bool = False  # Rare achievement badge


class AchievementService:
    """Service for managing achievements and progress tracking"""
    
    def __init__(self, db: Session):
        self.db = db
        self.achievements = self._define_achievements()
    
    def _define_achievements(self) -> Dict[str, Achievement]:
        """Define all 50+ achievements with unlock conditions"""
        achievements = {}
        
        # Learning Achievements
        learning_achievements = [
            Achievement(
                id="first_lesson",
                name="শুরুর পদক্ষেপ (First Steps)",
                description="Complete your first lesson",
                category=AchievementCategory.LEARNING,
                icon="🎯",
                xp_reward=50,
                unlock_condition={"type": "lesson_count", "value": 1}
            ),
            Achievement(
                id="lesson_explorer",
                name="পাঠ অন্বেষণকারী (Lesson Explorer)",
                description="Complete 10 lessons",
                category=AchievementCategory.LEARNING,
                icon="🗺️",
                xp_reward=200,
                unlock_condition={"type": "lesson_count", "value": 10}
            ),
            Achievement(
                id="knowledge_seeker",
                name="জ্ঞান অন্বেষী (Knowledge Seeker)",
                description="Complete 50 lessons",
                category=AchievementCategory.LEARNING,
                icon="📚",
                xp_reward=500,
                unlock_condition={"type": "lesson_count", "value": 50}
            ),
            Achievement(
                id="scholar",
                name="পণ্ডিত (Scholar)",
                description="Complete 100 lessons",
                category=AchievementCategory.LEARNING,
                icon="🎓",
                xp_reward=1000,
                unlock_condition={"type": "lesson_count", "value": 100}
            ),
            Achievement(
                id="subject_master_math",
                name="গণিত গুরু (Math Master)",
                description="Complete all math lessons for your grade",
                category=AchievementCategory.LEARNING,
                icon="🔢",
                xp_reward=800,
                unlock_condition={"type": "subject_completion", "subject": "Mathematics", "percentage": 100}
            ),
            Achievement(
                id="subject_master_science",
                name="বিজ্ঞান বিশেষজ্ঞ (Science Expert)",
                description="Complete all science lessons for your grade",
                category=AchievementCategory.LEARNING,
                icon="🔬",
                xp_reward=800,
                unlock_condition={"type": "subject_completion", "subject": "Science", "percentage": 100}
            ),
            Achievement(
                id="subject_master_bangla",
                name="বাংলা ভাষাবিদ (Bangla Linguist)",
                description="Complete all Bangla lessons for your grade",
                category=AchievementCategory.LEARNING,
                icon="📖",
                xp_reward=800,
                unlock_condition={"type": "subject_completion", "subject": "Bangla", "percentage": 100}
            ),
            Achievement(
                id="subject_master_english",
                name="English Scholar",
                description="Complete all English lessons for your grade",
                category=AchievementCategory.LEARNING,
                icon="🇬🇧",
                xp_reward=800,
                unlock_condition={"type": "subject_completion", "subject": "English", "percentage": 100}
            ),
        ]
        
        # Quiz Achievements
        quiz_achievements = [
            Achievement(
                id="first_quiz",
                name="প্রথম পরীক্ষা (First Quiz)",
                description="Complete your first quiz",
                category=AchievementCategory.QUIZ,
                icon="📝",
                xp_reward=50,
                unlock_condition={"type": "quiz_count", "value": 1}
            ),
            Achievement(
                id="quiz_novice",
                name="কুইজ নবিশ (Quiz Novice)",
                description="Complete 10 quizzes",
                category=AchievementCategory.QUIZ,
                icon="✏️",
                xp_reward=200,
                unlock_condition={"type": "quiz_count", "value": 10}
            ),
            Achievement(
                id="quiz_expert",
                name="কুইজ বিশেষজ্ঞ (Quiz Expert)",
                description="Complete 50 quizzes",
                category=AchievementCategory.QUIZ,
                icon="🏆",
                xp_reward=500,
                unlock_condition={"type": "quiz_count", "value": 50}
            ),
            Achievement(
                id="perfect_score",
                name="নিখুঁত স্কোর (Perfect Score)",
                description="Get 100% on any quiz",
                category=AchievementCategory.QUIZ,
                icon="💯",
                xp_reward=150,
                unlock_condition={"type": "perfect_quiz", "value": 1}
            ),
            Achievement(
                id="perfectionist",
                name="পূর্ণতাবাদী (Perfectionist)",
                description="Get 100% on 10 quizzes",
                category=AchievementCategory.QUIZ,
                icon="⭐",
                xp_reward=750,
                unlock_condition={"type": "perfect_quiz", "value": 10}
            ),
            Achievement(
                id="speed_demon",
                name="দ্রুততম (Speed Demon)",
                description="Complete a quiz in under 2 minutes",
                category=AchievementCategory.QUIZ,
                icon="⚡",
                xp_reward=300,
                unlock_condition={"type": "quiz_speed", "max_time": 120}
            ),
            Achievement(
                id="consistent_performer",
                name="ধারাবাহিক পারফরমার (Consistent Performer)",
                description="Score above 80% on 20 consecutive quizzes",
                category=AchievementCategory.QUIZ,
                icon="📈",
                xp_reward=600,
                unlock_condition={"type": "consecutive_high_scores", "score_threshold": 80, "count": 20}
            ),
        ]
        
        # Streak Achievements
        streak_achievements = [
            Achievement(
                id="daily_habit",
                name="দৈনিক অভ্যাস (Daily Habit)",
                description="Maintain a 7-day learning streak",
                category=AchievementCategory.STREAK,
                icon="🔥",
                xp_reward=200,
                unlock_condition={"type": "streak", "value": 7}
            ),
            Achievement(
                id="dedicated_learner",
                name="নিবেদিত শিক্ষার্থী (Dedicated Learner)",
                description="Maintain a 30-day learning streak",
                category=AchievementCategory.STREAK,
                icon="🌟",
                xp_reward=800,
                unlock_condition={"type": "streak", "value": 30}
            ),
            Achievement(
                id="unstoppable",
                name="অপ্রতিরোধ্য (Unstoppable)",
                description="Maintain a 100-day learning streak",
                category=AchievementCategory.STREAK,
                icon="🚀",
                xp_reward=2000,
                unlock_condition={"type": "streak", "value": 100},
                rare=True
            ),
            Achievement(
                id="weekend_warrior",
                name="সপ্তাহান্তের যোদ্ধা (Weekend Warrior)",
                description="Study on 10 weekends",
                category=AchievementCategory.STREAK,
                icon="⚔️",
                xp_reward=400,
                unlock_condition={"type": "weekend_study", "value": 10}
            ),
        ]
        
        # Milestone Achievements
        milestone_achievements = [
            Achievement(
                id="level_5",
                name="পঞ্চম স্তর (Level 5)",
                description="Reach level 5",
                category=AchievementCategory.MILESTONE,
                icon="5️⃣",
                xp_reward=300,
                unlock_condition={"type": "level", "value": 5}
            ),
            Achievement(
                id="level_10",
                name="দশম স্তর (Level 10)",
                description="Reach level 10",
                category=AchievementCategory.MILESTONE,
                icon="🔟",
                xp_reward=600,
                unlock_condition={"type": "level", "value": 10}
            ),
            Achievement(
                id="level_25",
                name="রৌপ্য স্তর (Silver Level)",
                description="Reach level 25",
                category=AchievementCategory.MILESTONE,
                icon="🥈",
                xp_reward=1500,
                unlock_condition={"type": "level", "value": 25}
            ),
            Achievement(
                id="level_50",
                name="স্বর্ণ স্তর (Gold Level)",
                description="Reach level 50",
                category=AchievementCategory.MILESTONE,
                icon="🥇",
                xp_reward=3000,
                unlock_condition={"type": "level", "value": 50},
                rare=True
            ),
            Achievement(
                id="xp_milestone_1000",
                name="হাজার পয়েন্ট (Thousand Points)",
                description="Earn 1,000 XP",
                category=AchievementCategory.MILESTONE,
                icon="💎",
                xp_reward=200,
                unlock_condition={"type": "total_xp", "value": 1000}
            ),
            Achievement(
                id="xp_milestone_10000",
                name="দশ হাজার পয়েন্ট (Ten Thousand Points)",
                description="Earn 10,000 XP",
                category=AchievementCategory.MILESTONE,
                icon="💠",
                xp_reward=1000,
                unlock_condition={"type": "total_xp", "value": 10000}
            ),
        ]
        
        # Social Achievements (for future implementation)
        social_achievements = [
            Achievement(
                id="helpful_peer",
                name="সহায়ক সহপাঠী (Helpful Peer)",
                description="Help 5 classmates with questions",
                category=AchievementCategory.SOCIAL,
                icon="🤝",
                xp_reward=400,
                unlock_condition={"type": "help_count", "value": 5}
            ),
            Achievement(
                id="class_leader",
                name="শ্রেণী নেতা (Class Leader)",
                description="Be in top 3 of your class leaderboard",
                category=AchievementCategory.SOCIAL,
                icon="👑",
                xp_reward=600,
                unlock_condition={"type": "leaderboard_position", "position": 3}
            ),
        ]
        
        # Special Achievements
        special_achievements = [
            Achievement(
                id="early_bird",
                name="প্রভাতী পাখি (Early Bird)",
                description="Study before 7 AM on 10 days",
                category=AchievementCategory.SPECIAL,
                icon="🐦",
                xp_reward=500,
                unlock_condition={"type": "early_study", "hour": 7, "count": 10}
            ),
            Achievement(
                id="night_owl",
                name="রাতের পেঁচা (Night Owl)",
                description="Study after 10 PM on 10 days",
                category=AchievementCategory.SPECIAL,
                icon="🦉",
                xp_reward=500,
                unlock_condition={"type": "late_study", "hour": 22, "count": 10}
            ),
            Achievement(
                id="comeback_kid",
                name="প্রত্যাবর্তনকারী (Comeback Kid)",
                description="Improve from failing to passing grade",
                category=AchievementCategory.SPECIAL,
                icon="📈",
                xp_reward=800,
                unlock_condition={"type": "grade_improvement", "from_threshold": 50, "to_threshold": 70}
            ),
            Achievement(
                id="explorer",
                name="অভিযাত্রী (Explorer)",
                description="Try lessons from 5 different subjects",
                category=AchievementCategory.SPECIAL,
                icon="🧭",
                xp_reward=300,
                unlock_condition={"type": "subject_diversity", "count": 5}
            ),
            Achievement(
                id="voice_learner",
                name="কণ্ঠ শিক্ষার্থী (Voice Learner)",
                description="Use voice features 50 times",
                category=AchievementCategory.SPECIAL,
                icon="🎤",
                xp_reward=400,
                unlock_condition={"type": "voice_usage", "count": 50}
            ),
            Achievement(
                id="offline_warrior",
                name="অফলাইন যোদ্ধা (Offline Warrior)",
                description="Complete 20 lessons while offline",
                category=AchievementCategory.SPECIAL,
                icon="📱",
                xp_reward=600,
                unlock_condition={"type": "offline_lessons", "count": 20}
            ),
            Achievement(
                id="beta_tester",
                name="বেটা পরীক্ষক (Beta Tester)",
                description="One of the first 1000 users",
                category=AchievementCategory.SPECIAL,
                icon="🔬",
                xp_reward=1000,
                unlock_condition={"type": "early_user", "user_number": 1000},
                rare=True,
                hidden=True
            ),
        ]
        
        # Combine all achievements
        all_achievements = (
            learning_achievements + quiz_achievements + streak_achievements + 
            milestone_achievements + social_achievements + special_achievements
        )
        
        # Convert to dictionary
        for achievement in all_achievements:
            achievements[achievement.id] = achievement
        
        return achievements
    
    def check_achievements(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Check all achievements for a user and return newly unlocked ones.
        """
        # Get user's current achievements
        gamification = self.db.query(Gamification).filter(
            Gamification.user_id == user_id
        ).first()
        
        if not gamification:
            return []
        
        current_achievements = set(gamification.achievements or [])
        newly_unlocked = []
        
        # Check each achievement
        for achievement_id, achievement in self.achievements.items():
            if achievement_id not in current_achievements:
                if self._check_achievement_condition(user_id, achievement):
                    newly_unlocked.append({
                        "achievement": achievement,
                        "unlocked_at": datetime.utcnow()
                    })
                    current_achievements.add(achievement_id)
        
        # Update user's achievements if any new ones were unlocked
        if newly_unlocked:
            gamification.achievements = list(current_achievements)
            self.db.commit()
        
        return newly_unlocked
    
    def _check_achievement_condition(self, user_id: str, achievement: Achievement) -> bool:
        """Check if a user meets the condition for an achievement"""
        condition = achievement.unlock_condition
        condition_type = condition.get("type")
        
        if condition_type == "quiz_count":
            count = self.db.query(QuizAttempt).filter(
                QuizAttempt.user_id == user_id
            ).count()
            return count >= condition["value"]
        
        elif condition_type == "perfect_quiz":
            count = self.db.query(QuizAttempt).filter(
                and_(
                    QuizAttempt.user_id == user_id,
                    QuizAttempt.score == QuizAttempt.max_score
                )
            ).count()
            return count >= condition["value"]
        
        elif condition_type == "streak":
            gamification = self.db.query(Gamification).filter(
                Gamification.user_id == user_id
            ).first()
            if gamification:
                return max(gamification.current_streak, gamification.longest_streak) >= condition["value"]
            return False
        
        elif condition_type == "level":
            gamification = self.db.query(Gamification).filter(
                Gamification.user_id == user_id
            ).first()
            if gamification:
                return gamification.current_level >= condition["value"]
            return False
        
        elif condition_type == "total_xp":
            gamification = self.db.query(Gamification).filter(
                Gamification.user_id == user_id
            ).first()
            if gamification:
                return gamification.total_xp >= condition["value"]
            return False
        
        elif condition_type == "subject_completion":
            # Check subject completion percentage
            progress = self.db.query(StudentProgress).filter(
                and_(
                    StudentProgress.user_id == user_id,
                    StudentProgress.subject == condition["subject"]
                )
            ).all()
            
            if not progress:
                return False
            
            avg_completion = sum(p.completion_percentage for p in progress) / len(progress)
            return avg_completion >= condition["percentage"]
        
        elif condition_type == "quiz_speed":
            # Check if user has completed any quiz under the time limit
            fast_quiz = self.db.query(QuizAttempt).filter(
                and_(
                    QuizAttempt.user_id == user_id,
                    QuizAttempt.time_taken_seconds <= condition["max_time"]
                )
            ).first()
            return fast_quiz is not None
        
        # Add more condition checks as needed
        return False
    
    def get_user_achievements(self, user_id: str) -> Dict[str, Any]:
        """Get all achievement data for a user"""
        gamification = self.db.query(Gamification).filter(
            Gamification.user_id == user_id
        ).first()
        
        if not gamification:
            return {
                "unlocked": [],
                "locked": list(self.achievements.values()),
                "progress": {},
                "total_unlocked": 0,
                "total_available": len(self.achievements)
            }
        
        unlocked_ids = set(gamification.achievements or [])
        unlocked = [self.achievements[aid] for aid in unlocked_ids if aid in self.achievements]
        locked = [ach for aid, ach in self.achievements.items() if aid not in unlocked_ids and not ach.hidden]
        
        # Calculate progress for locked achievements
        progress = {}
        for achievement_id, achievement in self.achievements.items():
            if achievement_id not in unlocked_ids:
                progress[achievement_id] = self._calculate_achievement_progress(user_id, achievement)
        
        return {
            "unlocked": unlocked,
            "locked": locked,
            "progress": progress,
            "total_unlocked": len(unlocked),
            "total_available": len(self.achievements)
        }
    
    def _calculate_achievement_progress(self, user_id: str, achievement: Achievement) -> Dict[str, Any]:
        """Calculate progress towards an achievement"""
        condition = achievement.unlock_condition
        condition_type = condition.get("type")
        
        if condition_type == "quiz_count":
            current = self.db.query(QuizAttempt).filter(
                QuizAttempt.user_id == user_id
            ).count()
            target = condition["value"]
            return {
                "current": current,
                "target": target,
                "percentage": min(100, (current / target) * 100)
            }
        
        elif condition_type == "perfect_quiz":
            current = self.db.query(QuizAttempt).filter(
                and_(
                    QuizAttempt.user_id == user_id,
                    QuizAttempt.score == QuizAttempt.max_score
                )
            ).count()
            target = condition["value"]
            return {
                "current": current,
                "target": target,
                "percentage": min(100, (current / target) * 100)
            }
        
        elif condition_type == "streak":
            gamification = self.db.query(Gamification).filter(
                Gamification.user_id == user_id
            ).first()
            current = max(gamification.current_streak, gamification.longest_streak) if gamification else 0
            target = condition["value"]
            return {
                "current": current,
                "target": target,
                "percentage": min(100, (current / target) * 100)
            }
        
        # Default progress
        return {
            "current": 0,
            "target": 1,
            "percentage": 0
        }
    
    def get_achievement_by_id(self, achievement_id: str) -> Optional[Achievement]:
        """Get achievement by ID"""
        return self.achievements.get(achievement_id)
    
    def get_achievements_by_category(self, category: AchievementCategory) -> List[Achievement]:
        """Get all achievements in a category"""
        return [ach for ach in self.achievements.values() if ach.category == category]