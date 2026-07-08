"""
Gamification API endpoints for XP, achievements, streaks, and leaderboards.
"""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.services.gamification_service import GamificationService
from app.services.achievement_service import AchievementService, AchievementCategory
from app.services.streak_service import StreakService
from app.services.leaderboard_service import LeaderboardService, LeaderboardType, TimeFrame


router = APIRouter()


@router.get("/profile/{user_id}")
def get_gamification_profile(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive gamification profile for a user"""
    gamification_service = GamificationService(db)
    achievement_service = AchievementService(db)
    streak_service = StreakService(db)
    
    # Get gamification data
    gamification = gamification_service.get_user_gamification(user_id)
    if not gamification:
        gamification = gamification_service.create_user_gamification(user_id)
    
    # Get XP progress info
    xp_progress = gamification_service.calculate_xp_to_next_level(gamification.total_xp)
    
    # Get achievements
    achievements = achievement_service.get_user_achievements(user_id)
    
    # Get streak info
    streak_info = streak_service.get_streak_info(user_id)
    streak_milestones = streak_service.get_streak_milestones(streak_info["current_streak"])
    
    return {
        "user_id": user_id,
        "total_xp": gamification.total_xp,
        "current_level": gamification.current_level,
        "xp_progress": xp_progress,
        "achievements": {
            "unlocked": [
                {
                    "id": ach.id,
                    "name": ach.name,
                    "description": ach.description,
                    "category": ach.category,
                    "icon": ach.icon,
                    "xp_reward": ach.xp_reward,
                    "rare": ach.rare
                }
                for ach in achievements["unlocked"]
            ],
            "total_unlocked": achievements["total_unlocked"],
            "total_available": achievements["total_available"]
        },
        "streak": {
            **streak_info,
            "milestones": streak_milestones
        }
    }


@router.post("/award-xp")
def award_xp(
    user_id: str,
    activity_type: str,
    amount: Optional[int] = None,
    metadata: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Award XP to a user for an activity"""
    gamification_service = GamificationService(db)
    achievement_service = AchievementService(db)
    
    try:
        # Award XP
        xp_result = gamification_service.award_xp(user_id, activity_type, amount, metadata)
        
        # Check for new achievements
        new_achievements = achievement_service.check_achievements(user_id)
        
        # Award XP for new achievements
        for achievement_unlock in new_achievements:
            achievement = achievement_unlock["achievement"]
            gamification_service.award_xp(user_id, "achievement_unlock", achievement.xp_reward)
        
        return {
            "xp_result": xp_result,
            "new_achievements": [
                {
                    "id": ach["achievement"].id,
                    "name": ach["achievement"].name,
                    "description": ach["achievement"].description,
                    "icon": ach["achievement"].icon,
                    "xp_reward": ach["achievement"].xp_reward,
                    "unlocked_at": ach["unlocked_at"]
                }
                for ach in new_achievements
            ]
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/achievements")
def get_achievements(
    user_id: str,
    category: Optional[AchievementCategory] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user achievements with optional category filter"""
    achievement_service = AchievementService(db)
    
    achievements = achievement_service.get_user_achievements(user_id)
    
    # Filter by category if specified
    if category:
        achievements["unlocked"] = [
            ach for ach in achievements["unlocked"] 
            if ach.category == category
        ]
        achievements["locked"] = [
            ach for ach in achievements["locked"] 
            if ach.category == category
        ]
    
    return achievements


@router.get("/achievements/categories")
def get_achievement_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all achievement categories"""
    achievement_service = AchievementService(db)
    
    categories = {}
    for category in AchievementCategory:
        category_achievements = achievement_service.get_achievements_by_category(category)
        categories[category.value] = {
            "name": category.value.title(),
            "count": len(category_achievements),
            "achievements": [
                {
                    "id": ach.id,
                    "name": ach.name,
                    "description": ach.description,
                    "icon": ach.icon,
                    "xp_reward": ach.xp_reward,
                    "rare": ach.rare,
                    "hidden": ach.hidden
                }
                for ach in category_achievements
            ]
        }
    
    return categories


@router.get("/streak")
def get_streak_info(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed streak information for a user"""
    streak_service = StreakService(db)
    
    streak_info = streak_service.get_streak_info(user_id)
    milestones = streak_service.get_streak_milestones(streak_info["current_streak"])
    
    return {
        **streak_info,
        "milestones": milestones
    }


@router.post("/streak/freeze")
def use_streak_freeze(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Use a streak freeze to maintain streak"""
    streak_service = StreakService(db)
    
    try:
        result = streak_service.use_streak_freeze(user_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/leaderboard/xp")
def get_xp_leaderboard(
    leaderboard_type: LeaderboardType = LeaderboardType.GLOBAL,
    time_frame: TimeFrame = TimeFrame.ALL_TIME,
    grade: Optional[int] = Query(None, ge=6, le=12),
    subject: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get XP-based leaderboard"""
    leaderboard_service = LeaderboardService(db)
    
    return leaderboard_service.get_xp_leaderboard(
        leaderboard_type=leaderboard_type,
        time_frame=time_frame,
        user_id=str(current_user.id),
        grade=grade,
        subject=subject,
        limit=limit
    )


@router.get("/leaderboard/streak")
def get_streak_leaderboard(
    leaderboard_type: LeaderboardType = LeaderboardType.GLOBAL,
    grade: Optional[int] = Query(None, ge=6, le=12),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get streak-based leaderboard"""
    leaderboard_service = LeaderboardService(db)
    
    return leaderboard_service.get_streak_leaderboard(
        leaderboard_type=leaderboard_type,
        user_id=str(current_user.id),
        grade=grade,
        limit=limit
    )


@router.get("/leaderboard/subject/{subject}")
def get_subject_leaderboard(
    subject: str,
    grade: Optional[int] = Query(None, ge=6, le=12),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get subject-specific performance leaderboard"""
    leaderboard_service = LeaderboardService(db)
    
    return leaderboard_service.get_subject_performance_leaderboard(
        subject=subject,
        grade=grade,
        user_id=str(current_user.id),
        limit=limit
    )


@router.get("/leaderboard/quiz")
def get_quiz_leaderboard(
    grade: Optional[int] = Query(None, ge=6, le=12),
    subject: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get quiz performance leaderboard"""
    leaderboard_service = LeaderboardService(db)
    
    return leaderboard_service.get_quiz_performance_leaderboard(
        grade=grade,
        subject=subject,
        user_id=str(current_user.id),
        limit=limit
    )


@router.get("/leaderboard/summary")
def get_leaderboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get summary of user's positions across different leaderboards"""
    leaderboard_service = LeaderboardService(db)
    
    return leaderboard_service.get_user_leaderboard_summary(str(current_user.id))


@router.get("/xp/history")
def get_xp_history(
    user_id: str,
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get XP history for a user"""
    gamification_service = GamificationService(db)
    
    return {
        "history": gamification_service.get_xp_history(user_id, days),
        "days": days
    }


@router.get("/xp/validate")
def validate_xp_integrity(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Validate XP integrity for anti-cheating"""
    gamification_service = GamificationService(db)
    
    return gamification_service.validate_xp_integrity(user_id)