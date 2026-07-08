"""
Assessment Service
Handles teacher assessment creation, management, and analytics
"""

import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from collections import defaultdict
import statistics
import uuid

from app.models.user import User, UserRole
from app.models.assessment import (
    Assessment, AssessmentQuestion, AssessmentRubric, RubricCriterion, RubricLevel,
    AssessmentAttempt, AssessmentResponse, AssessmentAnalytics
)
from app.services.quiz.question_generator import (
    QuestionGenerator, QuestionGenerationRequest, QuestionType, BloomLevel
)
from app.services.rag.rag_service import RAGService

logger = logging.getLogger(__name__)

class AssessmentService:
    """Service for managing teacher assessments"""
    
    def __init__(self, db: Session, question_generator: QuestionGenerator):
        self.db = db
        self.question_generator = question_generator
    
    async def create_assessment(
        self, 
        teacher_id: str,
        assessment_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a new assessment with AI-generated questions"""
        try:
            logger.info(f"Creating assessment for teacher {teacher_id}")
            
            # Create assessment record
            assessment = Assessment(
                title=assessment_data["title"],
                description=assessment_data.get("description", ""),
                subject=assessment_data["subject"],
                grade=assessment_data["grade"],
                teacher_id=teacher_id,
                bloom_levels=assessment_data["bloom_levels"],
                topics=assessment_data["topics"],
                question_count=assessment_data["question_count"],
                time_limit=assessment_data["time_limit"],
                difficulty=assessment_data.get("difficulty", "medium"),
                scheduled_date=assessment_data.get("scheduled_date"),
                due_date=assessment_data.get("due_date"),
                assigned_classes=assessment_data["assigned_classes"]
            )
            
            self.db.add(assessment)
            self.db.flush()  # Get the ID
            
            # Generate questions using AI
            questions = await self._generate_assessment_questions(
                assessment, assessment_data
            )
            
            # Create rubric if provided
            if "rubric" in assessment_data:
                rubric = await self._create_assessment_rubric(
                    assessment.id, assessment_data["rubric"]
                )
            
            self.db.commit()
            
            logger.info(f"Created assessment {assessment.id} with {len(questions)} questions")
            
            return {
                "assessment_id": str(assessment.id),
                "title": assessment.title,
                "questions_generated": len(questions),
                "status": "created"
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create assessment: {e}")
            raise
    
    async def _generate_assessment_questions(
        self, 
        assessment: Assessment,
        assessment_data: Dict[str, Any]
    ) -> List[AssessmentQuestion]:
        """Generate questions for an assessment using AI"""
        try:
            questions = []
            questions_per_topic = assessment.question_count // len(assessment.topics)
            remaining_questions = assessment.question_count % len(assessment.topics)
            
            for i, topic in enumerate(assessment.topics):
                # Distribute questions across Bloom levels
                topic_question_count = questions_per_topic
                if i < remaining_questions:
                    topic_question_count += 1
                
                # Generate questions for each Bloom level
                bloom_questions = self._distribute_questions_by_bloom(
                    topic_question_count, assessment.bloom_levels
                )
                
                for bloom_level, count in bloom_questions.items():
                    if count == 0:
                        continue
                    
                    # Determine question types (mix of multiple choice and others)
                    question_types = self._determine_question_types(count, bloom_level)
                    
                    for question_type, type_count in question_types.items():
                        # Generate questions using AI
                        gen_request = QuestionGenerationRequest(
                            subject=assessment.subject,
                            topic=topic,
                            grade=assessment.grade,
                            question_type=question_type,
                            bloom_level=BloomLevel(bloom_level),
                            difficulty_level=self._map_difficulty_to_level(assessment.difficulty),
                            count=type_count,
                            language="bangla"
                        )
                        
                        generated_questions = await self.question_generator.generate_questions(gen_request)
                        
                        # Convert to AssessmentQuestion objects
                        for j, gen_q in enumerate(generated_questions):
                            question = AssessmentQuestion(
                                assessment_id=assessment.id,
                                question_type=gen_q.question_type.value,
                                question_text=gen_q.question_text,
                                options=gen_q.options,
                                correct_answer=gen_q.correct_answer,
                                explanation=gen_q.explanation,
                                bloom_level=gen_q.bloom_level.value,
                                topic=gen_q.topic,
                                difficulty=gen_q.difficulty_level,
                                points=self._calculate_question_points(gen_q.bloom_level.value),
                                order_index=len(questions),
                                source_references=gen_q.source_references,
                                quality_score=gen_q.quality_score
                            )
                            
                            self.db.add(question)
                            questions.append(question)
            
            return questions
            
        except Exception as e:
            logger.error(f"Failed to generate assessment questions: {e}")
            raise
    
    def _distribute_questions_by_bloom(
        self, 
        total_questions: int, 
        bloom_levels: List[int]
    ) -> Dict[int, int]:
        """Distribute questions across Bloom levels"""
        distribution = {}
        questions_per_level = total_questions // len(bloom_levels)
        remaining = total_questions % len(bloom_levels)
        
        for i, level in enumerate(bloom_levels):
            count = questions_per_level
            if i < remaining:
                count += 1
            distribution[level] = count
        
        return distribution
    
    def _determine_question_types(
        self, 
        question_count: int, 
        bloom_level: int
    ) -> Dict[QuestionType, int]:
        """Determine mix of question types based on Bloom level"""
        types = {}
        
        if bloom_level <= 2:  # Remember, Understand
            # More multiple choice for lower levels
            types[QuestionType.MULTIPLE_CHOICE] = max(1, question_count // 2)
            types[QuestionType.TRUE_FALSE] = question_count - types[QuestionType.MULTIPLE_CHOICE]
        elif bloom_level <= 4:  # Apply, Analyze
            # Mix of multiple choice and short answer
            types[QuestionType.MULTIPLE_CHOICE] = max(1, question_count // 3)
            types[QuestionType.SHORT_ANSWER] = question_count - types[QuestionType.MULTIPLE_CHOICE]
        else:  # Evaluate, Create
            # More open-ended questions for higher levels
            types[QuestionType.SHORT_ANSWER] = question_count
        
        return types
    
    def _map_difficulty_to_level(self, difficulty: str) -> int:
        """Map difficulty string to numeric level"""
        mapping = {
            "easy": 3,
            "medium": 5,
            "hard": 7,
            "adaptive": 5  # Start at medium for adaptive
        }
        return mapping.get(difficulty, 5)
    
    def _calculate_question_points(self, bloom_level: int) -> int:
        """Calculate points for a question based on Bloom level"""
        # Higher Bloom levels get more points
        point_mapping = {1: 1, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5}
        return point_mapping.get(bloom_level, 2)
    
    async def _create_assessment_rubric(
        self, 
        assessment_id: str,
        rubric_data: Dict[str, Any]
    ) -> AssessmentRubric:
        """Create rubric for an assessment"""
        try:
            rubric = AssessmentRubric(
                assessment_id=assessment_id,
                title=rubric_data["title"],
                description=rubric_data.get("description", ""),
                total_points=rubric_data["total_points"]
            )
            
            self.db.add(rubric)
            self.db.flush()
            
            # Create criteria
            for criterion_data in rubric_data["criteria"]:
                criterion = RubricCriterion(
                    rubric_id=rubric.id,
                    name=criterion_data["name"],
                    description=criterion_data.get("description", ""),
                    weight=criterion_data.get("weight", 1.0),
                    order_index=criterion_data.get("order_index", 0)
                )
                
                self.db.add(criterion)
                self.db.flush()
                
                # Create levels
                for level_data in criterion_data["levels"]:
                    level = RubricLevel(
                        criterion_id=criterion.id,
                        name=level_data["name"],
                        description=level_data["description"],
                        points=level_data["points"],
                        order_index=level_data.get("order_index", 0)
                    )
                    
                    self.db.add(level)
            
            return rubric
            
        except Exception as e:
            logger.error(f"Failed to create rubric: {e}")
            raise
    
    def get_teacher_assessments(
        self, 
        teacher_id: str,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Get assessments created by a teacher"""
        try:
            assessments = self.db.query(Assessment).filter(
                Assessment.teacher_id == teacher_id
            ).order_by(
                Assessment.created_at.desc()
            ).offset(offset).limit(limit).all()
            
            assessment_list = []
            for assessment in assessments:
                # Get basic analytics
                attempts_count = self.db.query(AssessmentAttempt).filter(
                    AssessmentAttempt.assessment_id == assessment.id
                ).count()
                
                completed_attempts = self.db.query(AssessmentAttempt).filter(
                    and_(
                        AssessmentAttempt.assessment_id == assessment.id,
                        AssessmentAttempt.is_submitted == True
                    )
                ).count()
                
                assessment_list.append({
                    "id": str(assessment.id),
                    "title": assessment.title,
                    "subject": assessment.subject,
                    "grade": assessment.grade,
                    "question_count": assessment.question_count,
                    "time_limit": assessment.time_limit,
                    "difficulty": assessment.difficulty,
                    "scheduled_date": assessment.scheduled_date,
                    "due_date": assessment.due_date,
                    "is_published": assessment.is_published,
                    "created_at": assessment.created_at,
                    "attempts_count": attempts_count,
                    "completion_rate": (completed_attempts / attempts_count * 100) if attempts_count > 0 else 0
                })
            
            total_count = self.db.query(Assessment).filter(
                Assessment.teacher_id == teacher_id
            ).count()
            
            return {
                "assessments": assessment_list,
                "total_count": total_count,
                "has_more": (offset + limit) < total_count
            }
            
        except Exception as e:
            logger.error(f"Failed to get teacher assessments: {e}")
            raise
    
    def get_assessment_details(
        self, 
        assessment_id: str,
        teacher_id: str
    ) -> Dict[str, Any]:
        """Get detailed assessment information"""
        try:
            assessment = self.db.query(Assessment).filter(
                and_(
                    Assessment.id == assessment_id,
                    Assessment.teacher_id == teacher_id
                )
            ).first()
            
            if not assessment:
                raise ValueError(f"Assessment {assessment_id} not found")
            
            # Get questions
            questions = self.db.query(AssessmentQuestion).filter(
                AssessmentQuestion.assessment_id == assessment_id
            ).order_by(AssessmentQuestion.order_index).all()
            
            # Get rubric
            rubric = self.db.query(AssessmentRubric).filter(
                AssessmentRubric.assessment_id == assessment_id
            ).first()
            
            rubric_data = None
            if rubric:
                criteria = self.db.query(RubricCriterion).filter(
                    RubricCriterion.rubric_id == rubric.id
                ).order_by(RubricCriterion.order_index).all()
                
                criteria_data = []
                for criterion in criteria:
                    levels = self.db.query(RubricLevel).filter(
                        RubricLevel.criterion_id == criterion.id
                    ).order_by(RubricLevel.order_index).all()
                    
                    criteria_data.append({
                        "id": str(criterion.id),
                        "name": criterion.name,
                        "description": criterion.description,
                        "weight": criterion.weight,
                        "levels": [
                            {
                                "id": str(level.id),
                                "name": level.name,
                                "description": level.description,
                                "points": level.points
                            }
                            for level in levels
                        ]
                    })
                
                rubric_data = {
                    "id": str(rubric.id),
                    "title": rubric.title,
                    "description": rubric.description,
                    "total_points": rubric.total_points,
                    "criteria": criteria_data
                }
            
            return {
                "id": str(assessment.id),
                "title": assessment.title,
                "description": assessment.description,
                "subject": assessment.subject,
                "grade": assessment.grade,
                "bloom_levels": assessment.bloom_levels,
                "topics": assessment.topics,
                "question_count": assessment.question_count,
                "time_limit": assessment.time_limit,
                "difficulty": assessment.difficulty,
                "scheduled_date": assessment.scheduled_date,
                "due_date": assessment.due_date,
                "assigned_classes": assessment.assigned_classes,
                "is_published": assessment.is_published,
                "created_at": assessment.created_at,
                "questions": [
                    {
                        "id": str(q.id),
                        "question_type": q.question_type,
                        "question_text": q.question_text,
                        "options": q.options,
                        "correct_answer": q.correct_answer,
                        "explanation": q.explanation,
                        "bloom_level": q.bloom_level,
                        "topic": q.topic,
                        "difficulty": q.difficulty,
                        "points": q.points,
                        "quality_score": q.quality_score
                    }
                    for q in questions
                ],
                "rubric": rubric_data
            }
            
        except Exception as e:
            logger.error(f"Failed to get assessment details: {e}")
            raise
    
    def publish_assessment(
        self, 
        assessment_id: str,
        teacher_id: str
    ) -> Dict[str, Any]:
        """Publish an assessment to make it available to students"""
        try:
            assessment = self.db.query(Assessment).filter(
                and_(
                    Assessment.id == assessment_id,
                    Assessment.teacher_id == teacher_id
                )
            ).first()
            
            if not assessment:
                raise ValueError(f"Assessment {assessment_id} not found")
            
            assessment.is_published = True
            assessment.updated_at = datetime.utcnow()
            
            self.db.commit()
            
            logger.info(f"Published assessment {assessment_id}")
            
            return {
                "assessment_id": str(assessment.id),
                "title": assessment.title,
                "status": "published"
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to publish assessment: {e}")
            raise
    
    def get_assessment_analytics(
        self, 
        assessment_id: str,
        teacher_id: str
    ) -> Dict[str, Any]:
        """Get comprehensive analytics for an assessment"""
        try:
            assessment = self.db.query(Assessment).filter(
                and_(
                    Assessment.id == assessment_id,
                    Assessment.teacher_id == teacher_id
                )
            ).first()
            
            if not assessment:
                raise ValueError(f"Assessment {assessment_id} not found")
            
            # Get all attempts
            attempts = self.db.query(AssessmentAttempt).filter(
                AssessmentAttempt.assessment_id == assessment_id
            ).all()
            
            if not attempts:
                return self._empty_analytics(assessment)
            
            # Calculate overall metrics
            completed_attempts = [a for a in attempts if a.is_submitted]
            completion_rate = len(completed_attempts) / len(attempts) * 100 if attempts else 0
            
            scores = [a.percentage for a in completed_attempts if a.percentage is not None]
            average_score = statistics.mean(scores) if scores else 0
            
            times = [a.time_taken_seconds / 60 for a in completed_attempts if a.time_taken_seconds]
            average_time = statistics.mean(times) if times else 0
            
            # Question-level analytics
            questions = self.db.query(AssessmentQuestion).filter(
                AssessmentQuestion.assessment_id == assessment_id
            ).all()
            
            question_analytics = []
            for question in questions:
                responses = self.db.query(AssessmentResponse).filter(
                    AssessmentResponse.question_id == question.id
                ).all()
                
                if responses:
                    correct_responses = [r for r in responses if r.is_correct]
                    correct_rate = len(correct_responses) / len(responses) * 100
                    
                    response_times = [r.time_taken_seconds for r in responses if r.time_taken_seconds]
                    avg_time = statistics.mean(response_times) if response_times else 0
                    
                    # Analyze common mistakes for multiple choice
                    common_mistakes = []
                    if question.question_type == "multiple_choice":
                        wrong_answers = [r.student_answer for r in responses if not r.is_correct]
                        mistake_counts = {}
                        for answer in wrong_answers:
                            mistake_counts[answer] = mistake_counts.get(answer, 0) + 1
                        
                        common_mistakes = [
                            f"Option {answer}: {count} students"
                            for answer, count in sorted(mistake_counts.items(), key=lambda x: x[1], reverse=True)[:3]
                        ]
                    
                    question_analytics.append({
                        "questionId": str(question.id),
                        "question": question.question_text[:100] + "..." if len(question.question_text) > 100 else question.question_text,
                        "correctRate": round(correct_rate, 1),
                        "averageTime": round(avg_time, 1),
                        "commonMistakes": common_mistakes,
                        "bloomLevel": question.bloom_level
                    })
            
            # Class comparison (mock data for now)
            class_comparisons = []
            for class_id in assessment.assigned_classes:
                class_attempts = [a for a in completed_attempts]  # Would filter by class in real implementation
                class_scores = [a.percentage for a in class_attempts if a.percentage is not None]
                
                if class_scores:
                    class_comparisons.append({
                        "classId": class_id,
                        "className": f"Class {class_id}",
                        "averageScore": round(statistics.mean(class_scores), 1),
                        "completionRate": len(class_attempts) / len(attempts) * 100 if attempts else 0,
                        "topPerformers": [a.student.full_name for a in sorted(class_attempts, key=lambda x: x.percentage or 0, reverse=True)[:3]],
                        "strugglingStudents": [a.student.full_name for a in sorted(class_attempts, key=lambda x: x.percentage or 0)[:3]]
                    })
            
            # Difficulty analysis
            easy_questions = [q for q in questions if q.difficulty <= 3]
            medium_questions = [q for q in questions if 4 <= q.difficulty <= 6]
            hard_questions = [q for q in questions if q.difficulty >= 7]
            
            difficulty_analysis = {
                "easy": self._analyze_difficulty_group(easy_questions, attempts),
                "medium": self._analyze_difficulty_group(medium_questions, attempts),
                "hard": self._analyze_difficulty_group(hard_questions, attempts)
            }
            
            return {
                "assessmentId": str(assessment.id),
                "title": assessment.title,
                "completionRate": round(completion_rate, 1),
                "averageScore": round(average_score, 1),
                "averageTime": round(average_time, 1),
                "questionAnalytics": question_analytics,
                "classComparison": class_comparisons,
                "difficultyAnalysis": difficulty_analysis
            }
            
        except Exception as e:
            logger.error(f"Failed to get assessment analytics: {e}")
            raise
    
    def _empty_analytics(self, assessment: Assessment) -> Dict[str, Any]:
        """Return empty analytics structure"""
        return {
            "assessmentId": str(assessment.id),
            "title": assessment.title,
            "completionRate": 0,
            "averageScore": 0,
            "averageTime": 0,
            "questionAnalytics": [],
            "classComparison": [],
            "difficultyAnalysis": {
                "easy": {"averageScore": 0, "completionRate": 0},
                "medium": {"averageScore": 0, "completionRate": 0},
                "hard": {"averageScore": 0, "completionRate": 0}
            }
        }
    
    def _analyze_difficulty_group(
        self, 
        questions: List[AssessmentQuestion],
        attempts: List[AssessmentAttempt]
    ) -> Dict[str, float]:
        """Analyze performance for a difficulty group"""
        if not questions or not attempts:
            return {"averageScore": 0, "completionRate": 0}
        
        question_ids = [q.id for q in questions]
        responses = self.db.query(AssessmentResponse).filter(
            AssessmentResponse.question_id.in_(question_ids)
        ).all()
        
        if not responses:
            return {"averageScore": 0, "completionRate": 0}
        
        correct_responses = [r for r in responses if r.is_correct]
        correct_rate = len(correct_responses) / len(responses) * 100
        
        # Calculate average score for this difficulty group
        total_possible_points = sum(q.points for q in questions)
        earned_points = sum(r.points_earned for r in responses)
        average_score = (earned_points / (total_possible_points * len(attempts)) * 100) if total_possible_points > 0 else 0
        
        return {
            "averageScore": round(average_score, 1),
            "completionRate": round(correct_rate, 1)
        }
    
    def update_assessment(
        self, 
        assessment_id: str,
        teacher_id: str,
        update_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update an existing assessment"""
        try:
            assessment = self.db.query(Assessment).filter(
                and_(
                    Assessment.id == assessment_id,
                    Assessment.teacher_id == teacher_id
                )
            ).first()
            
            if not assessment:
                raise ValueError(f"Assessment {assessment_id} not found")
            
            # Update allowed fields
            allowed_fields = [
                "title", "description", "time_limit", "scheduled_date", 
                "due_date", "assigned_classes"
            ]
            
            for field in allowed_fields:
                if field in update_data:
                    setattr(assessment, field, update_data[field])
            
            assessment.updated_at = datetime.utcnow()
            self.db.commit()
            
            logger.info(f"Updated assessment {assessment_id}")
            
            return {
                "assessment_id": str(assessment.id),
                "title": assessment.title,
                "status": "updated"
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to update assessment: {e}")
            raise
    
    def delete_assessment(
        self, 
        assessment_id: str,
        teacher_id: str
    ) -> Dict[str, Any]:
        """Delete an assessment (soft delete)"""
        try:
            assessment = self.db.query(Assessment).filter(
                and_(
                    Assessment.id == assessment_id,
                    Assessment.teacher_id == teacher_id
                )
            ).first()
            
            if not assessment:
                raise ValueError(f"Assessment {assessment_id} not found")
            
            # Check if there are any attempts
            attempts_count = self.db.query(AssessmentAttempt).filter(
                AssessmentAttempt.assessment_id == assessment_id
            ).count()
            
            if attempts_count > 0:
                # Soft delete - just mark as inactive
                assessment.is_active = False
                assessment.updated_at = datetime.utcnow()
            else:
                # Hard delete if no attempts
                self.db.delete(assessment)
            
            self.db.commit()
            
            logger.info(f"Deleted assessment {assessment_id}")
            
            return {
                "assessment_id": str(assessment.id),
                "status": "deleted"
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to delete assessment: {e}")
            raise