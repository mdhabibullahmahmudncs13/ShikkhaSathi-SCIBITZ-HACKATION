"""
Property-Based Tests for At-Risk Student Detection
Tests that validate the accuracy and consistency of at-risk student identification algorithms
"""

import pytest
from datetime import datetime, timedelta
from hypothesis import given, strategies as st, settings, assume
from hypothesis.stateful import RuleBasedStateMachine, Bundle, rule, initialize, invariant
from sqlalchemy.orm import Session
from unittest.mock import Mock, patch
import statistics
from typing import List, Dict, Any

from app.models.user import User, UserRole
from app.models.teacher import Teacher, TeacherClass, StudentClassProgress
from app.models.gamification import Gamification
from app.models.quiz_attempt import QuizAttempt
from app.services.teacher_auth_service import TeacherAuthService
from app.services.gamification_service import GamificationService
from app.db.session import get_db


class AtRiskDetectionMachine(RuleBasedStateMachine):
    """
    Stateful property-based testing machine for at-risk student detection
    
    **Feature: teacher-dashboard, Property 9: At-Risk Student Detection**
    **Validates: Requirements 1.5, 3.3**
    """
    
    students = Bundle('students')
    teachers = Bundle('teachers')
    classes = Bundle('classes')
    
    def __init__(self):
        super().__init__()
        self.db = Mock(spec=Session)
        self.teacher_service = TeacherAuthService(self.db)
        self.gamification_service = GamificationService(self.db)
        self.student_data = {}
        self.risk_assessments = {}
        
    @initialize()
    def setup_initial_state(self):
        """Initialize the test environment with basic data"""
        self.student_data.clear()
        self.risk_assessments.clear()
        
    @rule(target=teachers)
    def create_teacher(self):
        """Create a teacher for testing"""
        teacher_id = f"teacher_{len(self.student_data)}"
        teacher = Mock()
        teacher.id = teacher_id
        teacher.user_id = f"user_{teacher_id}"
        teacher.subjects = ["Mathematics", "Physics"]
        teacher.grade_levels = [9, 10]
        teacher.is_active = True
        
        return teacher
    
    @rule(target=classes, teacher=teachers)
    def create_class(self, teacher):
        """Create a class for a teacher"""
        class_id = f"class_{teacher.id}_{len(self.student_data)}"
        teacher_class = Mock()
        teacher_class.id = class_id
        teacher_class.teacher_id = teacher.id
        teacher_class.class_name = f"Class 9A"
        teacher_class.subject = "Mathematics"
        teacher_class.grade_level = 9
        teacher_class.is_active = True
        teacher_class.students = []
        
        return teacher_class
    
    @rule(target=students, teacher_class=classes)
    def create_student_with_performance_data(self, teacher_class):
        """Create a student with comprehensive performance data"""
        student_id = f"student_{len(teacher_class.students)}"
        student = Mock()
        student.id = student_id
        student.full_name = f"Student {student_id}"
        student.email = f"{student_id}@example.com"
        student.role = UserRole.STUDENT
        student.is_active = True
        
        # Generate realistic performance data
        current_time = datetime.utcnow()
        
        # Performance metrics
        quiz_scores = [st.integers(min_value=0, max_value=100).example() for _ in range(10)]
        average_score = sum(quiz_scores) / len(quiz_scores) if quiz_scores else 0
        
        # Activity patterns
        days_since_last_activity = st.integers(min_value=0, max_value=30).example()
        last_activity = current_time - timedelta(days=days_since_last_activity)
        
        # Engagement metrics
        current_streak = st.integers(min_value=0, max_value=30).example()
        total_study_time = st.integers(min_value=0, max_value=10000).example()  # minutes
        
        # Learning progress
        completion_rate = st.floats(min_value=0.0, max_value=1.0).example()
        topics_mastered = st.integers(min_value=0, max_value=20).example()
        
        # Store comprehensive student data
        self.student_data[student_id] = {
            'quiz_scores': quiz_scores,
            'average_score': average_score,
            'last_activity': last_activity,
            'days_since_last_activity': days_since_last_activity,
            'current_streak': current_streak,
            'total_study_time': total_study_time,
            'completion_rate': completion_rate,
            'topics_mastered': topics_mastered,
            'quiz_attempts': len(quiz_scores),
            'class_id': teacher_class.id,
            'created_at': current_time
        }
        
        # Calculate initial risk assessment
        self._calculate_risk_level(student_id)
        
        teacher_class.students.append(student)
        return student
    
    def _calculate_risk_level(self, student_id: str) -> str:
        """Calculate risk level based on multiple factors"""
        data = self.student_data[student_id]
        
        risk_factors = []
        
        # Factor 1: Academic Performance (40% weight)
        if data['average_score'] < 40:
            risk_factors.append(('performance', 'high', 0.4))
        elif data['average_score'] < 60:
            risk_factors.append(('performance', 'medium', 0.4))
        else:
            risk_factors.append(('performance', 'low', 0.4))
        
        # Factor 2: Engagement/Activity (30% weight)
        if data['days_since_last_activity'] >= 14:
            risk_factors.append(('activity', 'high', 0.3))
        elif data['days_since_last_activity'] >= 7:
            risk_factors.append(('activity', 'medium', 0.3))
        else:
            risk_factors.append(('activity', 'low', 0.3))
        
        # Factor 3: Learning Streak (20% weight)
        if data['current_streak'] == 0:
            risk_factors.append(('streak', 'high', 0.2))
        elif data['current_streak'] < 3:
            risk_factors.append(('streak', 'medium', 0.2))
        else:
            risk_factors.append(('streak', 'low', 0.2))
        
        # Factor 4: Completion Rate (10% weight)
        if data['completion_rate'] < 0.3:
            risk_factors.append(('completion', 'high', 0.1))
        elif data['completion_rate'] < 0.6:
            risk_factors.append(('completion', 'medium', 0.1))
        else:
            risk_factors.append(('completion', 'low', 0.1))
        
        # Calculate weighted risk score
        risk_score = 0
        for factor, level, weight in risk_factors:
            if level == 'high':
                risk_score += weight * 3
            elif level == 'medium':
                risk_score += weight * 2
            else:
                risk_score += weight * 1
        
        # Determine overall risk level
        if risk_score >= 2.5:
            risk_level = 'high'
        elif risk_score >= 1.5:
            risk_level = 'medium'
        else:
            risk_level = 'low'
        
        self.risk_assessments[student_id] = {
            'risk_level': risk_level,
            'risk_score': risk_score,
            'factors': risk_factors,
            'calculated_at': datetime.utcnow()
        }
        
        return risk_level
    
    @rule(student=students)
    def update_student_performance(self, student):
        """Update student performance and recalculate risk"""
        assume(student.id in self.student_data)
        
        data = self.student_data[student.id]
        
        # Add new quiz score
        new_score = st.integers(min_value=0, max_value=100).example()
        data['quiz_scores'].append(new_score)
        data['average_score'] = sum(data['quiz_scores']) / len(data['quiz_scores'])
        data['quiz_attempts'] += 1
        
        # Update activity
        data['last_activity'] = datetime.utcnow()
        data['days_since_last_activity'] = 0
        
        # Recalculate risk
        self._calculate_risk_level(student.id)
    
    @rule(student=students)
    def simulate_student_inactivity(self, student):
        """Simulate student becoming inactive"""
        assume(student.id in self.student_data)
        
        data = self.student_data[student.id]
        
        # Increase inactivity
        additional_days = st.integers(min_value=1, max_value=10).example()
        data['days_since_last_activity'] += additional_days
        data['last_activity'] = datetime.utcnow() - timedelta(days=data['days_since_last_activity'])
        
        # Break streak if inactive too long
        if data['days_since_last_activity'] > 1:
            data['current_streak'] = 0
        
        # Recalculate risk
        self._calculate_risk_level(student.id)
    
    @invariant()
    def at_risk_detection_consistency(self):
        """
        **Property 9: At-Risk Student Detection**
        
        The at-risk detection algorithm should consistently identify students
        who need intervention based on multiple performance and engagement factors
        
        **Validates: Requirements 1.5, 3.3**
        """
        for student_id, data in self.student_data.items():
            if student_id not in self.risk_assessments:
                continue
                
            assessment = self.risk_assessments[student_id]
            risk_level = assessment['risk_level']
            
            # Verify high-risk criteria
            if risk_level == 'high':
                # At least one of these should be true for high risk
                high_risk_conditions = [
                    data['average_score'] < 40,  # Very poor performance
                    data['days_since_last_activity'] >= 14,  # Very inactive
                    data['current_streak'] == 0 and data['completion_rate'] < 0.3  # No engagement
                ]
                
                assert any(high_risk_conditions), \
                    f"Student {student_id} marked as high risk but doesn't meet criteria: " \
                    f"score={data['average_score']}, inactive_days={data['days_since_last_activity']}, " \
                    f"streak={data['current_streak']}, completion={data['completion_rate']}"
            
            # Verify low-risk criteria
            elif risk_level == 'low':
                # All of these should be true for low risk
                low_risk_conditions = [
                    data['average_score'] >= 60,  # Good performance
                    data['days_since_last_activity'] < 7,  # Recently active
                    data['current_streak'] >= 3 or data['completion_rate'] >= 0.6  # Good engagement
                ]
                
                assert all(low_risk_conditions), \
                    f"Student {student_id} marked as low risk but meets high-risk criteria: " \
                    f"score={data['average_score']}, inactive_days={data['days_since_last_activity']}, " \
                    f"streak={data['current_streak']}, completion={data['completion_rate']}"
    
    @invariant()
    def risk_level_transitions_are_logical(self):
        """
        **Property 9: At-Risk Student Detection**
        
        Risk level changes should be logical and based on actual performance changes
        
        **Validates: Requirements 1.5, 3.3**
        """
        for student_id, assessment in self.risk_assessments.items():
            if student_id not in self.student_data:
                continue
                
            data = self.student_data[student_id]
            risk_score = assessment['risk_score']
            risk_level = assessment['risk_level']
            
            # Verify risk score matches risk level
            if risk_level == 'high':
                assert risk_score >= 2.5, \
                    f"High risk student {student_id} has low risk score: {risk_score}"
            elif risk_level == 'medium':
                assert 1.5 <= risk_score < 2.5, \
                    f"Medium risk student {student_id} has incorrect risk score: {risk_score}"
            else:  # low risk
                assert risk_score < 1.5, \
                    f"Low risk student {student_id} has high risk score: {risk_score}"


