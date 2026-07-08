from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc
from datetime import datetime, timedelta, date
import json

from app.models.user import User, UserRole
from app.models.student_progress import StudentProgress
from app.models.gamification import Gamification
from app.models.quiz_attempt import QuizAttempt
from app.models.learning_path import LearningPath
from app.services.parent_notification_service import ParentNotificationService


class ParentService:
    def __init__(self, db: Session):
        self.db = db
        self.notification_service = ParentNotificationService(db)

    def get_parent_dashboard_data(self, parent_id: str) -> Dict[str, Any]:
        """Get comprehensive parent dashboard data"""
        # In a real implementation, you would have a parent-child relationship table
        # For now, we'll simulate by getting all students (in real app, filter by parent_id)
        children = self.db.query(User).filter(
            User.role == UserRole.STUDENT,
            User.is_active == True
        ).all()

        children_data = []
        for child in children:
            child_data = self._get_child_summary(child)
            children_data.append(child_data)

        # Get parent notifications
        notifications = self._get_parent_notifications(parent_id, children_data)

        # Get notification preferences (mock for now)
        notification_preferences = {
            "achievements": True,
            "weeklyReports": True,
            "performanceAlerts": True,
            "streakMilestones": True,
            "teacherMessages": True,
            "emailNotifications": True,
            "smsNotifications": False,
            "frequency": "daily",
            "quietHours": {
                "enabled": True,
                "startTime": "22:00",
                "endTime": "07:00"
            }
        }

        return {
            "parentId": parent_id,
            "children": children_data,
            "notifications": notifications,
            "weeklyReports": [],  # Will be implemented in subtask 12.3
            "notificationPreferences": notification_preferences
        }

    def _get_child_summary(self, child: User) -> Dict[str, Any]:
        """Get comprehensive summary for a child"""
        # Get gamification data
        gamification = self.db.query(Gamification).filter(
            Gamification.user_id == child.id
        ).first()

        # Get subject progress
        subject_progress = self._get_child_subject_progress(child.id)

        # Get recent achievements (from gamification achievements)
        recent_achievements = []
        if gamification and gamification.achievements:
            # Parse achievements and get recent ones
            achievements = gamification.achievements if isinstance(gamification.achievements, list) else []
            # Mock recent achievements for demo
            recent_achievements = [
                {
                    "id": "ach-1",
                    "name": "Quiz Master",
                    "description": "Completed 10 quizzes with 80%+ score",
                    "icon": "🏆",
                    "category": "performance",
                    "unlockedAt": datetime.now() - timedelta(days=1),
                    "xpReward": 200
                }
            ]

        # Get weak areas
        weak_areas = self._get_child_weak_areas(child.id)

        # Calculate risk level
        risk_level = self._calculate_risk_level(child.id, gamification)

        # Get time spent this week
        week_start = datetime.now() - timedelta(days=7)
        time_spent_this_week = self.db.query(func.sum(StudentProgress.time_spent_minutes)).filter(
            and_(
                StudentProgress.user_id == child.id,
                StudentProgress.last_accessed >= week_start
            )
        ).scalar() or 0

        # Calculate average score
        avg_score = self.db.query(func.avg(QuizAttempt.score * 100.0 / QuizAttempt.max_score)).filter(
            QuizAttempt.user_id == child.id
        ).scalar() or 0

        return {
            "id": str(child.id),
            "name": child.full_name,
            "email": child.email,
            "grade": child.grade or 9,
            "medium": child.medium.value if child.medium else "bangla",
            "totalXP": gamification.total_xp if gamification else 0,
            "currentLevel": gamification.current_level if gamification else 1,
            "currentStreak": gamification.current_streak if gamification else 0,
            "longestStreak": gamification.longest_streak if gamification else 0,
            "averageScore": round(avg_score, 1) if avg_score else 0,
            "timeSpentThisWeek": int(time_spent_this_week),
            "lastActive": child.last_login or child.created_at,
            "subjectProgress": subject_progress,
            "recentAchievements": recent_achievements,
            "weakAreas": weak_areas,
            "riskLevel": risk_level,
            "classInfo": {
                "className": f"Grade {child.grade}A",
                "teacherName": "Teacher Name",
                "classAverage": 75.0
            }
        }

    def _get_child_subject_progress(self, child_id: str) -> List[Dict[str, Any]]:
        """Get subject-wise progress for a child"""
        # Group progress by subject
        subjects = self.db.query(StudentProgress.subject).filter(
            StudentProgress.user_id == child_id
        ).distinct().all()

        subject_progress = []
        for (subject,) in subjects:
            # Get all progress records for this subject
            progress_records = self.db.query(StudentProgress).filter(
                and_(
                    StudentProgress.user_id == child_id,
                    StudentProgress.subject == subject
                )
            ).all()

            if not progress_records:
                continue

            # Calculate subject metrics
            total_time = sum(p.time_spent_minutes for p in progress_records)
            avg_completion = sum(float(p.completion_percentage) for p in progress_records) / len(progress_records)
            
            # Get quiz scores for this subject (simplified approach)
            subject_quiz_scores = self.db.query(QuizAttempt).filter(
                QuizAttempt.user_id == child_id
            ).all()
            
            avg_score = 0
            if subject_quiz_scores:
                avg_score = sum(q.score * 100.0 / q.max_score for q in subject_quiz_scores) / len(subject_quiz_scores)

            # Create bloom level progress (mock data for now)
            bloom_progress = []
            for level in range(1, 7):
                level_records = [p for p in progress_records if p.bloom_level == level]
                if level_records:
                    mastery = sum(float(p.completion_percentage) for p in level_records) / len(level_records)
                    questions_attempted = len(level_records) * 10  # Mock
                    success_rate = mastery
                else:
                    mastery = 0
                    questions_attempted = 0
                    success_rate = 0

                bloom_progress.append({
                    "level": level,
                    "mastery": round(mastery, 1),
                    "questionsAttempted": questions_attempted,
                    "successRate": round(success_rate, 1)
                })

            # Get topic progress
            topic_progress = []
            topics = self.db.query(StudentProgress.topic).filter(
                and_(
                    StudentProgress.user_id == child_id,
                    StudentProgress.subject == subject
                )
            ).distinct().all()

            for (topic,) in topics:
                topic_records = self.db.query(StudentProgress).filter(
                    and_(
                        StudentProgress.user_id == child_id,
                        StudentProgress.subject == subject,
                        StudentProgress.topic == topic
                    )
                ).all()

                if topic_records:
                    topic_completion = sum(float(p.completion_percentage) for p in topic_records) / len(topic_records)
                    topic_time = sum(p.time_spent_minutes for p in topic_records)
                    last_accessed = max(p.last_accessed for p in topic_records)

                    topic_progress.append({
                        "topic": topic,
                        "completionPercentage": round(topic_completion, 1),
                        "averageScore": round(avg_score, 1),  # Use subject average for now
                        "timeSpent": topic_time,
                        "lastAccessed": last_accessed
                    })

            subject_progress.append({
                "subject": subject,
                "completionPercentage": round(avg_completion, 1),
                "averageScore": round(avg_score, 1),
                "timeSpent": total_time,
                "bloomLevelProgress": bloom_progress,
                "lastAccessed": max(p.last_accessed for p in progress_records),
                "topicProgress": topic_progress
            })

        return subject_progress

    def _get_child_weak_areas(self, child_id: str) -> List[Dict[str, Any]]:
        """Identify weak areas for a child"""
        # Get quiz attempts with low success rates
        weak_areas_query = self.db.query(
            StudentProgress.subject,
            StudentProgress.topic,
            StudentProgress.bloom_level,
            func.avg(StudentProgress.completion_percentage).label('avg_completion'),
            func.count(StudentProgress.id).label('attempts')
        ).filter(
            StudentProgress.user_id == child_id
        ).group_by(
            StudentProgress.subject,
            StudentProgress.topic,
            StudentProgress.bloom_level
        ).having(
            func.avg(StudentProgress.completion_percentage) < 60
        ).all()

        weak_areas = []
        for area in weak_areas_query:
            recommended_actions = [
                "Review fundamental concepts",
                "Practice with additional exercises",
                "Seek help from teacher or tutor"
            ]

            weak_areas.append({
                "subject": area.subject,
                "topic": area.topic,
                "bloomLevel": area.bloom_level,
                "successRate": round(area.avg_completion, 1),
                "attemptsCount": area.attempts,
                "recommendedActions": recommended_actions
            })

        return weak_areas

    def _calculate_risk_level(self, child_id: str, gamification: Optional[Gamification]) -> str:
        """Calculate risk level for a child"""
        risk_factors = 0

        # Check last activity
        last_activity = gamification.last_activity_date if gamification else None
        if not last_activity or (date.today() - last_activity).days > 3:
            risk_factors += 1

        # Check current streak
        current_streak = gamification.current_streak if gamification else 0
        if current_streak < 3:
            risk_factors += 1

        # Check average performance
        avg_score = self.db.query(func.avg(QuizAttempt.score * 100.0 / QuizAttempt.max_score)).filter(
            QuizAttempt.user_id == child_id
        ).scalar() or 0

        if avg_score < 50:
            risk_factors += 2
        elif avg_score < 70:
            risk_factors += 1

        # Determine risk level
        if risk_factors >= 3:
            return "high"
        elif risk_factors >= 1:
            return "medium"
        else:
            return "low"

    def _get_parent_notifications(self, parent_id: str, children_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate parent notifications based on children's activities"""
        notifications = []

        for child in children_data:
            child_id = child["id"]
            child_name = child["name"]

            # Achievement notifications
            if child["recentAchievements"]:
                for achievement in child["recentAchievements"]:
                    notifications.append({
                        "id": f"notif-ach-{achievement['id']}",
                        "type": "achievement",
                        "title": "New Achievement Unlocked!",
                        "message": f"{child_name} has unlocked the \"{achievement['name']}\" achievement",
                        "childId": child_id,
                        "childName": child_name,
                        "priority": "low",
                        "timestamp": achievement["unlockedAt"],
                        "read": False,
                        "actionRequired": False,
                        "relatedData": {
                            "achievementId": achievement["id"]
                        }
                    })

            # Performance alerts
            if child["riskLevel"] == "high":
                notifications.append({
                    "id": f"notif-risk-{child_id}",
                    "type": "performance_alert",
                    "title": "Performance Alert",
                    "message": f"{child_name} needs attention. Consider encouraging more study time.",
                    "childId": child_id,
                    "childName": child_name,
                    "priority": "high",
                    "timestamp": datetime.now(),
                    "read": False,
                    "actionRequired": True
                })

            # Streak milestones
            if child["currentStreak"] > 0 and child["currentStreak"] % 7 == 0:
                notifications.append({
                    "id": f"notif-streak-{child_id}-{child['currentStreak']}",
                    "type": "streak_milestone",
                    "title": "Streak Milestone!",
                    "message": f"{child_name} has maintained a {child['currentStreak']}-day learning streak!",
                    "childId": child_id,
                    "childName": child_name,
                    "priority": "medium",
                    "timestamp": datetime.now(),
                    "read": False,
                    "actionRequired": False
                })

        # Sort by timestamp (newest first)
        notifications.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return notifications[:10]  # Return latest 10 notifications

    def get_child_analytics(self, child_id: str, time_range_days: int = 30) -> Dict[str, Any]:
        """Get detailed analytics for a specific child"""
        start_date = datetime.now() - timedelta(days=time_range_days)
        
        # Get learning trends
        learning_trends = self._get_learning_trends(child_id, start_date)
        
        # Get engagement metrics
        engagement_metrics = self._get_engagement_metrics(child_id, start_date)
        
        # Get performance metrics
        performance_metrics = self._get_performance_metrics(child_id, start_date)
        
        # Get goal progress (mock for now)
        goal_progress = [
            {
                "id": "goal-1",
                "title": "Complete 20 quizzes this month",
                "description": "Take and complete 20 quizzes across all subjects",
                "targetValue": 20,
                "currentValue": 15,
                "unit": "quizzes",
                "deadline": datetime.now() + timedelta(days=10),
                "progress": 75,
                "status": "on_track"
            }
        ]

        return {
            "childId": child_id,
            "timeRange": {
                "start": start_date,
                "end": datetime.now()
            },
            "learningTrends": learning_trends,
            "engagementMetrics": engagement_metrics,
            "performanceMetrics": performance_metrics,
            "goalProgress": goal_progress
        }

    def _get_learning_trends(self, child_id: str, start_date: datetime) -> List[Dict[str, Any]]:
        """Get daily learning trends for a child"""
        # This would typically involve complex queries to get daily aggregates
        # For now, return mock data
        trends = []
        current_date = start_date
        while current_date <= datetime.now():
            trends.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "timeSpent": 45,  # minutes
                "quizzesCompleted": 2,
                "averageScore": 78.5,
                "xpGained": 150
            })
            current_date += timedelta(days=1)
        
        return trends

    def _get_engagement_metrics(self, child_id: str, start_date: datetime) -> Dict[str, Any]:
        """Get engagement metrics for a child"""
        return {
            "averageSessionDuration": 35,  # minutes
            "totalSessions": 25,
            "streakConsistency": 85,  # percentage
            "preferredStudyTimes": ["16:00", "17:00", "18:00"],
            "subjectEngagement": [
                {
                    "subject": "Mathematics",
                    "engagementScore": 85,
                    "timeSpent": 600
                },
                {
                    "subject": "Physics",
                    "engagementScore": 78,
                    "timeSpent": 450
                }
            ]
        }

    def _get_performance_metrics(self, child_id: str, start_date: datetime) -> Dict[str, Any]:
        """Get performance metrics for a child"""
        return {
            "overallImprovement": 12.5,  # percentage
            "subjectImprovements": [
                {
                    "subject": "Mathematics",
                    "improvement": 15.2,
                    "currentLevel": "intermediate"
                },
                {
                    "subject": "Physics",
                    "improvement": 8.7,
                    "currentLevel": "beginner"
                }
            ],
            "bloomLevelProgression": [
                {
                    "level": 1,
                    "progressionRate": 95,
                    "currentMastery": 98
                },
                {
                    "level": 2,
                    "progressionRate": 85,
                    "currentMastery": 88
                }
            ],
            "weaknessResolution": [
                {
                    "topic": "Fractions",
                    "initialSuccessRate": 45,
                    "currentSuccessRate": 72,
                    "improvement": 27
                }
            ]
        }

    def update_notification_preferences(self, parent_id: str, preferences: Dict[str, Any]) -> Dict[str, Any]:
        """Update notification preferences for a parent"""
        # In a real implementation, this would save to database
        # For now, just return the updated preferences
        return preferences

    def mark_notification_as_read(self, parent_id: str, notification_id: str) -> bool:
        """Mark a notification as read"""
        # In a real implementation, this would update the database
        return True

    def generate_weekly_report(self, child_id: str, week_start: datetime) -> Dict[str, Any]:
        """Generate a weekly report for a child"""
        return self.notification_service.generate_weekly_report(child_id, week_start)

    def send_weekly_reports(self, parent_id: str) -> List[Dict[str, Any]]:
        """Generate and send weekly reports for all children of a parent"""
        return self.notification_service.send_weekly_reports(parent_id)

    def create_achievement_notification(self, parent_id: str, child_id: str, child_name: str, achievement: Dict[str, Any]) -> Dict[str, Any]:
        """Create achievement notification for parent"""
        return self.notification_service.create_achievement_notification(parent_id, child_id, child_name, achievement)

    def create_performance_alert(self, parent_id: str, child_id: str, child_name: str, alert_type: str, details: Dict[str, Any]) -> Dict[str, Any]:
        """Create performance alert for parent"""
        return self.notification_service.create_performance_alert(parent_id, child_id, child_name, alert_type, details)

    def create_streak_milestone_notification(self, parent_id: str, child_id: str, child_name: str, streak_days: int) -> Dict[str, Any]:
        """Create streak milestone notification for parent"""
        return self.notification_service.create_streak_milestone_notification(parent_id, child_id, child_name, streak_days)