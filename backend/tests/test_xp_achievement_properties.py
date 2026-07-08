"""
Property-based tests for XP and Achievement System Consistency.

**Feature: shikkhasathi-platform, Property 8: XP and Achievement System Consistency**
**Validates: Requirements 3.3**
"""
import pytest
from hypothesis import given, strategies as st, assume, settings, HealthCheck
from datetime import date, datetime, timedelta
import math

from app.services.gamification_service import GamificationService, XPActivity
from app.services.achievement_service import AchievementService, Achievement, AchievementCategory


class MockGamificationService:
    """Mock gamification service for testing without database"""
    
    def __init__(self):
        self.user_data = {}  # user_id -> gamification data
    
    def calculate_level(self, total_xp: int) -> int:
        """Calculate level using sqrt formula: level = floor(sqrt(total_xp / 100))"""
        if total_xp <= 0:
            return 1
        return max(1, math.floor(math.sqrt(total_xp / 100)))
    
    def calculate_xp_for_level(self, level: int) -> int:
        """Calculate minimum XP required for a given level"""
        if level <= 1:
            return 0
        return (level ** 2) * 100
    
    def calculate_xp_to_next_level(self, current_xp: int) -> dict:
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
    
    def award_xp(self, user_id: str, activity_type: str, amount: int = None) -> dict:
        """Award XP for an activity and update level if necessary"""
        # Initialize user data if not exists
        if user_id not in self.user_data:
            self.user_data[user_id] = {
                "total_xp": 0,
                "current_level": 1,
                "achievements": []
            }
        
        # Determine XP amount
        if amount is None:
            xp_amounts = {
                "lesson_completion": XPActivity.LESSON_COMPLETION,
                "quiz_completion": XPActivity.QUIZ_COMPLETION,
                "daily_login": XPActivity.DAILY_LOGIN,
                "perfect_quiz": XPActivity.PERFECT_QUIZ
            }
            amount = xp_amounts.get(activity_type, 0)
        
        # Validate XP amount (anti-cheating measure)
        if amount < 0 or amount > 10000:  # Allow higher amounts for testing level progression
            raise ValueError(f"Invalid XP amount: {amount}")
        
        user_data = self.user_data[user_id]
        old_level = self.calculate_level(user_data["total_xp"])
        
        # Award XP
        user_data["total_xp"] += amount
        new_level = self.calculate_level(user_data["total_xp"])
        
        # Update level if changed
        level_up = False
        if new_level > old_level:
            user_data["current_level"] = new_level
            level_up = True
        
        return {
            "xp_awarded": amount,
            "total_xp": user_data["total_xp"],
            "old_level": old_level,
            "new_level": new_level,
            "level_up": level_up,
            "activity_type": activity_type,
            "timestamp": datetime.utcnow(),
            "xp_progress": self.calculate_xp_to_next_level(user_data["total_xp"])
        }


