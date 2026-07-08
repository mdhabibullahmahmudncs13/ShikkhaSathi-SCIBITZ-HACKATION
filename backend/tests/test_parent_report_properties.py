"""
Property-based tests for parent report generation.

**Feature: shikkhasathi-platform, Property 20: Parent Report Generation**
**Validates: Requirements 7.4, 7.5**

Property 20: Parent Report Generation
For any reporting period, the system should generate weekly progress summaries 
with insights, recommendations, and privacy-protected comparative data
"""

import pytest
from hypothesis import given, strategies as st, assume, settings
from datetime import datetime, timedelta, date
import uuid
from typing import Dict, Any, List
from unittest.mock import Mock, MagicMock

from app.services.parent_notification_service import ParentNotificationService


# Test data generators
@st.composite
def generate_week_start_date(draw):
    """Generate a valid week start date"""
    # Generate a date within the last 12 weeks, ensuring it's a Monday
    base_date = datetime.now() - timedelta(weeks=12)
    
    # Ensure base_date is a Monday
    days_to_monday = base_date.weekday()
    base_monday = base_date - timedelta(days=days_to_monday)
    
    # Generate week offset (0-11 weeks from base Monday)
    week_offset = draw(st.integers(min_value=0, max_value=11))
    week_start = base_monday + timedelta(weeks=week_offset)
    
    # Normalize to remove microseconds for proper uniqueness
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    
    return week_start


