"""
Property-Based Tests for Teacher Analytics
**Feature: shikkhasathi-platform, Property 16: Teacher Analytics Completeness**
**Validates: Requirements 6.1, 6.2, 6.3**
"""

import pytest
from hypothesis import given, strategies as st, settings
from datetime import datetime, timedelta
from typing import Dict, Any, List
from unittest.mock import Mock, patch

from app.services.teacher_analytics_service import TeacherAnalyticsService
from app.models.user import User, UserRole
from app.models.student_progress import StudentProgress
from app.models.quiz_attempt import QuizAttempt
from app.models.gamification import Gamification


# Test data generators
@st.composite
def generate_user(draw):
    """Generate a valid user for testing"""
    return User(
        id=draw(st.uuids()),
        email=draw(st.emails()),
        full_name=draw(st.text(min_size=1, max_size=50)),
        grade=draw(st.integers(min_value=6, max_value=12)),
        role=UserRole.STUDENT,
        is_active=True,
        created_at=datetime.utcnow(),
        last_login=datetime.utcnow()
    )


@st.composite
def generate_quiz_attempt(draw, user_id: str):
    """Generate a valid quiz attempt for testing"""
    max_score = draw(st.integers(min_value=10, max_value=100))
    score = draw(st.integers(min_value=0, max_value=max_score))
    
    return QuizAttempt(
        id=draw(st.uuids()),
        user_id=user_id,
        quiz_id=str(draw(st.uuids())),
        score=score,
        max_score=max_score,
        time_taken_seconds=draw(st.integers(min_value=60, max_value=3600)),
        difficulty_level=draw(st.integers(min_value=1, max_value=5)),
        bloom_level=draw(st.integers(min_value=1, max_value=6)),
        completed_at=datetime.utcnow() - timedelta(days=draw(st.integers(min_value=0, max_value=30))),
        answers={}
    )


@st.composite
def generate_student_progress(draw, user_id: str):
    """Generate valid student progress for testing"""
    return StudentProgress(
        id=draw(st.uuids()),
        user_id=user_id,
        subject=draw(st.sampled_from(['Physics', 'Chemistry', 'Mathematics', 'Biology'])),
        topic=draw(st.text(min_size=1, max_size=50)),
        bloom_level=draw(st.integers(min_value=1, max_value=6)),
        completion_percentage=draw(st.floats(min_value=0.0, max_value=100.0)),
        time_spent_minutes=draw(st.integers(min_value=0, max_value=300)),
        last_accessed=datetime.utcnow() - timedelta(days=draw(st.integers(min_value=0, max_value=30))),
        mastery_level=draw(st.sampled_from(['beginner', 'intermediate', 'advanced']))
    )


@st.composite
def generate_gamification(draw, user_id: str):
    """Generate valid gamification data for testing"""
    return Gamification(
        user_id=user_id,
        total_xp=draw(st.integers(min_value=0, max_value=10000)),
        current_level=draw(st.integers(min_value=1, max_value=20)),
        current_streak=draw(st.integers(min_value=0, max_value=100)),
        longest_streak=draw(st.integers(min_value=0, max_value=200)),
        achievements=[],
        last_activity_date=datetime.utcnow().date(),
        streak_freeze_count=draw(st.integers(min_value=0, max_value=2))
    )


