"""
Assessment Pydantic Schemas
Data validation and serialization schemas for assessments
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, validator
from uuid import UUID


class AssessmentQuestionCreate(BaseModel):
    """Schema for creating assessment questions"""
    question_type: str = Field(..., description="Type of question: multiple_choice, true_false, short_answer, essay")
    question_text: str = Field(..., min_length=1, max_length=2000, description="The question text")
    options: Optional[List[str]] = Field(None, description="Options for multiple choice questions")
    correct_answer: str = Field(..., min_length=1, description="The correct answer")
    explanation: Optional[str] = Field(None, max_length=1000, description="Explanation of the correct answer")
    bloom_level: int = Field(..., ge=1, le=6, description="Bloom's taxonomy level (1-6)")
    topic: str = Field(..., min_length=1, max_length=200, description="Topic or subject area")
    difficulty: int = Field(..., ge=1, le=10, description="Difficulty level (1-10)")
    points: int = Field(1, ge=1, le=20, description="Points awarded for correct answer")
    order_index: int = Field(..., ge=1, description="Order of question in assessment")
    
    @validator('question_type')
    def validate_question_type(cls, v):
        valid_types = ['multiple_choice', 'true_false', 'short_answer', 'essay']
        if v not in valid_types:
            raise ValueError(f'Question type must be one of: {", ".join(valid_types)}')
        return v
    
    @validator('options')
    def validate_options(cls, v, values):
        if values.get('question_type') == 'multiple_choice':
            if not v or len(v) < 2:
                raise ValueError('Multiple choice questions must have at least 2 options')
            if len(v) > 6:
                raise ValueError('Multiple choice questions cannot have more than 6 options')
        return v
    
    @validator('correct_answer')
    def validate_correct_answer(cls, v, values):
        question_type = values.get('question_type')
        if question_type == 'true_false':
            if v.lower() not in ['true', 'false']:
                raise ValueError('True/false questions must have "true" or "false" as correct answer')
        elif question_type == 'multiple_choice':
            options = values.get('options', [])
            if options and v not in options:
                raise ValueError('Correct answer must be one of the provided options')
        return v


class RubricLevelCreate(BaseModel):
    """Schema for creating rubric performance levels"""
    name: str = Field(..., min_length=1, max_length=100, description="Name of performance level")
    description: str = Field(..., min_length=1, max_length=500, description="Description of performance level")
    points: int = Field(..., ge=0, description="Points awarded for this level")
    order_index: int = Field(..., ge=1, description="Order of level in criterion")


class RubricCriterionCreate(BaseModel):
    """Schema for creating rubric criteria"""
    name: str = Field(..., min_length=1, max_length=255, description="Name of criterion")
    description: Optional[str] = Field(None, max_length=1000, description="Description of criterion")
    weight: float = Field(..., gt=0, le=1.0, description="Weight in final score calculation")
    order_index: int = Field(..., ge=1, description="Order of criterion in rubric")
    levels: List[RubricLevelCreate] = Field(..., min_items=1, description="Performance levels")


class AssessmentRubricCreate(BaseModel):
    """Schema for creating assessment rubrics"""
    title: str = Field(..., min_length=1, max_length=255, description="Rubric title")
    description: Optional[str] = Field(None, max_length=1000, description="Rubric description")
    total_points: int = Field(..., ge=1, description="Total points possible")
    criteria: List[RubricCriterionCreate] = Field(..., min_items=1, description="Rubric criteria")
    
    @validator('criteria')
    def validate_criteria_weights(cls, v):
        total_weight = sum(criterion.weight for criterion in v)
        if abs(total_weight - 1.0) > 0.01:
            raise ValueError(f'Criterion weights must sum to 1.0, but sum to {total_weight}')
        return v


class AssessmentCreate(BaseModel):
    """Schema for creating assessments"""
    title: str = Field(..., min_length=1, max_length=255, description="Assessment title")
    description: Optional[str] = Field(None, max_length=2000, description="Assessment description")
    subject: str = Field(..., description="Subject area")
    grade: int = Field(..., ge=6, le=12, description="Grade level (6-12)")
    bloom_levels: List[int] = Field(..., min_items=1, description="Bloom taxonomy levels to assess")
    topics: List[str] = Field(..., min_items=1, description="Topics to cover")
    question_count: int = Field(10, ge=1, le=100, description="Number of questions")
    time_limit: int = Field(..., ge=5, le=300, description="Time limit in minutes")
    difficulty: str = Field("medium", description="Overall difficulty level")
    scheduled_date: Optional[datetime] = Field(None, description="When assessment becomes available")
    due_date: Optional[datetime] = Field(None, description="When assessment is due")
    assigned_classes: List[str] = Field(..., min_items=1, description="Class IDs to assign to")
    questions: Optional[List[AssessmentQuestionCreate]] = Field(None, description="Assessment questions")
    rubric: Optional[AssessmentRubricCreate] = Field(None, description="Assessment rubric")
    
    @validator('subject')
    def validate_subject(cls, v):
        valid_subjects = [
            'Mathematics', 'Physics', 'Chemistry', 'Biology', 
            'English', 'Bangla', 'History', 'Geography', 'Economics'
        ]
        if v not in valid_subjects:
            raise ValueError(f'Subject must be one of: {", ".join(valid_subjects)}')
        return v
    
    @validator('bloom_levels')
    def validate_bloom_levels(cls, v):
        for level in v:
            if not (1 <= level <= 6):
                raise ValueError('Bloom levels must be integers between 1 and 6')
        return sorted(list(set(v)))  # Remove duplicates and sort
    
    @validator('difficulty')
    def validate_difficulty(cls, v):
        valid_difficulties = ['easy', 'medium', 'hard', 'adaptive']
        if v not in valid_difficulties:
            raise ValueError(f'Difficulty must be one of: {", ".join(valid_difficulties)}')
        return v
    
    @validator('due_date')
    def validate_due_date(cls, v, values):
        if v and v < datetime.utcnow():
            raise ValueError('Due date cannot be in the past')
        
        scheduled_date = values.get('scheduled_date')
        if v and scheduled_date and v <= scheduled_date:
            raise ValueError('Due date must be after scheduled date')
        
        return v
    
    @validator('questions')
    def validate_questions(cls, v, values):
        if v:
            question_count = values.get('question_count', 10)
            if len(v) != question_count:
                raise ValueError(f'Number of questions ({len(v)}) must match question_count ({question_count})')
            
            # Validate Bloom level coverage
            bloom_levels = values.get('bloom_levels', [])
            question_bloom_levels = {q.bloom_level for q in v}
            missing_levels = set(bloom_levels) - question_bloom_levels
            if missing_levels:
                raise ValueError(f'Questions must cover all specified Bloom levels. Missing: {sorted(missing_levels)}')
        
        return v


class AssessmentUpdate(BaseModel):
    """Schema for updating assessments"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    subject: Optional[str] = Field(None)
    grade: Optional[int] = Field(None, ge=6, le=12)
    bloom_levels: Optional[List[int]] = Field(None, min_items=1)
    topics: Optional[List[str]] = Field(None, min_items=1)
    question_count: Optional[int] = Field(None, ge=1, le=100)
    time_limit: Optional[int] = Field(None, ge=5, le=300)
    difficulty: Optional[str] = Field(None)
    scheduled_date: Optional[datetime] = Field(None)
    due_date: Optional[datetime] = Field(None)
    assigned_classes: Optional[List[str]] = Field(None, min_items=1)
    is_published: Optional[bool] = Field(None)
    is_active: Optional[bool] = Field(None)
    
    # Apply same validators as create schema
    _validate_subject = validator('subject', allow_reuse=True)(AssessmentCreate.validate_subject)
    _validate_bloom_levels = validator('bloom_levels', allow_reuse=True)(AssessmentCreate.validate_bloom_levels)
    _validate_difficulty = validator('difficulty', allow_reuse=True)(AssessmentCreate.validate_difficulty)
    _validate_due_date = validator('due_date', allow_reuse=True)(AssessmentCreate.validate_due_date)


class AssessmentResponse(BaseModel):
    """Schema for assessment responses"""
    id: UUID
    title: str
    description: Optional[str]
    subject: str
    grade: int
    teacher_id: UUID
    bloom_levels: List[int]
    topics: List[str]
    question_count: int
    time_limit: int
    difficulty: str
    scheduled_date: Optional[datetime]
    due_date: Optional[datetime]
    assigned_classes: List[str]
    is_published: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AssessmentQuestionResponse(BaseModel):
    """Schema for assessment question responses"""
    id: UUID
    assessment_id: UUID
    question_type: str
    question_text: str
    options: Optional[List[str]]
    correct_answer: str
    explanation: Optional[str]
    bloom_level: int
    topic: str
    difficulty: int
    points: int
    order_index: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class AssessmentValidationResponse(BaseModel):
    """Schema for assessment validation results"""
    is_valid: bool
    errors: List[str]
    completeness_score: Optional[float] = None
    is_ready_for_publishing: Optional[bool] = None


class AssessmentCompletenessResponse(BaseModel):
    """Schema for assessment completeness analysis"""
    completeness_score: float
    passed_checks: int
    total_checks: int
    is_ready_for_publishing: bool
    details: Dict[str, Any]