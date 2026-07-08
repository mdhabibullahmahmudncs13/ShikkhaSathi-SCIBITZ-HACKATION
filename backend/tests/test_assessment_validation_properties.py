"""
Property-Based Tests for Assessment Validation
**Feature: teacher-dashboard, Property 3: Assessment Question Validation**
**Validates: Requirements 2.3**
"""

import pytest
from hypothesis import given, strategies as st, settings, assume, HealthCheck
from datetime import datetime, timedelta
from typing import List, Dict, Any
from unittest.mock import Mock
import uuid

from app.models.assessment import Assessment, AssessmentQuestion, AssessmentRubric, RubricCriterion, RubricLevel
from app.services.assessment_validation_service import AssessmentValidationService, AssessmentValidationError


# Test data generators
@st.composite
def generate_valid_assessment_question(draw, assessment_id=None, order_index=None):
    """Generate a valid assessment question for testing"""
    if assessment_id is None:
        assessment_id = draw(st.uuids())
    if order_index is None:
        order_index = draw(st.integers(min_value=1, max_value=100))
    
    question_type = draw(st.sampled_from(['multiple_choice', 'true_false', 'short_answer', 'essay']))
    
    # Generate appropriate options and correct answer based on type
    if question_type == 'multiple_choice':
        num_options = draw(st.integers(min_value=2, max_value=6))
        options = [f"Option {i}" for i in range(1, num_options + 1)]
        correct_answer = draw(st.sampled_from(options))
    elif question_type == 'true_false':
        options = None
        correct_answer = draw(st.sampled_from(['true', 'false']))
    else:
        options = None
        # Generate non-empty correct answer with actual content
        correct_answer = draw(st.text(min_size=1, max_size=100).filter(lambda x: x.strip() != ""))
    
    return AssessmentQuestion(
        id=draw(st.uuids()),
        assessment_id=assessment_id,
        question_type=question_type,
        question_text=draw(st.text(min_size=10, max_size=500).filter(lambda x: x.strip() != "")),
        options=options,
        correct_answer=correct_answer,
        explanation=draw(st.text(min_size=5, max_size=200).filter(lambda x: x.strip() != "")),
        bloom_level=draw(st.integers(min_value=1, max_value=6)),
        topic=draw(st.text(min_size=3, max_size=50).filter(lambda x: x.strip() != "")),
        difficulty=draw(st.integers(min_value=1, max_value=10)),
        points=draw(st.integers(min_value=1, max_value=20)),
        order_index=order_index,
        created_at=datetime.utcnow()
    )


