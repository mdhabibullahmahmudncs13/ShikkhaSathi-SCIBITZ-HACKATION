"""
Quiz Scoring and Feedback Service
Handles real-time scoring, feedback generation, and performance analytics
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import json
import openai
from sqlalchemy.orm import Session
from app.models.quiz_attempt import QuizAttempt
from app.services.quiz.question_generator import Question, QuestionType, BloomLevel
from app.services.rag.rag_service import RAGService

logger = logging.getLogger(__name__)

class FeedbackType(Enum):
    CORRECT = "correct"
    INCORRECT = "incorrect"
    PARTIAL = "partial"
    EXPLANATION = "explanation"

@dataclass
class QuestionResponse:
    """Student's response to a question"""
    question_id: str
    student_answer: str
    time_taken_seconds: int
    is_flagged: bool = False

@dataclass
class QuestionFeedback:
    """Feedback for a single question"""
    question_id: str
    is_correct: bool
    score: int
    max_score: int
    feedback_type: FeedbackType
    explanation: str
    correct_answer: str
    student_answer: str
    detailed_feedback: str = ""
    learning_resources: List[str] = field(default_factory=list)
    
@dataclass
class QuizResult:
    """Complete quiz results and feedback"""
    quiz_id: str
    user_id: str
    total_score: int
    max_score: int
    percentage: float
    time_taken_seconds: int
    difficulty_level: int
    bloom_level: int
    subject: str
    topic: str
    grade: int
    question_feedbacks: List[QuestionFeedback]
    overall_feedback: str
    weak_areas: List[str]
    strong_areas: List[str]
    recommendations: List[str]
    next_difficulty: int
    completed_at: datetime

@dataclass
class WeakAreaAnalysis:
    """Analysis of student's weak areas"""
    topic: str
    subject: str
    bloom_level: int
    error_count: int
    total_questions: int
    error_rate: float
    common_mistakes: List[str]
    recommended_resources: List[str]

