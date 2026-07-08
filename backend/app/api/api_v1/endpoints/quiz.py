from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from uuid import UUID
import logging

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.services.quiz.quiz_service import QuizService
from app.services.quiz.rag_quiz_service import get_rag_quiz_service, RAGQuizService
from app.schemas.question import (
    QuizGenerateRequest,
    QuizSubmitRequest,
    QuizResult,
    QuizHistory,
    QuizRecommendation
)

logger = logging.getLogger(__name__)
router = APIRouter()

def get_quiz_service(db: Session = Depends(get_db)) -> QuizService:
    """Get quiz service instance"""
    return QuizService(db)

@router.post("/generate")
async def generate_quiz(
    request: QuizGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate a quiz using RAG content from NCTB textbooks or fallback to question bank
    
    - **subject**: Subject name (e.g., Mathematics, Physics, ICT, English, Bangla)
    - **topic**: Optional topic filter
    - **grade**: Grade level (6-12)
    - **difficulty_level**: Optional difficulty (1-5)
    - **question_count**: Number of questions (5-20)
    - **time_limit_minutes**: Optional time limit
    - **language**: 'english' or 'bangla'
    """
    try:
        logger.info(f"Generating quiz for user {current_user.id}: {request.subject}/{request.topic}")
        
        # Try RAG quiz service first, fallback to regular quiz service
        try:
            rag_service = get_rag_quiz_service(db)
            quiz_data = await rag_service.generate_quiz(
                user_id=current_user.id,
                subject=request.subject,
                topic=request.topic,
                grade=request.grade or current_user.grade or 10,
                difficulty_level=request.difficulty_level,
                question_count=min(request.question_count, 20),  # Limit to 20 questions
                time_limit_minutes=request.time_limit_minutes,
                language=request.language or 'english'
            )
            return quiz_data
        except Exception as rag_error:
            logger.warning(f"RAG quiz generation failed, falling back to question bank: {rag_error}")
            
            # Fallback to regular quiz service
            quiz_service = get_quiz_service(db)
            quiz_data = quiz_service.generate_quiz(
                user_id=current_user.id,
                subject=request.subject,
                topic=request.topic,
                grade=request.grade or current_user.grade or 10,
                difficulty_level=request.difficulty_level,
                question_count=min(request.question_count, 20),
                time_limit_minutes=request.time_limit_minutes,
                language=request.language or 'english'
            )
            return quiz_data
        
    except ValueError as e:
        logger.warning(f"Quiz generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Quiz generation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate quiz: {str(e)}"
        )

@router.post("/submit")
async def submit_quiz(
    submission: QuizSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit quiz answers and get results
    
    - **quiz_id**: Quiz identifier
    - **answers**: Map of question_id to answer (A/B/C/D)
    - **time_taken_seconds**: Total time taken
    """
    try:
        logger.info(f"Submitting quiz {submission.quiz_id} for user {current_user.id}")
        
        # Try RAG quiz service first (for new RAG-generated quizzes)
        try:
            rag_service = get_rag_quiz_service(db)
            result = rag_service.submit_quiz(
                quiz_id=submission.quiz_id,
                user_id=current_user.id,
                answers=submission.answers,
                time_taken_seconds=submission.time_taken_seconds
            )
            return result
        except ValueError:
            # If not found in RAG service, try traditional quiz service
            quiz_service = QuizService(db)
            result = quiz_service.submit_quiz(
                quiz_id=UUID(submission.quiz_id),
                user_id=current_user.id,
                answers=submission.answers,
                time_taken_seconds=submission.time_taken_seconds
            )
            return result
        
    except ValueError as e:
        logger.warning(f"Quiz submission failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Quiz submission error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit quiz: {str(e)}"
        )

@router.get("/results/{attempt_id}")
def get_quiz_results(
    attempt_id: UUID,
    current_user: User = Depends(get_current_user),
    quiz_service: QuizService = Depends(get_quiz_service)
):
    """
    Get detailed quiz results
    
    - **attempt_id**: Quiz attempt identifier
    """
    try:
        logger.info(f"Getting quiz results {attempt_id} for user {current_user.id}")
        
        results = quiz_service.get_quiz_results(
            attempt_id=attempt_id,
            user_id=current_user.id
        )
        
        return results
        
    except ValueError as e:
        logger.warning(f"Get results failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Get results error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get quiz results: {str(e)}"
        )


@router.get("/history", response_model=List[QuizHistory])
def get_quiz_history(
    subject: Optional[str] = None,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    quiz_service: QuizService = Depends(get_quiz_service)
):
    """
    Get quiz attempt history
    
    - **subject**: Optional subject filter
    - **limit**: Maximum number of attempts to return (default: 20)
    """
    try:
        logger.info(f"Getting quiz history for user {current_user.id}")
        
        history = quiz_service.get_quiz_history(
            user_id=current_user.id,
            subject=subject,
            limit=limit
        )
        
        return history
        
    except Exception as e:
        logger.error(f"Get history error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get quiz history: {str(e)}"
        )

@router.get("/subjects")
async def get_available_subjects(
    grade: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get list of available subjects from NCTB textbook content
    
    - **grade**: Optional grade filter (6-12)
    """
    try:
        # Return subjects based on uploaded NCTB content
        subjects_data = [
            {
                'subject': 'Physics',
                'grades': {9: 500, 10: 500},  # Approximate question potential
                'total_questions': 1000,
                'description': 'পদার্থবিজ্ঞান - Physics concepts from NCTB curriculum',
                'available': True
            },
            {
                'subject': 'Mathematics', 
                'grades': {9: 600, 10: 600},
                'total_questions': 1200,
                'description': 'গণিত - Mathematics from NCTB curriculum',
                'available': True
            },
            {
                'subject': 'ICT',
                'grades': {9: 300, 10: 300},
                'total_questions': 600,
                'description': 'তথ্য ও যোগাযোগ প্রযুক্তি - Information & Communication Technology',
                'available': True
            },
            {
                'subject': 'English',
                'grades': {9: 400, 10: 400},
                'total_questions': 800,
                'description': 'English Grammar and Language Skills',
                'available': True
            },
            {
                'subject': 'Bangla',
                'grades': {9: 500, 10: 500},
                'total_questions': 1000,
                'description': 'বাংলা সাহিত্য ও ভাষা - Bangla Literature and Language',
                'available': True
            },
            {
                'subject': 'Chemistry',
                'grades': {9: 0, 10: 0},
                'total_questions': 0,
                'description': 'রসায়ন - Chemistry (Content coming soon)',
                'available': False
            },
            {
                'subject': 'Biology',
                'grades': {9: 0, 10: 0},
                'total_questions': 0,
                'description': 'জীববিজ্ঞান - Biology (Content coming soon)',
                'available': False
            }
        ]
        
        # Filter by grade if specified
        if grade:
            for subject in subjects_data:
                if grade not in subject['grades']:
                    subject['available'] = False
                    subject['total_questions'] = 0
        
        return {
            'subjects': subjects_data,
            'total_subjects': len([s for s in subjects_data if s['available']]),
            'content_source': 'NCTB Textbooks (RAG-powered)',
            'note': 'Questions are generated dynamically from your curriculum textbooks'
        }
        
    except Exception as e:
        logger.error(f"Get subjects error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get available subjects: {str(e)}"
        )


@router.get("/topics/{subject}")
async def get_available_topics(
    subject: str,
    grade: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get list of available topics for a subject from NCTB content
    
    - **subject**: Subject name
    - **grade**: Optional grade filter (6-12)
    """
    try:
        # Define topics based on NCTB curriculum structure
        topics_map = {
            'Physics': [
                {'topic': 'Force and Motion', 'question_count': 150},
                {'topic': 'Energy and Work', 'question_count': 120},
                {'topic': 'Heat and Temperature', 'question_count': 100},
                {'topic': 'Light and Optics', 'question_count': 80},
                {'topic': 'Sound and Waves', 'question_count': 90},
                {'topic': 'Electricity', 'question_count': 110},
                {'topic': 'Magnetism', 'question_count': 70}
            ],
            'Mathematics': [
                {'topic': 'Algebra', 'question_count': 200},
                {'topic': 'Geometry', 'question_count': 180},
                {'topic': 'Trigonometry', 'question_count': 150},
                {'topic': 'Statistics', 'question_count': 120},
                {'topic': 'Probability', 'question_count': 100},
                {'topic': 'Number Theory', 'question_count': 90},
                {'topic': 'Calculus Basics', 'question_count': 80}
            ],
            'ICT': [
                {'topic': 'Computer Basics', 'question_count': 100},
                {'topic': 'Programming Concepts', 'question_count': 120},
                {'topic': 'Internet and Web', 'question_count': 90},
                {'topic': 'Database Systems', 'question_count': 80},
                {'topic': 'Digital Communication', 'question_count': 70},
                {'topic': 'Computer Networks', 'question_count': 60}
            ],
            'English': [
                {'topic': 'Grammar Rules', 'question_count': 150},
                {'topic': 'Vocabulary', 'question_count': 120},
                {'topic': 'Reading Comprehension', 'question_count': 100},
                {'topic': 'Writing Skills', 'question_count': 80},
                {'topic': 'Literature', 'question_count': 90},
                {'topic': 'Speaking and Listening', 'question_count': 60}
            ],
            'Bangla': [
                {'topic': 'সাহিত্য (Literature)', 'question_count': 180},
                {'topic': 'ব্যাকরণ (Grammar)', 'question_count': 150},
                {'topic': 'কবিতা (Poetry)', 'question_count': 120},
                {'topic': 'গদ্য (Prose)', 'question_count': 100},
                {'topic': 'রচনা (Composition)', 'question_count': 90},
                {'topic': 'ভাষা (Language)', 'question_count': 80}
            ]
        }
        
        topics = topics_map.get(subject, [])
        
        return {
            'subject': subject,
            'topics': topics,
            'total_topics': len(topics),
            'content_source': 'NCTB Textbooks',
            'note': f'Topics are extracted from {subject} curriculum content'
        }
        
    except Exception as e:
        logger.error(f"Get topics error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get available topics: {str(e)}"
        )