class MockAchievementService:
    """Mock achievement service for testing without database"""
    
    def __init__(self):
        self.user_achievements = {}  # user_id -> list of achievement_ids
        self.user_quiz_counts = {}  # user_id -> quiz count
        self.user_perfect_scores = {}  # user_id -> perfect score count
        self.achievements = self._define_test_achievements()
    
    def _define_test_achievements(self) -> dict:
        """Define a subset of achievements for testing"""
        achievements = {
            "first_quiz": Achievement(
                id="first_quiz",
                name="First Quiz",
                description="Complete your first quiz",
                category=AchievementCategory.QUIZ,
                icon="📝",
                xp_reward=50,
                unlock_condition={"type": "quiz_count", "value": 1}
            ),
            "quiz_novice": Achievement(
                id="quiz_novice",
                name="Quiz Novice",
                description="Complete 10 quizzes",
                category=AchievementCategory.QUIZ,
                icon="✏️",
                xp_reward=200,
                unlock_condition={"type": "quiz_count", "value": 10}
            ),
            "perfect_score": Achievement(
                id="perfect_score",
                name="Perfect Score",
                description="Get 100% on any quiz",
                category=AchievementCategory.QUIZ,
                icon="💯",
                xp_reward=150,
                unlock_condition={"type": "perfect_quiz", "value": 1}
            ),
            "level_5": Achievement(
                id="level_5",
                name="Level 5",
                description="Reach level 5",
                category=AchievementCategory.MILESTONE,
                icon="5️⃣",
                xp_reward=300,
                unlock_condition={"type": "level", "value": 5}
            )
        }
        return achievements
    
    def simulate_quiz_completion(self, user_id: str, perfect: bool = False):
        """Simulate quiz completion for testing"""
        if user_id not in self.user_quiz_counts:
            self.user_quiz_counts[user_id] = 0
            self.user_perfect_scores[user_id] = 0
        
        self.user_quiz_counts[user_id] += 1
        if perfect:
            self.user_perfect_scores[user_id] += 1
    
    def check_achievements(self, user_id: str, current_level: int = 1) -> list:
        """Check achievements for a user"""
        if user_id not in self.user_achievements:
            self.user_achievements[user_id] = set()
        
        current_achievements = self.user_achievements[user_id]
        newly_unlocked = []
        
        # Check quiz count achievements
        quiz_count = self.user_quiz_counts.get(user_id, 0)
        if quiz_count >= 1 and "first_quiz" not in current_achievements:
            newly_unlocked.append({"achievement": self.achievements["first_quiz"]})
            current_achievements.add("first_quiz")
        
        if quiz_count >= 10 and "quiz_novice" not in current_achievements:
            newly_unlocked.append({"achievement": self.achievements["quiz_novice"]})
            current_achievements.add("quiz_novice")
        
        # Check perfect score achievements
        perfect_count = self.user_perfect_scores.get(user_id, 0)
        if perfect_count >= 1 and "perfect_score" not in current_achievements:
            newly_unlocked.append({"achievement": self.achievements["perfect_score"]})
            current_achievements.add("perfect_score")
        
        # Check level achievements
        if current_level >= 5 and "level_5" not in current_achievements:
            newly_unlocked.append({"achievement": self.achievements["level_5"]})
            current_achievements.add("level_5")
        
        return newly_unlocked
    
    def get_user_achievements(self, user_id: str) -> dict:
        """Get user achievements"""
        if user_id not in self.user_achievements:
            self.user_achievements[user_id] = set()
        
        unlocked_ids = self.user_achievements[user_id]
        unlocked = [self.achievements[aid] for aid in unlocked_ids if aid in self.achievements]
        locked = [ach for aid, ach in self.achievements.items() if aid not in unlocked_ids]
        
        return {
            "unlocked": unlocked,
            "locked": locked,
            "total_unlocked": len(unlocked),
            "total_available": len(self.achievements)
        }


# XP System Properties

@given(
    xp_amounts=st.lists(
        st.integers(min_value=1, max_value=500), 
        min_size=1, 
        max_size=20
    )
)
@settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
def test_xp_accumulation_consistency(xp_amounts):
    """
    **Feature: shikkhasathi-platform, Property 8: XP and Achievement System Consistency**
    
    Property: For any sequence of XP awards, the total XP should equal the sum of all awards,
    and the level should be calculated correctly using the sqrt formula.
    """
    gamification_service = MockGamificationService()
    user_id = "test_user_1"
    
    # Award XP in sequence
    total_expected_xp = 0
    for xp_amount in xp_amounts:
        result = gamification_service.award_xp(user_id, "quiz_completion", amount=xp_amount)
        total_expected_xp += xp_amount
        
        # Check that total XP matches expected
        assert result["total_xp"] == total_expected_xp
        
        # Check level calculation consistency
        expected_level = max(1, int((total_expected_xp / 100) ** 0.5))
        assert result["new_level"] == expected_level


@given(
    activity_types=st.lists(
        st.sampled_from([
            "lesson_completion", 
            "quiz_completion", 
            "daily_login", 
            "perfect_quiz"
        ]),
        min_size=1,
        max_size=15
    )
)
@settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
def test_activity_xp_consistency(activity_types):
    """
    Property: For any sequence of activities, XP should be awarded according to 
    predefined amounts and level progression should be monotonic.
    """
    gamification_service = MockGamificationService()
    user_id = "test_user_2"
    
    previous_level = 1
    previous_xp = 0
    
    for activity_type in activity_types:
        result = gamification_service.award_xp(user_id, activity_type)
        
        # XP should only increase
        assert result["total_xp"] > previous_xp
        
        # Level should never decrease
        assert result["new_level"] >= previous_level
        
        # Check XP amount matches expected for activity type
        expected_xp = {
            "lesson_completion": XPActivity.LESSON_COMPLETION,
            "quiz_completion": XPActivity.QUIZ_COMPLETION,
            "daily_login": XPActivity.DAILY_LOGIN,
            "perfect_quiz": XPActivity.PERFECT_QUIZ
        }[activity_type]
        
        assert result["xp_awarded"] == expected_xp
        
        previous_level = result["new_level"]
        previous_xp = result["total_xp"]


