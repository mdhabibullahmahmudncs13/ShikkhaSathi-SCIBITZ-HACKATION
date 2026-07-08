"""
Property-based tests for parent notification system.

**Feature: shikkhasathi-platform, Property 19: Parent Notification System**
**Validates: Requirements 7.3**

Property 19: Parent Notification System
For any achievement unlocked by a student, the system should automatically send 
notifications to parents with accomplishment details
"""

import pytest
from hypothesis import given, strategies as st, assume, settings
from datetime import datetime, timedelta
import uuid
from typing import Dict, Any, List
from unittest.mock import Mock, MagicMock

from app.services.parent_notification_service import ParentNotificationService


# Test data generators
@st.composite
def generate_achievement(draw):
    """Generate a valid achievement for testing"""
    categories = ['learning', 'streak', 'performance', 'engagement']
    return {
        'id': str(uuid.uuid4()),
        'name': draw(st.text(min_size=5, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Zs')))),
        'description': draw(st.text(min_size=10, max_size=100, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Zs')))),
        'icon': draw(st.sampled_from(['🏆', '🎯', '🔥', '⭐', '🎉', '💎'])),
        'category': draw(st.sampled_from(categories)),
        'xpReward': draw(st.integers(min_value=10, max_value=500))
    }


@st.composite
def generate_performance_alert_details(draw):
    """Generate performance alert details"""
    alert_types = ['low_activity', 'declining_performance', 'weak_area_identified', 'streak_broken']
    alert_type = draw(st.sampled_from(alert_types))
    
    details = {}
    if alert_type == 'low_activity':
        details['days'] = draw(st.integers(min_value=1, max_value=14))
    elif alert_type == 'declining_performance':
        details['decline_percentage'] = draw(st.floats(min_value=5.0, max_value=50.0))
    elif alert_type == 'weak_area_identified':
        details['subject'] = draw(st.sampled_from(['Mathematics', 'Physics', 'Chemistry', 'Biology']))
        details['topic'] = draw(st.text(min_size=5, max_size=30))
    elif alert_type == 'streak_broken':
        details['streak_length'] = draw(st.integers(min_value=1, max_value=100))
    
    return alert_type, details


@st.composite
def generate_user_data(draw):
    """Generate user data for testing"""
    return {
        'parent_id': str(uuid.uuid4()),
        'child_id': str(uuid.uuid4()),
        'child_name': draw(st.text(min_size=2, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Zs')))),
        'teacher_name': draw(st.text(min_size=5, max_size=30, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Zs'))))
    }


def create_mock_notification_service():
    """Create a mock notification service for testing"""
    mock_db = Mock()
    service = ParentNotificationService(mock_db)
    
    # Mock the private methods to avoid database operations
    service._store_notification = Mock()
    service._send_email_notification = Mock()
    
    return service


@given(
    user_data=generate_user_data(),
    achievement=generate_achievement()
)
@settings(max_examples=50, deadline=10000)
def test_achievement_notification_completeness_property(user_data, achievement):
    """
    **Feature: shikkhasathi-platform, Property 19: Parent Notification System**
    
    Property test: For any achievement unlocked by a student, the system should 
    automatically send notifications to parents with accomplishment details.
    """
    service = create_mock_notification_service()
    
    # Create achievement notification
    notification = service.create_achievement_notification(
        user_data['parent_id'],
        user_data['child_id'],
        user_data['child_name'],
        achievement
    )
    
    # Verify notification structure and completeness
    verify_notification_completeness(notification, 'achievement')
    
    # Verify achievement-specific content
    assert 'achievement' in notification['type'], "Notification type should be achievement"
    assert user_data['child_name'] in notification['message'], "Child name should be in message"
    assert achievement['name'] in notification['message'], "Achievement name should be in message"
    assert notification['childId'] == user_data['child_id'], "Child ID should match"
    assert notification['childName'] == user_data['child_name'], "Child name should match"
    assert notification['priority'] == 'low', "Achievement notifications should be low priority"
    assert not notification['actionRequired'], "Achievement notifications should not require action"
    
    # Verify related data contains achievement information
    assert 'relatedData' in notification, "Notification should include related data"
    assert 'achievementId' in notification['relatedData'], "Related data should include achievement ID"
    assert notification['relatedData']['achievementId'] == achievement['id'], "Achievement ID should match"
    assert 'xpReward' in notification['relatedData'], "Related data should include XP reward"
    assert notification['relatedData']['xpReward'] == achievement['xpReward'], "XP reward should match"
    
    # Verify notification was stored and email was sent
    service._store_notification.assert_called_once_with(user_data['parent_id'], notification)
    service._send_email_notification.assert_called_once_with(user_data['parent_id'], notification)


@given(
    user_data=generate_user_data(),
    alert_data=generate_performance_alert_details()
)
@settings(max_examples=50, deadline=10000)
def test_performance_alert_notification_completeness_property(user_data, alert_data):
    """
    **Feature: shikkhasathi-platform, Property 19: Parent Notification System**
    
    Property test: For any performance alert, the system should create appropriate 
    notifications with correct priority and action requirements.
    """
    service = create_mock_notification_service()
    alert_type, details = alert_data
    
    # Create performance alert notification
    notification = service.create_performance_alert(
        user_data['parent_id'],
        user_data['child_id'],
        user_data['child_name'],
        alert_type,
        details
    )
    
    # Verify notification structure and completeness
    verify_notification_completeness(notification, 'performance_alert')
    
    # Verify performance alert specific content
    assert notification['type'] == 'performance_alert', "Notification type should be performance_alert"
    assert user_data['child_name'] in notification['message'], "Child name should be in message"
    assert notification['childId'] == user_data['child_id'], "Child ID should match"
    assert notification['childName'] == user_data['child_name'], "Child name should match"
    assert notification['actionRequired'], "Performance alerts should require action"
    
    # Verify priority is appropriate for alert type
    if alert_type in ['declining_performance', 'weak_area_identified']:
        assert notification['priority'] == 'high', f"Alert type {alert_type} should be high priority"
    else:
        assert notification['priority'] == 'medium', f"Alert type {alert_type} should be medium priority"
    
    # Verify related data contains alert information
    assert 'relatedData' in notification, "Notification should include related data"
    assert 'alertType' in notification['relatedData'], "Related data should include alert type"
    assert notification['relatedData']['alertType'] == alert_type, "Alert type should match"
    assert 'details' in notification['relatedData'], "Related data should include details"
    assert notification['relatedData']['details'] == details, "Details should match"
    
    # Verify notification was stored and email was sent
    service._store_notification.assert_called_once_with(user_data['parent_id'], notification)
    service._send_email_notification.assert_called_once_with(user_data['parent_id'], notification)


@given(
    user_data=generate_user_data(),
    streak_days=st.integers(min_value=1, max_value=200)
)
@settings(max_examples=50, deadline=10000)
def test_streak_milestone_notification_completeness_property(user_data, streak_days):
    """
    **Feature: shikkhasathi-platform, Property 19: Parent Notification System**
    
    Property test: For any streak milestone, the system should create appropriate 
    notifications with milestone-specific content.
    """
    service = create_mock_notification_service()
    
    # Create streak milestone notification
    notification = service.create_streak_milestone_notification(
        user_data['parent_id'],
        user_data['child_id'],
        user_data['child_name'],
        streak_days
    )
    
    # Verify notification structure and completeness
    verify_notification_completeness(notification, 'streak_milestone')
    
    # Verify streak milestone specific content
    assert notification['type'] == 'streak_milestone', "Notification type should be streak_milestone"
    assert user_data['child_name'] in notification['message'], "Child name should be in message"
    # Check if either the exact number or human-readable format appears in message
    message = notification['message']
    has_exact_days = str(streak_days) in message
    has_human_readable = any(readable in message.lower() for readable in [
        "1-week", "2-week", "1-month", "2-month", "100-day"
    ])
    assert has_exact_days or has_human_readable, f"Streak days ({streak_days}) should be in message in some format"
    assert notification['childId'] == user_data['child_id'], "Child ID should match"
    assert notification['childName'] == user_data['child_name'], "Child name should match"
    assert notification['priority'] == 'medium', "Streak milestones should be medium priority"
    assert not notification['actionRequired'], "Streak milestones should not require action"
    
    # Verify related data contains streak information
    assert 'relatedData' in notification, "Notification should include related data"
    assert 'streakDays' in notification['relatedData'], "Related data should include streak days"
    assert notification['relatedData']['streakDays'] == streak_days, "Streak days should match"
    assert 'milestoneType' in notification['relatedData'], "Related data should include milestone type"
    
    # Verify milestone type is appropriate for streak length
    milestone_type = notification['relatedData']['milestoneType']
    if streak_days >= 100:
        assert milestone_type == 'legendary', "100+ day streaks should be legendary"
    elif streak_days >= 60:
        assert milestone_type == 'outstanding', "60+ day streaks should be outstanding"
    elif streak_days >= 30:
        assert milestone_type == 'amazing', "30+ day streaks should be amazing"
    elif streak_days >= 14:
        assert milestone_type == 'excellent', "14+ day streaks should be excellent"
    elif streak_days >= 7:
        assert milestone_type == 'great', "7+ day streaks should be great"
    else:
        assert milestone_type == 'good', "Short streaks should be good"
    
    # Verify notification was stored and email was sent
    service._store_notification.assert_called_once_with(user_data['parent_id'], notification)
    service._send_email_notification.assert_called_once_with(user_data['parent_id'], notification)


@given(
    user_data=generate_user_data(),
    teacher_message=st.text(min_size=10, max_size=200, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Zs', 'Nd', 'Po'))),
    subject=st.one_of(st.none(), st.sampled_from(['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English']))
)
@settings(max_examples=50, deadline=10000)
def test_teacher_message_notification_completeness_property(user_data, teacher_message, subject):
    """
    **Feature: shikkhasathi-platform, Property 19: Parent Notification System**
    
    Property test: For any teacher message, the system should create appropriate 
    notifications with teacher and message information.
    """
    service = create_mock_notification_service()
    
    # Create teacher message notification
    notification = service.create_teacher_message_notification(
        user_data['parent_id'],
        user_data['child_id'],
        user_data['child_name'],
        user_data['teacher_name'],
        teacher_message,
        subject
    )
    
    # Verify notification structure and completeness
    verify_notification_completeness(notification, 'teacher_message')
    
    # Verify teacher message specific content
    assert notification['type'] == 'teacher_message', "Notification type should be teacher_message"
    assert user_data['child_name'] in notification['message'], "Child name should be in message"
    assert user_data['teacher_name'] in notification['message'], "Teacher name should be in message"
    assert teacher_message in notification['message'], "Original message should be in notification message"
    assert notification['childId'] == user_data['child_id'], "Child ID should match"
    assert notification['childName'] == user_data['child_name'], "Child name should match"
    assert notification['priority'] == 'medium', "Teacher messages should be medium priority"
    assert notification['actionRequired'], "Teacher messages should require action"
    
    # Verify title contains teacher name
    assert user_data['teacher_name'] in notification['title'], "Teacher name should be in title"
    
    # Verify related data contains teacher message information
    assert 'relatedData' in notification, "Notification should include related data"
    assert 'teacherName' in notification['relatedData'], "Related data should include teacher name"
    assert notification['relatedData']['teacherName'] == user_data['teacher_name'], "Teacher name should match"
    assert 'originalMessage' in notification['relatedData'], "Related data should include original message"
    assert notification['relatedData']['originalMessage'] == teacher_message, "Original message should match"
    assert 'subject' in notification['relatedData'], "Related data should include subject"
    assert notification['relatedData']['subject'] == subject, "Subject should match"
    
    # Verify notification was stored and email was sent
    service._store_notification.assert_called_once_with(user_data['parent_id'], notification)
    service._send_email_notification.assert_called_once_with(user_data['parent_id'], notification)


@given(
    user_data=generate_user_data(),
    report_id=st.text(min_size=10, max_size=50)
)
@settings(max_examples=50, deadline=10000)
def test_weekly_report_notification_completeness_property(user_data, report_id):
    """
    **Feature: shikkhasathi-platform, Property 19: Parent Notification System**
    
    Property test: For any weekly report generation, the system should create 
    appropriate notifications with report information.
    """
    service = create_mock_notification_service()
    
    # Create weekly report notification
    notification = service.create_weekly_report_notification(
        user_data['parent_id'],
        user_data['child_id'],
        user_data['child_name'],
        report_id
    )
    
    # Verify notification structure and completeness
    verify_notification_completeness(notification, 'weekly_report')
    
    # Verify weekly report specific content
    assert notification['type'] == 'weekly_report', "Notification type should be weekly_report"
    assert user_data['child_name'] in notification['message'], "Child name should be in message"
    assert 'weekly' in notification['message'].lower(), "Message should mention weekly report"
    assert notification['childId'] == user_data['child_id'], "Child ID should match"
    assert notification['childName'] == user_data['child_name'], "Child name should match"
    assert notification['priority'] == 'medium', "Weekly reports should be medium priority"
    assert not notification['actionRequired'], "Weekly reports should not require action"
    
    # Verify related data contains report information
    assert 'relatedData' in notification, "Notification should include related data"
    assert 'reportId' in notification['relatedData'], "Related data should include report ID"
    assert notification['relatedData']['reportId'] == report_id, "Report ID should match"
    assert 'weekStart' in notification['relatedData'], "Related data should include week start"
    assert 'weekEnd' in notification['relatedData'], "Related data should include week end"
    
    # Verify week dates are reasonable
    week_start = notification['relatedData']['weekStart']
    week_end = notification['relatedData']['weekEnd']
    assert isinstance(week_start, str), "Week start should be string (ISO format)"
    assert isinstance(week_end, str), "Week end should be string (ISO format)"
    
    # Verify notification was stored and email was sent
    service._store_notification.assert_called_once_with(user_data['parent_id'], notification)
    service._send_email_notification.assert_called_once_with(user_data['parent_id'], notification)


def verify_notification_completeness(notification: Dict[str, Any], expected_type: str):
    """Verify that a notification contains all required fields"""
    # Required fields for all notifications
    required_fields = [
        'id', 'type', 'title', 'message', 'childId', 'childName',
        'priority', 'timestamp', 'read', 'actionRequired'
    ]
    
    for field in required_fields:
        assert field in notification, f"Notification missing required field: {field}"
        assert notification[field] is not None, f"Notification field {field} should not be None"
    
    # Verify field types and values
    assert isinstance(notification['id'], str), "Notification ID should be string"
    assert len(notification['id']) > 0, "Notification ID should not be empty"
    assert notification['type'] == expected_type, f"Notification type should be {expected_type}"
    assert isinstance(notification['title'], str), "Title should be string"
    assert len(notification['title']) > 0, "Title should not be empty"
    assert isinstance(notification['message'], str), "Message should be string"
    assert len(notification['message']) > 0, "Message should not be empty"
    assert isinstance(notification['childId'], str), "Child ID should be string"
    assert len(notification['childId']) > 0, "Child ID should not be empty"
    assert isinstance(notification['childName'], str), "Child name should be string"
    assert len(notification['childName']) > 0, "Child name should not be empty"
    assert notification['priority'] in ['low', 'medium', 'high'], "Priority should be valid"
    assert isinstance(notification['timestamp'], datetime), "Timestamp should be datetime"
    assert isinstance(notification['read'], bool), "Read status should be boolean"
    assert isinstance(notification['actionRequired'], bool), "Action required should be boolean"
    
    # Verify timestamp is recent (within last minute)
    now = datetime.now()
    time_diff = abs((now - notification['timestamp']).total_seconds())
    assert time_diff < 60, "Notification timestamp should be recent"


@given(notification_types=st.lists(
    st.sampled_from(['achievement', 'performance_alert', 'streak_milestone', 'teacher_message', 'weekly_report']),
    min_size=1, max_size=10
))
@settings(max_examples=30, deadline=15000)
def test_notification_system_consistency_property(notification_types):
    """
    **Feature: shikkhasathi-platform, Property 19: Parent Notification System**
    
    Property test: For any sequence of notification types, the system should 
    consistently create well-formed notifications with appropriate priorities and content.
    """
    service = create_mock_notification_service()
    parent_id = str(uuid.uuid4())
    child_id = str(uuid.uuid4())
    child_name = "Test Child"
    
    notifications = []
    
    for notification_type in notification_types:
        if notification_type == 'achievement':
            achievement = {
                'id': str(uuid.uuid4()),
                'name': 'Test Achievement',
                'description': 'Test achievement description',
                'icon': '🏆',
                'category': 'performance',
                'xpReward': 100
            }
            notification = service.create_achievement_notification(
                parent_id, child_id, child_name, achievement
            )
        elif notification_type == 'performance_alert':
            notification = service.create_performance_alert(
                parent_id, child_id, child_name, 'low_activity', {'days': 3}
            )
        elif notification_type == 'streak_milestone':
            notification = service.create_streak_milestone_notification(
                parent_id, child_id, child_name, 7
            )
        elif notification_type == 'teacher_message':
            notification = service.create_teacher_message_notification(
                parent_id, child_id, child_name, 'Teacher Smith', 'Test message', 'Mathematics'
            )
        elif notification_type == 'weekly_report':
            notification = service.create_weekly_report_notification(
                parent_id, child_id, child_name, str(uuid.uuid4())
            )
        
        notifications.append(notification)
        verify_notification_completeness(notification, notification_type)
    
    # Verify all notifications have unique IDs
    notification_ids = [n['id'] for n in notifications]
    assert len(notification_ids) == len(set(notification_ids)), "All notification IDs should be unique"
    
    # Verify all notifications have consistent parent/child information
    for notification in notifications:
        assert notification['childId'] == child_id, "All notifications should have same child ID"
        assert notification['childName'] == child_name, "All notifications should have same child name"
    
    # Verify notification priorities are appropriate
    priority_counts = {'low': 0, 'medium': 0, 'high': 0}
    for notification in notifications:
        priority_counts[notification['priority']] += 1
    
    # Verify that priorities are valid (at least one priority is used)
    assert sum(priority_counts.values()) == len(notifications), "All notifications should have valid priorities"
    assert sum(1 for p in priority_counts.values() if p > 0) >= 1, "At least one priority level should be used"


if __name__ == "__main__":
    # Run the property-based tests
    test_achievement_notification_completeness_property()
    test_performance_alert_notification_completeness_property()
    test_streak_milestone_notification_completeness_property()
    test_teacher_message_notification_completeness_property()
    test_weekly_report_notification_completeness_property()
    test_notification_system_consistency_property()
    print("Parent notification system property tests completed successfully!")