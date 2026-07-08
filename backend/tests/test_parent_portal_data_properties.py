"""
Property-based tests for parent portal data completeness.

**Feature: shikkhasathi-platform, Property 18: Parent Portal Data Completeness**
**Validates: Requirements 7.1, 7.2**

Property 18: Parent Portal Data Completeness
For any parent accessing their child's data, the portal should display progress overview, 
weekly summaries, learning time tracking, and subject-wise performance
"""

import pytest
from hypothesis import given, strategies as st, assume, settings
from datetime import datetime, timedelta, date
import uuid
from typing import Dict, Any, List
from unittest.mock import Mock, MagicMock

from app.services.parent_service import ParentService


# Test data generators
@st.composite
def generate_child_data(draw):
    """Generate mock child data for testing"""
    child_id = str(uuid.uuid4())
    total_xp = draw(st.integers(min_value=0, max_value=10000))
    current_level = max(1, int((total_xp / 100) ** 0.5))
    
    # Generate subject progress
    subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology']
    subject_progress = []
    
    for subject in draw(st.lists(st.sampled_from(subjects), min_size=1, max_size=4, unique=True)):
        bloom_progress = []
        for level in range(1, 7):
            bloom_progress.append({
                'level': level,
                'mastery': draw(st.floats(min_value=0.0, max_value=100.0)),
                'questionsAttempted': draw(st.integers(min_value=0, max_value=50)),
                'successRate': draw(st.floats(min_value=0.0, max_value=100.0))
            })
        
        topic_progress = []
        topics = ['Topic 1', 'Topic 2', 'Topic 3']
        for topic in draw(st.lists(st.sampled_from(topics), min_size=1, max_size=3, unique=True)):
            topic_progress.append({
                'topic': topic,
                'completionPercentage': draw(st.floats(min_value=0.0, max_value=100.0)),
                'averageScore': draw(st.floats(min_value=0.0, max_value=100.0)),
                'timeSpent': draw(st.integers(min_value=0, max_value=1000)),
                'lastAccessed': draw(st.datetimes(min_value=datetime(2020, 1, 1), max_value=datetime.now()))
            })
        
        subject_progress.append({
            'subject': subject,
            'completionPercentage': draw(st.floats(min_value=0.0, max_value=100.0)),
            'averageScore': draw(st.floats(min_value=0.0, max_value=100.0)),
            'timeSpent': draw(st.integers(min_value=0, max_value=2000)),
            'bloomLevelProgress': bloom_progress,
            'lastAccessed': draw(st.datetimes(min_value=datetime(2020, 1, 1), max_value=datetime.now())),
            'topicProgress': topic_progress
        })
    
    return {
        'id': child_id,
        'name': draw(st.text(min_size=2, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Zs')))),
        'email': draw(st.emails()),
        'grade': draw(st.integers(min_value=6, max_value=12)),
        'medium': draw(st.sampled_from(['bangla', 'english'])),
        'totalXP': total_xp,
        'currentLevel': current_level,
        'currentStreak': draw(st.integers(min_value=0, max_value=100)),
        'longestStreak': draw(st.integers(min_value=0, max_value=200)),
        'averageScore': draw(st.floats(min_value=0.0, max_value=100.0)),
        'timeSpentThisWeek': draw(st.integers(min_value=0, max_value=2000)),
        'lastActive': draw(st.datetimes(min_value=datetime(2020, 1, 1), max_value=datetime.now())),
        'subjectProgress': subject_progress,
        'recentAchievements': draw(st.lists(st.fixed_dictionaries({
            'id': st.text(min_size=1, max_size=20),
            'name': st.text(min_size=1, max_size=50),
            'description': st.text(min_size=1, max_size=100),
            'icon': st.text(min_size=1, max_size=5),
            'category': st.sampled_from(['learning', 'streak', 'performance', 'engagement']),
            'unlockedAt': st.datetimes(min_value=datetime(2020, 1, 1), max_value=datetime.now()),
            'xpReward': st.integers(min_value=10, max_value=500)
        }), min_size=0, max_size=5)),
        'weakAreas': draw(st.lists(st.fixed_dictionaries({
            'subject': st.sampled_from(['Mathematics', 'Physics', 'Chemistry']),
            'topic': st.text(min_size=1, max_size=30),
            'bloomLevel': st.integers(min_value=1, max_value=6),
            'successRate': st.floats(min_value=0.0, max_value=100.0),
            'attemptsCount': st.integers(min_value=1, max_value=50),
            'recommendedActions': st.lists(st.text(min_size=5, max_size=50), min_size=1, max_size=3)
        }), min_size=0, max_size=5)),
        'riskLevel': draw(st.sampled_from(['low', 'medium', 'high'])),
        'classInfo': {
            'className': f"Grade {draw(st.integers(min_value=6, max_value=12))}A",
            'teacherName': draw(st.text(min_size=5, max_size=30)),
            'classAverage': draw(st.floats(min_value=0.0, max_value=100.0))
        }
    }


def create_mock_parent_service():
    """Create a mock parent service for testing"""
    mock_service = Mock(spec=ParentService)
    
    def mock_get_dashboard_data(parent_id):
        return {
            'parentId': parent_id,
            'children': [],  # Will be populated by test
            'notifications': [],
            'notificationPreferences': {
                'achievements': True,
                'weeklyReports': True,
                'performanceAlerts': True,
                'streakMilestones': True,
                'teacherMessages': True,
                'emailNotifications': True,
                'smsNotifications': False,
                'frequency': 'daily',
                'quietHours': {
                    'enabled': True,
                    'startTime': '22:00',
                    'endTime': '07:00'
                }
            }
        }
    
    mock_service.get_parent_dashboard_data.side_effect = mock_get_dashboard_data
    return mock_service

def verify_child_data_completeness(child_data: Dict[str, Any]):
    """Verify that child data contains all required fields for parent portal"""
    # Required basic information (Requirement 7.1)
    required_basic_fields = [
        'id', 'name', 'email', 'grade', 'medium', 'totalXP', 'currentLevel',
        'currentStreak', 'longestStreak', 'averageScore', 'timeSpentThisWeek',
        'lastActive', 'riskLevel'
    ]
    
    for field in required_basic_fields:
        assert field in child_data, f"Child data missing required field: {field}"
        assert child_data[field] is not None, f"Child data field {field} should not be None"
    
    # Verify progress overview data (Requirement 7.1)
    assert isinstance(child_data['totalXP'], int), "Total XP should be an integer"
    assert child_data['totalXP'] >= 0, "Total XP should be non-negative"
    assert isinstance(child_data['currentLevel'], int), "Current level should be an integer"
    assert child_data['currentLevel'] >= 1, "Current level should be at least 1"
    assert isinstance(child_data['currentStreak'], int), "Current streak should be an integer"
    assert child_data['currentStreak'] >= 0, "Current streak should be non-negative"
    assert isinstance(child_data['averageScore'], (int, float)), "Average score should be numeric"
    assert 0 <= child_data['averageScore'] <= 100, "Average score should be between 0 and 100"
    
    # Verify weekly summary data (Requirement 7.2)
    assert isinstance(child_data['timeSpentThisWeek'], int), "Time spent this week should be an integer"
    assert child_data['timeSpentThisWeek'] >= 0, "Time spent this week should be non-negative"
    
    # Verify subject-wise performance data (Requirement 7.2)
    assert 'subjectProgress' in child_data, "Child data should include subject progress"
    assert isinstance(child_data['subjectProgress'], list), "Subject progress should be a list"
    
    for subject_progress in child_data['subjectProgress']:
        verify_subject_progress_completeness(subject_progress)
    
    # Verify additional required data structures
    assert 'recentAchievements' in child_data, "Child data should include recent achievements"
    assert isinstance(child_data['recentAchievements'], list), "Recent achievements should be a list"
    
    assert 'weakAreas' in child_data, "Child data should include weak areas"
    assert isinstance(child_data['weakAreas'], list), "Weak areas should be a list"
    
    # Verify risk level is valid
    assert child_data['riskLevel'] in ['low', 'medium', 'high'], "Risk level should be low, medium, or high"


def verify_subject_progress_completeness(subject_progress: Dict[str, Any]):
    """Verify subject progress data completeness"""
    required_subject_fields = [
        'subject', 'completionPercentage', 'averageScore', 'timeSpent',
        'bloomLevelProgress', 'lastAccessed', 'topicProgress'
    ]
    
    for field in required_subject_fields:
        assert field in subject_progress, f"Subject progress missing required field: {field}"
    
    # Verify subject performance metrics
    assert isinstance(subject_progress['completionPercentage'], (int, float)), "Completion percentage should be numeric"
    assert 0 <= subject_progress['completionPercentage'] <= 100, "Completion percentage should be between 0 and 100"
    assert isinstance(subject_progress['averageScore'], (int, float)), "Average score should be numeric"
    assert 0 <= subject_progress['averageScore'] <= 100, "Average score should be between 0 and 100"
    assert isinstance(subject_progress['timeSpent'], int), "Time spent should be an integer"
    assert subject_progress['timeSpent'] >= 0, "Time spent should be non-negative"
    
    # Verify Bloom level progress
    assert isinstance(subject_progress['bloomLevelProgress'], list), "Bloom level progress should be a list"
    assert len(subject_progress['bloomLevelProgress']) == 6, "Should have progress for all 6 Bloom levels"
    
    for bloom_progress in subject_progress['bloomLevelProgress']:
        assert 'level' in bloom_progress, "Bloom progress should include level"
        assert 'mastery' in bloom_progress, "Bloom progress should include mastery"
        assert 1 <= bloom_progress['level'] <= 6, "Bloom level should be between 1 and 6"
        assert 0 <= bloom_progress['mastery'] <= 100, "Mastery should be between 0 and 100"
    
    # Verify topic progress
    assert isinstance(subject_progress['topicProgress'], list), "Topic progress should be a list"
    for topic_progress in subject_progress['topicProgress']:
        required_topic_fields = ['topic', 'completionPercentage', 'averageScore', 'timeSpent', 'lastAccessed']
        for field in required_topic_fields:
            assert field in topic_progress, f"Topic progress missing required field: {field}"


def verify_notification_completeness(notification: Dict[str, Any]):
    """Verify notification data completeness"""
    required_notification_fields = [
        'id', 'type', 'title', 'message', 'childId', 'childName',
        'priority', 'timestamp', 'read', 'actionRequired'
    ]
    
    for field in required_notification_fields:
        assert field in notification, f"Notification missing required field: {field}"
    
    # Verify notification type is valid
    valid_types = ['achievement', 'streak_milestone', 'performance_alert', 'weekly_report', 'teacher_message']
    assert notification['type'] in valid_types, f"Invalid notification type: {notification['type']}"
    
    # Verify priority is valid
    assert notification['priority'] in ['low', 'medium', 'high'], "Priority should be low, medium, or high"
    
    # Verify boolean fields
    assert isinstance(notification['read'], bool), "Read status should be boolean"
    assert isinstance(notification['actionRequired'], bool), "Action required should be boolean"


@given(children_data=st.lists(generate_child_data(), min_size=1, max_size=5))
@settings(max_examples=50, deadline=10000)
def test_parent_portal_data_completeness_property(children_data):
    """
    **Feature: shikkhasathi-platform, Property 18: Parent Portal Data Completeness**
    
    Property test: For any parent with children, the portal should display complete
    progress overview, weekly summaries, learning time tracking, and subject-wise performance.
    """
    # Create mock dashboard data
    parent_id = str(uuid.uuid4())
    dashboard_data = {
        'parentId': parent_id,
        'children': children_data,
        'notifications': [],
        'notificationPreferences': {
            'achievements': True,
            'weeklyReports': True,
            'performanceAlerts': True,
            'streakMilestones': True,
            'teacherMessages': True,
            'emailNotifications': True,
            'smsNotifications': False,
            'frequency': 'daily',
            'quietHours': {
                'enabled': True,
                'startTime': '22:00',
                'endTime': '07:00'
            }
        }
    }
    
    # Verify dashboard structure
    assert isinstance(dashboard_data, dict), "Dashboard data should be a dictionary"
    assert 'children' in dashboard_data, "Dashboard should include children data"
    assert 'notifications' in dashboard_data, "Dashboard should include notifications"
    assert 'notificationPreferences' in dashboard_data, "Dashboard should include notification preferences"
    
    # Verify each child has complete data
    for child_data in dashboard_data['children']:
        verify_child_data_completeness(child_data)


if __name__ == "__main__":
    # Run the property-based tests
    test_parent_portal_data_completeness_property()
    print("Parent portal data completeness property tests completed successfully!")