@given(
    total_xp=st.integers(min_value=0, max_value=100000)
)
@settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
def test_level_calculation_properties(total_xp):
    """
    Property: Level calculation should be consistent and follow mathematical properties.
    """
    gamification_service = MockGamificationService()
    level = gamification_service.calculate_level(total_xp)
    
    # Level should always be at least 1
    assert level >= 1
    
    # Level should be monotonic with XP
    if total_xp > 0:
        higher_level = gamification_service.calculate_level(total_xp + 100)
        assert higher_level >= level
    
    # XP required for level should be consistent
    xp_for_level = gamification_service.calculate_xp_for_level(level)
    assert xp_for_level <= total_xp
    
    # Next level should require more XP
    if level < 100:  # Reasonable upper bound
        xp_for_next_level = gamification_service.calculate_xp_for_level(level + 1)
        assert xp_for_next_level > xp_for_level


@given(
    xp_amounts=st.lists(
        st.integers(min_value=-1000, max_value=2000),
        min_size=1,
        max_size=10
    )
)
@settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
def test_xp_validation_properties(xp_amounts):
    """
    Property: XP validation should prevent cheating and maintain system integrity.
    """
    gamification_service = MockGamificationService()
    user_id = "test_user_3"
    
    for xp_amount in xp_amounts:
        if xp_amount < 0 or xp_amount > 10000:  # Match the updated validation limit
            # Invalid XP amounts should raise ValueError
            with pytest.raises(ValueError):
                gamification_service.award_xp(user_id, "quiz_completion", amount=xp_amount)
        else:
            # Valid XP amounts should work
            result = gamification_service.award_xp(user_id, "quiz_completion", amount=xp_amount)
            assert result["xp_awarded"] == xp_amount


# Achievement System Properties

@given(
    quiz_count=st.integers(min_value=0, max_value=25),
    perfect_count=st.integers(min_value=0, max_value=10)
)
@settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
def test_achievement_unlocking_consistency(quiz_count, perfect_count):
    """
    Property: Achievements should be unlocked consistently based on user activities,
    and once unlocked, should remain unlocked.
    """
    assume(perfect_count <= quiz_count)  # Can't have more perfect scores than total quizzes
    
    achievement_service = MockAchievementService()
    gamification_service = MockGamificationService()
    user_id = "test_user_4"
    
    # Simulate quiz attempts
    for i in range(quiz_count):
        is_perfect = i < perfect_count
        achievement_service.simulate_quiz_completion(user_id, perfect=is_perfect)
        gamification_service.award_xp(user_id, "quiz_completion")
        if is_perfect:
            gamification_service.award_xp(user_id, "perfect_quiz")
    
    # Get current level for level-based achievements
    user_data = gamification_service.user_data.get(user_id, {"current_level": 1})
    current_level = user_data.get("current_level", 1)
    
    # Check achievements multiple times - should be consistent
    achievements_1 = achievement_service.check_achievements(user_id, current_level)
    achievements_2 = achievement_service.check_achievements(user_id, current_level)
    
    # Second check should not unlock new achievements (idempotent)
    assert len(achievements_2) == 0
    
    # Get user achievements
    user_achievements = achievement_service.get_user_achievements(user_id)
    
    # Unlocked achievements should match what was returned by check_achievements
    unlocked_ids = {ach.id for ach in user_achievements["unlocked"]}
    newly_unlocked_ids = {ach["achievement"].id for ach in achievements_1}
    
    assert newly_unlocked_ids.issubset(unlocked_ids)
    
    # Total counts should be consistent
    assert user_achievements["total_unlocked"] == len(user_achievements["unlocked"])
    assert user_achievements["total_available"] > 0


