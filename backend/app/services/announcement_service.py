"""
Announcement and Notification Service

Service for managing announcements, automated progress notifications,
and scheduled communication with students and parents.
"""

from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from uuid import UUID
import asyncio
from enum import Enum

from app.models.message import (
    Message, MessageRecipient, MessageType, MessagePriority, DeliveryStatus
)
from app.models.user import User
from app.models.teacher import Teacher, TeacherClass
from app.models.student_progress import StudentProgress
from app.models.gamification import Gamification
from app.services.message_service import MessageService
from app.schemas.message import MessageCreate
from app.core.config import settings


class NotificationType(str, Enum):
    """Types of automated notifications"""
    PROGRESS_REPORT = "progress_report"
    PERFORMANCE_ALERT = "performance_alert"
    ACHIEVEMENT_NOTIFICATION = "achievement_notification"
    WEEKLY_SUMMARY = "weekly_summary"
    ASSESSMENT_REMINDER = "assessment_reminder"
    MILESTONE_COMPLETION = "milestone_completion"


class AnnouncementService:
    """Service for managing announcements and automated notifications"""
    
    def __init__(self, db: Session):
        self.db = db
        self.message_service = MessageService(db)
    
    async def create_announcement(
        self,
        teacher_id: str,
        title: str,
        content: str,
        target_classes: List[str],
        priority: MessagePriority = MessagePriority.NORMAL,
        scheduled_at: Optional[datetime] = None,
        include_parents: bool = False,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Message:
        """
        Create a public announcement for classes
        
        Args:
            teacher_id: ID of the teacher creating the announcement
            title: Announcement title
            content: Announcement content
            target_classes: List of class IDs to send to
            priority: Announcement priority
            scheduled_at: Optional scheduled delivery time
            include_parents: Whether to include parents
            metadata: Additional announcement metadata
            
        Returns:
            Created announcement message
        """
        announcement_data = MessageCreate(
            subject=title,
            content=content,
            message_type=MessageType.ANNOUNCEMENT,
            priority=priority,
            recipient_ids=target_classes,
            scheduled_at=scheduled_at,
            is_draft=False,
            metadata={
                **(metadata or {}),
                'include_parents': include_parents,
                'announcement_type': 'class_announcement',
                'target_classes': target_classes
            }
        )
        
        return await self.message_service.create_message(teacher_id, announcement_data)
    
    async def generate_progress_report(
        self,
        teacher_id: str,
        student_id: str,
        report_period_days: int = 7
    ) -> Dict[str, Any]:
        """
        Generate automated progress report for a student
        
        Args:
            teacher_id: ID of the teacher
            student_id: ID of the student
            report_period_days: Number of days to include in report
            
        Returns:
            Progress report data
        """
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=report_period_days)
        
        # Get student information
        student = self.db.query(User).filter(User.id == student_id).first()
        if not student:
            raise ValueError("Student not found")
        
        # Get student progress data
        progress_records = self.db.query(StudentProgress).filter(
            and_(
                StudentProgress.user_id == student_id,
                StudentProgress.updated_at >= start_date
            )
        ).all()
        
        # Get gamification data
        gamification = self.db.query(Gamification).filter(
            Gamification.user_id == student_id
        ).first()
        
        # Calculate metrics
        total_xp_gained = sum(p.xp_earned for p in progress_records if p.xp_earned)
        subjects_studied = list(set(p.subject for p in progress_records if p.subject))
        topics_completed = len([p for p in progress_records if p.mastery_level == 'mastered'])
        
        # Calculate average performance
        scores = [p.score for p in progress_records if p.score is not None]
        average_score = sum(scores) / len(scores) if scores else 0
        
        # Identify weak areas
        weak_areas = []
        subject_performance = {}
        for record in progress_records:
            if record.subject and record.score is not None:
                if record.subject not in subject_performance:
                    subject_performance[record.subject] = []
                subject_performance[record.subject].append(record.score)
        
        for subject, scores in subject_performance.items():
            avg_score = sum(scores) / len(scores)
            if avg_score < 70:  # Below 70% threshold
                weak_areas.append({
                    'subject': subject,
                    'average_score': avg_score,
                    'attempts': len(scores)
                })
        
        # Generate recommendations
        recommendations = []
        if average_score < 70:
            recommendations.append("Consider additional practice in weak areas")
        if len(subjects_studied) < 3:
            recommendations.append("Encourage exploration of more subjects")
        if total_xp_gained < 100:  # Low engagement threshold
            recommendations.append("Increase study time and engagement")
        
        return {
            'student_id': student_id,
            'student_name': student.full_name,
            'report_period': {
                'start_date': start_date,
                'end_date': end_date,
                'days': report_period_days
            },
            'metrics': {
                'total_xp_gained': total_xp_gained,
                'current_level': gamification.level if gamification else 1,
                'current_streak': gamification.current_streak if gamification else 0,
                'subjects_studied': subjects_studied,
                'topics_completed': topics_completed,
                'average_score': round(average_score, 2),
                'total_attempts': len(progress_records)
            },
            'weak_areas': weak_areas,
            'recommendations': recommendations,
            'generated_at': datetime.utcnow()
        }
    
    async def send_progress_notification(
        self,
        teacher_id: str,
        student_id: str,
        report_data: Dict[str, Any],
        include_parents: bool = True
    ) -> Message:
        """
        Send automated progress notification to student and parents
        
        Args:
            teacher_id: ID of the teacher
            student_id: ID of the student
            report_data: Progress report data
            include_parents: Whether to include parents
            
        Returns:
            Created notification message
        """
        # Generate notification content
        metrics = report_data['metrics']
        weak_areas = report_data['weak_areas']
        recommendations = report_data['recommendations']
        
        subject = f"Progress Report for {report_data['student_name']}"
        
        content = f"""
Dear {report_data['student_name']} and Family,

Here is your progress report for the past {report_data['report_period']['days']} days:

📊 PERFORMANCE SUMMARY
• XP Gained: {metrics['total_xp_gained']} points
• Current Level: {metrics['current_level']}
• Current Streak: {metrics['current_streak']} days
• Average Score: {metrics['average_score']}%
• Topics Completed: {metrics['topics_completed']}
• Subjects Studied: {', '.join(metrics['subjects_studied'])}

"""
        
        if weak_areas:
            content += "\n⚠️ AREAS FOR IMPROVEMENT\n"
            for area in weak_areas:
                content += f"• {area['subject']}: {area['average_score']:.1f}% average\n"
        
        if recommendations:
            content += "\n💡 RECOMMENDATIONS\n"
            for rec in recommendations:
                content += f"• {rec}\n"
        
        content += f"\nKeep up the great work!\n\nGenerated on {report_data['generated_at'].strftime('%B %d, %Y at %I:%M %p')}"
        
        # Determine recipients
        recipients = [student_id]
        if include_parents:
            student = self.db.query(User).filter(User.id == student_id).first()
            if student and hasattr(student, 'parent_id') and student.parent_id:
                recipients.append(student.parent_id)
        
        notification_data = MessageCreate(
            subject=subject,
            content=content,
            message_type=MessageType.AUTOMATED,
            priority=MessagePriority.NORMAL,
            recipient_ids=recipients,
            is_draft=False,
            metadata={
                'notification_type': NotificationType.PROGRESS_REPORT,
                'student_id': student_id,
                'report_data': report_data
            }
        )
        
        return await self.message_service.create_message(teacher_id, notification_data)
    
    async def detect_and_alert_performance_issues(
        self,
        teacher_id: str,
        class_ids: List[str],
        performance_threshold: float = 70.0,
        days_to_check: int = 7
    ) -> List[Message]:
        """
        Detect performance issues and send automated alerts
        
        Args:
            teacher_id: ID of the teacher
            class_ids: List of class IDs to check
            performance_threshold: Score threshold for alerts
            days_to_check: Number of days to analyze
            
        Returns:
            List of alert messages sent
        """
        alerts_sent = []
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days_to_check)
        
        # Get all students in the classes
        teacher_classes = self.db.query(TeacherClass).filter(
            and_(
                TeacherClass.teacher_id == teacher_id,
                TeacherClass.id.in_(class_ids)
            )
        ).all()
        
        all_student_ids = []
        for tc in teacher_classes:
            if tc.student_ids:
                all_student_ids.extend(tc.student_ids)
        
        # Check each student's performance
        for student_id in set(all_student_ids):  # Remove duplicates
            # Get recent progress records
            recent_progress = self.db.query(StudentProgress).filter(
                and_(
                    StudentProgress.user_id == student_id,
                    StudentProgress.updated_at >= start_date,
                    StudentProgress.score.isnot(None)
                )
            ).all()
            
            if not recent_progress:
                continue
            
            # Calculate average score
            scores = [p.score for p in recent_progress]
            average_score = sum(scores) / len(scores)
            
            # Check for performance issues
            if average_score < performance_threshold:
                # Generate alert
                student = self.db.query(User).filter(User.id == student_id).first()
                if not student:
                    continue
                
                subject = f"Performance Alert: {student.full_name}"
                content = f"""
PERFORMANCE ALERT

Student: {student.full_name}
Average Score (Last {days_to_check} days): {average_score:.1f}%
Threshold: {performance_threshold}%

Recent Performance:
"""
                
                for progress in recent_progress[-5:]:  # Last 5 attempts
                    content += f"• {progress.subject}: {progress.score}% ({progress.updated_at.strftime('%m/%d')})\n"
                
                content += f"""
RECOMMENDED ACTIONS:
• Review student's weak areas
• Provide additional support materials
• Consider one-on-one assistance
• Contact parents if needed

This alert was automatically generated based on recent performance data.
"""
                
                # Send alert to teacher and parents
                recipients = [teacher_id]
                if hasattr(student, 'parent_id') and student.parent_id:
                    recipients.append(student.parent_id)
                
                alert_data = MessageCreate(
                    subject=subject,
                    content=content,
                    message_type=MessageType.AUTOMATED,
                    priority=MessagePriority.HIGH,
                    recipient_ids=recipients,
                    is_draft=False,
                    metadata={
                        'notification_type': NotificationType.PERFORMANCE_ALERT,
                        'student_id': student_id,
                        'average_score': average_score,
                        'threshold': performance_threshold,
                        'alert_generated_at': datetime.utcnow()
                    }
                )
                
                alert_message = await self.message_service.create_message(teacher_id, alert_data)
                alerts_sent.append(alert_message)
        
        return alerts_sent
    
    async def generate_weekly_summary(
        self,
        teacher_id: str,
        class_id: str
    ) -> Dict[str, Any]:
        """
        Generate weekly summary report for a class
        
        Args:
            teacher_id: ID of the teacher
            class_id: ID of the class
            
        Returns:
            Weekly summary data
        """
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=7)
        
        # Get class information
        teacher_class = self.db.query(TeacherClass).filter(
            and_(
                TeacherClass.teacher_id == teacher_id,
                TeacherClass.id == class_id
            )
        ).first()
        
        if not teacher_class or not teacher_class.student_ids:
            raise ValueError("Class not found or has no students")
        
        # Get all progress records for the week
        progress_records = self.db.query(StudentProgress).filter(
            and_(
                StudentProgress.user_id.in_(teacher_class.student_ids),
                StudentProgress.updated_at >= start_date
            )
        ).all()
        
        # Calculate class metrics
        total_students = len(teacher_class.student_ids)
        active_students = len(set(p.user_id for p in progress_records))
        total_attempts = len(progress_records)
        
        # Calculate average performance
        scores = [p.score for p in progress_records if p.score is not None]
        class_average = sum(scores) / len(scores) if scores else 0
        
        # Subject breakdown
        subject_stats = {}
        for record in progress_records:
            if record.subject and record.score is not None:
                if record.subject not in subject_stats:
                    subject_stats[record.subject] = {'scores': [], 'attempts': 0}
                subject_stats[record.subject]['scores'].append(record.score)
                subject_stats[record.subject]['attempts'] += 1
        
        # Calculate subject averages
        for subject in subject_stats:
            scores = subject_stats[subject]['scores']
            subject_stats[subject]['average'] = sum(scores) / len(scores)
        
        # Top performers
        student_performance = {}
        for record in progress_records:
            if record.score is not None:
                if record.user_id not in student_performance:
                    student_performance[record.user_id] = []
                student_performance[record.user_id].append(record.score)
        
        # Calculate student averages
        student_averages = {}
        for student_id, scores in student_performance.items():
            student_averages[student_id] = sum(scores) / len(scores)
        
        # Get top 3 performers
        top_performers = sorted(student_averages.items(), key=lambda x: x[1], reverse=True)[:3]
        
        # Get student names
        top_performer_names = []
        for student_id, avg_score in top_performers:
            student = self.db.query(User).filter(User.id == student_id).first()
            if student:
                top_performer_names.append({
                    'name': student.full_name,
                    'average_score': round(avg_score, 2)
                })
        
        return {
            'class_id': class_id,
            'class_name': teacher_class.name,
            'week_period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'metrics': {
                'total_students': total_students,
                'active_students': active_students,
                'engagement_rate': round((active_students / total_students) * 100, 2),
                'total_attempts': total_attempts,
                'class_average': round(class_average, 2)
            },
            'subject_performance': {
                subject: {
                    'average_score': round(stats['average'], 2),
                    'total_attempts': stats['attempts']
                }
                for subject, stats in subject_stats.items()
            },
            'top_performers': top_performer_names,
            'generated_at': datetime.utcnow()
        }
    
    async def send_weekly_summary_notification(
        self,
        teacher_id: str,
        summary_data: Dict[str, Any],
        include_parents: bool = False
    ) -> Message:
        """
        Send weekly summary notification
        
        Args:
            teacher_id: ID of the teacher
            summary_data: Weekly summary data
            include_parents: Whether to include parents
            
        Returns:
            Created summary notification
        """
        metrics = summary_data['metrics']
        subject_performance = summary_data['subject_performance']
        top_performers = summary_data['top_performers']
        
        subject = f"Weekly Summary: {summary_data['class_name']}"
        
        content = f"""
📊 WEEKLY CLASS SUMMARY
Class: {summary_data['class_name']}
Week: {summary_data['week_period']['start_date'].strftime('%B %d')} - {summary_data['week_period']['end_date'].strftime('%B %d, %Y')}

📈 CLASS METRICS
• Total Students: {metrics['total_students']}
• Active Students: {metrics['active_students']}
• Engagement Rate: {metrics['engagement_rate']}%
• Total Quiz Attempts: {metrics['total_attempts']}
• Class Average Score: {metrics['class_average']}%

📚 SUBJECT PERFORMANCE
"""
        
        for subject, stats in subject_performance.items():
            content += f"• {subject}: {stats['average_score']}% ({stats['total_attempts']} attempts)\n"
        
        if top_performers:
            content += "\n🏆 TOP PERFORMERS\n"
            for i, performer in enumerate(top_performers, 1):
                content += f"{i}. {performer['name']}: {performer['average_score']}%\n"
        
        content += f"\nGenerated on {summary_data['generated_at'].strftime('%B %d, %Y at %I:%M %p')}"
        
        # Send to teacher (and optionally parents)
        recipients = [teacher_id]
        
        summary_notification = MessageCreate(
            subject=subject,
            content=content,
            message_type=MessageType.AUTOMATED,
            priority=MessagePriority.NORMAL,
            recipient_ids=recipients,
            is_draft=False,
            metadata={
                'notification_type': NotificationType.WEEKLY_SUMMARY,
                'class_id': summary_data['class_id'],
                'summary_data': summary_data
            }
        )
        
        return await self.message_service.create_message(teacher_id, summary_notification)
    
    async def schedule_automated_notifications(
        self,
        teacher_id: str,
        notification_type: NotificationType,
        schedule_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Schedule automated notifications
        
        Args:
            teacher_id: ID of the teacher
            notification_type: Type of notification to schedule
            schedule_config: Configuration for the scheduled notifications
            
        Returns:
            Scheduling confirmation
        """
        # This would integrate with a task scheduler like Celery
        # For now, return configuration confirmation
        
        return {
            'teacher_id': teacher_id,
            'notification_type': notification_type,
            'schedule_config': schedule_config,
            'scheduled_at': datetime.utcnow(),
            'status': 'scheduled',
            'next_execution': schedule_config.get('next_execution')
        }