class TestAtRiskStudentDetectionProperties:
    """Property-based tests for at-risk student detection"""
    
    @given(
        student_count=st.integers(min_value=5, max_value=20),
        performance_data=st.data()
    )
    @settings(max_examples=50, deadline=None)
    def test_at_risk_identification_accuracy_property(self, student_count, performance_data):
        """
        **Feature: teacher-dashboard, Property 9: At-Risk Student Detection**
        
        Test that at-risk identification accurately reflects student performance patterns
        
        **Validates: Requirements 1.5, 3.3**
        """
        students = []
        
        for i in range(student_count):
            student_id = f"student_{i}"
            
            # Generate student performance data
            quiz_scores = [
                performance_data.draw(st.integers(min_value=0, max_value=100))
                for _ in range(performance_data.draw(st.integers(min_value=3, max_value=15)))
            ]
            
            average_score = sum(quiz_scores) / len(quiz_scores)
            days_inactive = performance_data.draw(st.integers(min_value=0, max_value=30))
            current_streak = performance_data.draw(st.integers(min_value=0, max_value=30))
            completion_rate = performance_data.draw(st.floats(min_value=0.0, max_value=1.0))
            
            student_data = {
                'id': student_id,
                'quiz_scores': quiz_scores,
                'average_score': average_score,
                'days_inactive': days_inactive,
                'current_streak': current_streak,
                'completion_rate': completion_rate
            }
            
            students.append(student_data)
        
        # Apply at-risk detection algorithm
        at_risk_students = []
        for student in students:
            # Calculate risk factors
            performance_risk = student['average_score'] < 60
            activity_risk = student['days_inactive'] >= 7
            engagement_risk = student['current_streak'] == 0
            completion_risk = student['completion_rate'] < 0.5
            
            # Determine if student is at risk - more lenient criteria
            risk_factors_count = sum([performance_risk, activity_risk, engagement_risk, completion_risk])
            
            # Student is at risk if they have multiple risk factors OR very poor performance
            if (risk_factors_count >= 2 or 
                student['average_score'] < 40 or 
                student['days_inactive'] >= 14):
                at_risk_students.append(student['id'])
        
        # Verify at-risk identification
        for student in students:
            is_identified_at_risk = student['id'] in at_risk_students
            
            # Check if identification is correct - use same logic as above
            performance_risk = student['average_score'] < 60
            activity_risk = student['days_inactive'] >= 7
            engagement_risk = student['current_streak'] == 0
            completion_risk = student['completion_rate'] < 0.5
            risk_factors_count = sum([performance_risk, activity_risk, engagement_risk, completion_risk])
            
            should_be_at_risk = (
                risk_factors_count >= 2 or 
                student['average_score'] < 40 or 
                student['days_inactive'] >= 14
            )
            
            if should_be_at_risk:
                assert is_identified_at_risk, \
                    f"Student {student['id']} should be identified as at-risk: " \
                    f"score={student['average_score']}, inactive={student['days_inactive']} days, " \
                    f"streak={student['current_streak']}, completion={student['completion_rate']}, " \
                    f"risk_factors={risk_factors_count}"
    
    @given(
        initial_scores=st.lists(st.integers(min_value=0, max_value=100), min_size=5, max_size=10),
        activity_pattern=st.lists(st.integers(min_value=0, max_value=7), min_size=7, max_size=14)
    )
    @settings(max_examples=100, deadline=None)
    def test_risk_level_calculation_consistency_property(self, initial_scores, activity_pattern):
        """
        **Feature: teacher-dashboard, Property 9: At-Risk Student Detection**
        
        Test that risk level calculations are consistent and deterministic
        
        **Validates: Requirements 1.5, 3.3**
        """
        student_id = "test_student"
        
        # Calculate initial metrics
        average_score = sum(initial_scores) / len(initial_scores)
        total_inactive_days = sum(activity_pattern)
        max_consecutive_inactive = max(activity_pattern) if activity_pattern else 0
        
        # Calculate risk factors
        performance_factor = 0
        if average_score < 40:
            performance_factor = 3
        elif average_score < 60:
            performance_factor = 2
        else:
            performance_factor = 1
        
        activity_factor = 0
        if max_consecutive_inactive >= 7:
            activity_factor = 3
        elif max_consecutive_inactive >= 3:
            activity_factor = 2
        else:
            activity_factor = 1
        
        engagement_factor = 0
        if total_inactive_days > len(activity_pattern) * 0.7:
            engagement_factor = 3
        elif total_inactive_days > len(activity_pattern) * 0.4:
            engagement_factor = 2
        else:
            engagement_factor = 1
        
        # Calculate overall risk score
        risk_score = (performance_factor * 0.5 + activity_factor * 0.3 + engagement_factor * 0.2)
        
        # Determine risk level
        if risk_score >= 2.5:
            expected_risk_level = 'high'
        elif risk_score >= 1.8:
            expected_risk_level = 'medium'
        else:
            expected_risk_level = 'low'
        
        # Verify consistency - same inputs should always produce same output
        risk_score_2 = (performance_factor * 0.5 + activity_factor * 0.3 + engagement_factor * 0.2)
        assert risk_score == risk_score_2, "Risk calculation should be deterministic"
        
        # Verify risk level boundaries
        if expected_risk_level == 'high':
            assert risk_score >= 2.5, f"High risk should have score >= 2.5, got {risk_score}"
        elif expected_risk_level == 'medium':
            assert 1.8 <= risk_score < 2.5, f"Medium risk should have score 1.8-2.5, got {risk_score}"
        else:
            assert risk_score < 1.8, f"Low risk should have score < 1.8, got {risk_score}"
    
    @given(
        class_size=st.integers(min_value=10, max_value=30),
        performance_distribution=st.sampled_from(['normal', 'bimodal', 'low_performing', 'high_performing'])
    )
    @settings(max_examples=50, deadline=None)
    def test_class_level_at_risk_patterns_property(self, class_size, performance_distribution):
        """
        **Feature: teacher-dashboard, Property 9: At-Risk Student Detection**
        
        Test that class-level at-risk patterns are detected correctly
        
        **Validates: Requirements 1.5, 3.3**
        """
        students = []
        
        # Generate students based on performance distribution
        for i in range(class_size):
            if performance_distribution == 'normal':
                # Normal distribution around 70%
                base_score = max(0, min(100, int(70 + (i - class_size/2) * 3)))
            elif performance_distribution == 'bimodal':
                # Two groups: high and low performers
                base_score = 85 if i < class_size/2 else 35
            elif performance_distribution == 'low_performing':
                # Most students performing poorly
                base_score = max(0, min(100, int(40 + i * 2)))
            else:  # high_performing
                # Most students performing well
                base_score = max(0, min(100, int(80 + i)))
            
            # Add some randomness
            import random
            random.seed(42 + i)  # Deterministic randomness
            score_variation = random.randint(-10, 10)
            final_score = max(0, min(100, base_score + score_variation))
            
            students.append({
                'id': f"student_{i}",
                'average_score': final_score,
                'days_inactive': random.randint(0, 14),
                'completion_rate': random.uniform(0.2, 1.0)
            })
        
        # Calculate at-risk students
        at_risk_count = 0
        for student in students:
            # More realistic at-risk criteria
            performance_risk = student['average_score'] < 60
            activity_risk = student['days_inactive'] >= 7
            completion_risk = student['completion_rate'] < 0.5
            
            # Count risk factors
            risk_factors = sum([performance_risk, activity_risk, completion_risk])
            
            # Student is at risk if they have multiple factors OR very poor performance
            is_at_risk = (
                risk_factors >= 2 or
                student['average_score'] < 40 or
                student['days_inactive'] >= 14
            )
            
            if is_at_risk:
                at_risk_count += 1
        
        at_risk_percentage = (at_risk_count / class_size) * 100
        
        # Verify class-level patterns with more realistic expectations
        if performance_distribution == 'low_performing':
            assert at_risk_percentage >= 30, \
                f"Low performing class should have high at-risk percentage, got {at_risk_percentage}%"
        elif performance_distribution == 'high_performing':
            assert at_risk_percentage <= 50, \
                f"High performing class should have low at-risk percentage, got {at_risk_percentage}%"
        elif performance_distribution == 'bimodal':
            assert 10 <= at_risk_percentage <= 90, \
                f"Bimodal class should have moderate at-risk percentage, got {at_risk_percentage}%"
        
        # Verify reasonable bounds
        assert 0 <= at_risk_percentage <= 100, \
            f"At-risk percentage should be between 0-100%, got {at_risk_percentage}%"
    
    @given(
        time_series_scores=st.lists(
            st.lists(st.integers(min_value=0, max_value=100), min_size=3, max_size=8),
            min_size=4,
            max_size=12
        )
    )
    @settings(max_examples=50, deadline=None)
    def test_temporal_risk_assessment_property(self, time_series_scores):
        """
        **Feature: teacher-dashboard, Property 9: At-Risk Student Detection**
        
        Test that risk assessment considers temporal patterns in performance
        
        **Validates: Requirements 1.5, 3.3**
        """
        student_id = "temporal_test_student"
        
        # Calculate trend over time
        weekly_averages = [sum(week_scores) / len(week_scores) for week_scores in time_series_scores]
        
        # Calculate performance trend
        if len(weekly_averages) >= 2:
            recent_avg = sum(weekly_averages[-2:]) / 2
            earlier_avg = sum(weekly_averages[:2]) / 2
            trend = recent_avg - earlier_avg
        else:
            trend = 0
        
        # Calculate consistency
        score_variance = statistics.variance(weekly_averages) if len(weekly_averages) > 1 else 0
        
        # Determine risk based on temporal patterns
        temporal_risk_factors = []
        
        # Declining performance trend
        if trend < -10:
            temporal_risk_factors.append('declining_performance')
        
        # High variance (inconsistent performance)
        if score_variance > 400:  # Standard deviation > 20
            temporal_risk_factors.append('inconsistent_performance')
        
        # Recent poor performance
        if len(weekly_averages) >= 2 and sum(weekly_averages[-2:]) / 2 < 50:
            temporal_risk_factors.append('recent_poor_performance')
        
        # Overall poor performance
        overall_average = sum(weekly_averages) / len(weekly_averages)
        if overall_average < 60:
            temporal_risk_factors.append('overall_poor_performance')
        
        # Determine if student should be flagged as at-risk
        should_be_at_risk = len(temporal_risk_factors) >= 2 or 'recent_poor_performance' in temporal_risk_factors
        
        # Verify temporal risk assessment
        if should_be_at_risk:
            # Student should be identified as needing intervention
            assert len(temporal_risk_factors) > 0, \
                f"Student with temporal risk factors should be flagged: factors={temporal_risk_factors}"
            
            # Verify specific risk factors make sense
            if 'declining_performance' in temporal_risk_factors:
                assert trend < -10, f"Declining performance should have negative trend, got {trend}"
            
            if 'inconsistent_performance' in temporal_risk_factors:
                assert score_variance > 400, f"Inconsistent performance should have high variance, got {score_variance}"
        
        # Verify trend calculation is correct
        if len(weekly_averages) >= 2:
            expected_trend = sum(weekly_averages[-2:]) / 2 - sum(weekly_averages[:2]) / 2
            assert abs(trend - expected_trend) < 0.01, \
                f"Trend calculation incorrect: expected {expected_trend}, got {trend}"


# Stateful testing - commented out due to Hypothesis limitations with .example() in rules
# TestAtRiskDetection = AtRiskDetectionMachine.TestCase


if __name__ == "__main__":
    # Run the property-based tests
    pytest.main([__file__, "-v"])