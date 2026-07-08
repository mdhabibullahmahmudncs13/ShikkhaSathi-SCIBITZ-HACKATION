"""
Assessment API Endpoints
Provides assessment creation, management, and analytics for teachers
"""

from typing import Any, List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from datetime import datetime
import uuid

from app.core.deps import get_db, get_current_user, require_teacher
from app.models.user import User
from app.services.assessment_service import AssessmentService
from app.services.quiz.question_generator import QuestionGenerator
from app.services.rag.rag_service import RAGService
from app.core.config import settings

router = APIRouter()

# Pydantic models for API
class AssessmentCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    subject: str = Field(..., min_length=1, max_length=100)
    grade: int = Field(..., ge=6, le=12)
    bloom_levels: List[int] = Field(..., min_items=1, max_items=6)
    topics: List[str] = Field(..., min_items=1)
    question_count: int = Field(..., ge=5, le=50)
    time_limit: int = Field(..., ge=10, le=300)  # minutes
    difficulty: str = Field("medium", pattern="^(easy|medium|hard|adaptive)$")
    scheduled_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    assigned_classes: List[str] = Field(..., min_items=1)
    rubric: Optional[Dict[str, Any]] = None

class AssessmentUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    time_limit: Optional[int] = Field(None, ge=10, le=300)
    scheduled_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    assigned_classes: Optional[List[str]] = None

class RubricCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    total_points: int = Field(..., ge=1)
    criteria: List[Dict[str, Any]] = Field(..., min_items=1)

class QuestionUpdateRequest(BaseModel):
    question_text: Optional[str] = None
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    points: Optional[int] = Field(None, ge=1)

# Dependency to get assessment service
async def get_assessment_service(db: Session = Depends(get_db)) -> AssessmentService:
    """Get assessment service with dependencies"""
    # Initialize RAG service and question generator
    rag_service = RAGService(config=None)  # Would be properly configured
    question_generator = QuestionGenerator(rag_service, settings.OPENAI_API_KEY)
    
    return AssessmentService(db, question_generator)

@router.post("/create")
async def create_assessment(
    request: AssessmentCreateRequest,
    current_user: User = Depends(require_teacher),
    assessment_service: AssessmentService = Depends(get_assessment_service)
) -> Any:
    """
    Create a new assessment with AI-generated questions
    
    **Validates: Requirements 6.4**
    """
    try:
        # Validate Bloom levels
        if not all(1 <= level <= 6 for level in request.bloom_levels):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bloom levels must be between 1 and 6"
            )
        
        # Validate dates
        if request.scheduled_date and request.due_date:
            if request.scheduled_date >= request.due_date:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Scheduled date must be before due date"
                )
        
        assessment_data = request.dict()
        result = await assessment_service.create_assessment(
            teacher_id=str(current_user.id),
            assessment_data=assessment_data
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create assessment: {str(e)}"
        )

@router.get("/list")
async def get_teacher_assessments(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_teacher),
    assessment_service: AssessmentService = Depends(get_assessment_service)
) -> Any:
    """
    Get list of assessments created by the teacher
    
    **Validates: Requirements 6.4**
    """
    try:
        result = assessment_service.get_teacher_assessments(
            teacher_id=str(current_user.id),
            limit=limit,
            offset=offset
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get assessments: {str(e)}"
        )

@router.get("/{assessment_id}")
async def get_assessment_details(
    assessment_id: str,
    current_user: User = Depends(require_teacher),
    assessment_service: AssessmentService = Depends(get_assessment_service)
) -> Any:
    """
    Get detailed information about a specific assessment
    
    **Validates: Requirements 6.4**
    """
    try:
        result = assessment_service.get_assessment_details(
            assessment_id=assessment_id,
            teacher_id=str(current_user.id)
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get assessment details: {str(e)}"
        )

@router.put("/{assessment_id}")
async def update_assessment(
    assessment_id: str,
    request: AssessmentUpdateRequest,
    current_user: User = Depends(require_teacher),
    assessment_service: AssessmentService = Depends(get_assessment_service)
) -> Any:
    """
    Update an existing assessment
    
    **Validates: Requirements 6.4**
    """
    try:
        # Validate dates if provided
        if request.scheduled_date and request.due_date:
            if request.scheduled_date >= request.due_date:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Scheduled date must be before due date"
                )
        
        update_data = request.dict(exclude_unset=True)
        result = assessment_service.update_assessment(
            assessment_id=assessment_id,
            teacher_id=str(current_user.id),
            update_data=update_data
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update assessment: {str(e)}"
        )

@router.post("/{assessment_id}/publish")
async def publish_assessment(
    assessment_id: str,
    current_user: User = Depends(require_teacher),
    assessment_service: AssessmentService = Depends(get_assessment_service)
) -> Any:
    """
    Publish an assessment to make it available to students
    
    **Validates: Requirements 6.4**
    """
    try:
        result = assessment_service.publish_assessment(
            assessment_id=assessment_id,
            teacher_id=str(current_user.id)
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to publish assessment: {str(e)}"
        )

@router.delete("/{assessment_id}")
async def delete_assessment(
    assessment_id: str,
    current_user: User = Depends(require_teacher),
    assessment_service: AssessmentService = Depends(get_assessment_service)
) -> Any:
    """
    Delete an assessment
    
    **Validates: Requirements 6.4**
    """
    try:
        result = assessment_service.delete_assessment(
            assessment_id=assessment_id,
            teacher_id=str(current_user.id)
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete assessment: {str(e)}"
        )