@st.composite
def generate_child_data_for_report(draw):
    """Generate child data for report testing"""
    return {
        'child_id': str(uuid.uuid4()),
        'child_name': draw(st.text(min_size=2, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Zs')))),
        'grade': draw(st.integers(min_value=6, max_value=12)),
        'total_xp': draw(st.integers(min_value=0, max_value=10000)),
        'current_streak': draw(st.integers(min_value=0, max_value=100))
    }


@st.composite
def generate_progress_records(draw, child_id: str, week_start: datetime):
    """Generate progress records for a week"""
    subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Bangla']
    topics = {
        'Mathematics': ['Algebra', 'Geometry', 'Calculus', 'Statistics'],
        'Physics': ['Mechanics', 'Thermodynamics', 'Optics', 'Electricity'],
        'Chemistry': ['Organic', 'Inorganic', 'Physical Chemistry'],
        'Biology': ['Cell Biology', 'Genetics', 'Ecology'],
        'English': ['Grammar', 'Literature', 'Composition'],
        'Bangla': ['Grammar', 'Literature', 'Composition']
    }
    
    records = []
    num_records = draw(st.integers(min_value=1, max_value=20))
    
    for _ in range(num_records):
        subject = draw(st.sampled_from(subjects))
        topic = draw(st.sampled_from(topics[subject]))
        
        # Generate timestamp within the week
        days_offset = draw(st.integers(min_value=0, max_value=6))
        hours_offset = draw(st.integers(min_value=0, max_value=23))
        timestamp = week_start + timedelta(days=days_offset, hours=hours_offset)
        
        record = Mock()
        record.user_id = child_id
        record.subject = subject
        record.topic = topic
        record.bloom_level = draw(st.integers(min_value=1, max_value=6))
        record.completion_percentage = draw(st.floats(min_value=0.0, max_value=100.0))
        record.time_spent_minutes = draw(st.integers(min_value=5, max_value=120))
        record.last_accessed = timestamp
        
        records.append(record)
    
    return records


@st.composite
def generate_quiz_attempts(draw, child_id: str, week_start: datetime):
    """Generate quiz attempts for a week"""
    attempts = []
    num_attempts = draw(st.integers(min_value=0, max_value=15))
    
    for _ in range(num_attempts):
        # Generate timestamp within the week
        days_offset = draw(st.integers(min_value=0, max_value=6))
        hours_offset = draw(st.integers(min_value=0, max_value=23))
        timestamp = week_start + timedelta(days=days_offset, hours=hours_offset)
        
        max_score = draw(st.integers(min_value=10, max_value=100))
        score = draw(st.integers(min_value=0, max_value=max_score))
        
        attempt = Mock()
        attempt.user_id = child_id
        attempt.quiz_id = str(uuid.uuid4())
        attempt.score = score
        attempt.max_score = max_score
        attempt.time_taken_seconds = draw(st.integers(min_value=60, max_value=3600))
        attempt.difficulty_level = draw(st.integers(min_value=1, max_value=5))
        attempt.bloom_level = draw(st.integers(min_value=1, max_value=6))
        attempt.completed_at = timestamp
        attempt.answers = {}
        
        attempts.append(attempt)
    
    return attempts


def create_mock_notification_service_with_data(child_data, progress_records, quiz_attempts, gamification_data):
    """Create a mock notification service with test data"""
    mock_db = Mock()
    service = ParentNotificationService(mock_db)
    
    # Create a mock query chain that returns the correct data
    def create_mock_query_chain(return_data, is_single=False):
        mock_query = Mock()
        mock_filter = Mock()
        mock_query.filter.return_value = mock_filter
        mock_filter.filter.return_value = mock_filter  # For chained filters
        
        if is_single:
            mock_filter.first.return_value = return_data
        else:
            mock_filter.all.return_value = return_data
        
        return mock_query
    
    # Mock user query
    user_mock = Mock()
    user_mock.id = child_data['child_id']
    user_mock.full_name = child_data['child_name']
    user_mock.grade = child_data['grade']
    
    # Set up the mock database queries based on model type
    def mock_query(model):
        model_name = getattr(model, '__name__', str(model))
        
        if 'User' in str(model):
            return create_mock_query_chain(user_mock, is_single=True)
        elif 'StudentProgress' in str(model):
            return create_mock_query_chain(progress_records, is_single=False)
        elif 'QuizAttempt' in str(model):
            return create_mock_query_chain(quiz_attempts, is_single=False)
        elif 'Gamification' in str(model):
            return create_mock_query_chain(gamification_data, is_single=True)
        else:
            return create_mock_query_chain([], is_single=False)
    
    mock_db.query.side_effect = mock_query
    
    return service


@given(
    child_data=generate_child_data_for_report(),
    week_start=generate_week_start_date(),
    progress_data=st.data(),
    quiz_data=st.data()
)
@settings(max_examples=50, deadline=15000)
def test_weekly_report_generation_completeness_property(child_data, week_start, progress_data, quiz_data):
    """
    **Feature: shikkhasathi-platform, Property 20: Parent Report Generation**
    
    Property test: For any reporting period, the system should generate weekly 
    progress summaries with insights, recommendations, and privacy-protected comparative data.
    """
    # Generate test data
    progress_records = progress_data.draw(generate_progress_records(child_data['child_id'], week_start))
    quiz_attempts = quiz_data.draw(generate_quiz_attempts(child_data['child_id'], week_start))
    
    # Create mock gamification data
    gamification_data = Mock()
    gamification_data.current_streak = child_data['current_streak']
    gamification_data.total_xp = child_data['total_xp']
    
    # Create service with mock data
    service = create_mock_notification_service_with_data(
        child_data, progress_records, quiz_attempts, gamification_data
    )
    
    # Generate weekly report
    report = service.generate_weekly_report(child_data['child_id'], week_start)
    
    # Verify report structure and completeness
    verify_weekly_report_completeness(report, child_data, week_start)
    
    # Verify summary data is calculated correctly
    verify_weekly_summary_accuracy(report, progress_records, quiz_attempts)
    
    # Verify subject breakdown is complete
    verify_subject_breakdown_completeness(report, progress_records, quiz_attempts)
    
    # Verify recommendations are provided
    verify_recommendations_completeness(report)
    
    # Verify comparative analytics are privacy-protected
    verify_comparative_analytics_privacy(report)


@given(
    child_data_list=st.lists(generate_child_data_for_report(), min_size=1, max_size=3),
    week_start=generate_week_start_date(),
    data=st.data()
)
@settings(max_examples=20, deadline=20000)
def test_multiple_children_report_consistency_property(child_data_list, week_start, data):
    """
    **Feature: shikkhasathi-platform, Property 20: Parent Report Generation**
    
    Property test: For any parent with multiple children, the system should 
    generate consistent reports for all children with the same structure and quality.
    """
    parent_id = str(uuid.uuid4())
    reports = []
    
    for child_data in child_data_list:
        # Generate test data for each child
        progress_records = data.draw(generate_progress_records(child_data['child_id'], week_start))
        quiz_attempts = data.draw(generate_quiz_attempts(child_data['child_id'], week_start))
        
        gamification_data = Mock()
        gamification_data.current_streak = child_data['current_streak']
        gamification_data.total_xp = child_data['total_xp']
        
        # Create service with mock data
        service = create_mock_notification_service_with_data(
            child_data, progress_records, quiz_attempts, gamification_data
        )
        
        # Generate report
        report = service.generate_weekly_report(child_data['child_id'], week_start)
        reports.append(report)
        
        # Verify individual report completeness
        verify_weekly_report_completeness(report, child_data, week_start)
    
    # Verify consistency across all reports
    verify_reports_consistency(reports, week_start)


@given(
    child_data=generate_child_data_for_report(),
    week_starts=st.lists(generate_week_start_date(), min_size=2, max_size=3, unique=True),
    data=st.data()
)
@settings(max_examples=20, deadline=20000)
def test_multiple_weeks_report_consistency_property(child_data, week_starts, data):
    """
    **Feature: shikkhasathi-platform, Property 20: Parent Report Generation**
    
    Property test: For any child across multiple reporting periods, the system 
    should generate consistent report structures and maintain data integrity.
    """
    reports = []
    
    for week_start in sorted(week_starts):
        # Generate test data for each week
        progress_records = data.draw(generate_progress_records(child_data['child_id'], week_start))
        quiz_attempts = data.draw(generate_quiz_attempts(child_data['child_id'], week_start))
        
        gamification_data = Mock()
        gamification_data.current_streak = child_data['current_streak']
        gamification_data.total_xp = child_data['total_xp']
        
        # Create service with mock data
        service = create_mock_notification_service_with_data(
            child_data, progress_records, quiz_attempts, gamification_data
        )
        
        # Generate report
        report = service.generate_weekly_report(child_data['child_id'], week_start)
        reports.append(report)
        
        # Verify individual report completeness
        verify_weekly_report_completeness(report, child_data, week_start)
    
    # Verify temporal consistency
    verify_temporal_report_consistency(reports, child_data)


def verify_weekly_report_completeness(report: Dict[str, Any], child_data: Dict[str, Any], week_start: datetime):
    """Verify that a weekly report contains all required fields and data"""
    # Required top-level fields (Requirement 7.4)
    required_fields = [
        'id', 'childId', 'childName', 'weekStartDate', 'weekEndDate',
        'summary', 'subjectBreakdown', 'achievements', 'recommendations',
        'comparativeAnalytics', 'generatedAt'
    ]
    
    for field in required_fields:
        assert field in report, f"Report missing required field: {field}"
        assert report[field] is not None, f"Report field {field} should not be None"
    
    # Verify basic report metadata
    assert isinstance(report['id'], str), "Report ID should be string"
    assert len(report['id']) > 0, "Report ID should not be empty"
    assert report['childId'] == child_data['child_id'], "Child ID should match"
    assert report['childName'] == child_data['child_name'], "Child name should match"
    assert isinstance(report['weekStartDate'], datetime), "Week start should be datetime"
    assert isinstance(report['weekEndDate'], datetime), "Week end should be datetime"
    assert isinstance(report['generatedAt'], datetime), "Generated at should be datetime"
    
    # Verify week dates are correct
    expected_week_end = week_start + timedelta(days=7)
    assert report['weekStartDate'] == week_start, "Week start date should match"
    assert report['weekEndDate'] == expected_week_end, "Week end date should be 7 days after start"
    
    # Verify generation timestamp is recent
    now = datetime.now()
    time_diff = abs((now - report['generatedAt']).total_seconds())
    assert time_diff < 300, "Report generation timestamp should be recent (within 5 minutes)"


def verify_weekly_summary_accuracy(report: Dict[str, Any], progress_records: List, quiz_attempts: List):
    """Verify that weekly summary calculations are accurate"""
    summary = report['summary']
    
    # Required summary fields (Requirement 7.4)
    required_summary_fields = [
        'totalTimeSpent', 'quizzesCompleted', 'averageScore', 'streakDays',
        'xpGained', 'levelsGained', 'topicsCompleted', 'improvementAreas', 'strengths'
    ]
    
    for field in required_summary_fields:
        assert field in summary, f"Summary missing required field: {field}"
    
    # Verify data types and ranges
    assert isinstance(summary['totalTimeSpent'], int), "Total time spent should be integer"
    assert summary['totalTimeSpent'] >= 0, "Total time spent should be non-negative"
    assert isinstance(summary['quizzesCompleted'], int), "Quizzes completed should be integer"
    assert summary['quizzesCompleted'] >= 0, "Quizzes completed should be non-negative"
    assert isinstance(summary['averageScore'], (int, float)), "Average score should be numeric"
    assert 0 <= summary['averageScore'] <= 100, "Average score should be between 0 and 100"
    assert isinstance(summary['streakDays'], int), "Streak days should be integer"
    assert summary['streakDays'] >= 0, "Streak days should be non-negative"
    assert isinstance(summary['xpGained'], int), "XP gained should be integer"
    assert summary['xpGained'] >= 0, "XP gained should be non-negative"
    assert isinstance(summary['topicsCompleted'], int), "Topics completed should be integer"
    assert summary['topicsCompleted'] >= 0, "Topics completed should be non-negative"
    assert isinstance(summary['improvementAreas'], list), "Improvement areas should be list"
    assert isinstance(summary['strengths'], list), "Strengths should be list"
    
    # Verify calculations are reasonable
    expected_quiz_count = len(quiz_attempts)
    assert summary['quizzesCompleted'] == expected_quiz_count, "Quiz count should match actual attempts"
    
    if quiz_attempts:
        expected_avg_score = sum(q.score * 100.0 / q.max_score for q in quiz_attempts) / len(quiz_attempts)
        assert abs(summary['averageScore'] - expected_avg_score) < 0.1, "Average score should be calculated correctly"
    else:
        assert summary['averageScore'] == 0, "Average score should be 0 when no quizzes completed"


def verify_subject_breakdown_completeness(report: Dict[str, Any], progress_records: List, quiz_attempts: List):
    """Verify that subject breakdown is complete and accurate"""
    subject_breakdown = report['subjectBreakdown']
    
    assert isinstance(subject_breakdown, list), "Subject breakdown should be list"
    
    # Get unique subjects from progress records
    subjects_in_progress = set(p.subject for p in progress_records)
    
    # Verify each subject has complete breakdown
    for subject_data in subject_breakdown:
        required_subject_fields = [
            'subject', 'timeSpent', 'quizzesCompleted', 'averageScore',
            'topicsStudied', 'improvementFromLastWeek', 'bloomLevelDistribution'
        ]
        
        for field in required_subject_fields:
            assert field in subject_data, f"Subject breakdown missing required field: {field}"
        
        # Verify data types and ranges
        assert isinstance(subject_data['subject'], str), "Subject name should be string"
        assert len(subject_data['subject']) > 0, "Subject name should not be empty"
        assert isinstance(subject_data['timeSpent'], int), "Time spent should be integer"
        assert subject_data['timeSpent'] >= 0, "Time spent should be non-negative"
        assert isinstance(subject_data['quizzesCompleted'], int), "Quizzes completed should be integer"
        assert subject_data['quizzesCompleted'] >= 0, "Quizzes completed should be non-negative"
        assert isinstance(subject_data['averageScore'], (int, float)), "Average score should be numeric"
        assert 0 <= subject_data['averageScore'] <= 100, "Average score should be between 0 and 100"
        assert isinstance(subject_data['topicsStudied'], list), "Topics studied should be list"
        assert isinstance(subject_data['improvementFromLastWeek'], (int, float)), "Improvement should be numeric"
        assert isinstance(subject_data['bloomLevelDistribution'], dict), "Bloom distribution should be dict"
        
        # Verify Bloom level distribution has all levels
        for level in range(1, 7):
            level_key = f'level{level}'
            assert level_key in subject_data['bloomLevelDistribution'], f"Missing Bloom level {level}"
            assert isinstance(subject_data['bloomLevelDistribution'][level_key], int), f"Bloom level {level} count should be integer"
            assert subject_data['bloomLevelDistribution'][level_key] >= 0, f"Bloom level {level} count should be non-negative"


def verify_recommendations_completeness(report: Dict[str, Any]):
    """Verify that recommendations are complete and well-formed"""
    recommendations = report['recommendations']
    
    assert isinstance(recommendations, list), "Recommendations should be list"
    
    for recommendation in recommendations:
        required_recommendation_fields = [
            'type', 'title', 'description', 'priority', 'actionItems',
            'estimatedImpact', 'timeframe'
        ]
        
        for field in required_recommendation_fields:
            assert field in recommendation, f"Recommendation missing required field: {field}"
        
        # Verify data types and values
        assert recommendation['type'] in ['study_schedule', 'additional_practice', 'reward_system', 'teacher_contact'], "Invalid recommendation type"
        assert isinstance(recommendation['title'], str), "Title should be string"
        assert len(recommendation['title']) > 0, "Title should not be empty"
        assert isinstance(recommendation['description'], str), "Description should be string"
        assert len(recommendation['description']) > 0, "Description should not be empty"
        assert recommendation['priority'] in ['low', 'medium', 'high'], "Invalid priority"
        assert isinstance(recommendation['actionItems'], list), "Action items should be list"
        assert len(recommendation['actionItems']) > 0, "Should have at least one action item"
        assert recommendation['estimatedImpact'] in ['low', 'medium', 'high'], "Invalid estimated impact"
        assert isinstance(recommendation['timeframe'], str), "Timeframe should be string"
        assert len(recommendation['timeframe']) > 0, "Timeframe should not be empty"
        
        # Verify action items are strings
        for action_item in recommendation['actionItems']:
            assert isinstance(action_item, str), "Action item should be string"
            assert len(action_item) > 0, "Action item should not be empty"


def verify_comparative_analytics_privacy(report: Dict[str, Any]):
    """Verify that comparative analytics are privacy-protected (Requirement 7.5)"""
    comparative_analytics = report['comparativeAnalytics']
    
    assert isinstance(comparative_analytics, dict), "Comparative analytics should be dict"
    
    required_analytics_fields = [
        'classComparison', 'gradeComparison', 'subjectComparisons', 'privacyNote'
    ]
    
    for field in required_analytics_fields:
        assert field in comparative_analytics, f"Comparative analytics missing required field: {field}"
    
    # Verify privacy note is present (Requirement 7.5)
    privacy_note = comparative_analytics['privacyNote']
    assert isinstance(privacy_note, str), "Privacy note should be string"
    assert len(privacy_note) > 0, "Privacy note should not be empty"
    assert 'privacy' in privacy_note.lower(), "Privacy note should mention privacy"
    assert 'anonymized' in privacy_note.lower() or 'aggregated' in privacy_note.lower(), "Privacy note should mention data protection"
    
    # Verify class comparison data
    class_comparison = comparative_analytics['classComparison']
    required_class_fields = ['childRank', 'totalStudents', 'percentile', 'averageClassScore', 'childScore']
    for field in required_class_fields:
        assert field in class_comparison, f"Class comparison missing required field: {field}"
    
    assert isinstance(class_comparison['childRank'], int), "Child rank should be integer"
    assert class_comparison['childRank'] > 0, "Child rank should be positive"
    assert isinstance(class_comparison['totalStudents'], int), "Total students should be integer"
    assert class_comparison['totalStudents'] > 0, "Total students should be positive"
    assert class_comparison['childRank'] <= class_comparison['totalStudents'], "Child rank should not exceed total students"
    assert isinstance(class_comparison['percentile'], int), "Percentile should be integer"
    assert 0 <= class_comparison['percentile'] <= 100, "Percentile should be between 0 and 100"
    
    # Verify grade comparison data
    grade_comparison = comparative_analytics['gradeComparison']
    required_grade_fields = ['childRank', 'totalStudents', 'percentile', 'averageGradeScore', 'childScore']
    for field in required_grade_fields:
        assert field in grade_comparison, f"Grade comparison missing required field: {field}"
    
    # Verify subject comparisons
    subject_comparisons = comparative_analytics['subjectComparisons']
    assert isinstance(subject_comparisons, list), "Subject comparisons should be list"
    
    for subject_comparison in subject_comparisons:
        required_subject_comparison_fields = [
            'subject', 'childPerformance', 'classAverage', 'gradeAverage', 'trend', 'trendPercentage'
        ]
        for field in required_subject_comparison_fields:
            assert field in subject_comparison, f"Subject comparison missing required field: {field}"
        
        assert subject_comparison['trend'] in ['improving', 'stable', 'declining'], "Invalid trend value"
        assert isinstance(subject_comparison['trendPercentage'], (int, float)), "Trend percentage should be numeric"


def verify_reports_consistency(reports: List[Dict[str, Any]], week_start: datetime):
    """Verify consistency across multiple reports"""
    assert len(reports) > 0, "Should have at least one report"
    
    # Verify all reports have the same structure
    first_report_keys = set(reports[0].keys())
    for report in reports[1:]:
        assert set(report.keys()) == first_report_keys, "All reports should have the same structure"
    
    # Verify all reports are for the same week
    for report in reports:
        assert report['weekStartDate'] == week_start, "All reports should be for the same week"
        assert report['weekEndDate'] == week_start + timedelta(days=7), "All reports should have the same week end"
    
    # Verify all report IDs are unique
    report_ids = [report['id'] for report in reports]
    assert len(report_ids) == len(set(report_ids)), "All report IDs should be unique"


def verify_temporal_report_consistency(reports: List[Dict[str, Any]], child_data: Dict[str, Any]):
    """Verify consistency across reports for the same child over time"""
    assert len(reports) > 1, "Should have multiple reports for temporal consistency check"
    
    # Sort reports by week start date
    sorted_reports = sorted(reports, key=lambda r: r['weekStartDate'])
    
    # Verify all reports are for the same child
    for report in sorted_reports:
        assert report['childId'] == child_data['child_id'], "All reports should be for the same child"
        assert report['childName'] == child_data['child_name'], "All reports should have the same child name"
    
    # Verify temporal ordering
    for i in range(1, len(sorted_reports)):
        prev_report = sorted_reports[i-1]
        curr_report = sorted_reports[i]
        
        assert curr_report['weekStartDate'] > prev_report['weekStartDate'], "Reports should be in chronological order"
        assert curr_report['generatedAt'] >= prev_report['generatedAt'], "Generation timestamps should be in order"
    
    # Verify week gaps are reasonable (no overlapping weeks)
    for i in range(1, len(sorted_reports)):
        prev_end = sorted_reports[i-1]['weekEndDate']
        curr_start = sorted_reports[i]['weekStartDate']
        assert curr_start >= prev_end, "Report weeks should not overlap"


if __name__ == "__main__":
    # Run the property-based tests
    test_weekly_report_generation_completeness_property()
    test_multiple_children_report_consistency_property()
    test_multiple_weeks_report_consistency_property()
    print("Parent report generation property tests completed successfully!")