@st.composite
def generate_invalid_assessment_question(draw, assessment_id=None, order_index=None):
    """Generate an invalid assessment question for testing"""
    if assessment_id is None:
        assessment_id = draw(st.uuids())
    if order_index is None:
        order_index = draw(st.integers(min_value=1, max_value=100))
    
    # Choose what to make invalid
    invalid_type = draw(st.sampled_from([
        'empty_question_text', 'invalid_question_type', 'empty_correct_answer',
        'invalid_bloom_level', 'invalid_difficulty', 'invalid_points',
        'multiple_choice_no_options', 'multiple_choice_wrong_answer',
        'true_false_wrong_answer'
    ]))
    
    question_type = draw(st.sampled_from(['multiple_choice', 'true_false', 'short_answer', 'essay']))
    
    # Start with valid defaults
    question_text = draw(st.text(min_size=10, max_size=500, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Pc', 'Pd', 'Zs', 'Po'))))
    options = None
    correct_answer = draw(st.text(min_size=1, max_size=100, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Pc', 'Pd', 'Zs'))))
    bloom_level = draw(st.integers(min_value=1, max_value=6))
    difficulty = draw(st.integers(min_value=1, max_value=10))
    points = draw(st.integers(min_value=1, max_value=20))
    
    # Apply the chosen invalid condition
    if invalid_type == 'empty_question_text':
        question_text = ""
    elif invalid_type == 'invalid_question_type':
        question_type = "invalid_type"
    elif invalid_type == 'empty_correct_answer':
        correct_answer = ""
    elif invalid_type == 'invalid_bloom_level':
        bloom_level = draw(st.integers().filter(lambda x: x < 1 or x > 6))
    elif invalid_type == 'invalid_difficulty':
        difficulty = draw(st.integers().filter(lambda x: x < 1 or x > 10))
    elif invalid_type == 'invalid_points':
        points = draw(st.integers().filter(lambda x: x < 1 or x > 20))
    elif invalid_type == 'multiple_choice_no_options':
        question_type = 'multiple_choice'
        options = None
    elif invalid_type == 'multiple_choice_wrong_answer':
        question_type = 'multiple_choice'
        options = ["Option A", "Option B", "Option C"]
        correct_answer = "Option D"  # Not in options
    elif invalid_type == 'true_false_wrong_answer':
        question_type = 'true_false'
        correct_answer = "maybe"  # Invalid for true/false
    
    # Set up options correctly for valid multiple choice (unless we're testing invalid options)
    if question_type == 'multiple_choice' and invalid_type not in ['multiple_choice_no_options', 'multiple_choice_wrong_answer']:
        num_options = draw(st.integers(min_value=2, max_value=6))
        options = [f"Option {i}" for i in range(1, num_options + 1)]
        if invalid_type != 'empty_correct_answer':
            correct_answer = draw(st.sampled_from(options))
    elif question_type == 'true_false' and invalid_type not in ['true_false_wrong_answer', 'empty_correct_answer']:
        correct_answer = draw(st.sampled_from(['true', 'false']))
    
    return AssessmentQuestion(
        id=draw(st.uuids()),
        assessment_id=assessment_id,
        question_type=question_type,
        question_text=question_text,
        options=options,
        correct_answer=correct_answer,
        explanation=draw(st.text(min_size=0, max_size=200, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Pc', 'Pd', 'Zs', 'Po')))),
        bloom_level=bloom_level,
        topic=draw(st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Pc', 'Pd', 'Zs')))),
        difficulty=difficulty,
        points=points,
        order_index=order_index,
        created_at=datetime.utcnow()
    )


@st.composite
def generate_valid_assessment(draw, with_questions=True):
    """Generate a valid assessment for testing"""
    assessment_id = draw(st.uuids())
    bloom_levels = draw(st.lists(st.integers(min_value=1, max_value=6), min_size=1, max_size=4, unique=True))
    question_count = draw(st.integers(min_value=max(1, len(bloom_levels)), max_value=20))
    
    assessment = Assessment(
        id=assessment_id,
        title=draw(st.text(min_size=5, max_size=100, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Pc', 'Pd', 'Zs')))),
        description=draw(st.text(min_size=10, max_size=500, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Pc', 'Pd', 'Zs', 'Po')))),
        subject=draw(st.sampled_from(['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Bangla'])),
        grade=draw(st.integers(min_value=6, max_value=12)),
        teacher_id=draw(st.uuids()),
        bloom_levels=bloom_levels,
        topics=draw(st.lists(st.text(min_size=3, max_size=30, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Pc', 'Pd', 'Zs'))), min_size=1, max_size=5)),
        question_count=question_count,
        time_limit=draw(st.integers(min_value=10, max_value=180)),
        difficulty=draw(st.sampled_from(['easy', 'medium', 'hard', 'adaptive'])),
        assigned_classes=[str(draw(st.uuids())) for _ in range(draw(st.integers(min_value=1, max_value=3)))],
        is_published=False,
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    if with_questions:
        # Generate questions that cover all required Bloom levels
        questions = []
        
        # First, ensure we have at least one question for each required Bloom level
        for i, required_bloom_level in enumerate(bloom_levels):
            question = draw(generate_valid_assessment_question(assessment_id, i + 1))
            question.bloom_level = required_bloom_level
            questions.append(question)
        
        # Fill remaining questions with random Bloom levels from the required set
        for i in range(len(bloom_levels), question_count):
            question = draw(generate_valid_assessment_question(assessment_id, i + 1))
            question.bloom_level = draw(st.sampled_from(bloom_levels))
            questions.append(question)
        
        assessment.questions = questions
    
    return assessment


class TestAssessmentValidationProperties:
    """Property-based tests for assessment validation"""

    @given(st.data())
    @settings(max_examples=100)
    def test_valid_assessment_passes_validation_property(self, data):
        """
        **Feature: teacher-dashboard, Property 3: Assessment Question Validation**
        
        For any valid assessment with properly formed questions, the validation
        should pass and the assessment should be ready for publishing.
        
        **Validates: Requirements 2.3**
        """
        # Generate a valid assessment
        assessment = data.draw(generate_valid_assessment(with_questions=True))
        
        # Create validation service
        mock_db = Mock()
        service = AssessmentValidationService(mock_db)
        
        # Validate the assessment
        is_valid, errors = service.validate_assessment_for_publishing(assessment)
        
        # Property: Valid assessments should pass validation
        assert is_valid, f"Valid assessment should pass validation, but got errors: {errors}"
        assert len(errors) == 0, f"Valid assessment should have no errors, but got: {errors}"
        
        # Property: Valid assessments should have high completeness score
        completeness = service.get_assessment_completeness_score(assessment)
        assert completeness['completeness_score'] >= 90, \
            f"Valid assessment should have high completeness score, got {completeness['completeness_score']}%"
        assert completeness['is_ready_for_publishing'], \
            "Valid assessment should be ready for publishing"

    @given(st.data())
    @settings(max_examples=50)
    def test_invalid_questions_fail_validation_property(self, data):
        """
        **Feature: teacher-dashboard, Property 3: Assessment Question Validation**
        
        For any assessment with invalid questions (missing correct answers,
        invalid options, etc.), the validation should fail.
        
        **Validates: Requirements 2.3**
        """
        # Generate a valid assessment base
        assessment = data.draw(generate_valid_assessment(with_questions=False))
        
        # Add some valid questions and some invalid questions
        num_valid = data.draw(st.integers(min_value=0, max_value=3))
        num_invalid = data.draw(st.integers(min_value=1, max_value=3))
        
        questions = []
        
        # Add valid questions
        for i in range(num_valid):
            question = data.draw(generate_valid_assessment_question(assessment.id, i + 1))
            questions.append(question)
        
        # Add invalid questions
        for i in range(num_invalid):
            question = data.draw(generate_invalid_assessment_question(assessment.id, num_valid + i + 1))
            questions.append(question)
        
        assessment.questions = questions
        assessment.question_count = len(questions)
        
        # Create validation service
        mock_db = Mock()
        service = AssessmentValidationService(mock_db)
        
        # Validate the assessment
        is_valid, errors = service.validate_assessment_for_publishing(assessment)
        
        # Property: Assessments with invalid questions should fail validation
        assert not is_valid, "Assessment with invalid questions should fail validation"
        assert len(errors) > 0, "Assessment with invalid questions should have validation errors"
        
        # Property: Should have lower completeness score or validation errors
        completeness = service.get_assessment_completeness_score(assessment)
        # Note: Completeness score might still be high if basic fields are filled,
        # but validation should catch the invalid questions
        if completeness['is_ready_for_publishing']:
            # If completeness says it's ready, validation should still catch the invalid questions
            assert not is_valid, "Validation should catch invalid questions even if completeness score is high"

    @given(st.data())
    @settings(max_examples=50)
    def test_bloom_level_coverage_validation_property(self, data):
        """
        **Feature: teacher-dashboard, Property 3: Assessment Question Validation**
        
        For any assessment, all specified Bloom levels must be covered by
        the questions, or validation should fail.
        
        **Validates: Requirements 2.3**
        """
        # Generate assessment with specific Bloom levels
        required_bloom_levels = data.draw(st.lists(st.integers(min_value=1, max_value=6), min_size=2, max_size=4, unique=True))
        question_count = data.draw(st.integers(min_value=len(required_bloom_levels), max_value=10))
        
        assessment = Assessment(
            id=data.draw(st.uuids()),
            title=data.draw(st.text(min_size=5, max_size=100, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Pc', 'Pd', 'Zs')))),
            subject=data.draw(st.sampled_from(['Mathematics', 'Physics', 'Chemistry'])),
            grade=data.draw(st.integers(min_value=6, max_value=12)),
            teacher_id=data.draw(st.uuids()),
            bloom_levels=required_bloom_levels,
            topics=["Topic 1", "Topic 2"],
            question_count=question_count,
            time_limit=30,
            difficulty="medium",
            assigned_classes=[str(data.draw(st.uuids()))],
            is_published=False,
            is_active=True,
            created_at=datetime.utcnow()
        )
        
        # Generate questions that may or may not cover all Bloom levels
        questions = []
        covered_bloom_levels = set()
        
        for i in range(question_count):
            question = data.draw(generate_valid_assessment_question(assessment.id, i + 1))
            # Randomly assign Bloom levels (may not cover all required ones)
            question.bloom_level = data.draw(st.integers(min_value=1, max_value=6))
            covered_bloom_levels.add(question.bloom_level)
            questions.append(question)
        
        assessment.questions = questions
        
        # Create validation service
        mock_db = Mock()
        service = AssessmentValidationService(mock_db)
        
        # Validate the assessment
        is_valid, errors = service.validate_assessment_for_publishing(assessment)
        
        # Property: Assessment should be valid only if all required Bloom levels are covered
        required_set = set(required_bloom_levels)
        covered_set = covered_bloom_levels
        
        if required_set.issubset(covered_set):
            # All required levels are covered - should be valid (assuming no other errors)
            bloom_level_errors = [e for e in errors if "Bloom level" in e]
            assert len(bloom_level_errors) == 0, \
                f"Assessment covering all Bloom levels should not have Bloom level errors: {bloom_level_errors}"
        else:
            # Not all required levels are covered - should have errors
            assert not is_valid, "Assessment not covering all required Bloom levels should fail validation"
            bloom_level_errors = [e for e in errors if "Bloom level" in e or "cover all specified" in e]
            assert len(bloom_level_errors) > 0, \
                "Assessment missing required Bloom levels should have Bloom level validation errors"

    @given(st.data())
    @settings(max_examples=30)
    def test_multiple_choice_question_validation_property(self, data):
        """
        **Feature: teacher-dashboard, Property 3: Assessment Question Validation**
        
        For any multiple choice question, it must have valid options and the
        correct answer must be one of the options.
        
        **Validates: Requirements 2.3**
        """
        assessment_id = data.draw(st.uuids())
        
        # Generate multiple choice question with controlled validity
        is_valid_question = data.draw(st.booleans())
        
        if is_valid_question:
            # Create valid multiple choice question
            num_options = data.draw(st.integers(min_value=2, max_value=6))
            options = [f"Option {chr(65 + i)}" for i in range(num_options)]  # A, B, C, etc.
            correct_answer = data.draw(st.sampled_from(options))
        else:
            # Create invalid multiple choice question
            invalid_type = data.draw(st.sampled_from(['no_options', 'wrong_answer', 'too_few_options']))
            
            if invalid_type == 'no_options':
                options = None
                correct_answer = "Option A"
            elif invalid_type == 'wrong_answer':
                options = ["Option A", "Option B", "Option C"]
                correct_answer = "Option D"  # Not in options
            else:  # too_few_options
                options = ["Only One Option"]
                correct_answer = "Only One Option"
        
        question = AssessmentQuestion(
            id=data.draw(st.uuids()),
            assessment_id=assessment_id,
            question_type="multiple_choice",
            question_text=data.draw(st.text(min_size=10, max_size=200, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Pc', 'Pd', 'Zs', 'Po')))),
            options=options,
            correct_answer=correct_answer,
            explanation="Test explanation",
            bloom_level=data.draw(st.integers(min_value=1, max_value=6)),
            topic="Test Topic",
            difficulty=data.draw(st.integers(min_value=1, max_value=10)),
            points=data.draw(st.integers(min_value=1, max_value=10)),
            order_index=1,
            created_at=datetime.utcnow()
        )
        
        # Create validation service
        mock_db = Mock()
        service = AssessmentValidationService(mock_db)
        
        # Validate the question
        errors = service._validate_single_question(question, 1)
        
        # Property: Question validity should match expected validity
        if is_valid_question:
            multiple_choice_errors = [e for e in errors if "multiple choice" in e.lower() or "options" in e.lower()]
            assert len(multiple_choice_errors) == 0, \
                f"Valid multiple choice question should not have option-related errors: {multiple_choice_errors}"
        else:
            assert len(errors) > 0, "Invalid multiple choice question should have validation errors"
            # Should have specific multiple choice related errors
            has_mc_error = any("multiple choice" in e.lower() or "options" in e.lower() or "correct answer" in e.lower() 
                              for e in errors)
            assert has_mc_error, f"Invalid multiple choice question should have relevant errors: {errors}"

    @given(st.data())
    @settings(max_examples=30)
    def test_assessment_completeness_score_property(self, data):
        """
        **Feature: teacher-dashboard, Property 3: Assessment Question Validation**
        
        For any assessment, the completeness score should accurately reflect
        the proportion of required elements that are properly filled.
        
        **Validates: Requirements 2.3**
        """
        # Generate assessment with varying levels of completeness
        completeness_level = data.draw(st.sampled_from(['minimal', 'partial', 'complete']))
        
        if completeness_level == 'minimal':
            # Minimal assessment - only required fields
            assessment = Assessment(
                id=data.draw(st.uuids()),
                title=data.draw(st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Pc', 'Pd', 'Zs')))),
                description=None,  # Optional
                subject=data.draw(st.sampled_from(['Mathematics', 'Physics'])),
                grade=data.draw(st.integers(min_value=6, max_value=12)),
                teacher_id=data.draw(st.uuids()),
                bloom_levels=[1, 2],
                topics=["Topic 1"],
                question_count=1,
                time_limit=30,
                difficulty="medium",
                assigned_classes=[str(data.draw(st.uuids()))],
                is_published=False,
                is_active=True,
                created_at=datetime.utcnow()
            )
            assessment.questions = []  # No questions yet
            
        elif completeness_level == 'partial':
            # Partial assessment - some optional fields filled
            assessment = Assessment(
                id=data.draw(st.uuids()),
                title=data.draw(st.text(min_size=5, max_size=100, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Pc', 'Pd', 'Zs')))),
                description=data.draw(st.text(min_size=10, max_size=200, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Pc', 'Pd', 'Zs', 'Po')))),
                subject=data.draw(st.sampled_from(['Mathematics', 'Physics'])),
                grade=data.draw(st.integers(min_value=6, max_value=12)),
                teacher_id=data.draw(st.uuids()),
                bloom_levels=[1, 2, 3],
                topics=["Topic 1", "Topic 2"],
                question_count=2,
                time_limit=45,
                difficulty="medium",
                assigned_classes=[str(data.draw(st.uuids()))],
                is_published=False,
                is_active=True,
                created_at=datetime.utcnow()
            )
            # Add some questions but not all
            assessment.questions = [data.draw(generate_valid_assessment_question(assessment.id, 1))]
            
        else:  # complete
            # Complete assessment - all fields properly filled
            assessment = data.draw(generate_valid_assessment(with_questions=True))
        
        # Create validation service
        mock_db = Mock()
        service = AssessmentValidationService(mock_db)
        
        # Get completeness score
        completeness = service.get_assessment_completeness_score(assessment)
        
        # Property: Completeness score should be between 0 and 100
        assert 0 <= completeness['completeness_score'] <= 100, \
            f"Completeness score should be between 0 and 100, got {completeness['completeness_score']}"
        
        # Property: Passed checks should not exceed total checks
        assert completeness['passed_checks'] <= completeness['total_checks'], \
            "Passed checks cannot exceed total checks"
        
        # Property: Score should match the ratio of passed/total checks
        expected_score = (completeness['passed_checks'] / completeness['total_checks']) * 100
        assert abs(completeness['completeness_score'] - expected_score) < 0.1, \
            f"Completeness score {completeness['completeness_score']} should match calculated score {expected_score}"
        
        # Property: Ready for publishing should match high completeness
        if completeness['completeness_score'] >= 90:
            assert completeness['is_ready_for_publishing'], \
                "High completeness score should indicate ready for publishing"
        else:
            assert not completeness['is_ready_for_publishing'], \
                "Low completeness score should indicate not ready for publishing"
        
        # Property: More complete assessments should have higher scores
        if completeness_level == 'complete':
            assert completeness['completeness_score'] >= 90, \
                "Complete assessment should have high completeness score"
        elif completeness_level == 'minimal':
            assert completeness['completeness_score'] < 90, \
                "Minimal assessment should have lower completeness score"

    @given(st.data())
    @settings(max_examples=20, suppress_health_check=[HealthCheck.data_too_large])
    def test_assessment_publishing_workflow_property(self, data):
        """
        **Feature: teacher-dashboard, Property 3: Assessment Question Validation**
        
        For any assessment, the publishing workflow should only allow
        publication of valid, complete assessments.
        
        **Validates: Requirements 2.3, 2.4**
        """
        # Generate assessment with varying validity
        is_valid_for_publishing = data.draw(st.booleans())
        
        if is_valid_for_publishing:
            assessment = data.draw(generate_valid_assessment(with_questions=True))
            assessment.is_published = False  # Not yet published
            assessment.is_active = True
        else:
            # Create assessment with publishing issues
            assessment = data.draw(generate_valid_assessment(with_questions=True))
            issue_type = data.draw(st.sampled_from(['already_published', 'inactive', 'invalid_questions']))
            
            if issue_type == 'already_published':
                assessment.is_published = True
            elif issue_type == 'inactive':
                assessment.is_active = False
            else:  # invalid_questions
                # Make questions invalid
                for question in assessment.questions:
                    question.correct_answer = ""  # Invalid
        
        # Create validation service
        mock_db = Mock()
        service = AssessmentValidationService(mock_db)
        
        # Test publishing workflow validation
        can_publish, errors = service.validate_assessment_publishing_workflow(assessment)
        
        # Property: Publishing should only be allowed for valid assessments
        if is_valid_for_publishing:
            assert can_publish, f"Valid assessment should be publishable, but got errors: {errors}"
        else:
            assert not can_publish, "Invalid assessment should not be publishable"
            assert len(errors) > 0, "Invalid assessment should have publishing errors"