"""
Property Tests for Report Data Integrity

Tests that validate the integrity and consistency of generated reports
as specified in Requirements 7.1 and 7.3.
"""

import pytest
from hypothesis import given, strategies as st, assume, settings
from datetime import datetime, timedelta
from uuid import uuid4
from sqlalchemy.orm import Session
from unittest.mock import Mock, patch
from decimal import Decimal

from app.models.user import User
from app.models.teacher import Teacher, TeacherClass
from app.models.student_progress import StudentProgress, MasteryLevel
from app.models.gamification import Gamification
from app.models.quiz_attempt import QuizAttempt
from app.models.assessment import AssessmentAttempt
from app.services.report_service import ReportService, ReportType


# Test data generators
@st.composite
def generate_student_data(draw):
    """Generate realistic student data for reports"""
    student_id = str(uuid4())
    return {
        'id': student_id,
        'full_name': draw(st.text(min_size=5, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Zs')))),
        'email': f"student_{student_id[:8]}@school.edu",
        'role': 'student'
    }


@st.composite
def generate_progress_records(draw, student_id, date_range):
    """Generate realistic progress records for a student"""
    num_records = draw(st.integers(min_value=5, max_value=50))
    subjects = draw(st.lists(st.sampled_from(['Math', 'Science', 'English', 'History', 'Bengali']), min_size=1, max_size=3))
    
    records = []
    for _ in range(num_records):
        record = {
            'user_id': student_id,
            'subject': draw(st.sampled_from(subjects)),
            'topic': draw(st.text(min_size=5, max_size=30, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Zs')))),
            'score': draw(st.integers(min_value=0, max_value=100)),
            'xp_earned': draw(st.integers(min_value=0, max_value=50)),
            'time_spent': draw(st.integers(min_value=60, max_value=3600)),  # 1 minute to 1 hour
            'mastery_level': draw(st.sampled_from([MasteryLevel.LEARNING, MasteryLevel.PRACTICING, MasteryLevel.MASTERED])),
            'updated_at': draw(st.datetimes(min_value=date_range[0], max_value=date_range[1]))
        }
        records.append(record)
    
    return records


@st.composite
def generate_quiz_attempts(draw, student_id, date_range):
    """Generate realistic quiz attempts for a student"""
    num_attempts = draw(st.integers(min_value=3, max_value=20))
    
    attempts = []
    for _ in range(num_attempts):
        attempt = {
            'user_id': student_id,
            'quiz_id': str(uuid4()),
            'score': draw(st.integers(min_value=0, max_value=100)),
            'total_questions': draw(st.integers(min_value=5, max_value=20)),
            'correct_answers': None,  # Will be calculated from score
            'time_taken': draw(st.integers(min_value=300, max_value=1800)),  # 5-30 minutes
            'completed_at': draw(st.datetimes(min_value=date_range[0], max_value=date_range[1]))
        }
        # Calculate correct answers from score
        attempt['correct_answers'] = int((attempt['score'] / 100) * attempt['total_questions'])
        attempts.append(attempt)
    
    return attempts


@st.composite
def generate_gamification_data(draw, student_id):
    """Generate realistic gamification data for a student"""
    return {
        'user_id': student_id,
        'total_xp': draw(st.integers(min_value=0, max_value=10000)),
        'level': draw(st.integers(min_value=1, max_value=50)),
        'current_streak': draw(st.integers(min_value=0, max_value=100)),
        'longest_streak': draw(st.integers(min_value=0, max_value=200))
    }


class TestReportDataIntegrity:
    """Test report data integrity properties"""

    @given(
        student_data=generate_student_data(),
        date_range=st.tuples(
            st.datetimes(min_value=datetime(2023, 1, 1), max_value=datetime(2024, 1, 1)),
            st.datetimes(min_value=datetime(2024, 1, 1), max_value=datetime(2024, 12, 31))
        ).map(lambda x: (x[0], x[1]) if x[0] < x[1] else (x[1], x[0]))
    )
    @settings(max_examples=30, deadline=None)
    def test_individual_student_report_data_integrity_property(self, student_data, date_range):
        """
        Property 8: Report Data Integrity (Individual Student Reports)
        
        Tests that individual student reports maintain data integrity:
        1. All calculated metrics are mathematically consistent
        2. Data aggregations match source data
        3. No data is lost or corrupted during report generation
        4. Percentages and averages are correctly calculated
        5. Date ranges are properly applied
        """
        # Create mock database session
        mock_db = Mock(spec=Session)
        
        # Generate test data
        progress_records = generate_progress_records(student_data['id'], date_range).example()
        quiz_attempts = generate_quiz_attempts(student_data['id'], date_range).example()
        gamification_data = generate_gamification_data(student_data['id']).example()
        
        # Create mock objects
        student_user = Mock(spec=User)
        student_user.id = student_data['id']
        student_user.full_name = student_data['full_name']
        student_user.email = student_data['email']
        
        gamification_obj = Mock(spec=Gamification)
        for key, value in gamification_data.items():
            setattr(gamification_obj, key, value)
        
        progress_objs = []
        for record in progress_records:
            progress_obj = Mock(spec=StudentProgress)
            for key, value in record.items():
                setattr(progress_obj, key, value)
            progress_objs.append(progress_obj)
        
        quiz_objs = []
        for attempt in quiz_attempts:
            quiz_obj = Mock(spec=QuizAttempt)
            for key, value in attempt.items():
                setattr(quiz_obj, key, value)
            quiz_objs.append(quiz_obj)
        
        # Mock database queries
        def mock_query_side_effect(model):
            query_mock = Mock()
            if model == User:
                query_mock.filter.return_value.first.return_value = student_user
            elif model == Gamification:
                query_mock.filter.return_value.first.return_value = gamification_obj
            elif model == StudentProgress:
                query_mock.filter.return_value.all.return_value = progress_objs
            elif model == QuizAttempt:
                query_mock.filter.return_value.all.return_value = quiz_objs
            elif model == AssessmentAttempt:
                query_mock.filter.return_value.all.return_value = []  # No assessment attempts
            return query_mock
        
        mock_db.query.side_effect = mock_query_side_effect
        
        # Create report service and generate report
        service = ReportService(mock_db)
        
        # Test report generation
        import asyncio
        report_data = asyncio.run(service.generate_individual_student_report(
            teacher_id=str(uuid4()),
            student_id=student_data['id'],
            date_from=date_range[0],
            date_to=date_range[1]
        ))
        
        # Property 1: Report structure integrity
        assert report_data['report_type'] == ReportType.INDIVIDUAL_STUDENT
        assert 'student_info' in report_data
        assert 'report_period' in report_data
        assert 'overview_metrics' in report_data
        assert 'performance_metrics' in report_data
        assert 'subject_performance' in report_data
        
        # Property 2: Student information consistency
        assert report_data['student_info']['id'] == student_data['id']
        assert report_data['student_info']['name'] == student_data['full_name']
        assert report_data['student_info']['email'] == student_data['email']
        
        # Property 3: Date range consistency
        assert report_data['report_period']['start_date'] == date_range[0]
        assert report_data['report_period']['end_date'] == date_range[1]
        assert report_data['report_period']['days'] == (date_range[1] - date_range[0]).days
        
        # Property 4: XP calculation integrity
        expected_xp_gained = sum(record['xp_earned'] for record in progress_records if record['xp_earned'])
        assert report_data['overview_metrics']['xp_gained_period'] == expected_xp_gained
        
        # Property 5: Time calculation integrity
        expected_time_spent = sum(record['time_spent'] for record in progress_records if record['time_spent'])
        assert report_data['overview_metrics']['total_time_spent'] == expected_time_spent
        
        # Property 6: Quiz performance calculation integrity
        if quiz_attempts:
            quiz_scores = [attempt['score'] for attempt in quiz_attempts if attempt['score'] is not None]
            expected_avg_quiz_score = sum(quiz_scores) / len(quiz_scores) if quiz_scores else 0
            assert abs(report_data['performance_metrics']['average_quiz_score'] - expected_avg_quiz_score) < 0.01
        
        # Property 7: Subject performance aggregation integrity
        subject_data = {}
        for record in progress_records:
            if record['subject'] and record['score'] is not None:
                if record['subject'] not in subject_data:
                    subject_data[record['subject']] = {
                        'scores': [],
                        'time_spent': 0,
                        'xp_earned': 0,
                        'topics_completed': 0
                    }
                subject_data[record['subject']]['scores'].append(record['score'])
                subject_data[record['subject']]['time_spent'] += record['time_spent'] or 0
                subject_data[record['subject']]['xp_earned'] += record['xp_earned'] or 0
                if record['mastery_level'] == MasteryLevel.MASTERED:
                    subject_data[record['subject']]['topics_completed'] += 1
        
        for subject, expected_data in subject_data.items():
            if subject in report_data['subject_performance']:
                reported_data = report_data['subject_performance'][subject]
                expected_avg = sum(expected_data['scores']) / len(expected_data['scores'])
                
                assert abs(reported_data['average_score'] - expected_avg) < 0.01
                assert reported_data['time_spent'] == expected_data['time_spent']
                assert reported_data['xp_earned'] == expected_data['xp_earned']
                assert reported_data['topics_completed'] == expected_data['topics_completed']
        
        # Property 8: Strengths and weaknesses logic integrity
        strengths = report_data['strengths']
        weaknesses = report_data['weaknesses']
        
        for strength in strengths:
            assert strength['average_score'] >= 85  # Strength threshold
        
        for weakness in weaknesses:
            assert weakness['average_score'] < 70  # Weakness threshold
        
        # Property 9: Activity timeline integrity
        timeline = report_data['activity_timeline']
        assert len(timeline) <= 20  # Should be limited to last 20 activities
        
        # Property 10: Generated timestamp integrity
        assert isinstance(report_data['generated_at'], datetime)
        assert report_data['generated_at'] <= datetime.utcnow()

    @given(
        class_size=st.integers(min_value=5, max_value=30),
        date_range=st.tuples(
            st.datetimes(min_value=datetime(2023, 1, 1), max_value=datetime(2024, 1, 1)),
            st.datetimes(min_value=datetime(2024, 1, 1), max_value=datetime(2024, 12, 31))
        ).map(lambda x: (x[0], x[1]) if x[0] < x[1] else (x[1], x[0]))
    )
    @settings(max_examples=20, deadline=None)
    def test_class_summary_report_data_integrity_property(self, class_size, date_range):
        """
        Property 9: Report Data Integrity (Class Summary Reports)
        
        Tests that class summary reports maintain data integrity:
        1. Student counts are accurate
        2. Engagement rates are correctly calculated
        3. Performance distributions sum to total students
        4. Subject performance aggregations are consistent
        5. Top performers and at-risk students are correctly identified
        """
        # Create mock database session
        mock_db = Mock(spec=Session)
        
        # Generate class and student data
        teacher_id = str(uuid4())
        class_id = str(uuid4())
        
        students = []
        all_progress_records = []
        all_quiz_attempts = []
        
        for i in range(class_size):
            student_data = generate_student_data().example()
            students.append(student_data)
            
            # Generate progress records for each student
            progress_records = generate_progress_records(student_data['id'], date_range).example()
            all_progress_records.extend(progress_records)
            
            # Generate quiz attempts for each student
            quiz_attempts = generate_quiz_attempts(student_data['id'], date_range).example()
            all_quiz_attempts.extend(quiz_attempts)
        
        # Create mock objects
        teacher_class = Mock(spec=TeacherClass)
        teacher_class.id = class_id
        teacher_class.name = "Test Class"
        teacher_class.grade = 10
        teacher_class.subject = "Mathematics"
        teacher_class.student_ids = [s['id'] for s in students]
        
        student_objs = []
        for student_data in students:
            student_obj = Mock(spec=User)
            student_obj.id = student_data['id']
            student_obj.full_name = student_data['full_name']
            student_obj.email = student_data['email']
            student_objs.append(student_obj)
        
        progress_objs = []
        for record in all_progress_records:
            progress_obj = Mock(spec=StudentProgress)
            for key, value in record.items():
                setattr(progress_obj, key, value)
            progress_objs.append(progress_obj)
        
        quiz_objs = []
        for attempt in all_quiz_attempts:
            quiz_obj = Mock(spec=QuizAttempt)
            for key, value in attempt.items():
                setattr(quiz_obj, key, value)
            quiz_objs.append(quiz_obj)
        
        # Mock database queries
        def mock_query_side_effect(model):
            query_mock = Mock()
            if model == TeacherClass:
                query_mock.filter.return_value.first.return_value = teacher_class
            elif model == User:
                query_mock.filter.return_value.all.return_value = student_objs
            elif model == StudentProgress:
                query_mock.filter.return_value.all.return_value = progress_objs
            elif model == QuizAttempt:
                query_mock.filter.return_value.all.return_value = quiz_objs
            return query_mock
        
        mock_db.query.side_effect = mock_query_side_effect
        
        # Create report service and generate report
        service = ReportService(mock_db)
        
        import asyncio
        report_data = asyncio.run(service.generate_class_summary_report(
            teacher_id=teacher_id,
            class_id=class_id,
            date_from=date_range[0],
            date_to=date_range[1]
        ))
        
        # Property 1: Report structure integrity
        assert report_data['report_type'] == ReportType.CLASS_SUMMARY
        assert 'class_info' in report_data
        assert 'overview_metrics' in report_data
        assert 'subject_performance' in report_data
        assert 'performance_distribution' in report_data
        
        # Property 2: Class information consistency
        assert report_data['class_info']['id'] == class_id
        assert report_data['class_info']['name'] == "Test Class"
        
        # Property 3: Student count integrity
        assert report_data['overview_metrics']['total_students'] == class_size
        
        # Property 4: Active student count integrity
        active_students = len(set(record['user_id'] for record in all_progress_records))
        assert report_data['overview_metrics']['active_students'] == active_students
        
        # Property 5: Engagement rate calculation integrity
        expected_engagement_rate = (active_students / class_size) * 100 if class_size > 0 else 0
        assert abs(report_data['overview_metrics']['engagement_rate'] - expected_engagement_rate) < 0.01
        
        # Property 6: Performance distribution integrity
        distribution = report_data['performance_distribution']
        total_in_distribution = (
            distribution['excellent'] + 
            distribution['good'] + 
            distribution['satisfactory'] + 
            distribution['needs_improvement']
        )
        
        # The distribution should not exceed the number of students with performance data
        student_performance_count = len(set(
            record['user_id'] for record in all_progress_records 
            if record['score'] is not None
        ))
        assert total_in_distribution <= student_performance_count
        
        # Property 7: Top performers integrity
        top_performers = report_data['top_performers']
        assert len(top_performers) <= 5  # Should be limited to top 5
        assert len(top_performers) <= student_performance_count  # Can't exceed students with data
        
        # Verify top performers are sorted by score (descending)
        for i in range(1, len(top_performers)):
            assert top_performers[i-1]['average_score'] >= top_performers[i]['average_score']
        
        # Property 8: At-risk students integrity
        at_risk_students = report_data['at_risk_students']
        for student in at_risk_students:
            assert student['average_score'] < 70  # Below threshold
        
        # Property 9: Subject performance aggregation integrity
        subject_stats = {}
        for record in all_progress_records:
            if record['subject'] and record['score'] is not None:
                if record['subject'] not in subject_stats:
                    subject_stats[record['subject']] = {
                        'scores': [],
                        'students': set(),
                        'time_spent': 0
                    }
                subject_stats[record['subject']]['scores'].append(record['score'])
                subject_stats[record['subject']]['students'].add(record['user_id'])
                subject_stats[record['subject']]['time_spent'] += record['time_spent'] or 0
        
        for subject, expected_stats in subject_stats.items():
            if subject in report_data['subject_performance']:
                reported_perf = report_data['subject_performance'][subject]
                expected_avg = sum(expected_stats['scores']) / len(expected_stats['scores'])
                expected_participation = (len(expected_stats['students']) / class_size) * 100
                
                assert abs(reported_perf['average_score'] - expected_avg) < 0.01
                assert abs(reported_perf['participation_rate'] - expected_participation) < 0.01
                assert reported_perf['total_time_spent'] == expected_stats['time_spent']

    @given(
        num_classes=st.integers(min_value=2, max_value=5),
        students_per_class=st.integers(min_value=5, max_value=15)
    )
    @settings(max_examples=15, deadline=None)
    def test_comparative_analysis_report_data_integrity_property(self, num_classes, students_per_class):
        """
        Property 10: Report Data Integrity (Comparative Analysis Reports)
        
        Tests that comparative analysis reports maintain data integrity:
        1. All individual class reports are included
        2. Comparison metrics are correctly calculated
        3. Subject comparisons aggregate data properly
        4. Class rankings are consistent with individual metrics
        5. Overall averages match individual class data
        """
        # This test would be similar to the class summary test but with multiple classes
        # For brevity, I'll implement a simplified version focusing on key integrity checks
        
        # Create mock database session
        mock_db = Mock(spec=Session)
        
        teacher_id = str(uuid4())
        class_ids = [str(uuid4()) for _ in range(num_classes)]
        
        # Mock the individual class report generation
        with patch.object(ReportService, 'generate_class_summary_report') as mock_class_report:
            # Create mock class reports
            mock_reports = []
            total_students = 0
            total_engagement = 0
            total_performance = 0
            
            for i, class_id in enumerate(class_ids):
                class_report = {
                    'report_type': ReportType.CLASS_SUMMARY,
                    'class_info': {
                        'id': class_id,
                        'name': f"Class {i+1}",
                        'grade': 10,
                        'subject': 'Math'
                    },
                    'overview_metrics': {
                        'total_students': students_per_class,
                        'active_students': students_per_class - 1,  # One inactive per class
                        'engagement_rate': ((students_per_class - 1) / students_per_class) * 100,
                        'class_average': 75 + (i * 5),  # Varying performance
                        'average_quiz_score': 70 + (i * 5)
                    },
                    'subject_performance': {
                        'Math': {
                            'average_score': 75 + (i * 5),
                            'participation_rate': 90.0
                        }
                    },
                    'top_performers': [],
                    'at_risk_students': []
                }
                mock_reports.append(class_report)
                total_students += students_per_class
                total_engagement += class_report['overview_metrics']['engagement_rate']
                total_performance += class_report['overview_metrics']['class_average']
            
            mock_class_report.side_effect = mock_reports
            
            # Create report service and generate comparative report
            service = ReportService(mock_db)
            
            import asyncio
            report_data = asyncio.run(service.generate_comparative_analysis_report(
                teacher_id=teacher_id,
                class_ids=class_ids,
                date_from=datetime.now() - timedelta(days=30),
                date_to=datetime.now()
            ))
            
            # Property 1: Report structure integrity
            assert report_data['report_type'] == ReportType.COMPARATIVE_ANALYSIS
            assert 'classes_compared' in report_data
            assert 'comparison_metrics' in report_data
            assert 'class_comparisons' in report_data
            assert 'individual_class_reports' in report_data
            
            # Property 2: Classes compared count integrity
            assert report_data['classes_compared'] == len(mock_reports)
            
            # Property 3: Individual class reports integrity
            assert len(report_data['individual_class_reports']) == len(mock_reports)
            
            # Property 4: Comparison metrics calculation integrity
            expected_avg_engagement = total_engagement / num_classes
            expected_avg_performance = total_performance / num_classes
            
            assert report_data['comparison_metrics']['total_students'] == total_students
            assert abs(report_data['comparison_metrics']['average_engagement'] - expected_avg_engagement) < 0.01
            assert abs(report_data['comparison_metrics']['average_performance'] - expected_avg_performance) < 0.01
            
            # Property 5: Class comparisons integrity
            class_comparisons = report_data['class_comparisons']
            assert len(class_comparisons) == num_classes
            
            # Verify sorting (should be by class_average descending)
            for i in range(1, len(class_comparisons)):
                assert class_comparisons[i-1]['class_average'] >= class_comparisons[i]['class_average']
            
            # Property 6: Subject comparison integrity
            subject_comparison = report_data['subject_comparison']
            if 'Math' in subject_comparison:
                math_data = subject_comparison['Math']
                assert len(math_data['class_data']) == num_classes
                
                # Verify overall average calculation
                class_averages = [data['average_score'] for data in math_data['class_data']]
                expected_overall_avg = sum(class_averages) / len(class_averages)
                assert abs(math_data['overall_average'] - expected_overall_avg) < 0.01


if __name__ == "__main__":
    pytest.main([__file__, "-v"])