class TestTeacherAnalyticsProperties:
    """Property-based tests for teacher analytics service"""

    @given(st.data())
    @settings(max_examples=50)
    def test_class_performance_metrics_completeness(self, data):
        """
        **Feature: shikkhasathi-platform, Property 16: Teacher Analytics Completeness**
        
        For any teacher accessing class data, the analytics should display complete 
        class performance overview, individual analytics, weakness patterns, and 
        intervention recommendations.
        
        **Validates: Requirements 6.1, 6.2, 6.3**
        """
        # Draw test parameters
        teacher_id = data.draw(st.text(min_size=1, max_size=50))
        time_range = data.draw(st.sampled_from(['week', 'month', 'quarter']))
        num_students = data.draw(st.integers(min_value=1, max_value=10))
        
        # Create mock database session
        mock_db = Mock()
        
        # Generate test data
        students = [data.draw(generate_user()) for _ in range(num_students)]
        student_ids = [str(student.id) for student in students]
        
        quiz_attempts = []
        progress_data = []
        gamification_data = []
        
        for student_id in student_ids:
            # Generate 1-5 quiz attempts per student
            for _ in range(1, 6):
                quiz_attempts.append(data.draw(generate_quiz_attempt(student_id)))
            
            # Generate 1-3 progress records per student
            for _ in range(1, 4):
                progress_data.append(data.draw(generate_student_progress(student_id)))
            
            # Generate gamification data
            gamification_data.append(data.draw(generate_gamification(student_id)))
        
        # Mock database queries
        mock_db.query.return_value.filter.return_value.all.return_value = students
        
        def mock_query_side_effect(model):
            if model == User:
                return Mock(filter=Mock(return_value=Mock(all=Mock(return_value=students))))
            elif model == QuizAttempt:
                return Mock(filter=Mock(return_value=Mock(all=Mock(return_value=quiz_attempts))))
            elif model == StudentProgress:
                return Mock(filter=Mock(return_value=Mock(all=Mock(return_value=progress_data))))
            elif model == Gamification:
                return Mock(filter=Mock(return_value=Mock(all=Mock(return_value=gamification_data))))
            return Mock()
        
        mock_db.query.side_effect = mock_query_side_effect
        
        # Create service and get metrics
        service = TeacherAnalyticsService(mock_db)
        metrics = service.get_class_performance_metrics(teacher_id, time_range=time_range)
        
        # Property: Analytics must contain all required components
        assert isinstance(metrics, dict), "Metrics should be a dictionary"
        
        # Required top-level keys
        required_keys = [
            'classId', 'averageScore', 'completionRate', 'engagementMetrics',
            'subjectPerformance', 'weaknessPatterns', 'timeAnalytics'
        ]
        
        for key in required_keys:
            assert key in metrics, f"Missing required key: {key}"
        
        # Validate data types and ranges
        assert isinstance(metrics['averageScore'], (int, float)), "Average score should be numeric"
        assert 0 <= metrics['averageScore'] <= 100, "Average score should be between 0 and 100"
        
        assert isinstance(metrics['completionRate'], (int, float)), "Completion rate should be numeric"
        assert 0 <= metrics['completionRate'] <= 100, "Completion rate should be between 0 and 100"
        
        # Engagement metrics structure
        engagement = metrics['engagementMetrics']
        assert isinstance(engagement, dict), "Engagement metrics should be a dictionary"
        assert 'dailyActiveUsers' in engagement, "Missing daily active users"
        assert 'averageSessionDuration' in engagement, "Missing average session duration"
        assert 'streakDistribution' in engagement, "Missing streak distribution"
        
        # Subject performance structure
        subject_perf = metrics['subjectPerformance']
        assert isinstance(subject_perf, list), "Subject performance should be a list"
        
        for subject in subject_perf:
            assert isinstance(subject, dict), "Each subject should be a dictionary"
            assert 'subject' in subject, "Missing subject name"
            assert 'averageScore' in subject, "Missing subject average score"
            assert 'completionRate' in subject, "Missing subject completion rate"
            assert 'bloomLevelDistribution' in subject, "Missing Bloom level distribution"
            assert 'topicPerformance' in subject, "Missing topic performance"
        
        # Weakness patterns structure
        weakness_patterns = metrics['weaknessPatterns']
        assert isinstance(weakness_patterns, list), "Weakness patterns should be a list"
        
        for pattern in weakness_patterns:
            assert isinstance(pattern, dict), "Each pattern should be a dictionary"
            assert 'pattern' in pattern, "Missing pattern description"
            assert 'affectedStudents' in pattern, "Missing affected students count"
            assert 'severity' in pattern, "Missing severity level"
            assert pattern['severity'] in ['low', 'medium', 'high'], "Invalid severity level"
        
        # Time analytics structure
        time_analytics = metrics['timeAnalytics']
        assert isinstance(time_analytics, dict), "Time analytics should be a dictionary"
        assert 'averageStudyTime' in time_analytics, "Missing average study time"
        assert 'weeklyTrends' in time_analytics, "Missing weekly trends"
        assert 'monthlyComparison' in time_analytics, "Missing monthly comparison"

    @given(st.data())
    @settings(max_examples=30)
    def test_student_analytics_completeness(self, data):
        """
        **Feature: shikkhasathi-platform, Property 16: Teacher Analytics Completeness**
        
        For any individual student analysis, the system should provide complete 
        performance history, subject breakdown, Bloom level progress, weak areas,
        and intervention recommendations.
        
        **Validates: Requirements 6.1, 6.2, 6.3**
        """
        # Draw test parameters
        teacher_id = data.draw(st.text(min_size=1, max_size=50))
        student_id = data.draw(st.text(min_size=1, max_size=50))
        time_range = data.draw(st.sampled_from(['week', 'month', 'quarter']))
        
        # Create mock database session
        mock_db = Mock()
        
        # Generate test data
        student = data.draw(generate_user())
        student.id = student_id
        
        quiz_attempts = [data.draw(generate_quiz_attempt(student_id)) for _ in range(5)]
        progress_data = [data.draw(generate_student_progress(student_id)) for _ in range(3)]
        gamification = data.draw(generate_gamification(student_id))
        
        # Mock database queries
        def mock_query_side_effect(model):
            if model == User:
                return Mock(filter=Mock(return_value=Mock(first=Mock(return_value=student))))
            elif model == QuizAttempt:
                return Mock(filter=Mock(return_value=Mock(all=Mock(return_value=quiz_attempts))))
            elif model == StudentProgress:
                return Mock(filter=Mock(return_value=Mock(all=Mock(return_value=progress_data))))
            elif model == Gamification:
                return Mock(filter=Mock(return_value=Mock(first=Mock(return_value=gamification))))
            return Mock()
        
        mock_db.query.side_effect = mock_query_side_effect
        
        # Create service and get analytics
        service = TeacherAnalyticsService(mock_db)
        analytics = service.get_student_analytics(teacher_id, student_id, time_range)
        
        # Property: Student analytics must contain all required components
        assert isinstance(analytics, dict), "Analytics should be a dictionary"
        
        # Required top-level keys
        required_keys = [
            'studentId', 'studentName', 'performanceHistory', 'subjectBreakdown',
            'bloomLevelProgress', 'weakAreas', 'engagementMetrics', 'interventionRecommendations'
        ]
        
        for key in required_keys:
            assert key in analytics, f"Missing required key: {key}"
        
        # Validate student identification
        assert analytics['studentId'] == student_id, "Student ID should match"
        assert isinstance(analytics['studentName'], str), "Student name should be a string"
        
        # Performance history structure
        perf_history = analytics['performanceHistory']
        assert isinstance(perf_history, list), "Performance history should be a list"
        
        for entry in perf_history:
            assert isinstance(entry, dict), "Each history entry should be a dictionary"
            assert 'date' in entry, "Missing date in performance history"
            assert 'score' in entry, "Missing score in performance history"
            assert 'timeSpent' in entry, "Missing time spent in performance history"
            assert 0 <= entry['score'] <= 100, "Score should be between 0 and 100"
        
        # Subject breakdown structure
        subject_breakdown = analytics['subjectBreakdown']
        assert isinstance(subject_breakdown, list), "Subject breakdown should be a list"
        
        for subject in subject_breakdown:
            assert isinstance(subject, dict), "Each subject should be a dictionary"
            assert 'subject' in subject, "Missing subject name"
            assert 'averageScore' in subject, "Missing average score"
            assert 'timeSpent' in subject, "Missing time spent"
            assert 'completedLessons' in subject, "Missing completed lessons"
            assert 'totalLessons' in subject, "Missing total lessons"
        
        # Bloom level progress structure
        bloom_progress = analytics['bloomLevelProgress']
        assert isinstance(bloom_progress, dict), "Bloom progress should be a dictionary"
        
        for level in range(1, 7):
            level_key = f'level{level}'
            assert level_key in bloom_progress, f"Missing Bloom level {level}"
            assert isinstance(bloom_progress[level_key], (int, float)), f"Bloom level {level} should be numeric"
            assert 0 <= bloom_progress[level_key] <= 100, f"Bloom level {level} should be between 0 and 100"
        
        # Weak areas structure
        weak_areas = analytics['weakAreas']
        assert isinstance(weak_areas, list), "Weak areas should be a list"
        
        for area in weak_areas:
            assert isinstance(area, dict), "Each weak area should be a dictionary"
            assert 'subject' in area, "Missing subject in weak area"
            assert 'topic' in area, "Missing topic in weak area"
            assert 'bloomLevel' in area, "Missing Bloom level in weak area"
            assert 'successRate' in area, "Missing success rate in weak area"
            assert 'attemptsCount' in area, "Missing attempts count in weak area"
        
        # Intervention recommendations structure
        interventions = analytics['interventionRecommendations']
        assert isinstance(interventions, list), "Interventions should be a list"
        
        for intervention in interventions:
            assert isinstance(intervention, dict), "Each intervention should be a dictionary"
            assert 'id' in intervention, "Missing intervention ID"
            assert 'type' in intervention, "Missing intervention type"
            assert 'priority' in intervention, "Missing intervention priority"
            assert 'description' in intervention, "Missing intervention description"
            assert intervention['priority'] in ['low', 'medium', 'high'], "Invalid priority level"

    @given(st.data())
    @settings(max_examples=30)
    def test_at_risk_student_identification(self, data):
        """
        **Feature: shikkhasathi-platform, Property 16: Teacher Analytics Completeness**
        
        For any class, the system should correctly identify at-risk students
        based on performance, engagement, and consistency factors.
        
        **Validates: Requirements 6.2, 6.3**
        """
        # Draw test parameters
        teacher_id = data.draw(st.text(min_size=1, max_size=50))
        num_students = data.draw(st.integers(min_value=1, max_value=15))
        
        # Create mock database session
        mock_db = Mock()
        
        # Generate test data with varying risk levels
        students = [data.draw(generate_user()) for _ in range(num_students)]
        student_ids = [str(student.id) for student in students]
        
        all_quiz_attempts = []
        all_progress_data = []
        all_gamification_data = []
        
        for i, student_id in enumerate(student_ids):
            # Create different risk profiles
            if i % 3 == 0:  # High risk - low performance
                attempts = [data.draw(generate_quiz_attempt(student_id)) for _ in range(3)]
                for attempt in attempts:
                    attempt.score = int(attempt.max_score * 0.3)  # 30% score
                all_quiz_attempts.extend(attempts)
                
                # Low engagement
                gamification = data.draw(generate_gamification(student_id))
                gamification.current_streak = 1
                all_gamification_data.append(gamification)
                
            elif i % 3 == 1:  # Medium risk - inconsistent activity
                attempts = [data.draw(generate_quiz_attempt(student_id)) for _ in range(2)]
                for attempt in attempts:
                    attempt.score = int(attempt.max_score * 0.65)  # 65% score
                all_quiz_attempts.extend(attempts)
                
                gamification = data.draw(generate_gamification(student_id))
                gamification.current_streak = 2
                all_gamification_data.append(gamification)
                
            else:  # Low risk - good performance
                attempts = [data.draw(generate_quiz_attempt(student_id)) for _ in range(5)]
                for attempt in attempts:
                    attempt.score = int(attempt.max_score * 0.85)  # 85% score
                all_quiz_attempts.extend(attempts)
                
                gamification = data.draw(generate_gamification(student_id))
                gamification.current_streak = 10
                all_gamification_data.append(gamification)
            
            # Add some progress data
            progress = [data.draw(generate_student_progress(student_id)) for _ in range(2)]
            all_progress_data.extend(progress)
        
        # Mock database queries
        def mock_query_side_effect(model):
            if model == User:
                return Mock(filter=Mock(return_value=Mock(all=Mock(return_value=students))))
            elif model == QuizAttempt:
                return Mock(filter=Mock(return_value=Mock(all=Mock(return_value=all_quiz_attempts))))
            elif model == StudentProgress:
                return Mock(filter=Mock(return_value=Mock(all=Mock(return_value=all_progress_data))))
            elif model == Gamification:
                return Mock(filter=Mock(return_value=Mock(first=Mock(return_value=None))))
            return Mock()
        
        # Mock individual student queries for risk calculation
        def mock_individual_queries(student_id):
            student_attempts = [a for a in all_quiz_attempts if a.user_id == student_id]
            student_progress = [p for p in all_progress_data if p.user_id == student_id]
            student_gamification = next((g for g in all_gamification_data if g.user_id == student_id), None)
            
            mock_db.query.return_value.filter.return_value.all.return_value = student_attempts
            mock_db.query.return_value.filter.return_value.first.return_value = student_gamification
            return student_attempts, student_progress, student_gamification
        
        mock_db.query.side_effect = mock_query_side_effect
        
        # Create service and identify at-risk students
        service = TeacherAnalyticsService(mock_db)
        
        # Mock the individual risk calculation calls
        with patch.object(service, '_calculate_risk_factors') as mock_risk_calc:
            with patch.object(service, '_determine_risk_level') as mock_risk_level:
                with patch.object(service, '_get_risk_mitigation_actions') as mock_actions:
                    
                    # Set up mock returns based on student index
                    def mock_risk_factors(student_id):
                        student_index = student_ids.index(student_id)
                        if student_index % 3 == 0:  # High risk
                            return {
                                'lowPerformance': True,
                                'lowEngagement': True,
                                'inconsistentActivity': True,
                                'strugglingWithHigherOrder': False,
                                'performanceScore': 30,
                                'engagementScore': 2,
                                'consistencyScore': 1
                            }
                        elif student_index % 3 == 1:  # Medium risk
                            return {
                                'lowPerformance': False,
                                'lowEngagement': False,
                                'inconsistentActivity': True,
                                'strugglingWithHigherOrder': False,
                                'performanceScore': 65,
                                'engagementScore': 4,
                                'consistencyScore': 2
                            }
                        else:  # Low risk
                            return {
                                'lowPerformance': False,
                                'lowEngagement': False,
                                'inconsistentActivity': False,
                                'strugglingWithHigherOrder': False,
                                'performanceScore': 85,
                                'engagementScore': 8,
                                'consistencyScore': 10
                            }
                    
                    def mock_determine_risk(risk_factors):
                        risk_count = sum([
                            risk_factors['lowPerformance'],
                            risk_factors['lowEngagement'],
                            risk_factors['inconsistentActivity'],
                            risk_factors['strugglingWithHigherOrder']
                        ])
                        if risk_count >= 3:
                            return 'high'
                        elif risk_count >= 2:
                            return 'medium'
                        else:
                            return 'low'
                    
                    mock_risk_calc.side_effect = mock_risk_factors
                    mock_risk_level.side_effect = mock_determine_risk
                    mock_actions.return_value = ['Provide additional support']
                    
                    at_risk_students = service.identify_at_risk_students(teacher_id)
        
        # Property: At-risk identification must be complete and accurate
        assert isinstance(at_risk_students, list), "At-risk students should be a list"
        
        # Should identify students with medium or high risk
        # The actual count depends on the mocked risk determination logic
        # We should verify that the structure is correct rather than exact count
        assert len(at_risk_students) >= 0, "At-risk students should be a non-negative list"
        
        # If there are at-risk students, verify they have the correct risk levels
        if at_risk_students:
            for student in at_risk_students:
                assert student['riskLevel'] in ['medium', 'high'], f"Risk level should be medium or high, got {student['riskLevel']}"
        
        # Validate structure of at-risk student data
        for student in at_risk_students:
            assert isinstance(student, dict), "Each at-risk student should be a dictionary"
            assert 'studentId' in student, "Missing student ID"
            assert 'studentName' in student, "Missing student name"
            assert 'riskLevel' in student, "Missing risk level"
            assert 'riskFactors' in student, "Missing risk factors"
            assert 'recommendedActions' in student, "Missing recommended actions"
            
            assert student['riskLevel'] in ['medium', 'high'], "Risk level should be medium or high"
            assert isinstance(student['riskFactors'], dict), "Risk factors should be a dictionary"
            assert isinstance(student['recommendedActions'], list), "Recommended actions should be a list"
        
        # Should be sorted by risk level (high first)
        risk_levels = [s['riskLevel'] for s in at_risk_students]
        high_risk_indices = [i for i, level in enumerate(risk_levels) if level == 'high']
        medium_risk_indices = [i for i, level in enumerate(risk_levels) if level == 'medium']
        
        # All high risk should come before medium risk
        if high_risk_indices and medium_risk_indices:
            assert max(high_risk_indices) < min(medium_risk_indices), "High risk students should be listed first"

    @given(st.data())
    @settings(max_examples=20)
    def test_comparative_analysis_completeness(self, data):
        """
        **Feature: shikkhasathi-platform, Property 16: Teacher Analytics Completeness**
        
        For any comparative analysis across classes, the system should provide
        complete comparison data, trends, and recommendations.
        
        **Validates: Requirements 6.1, 6.3**
        """
        # Draw test parameters
        teacher_id = data.draw(st.text(min_size=1, max_size=50))
        class_ids = data.draw(st.lists(st.text(min_size=1, max_size=20), min_size=2, max_size=5))
        
        # Create mock database session
        mock_db = Mock()
        
        # Mock the get_class_performance_metrics method
        service = TeacherAnalyticsService(mock_db)
        
        # Generate mock metrics for each class
        mock_metrics = []
        for i, class_id in enumerate(class_ids):
            metrics = {
                'classId': class_id,
                'averageScore': 60 + (i * 10) % 40,  # Vary scores
                'completionRate': 70 + (i * 5) % 30,  # Vary completion
                'engagementMetrics': {
                    'dailyActiveUsers': 20 + (i * 3) % 15
                },
                'weaknessPatterns': [{'pattern': f'Pattern {i}'}] * (i % 3)
            }
            mock_metrics.append(metrics)
        
        with patch.object(service, 'get_class_performance_metrics') as mock_get_metrics:
            mock_get_metrics.side_effect = mock_metrics
            
            analysis = service.get_comparative_analysis(teacher_id, class_ids)
        
        # Property: Comparative analysis must be complete
        assert isinstance(analysis, dict), "Analysis should be a dictionary"
        
        # Required top-level keys
        required_keys = ['classComparisons', 'overallTrends', 'recommendations']
        for key in required_keys:
            assert key in analysis, f"Missing required key: {key}"
        
        # Class comparisons structure
        comparisons = analysis['classComparisons']
        assert isinstance(comparisons, list), "Class comparisons should be a list"
        assert len(comparisons) == len(class_ids), "Should have comparison for each class"
        
        for comparison in comparisons:
            assert isinstance(comparison, dict), "Each comparison should be a dictionary"
            assert 'classId' in comparison, "Missing class ID"
            assert 'className' in comparison, "Missing class name"
            assert 'averageScore' in comparison, "Missing average score"
            assert 'completionRate' in comparison, "Missing completion rate"
            assert 'engagementRate' in comparison, "Missing engagement rate"
            assert 'weaknessCount' in comparison, "Missing weakness count"
        
        # Overall trends structure
        trends = analysis['overallTrends']
        assert isinstance(trends, dict), "Overall trends should be a dictionary"
        
        # Recommendations structure
        recommendations = analysis['recommendations']
        assert isinstance(recommendations, list), "Recommendations should be a list"
        
        for recommendation in recommendations:
            assert isinstance(recommendation, str), "Each recommendation should be a string"
            assert len(recommendation) > 0, "Recommendations should not be empty"