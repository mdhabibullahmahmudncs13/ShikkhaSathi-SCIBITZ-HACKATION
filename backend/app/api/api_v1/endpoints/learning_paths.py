"""
Learning Path API Endpoints

API endpoints for learning path recommendation, assignment, and management.

Requirements validated:
- 4.1: Personalized learning path recommendations
- 4.2: Difficulty adjustment based on performance
- 4.3: Learning path assignment and tracking
- 4.4: Progress tracking and milestone notifications
"""

from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_teacher, get_current_user
from app.models.teacher import Teacher
from app.models.user import User
from app.services.learning_path_service import LearningPathService, DifficultyAdjustmentStrategy
from app.schemas.learning_path import (
    PathRecommendationRequest,
    PathRecommendationResponse,
    LearningPathRecommendation,
    PathAssignmentRequest,
    PathAssignmentResponse,
    PathProgressUpdate,
    DifficultyAdjustmentRequest,
    TopicMasteryUpdate,
    BulkPathAssignmentRequest,
    BulkPathAssignmentResponse,
    CreatePathRequest,
    PathTemplate,
    PathAnalytics
)
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/recommendations", response_model=PathRecommendationResponse)
async def get_learning_path_recommendations(
    request: PathRecommendationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """
    Generate personalized learning path recommendations for a student.
    
    This endpoint analyzes student performance data and generates multiple
    learning path options with different difficulty strategies.
    """
    try:
        logger.info(f"Generating path recommendations for student {request.student_id}")
        
        # Verify teacher has access to this student
        if not await _verify_teacher_student_access(current_teacher.id, request.student_id, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Teacher does not have access to this student"
            )
        
        # Initialize learning path service
        path_service = LearningPathService(db)
        
        # Generate recommendations
        recommendations = await path_service.get_path_recommendations(
            student_id=request.student_id,
            subject=request.subject,
            target_topics=request.target_topics
        )
        
        # Apply time constraints if specified
        if request.time_constraint_days:
            recommendations = _apply_time_constraints(recommendations, request.time_constraint_days)
        
        # Apply difficulty preference if specified
        if request.difficulty_preference:
            recommendations = _prioritize_difficulty_preference(recommendations, request.difficulty_preference)
        
        # Log recommendation generation for analytics
        background_tasks.add_task(
            _log_recommendation_generation,
            current_teacher.id,
            request.student_id,
            request.subject,
            len(recommendations)
        )
        
        return PathRecommendationResponse(
            student_id=request.student_id,
            subject=request.subject,
            recommendations=recommendations,
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        
    except Exception as e:
        logger.error(f"Error generating recommendations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate learning path recommendations"
        )


@router.post("/assign", response_model=PathAssignmentResponse)
async def assign_learning_path(
    request: PathAssignmentRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """
    Assign a learning path to a student.
    
    This endpoint assigns a specific learning path to a student and handles
    notifications to the student and parents.
    """
    try:
        logger.info(f"Assigning path {request.path_id} to student {request.student_id}")
        
        # Verify teacher has access to this student
        if not await _verify_teacher_student_access(current_teacher.id, request.student_id, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Teacher does not have access to this student"
            )
        
        # Get the learning path (this would typically fetch from database)
        path = await _get_learning_path(request.path_id, db)
        if not path:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Learning path not found"
            )
        
        # Create assignment record
        assignment_id = await _create_path_assignment(
            student_id=request.student_id,
            path=path,
            teacher_id=current_teacher.id,
            custom_message=request.custom_message,
            start_date=request.start_date,
            db=db
        )
        
        # Send notifications
        notifications_sent = []
        if request.notify_parents:
            background_tasks.add_task(
                _notify_parents_of_path_assignment,
                request.student_id,
                path,
                current_teacher.name
            )
            notifications_sent.append("parents")
        
        # Notify student
        background_tasks.add_task(
            _notify_student_of_path_assignment,
            request.student_id,
            path,
            current_teacher.name,
            request.custom_message
        )
        notifications_sent.append("student")
        
        # Add path milestones to student's dashboard
        background_tasks.add_task(
            _add_milestones_to_student_dashboard,
            request.student_id,
            path.milestones
        )
        
        return PathAssignmentResponse(
            assignment_id=assignment_id,
            student_id=request.student_id,
            path=path,
            notifications_sent=notifications_sent
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning learning path: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to assign learning path"
        )


@router.post("/bulk-assign", response_model=BulkPathAssignmentResponse)
async def bulk_assign_learning_paths(
    request: BulkPathAssignmentRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """
    Assign learning paths to multiple students at once.
    
    This endpoint allows teachers to assign the same path template to multiple
    students, with optional customization per student.
    """
    try:
        logger.info(f"Bulk assigning path template {request.path_template_id} to {len(request.student_ids)} students")
        
        successful_assignments = []
        failed_assignments = []
        notifications_sent = 0
        
        # Get path template
        path_template = await _get_path_template(request.path_template_id, db)
        if not path_template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Path template not found"
            )
        
        # Process each student
        for student_id in request.student_ids:
            try:
                # Verify teacher access
                if not await _verify_teacher_student_access(current_teacher.id, student_id, db):
                    failed_assignments.append({
                        "student_id": student_id,
                        "reason": "Teacher does not have access to this student"
                    })
                    continue
                
                # Generate personalized path if requested
                if request.customize_per_student:
                    path_service = LearningPathService(db)
                    recommendations = await path_service.get_path_recommendations(
                        student_id=student_id,
                        subject=path_template.subject,
                        target_topics=path_template.topics
                    )
                    path = recommendations[0].path if recommendations else None
                else:
                    path = _convert_template_to_path(path_template, student_id)
                
                if not path:
                    failed_assignments.append({
                        "student_id": student_id,
                        "reason": "Failed to generate personalized path"
                    })
                    continue
                
                # Create assignment
                assignment_id = await _create_path_assignment(
                    student_id=student_id,
                    path=path,
                    teacher_id=current_teacher.id,
                    start_date=request.start_date,
                    db=db
                )
                
                assignment_response = PathAssignmentResponse(
                    assignment_id=assignment_id,
                    student_id=student_id,
                    path=path,
                    notifications_sent=[]
                )
                
                successful_assignments.append(assignment_response)
                
                # Queue notifications
                if request.notify_students:
                    background_tasks.add_task(
                        _notify_student_of_path_assignment,
                        student_id,
                        path,
                        current_teacher.name
                    )
                    notifications_sent += 1
                
                if request.notify_parents:
                    background_tasks.add_task(
                        _notify_parents_of_path_assignment,
                        student_id,
                        path,
                        current_teacher.name
                    )
                    notifications_sent += 1
                
                # Add milestones to dashboard
                background_tasks.add_task(
                    _add_milestones_to_student_dashboard,
                    student_id,
                    path.milestones
                )
                
            except Exception as e:
                logger.error(f"Error assigning path to student {student_id}: {str(e)}")
                failed_assignments.append({
                    "student_id": student_id,
                    "reason": f"Assignment failed: {str(e)}"
                })
        
        return BulkPathAssignmentResponse(
            successful_assignments=successful_assignments,
            failed_assignments=failed_assignments,
            total_requested=len(request.student_ids),
            total_successful=len(successful_assignments),
            notifications_sent=notifications_sent
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in bulk assignment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process bulk assignment"
        )


@router.put("/progress/{assignment_id}", response_model=PathProgressUpdate)
async def update_path_progress(
    assignment_id: str,
    progress_update: PathProgressUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update student progress on a learning path.
    
    This endpoint is called when students complete topics or milestones
    in their assigned learning path.
    """
    try:
        logger.info(f"Updating progress for assignment {assignment_id}")
        
        # Verify user has access to this assignment
        assignment = await _get_path_assignment(assignment_id, db)
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Path assignment not found"
            )
        
        if assignment.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have access to this assignment"
            )
        
        # Update progress in database
        updated_progress = await _update_assignment_progress(assignment_id, progress_update, db)
        
        # Check for completed milestones
        newly_completed_milestones = _check_completed_milestones(
            progress_update.completed_topics,
            assignment.path.milestones,
            progress_update.completed_milestones
        )
        
        # Send milestone completion notifications
        if newly_completed_milestones:
            background_tasks.add_task(
                _notify_milestone_completion,
                assignment.student_id,
                assignment.teacher_id,
                newly_completed_milestones
            )
        
        # Check if path is completed
        if progress_update.overall_progress >= 1.0:
            background_tasks.add_task(
                _notify_path_completion,
                assignment.student_id,
                assignment.teacher_id,
                assignment.path
            )
        
        return updated_progress
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating path progress: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update path progress"
        )


@router.put("/adjust-difficulty", response_model=dict)
async def adjust_path_difficulty(
    request: DifficultyAdjustmentRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """
    Adjust the difficulty level of a student's learning path.
    
    This endpoint allows teachers to modify the difficulty of an assigned
    learning path based on student performance.
    """
    try:
        logger.info(f"Adjusting difficulty for assignment {request.assignment_id}")
        
        # Verify teacher has access to this assignment
        assignment = await _get_path_assignment(request.assignment_id, db)
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Path assignment not found"
            )
        
        if assignment.teacher_id != current_teacher.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Teacher does not have access to this assignment"
            )
        
        # Regenerate path with new difficulty
        path_service = LearningPathService(db)
        strategy_map = {
            "easy": DifficultyAdjustmentStrategy.CONSERVATIVE,
            "medium": DifficultyAdjustmentStrategy.BALANCED,
            "hard": DifficultyAdjustmentStrategy.AGGRESSIVE
        }
        
        new_strategy = strategy_map.get(request.new_difficulty.value, DifficultyAdjustmentStrategy.BALANCED)
        
        # Generate new path with adjusted difficulty
        new_path = path_service.recommendation_engine.generate_personalized_path(
            student_id=request.student_id,
            subject=assignment.path.subject,
            target_topics=[topic.topic_id for topic in assignment.path.topics],
            strategy=new_strategy
        )
        
        # Update assignment with new path
        await _update_assignment_path(request.assignment_id, new_path, db)
        
        # Log the adjustment
        await _log_difficulty_adjustment(
            assignment_id=request.assignment_id,
            teacher_id=current_teacher.id,
            old_difficulty=assignment.path.difficulty_strategy,
            new_difficulty=request.new_difficulty.value,
            reason=request.reason,
            db=db
        )
        
        # Notify student of path changes
        background_tasks.add_task(
            _notify_path_adjustment,
            request.student_id,
            current_teacher.name,
            request.new_difficulty.value,
            request.reason
        )
        
        return {
            "message": "Path difficulty adjusted successfully",
            "assignment_id": request.assignment_id,
            "new_difficulty": request.new_difficulty.value,
            "updated_topics": len(new_path.topics)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adjusting path difficulty: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to adjust path difficulty"
        )


@router.get("/analytics/{path_id}", response_model=PathAnalytics)
async def get_path_analytics(
    path_id: str,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """
    Get analytics data for a learning path.
    
    This endpoint provides comprehensive analytics about how students
    are performing on a specific learning path.
    """
    try:
        logger.info(f"Getting analytics for path {path_id}")
        
        # Verify teacher has access to this path
        if not await _verify_teacher_path_access(current_teacher.id, path_id, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Teacher does not have access to this path"
            )
        
        # Calculate analytics
        analytics = await _calculate_path_analytics(path_id, db)
        
        return analytics
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting path analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get path analytics"
        )


@router.post("/topic-mastery", response_model=dict)
async def update_topic_mastery(
    mastery_update: TopicMasteryUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update student mastery level for a specific topic.
    
    This endpoint is called when students complete assessments or
    activities that demonstrate mastery of a topic.
    """
    try:
        logger.info(f"Updating topic mastery for student {mastery_update.student_id}, topic {mastery_update.topic_id}")
        
        # Verify user has permission to update this mastery record
        if current_user.id != mastery_update.student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User can only update their own mastery records"
            )
        
        # Update mastery record
        await _update_topic_mastery_record(mastery_update, db)
        
        # Check if this affects any active learning paths
        affected_assignments = await _get_assignments_with_topic(
            mastery_update.student_id,
            mastery_update.topic_id,
            db
        )
        
        # Update path progress for affected assignments
        for assignment in affected_assignments:
            background_tasks.add_task(
                _recalculate_path_progress,
                assignment.id,
                db
            )
        
        # Check for mastery achievements
        if mastery_update.mastery_level >= 0.8:
            background_tasks.add_task(
                _check_mastery_achievements,
                mastery_update.student_id,
                mastery_update.topic_id,
                mastery_update.mastery_level
            )
        
        return {
            "message": "Topic mastery updated successfully",
            "student_id": mastery_update.student_id,
            "topic_id": mastery_update.topic_id,
            "new_mastery_level": mastery_update.mastery_level,
            "affected_paths": len(affected_assignments)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating topic mastery: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update topic mastery"
        )


# Helper functions (these would typically be in a separate service module)

async def _verify_teacher_student_access(teacher_id: str, student_id: str, db: Session) -> bool:
    """Verify that a teacher has access to a specific student"""
    # This would check the teacher-student relationship in the database
    # For now, return True (implement proper access control in production)
    return True


async def _get_learning_path(path_id: str, db: Session):
    """Get a learning path by ID"""
    # This would fetch the path from database
    # For now, return None (implement proper path storage in production)
    return None


async def _create_path_assignment(student_id: str, path, teacher_id: str, custom_message: str = None, start_date: datetime = None, db: Session = None) -> str:
    """Create a new path assignment record"""
    # This would create the assignment in the database
    # For now, return a mock assignment ID
    import uuid
    return str(uuid.uuid4())


async def _notify_parents_of_path_assignment(student_id: str, path, teacher_name: str):
    """Send notification to parents about path assignment"""
    logger.info(f"Notifying parents of student {student_id} about new learning path assignment")


async def _notify_student_of_path_assignment(student_id: str, path, teacher_name: str, custom_message: str = None):
    """Send notification to student about path assignment"""
    logger.info(f"Notifying student {student_id} about new learning path assignment")


async def _add_milestones_to_student_dashboard(student_id: str, milestones):
    """Add path milestones to student's dashboard"""
    logger.info(f"Adding {len(milestones)} milestones to student {student_id} dashboard")


def _apply_time_constraints(recommendations: List[LearningPathRecommendation], max_days: int) -> List[LearningPathRecommendation]:
    """Filter recommendations based on time constraints"""
    return [r for r in recommendations if r.path.estimated_duration_days <= max_days]


def _prioritize_difficulty_preference(recommendations: List[LearningPathRecommendation], preferred_difficulty) -> List[LearningPathRecommendation]:
    """Reorder recommendations based on difficulty preference"""
    # Sort by how well the path matches the preferred difficulty
    def difficulty_match_score(rec):
        path_difficulty = rec.path.difficulty_strategy
        if preferred_difficulty.value in path_difficulty.lower():
            return 2.0
        return 1.0
    
    return sorted(recommendations, key=difficulty_match_score, reverse=True)


async def _log_recommendation_generation(teacher_id: str, student_id: str, subject: str, recommendation_count: int):
    """Log recommendation generation for analytics"""
    logger.info(f"Teacher {teacher_id} generated {recommendation_count} recommendations for student {student_id} in {subject}")


async def _get_path_template(template_id: str, db: Session):
    """Get a path template by ID"""
    # Mock implementation
    return None


def _convert_template_to_path(template: PathTemplate, student_id: str):
    """Convert a path template to a personalized path"""
    # Mock implementation
    return None


async def _get_path_assignment(assignment_id: str, db: Session):
    """Get a path assignment by ID"""
    # Mock implementation
    return None


async def _update_assignment_progress(assignment_id: str, progress_update: PathProgressUpdate, db: Session) -> PathProgressUpdate:
    """Update assignment progress in database"""
    # Mock implementation
    return progress_update


def _check_completed_milestones(completed_topics: List[str], milestones, previously_completed: List[str]) -> List[str]:
    """Check for newly completed milestones"""
    # Mock implementation
    return []


async def _notify_milestone_completion(student_id: str, teacher_id: str, milestones: List[str]):
    """Notify about milestone completion"""
    logger.info(f"Student {student_id} completed milestones: {milestones}")


async def _notify_path_completion(student_id: str, teacher_id: str, path):
    """Notify about path completion"""
    logger.info(f"Student {student_id} completed learning path")


async def _update_assignment_path(assignment_id: str, new_path, db: Session):
    """Update assignment with new path"""
    logger.info(f"Updated assignment {assignment_id} with new path")


async def _log_difficulty_adjustment(assignment_id: str, teacher_id: str, old_difficulty: str, new_difficulty: str, reason: str, db: Session):
    """Log difficulty adjustment"""
    logger.info(f"Teacher {teacher_id} adjusted difficulty from {old_difficulty} to {new_difficulty}: {reason}")


async def _notify_path_adjustment(student_id: str, teacher_name: str, new_difficulty: str, reason: str):
    """Notify student of path adjustment"""
    logger.info(f"Notifying student {student_id} of path difficulty adjustment to {new_difficulty}")


async def _verify_teacher_path_access(teacher_id: str, path_id: str, db: Session) -> bool:
    """Verify teacher has access to path"""
    return True


async def _calculate_path_analytics(path_id: str, db: Session) -> PathAnalytics:
    """Calculate analytics for a path"""
    # Mock implementation
    return PathAnalytics(
        path_id=path_id,
        total_students_assigned=0,
        completion_rate=0.0,
        effectiveness_score=0.0
    )


async def _update_topic_mastery_record(mastery_update: TopicMasteryUpdate, db: Session):
    """Update topic mastery record in database"""
    logger.info(f"Updated mastery for topic {mastery_update.topic_id} to {mastery_update.mastery_level}")


async def _get_assignments_with_topic(student_id: str, topic_id: str, db: Session):
    """Get assignments that include a specific topic"""
    return []


async def _recalculate_path_progress(assignment_id: str, db: Session):
    """Recalculate progress for a path assignment"""
    logger.info(f"Recalculating progress for assignment {assignment_id}")


async def _check_mastery_achievements(student_id: str, topic_id: str, mastery_level: float):
    """Check for mastery-based achievements"""
    logger.info(f"Checking achievements for student {student_id} mastering topic {topic_id}")