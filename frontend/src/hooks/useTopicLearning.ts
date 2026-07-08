import { useState, useEffect } from 'react';
import { Topic, QuizSubmissionRequest, QuizSubmissionResponse } from '../types/learning';
import { api } from '../services/apiClient';
import { logger } from '../services/logger';

interface UseTopicLearningReturn {
  topic: Topic | null;
  loading: boolean;
  error: string | null;
  submitQuiz: (submission: QuizSubmissionRequest) => Promise<QuizSubmissionResponse>;
}

export const useTopicLearning = (topicId: string): UseTopicLearningReturn => {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopic = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch real data from API
        const response = await api.get(`/learning/topic/${topicId}`);
        const data = response;

        setTopic(data.topic);
        logger.info('Topic loaded successfully', { topicId });
      } catch (err: any) {
        const errorMessage = err.response?.data?.detail || err.message || 'Failed to load topic';
        setError(errorMessage);
        logger.error('Failed to load topic', err);
        
        // Fallback to mock data only in development
        if (import.meta.env.DEV) {
          logger.warn('Using fallback mock data in development mode');
          setTopic(getMockTopic(topicId));
        }
      } finally {
        setLoading(false);
      }
    };

    if (topicId) {
      fetchTopic();
    }
  }, [topicId]);

  const submitQuiz = async (submission: QuizSubmissionRequest): Promise<QuizSubmissionResponse> => {
    try {
      logger.info('Submitting quiz', { topicId, answers: submission.answers.length });

      // Submit to real API
      const response = await api.post(`/learning/topic/${topicId}/submit-quiz`, submission);
      const result = response;

      logger.info('Quiz submitted successfully', { 
        score: result.score, 
        totalPoints: result.totalPoints, 
        xpEarned: result.xpEarned 
      });

      return result;
    } catch (err: any) {
      logger.error('Failed to submit quiz', err);
      
      // Fallback evaluation for development
      if (import.meta.env.DEV) {
        logger.warn('Using fallback quiz evaluation in development mode');
        return getMockQuizResult(submission, topic);
      }
      
      throw new Error(err.response?.data?.detail || err.message || 'Failed to submit quiz');
    }
  };

  return {
    topic,
    loading,
    error,
    submitQuiz
  };
};

// Fallback mock data for development
const getMockTopic = (topicId: string): Topic => ({
  id: topicId,
  adventureId: 'adventure-1',
  name: 'Real Numbers',
  description: 'Learn about real numbers, their classification and properties',
  content: `
    Real numbers are the foundation of mathematics. They include all rational and irrational numbers.

    Real numbers can be classified into several categories:
    • Natural numbers (1, 2, 3, ...)
    • Whole numbers (0, 1, 2, 3, ...)
    • Integers (..., -2, -1, 0, 1, 2, ...)
    • Rational numbers (fractions like 1/2, 3/4)
    • Irrational numbers (like √2, π)

    Properties of real numbers:
    • Closure property
    • Commutative property
    • Associative property
    • Distributive property

    Understanding real numbers is essential for advanced mathematics and many real-world applications.
  `,
  bloomLevel: 2, // UNDERSTAND
  xpReward: 100,
  isCompleted: false,
  isUnlocked: true,
  questions: [
    {
      id: 'q1',
      topicId: topicId,
      question: 'Which of the following is a rational number?',
      type: 'multiple_choice',
      bloomLevel: 1, // REMEMBER
      options: [
        '√2',
        '1/3',
        'π',
        '√5'
      ],
      correctAnswer: '1/3',
      explanation: 'A rational number can be expressed as a fraction of two integers. 1/3 is a fraction, while √2, π, and √5 are irrational numbers.',
      points: 10
    },
    {
      id: 'q2',
      topicId: topicId,
      question: 'What property is demonstrated by: a + b = b + a?',
      type: 'multiple_choice',
      bloomLevel: 2, // UNDERSTAND
      options: [
        'Associative property',
        'Commutative property',
        'Distributive property',
        'Closure property'
      ],
      correctAnswer: 'Commutative property',
      explanation: 'The commutative property states that the order of addition does not change the result.',
      points: 15
    },
    {
      id: 'q3',
      topicId: topicId,
      question: 'All integers are rational numbers.',
      type: 'true_false',
      bloomLevel: 2, // UNDERSTAND
      correctAnswer: 'true',
      explanation: 'All integers can be expressed as fractions (e.g., 5 = 5/1), so they are rational numbers.',
      points: 10
    }
  ]
});

const getMockQuizResult = (submission: QuizSubmissionRequest, topic: Topic | null): QuizSubmissionResponse => {
  let totalScore = 0;
  let totalPoints = 0;
  const feedback = submission.answers.map(answer => {
    const question = topic?.questions.find(q => q.id === answer.questionId);
    if (!question) {
      return {
        questionId: answer.questionId,
        isCorrect: false,
        userAnswer: answer.answer,
        correctAnswer: '',
        explanation: 'Question not found',
        bloomLevel: 1 as any
      };
    }

    const isCorrect = Array.isArray(answer.answer) 
      ? JSON.stringify(answer.answer.sort()) === JSON.stringify((question.correctAnswer as string[]).sort())
      : answer.answer.toLowerCase() === question.correctAnswer.toString().toLowerCase();

    if (isCorrect) {
      totalScore += question.points;
    }
    totalPoints += question.points;

    return {
      questionId: answer.questionId,
      isCorrect,
      userAnswer: answer.answer,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      bloomLevel: question.bloomLevel
    };
  });

  const scorePercentage = totalPoints > 0 ? (totalScore / totalPoints) * 100 : 0;
  const xpEarned = Math.round((scorePercentage / 100) * (topic?.xpReward || 100));

  return {
    score: totalScore,
    totalPoints,
    xpEarned,
    bloomScores: {
      1: scorePercentage,
      2: scorePercentage * 0.9
    },
    feedback,
    isTopicCompleted: scorePercentage >= 70,
    isAdventureCompleted: false,
    nextTopic: undefined
  };
};