class ScoringService:
    """Handles quiz scoring and feedback generation"""
    
    def __init__(self, rag_service: RAGService, openai_api_key: str, db_session: Session):
        self.rag_service = rag_service
        self.openai_client = openai.AsyncOpenAI(api_key=openai_api_key)
        self.db = db_session
        
        # Scoring weights by question type
        self.scoring_weights = {
            QuestionType.MULTIPLE_CHOICE: 1.0,
            QuestionType.TRUE_FALSE: 0.8,
            QuestionType.SHORT_ANSWER: 1.2
        }
        
        # Bloom level scoring multipliers
        self.bloom_multipliers = {
            BloomLevel.REMEMBER: 1.0,
            BloomLevel.UNDERSTAND: 1.1,
            BloomLevel.APPLY: 1.2,
            BloomLevel.ANALYZE: 1.3,
            BloomLevel.EVALUATE: 1.4,
            BloomLevel.CREATE: 1.5
        }
    
    async def score_quiz(
        self,
        quiz_id: str,
        user_id: str,
        questions: List[Question],
        responses: List[QuestionResponse],
        subject: str,
        topic: str,
        grade: int,
        difficulty_level: int,
        bloom_level: int
    ) -> QuizResult:
        """
        Score a complete quiz and generate comprehensive feedback
        
        Args:
            quiz_id: Unique quiz identifier
            user_id: Student user ID
            questions: List of quiz questions
            responses: List of student responses
            subject: Subject name
            topic: Topic name
            grade: Grade level
            difficulty_level: Quiz difficulty level
            bloom_level: Primary Bloom's taxonomy level
            
        Returns:
            Complete quiz results with feedback
        """
        try:
            logger.info(f"Scoring quiz {quiz_id} for user {user_id}")
            
            start_time = datetime.utcnow()
            
            # Score individual questions
            question_feedbacks = []
            total_score = 0
            max_score = 0
            total_time = 0
            
            for question, response in zip(questions, responses):
                feedback = await self._score_question(question, response)
                question_feedbacks.append(feedback)
                total_score += feedback.score
                max_score += feedback.max_score
                total_time += response.time_taken_seconds
            
            # Calculate percentage
            percentage = (total_score / max_score * 100) if max_score > 0 else 0
            
            # Analyze weak and strong areas
            weak_areas, strong_areas = self._analyze_performance_areas(
                questions, question_feedbacks
            )
            
            # Generate overall feedback
            overall_feedback = await self._generate_overall_feedback(
                percentage, weak_areas, strong_areas, subject, topic
            )
            
            # Generate recommendations
            recommendations = await self._generate_recommendations(
                user_id, subject, topic, grade, weak_areas, percentage
            )
            
            # Calculate next difficulty (placeholder - would use adaptive engine)
            next_difficulty = self._calculate_next_difficulty_suggestion(
                difficulty_level, percentage
            )
            
            # Create quiz result
            quiz_result = QuizResult(
                quiz_id=quiz_id,
                user_id=user_id,
                total_score=total_score,
                max_score=max_score,
                percentage=percentage,
                time_taken_seconds=total_time,
                difficulty_level=difficulty_level,
                bloom_level=bloom_level,
                subject=subject,
                topic=topic,
                grade=grade,
                question_feedbacks=question_feedbacks,
                overall_feedback=overall_feedback,
                weak_areas=weak_areas,
                strong_areas=strong_areas,
                recommendations=recommendations,
                next_difficulty=next_difficulty,
                completed_at=datetime.utcnow()
            )
            
            # Persist quiz attempt to database
            await self._persist_quiz_attempt(quiz_result)
            
            logger.info(f"Quiz {quiz_id} scored: {percentage:.1f}% ({total_score}/{max_score})")
            return quiz_result
            
        except Exception as e:
            logger.error(f"Failed to score quiz {quiz_id}: {e}")
            raise
    
    async def _score_question(
        self, 
        question: Question, 
        response: QuestionResponse
    ) -> QuestionFeedback:
        """Score a single question and generate feedback"""
        try:
            base_score = 10  # Base score per question
            
            # Apply question type weight
            type_weight = self.scoring_weights.get(question.question_type, 1.0)
            
            # Apply Bloom level multiplier
            bloom_multiplier = self.bloom_multipliers.get(question.bloom_level, 1.0)
            
            # Calculate max possible score
            max_score = int(base_score * type_weight * bloom_multiplier)
            
            # Score based on question type
            if question.question_type == QuestionType.MULTIPLE_CHOICE:
                is_correct, score = self._score_multiple_choice(
                    question, response.student_answer, max_score
                )
            elif question.question_type == QuestionType.TRUE_FALSE:
                is_correct, score = self._score_true_false(
                    question, response.student_answer, max_score
                )
            elif question.question_type == QuestionType.SHORT_ANSWER:
                is_correct, score = await self._score_short_answer(
                    question, response.student_answer, max_score
                )
            else:
                is_correct, score = False, 0
            
            # Determine feedback type
            if is_correct:
                feedback_type = FeedbackType.CORRECT
            elif score > 0:
                feedback_type = FeedbackType.PARTIAL
            else:
                feedback_type = FeedbackType.INCORRECT
            
            # Generate detailed feedback
            detailed_feedback = await self._generate_detailed_feedback(
                question, response.student_answer, is_correct, feedback_type
            )
            
            # Get learning resources
            learning_resources = await self._get_learning_resources(
                question.subject, question.topic, question.grade
            )
            
            return QuestionFeedback(
                question_id=question.id,
                is_correct=is_correct,
                score=score,
                max_score=max_score,
                feedback_type=feedback_type,
                explanation=question.explanation,
                correct_answer=question.correct_answer,
                student_answer=response.student_answer,
                detailed_feedback=detailed_feedback,
                learning_resources=learning_resources[:3]  # Limit to 3 resources
            )
            
        except Exception as e:
            logger.error(f"Failed to score question {question.id}: {e}")
            # Return default feedback on error
            return QuestionFeedback(
                question_id=question.id,
                is_correct=False,
                score=0,
                max_score=10,
                feedback_type=FeedbackType.INCORRECT,
                explanation=question.explanation,
                correct_answer=question.correct_answer,
                student_answer=response.student_answer,
                detailed_feedback="Unable to generate feedback due to system error."
            )
    
    def _score_multiple_choice(
        self, 
        question: Question, 
        student_answer: str, 
        max_score: int
    ) -> Tuple[bool, int]:
        """Score multiple choice question"""
        correct_answer = question.correct_answer.strip().upper()
        student_answer = student_answer.strip().upper()
        
        # Handle different answer formats (A, A), Option A, etc.)
        if len(student_answer) > 1:
            # Extract letter from longer answers
            for char in student_answer:
                if char in ['A', 'B', 'C', 'D']:
                    student_answer = char
                    break
        
        is_correct = student_answer == correct_answer
        score = max_score if is_correct else 0
        
        return is_correct, score
    
    def _score_true_false(
        self, 
        question: Question, 
        student_answer: str, 
        max_score: int
    ) -> Tuple[bool, int]:
        """Score true/false question"""
        correct_answer = question.correct_answer.strip().lower()
        student_answer = student_answer.strip().lower()
        
        # Normalize answers
        true_variants = ['true', 'yes', 'correct', 'right', 'সত্য', 'হ্যাঁ']
        false_variants = ['false', 'no', 'incorrect', 'wrong', 'মিথ্যা', 'না']
        
        # Convert to standard format
        if any(variant in student_answer for variant in true_variants):
            student_answer = 'true'
        elif any(variant in student_answer for variant in false_variants):
            student_answer = 'false'
        
        if any(variant in correct_answer for variant in true_variants):
            correct_answer = 'true'
        elif any(variant in correct_answer for variant in false_variants):
            correct_answer = 'false'
        
        is_correct = student_answer == correct_answer
        score = max_score if is_correct else 0
        
        return is_correct, score
    
    async def _score_short_answer(
        self, 
        question: Question, 
        student_answer: str, 
        max_score: int
    ) -> Tuple[bool, int]:
        """Score short answer question using AI"""
        try:
            # Use AI to evaluate short answer
            prompt = f"""
Evaluate this short answer question response:

Question: {question.question_text}
Correct Answer: {question.correct_answer}
Student Answer: {student_answer}

Evaluate the student's answer and provide:
1. Score out of 100 (0-100)
2. Brief explanation of scoring

Consider:
- Factual accuracy
- Completeness of answer
- Understanding demonstrated
- Language (Bangla/English) appropriateness

Format your response as:
Score: [0-100]
Explanation: [brief explanation]
"""
            
            response = await self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert teacher evaluating student responses. Be fair but thorough in your assessment."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,
                max_tokens=200
            )
            
            ai_response = response.choices[0].message.content
            
            # Parse AI response
            score_percentage = 0
            for line in ai_response.split('\n'):
                if line.startswith('Score:'):
                    try:
                        score_percentage = int(line.split(':')[1].strip())
                        break
                    except (ValueError, IndexError):
                        continue
            
            # Convert percentage to actual score
            score = int((score_percentage / 100) * max_score)
            is_correct = score_percentage >= 70  # 70% threshold for "correct"
            
            return is_correct, score
            
        except Exception as e:
            logger.error(f"Failed to score short answer with AI: {e}")
            # Fallback to simple keyword matching
            return self._score_short_answer_fallback(question, student_answer, max_score)
    
    def _score_short_answer_fallback(
        self, 
        question: Question, 
        student_answer: str, 
        max_score: int
    ) -> Tuple[bool, int]:
        """Fallback scoring for short answers using keyword matching"""
        correct_answer = question.correct_answer.lower()
        student_answer = student_answer.lower()
        
        # Simple keyword matching
        correct_keywords = correct_answer.split()
        student_keywords = student_answer.split()
        
        matches = sum(1 for keyword in correct_keywords if keyword in student_keywords)
        match_percentage = matches / len(correct_keywords) if correct_keywords else 0
        
        score = int(match_percentage * max_score)
        is_correct = match_percentage >= 0.6  # 60% keyword match threshold
        
        return is_correct, score
    
    async def _generate_detailed_feedback(
        self,
        question: Question,
        student_answer: str,
        is_correct: bool,
        feedback_type: FeedbackType
    ) -> str:
        """Generate detailed feedback for a question"""
        try:
            if is_correct:
                return f"Excellent! Your answer is correct. {question.explanation}"
            
            # Generate personalized feedback for incorrect answers
            prompt = f"""
Generate helpful feedback for this incorrect answer:

Question: {question.question_text}
Correct Answer: {question.correct_answer}
Student Answer: {student_answer}
Explanation: {question.explanation}

Provide encouraging, constructive feedback that:
1. Explains why the answer is incorrect
2. Guides toward the correct understanding
3. Encourages continued learning
4. Is appropriate for a Grade {question.grade} student

Keep feedback concise (2-3 sentences) and supportive.
"""
            
            response = await self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a supportive teacher providing constructive feedback to help students learn."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=150
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Failed to generate detailed feedback: {e}")
            return f"The correct answer is: {question.correct_answer}. {question.explanation}"
    
    def _analyze_performance_areas(
        self,
        questions: List[Question],
        feedbacks: List[QuestionFeedback]
    ) -> Tuple[List[str], List[str]]:
        """Analyze weak and strong performance areas"""
        topic_performance = {}
        bloom_performance = {}
        
        # Analyze by topic and Bloom level
        for question, feedback in zip(questions, feedbacks):
            topic = question.topic
            bloom_level = question.bloom_level.name
            
            # Track topic performance
            if topic not in topic_performance:
                topic_performance[topic] = {"correct": 0, "total": 0}
            topic_performance[topic]["total"] += 1
            if feedback.is_correct:
                topic_performance[topic]["correct"] += 1
            
            # Track Bloom level performance
            if bloom_level not in bloom_performance:
                bloom_performance[bloom_level] = {"correct": 0, "total": 0}
            bloom_performance[bloom_level]["total"] += 1
            if feedback.is_correct:
                bloom_performance[bloom_level]["correct"] += 1
        
        # Identify weak areas (< 60% success rate)
        weak_areas = []
        for topic, stats in topic_performance.items():
            success_rate = stats["correct"] / stats["total"]
            if success_rate < 0.6:
                weak_areas.append(f"{topic} ({success_rate:.1%})")
        
        for bloom_level, stats in bloom_performance.items():
            success_rate = stats["correct"] / stats["total"]
            if success_rate < 0.6:
                weak_areas.append(f"{bloom_level} level questions ({success_rate:.1%})")
        
        # Identify strong areas (> 80% success rate)
        strong_areas = []
        for topic, stats in topic_performance.items():
            success_rate = stats["correct"] / stats["total"]
            if success_rate > 0.8:
                strong_areas.append(f"{topic} ({success_rate:.1%})")
        
        return weak_areas, strong_areas
    
    async def _generate_overall_feedback(
        self,
        percentage: float,
        weak_areas: List[str],
        strong_areas: List[str],
        subject: str,
        topic: str
    ) -> str:
        """Generate overall quiz feedback"""
        try:
            # Performance level assessment
            if percentage >= 90:
                performance_level = "excellent"
            elif percentage >= 80:
                performance_level = "very good"
            elif percentage >= 70:
                performance_level = "good"
            elif percentage >= 60:
                performance_level = "satisfactory"
            else:
                performance_level = "needs improvement"
            
            feedback_parts = []
            
            # Overall performance
            feedback_parts.append(f"Your performance on this {subject} - {topic} quiz was {performance_level} ({percentage:.1f}%).")
            
            # Strong areas
            if strong_areas:
                feedback_parts.append(f"You showed strong understanding in: {', '.join(strong_areas[:2])}.")
            
            # Areas for improvement
            if weak_areas:
                feedback_parts.append(f"Focus on improving: {', '.join(weak_areas[:2])}.")
            
            # Encouragement
            if percentage >= 80:
                feedback_parts.append("Keep up the excellent work!")
            elif percentage >= 60:
                feedback_parts.append("You're making good progress. Keep practicing!")
            else:
                feedback_parts.append("Don't worry - learning takes time. Review the concepts and try again!")
            
            return " ".join(feedback_parts)
            
        except Exception as e:
            logger.error(f"Failed to generate overall feedback: {e}")
            return f"You scored {percentage:.1f}% on this quiz. Keep practicing to improve!"
    
    async def _generate_recommendations(
        self,
        user_id: str,
        subject: str,
        topic: str,
        grade: int,
        weak_areas: List[str],
        percentage: float
    ) -> List[str]:
        """Generate personalized learning recommendations"""
        recommendations = []
        
        try:
            # Performance-based recommendations
            if percentage < 60:
                recommendations.append("Review fundamental concepts before attempting more quizzes")
                recommendations.append("Consider studying with additional resources or seeking help")
            elif percentage < 80:
                recommendations.append("Practice more questions on weak areas")
                recommendations.append("Review explanations for incorrect answers")
            else:
                recommendations.append("Try more challenging questions to advance your skills")
                recommendations.append("Explore related advanced topics")
            
            # Weak area specific recommendations
            if weak_areas:
                for weak_area in weak_areas[:2]:  # Top 2 weak areas
                    recommendations.append(f"Focus extra study time on {weak_area}")
            
            # Subject-specific recommendations
            if subject.lower() in ['mathematics', 'math', 'গণিত']:
                recommendations.append("Practice solving similar problems step by step")
            elif subject.lower() in ['science', 'physics', 'chemistry', 'biology']:
                recommendations.append("Connect concepts to real-world examples")
            elif subject.lower() in ['english', 'bangla', 'বাংলা']:
                recommendations.append("Read more texts to improve comprehension")
            
            return recommendations[:5]  # Limit to 5 recommendations
            
        except Exception as e:
            logger.error(f"Failed to generate recommendations: {e}")
            return ["Keep practicing to improve your understanding!"]
    
    async def _get_learning_resources(
        self, 
        subject: str, 
        topic: str, 
        grade: int
    ) -> List[str]:
        """Get relevant learning resources for the topic"""
        try:
            # Search for related content in RAG system
            search_query = f"{topic} {subject} grade {grade} examples practice"
            
            chunks = await self.rag_service.search_documents(
                query=search_query,
                subject=subject,
                grade=grade,
                top_k=3
            )
            
            resources = []
            for chunk in chunks:
                if 'source' in chunk:
                    resources.append(chunk['source'])
                elif 'title' in chunk:
                    resources.append(chunk['title'])
            
            return resources
            
        except Exception as e:
            logger.error(f"Failed to get learning resources: {e}")
            return []
    
    def _calculate_next_difficulty_suggestion(
        self, 
        current_difficulty: int, 
        percentage: float
    ) -> int:
        """Suggest next difficulty level based on performance"""
        if percentage >= 80:
            return min(10, current_difficulty + 1)
        elif percentage < 50:
            return max(1, current_difficulty - 1)
        else:
            return current_difficulty
    
    async def _persist_quiz_attempt(self, quiz_result: QuizResult):
        """Persist quiz attempt to database"""
        try:
            # Convert question feedbacks to JSON
            answers_json = {
                feedback.question_id: {
                    "student_answer": feedback.student_answer,
                    "is_correct": feedback.is_correct,
                    "score": feedback.score,
                    "max_score": feedback.max_score
                }
                for feedback in quiz_result.question_feedbacks
            }
            
            # Create quiz attempt record
            quiz_attempt = QuizAttempt(
                user_id=quiz_result.user_id,
                quiz_id=quiz_result.quiz_id,
                score=quiz_result.total_score,
                max_score=quiz_result.max_score,
                time_taken_seconds=quiz_result.time_taken_seconds,
                difficulty_level=quiz_result.difficulty_level,
                bloom_level=quiz_result.bloom_level,
                completed_at=quiz_result.completed_at,
                answers=answers_json,
                subject=quiz_result.subject,
                topic=quiz_result.topic,
                grade=quiz_result.grade
            )
            
            self.db.add(quiz_attempt)
            self.db.commit()
            
            logger.info(f"Persisted quiz attempt {quiz_result.quiz_id} for user {quiz_result.user_id}")
            
        except Exception as e:
            logger.error(f"Failed to persist quiz attempt: {e}")
            self.db.rollback()
            raise

    def get_quiz_analytics(
        self, 
        user_id: str, 
        subject: Optional[str] = None,
        days_back: int = 30
    ) -> Dict[str, Any]:
        """Get comprehensive quiz analytics for a student"""
        try:
            from datetime import timedelta
            
            cutoff_date = datetime.utcnow() - timedelta(days=days_back)
            
            query = self.db.query(QuizAttempt).filter(
                QuizAttempt.user_id == user_id,
                QuizAttempt.completed_at >= cutoff_date
            )
            
            if subject:
                query = query.filter(QuizAttempt.subject == subject)
            
            attempts = query.order_by(QuizAttempt.completed_at.desc()).all()
            
            if not attempts:
                return {
                    "total_attempts": 0,
                    "average_score": 0.0,
                    "improvement_trend": "no_data",
                    "weak_topics": [],
                    "strong_topics": []
                }
            
            # Calculate metrics
            total_score = sum(attempt.score for attempt in attempts)
            total_possible = sum(attempt.max_score for attempt in attempts)
            average_score = (total_score / total_possible * 100) if total_possible > 0 else 0
            
            # Analyze by topic
            topic_stats = {}
            for attempt in attempts:
                topic_key = f"{attempt.subject}_{attempt.topic}"
                if topic_key not in topic_stats:
                    topic_stats[topic_key] = {
                        "scores": [],
                        "subject": attempt.subject,
                        "topic": attempt.topic
                    }
                
                score_pct = (attempt.score / attempt.max_score * 100) if attempt.max_score > 0 else 0
                topic_stats[topic_key]["scores"].append(score_pct)
            
            # Identify weak and strong topics
            weak_topics = []
            strong_topics = []
            
            for topic_key, stats in topic_stats.items():
                avg_score = sum(stats["scores"]) / len(stats["scores"])
                topic_info = {
                    "topic": stats["topic"],
                    "subject": stats["subject"],
                    "average_score": avg_score,
                    "attempts": len(stats["scores"])
                }
                
                if avg_score < 60:
                    weak_topics.append(topic_info)
                elif avg_score > 80:
                    strong_topics.append(topic_info)
            
            # Calculate improvement trend
            if len(attempts) >= 3:
                recent_scores = [
                    (attempt.score / attempt.max_score * 100) if attempt.max_score > 0 else 0
                    for attempt in sorted(attempts, key=lambda x: x.completed_at)[-5:]
                ]
                
                if len(recent_scores) >= 3:
                    early_avg = sum(recent_scores[:2]) / 2
                    late_avg = sum(recent_scores[-2:]) / 2
                    
                    if late_avg > early_avg + 5:
                        trend = "improving"
                    elif late_avg < early_avg - 5:
                        trend = "declining"
                    else:
                        trend = "stable"
                else:
                    trend = "insufficient_data"
            else:
                trend = "insufficient_data"
            
            return {
                "total_attempts": len(attempts),
                "average_score": average_score,
                "improvement_trend": trend,
                "weak_topics": sorted(weak_topics, key=lambda x: x["average_score"]),
                "strong_topics": sorted(strong_topics, key=lambda x: x["average_score"], reverse=True),
                "recent_attempts": len([a for a in attempts if a.completed_at >= datetime.utcnow() - timedelta(days=7)])
            }
            
        except Exception as e:
            logger.error(f"Failed to get quiz analytics: {e}")
            raise