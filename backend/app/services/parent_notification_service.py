from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc
from datetime import datetime, timedelta, date
import uuid
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
import logging

from app.models.user import User, UserRole
from app.models.student_progress import StudentProgress
from app.models.gamification import Gamification
from app.models.quiz_attempt import QuizAttempt
from app.core.config import settings

logger = logging.getLogger(__name__)


class ParentNotificationService:
    def __init__(self, db: Session):
        self.db = db

    def create_achievement_notification(
        self, 
        parent_id: str, 
        child_id: str, 
        child_name: str, 
        achievement: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create an achievement notification for parents"""
        notification = {
            'id': str(uuid.uuid4()),
            'type': 'achievement',
            'title': 'New Achievement Unlocked!',
            'message': f"{child_name} has unlocked the \"{achievement['name']}\" achievement! They earned {achievement.get('xpReward', 0)} XP.",
            'childId': child_id,
            'childName': child_name,
            'priority': 'low',
            'timestamp': datetime.now(),
            'read': False,
            'actionRequired': False,
            'relatedData': {
                'achievementId': achievement['id'],
                'xpReward': achievement.get('xpReward', 0)
            }
        }
        
        # Store notification (in real implementation, save to database)
        self._store_notification(parent_id, notification)
        
        # Send email if enabled
        self._send_email_notification(parent_id, notification)
        
        return notification

    def create_performance_alert(
        self, 
        parent_id: str, 
        child_id: str, 
        child_name: str, 
        alert_type: str,
        details: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a performance alert notification for parents"""
        alert_messages = {
            'low_activity': f"{child_name} has not been active for {details.get('days', 0)} days. Consider encouraging study time.",
            'declining_performance': f"{child_name}'s performance has declined by {details.get('decline_percentage', 0)}% this week.",
            'weak_area_identified': f"{child_name} is struggling with {details.get('subject', 'a subject')} - {details.get('topic', 'specific topic')}.",
            'streak_broken': f"{child_name}'s {details.get('streak_length', 0)}-day learning streak was broken. Help them get back on track!"
        }
        
        notification = {
            'id': str(uuid.uuid4()),
            'type': 'performance_alert',
            'title': 'Performance Alert',
            'message': alert_messages.get(alert_type, f"Performance alert for {child_name}"),
            'childId': child_id,
            'childName': child_name,
            'priority': 'high' if alert_type in ['declining_performance', 'weak_area_identified'] else 'medium',
            'timestamp': datetime.now(),
            'read': False,
            'actionRequired': True,
            'relatedData': {
                'alertType': alert_type,
                'details': details
            }
        }
        
        # Store notification
        self._store_notification(parent_id, notification)
        
        # Send email if enabled
        self._send_email_notification(parent_id, notification)
        
        return notification

    def create_streak_milestone_notification(
        self, 
        parent_id: str, 
        child_id: str, 
        child_name: str, 
        streak_days: int
    ) -> Dict[str, Any]:
        """Create a streak milestone notification for parents"""
        milestone_messages = {
            7: f"Great job! {child_name} has maintained a 1-week learning streak!",
            14: f"Excellent! {child_name} has maintained a 2-week learning streak!",
            30: f"Amazing! {child_name} has maintained a 1-month learning streak!",
            60: f"Outstanding! {child_name} has maintained a 2-month learning streak!",
            100: f"Incredible! {child_name} has reached a 100-day learning streak!"
        }
        
        # Find the appropriate milestone message
        message = milestone_messages.get(streak_days, f"Congratulations! {child_name} has maintained a {streak_days}-day learning streak!")
        
        notification = {
            'id': str(uuid.uuid4()),
            'type': 'streak_milestone',
            'title': 'Streak Milestone Achieved!',
            'message': message,
            'childId': child_id,
            'childName': child_name,
            'priority': 'medium',
            'timestamp': datetime.now(),
            'read': False,
            'actionRequired': False,
            'relatedData': {
                'streakDays': streak_days,
                'milestoneType': self._get_milestone_type(streak_days)
            }
        }
        
        # Store notification
        self._store_notification(parent_id, notification)
        
        # Send email if enabled
        self._send_email_notification(parent_id, notification)
        
        return notification

    def create_weekly_report_notification(
        self, 
        parent_id: str, 
        child_id: str, 
        child_name: str, 
        report_id: str
    ) -> Dict[str, Any]:
        """Create a weekly report notification for parents"""
        notification = {
            'id': str(uuid.uuid4()),
            'type': 'weekly_report',
            'title': 'Weekly Report Available',
            'message': f"Your weekly progress report for {child_name} is ready to view. Check out their achievements and progress this week!",
            'childId': child_id,
            'childName': child_name,
            'priority': 'medium',
            'timestamp': datetime.now(),
            'read': False,
            'actionRequired': False,
            'relatedData': {
                'reportId': report_id,
                'weekStart': (datetime.now() - timedelta(days=7)).isoformat(),
                'weekEnd': datetime.now().isoformat()
            }
        }
        
        # Store notification
        self._store_notification(parent_id, notification)
        
        # Send email if enabled
        self._send_email_notification(parent_id, notification)
        
        return notification

    def create_teacher_message_notification(
        self, 
        parent_id: str, 
        child_id: str, 
        child_name: str, 
        teacher_name: str,
        message: str,
        subject: str = None
    ) -> Dict[str, Any]:
        """Create a teacher message notification for parents"""
        notification = {
            'id': str(uuid.uuid4()),
            'type': 'teacher_message',
            'title': f'Message from {teacher_name}',
            'message': f"Teacher {teacher_name} sent a message about {child_name}: {message}",
            'childId': child_id,
            'childName': child_name,
            'priority': 'medium',
            'timestamp': datetime.now(),
            'read': False,
            'actionRequired': True,
            'relatedData': {
                'teacherName': teacher_name,
                'subject': subject,
                'originalMessage': message
            }
        }
        
        # Store notification
        self._store_notification(parent_id, notification)
        
        # Send email if enabled
        self._send_email_notification(parent_id, notification)
        
        return notification

    def generate_weekly_report(self, child_id: str, week_start: datetime) -> Dict[str, Any]:
        """Generate a comprehensive weekly report for a child"""
        week_end = week_start + timedelta(days=7)
        
        # Get child information
        child = self.db.query(User).filter(User.id == child_id).first()
        if not child:
            raise ValueError(f"Child with ID {child_id} not found")
        
        # Get gamification data
        gamification = self.db.query(Gamification).filter(Gamification.user_id == child_id).first()
        
        # Get progress data for the week
        weekly_progress = self.db.query(StudentProgress).filter(
            and_(
                StudentProgress.user_id == child_id,
                StudentProgress.last_accessed >= week_start,
                StudentProgress.last_accessed < week_end
            )
        ).all()
        
        # Get quiz attempts for the week
        weekly_quizzes = self.db.query(QuizAttempt).filter(
            and_(
                QuizAttempt.user_id == child_id,
                QuizAttempt.completed_at >= week_start,
                QuizAttempt.completed_at < week_end
            )
        ).all()
        
        # Calculate weekly summary
        total_time_spent = sum(p.time_spent_minutes for p in weekly_progress)
        quizzes_completed = len(weekly_quizzes)
        average_score = 0
        if weekly_quizzes:
            average_score = sum(q.score * 100.0 / q.max_score for q in weekly_quizzes) / len(weekly_quizzes)
        
        # Calculate XP gained this week (mock calculation)
        xp_gained = quizzes_completed * 100 + (total_time_spent // 30) * 10
        
        # Get subject breakdown
        subject_breakdown = self._calculate_subject_breakdown(weekly_progress, weekly_quizzes)
        
        # Generate achievements (mock for now)
        achievements = self._get_weekly_achievements(child_id, week_start, week_end)
        
        # Generate recommendations
        recommendations = self._generate_parent_recommendations(child_id, weekly_progress, weekly_quizzes)
        
        # Generate comparative analytics
        comparative_analytics = self._generate_comparative_analytics(child_id, average_score)
        
        report = {
            'id': str(uuid.uuid4()),
            'childId': child_id,
            'childName': child.full_name,
            'weekStartDate': week_start,
            'weekEndDate': week_end,
            'summary': {
                'totalTimeSpent': total_time_spent,
                'quizzesCompleted': quizzes_completed,
                'averageScore': round(average_score, 1),
                'streakDays': gamification.current_streak if gamification else 0,
                'xpGained': xp_gained,
                'levelsGained': 0,  # Would calculate based on XP changes
                'topicsCompleted': len(set(p.topic for p in weekly_progress)),
                'improvementAreas': self._identify_improvement_areas(weekly_progress, weekly_quizzes),
                'strengths': self._identify_strengths(weekly_progress, weekly_quizzes)
            },
            'subjectBreakdown': subject_breakdown,
            'achievements': achievements,
            'recommendations': recommendations,
            'comparativeAnalytics': comparative_analytics,
            'generatedAt': datetime.now()
        }
        
        return report

    def send_weekly_reports(self, parent_id: str) -> List[Dict[str, Any]]:
        """Generate and send weekly reports for all children of a parent"""
        # In a real implementation, get children from parent-child relationship
        # For now, get all students (mock)
        children = self.db.query(User).filter(
            User.role == UserRole.STUDENT,
            User.is_active == True
        ).limit(5).all()  # Limit for demo
        
        reports = []
        week_start = datetime.now() - timedelta(days=7)
        
        for child in children:
            try:
                report = self.generate_weekly_report(str(child.id), week_start)
                reports.append(report)
                
                # Create notification for the report
                self.create_weekly_report_notification(
                    parent_id, 
                    str(child.id), 
                    child.full_name, 
                    report['id']
                )
                
                # Send email with report
                self._send_weekly_report_email(parent_id, report)
                
            except Exception as e:
                logger.error(f"Failed to generate weekly report for child {child.id}: {e}")
                continue
        
        return reports

    def _store_notification(self, parent_id: str, notification: Dict[str, Any]):
        """Store notification in database (mock implementation)"""
        # In a real implementation, this would save to a notifications table
        logger.info(f"Storing notification {notification['id']} for parent {parent_id}")

    def _send_email_notification(self, parent_id: str, notification: Dict[str, Any]):
        """Send email notification to parent"""
        try:
            # Get parent email (mock for now)
            parent_email = f"parent{parent_id}@example.com"
            
            # Create email content
            subject = f"ShikkhaSathi: {notification['title']}"
            body = self._create_email_body(notification)
            
            # Send email (mock implementation)
            logger.info(f"Sending email notification to {parent_email}: {subject}")
            # In real implementation, use SMTP or email service
            
        except Exception as e:
            logger.error(f"Failed to send email notification: {e}")

    def _send_weekly_report_email(self, parent_id: str, report: Dict[str, Any]):
        """Send weekly report via email"""
        try:
            # Get parent email (mock for now)
            parent_email = f"parent{parent_id}@example.com"
            
            # Create email content
            subject = f"ShikkhaSathi: Weekly Report for {report['childName']}"
            body = self._create_weekly_report_email_body(report)
            
            # Send email (mock implementation)
            logger.info(f"Sending weekly report email to {parent_email}")
            
        except Exception as e:
            logger.error(f"Failed to send weekly report email: {e}")

    def _create_email_body(self, notification: Dict[str, Any]) -> str:
        """Create email body for notification"""
        return f"""
        Dear Parent,
        
        {notification['message']}
        
        Child: {notification['childName']}
        Time: {notification['timestamp'].strftime('%Y-%m-%d %H:%M:%S')}
        
        Please log in to your ShikkhaSathi parent portal to view more details.
        
        Best regards,
        ShikkhaSathi Team
        """

    def _create_weekly_report_email_body(self, report: Dict[str, Any]) -> str:
        """Create email body for weekly report"""
        summary = report['summary']
        return f"""
        Dear Parent,
        
        Here's {report['childName']}'s weekly learning report:
        
        📊 Weekly Summary:
        • Time Spent Learning: {summary['totalTimeSpent']} minutes
        • Quizzes Completed: {summary['quizzesCompleted']}
        • Average Score: {summary['averageScore']}%
        • Current Streak: {summary['streakDays']} days
        • XP Gained: {summary['xpGained']}
        
        🎯 Strengths:
        {chr(10).join(f"• {strength}" for strength in summary['strengths'])}
        
        📈 Areas for Improvement:
        {chr(10).join(f"• {area}" for area in summary['improvementAreas'])}
        
        Please log in to your ShikkhaSathi parent portal to view the complete report.
        
        Best regards,
        ShikkhaSathi Team
        """

    def _get_milestone_type(self, streak_days: int) -> str:
        """Get milestone type based on streak days"""
        if streak_days >= 100:
            return "legendary"
        elif streak_days >= 60:
            return "outstanding"
        elif streak_days >= 30:
            return "amazing"
        elif streak_days >= 14:
            return "excellent"
        elif streak_days >= 7:
            return "great"
        else:
            return "good"

    def _calculate_subject_breakdown(self, progress_records: List, quiz_attempts: List) -> List[Dict[str, Any]]:
        """Calculate subject-wise breakdown for the week"""
        subjects = {}
        
        # Group by subject
        for progress in progress_records:
            if progress.subject not in subjects:
                subjects[progress.subject] = {
                    'subject': progress.subject,
                    'timeSpent': 0,
                    'quizzesCompleted': 0,
                    'averageScore': 0,
                    'topicsStudied': set(),
                    'improvementFromLastWeek': 0,  # Mock
                    'bloomLevelDistribution': {f'level{i}': 0 for i in range(1, 7)}
                }
            
            subjects[progress.subject]['timeSpent'] += progress.time_spent_minutes
            subjects[progress.subject]['topicsStudied'].add(progress.topic)
            subjects[progress.subject]['bloomLevelDistribution'][f'level{progress.bloom_level}'] += 1
        
        # Add quiz data
        for quiz in quiz_attempts:
            # Mock subject assignment based on quiz
            subject = 'Mathematics'  # In real implementation, get from quiz metadata
            if subject in subjects:
                subjects[subject]['quizzesCompleted'] += 1
                if subjects[subject]['averageScore'] == 0:
                    subjects[subject]['averageScore'] = quiz.score * 100.0 / quiz.max_score
                else:
                    # Calculate running average
                    current_avg = subjects[subject]['averageScore']
                    count = subjects[subject]['quizzesCompleted']
                    new_score = quiz.score * 100.0 / quiz.max_score
                    subjects[subject]['averageScore'] = ((current_avg * (count - 1)) + new_score) / count
        
        # Convert sets to lists
        result = []
        for subject_data in subjects.values():
            subject_data['topicsStudied'] = list(subject_data['topicsStudied'])
            result.append(subject_data)
        
        return result

    def _get_weekly_achievements(self, child_id: str, week_start: datetime, week_end: datetime) -> List[Dict[str, Any]]:
        """Get achievements unlocked during the week (mock implementation)"""
        # In real implementation, query achievements table
        return [
            {
                'id': 'ach-weekly-1',
                'name': 'Quiz Master',
                'description': 'Completed 5 quizzes this week',
                'icon': '🏆',
                'category': 'performance',
                'unlockedAt': week_start + timedelta(days=3),
                'xpReward': 200
            }
        ]

    def _generate_parent_recommendations(self, child_id: str, progress_records: List, quiz_attempts: List) -> List[Dict[str, Any]]:
        """Generate recommendations for parents"""
        recommendations = []
        
        # Analyze performance and generate recommendations
        if len(quiz_attempts) < 3:
            recommendations.append({
                'type': 'study_schedule',
                'title': 'Increase Quiz Practice',
                'description': 'Your child completed fewer quizzes this week. Consider setting a daily quiz goal.',
                'priority': 'medium',
                'actionItems': [
                    'Set a goal of 1 quiz per day',
                    'Create a study schedule with quiz time',
                    'Reward quiz completion with small incentives'
                ],
                'estimatedImpact': 'medium',
                'timeframe': '1 week'
            })
        
        # Check for low performance
        if quiz_attempts:
            avg_score = sum(q.score * 100.0 / q.max_score for q in quiz_attempts) / len(quiz_attempts)
            if avg_score < 60:
                recommendations.append({
                    'type': 'additional_practice',
                    'title': 'Focus on Weak Areas',
                    'description': 'Your child\'s quiz scores indicate they need additional practice in certain topics.',
                    'priority': 'high',
                    'actionItems': [
                        'Review incorrect quiz answers together',
                        'Spend extra time on challenging topics',
                        'Consider getting additional help or tutoring'
                    ],
                    'estimatedImpact': 'high',
                    'timeframe': '2 weeks'
                })
        
        return recommendations

    def _generate_comparative_analytics(self, child_id: str, child_score: float) -> Dict[str, Any]:
        """Generate privacy-protected comparative analytics"""
        # Mock comparative data
        return {
            'classComparison': {
                'childRank': 15,
                'totalStudents': 30,
                'percentile': 50,
                'averageClassScore': 75.0,
                'childScore': child_score
            },
            'gradeComparison': {
                'childRank': 150,
                'totalStudents': 300,
                'percentile': 50,
                'averageGradeScore': 73.0,
                'childScore': child_score
            },
            'subjectComparisons': [
                {
                    'subject': 'Mathematics',
                    'childPerformance': child_score,
                    'classAverage': 75.0,
                    'gradeAverage': 73.0,
                    'trend': 'improving',
                    'trendPercentage': 5.2
                }
            ],
            'privacyNote': 'All comparative data is anonymized and aggregated to protect student privacy.'
        }

    def _identify_improvement_areas(self, progress_records: List, quiz_attempts: List) -> List[str]:
        """Identify areas that need improvement"""
        areas = []
        
        # Analyze quiz performance
        if quiz_attempts:
            low_scores = [q for q in quiz_attempts if (q.score * 100.0 / q.max_score) < 60]
            if len(low_scores) > len(quiz_attempts) * 0.3:  # More than 30% low scores
                areas.append("Quiz performance needs attention")
        
        # Analyze time spent
        total_time = sum(p.time_spent_minutes for p in progress_records)
        if total_time < 300:  # Less than 5 hours per week
            areas.append("Increase study time")
        
        # Analyze subject coverage
        subjects = set(p.subject for p in progress_records)
        if len(subjects) < 3:
            areas.append("Study more diverse subjects")
        
        return areas

    def _identify_strengths(self, progress_records: List, quiz_attempts: List) -> List[str]:
        """Identify student strengths"""
        strengths = []
        
        # Analyze quiz performance
        if quiz_attempts:
            high_scores = [q for q in quiz_attempts if (q.score * 100.0 / q.max_score) >= 80]
            if len(high_scores) > len(quiz_attempts) * 0.5:  # More than 50% high scores
                strengths.append("Excellent quiz performance")
        
        # Analyze consistency
        if len(progress_records) >= 5:
            strengths.append("Consistent learning activity")
        
        # Analyze subject mastery
        subjects = set(p.subject for p in progress_records)
        if len(subjects) >= 4:
            strengths.append("Well-rounded subject coverage")
        
        return strengths