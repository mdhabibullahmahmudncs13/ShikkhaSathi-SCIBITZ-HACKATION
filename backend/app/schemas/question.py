"""
Pydantic schemas for Question and Quiz models.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from datetime import datetime
from uuid import UUID


class QuestionBase(BaseModel):
    """Base schema for Question"""
    question_text: str = Field(..., min_length=10, max_length=2000)
    question_text_bangla: Optional[str] = None
    
    option_a: str = Field(..., min_length=1, max_length=500)
    option_b: str = Field(..., min_length=1, max_length=500)
    option_c: str = Field(..., min_length=1, max_length=500)
    option_d: str = Field(..., min_length=1, max_length=500)
    
    option_a_bangla: Optional[str] = None
    option_b_bangla: Optional[str] = None
    option_c_bangla: Optional[str] = None
    option_d_bangla: Optional[str] = None
    
    correct_answer: str = Field(..., pattern="^[ABCD]$")
    
    explanation: str = Field(..., min_length=10, max_length=2000)
    explanation_bangla: Optional[str] = None
    
    subject: str = Field(..., min_length=2, max_length=50)
    topic: str = Field(..., min_length=2, max_length=100)
    subtopic: Optional[str] = Field(None, max_length=100)
    grade: int = Field(..., ge=6, le=12)
    
    difficulty_level: int = Field(..., ge=1, le=5)
    bloom_level: int = Field(..., ge=1, le=6)
    
    tags: Optional[List[str]] = None
    source: Optional[str] = Field(None, max_length=100)
    chapter: Optional[str] = Field(None, max_length=100)


class QuestionCreate(QuestionBase):
    """Schema for creating a new question"""
    pass


class QuestionUpdate(BaseModel):
    """Schema for updating a question"""
    question_text: Optional[str] = Field(None, min_length=10, max_length=2000)
    question_text_bangla: Optional[str] = None
    
    option_a: Optional[str] = Field(None, min_length=1, max_length=500)
    option_b: Optional[str] = Field(None, min_length=1, max_length=500)
    option_c: Optional[str] = Field(None, min_length=1, max_length=500)
    option_d: Optional[str] = Field(None, min_length=1, max_length=500)
    
    option_a_bangla: Optional[str] = None
    option_b_bangla: Optional[str] = None
    option_c_bangla: Optional[str] = None
    option_d_bangla: Optional[str] = None
    
    correct_answer: Optional[str] = Field(None, pattern="^[ABCD]$")
    
    explanation: Optional[str] = Field(None, min_length=10, max_length=2000)
    explanation_bangla: Optional[str] = None
    
    subject: Optional[str] = Field(None, min_length=2, max_length=50)
    topic: Optional[str] = Field(None, min_length=2, max_length=100)
    subtopic: Optional[str] = Field(None, max_length=100)
    grade: Optional[int] = Field(None, ge=6, le=12)
    
    difficulty_level: Optional[int] = Field(None, ge=1, le=5)
    bloom_level: Optional[int] = Field(None, ge=1, le=6)
    
    tags: Optional[List[str]] = None
    source: Optional[str] = Field(None, max_length=100)
    chapter: Optional[str] = Field(None, max_length=100)
    
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None


class Question(QuestionBase):
    """Schema for Question response"""
    id: UUID
    times_used: int
    times_correct: int
    average_time_seconds: Optional[int]
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        orm_mode = True


class QuestionPublic(BaseModel):
    """Public schema for Question (without answer)"""
    id: UUID
    question_text: str
    options: Dict[str, str]
    subject: str
    topic: str
    difficulty_level: int
    bloom_level: int
    
    class Config:
        orm_mode = True


class QuestionWithAnswer(QuestionPublic):
    """Schema for Question with answer (for results)"""
    correct_answer: str
    explanation: str
    
    class Config:
        orm_mode = True


class QuizGenerateRequest(BaseModel):
    """Schema for quiz generation request"""
    subject: str = Field(..., min_length=2, max_length=50)
    topic: Optional[str] = Field(None, max_length=100)
    grade: int = Field(..., ge=6, le=12)
    difficulty_level: Optional[int] = Field(None, ge=1, le=5)
    bloom_level: Optional[int] = Field(None, ge=1, le=6)
    question_count: int = Field(10, ge=5, le=50)
    time_limit_minutes: Optional[int] = Field(None, ge=5, le=180)
    language: str = Field('english', pattern="^(english|bangla)$")
    
    @validator('difficulty_level', 'bloom_level', pre=True, always=True)
    def set_defaults(cls, v):
        """Set default values if not provided"""
        return v if v is not None else None


class QuizBase(BaseModel):
    """Base schema for Quiz"""
    subject: str
    topic: Optional[str]
    grade: int
    difficulty_level: int
    bloom_level: int
    question_count: int
    time_limit_minutes: Optional[int]


class QuizCreate(QuizBase):
    """Schema for creating a quiz"""
    user_id: UUID
    question_ids: List[UUID]


class Quiz(QuizBase):
    """Schema for Quiz response"""
    id: UUID
    user_id: UUID
    question_ids: List[UUID]
    status: str
    created_at: datetime
    expires_at: Optional[datetime]
    
    class Config:
        orm_mode = True


class QuizWithQuestions(Quiz):
    """Schema for Quiz with questions"""
    questions: List[QuestionPublic]


class QuizSubmitRequest(BaseModel):
    """Schema for quiz submission"""
    quiz_id: UUID
    answers: Dict[str, str] = Field(..., description="Map of question_id to answer (A/B/C/D)")
    time_taken_seconds: int = Field(..., ge=0)
    
    @validator('answers')
    def validate_answers(cls, v):
        """Validate answer format"""
        for answer in v.values():
            if answer not in ['A', 'B', 'C', 'D']:
                raise ValueError(f"Invalid answer: {answer}. Must be A, B, C, or D")
        return v


class QuizResult(BaseModel):
    """Schema for quiz results"""
    quiz_id: UUID
    attempt_id: UUID
    score: int
    max_score: int
    percentage: float
    time_taken_seconds: int
    xp_earned: int
    level_up: bool
    new_level: Optional[int]
    correct_count: int
    incorrect_count: int
    questions: List[QuestionWithAnswer]
    user_answers: Dict[str, str]
    performance_summary: Dict[str, Any]


class QuizHistory(BaseModel):
    """Schema for quiz history"""
    attempt_id: UUID
    quiz_id: UUID
    subject: str
    topic: str
    score: int
    max_score: int
    percentage: float
    difficulty_level: int
    bloom_level: int
    time_taken_seconds: int
    completed_at: datetime
    
    class Config:
        orm_mode = True


class QuizRecommendation(BaseModel):
    """Schema for quiz recommendations"""
    subject: str
    topic: str
    difficulty_level: int
    bloom_level: int
    reason: str
    estimated_time_minutes: int
    priority: str  # high, medium, low