@given(
    quiz_count=st.integers(min_value=0, max_value=25)
)
@settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
def test_quiz_achievement_progression(quiz_count):
    """
    Property: Quiz-based achievements should unlock in proper order based on quiz count.
    """
    achievement_service = MockAchievementService()
    user_id = "test_user_5"
    
    # Simulate quiz attempts
    for i in range(quiz_count):
        achievement_service.simulate_quiz_completion(user_id)
    
    # Check achievements
    achievement_service.check_achievements(user_id)
    user_achievements = achievement_service.get_user_achievements(user_id)
    
    unlocked_ids = {ach.id for ach in user_achievements["unlocked"]}
    
    # Check quiz achievement progression
    if quiz_count >= 1:
        assert "first_quiz" in unlocked_ids
    if quiz_count >= 10:
        assert "quiz_novice" in unlocked_ids
    
    # Should not unlock achievements for higher thresholds
    if quiz_count < 1:
        assert "first_quiz" not in unlocked_ids
    if quiz_count < 10:
        assert "quiz_novice" not in unlocked_ids


@given(
    perfect_scores=st.integers(min_value=0, max_value=15)
)
@settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
def test_perfect_score_achievements(perfect_scores):
    """
    Property: Perfect score achievements should unlock based on number of perfect quizzes.
    """
    achievement_service = MockAchievementService()
    user_id = "test_user_6"
    
    # Simulate perfect score quiz attempts
    for i in range(perfect_scores):
        achievement_service.simulate_quiz_completion(user_id, perfect=True)
    
    # Check achievements
    achievement_service.check_achievements(user_id)
    user_achievements = achievement_service.get_user_achievements(user_id)
    
    unlocked_ids = {ach.id for ach in user_achievements["unlocked"]}
    
    # Check perfect score achievement progression
    if perfect_scores >= 1:
        assert "perfect_score" in unlocked_ids
    
    # Should not unlock achievements for higher thresholds
    if perfect_scores < 1:
        assert "perfect_score" not in unlocked_ids


@given(
    target_level=st.integers(min_value=1, max_value=10)
)
@settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
def test_level_milestone_achievements(target_level):
    """
    Property: Level milestone achievements should unlock when reaching specific levels.
    """
    achievement_service = MockAchievementService()
    gamification_service = MockGamificationService()
    user_id = "test_user_7"
    
    # Calculate XP needed for target level
    xp_needed = gamification_service.calculate_xp_for_level(target_level)
    
    # Award XP to reach target level in chunks to avoid validation issues
    if xp_needed > 0:
        # Award in chunks of 1000 XP max
        remaining_xp = xp_needed
        while remaining_xp > 0:
            chunk_size = min(1000, remaining_xp)
            gamification_service.award_xp(user_id, "quiz_completion", amount=chunk_size)
            remaining_xp -= chunk_size
    
    # Get current level
    user_data = gamification_service.user_data.get(user_id, {"current_level": 1})
    current_level = user_data.get("current_level", 1)
    
    # Check achievements
    achievement_service.check_achievements(user_id, current_level)
    user_achievements = achievement_service.get_user_achievements(user_id)
    
    unlocked_ids = {ach.id for ach in user_achievements["unlocked"]}
    
    # Check level milestone achievements
    if target_level >= 5:
        assert "level_5" in unlocked_ids
    
    # Should not unlock achievements for higher levels
    if target_level < 5:
        assert "level_5" not in unlocked_ids


@given(
    activities=st.lists(
        st.sampled_from([
            "lesson_completion",
            "quiz_completion", 
            "daily_login"
        ]),
        min_size=1,
        max_size=20
    )
)
@settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
def test_achievement_progress_consistency(activities):
    """
    Property: Achievement progress should be consistent and monotonic.
    """
    achievement_service = MockAchievementService()
    gamification_service = MockGamificationService()
    user_id = "test_user_8"
    
    # Perform activities
    quiz_count = 0
    for activity in activities:
        gamification_service.award_xp(user_id, activity)
        if activity == "quiz_completion":
            quiz_count += 1
            achievement_service.simulate_quiz_completion(user_id)
    
    # Get user achievements
    user_achievements = achievement_service.get_user_achievements(user_id)
    
    # Basic consistency checks
    assert user_achievements["total_unlocked"] == len(user_achievements["unlocked"])
    assert user_achievements["total_available"] > 0
    assert user_achievements["total_unlocked"] <= user_achievements["total_available"]
    
    # Check that unlocked achievements are not in locked list
    unlocked_ids = {ach.id for ach in user_achievements["unlocked"]}
    locked_ids = {ach.id for ach in user_achievements["locked"]}
    
    # No overlap between unlocked and locked
    assert len(unlocked_ids.intersection(locked_ids)) == 0