@router.get("/{assessment_id}/analytics")
async def get_assessment_analytics(
    assessment_id: str,
    current_user: User = Depends(require_teacher),
    assessment_service: AssessmentService = Depends(get_assessment_service)
) -> Any:
    """
    Get comprehensive analytics for an assessment
    
    **Validates: Requirements 6.4**
    """
    try:
        result = assessment_service.get_assessment_analytics(
            assessment_id=assessment_id,
            teacher_id=str(current_user.id)
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get assessment analytics: {str(e)}"
        )

@router.post("/{assessment_id}/regenerate-questions")
async def regenerate_questions(
    assessment_id: str,
    question_count: Optional[int] = Query(None, ge=1, le=10),
    current_user: User = Depends(require_teacher),
    assessment_service: AssessmentService = Depends(get_assessment_service)
) -> Any:
    """
    Regenerate specific questions in an assessment using AI
    
    **Validates: Requirements 6.4**
    """
    try:
        # This would implement question regeneration logic
        # For now, return a placeholder response
        
        return {
            "assessment_id": assessment_id,
            "message": "Question regeneration requested",
            "status": "processing"
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to regenerate questions: {str(e)}"
        )

@router.put("/{assessment_id}/questions/{question_id}")
async def update_question(
    assessment_id: str,
    question_id: str,
    request: QuestionUpdateRequest,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
) -> Any:
    """
    Update a specific question in an assessment
    
    **Validates: Requirements 6.4**
    """
    try:
        from app.models.assessment import AssessmentQuestion, Assessment
        
        # Verify assessment ownership
        assessment = db.query(Assessment).filter(
            Assessment.id == assessment_id,
            Assessment.teacher_id == current_user.id
        ).first()
        
        if not assessment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assessment not found"
            )
        
        # Get and update question
        question = db.query(AssessmentQuestion).filter(
            AssessmentQuestion.id == question_id,
            AssessmentQuestion.assessment_id == assessment_id
        ).first()
        
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )
        
        # Update fields
        update_data = request.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(question, field, value)
        
        db.commit()
        
        return {
            "question_id": str(question.id),
            "assessment_id": assessment_id,
            "status": "updated"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update question: {str(e)}"
        )

@router.get("/{assessment_id}/preview")
async def preview_assessment(
    assessment_id: str,
    current_user: User = Depends(require_teacher),
    assessment_service: AssessmentService = Depends(get_assessment_service)
) -> Any:
    """
    Get assessment preview for teacher review before publishing
    
    **Validates: Requirements 6.4**
    """
    try:
        result = assessment_service.get_assessment_details(
            assessment_id=assessment_id,
            teacher_id=str(current_user.id)
        )
        
        # Format for preview (hide correct answers in preview mode)
        preview_questions = []
        for question in result["questions"]:
            preview_question = {
                "id": question["id"],
                "question_type": question["question_type"],
                "question_text": question["question_text"],
                "bloom_level": question["bloom_level"],
                "topic": question["topic"],
                "difficulty": question["difficulty"],
                "points": question["points"]
            }
            
            if question["question_type"] in ["multiple_choice", "true_false"]:
                preview_question["options"] = question["options"]
            
            preview_questions.append(preview_question)
        
        return {
            "assessment": {
                "id": result["id"],
                "title": result["title"],
                "description": result["description"],
                "subject": result["subject"],
                "grade": result["grade"],
                "time_limit": result["time_limit"],
                "question_count": len(preview_questions)
            },
            "questions": preview_questions,
            "rubric": result["rubric"]
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get assessment preview: {str(e)}"
        )

@router.get("/templates/subjects")
async def get_subject_templates(
    grade: Optional[int] = Query(None, ge=6, le=12),
    current_user: User = Depends(require_teacher)
) -> Any:
    """
    Get available subjects and topics for assessment creation
    
    **Validates: Requirements 6.4**
    """
    try:
        # This would typically come from a curriculum database
        # For now, return mock data based on NCTB curriculum
        
        subjects = {
            "Physics": {
                "topics": [
                    "Mechanics", "Thermodynamics", "Waves and Sound", 
                    "Electricity and Magnetism", "Modern Physics"
                ],
                "bloom_levels": [1, 2, 3, 4, 5, 6],
                "difficulty_levels": ["easy", "medium", "hard", "adaptive"]
            },
            "Chemistry": {
                "topics": [
                    "Atomic Structure", "Chemical Bonding", "Acids and Bases",
                    "Organic Chemistry", "Physical Chemistry"
                ],
                "bloom_levels": [1, 2, 3, 4, 5, 6],
                "difficulty_levels": ["easy", "medium", "hard", "adaptive"]
            },
            "Mathematics": {
                "topics": [
                    "Algebra", "Geometry", "Trigonometry", 
                    "Calculus", "Statistics and Probability"
                ],
                "bloom_levels": [1, 2, 3, 4, 5, 6],
                "difficulty_levels": ["easy", "medium", "hard", "adaptive"]
            },
            "Biology": {
                "topics": [
                    "Cell Biology", "Genetics", "Evolution",
                    "Ecology", "Human Physiology"
                ],
                "bloom_levels": [1, 2, 3, 4, 5, 6],
                "difficulty_levels": ["easy", "medium", "hard", "adaptive"]
            }
        }
        
        if grade:
            # Filter subjects based on grade level
            # This would be more sophisticated in a real implementation
            pass
        
        return {
            "subjects": subjects,
            "question_types": [
                {"value": "multiple_choice", "label": "Multiple Choice"},
                {"value": "true_false", "label": "True/False"},
                {"value": "short_answer", "label": "Short Answer"}
            ],
            "bloom_levels": [
                {"value": 1, "label": "Remember"},
                {"value": 2, "label": "Understand"},
                {"value": 3, "label": "Apply"},
                {"value": 4, "label": "Analyze"},
                {"value": 5, "label": "Evaluate"},
                {"value": 6, "label": "Create"}
            ]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get subject templates: {str(e)}"
        )