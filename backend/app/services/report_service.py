"""
Report Generation Service

Service for generating comprehensive reports including individual student reports,
class summaries, comparative analysis, and various export formats.
"""

from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from uuid import UUID
import json
from enum import Enum

from app.models.user import User
from app.models.teacher import Teacher, TeacherClass
from app.models.student_progress import StudentProgress, MasteryLevel
from app.models.gamification import Gamification
from app.models.quiz_attempt import QuizAttempt
from app.models.assessment import Assessment, AssessmentAttempt
from app.core.config import settings


class ReportType(str, Enum):
    """Types of reports that can be generated"""
    INDIVIDUAL_STUDENT = "individual_student"
    CLASS_SUMMARY = "class_summary"
    COMPARATIVE_ANALYSIS = "comparative_analysis"
    PROGRESS_OVERVIEW = "progress_overview"
    PERFORMANCE_TRENDS = "performance_trends"
    SUBJECT_ANALYSIS = "subject_analysis"
    ENGAGEMENT_REPORT = "engagement_report"


class ExportFormat(str, Enum):
    """Export formats supported"""
    PDF = "pdf"
    CSV = "csv"
    EXCEL = "excel"
    JSON = "json"


class ReportService:
    """Service for generating and exporting reports"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def generate_individual_student_report(
        self,
        teacher_id: str,
        student_id: str,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Generate comprehensive individual student report
        
        Args:
            teacher_id: ID of the teacher requesting the report
            student_id: ID of the student
            date_from: Start date for report period
            date_to: End date for report period
            
        Returns:
            Comprehensive student report data
        """
        # Set default date range if not provided
        if not date_to:
            date_to = datetime.utcnow()
        if not date_from:
            date_from = date_to - timedelta(days=30)  # Default to 30 days
        
        # Get student information
        student = self.db.query(User).filter(User.id == student_id).first()
        if not student:
            raise ValueError("Student not found")
        
        # Get gamification data
        gamification = self.db.query(Gamification).filter(
            Gamification.user_id == student_id
        ).first()
        
        # Get progress records in date range
        progress_records = self.db.query(StudentProgress).filter(
            and_(
                StudentProgress.user_id == student_id,
                StudentProgress.updated_at >= date_from,
                StudentProgress.updated_at <= date_to
            )
        ).all()
        
        # Get quiz attempts in date range
        quiz_attempts = self.db.query(QuizAttempt).filter(
            and_(
                QuizAttempt.user_id == student_id,
                QuizAttempt.completed_at >= date_from,
                QuizAttempt.completed_at <= date_to
            )
        ).all()
        
        # Get assessment attempts in date range
        assessment_attempts = self.db.query(AssessmentAttempt).filter(
            and_(
                AssessmentAttempt.student_id == student_id,
                AssessmentAttempt.submitted_at >= date_from,
                AssessmentAttempt.submitted_at <= date_to
            )
        ).all()
        
        # Calculate metrics
        total_xp_gained = sum(p.xp_earned for p in progress_records if p.xp_earned)
        total_time_spent = sum(p.time_spent for p in progress_records if p.time_spent)
        
        # Quiz performance
        quiz_scores = [attempt.score for attempt in quiz_attempts if attempt.score is not None]
        avg_quiz_score = sum(quiz_scores) / len(quiz_scores) if quiz_scores else 0
        
        # Assessment performance
        assessment_scores = [attempt.score for attempt in assessment_attempts if attempt.score is not None]
        avg_assessment_score = sum(assessment_scores) / len(assessment_scores) if assessment_scores else 0
        
        # Subject breakdown
        subject_performance = {}
        for record in progress_records:
            if record.subject and record.score is not None:
                if record.subject not in subject_performance:
                    subject_performance[record.subject] = {
                        'scores': [],
                        'time_spent': 0,
                        'topics_completed': 0,
                        'xp_earned': 0
                    }
                subject_performance[record.subject]['scores'].append(record.score)
                subject_performance[record.subject]['time_spent'] += record.time_spent or 0
                subject_performance[record.subject]['xp_earned'] += record.xp_earned or 0
                if record.mastery_level == MasteryLevel.MASTERED:
                    subject_performance[record.subject]['topics_completed'] += 1
        
        # Calculate subject averages
        for subject in subject_performance:
            scores = subject_performance[subject]['scores']
            subject_performance[subject]['average_score'] = sum(scores) / len(scores) if scores else 0
        
        # Identify strengths and weaknesses
        strengths = []
        weaknesses = []
        for subject, data in subject_performance.items():
            avg_score = data['average_score']
            if avg_score >= 85:
                strengths.append({
                    'subject': subject,
                    'average_score': avg_score,
                    'topics_completed': data['topics_completed']
                })
            elif avg_score < 70:
                weaknesses.append({
                    'subject': subject,
                    'average_score': avg_score,
                    'topics_completed': data['topics_completed']
                })
        
        # Generate recommendations
        recommendations = []
        if avg_quiz_score < 70:
            recommendations.append("Focus on quiz preparation and review incorrect answers")
        if avg_assessment_score < 70:
            recommendations.append("Seek additional help with formal assessments")
        if total_time_spent < 300:  # Less than 5 hours
            recommendations.append("Increase study time for better learning outcomes")
        if len(weaknesses) > 0:
            recommendations.append(f"Focus on improving performance in: {', '.join([w['subject'] for w in weaknesses])}")
        
        # Activity timeline
        activity_timeline = []
        for record in sorted(progress_records, key=lambda x: x.updated_at):
            activity_timeline.append({
                'date': record.updated_at,
                'activity': f"Completed {record.topic} in {record.subject}",
                'score': record.score,
                'xp_earned': record.xp_earned
            })
        
        return {
            'report_type': ReportType.INDIVIDUAL_STUDENT,
            'student_info': {
                'id': student.id,
                'name': student.full_name,
                'email': student.email
            },
            'report_period': {
                'start_date': date_from,
                'end_date': date_to,
                'days': (date_to - date_from).days
            },
            'overview_metrics': {
                'current_level': gamification.level if gamification else 1,
                'total_xp': gamification.total_xp if gamification else 0,
                'xp_gained_period': total_xp_gained,
                'current_streak': gamification.current_streak if gamification else 0,
                'total_time_spent': total_time_spent,
                'quiz_attempts': len(quiz_attempts),
                'assessment_attempts': len(assessment_attempts),
                'topics_completed': len([p for p in progress_records if p.mastery_level == MasteryLevel.MASTERED])
            },
            'performance_metrics': {
                'average_quiz_score': round(avg_quiz_score, 2),
                'average_assessment_score': round(avg_assessment_score, 2),
                'overall_average': round((avg_quiz_score + avg_assessment_score) / 2, 2) if (quiz_scores or assessment_scores) else 0
            },
            'subject_performance': {
                subject: {
                    'average_score': round(data['average_score'], 2),
                    'time_spent': data['time_spent'],
                    'topics_completed': data['topics_completed'],
                    'xp_earned': data['xp_earned']
                }
                for subject, data in subject_performance.items()
            },
            'strengths': strengths,
            'weaknesses': weaknesses,
            'recommendations': recommendations,
            'activity_timeline': activity_timeline[-20:],  # Last 20 activities
            'generated_at': datetime.utcnow()
        }
    
    async def generate_class_summary_report(
        self,
        teacher_id: str,
        class_id: str,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Generate class summary report
        
        Args:
            teacher_id: ID of the teacher
            class_id: ID of the class
            date_from: Start date for report period
            date_to: End date for report period
            
        Returns:
            Class summary report data
        """
        # Set default date range
        if not date_to:
            date_to = datetime.utcnow()
        if not date_from:
            date_from = date_to - timedelta(days=30)
        
        # Get class information
        teacher_class = self.db.query(TeacherClass).filter(
            and_(
                TeacherClass.teacher_id == teacher_id,
                TeacherClass.id == class_id
            )
        ).first()
        
        if not teacher_class or not teacher_class.student_ids:
            raise ValueError("Class not found or has no students")
        
        # Get all students in class
        students = self.db.query(User).filter(
            User.id.in_(teacher_class.student_ids)
        ).all()
        
        # Get progress records for all students
        progress_records = self.db.query(StudentProgress).filter(
            and_(
                StudentProgress.user_id.in_(teacher_class.student_ids),
                StudentProgress.updated_at >= date_from,
                StudentProgress.updated_at <= date_to
            )
        ).all()
        
        # Get quiz attempts for all students
        quiz_attempts = self.db.query(QuizAttempt).filter(
            and_(
                QuizAttempt.user_id.in_(teacher_class.student_ids),
                QuizAttempt.completed_at >= date_from,
                QuizAttempt.completed_at <= date_to
            )
        ).all()
        
        # Calculate class metrics
        total_students = len(students)
        active_students = len(set(p.user_id for p in progress_records))
        engagement_rate = (active_students / total_students) * 100 if total_students > 0 else 0
        
        # Performance metrics
        all_scores = [p.score for p in progress_records if p.score is not None]
        class_average = sum(all_scores) / len(all_scores) if all_scores else 0
        
        quiz_scores = [attempt.score for attempt in quiz_attempts if attempt.score is not None]
        avg_quiz_score = sum(quiz_scores) / len(quiz_scores) if quiz_scores else 0
        
        # Subject performance
        subject_stats = {}
        for record in progress_records:
            if record.subject and record.score is not None:
                if record.subject not in subject_stats:
                    subject_stats[record.subject] = {
                        'scores': [],
                        'students': set(),
                        'time_spent': 0,
                        'topics_completed': 0
                    }
                subject_stats[record.subject]['scores'].append(record.score)
                subject_stats[record.subject]['students'].add(record.user_id)
                subject_stats[record.subject]['time_spent'] += record.time_spent or 0
                if record.mastery_level == MasteryLevel.MASTERED:
                    subject_stats[record.subject]['topics_completed'] += 1
        
        # Calculate subject averages and participation
        subject_performance = {}
        for subject, stats in subject_stats.items():
            subject_performance[subject] = {
                'average_score': round(sum(stats['scores']) / len(stats['scores']), 2),
                'participation_rate': round((len(stats['students']) / total_students) * 100, 2),
                'total_time_spent': stats['time_spent'],
                'topics_completed': stats['topics_completed']
            }
        
        # Student performance distribution
        student_averages = {}
        for student_id in teacher_class.student_ids:
            student_records = [p for p in progress_records if p.user_id == student_id and p.score is not None]
            if student_records:
                avg_score = sum(p.score for p in student_records) / len(student_records)
                student_averages[student_id] = avg_score
        
        # Performance distribution
        performance_distribution = {
            'excellent': len([s for s in student_averages.values() if s >= 90]),
            'good': len([s for s in student_averages.values() if 80 <= s < 90]),
            'satisfactory': len([s for s in student_averages.values() if 70 <= s < 80]),
            'needs_improvement': len([s for s in student_averages.values() if s < 70])
        }
        
        # Top performers
        top_performers = []
        if student_averages:
            sorted_students = sorted(student_averages.items(), key=lambda x: x[1], reverse=True)
            for student_id, avg_score in sorted_students[:5]:
                student = next((s for s in students if s.id == student_id), None)
                if student:
                    top_performers.append({
                        'student_id': student_id,
                        'student_name': student.full_name,
                        'average_score': round(avg_score, 2)
                    })
        
        # At-risk students
        at_risk_students = []
        if student_averages:
            for student_id, avg_score in student_averages.items():
                if avg_score < 70:
                    student = next((s for s in students if s.id == student_id), None)
                    if student:
                        at_risk_students.append({
                            'student_id': student_id,
                            'student_name': student.full_name,
                            'average_score': round(avg_score, 2)
                        })
        
        return {
            'report_type': ReportType.CLASS_SUMMARY,
            'class_info': {
                'id': class_id,
                'name': teacher_class.name,
                'grade': teacher_class.grade,
                'subject': teacher_class.subject
            },
            'report_period': {
                'start_date': date_from,
                'end_date': date_to,
                'days': (date_to - date_from).days
            },
            'overview_metrics': {
                'total_students': total_students,
                'active_students': active_students,
                'engagement_rate': round(engagement_rate, 2),
                'class_average': round(class_average, 2),
                'average_quiz_score': round(avg_quiz_score, 2),
                'total_activities': len(progress_records),
                'total_quiz_attempts': len(quiz_attempts)
            },
            'subject_performance': subject_performance,
            'performance_distribution': performance_distribution,
            'top_performers': top_performers,
            'at_risk_students': at_risk_students,
            'generated_at': datetime.utcnow()
        }
    
    async def generate_comparative_analysis_report(
        self,
        teacher_id: str,
        class_ids: List[str],
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Generate comparative analysis report across multiple classes
        
        Args:
            teacher_id: ID of the teacher
            class_ids: List of class IDs to compare
            date_from: Start date for report period
            date_to: End date for report period
            
        Returns:
            Comparative analysis report data
        """
        # Set default date range
        if not date_to:
            date_to = datetime.utcnow()
        if not date_from:
            date_from = date_to - timedelta(days=30)
        
        # Generate individual class reports
        class_reports = []
        for class_id in class_ids:
            try:
                class_report = await self.generate_class_summary_report(
                    teacher_id, class_id, date_from, date_to
                )
                class_reports.append(class_report)
            except ValueError:
                continue  # Skip classes that don't exist or have no students
        
        if not class_reports:
            raise ValueError("No valid classes found for comparison")
        
        # Comparative metrics
        comparison_metrics = {
            'total_students': sum(report['overview_metrics']['total_students'] for report in class_reports),
            'average_engagement': round(
                sum(report['overview_metrics']['engagement_rate'] for report in class_reports) / len(class_reports), 2
            ),
            'average_performance': round(
                sum(report['overview_metrics']['class_average'] for report in class_reports) / len(class_reports), 2
            )
        }
        
        # Class comparisons
        class_comparisons = []
        for report in class_reports:
            class_comparisons.append({
                'class_name': report['class_info']['name'],
                'class_id': report['class_info']['id'],
                'student_count': report['overview_metrics']['total_students'],
                'engagement_rate': report['overview_metrics']['engagement_rate'],
                'class_average': report['overview_metrics']['class_average'],
                'top_performer_count': len(report['top_performers']),
                'at_risk_count': len(report['at_risk_students'])
            })
        
        # Subject comparison across classes
        all_subjects = set()
        for report in class_reports:
            all_subjects.update(report['subject_performance'].keys())
        
        subject_comparison = {}
        for subject in all_subjects:
            subject_data = []
            for report in class_reports:
                if subject in report['subject_performance']:
                    subject_data.append({
                        'class_name': report['class_info']['name'],
                        'average_score': report['subject_performance'][subject]['average_score'],
                        'participation_rate': report['subject_performance'][subject]['participation_rate']
                    })
            
            if subject_data:
                subject_comparison[subject] = {
                    'class_data': subject_data,
                    'overall_average': round(
                        sum(data['average_score'] for data in subject_data) / len(subject_data), 2
                    )
                }
        
        return {
            'report_type': ReportType.COMPARATIVE_ANALYSIS,
            'report_period': {
                'start_date': date_from,
                'end_date': date_to,
                'days': (date_to - date_from).days
            },
            'classes_compared': len(class_reports),
            'comparison_metrics': comparison_metrics,
            'class_comparisons': sorted(class_comparisons, key=lambda x: x['class_average'], reverse=True),
            'subject_comparison': subject_comparison,
            'individual_class_reports': class_reports,
            'generated_at': datetime.utcnow()
        }
    
    async def get_available_report_templates(self) -> List[Dict[str, Any]]:
        """
        Get available report templates
        
        Returns:
            List of available report templates
        """
        return [
            {
                'id': 'individual_detailed',
                'name': 'Detailed Individual Student Report',
                'description': 'Comprehensive report for individual student with performance metrics, strengths, weaknesses, and recommendations',
                'type': ReportType.INDIVIDUAL_STUDENT,
                'sections': ['overview', 'performance', 'subjects', 'timeline', 'recommendations']
            },
            {
                'id': 'individual_summary',
                'name': 'Student Summary Report',
                'description': 'Concise overview of student performance and key metrics',
                'type': ReportType.INDIVIDUAL_STUDENT,
                'sections': ['overview', 'performance', 'recommendations']
            },
            {
                'id': 'class_comprehensive',
                'name': 'Comprehensive Class Report',
                'description': 'Detailed class performance analysis with student breakdowns and subject analysis',
                'type': ReportType.CLASS_SUMMARY,
                'sections': ['overview', 'performance', 'subjects', 'students', 'trends']
            },
            {
                'id': 'class_overview',
                'name': 'Class Overview Report',
                'description': 'High-level class performance metrics and key insights',
                'type': ReportType.CLASS_SUMMARY,
                'sections': ['overview', 'performance', 'highlights']
            },
            {
                'id': 'comparative_analysis',
                'name': 'Multi-Class Comparison',
                'description': 'Compare performance across multiple classes with detailed analysis',
                'type': ReportType.COMPARATIVE_ANALYSIS,
                'sections': ['comparison', 'subjects', 'trends', 'insights']
            }
        ]