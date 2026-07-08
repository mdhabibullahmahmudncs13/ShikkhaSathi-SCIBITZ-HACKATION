"""
Quiz Service - Simplified version using question bank
Generates quizzes from the question database without requiring RAG or OpenAI
"""
import logging
import random
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from uuid import UUID, uuid4

from app.models.question import Question, Quiz
from app.models.quiz_attempt import QuizAttempt
from app.models.user import User
from app.services.gamification_service import GamificationService

logger = logging.getLogger(__name__)


class QuizService:
    """Service for quiz generation and management using question bank"""
    
    def __init__(self, db: Session):
        self.db = db
        self.gamification_service = GamificationService(db)
    
    def generate_quiz(
        self,
        user_id: UUID,
        subject: str,
        topic: Optional[str],
        grade: int,
        difficulty_level: Optional[int] = None,
        bloom_level: Optional[int] = None,
        question_count: int = 10,
        time_limit_minutes: Optional[int] = None,
        language: str = 'english'
    ) -> Dict[str, Any]:
        """
        Generate a quiz from the question bank
        
        Args:
            user_id: Student user ID
            subject: Subject name
            topic: Optional topic filter
            grade: Grade level
            difficulty_level: Optional difficulty (1-5)
            bloom_level: Optional Bloom's level (1-6)
            question_count: Number of questions
            time_limit_minutes: Optional time limit
            language: 'english' or 'bangla'
            
        Returns:
            Quiz data with questions
        """
        try:
            logger.info(f"Generating quiz for user {user_id}: {subject}/{topic}, grade {grade}")
            
            # Build query for questions
            query = self.db.query(Question).filter(
                Question.subject == subject,
                Question.grade == grade,
                Question.is_active == True
            )
            
            # Apply optional filters
            if topic:
                query = query.filter(Question.topic == topic)
            
            if difficulty_level:
                query = query.filter(Question.difficulty_level == difficulty_level)
            
            if bloom_level:
                query = query.filter(Question.bloom_level == bloom_level)
            
            # Get available questions
            available_questions = query.all()
            
            # If no questions in database, use sample questions for demo
            if not available_questions:
                logger.info(f"No questions in database for {subject}, using sample questions")
                available_questions = self._get_sample_questions(subject, grade, topic)
            
            if not available_questions:
                raise ValueError(f"No questions available for {subject}/{topic} grade {grade}")
            
            if len(available_questions) < question_count:
                logger.warning(f"Only {len(available_questions)} questions available, requested {question_count}")
                question_count = len(available_questions)
            
            # Select questions (prioritize less-used questions for DB questions, random for samples)
            if hasattr(available_questions[0], 'id'):  # Database questions
                selected_questions = self._select_questions(
                    available_questions, question_count, user_id
                )
            else:  # Sample questions (dict format)
                selected_questions = random.sample(available_questions, min(question_count, len(available_questions)))
            
            # Determine difficulty and bloom level if not specified
            if hasattr(selected_questions[0], 'difficulty_level'):  # Database questions
                if not difficulty_level:
                    difficulty_level = self._calculate_average_difficulty(selected_questions)
                
                if not bloom_level:
                    bloom_level = self._calculate_average_bloom_level(selected_questions)
                    
                question_ids = [str(q.id) for q in selected_questions]
            else:  # Sample questions (dict format)
                if not difficulty_level:
                    difficulty_level = sum(q['difficulty_level'] for q in selected_questions) // len(selected_questions)
                
                if not bloom_level:
                    bloom_level = sum(q['bloom_level'] for q in selected_questions) // len(selected_questions)
                    
                question_ids = [q['id'] for q in selected_questions]
            
            # Set default time limit if not specified
            if not time_limit_minutes:
                time_limit_minutes = question_count * 2  # 2 minutes per question
            
            # Create quiz record
            quiz = Quiz(
                user_id=user_id,
                subject=subject,
                topic=topic,
                grade=grade,
                difficulty_level=difficulty_level,
                bloom_level=bloom_level,
                question_count=question_count,
                time_limit_minutes=time_limit_minutes,
                question_ids=question_ids,
                status='active',
                expires_at=datetime.utcnow() + timedelta(hours=24)
            )
            
            self.db.add(quiz)
            self.db.commit()
            self.db.refresh(quiz)
            
            # Format questions for response (without answers)
            questions_data = []
            for question in selected_questions:
                if hasattr(question, 'to_dict'):  # Database question
                    q_dict = question.to_dict(include_answer=False, language=language)
                else:  # Sample question (dict format)
                    q_dict = {
                        'id': question['id'],
                        'question_text': question['question_text'],
                        'options': question['options'],
                        'difficulty_level': question['difficulty_level'],
                        'bloom_level': question['bloom_level']
                        # Note: correct_answer and explanation are excluded for quiz taking
                    }
                questions_data.append(q_dict)
            
            logger.info(f"Generated quiz {quiz.id} with {len(questions_data)} questions")
            
            return {
                'quiz_id': str(quiz.id),
                'subject': subject,
                'topic': topic,
                'grade': grade,
                'difficulty_level': difficulty_level,
                'bloom_level': bloom_level,
                'question_count': question_count,
                'time_limit_minutes': time_limit_minutes,
                'questions': questions_data,
                'created_at': quiz.created_at.isoformat(),
                'expires_at': quiz.expires_at.isoformat() if quiz.expires_at else None
            }
            
        except Exception as e:
            logger.error(f"Failed to generate quiz: {e}")
            self.db.rollback()
            raise
    
    def submit_quiz(
        self,
        quiz_id: UUID,
        user_id: UUID,
        answers: Dict[str, str],
        time_taken_seconds: int
    ) -> Dict[str, Any]:
        """
        Submit quiz answers and calculate score
        
        Args:
            quiz_id: Quiz ID
            user_id: Student user ID
            answers: Map of question_id to answer (A/B/C/D)
            time_taken_seconds: Time taken to complete
            
        Returns:
            Quiz results with score and feedback
        """
        try:
            logger.info(f"Submitting quiz {quiz_id} for user {user_id}")
            
            # Get quiz
            quiz = self.db.query(Quiz).filter(Quiz.id == quiz_id).first()
            if not quiz:
                raise ValueError(f"Quiz {quiz_id} not found")
            
            if quiz.user_id != user_id:
                raise ValueError("Quiz does not belong to this user")
            
            if quiz.status != 'active':
                raise ValueError(f"Quiz is {quiz.status}, cannot submit")
            
            # Get questions
            try:
                # Ensure all question IDs are converted to UUID objects
                question_ids = []
                for qid in quiz.question_ids:
                    if isinstance(qid, str):
                        question_ids.append(UUID(qid))
                    elif isinstance(qid, UUID):
                        question_ids.append(qid)
                    else:
                        # Convert to string first, then to UUID
                        question_ids.append(UUID(str(qid)))
                
                # Query questions one by one to avoid sorting issues
                questions = []
                for qid in question_ids:
                    question = self.db.query(Question).filter(Question.id == qid).first()
                    if question:
                        questions.append(question)
                        
            except Exception as e:
                logger.error(f"Error processing question IDs: {e}, question_ids: {quiz.question_ids}")
                raise ValueError(f"Invalid question IDs in quiz: {e}")
            
            # Create question lookup
            question_map = {str(q.id): q for q in questions}
            
            # Score the quiz
            score = 0
            max_score = len(questions)
            correct_count = 0
            incorrect_count = 0
            results = []
            
            for question_id_str, student_answer in answers.items():
                question = question_map.get(question_id_str)
                if not question:
                    continue
                
                is_correct = student_answer.upper() == question.correct_answer.upper()
                
                if is_correct:
                    score += 1
                    correct_count += 1
                else:
                    incorrect_count += 1
                
                # Update question statistics
                question.times_used += 1
                if is_correct:
                    question.times_correct += 1
                
                results.append({
                    'question_id': question_id_str,
                    'question_text': question.question_text,
                    'student_answer': student_answer,
                    'correct_answer': question.correct_answer,
                    'is_correct': is_correct,
                    'explanation': question.explanation,
                    'options': {
                        'A': question.option_a,
                        'B': question.option_b,
                        'C': question.option_c,
                        'D': question.option_d
                    }
                })
            
            percentage = (score / max_score * 100) if max_score > 0 else 0
            
            # Create quiz attempt record
            quiz_attempt = QuizAttempt(
                user_id=user_id,
                quiz_id=quiz_id,
                score=score,
                max_score=max_score,
                time_taken_seconds=time_taken_seconds,
                difficulty_level=quiz.difficulty_level,
                bloom_level=quiz.bloom_level,
                subject=quiz.subject,
                topic=quiz.topic or '',
                grade=quiz.grade,
                completed_at=datetime.utcnow(),
                answers=answers
            )
            
            self.db.add(quiz_attempt)
            
            # Update quiz status
            quiz.status = 'completed'
            
            # Award XP
            xp_result = self.gamification_service.award_xp(
                user_id=user_id,  # Pass UUID directly, not string
                activity_type='quiz_completion',
                amount=None,  # Will use default
                metadata={
                    'quiz_id': str(quiz_id),
                    'score': score,
                    'max_score': max_score,
                    'percentage': percentage
                }
            )
            
            # Award bonus XP for perfect score
            if score == max_score:
                bonus_xp = self.gamification_service.award_xp(
                    user_id=user_id,  # Pass UUID directly, not string
                    activity_type='perfect_quiz',
                    metadata={'quiz_id': str(quiz_id)}
                )
                xp_result['bonus_xp'] = bonus_xp['xp_awarded']
            
            self.db.commit()
            
            logger.info(f"Quiz {quiz_id} submitted: {score}/{max_score} ({percentage:.1f}%)")
            
            return {
                'quiz_id': str(quiz_id),
                'attempt_id': str(quiz_attempt.id),
                'score': score,
                'max_score': max_score,
                'percentage': percentage,
                'correct_count': correct_count,
                'incorrect_count': incorrect_count,
                'time_taken_seconds': time_taken_seconds,
                'xp_earned': xp_result['xp_awarded'],
                'total_xp': xp_result['total_xp'],
                'level': xp_result['new_level'],
                'level_up': xp_result['level_up'],
                'results': results,
                'performance_summary': self._generate_performance_summary(
                    percentage, quiz.subject, quiz.topic
                )
            }
            
        except Exception as e:
            logger.error(f"Failed to submit quiz: {e}")
            self.db.rollback()
            raise
    
    def get_quiz_results(self, attempt_id: UUID, user_id: UUID) -> Dict[str, Any]:
        """Get detailed quiz results"""
        try:
            attempt = self.db.query(QuizAttempt).filter(
                QuizAttempt.id == attempt_id,
                QuizAttempt.user_id == user_id
            ).first()
            
            if not attempt:
                raise ValueError("Quiz attempt not found")
            
            # Get quiz
            quiz = self.db.query(Quiz).filter(Quiz.id == attempt.quiz_id).first()
            
            # Get questions
            if quiz:
                question_ids = [UUID(qid) for qid in quiz.question_ids]
                questions = self.db.query(Question).filter(Question.id.in_(question_ids)).all()
                question_map = {str(q.id): q for q in questions}
            else:
                question_map = {}
            
            # Format results
            results = []
            for question_id_str, student_answer in attempt.answers.items():
                question = question_map.get(question_id_str)
                if question:
                    results.append({
                        'question_id': question_id_str,
                        'question_text': question.question_text,
                        'student_answer': student_answer,
                        'correct_answer': question.correct_answer,
                        'is_correct': student_answer.upper() == question.correct_answer.upper(),
                        'explanation': question.explanation
                    })
            
            percentage = (attempt.score / attempt.max_score * 100) if attempt.max_score > 0 else 0
            
            return {
                'attempt_id': str(attempt.id),
                'quiz_id': str(attempt.quiz_id),
                'score': attempt.score,
                'max_score': attempt.max_score,
                'percentage': percentage,
                'time_taken_seconds': attempt.time_taken_seconds,
                'subject': attempt.subject,
                'topic': attempt.topic,
                'grade': attempt.grade,
                'difficulty_level': attempt.difficulty_level,
                'bloom_level': attempt.bloom_level,
                'completed_at': attempt.completed_at.isoformat(),
                'results': results
            }
            
        except Exception as e:
            logger.error(f"Failed to get quiz results: {e}")
            raise
    
    def get_quiz_history(
        self,
        user_id: UUID,
        subject: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get quiz attempt history for a user"""
        try:
            query = self.db.query(QuizAttempt).filter(
                QuizAttempt.user_id == user_id
            )
            
            if subject:
                query = query.filter(QuizAttempt.subject == subject)
            
            attempts = query.order_by(
                QuizAttempt.completed_at.desc()
            ).limit(limit).all()
            
            history = []
            for attempt in attempts:
                percentage = (attempt.score / attempt.max_score * 100) if attempt.max_score > 0 else 0
                history.append({
                    'attempt_id': str(attempt.id),
                    'quiz_id': str(attempt.quiz_id),
                    'subject': attempt.subject,
                    'topic': attempt.topic,
                    'score': attempt.score,
                    'max_score': attempt.max_score,
                    'percentage': percentage,
                    'difficulty_level': attempt.difficulty_level,
                    'bloom_level': attempt.bloom_level,
                    'time_taken_seconds': attempt.time_taken_seconds,
                    'completed_at': attempt.completed_at.isoformat()
                })
            
            return history
            
        except Exception as e:
            logger.error(f"Failed to get quiz history: {e}")
            raise
    
    def _select_questions(
        self,
        available_questions: List[Question],
        count: int,
        user_id: UUID
    ) -> List[Question]:
        """Select questions prioritizing less-used ones"""
        # Sort by times_used (ascending) to prioritize fresh questions
        sorted_questions = sorted(available_questions, key=lambda q: q.times_used)
        
        # Take the requested count
        selected = sorted_questions[:count]
        
        # Shuffle to randomize order
        random.shuffle(selected)
        
        return selected
    
    def _calculate_average_difficulty(self, questions: List[Question]) -> int:
        """Calculate average difficulty level"""
        if not questions:
            return 3  # Default medium difficulty
        
        avg = sum(q.difficulty_level for q in questions) / len(questions)
        return round(avg)
    
    def _calculate_average_bloom_level(self, questions: List[Question]) -> int:
        """Calculate average Bloom's level"""
        if not questions:
            return 2  # Default understanding level
        
        avg = sum(q.bloom_level for q in questions) / len(questions)
        return round(avg)
    
    def _generate_performance_summary(
        self,
        percentage: float,
        subject: str,
        topic: Optional[str]
    ) -> Dict[str, Any]:
        """Generate performance summary and recommendations"""
        # Performance level
        if percentage >= 90:
            level = "excellent"
            message = "Outstanding performance! You've mastered this topic."
        elif percentage >= 80:
            level = "very_good"
            message = "Great job! You have a strong understanding."
        elif percentage >= 70:
            level = "good"
            message = "Good work! Keep practicing to improve further."
        elif percentage >= 60:
            level = "satisfactory"
            message = "You're making progress. Review the concepts and try again."
        else:
            level = "needs_improvement"
            message = "Keep studying! Focus on understanding the fundamentals."
        
        # Recommendations
        recommendations = []
        if percentage < 70:
            recommendations.append(f"Review {subject} concepts")
            if topic:
                recommendations.append(f"Practice more {topic} questions")
            recommendations.append("Study the explanations for incorrect answers")
        elif percentage < 90:
            recommendations.append("Try more challenging questions")
            recommendations.append("Explore advanced topics")
        else:
            recommendations.append("Excellent! Move on to the next topic")
            recommendations.append("Help others learn this topic")
        
        return {
            'level': level,
            'message': message,
            'recommendations': recommendations
        }
    
    def _get_sample_questions(self, subject: str, grade: int, topic: Optional[str] = None) -> List[Dict[str, Any]]:
        """Generate sample questions for demo purposes when database is empty"""
        
        sample_questions = {
            'Mathematics': [
                {
                    'id': str(uuid4()),
                    'question_text': 'What is the value of 2 + 3 × 4?',
                    'options': {'A': '20', 'B': '14', 'C': '10', 'D': '24'},
                    'correct_answer': 'B',
                    'explanation': 'Following order of operations (PEMDAS), multiplication comes before addition: 2 + (3 × 4) = 2 + 12 = 14',
                    'difficulty_level': 2,
                    'bloom_level': 2
                },
                {
                    'id': str(uuid4()),
                    'question_text': 'If x + 5 = 12, what is the value of x?',
                    'options': {'A': '7', 'B': '17', 'C': '5', 'D': '12'},
                    'correct_answer': 'A',
                    'explanation': 'To solve x + 5 = 12, subtract 5 from both sides: x = 12 - 5 = 7',
                    'difficulty_level': 2,
                    'bloom_level': 3
                },
                {
                    'id': str(uuid4()),
                    'question_text': 'What is the area of a rectangle with length 8 cm and width 5 cm?',
                    'options': {'A': '13 cm²', 'B': '26 cm²', 'C': '40 cm²', 'D': '80 cm²'},
                    'correct_answer': 'C',
                    'explanation': 'Area of rectangle = length × width = 8 × 5 = 40 cm²',
                    'difficulty_level': 2,
                    'bloom_level': 2
                }
            ],
            'Physics': [
                {
                    'id': str(uuid4()),
                    'question_text': 'What is the SI unit of force?',
                    'options': {'A': 'Joule', 'B': 'Newton', 'C': 'Watt', 'D': 'Pascal'},
                    'correct_answer': 'B',
                    'explanation': 'The SI unit of force is Newton (N), named after Sir Isaac Newton',
                    'difficulty_level': 1,
                    'bloom_level': 1
                },
                {
                    'id': str(uuid4()),
                    'question_text': 'If an object travels 100 meters in 10 seconds, what is its speed?',
                    'options': {'A': '10 m/s', 'B': '100 m/s', 'C': '1000 m/s', 'D': '1 m/s'},
                    'correct_answer': 'A',
                    'explanation': 'Speed = Distance ÷ Time = 100 m ÷ 10 s = 10 m/s',
                    'difficulty_level': 2,
                    'bloom_level': 3
                }
            ],
            'Chemistry': [
                {
                    'id': str(uuid4()),
                    'question_text': 'What is the chemical symbol for water?',
                    'options': {'A': 'H2O', 'B': 'CO2', 'C': 'NaCl', 'D': 'O2'},
                    'correct_answer': 'A',
                    'explanation': 'Water is composed of 2 hydrogen atoms and 1 oxygen atom, so its formula is H2O',
                    'difficulty_level': 1,
                    'bloom_level': 1
                }
            ],
            'ICT': [
                {
                    'id': str(uuid4()),
                    'question_text': 'What does CPU stand for?',
                    'options': {'A': 'Computer Processing Unit', 'B': 'Central Processing Unit', 'C': 'Central Program Unit', 'D': 'Computer Program Unit'},
                    'correct_answer': 'B',
                    'explanation': 'CPU stands for Central Processing Unit, which is the main component that executes instructions in a computer',
                    'difficulty_level': 1,
                    'bloom_level': 1
                },
                {
                    'id': str(uuid4()),
                    'question_text': 'Which of the following is an input device?',
                    'options': {'A': 'Monitor', 'B': 'Printer', 'C': 'Keyboard', 'D': 'Speaker'},
                    'correct_answer': 'C',
                    'explanation': 'A keyboard is an input device used to enter data into a computer',
                    'difficulty_level': 1,
                    'bloom_level': 2
                }
            ],
            'English': [
                {
                    'id': str(uuid4()),
                    'question_text': 'Which of the following is a noun?',
                    'options': {'A': 'Run', 'B': 'Beautiful', 'C': 'Book', 'D': 'Quickly'},
                    'correct_answer': 'C',
                    'explanation': 'A noun is a word that names a person, place, thing, or idea. "Book" is a thing, so it is a noun',
                    'difficulty_level': 1,
                    'bloom_level': 2
                }
            ],
            'Bangla': [
                {
                    'id': str(uuid4()),
                    'question_text': 'বাংলা ভাষার মূল উৎস কী?',
                    'options': {'A': 'সংস্কৃত', 'B': 'পালি', 'C': 'প্রাকৃত', 'D': 'অপভ্রংশ'},
                    'correct_answer': 'A',
                    'explanation': 'বাংলা ভাষার মূল উৎস সংস্কৃত ভাষা',
                    'difficulty_level': 2,
                    'bloom_level': 1
                }
            ]
        }
        
        # Get questions for the subject
        questions = sample_questions.get(subject, [])
        
        # If no questions for this subject, create a generic one
        if not questions:
            questions = [
                {
                    'id': str(uuid4()),
                    'question_text': f'Sample question for {subject}',
                    'options': {'A': 'Option A', 'B': 'Option B', 'C': 'Option C', 'D': 'Option D'},
                    'correct_answer': 'A',
                    'explanation': f'This is a sample question for {subject}. In a real system, this would be replaced with actual curriculum content.',
                    'difficulty_level': 2,
                    'bloom_level': 2
                }
            ]
        
        return questions
