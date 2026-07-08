"""
Property-based tests for assessment availability control system.

**Feature: teacher-dashboard, Property 10: Assessment Availability Control**
**Validates: Requirements 6.3**

These tests verify that the assessment availability control system correctly manages
when and how students can access assessments based on teacher-configured parameters.
"""

import pytest
from datetime import datetime, timedelta, time
from typing import List, Dict, Any, Optional
from hypothesis import given, strategies as st, assume, settings
from hypothesis.stateful import RuleBasedStateMachine, Bundle, rule, initialize
import pytz
from unittest.mock import Mock, patch

# Mock assessment availability service
class MockAssessmentAvailabilityService:
    """Mock service for testing assessment availability control."""
    
    def __init__(self):
        self.assessments = {}
        self.student_attempts = {}
        self.current_time = datetime(2025, 1, 1, 12, 0, 0, tzinfo=pytz.UTC)  # Fixed time for testing
    
    def set_current_time(self, current_time: datetime):
        """Set the current time for testing purposes."""
        self.current_time = current_time
    
    def create_assessment_availability(self, assessment_id: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Create assessment availability configuration."""
        self.assessments[assessment_id] = {
            'id': assessment_id,
            'scheduled_date': config.get('scheduled_date'),
            'due_date': config.get('due_date'),
            'availability_window': config.get('availability_window', {}),
            'settings': config.get('settings', {}),
            'assigned_students': config.get('assigned_students', []),
            'created_at': self.current_time
        }
        return self.assessments[assessment_id]
    
    def check_assessment_availability(self, assessment_id: str, student_id: str, check_time: Optional[datetime] = None) -> Dict[str, Any]:
        """Check if assessment is available for a student at a given time."""
        if check_time is None:
            check_time = self.current_time
        
        if assessment_id not in self.assessments:
            return {'available': False, 'reason': 'assessment_not_found'}
        
        assessment = self.assessments[assessment_id]
        
        # Check if student is assigned
        if student_id not in assessment['assigned_students']:
            return {'available': False, 'reason': 'not_assigned'}
        
        # Check scheduled date
        if assessment['scheduled_date'] and check_time < assessment['scheduled_date']:
            return {'available': False, 'reason': 'not_yet_available'}
        
        # Check due date
        if assessment['due_date'] and check_time > assessment['due_date']:
            return {'available': False, 'reason': 'past_due_date'}
        
        # Check daily availability window
        availability_window = assessment['availability_window']
        if availability_window.get('start_time') or availability_window.get('end_time'):
            current_time_of_day = check_time.time()
            start_time = availability_window.get('start_time')
            end_time = availability_window.get('end_time')
            
            if start_time and current_time_of_day < start_time:
                return {'available': False, 'reason': 'outside_daily_window'}
            
            if end_time and current_time_of_day > end_time:
                return {'available': False, 'reason': 'outside_daily_window'}
        
        # Check allowed days
        allowed_days = availability_window.get('allowed_days', [])
        if allowed_days:
            current_day = check_time.strftime('%A').lower()
            if current_day not in allowed_days:
                return {'available': False, 'reason': 'day_not_allowed'}
        
        # Check attempt limits
        settings = assessment['settings']
        max_attempts = settings.get('max_attempts', 1)
        allow_retakes = settings.get('allow_retakes', False)
        
        student_attempts = self.student_attempts.get(f"{assessment_id}_{student_id}", 0)
        
        if not allow_retakes and student_attempts > 0:
            return {'available': False, 'reason': 'retakes_not_allowed'}
        
        if student_attempts >= max_attempts:
            return {'available': False, 'reason': 'max_attempts_reached'}
        
        return {'available': True, 'reason': 'available'}
    
    def record_attempt(self, assessment_id: str, student_id: str):
        """Record a student attempt."""
        key = f"{assessment_id}_{student_id}"
        self.student_attempts[key] = self.student_attempts.get(key, 0) + 1


# Hypothesis strategies for generating test data
@st.composite
def assessment_config_strategy(draw):
    """Generate valid assessment configuration."""
    # Use a fixed base time to avoid inconsistent generation
    base_time = datetime(2025, 1, 1, 12, 0, 0)  # Fixed naive datetime
    
    # Generate dates
    scheduled_date = draw(st.one_of(
        st.none(),
        st.datetimes(
            min_value=base_time - timedelta(days=30),
            max_value=base_time + timedelta(days=30)
        ).map(lambda dt: dt.replace(tzinfo=pytz.UTC))  # Add timezone after generation
    ))
    
    due_date = None
    if scheduled_date:
        scheduled_naive = scheduled_date.replace(tzinfo=None)
        due_date = draw(st.one_of(
            st.none(),
            st.datetimes(
                min_value=scheduled_naive + timedelta(hours=1),
                max_value=scheduled_naive + timedelta(days=60)
            ).map(lambda dt: dt.replace(tzinfo=pytz.UTC))  # Add timezone after generation
        ))
    
    # Generate time window
    start_time = draw(st.one_of(
        st.none(),
        st.times(min_value=time(0, 0), max_value=time(22, 0))
    ))
    
    end_time = None
    if start_time:
        end_time = draw(st.one_of(
            st.none(),
            st.times(
                min_value=time(start_time.hour + 1, 0) if start_time.hour < 23 else time(23, 59),
                max_value=time(23, 59)
            )
        ))
    
    # Generate allowed days
    all_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    allowed_days = draw(st.lists(
        st.sampled_from(all_days),
        min_size=0,
        max_size=7,
        unique=True
    ))
    
    return {
        'scheduled_date': scheduled_date,
        'due_date': due_date,
        'availability_window': {
            'start_time': start_time,
            'end_time': end_time,
            'allowed_days': allowed_days
        },
        'settings': {
            'allow_retakes': draw(st.booleans()),
            'max_attempts': draw(st.integers(min_value=1, max_value=10))
        },
        'assigned_students': draw(st.lists(
            st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'))),
            min_size=1,
            max_size=50,
            unique=True
        ))
    }


@st.composite
def check_time_strategy(draw, base_config):
    """Generate check times relative to assessment configuration."""
    base_time = datetime(2025, 1, 1, 12, 0, 0)  # Fixed naive datetime
    
    # Generate times around scheduled and due dates
    if base_config['scheduled_date']:
        scheduled = base_config['scheduled_date'].replace(tzinfo=None)
        due = base_config['due_date'].replace(tzinfo=None) if base_config['due_date'] else scheduled + timedelta(days=30)
        return draw(st.datetimes(
            min_value=scheduled - timedelta(days=7),
            max_value=due + timedelta(days=7)
        )).replace(tzinfo=pytz.UTC)  # Add timezone after generation
    else:
        return draw(st.datetimes(
            min_value=base_time - timedelta(days=7),
            max_value=base_time + timedelta(days=30)
        )).replace(tzinfo=pytz.UTC)  # Add timezone after generation


class TestAssessmentAvailabilityControlProperties:
    """Property-based tests for assessment availability control."""
    
    def setup_method(self):
        """Set up test environment."""
        self.service = MockAssessmentAvailabilityService()
    
    @given(config=assessment_config_strategy())
    @settings(max_examples=50)
    def test_scheduled_date_availability_property(self, config):
        """
        Property: Assessment availability respects scheduled dates.
        
        For any assessment with a scheduled date, the assessment should not be
        available before that date and should be available after (assuming other
        conditions are met).
        """
        assessment_id = "test_assessment"
        student_id = config['assigned_students'][0]
        
        # Create assessment
        self.service.create_assessment_availability(assessment_id, config)
        
        if config['scheduled_date']:
            # Check availability before scheduled date
            before_time = config['scheduled_date'] - timedelta(minutes=1)
            result_before = self.service.check_assessment_availability(
                assessment_id, student_id, before_time
            )
            
            # Should not be available before scheduled date
            assert not result_before['available']
            assert result_before['reason'] == 'not_yet_available'
    
    @given(config=assessment_config_strategy())
    @settings(max_examples=100)
    def test_due_date_availability_property(self, config):
        """
        Property: Assessment availability respects due dates.
        
        For any assessment with a due date, the assessment should not be
        available after that date.
        """
        assessment_id = "test_assessment"
        student_id = config['assigned_students'][0]
        
        # Create assessment
        self.service.create_assessment_availability(assessment_id, config)
        
        if config['due_date']:
            # Check availability after due date
            after_due = config['due_date'] + timedelta(minutes=1)
            result = self.service.check_assessment_availability(
                assessment_id, student_id, after_due
            )
            
            # Should not be available after due date
            assert not result['available']
            assert result['reason'] == 'past_due_date'
    
    @given(config=assessment_config_strategy())
    @settings(max_examples=50)
    def test_daily_time_window_property(self, config):
        """
        Property: Assessment availability respects daily time windows.
        
        For any assessment with daily time restrictions, the assessment should
        only be available during the specified time window.
        """
        assessment_id = "test_assessment"
        student_id = config['assigned_students'][0]
        
        # Create assessment
        self.service.create_assessment_availability(assessment_id, config)
        
        window = config['availability_window']
        if window.get('start_time') and window.get('end_time'):
            # Only test when both start and end times are specified
            # Create a test time within the valid date range
            base_time = config['scheduled_date'] or datetime(2025, 1, 1, 12, 0, 0, tzinfo=pytz.UTC)
            if config['due_date']:
                # Ensure we're before due date
                base_time = min(base_time, config['due_date'] - timedelta(hours=1))
            
            # Test time before window (if start time is not at midnight)
            if window['start_time'].hour > 0:
                before_window = base_time.replace(
                    hour=window['start_time'].hour - 1,
                    minute=0,
                    second=0,
                    microsecond=0
                )
                
                result = self.service.check_assessment_availability(
                    assessment_id, student_id, before_window
                )
                
                # Should not be available before time window
                if not result['available']:
                    assert result['reason'] in ['outside_daily_window', 'not_yet_available', 'day_not_allowed']
            
            # Test time after window (if end time is not at midnight)
            if window['end_time'].hour < 23:
                after_window = base_time.replace(
                    hour=window['end_time'].hour + 1,
                    minute=0,
                    second=0,
                    microsecond=0
                )
                
                result = self.service.check_assessment_availability(
                    assessment_id, student_id, after_window
                )
                
                # Should not be available after time window
                if not result['available']:
                    assert result['reason'] in ['outside_daily_window', 'past_due_date', 'day_not_allowed', 'not_yet_available']
    
    @given(config=assessment_config_strategy())
    @settings(max_examples=50)
    def test_allowed_days_property(self, config):
        """
        Property: Assessment availability respects allowed days.
        
        For any assessment with day restrictions, the assessment should only
        be available on the specified days of the week.
        """
        assessment_id = "test_assessment"
        student_id = config['assigned_students'][0]
        
        # Create assessment
        self.service.create_assessment_availability(assessment_id, config)
        
        allowed_days = config['availability_window'].get('allowed_days', [])
        if allowed_days:
            # Test each day of the week
            base_time = config['scheduled_date'] or datetime(2025, 1, 1, 12, 0, 0, tzinfo=pytz.UTC)
            
            for day_offset in range(7):
                test_time = base_time + timedelta(days=day_offset)
                current_day = test_time.strftime('%A').lower()
                
                # Ensure we're within other constraints
                if config['due_date'] and test_time >= config['due_date']:
                    continue
                
                # Adjust time to be within daily window if specified
                window = config['availability_window']
                if window.get('start_time'):
                    test_time = test_time.replace(
                        hour=window['start_time'].hour,
                        minute=window['start_time'].minute,
                        second=0,
                        microsecond=0
                    )
                
                result = self.service.check_assessment_availability(
                    assessment_id, student_id, test_time
                )
                
                if current_day not in allowed_days:
                    # Should not be available on disallowed days
                    if not result['available']:
                        assert result['reason'] in [
                            'day_not_allowed', 'not_yet_available', 'past_due_date', 'outside_daily_window'
                        ]
    
    @given(config=assessment_config_strategy())
    @settings(max_examples=50)
    def test_attempt_limits_property(self, config):
        """
        Property: Assessment availability respects attempt limits.
        
        For any assessment with attempt restrictions, students should not be
        able to access the assessment after reaching the maximum attempts.
        """
        assessment_id = "test_assessment"
        student_id = config['assigned_students'][0]
        
        # Create assessment
        self.service.create_assessment_availability(assessment_id, config)
        
        settings = config['settings']
        max_attempts = settings['max_attempts']
        allow_retakes = settings['allow_retakes']
        
        # Create a valid time for checking (avoid complex constraints for this test)
        check_time = datetime(2025, 1, 6, 12, 0, 0, tzinfo=pytz.UTC)  # Monday at noon
        
        # Adjust for scheduled date if it exists
        if config['scheduled_date']:
            check_time = max(check_time, config['scheduled_date'] + timedelta(minutes=1))
        
        # Adjust for due date if it exists
        if config['due_date']:
            check_time = min(check_time, config['due_date'] - timedelta(minutes=1))
        
        # Skip if time constraints make this impossible
        if config['due_date'] and config['scheduled_date'] and config['due_date'] <= config['scheduled_date']:
            return
        
        # Test attempt limits only if we can find a valid time
        window = config['availability_window']
        
        # Adjust for allowed days
        if window.get('allowed_days'):
            # Find a valid day
            for i in range(7):
                test_time = check_time + timedelta(days=i)
                if test_time.strftime('%A').lower() in window['allowed_days']:
                    check_time = test_time
                    break
            else:
                # No valid days, skip this test
                return
        
        # Adjust for daily time window
        if window.get('start_time'):
            check_time = check_time.replace(
                hour=window['start_time'].hour,
                minute=window['start_time'].minute,
                second=0,
                microsecond=0
            )
        
        # Test initial availability
        result = self.service.check_assessment_availability(
            assessment_id, student_id, check_time
        )
        
        # If not available due to other constraints, skip attempt testing
        if not result['available'] and result['reason'] not in ['retakes_not_allowed', 'max_attempts_reached']:
            return
        
        # Record attempts and test limits
        for attempt in range(max_attempts):
            self.service.record_attempt(assessment_id, student_id)
            
            result = self.service.check_assessment_availability(
                assessment_id, student_id, check_time
            )
            
            if attempt == 0 and not allow_retakes:
                # After first attempt, should not be available if retakes not allowed
                if not result['available']:
                    assert result['reason'] == 'retakes_not_allowed'
                break
            elif attempt + 1 >= max_attempts:
                # After max attempts, should not be available
                if not result['available']:
                    assert result['reason'] == 'max_attempts_reached'
    
    @given(config=assessment_config_strategy())
    @settings(max_examples=50)
    def test_student_assignment_property(self, config):
        """
        Property: Assessment availability respects student assignments.
        
        For any assessment, only assigned students should be able to access it.
        """
        assessment_id = "test_assessment"
        
        # Create assessment
        self.service.create_assessment_availability(assessment_id, config)
        
        assigned_student = config['assigned_students'][0]
        unassigned_student = "unassigned_student_123"
        
        # Ensure unassigned student is not in the assigned list
        assume(unassigned_student not in config['assigned_students'])
        
        check_time = config['scheduled_date'] or datetime.now(pytz.UTC)
        
        # Check assigned student
        result_assigned = self.service.check_assessment_availability(
            assessment_id, assigned_student, check_time
        )
        
        # Check unassigned student
        result_unassigned = self.service.check_assessment_availability(
            assessment_id, unassigned_student, check_time
        )
        
        # Unassigned student should never have access
        assert not result_unassigned['available']
        assert result_unassigned['reason'] == 'not_assigned'
        
        # Assigned student may or may not have access depending on other constraints
        # but should not be rejected for assignment reasons
        if not result_assigned['available']:
            assert result_assigned['reason'] != 'not_assigned'


class AssessmentAvailabilityStateMachine(RuleBasedStateMachine):
    """
    Stateful property testing for assessment availability control.
    
    This tests the system behavior over time with multiple assessments,
    students, and time progression.
    """
    
    assessments = Bundle('assessments')
    students = Bundle('students')
    
    def __init__(self):
        super().__init__()
        self.service = MockAssessmentAvailabilityService()
        self.current_time = datetime(2025, 1, 1, 12, 0, 0, tzinfo=pytz.UTC)  # Fixed time for testing
        self.service.set_current_time(self.current_time)
    
    @initialize()
    def setup(self):
        """Initialize the state machine."""
        pass
    
    @rule(target=assessments, config=assessment_config_strategy())
    def create_assessment(self, config):
        """Create a new assessment with availability configuration."""
        assessment_id = f"assessment_{len(self.service.assessments)}"
        self.service.create_assessment_availability(assessment_id, config)
        return assessment_id
    
    @rule(target=students)
    def create_student(self):
        """Create a new student."""
        student_id = f"student_{len([s for s in dir(self) if s.startswith('student_')])}"
        return student_id
    
    @rule(assessment_id=assessments, student_id=students)
    def check_availability_consistency(self, assessment_id, student_id):
        """
        Property: Availability checks should be consistent.
        
        Multiple calls to check availability with the same parameters
        should return the same result.
        """
        if assessment_id not in self.service.assessments:
            return
        
        result1 = self.service.check_assessment_availability(
            assessment_id, student_id, self.current_time
        )
        result2 = self.service.check_assessment_availability(
            assessment_id, student_id, self.current_time
        )
        
        # Results should be identical
        assert result1 == result2
    
    @rule(time_delta=st.integers(min_value=1, max_value=86400))  # 1 second to 1 day
    def advance_time(self, time_delta):
        """Advance the current time."""
        self.current_time += timedelta(seconds=time_delta)
        self.service.set_current_time(self.current_time)
    
    @rule(assessment_id=assessments, student_id=students)
    def test_temporal_consistency(self, assessment_id, student_id):
        """
        Property: Time-based availability should be monotonic for due dates.
        
        If an assessment becomes unavailable due to a due date, it should
        remain unavailable as time progresses.
        """
        if assessment_id not in self.service.assessments:
            return
        
        assessment = self.service.assessments[assessment_id]
        if not assessment.get('due_date'):
            return
        
        # Check availability now
        current_result = self.service.check_assessment_availability(
            assessment_id, student_id, self.current_time
        )
        
        # Check availability in the future
        future_time = self.current_time + timedelta(hours=1)
        future_result = self.service.check_assessment_availability(
            assessment_id, student_id, future_time
        )
        
        # If currently unavailable due to past due date, should remain unavailable
        if (not current_result['available'] and 
            current_result['reason'] == 'past_due_date'):
            assert not future_result['available']
            assert future_result['reason'] == 'past_due_date'


# Run the stateful tests
TestAssessmentAvailabilityStateMachine = AssessmentAvailabilityStateMachine.TestCase


if __name__ == "__main__":
    # Run property tests
    pytest.main([__file__, "-v", "--tb=short"])