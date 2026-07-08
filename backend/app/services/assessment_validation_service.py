"""
Assessment Validation Service
Provides validation logic for teacher-created assessments
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.assessment import Assessment, AssessmentQuestion, AssessmentRubric, RubricCriterion
from app.schemas.assessment import AssessmentCreate, AssessmentQuestionCreate


class AssessmentValidationError(Exception):
    """Custom exception for assessment validation errors"""
    pass


class AssessmentValidationService:
    """Service for validating assessments before publishing"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def validate_assessment_for_publishing(self, assessment: Assessment) -> Tuple[bool, List[str]]:
        """
        Validate an assessment before it can be published.
        
        Returns:
            Tuple[bool, List[str]]: (is_valid, list_of_errors)
        """
        errors = []
        
        # Basic assessment validation
        basic_errors = self._validate_basic_assessment_data(assessment)
        errors.extend(basic_errors)
        
        # Question validation
        question_errors = self._validate_assessment_questions(assessment)
        errors.extend(question_errors)
        
        # Rubric validation
        rubric_errors = self._validate_assessment_rubric(assessment)
        errors.extend(rubric_errors)
        
        # Scheduling validation
        scheduling_errors = self._validate_assessment_scheduling(assessment)
        errors.extend(scheduling_errors)
        
        # Class assignment validation
        assignment_errors = self._validate_class_assignments(assessment)
        errors.extend(assignment_errors)
        
        return len(errors) == 0, errors
    
    def _validate_basic_assessment_data(self, assessment: Assessment) -> List[str]:
        """Validate basic assessment properties"""
        errors = []
        
        # Title validation
        if not assessment.title or len(assessment.title.strip()) == 0:
            errors.append("Assessment title is required")
        elif len(assessment.title) > 255:
            errors.append("Assessment title must be 255 characters or less")
        
        # Subject validation
        valid_subjects = [
            'Mathematics', 'Physics', 'Chemistry', 'Biology', 
            'English', 'Bangla', 'History', 'Geography', 'Economics'
        ]
        if assessment.subject not in valid_subjects:
            errors.append(f"Subject must be one of: {', '.join(valid_subjects)}")
        
        # Grade validation
        if not (6 <= assessment.grade <= 12):
            errors.append("Grade must be between 6 and 12")
        
        # Bloom levels validation
        if not assessment.bloom_levels or not isinstance(assessment.bloom_levels, list):
            errors.append("Bloom levels must be a non-empty list")
        else:
            for level in assessment.bloom_levels:
                if not isinstance(level, int) or not (1 <= level <= 6):
                    errors.append("Bloom levels must be integers between 1 and 6")
                    break
        
        # Topics validation
        if not assessment.topics or not isinstance(assessment.topics, list):
            errors.append("Topics must be a non-empty list")
        elif len(assessment.topics) == 0:
            errors.append("At least one topic must be specified")
        
        # Question count validation
        if assessment.question_count < 1:
            errors.append("Question count must be at least 1")
        elif assessment.question_count > 100:
            errors.append("Question count cannot exceed 100")
        
        # Time limit validation
        if assessment.time_limit < 5:
            errors.append("Time limit must be at least 5 minutes")
        elif assessment.time_limit > 300:
            errors.append("Time limit cannot exceed 300 minutes (5 hours)")
        
        # Difficulty validation
        valid_difficulties = ['easy', 'medium', 'hard', 'adaptive']
        if assessment.difficulty not in valid_difficulties:
            errors.append(f"Difficulty must be one of: {', '.join(valid_difficulties)}")
        
        return errors
    
    def _validate_assessment_questions(self, assessment: Assessment) -> List[str]:
        """Validate assessment questions"""
        errors = []
        
        if not assessment.questions:
            errors.append("Assessment must have at least one question")
            return errors
        
        # Check if we have the expected number of questions
        if len(assessment.questions) != assessment.question_count:
            errors.append(f"Assessment has {len(assessment.questions)} questions but expects {assessment.question_count}")
        
        # Validate each question
        for i, question in enumerate(assessment.questions, 1):
            question_errors = self._validate_single_question(question, i)
            errors.extend(question_errors)
        
        # Validate question distribution across Bloom levels
        bloom_distribution_errors = self._validate_bloom_level_distribution(assessment)
        errors.extend(bloom_distribution_errors)
        
        return errors
    
    def _validate_single_question(self, question: AssessmentQuestion, question_number: int) -> List[str]:
        """Validate a single assessment question"""
        errors = []
        prefix = f"Question {question_number}: "
        
        # Question text validation
        if not question.question_text or len(question.question_text.strip()) == 0:
            errors.append(f"{prefix}Question text is required")
        
        # Question type validation
        valid_types = ['multiple_choice', 'true_false', 'short_answer', 'essay']
        if question.question_type not in valid_types:
            errors.append(f"{prefix}Question type must be one of: {', '.join(valid_types)}")
        
        # Correct answer validation
        if not question.correct_answer or len(question.correct_answer.strip()) == 0:
            errors.append(f"{prefix}Correct answer is required")
        
        # Multiple choice specific validation
        if question.question_type == 'multiple_choice':
            if not question.options or not isinstance(question.options, list):
                errors.append(f"{prefix}Multiple choice questions must have options")
            elif len(question.options) < 2:
                errors.append(f"{prefix}Multiple choice questions must have at least 2 options")
            elif len(question.options) > 6:
                errors.append(f"{prefix}Multiple choice questions cannot have more than 6 options")
            else:
                # Check if correct answer is one of the options
                if question.correct_answer not in question.options:
                    errors.append(f"{prefix}Correct answer must be one of the provided options")
        
        # True/false specific validation
        if question.question_type == 'true_false':
            if question.correct_answer.lower() not in ['true', 'false']:
                errors.append(f"{prefix}True/false questions must have 'true' or 'false' as correct answer")
        
        # Bloom level validation
        if not (1 <= question.bloom_level <= 6):
            errors.append(f"{prefix}Bloom level must be between 1 and 6")
        
        # Topic validation
        if not question.topic or len(question.topic.strip()) == 0:
            errors.append(f"{prefix}Topic is required")
        
        # Difficulty validation
        if not (1 <= question.difficulty <= 10):
            errors.append(f"{prefix}Difficulty must be between 1 and 10")
        
        # Points validation
        if question.points < 1:
            errors.append(f"{prefix}Points must be at least 1")
        elif question.points > 20:
            errors.append(f"{prefix}Points cannot exceed 20")
        
        # Order index validation
        if question.order_index < 1:
            errors.append(f"{prefix}Order index must be at least 1")
        
        return errors
    
    def _validate_bloom_level_distribution(self, assessment: Assessment) -> List[str]:
        """Validate that questions cover the specified Bloom levels"""
        errors = []
        
        # Get Bloom levels from questions
        question_bloom_levels = {q.bloom_level for q in assessment.questions}
        required_bloom_levels = set(assessment.bloom_levels)
        
        # Check if all required Bloom levels are covered
        missing_levels = required_bloom_levels - question_bloom_levels
        if missing_levels:
            errors.append(f"Assessment questions must cover all specified Bloom levels. Missing: {sorted(missing_levels)}")
        
        # Check for reasonable distribution (at least one question per required level)
        for level in required_bloom_levels:
            level_questions = [q for q in assessment.questions if q.bloom_level == level]
            if len(level_questions) == 0:
                errors.append(f"At least one question must be at Bloom level {level}")
        
        return errors
    
    def _validate_assessment_rubric(self, assessment: Assessment) -> List[str]:
        """Validate assessment rubric if present"""
        errors = []
        
        if not assessment.rubric:
            # Rubric is optional for some question types
            return errors
        
        rubric = assessment.rubric
        
        # Basic rubric validation
        if not rubric.title or len(rubric.title.strip()) == 0:
            errors.append("Rubric title is required")
        
        if rubric.total_points < 1:
            errors.append("Rubric total points must be at least 1")
        
        # Validate rubric criteria
        if not rubric.criteria:
            errors.append("Rubric must have at least one criterion")
        else:
            total_weight = 0
            for i, criterion in enumerate(rubric.criteria, 1):
                criterion_errors = self._validate_rubric_criterion(criterion, i)
                errors.extend(criterion_errors)
                total_weight += criterion.weight
            
            # Check if weights sum to reasonable total (allow some tolerance)
            if abs(total_weight - 1.0) > 0.01:
                errors.append(f"Rubric criterion weights should sum to 1.0, but sum to {total_weight}")
        
        return errors
    
    def _validate_rubric_criterion(self, criterion: RubricCriterion, criterion_number: int) -> List[str]:
        """Validate a single rubric criterion"""
        errors = []
        prefix = f"Rubric criterion {criterion_number}: "
        
        # Name validation
        if not criterion.name or len(criterion.name.strip()) == 0:
            errors.append(f"{prefix}Name is required")
        
        # Weight validation
        if criterion.weight <= 0:
            errors.append(f"{prefix}Weight must be positive")
        elif criterion.weight > 1.0:
            errors.append(f"{prefix}Weight cannot exceed 1.0")
        
        # Order index validation
        if criterion.order_index < 1:
            errors.append(f"{prefix}Order index must be at least 1")
        
        # Validate rubric levels
        if not criterion.levels:
            errors.append(f"{prefix}Must have at least one performance level")
        else:
            for j, level in enumerate(criterion.levels, 1):
                if not level.name or len(level.name.strip()) == 0:
                    errors.append(f"{prefix}Level {j} name is required")
                if not level.description or len(level.description.strip()) == 0:
                    errors.append(f"{prefix}Level {j} description is required")
                if level.points < 0:
                    errors.append(f"{prefix}Level {j} points cannot be negative")
        
        return errors
    
    def _validate_assessment_scheduling(self, assessment: Assessment) -> List[str]:
        """Validate assessment scheduling"""
        errors = []
        
        # If scheduled date is set, validate it
        if assessment.scheduled_date:
            if assessment.scheduled_date < datetime.utcnow():
                errors.append("Scheduled date cannot be in the past")
        
        # If due date is set, validate it
        if assessment.due_date:
            if assessment.due_date < datetime.utcnow():
                errors.append("Due date cannot be in the past")
            
            # If both dates are set, due date should be after scheduled date
            if assessment.scheduled_date and assessment.due_date <= assessment.scheduled_date:
                errors.append("Due date must be after scheduled date")
        
        return errors
    
    def _validate_class_assignments(self, assessment: Assessment) -> List[str]:
        """Validate class assignments"""
        errors = []
        
        if not assessment.assigned_classes or not isinstance(assessment.assigned_classes, list):
            errors.append("Assessment must be assigned to at least one class")
        elif len(assessment.assigned_classes) == 0:
            errors.append("Assessment must be assigned to at least one class")
        
        # Validate that assigned classes exist and belong to the teacher
        # This would require database queries, so we'll keep it simple for now
        for class_id in assessment.assigned_classes:
            if not isinstance(class_id, str) or len(class_id.strip()) == 0:
                errors.append("All assigned class IDs must be valid strings")
                break
        
        return errors
    
    def validate_assessment_publishing_workflow(self, assessment: Assessment) -> Tuple[bool, List[str]]:
        """
        Validate the complete assessment publishing workflow.
        This includes all validations plus workflow-specific checks.
        """
        errors = []
        
        # Run all standard validations
        is_valid, validation_errors = self.validate_assessment_for_publishing(assessment)
        errors.extend(validation_errors)
        
        # Additional publishing workflow checks
        if assessment.is_published:
            errors.append("Assessment is already published")
        
        if not assessment.is_active:
            errors.append("Cannot publish inactive assessment")
        
        # Check if teacher has permission to publish (would need teacher context)
        # This would be handled by the API layer with proper authentication
        
        return len(errors) == 0, errors
    
    def get_assessment_completeness_score(self, assessment: Assessment) -> Dict[str, Any]:
        """
        Calculate a completeness score for an assessment.
        Returns a score and breakdown of what's complete/missing.
        """
        total_checks = 0
        passed_checks = 0
        details = {}
        
        # Basic information completeness
        basic_checks = [
            ('title', bool(assessment.title and assessment.title.strip())),
            ('description', bool(assessment.description and assessment.description.strip())),
            ('subject', bool(assessment.subject)),
            ('grade', bool(assessment.grade and 6 <= assessment.grade <= 12)),
            ('bloom_levels', bool(assessment.bloom_levels)),
            ('topics', bool(assessment.topics)),
            ('time_limit', bool(assessment.time_limit and assessment.time_limit > 0)),
        ]
        
        for check_name, is_complete in basic_checks:
            total_checks += 1
            if is_complete:
                passed_checks += 1
            details[f'basic_{check_name}'] = is_complete
        
        # Questions completeness
        has_questions = bool(assessment.questions)
        total_checks += 1
        if has_questions:
            passed_checks += 1
        details['has_questions'] = has_questions
        
        if has_questions:
            # Question quality checks
            all_questions_valid = True
            for question in assessment.questions:
                if not (question.correct_answer and question.question_text):
                    all_questions_valid = False
                    break
            
            total_checks += 1
            if all_questions_valid:
                passed_checks += 1
            details['questions_valid'] = all_questions_valid
        
        # Rubric completeness (optional)
        has_rubric = bool(assessment.rubric)
        details['has_rubric'] = has_rubric
        
        # Class assignment completeness
        has_assignments = bool(assessment.assigned_classes)
        total_checks += 1
        if has_assignments:
            passed_checks += 1
        details['has_class_assignments'] = has_assignments
        
        # Calculate score
        completeness_score = (passed_checks / total_checks) * 100 if total_checks > 0 else 0
        
        return {
            'completeness_score': round(completeness_score, 1),
            'passed_checks': passed_checks,
            'total_checks': total_checks,
            'details': details,
            'is_ready_for_publishing': completeness_score >= 90  # 90% threshold
        }