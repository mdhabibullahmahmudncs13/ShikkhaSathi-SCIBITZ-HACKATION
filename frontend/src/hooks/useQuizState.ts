import { useState, useEffect, useCallback } from 'react';
import { Quiz, QuizState } from '../types/quiz';

interface UseQuizStateOptions {
  quiz: Quiz;
  autoSaveInterval?: number; // in milliseconds
  timeLimit?: number; // in seconds
}

interface UseQuizStateReturn {
  quizState: QuizState;
  updateAnswer: (questionIndex: number, answer: string) => void;
  toggleFlag: (questionIndex: number) => void;
  setCurrentQuestion: (index: number) => void;
  submitQuiz: () => void;
  exitQuiz: () => void;
  lastSaved: Date | null;
  isSaving: boolean;
}

export const useQuizState = ({
  quiz,
  autoSaveInterval = 30000, // 30 seconds
  timeLimit = 30 * 60, // 30 minutes
}: UseQuizStateOptions): UseQuizStateReturn => {
  const [quizState, setQuizState] = useState<QuizState>(() => {
    // Try to load saved state
    const savedState = localStorage.getItem(`quiz_${quiz.quiz_id}`);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        return {
          ...parsed,
          startTime: new Date(parsed.startTime),
          questionStartTime: new Date(parsed.questionStartTime),
          flaggedQuestions: new Set(parsed.flaggedQuestions || []),
        };
      } catch (error) {
        console.error('Failed to load saved quiz state:', error);
      }
    }

    // Initialize new state
    return {
      currentQuestionIndex: 0,
      responses: quiz.questions.map(q => ({
        question_id: q.id,
        student_answer: '',
        time_taken_seconds: 0,
        is_flagged: false,
      })),
      flaggedQuestions: new Set<string>(),
      startTime: new Date(),
      questionStartTime: new Date(),
      isSubmitted: false,
      timeRemaining: timeLimit,
    };
  });

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-save function
  const saveState = useCallback(async () => {
    if (quizState.isSubmitted) return;

    setIsSaving(true);
    try {
      const stateToSave = {
        ...quizState,
        flaggedQuestions: Array.from(quizState.flaggedQuestions),
      };
      localStorage.setItem(`quiz_${quiz.quiz_id}`, JSON.stringify(stateToSave));
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save quiz state:', error);
    } finally {
      setIsSaving(false);
    }
  }, [quiz.quiz_id, quizState]);

  // Auto-save effect
  useEffect(() => {
    if (quizState.isSubmitted) return;

    const autoSaveTimer = setInterval(saveState, autoSaveInterval);
    return () => clearInterval(autoSaveTimer);
  }, [saveState, autoSaveInterval, quizState.isSubmitted]);

  // Timer effect
  useEffect(() => {
    if (quizState.isSubmitted || quizState.timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setQuizState(prev => {
        const newTimeRemaining = prev.timeRemaining - 1;
        if (newTimeRemaining <= 0) {
          return { ...prev, timeRemaining: 0, isSubmitted: true };
        }
        return { ...prev, timeRemaining: newTimeRemaining };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizState.isSubmitted, quizState.timeRemaining]);

  // Save state when component unmounts
  useEffect(() => {
    return () => {
      if (!quizState.isSubmitted) {
        const stateToSave = {
          ...quizState,
          flaggedQuestions: Array.from(quizState.flaggedQuestions),
        };
        localStorage.setItem(`quiz_${quiz.quiz_id}`, JSON.stringify(stateToSave));
      }
    };
  }, [quiz.quiz_id, quizState]);

  const updateAnswer = useCallback((questionIndex: number, answer: string) => {
    const now = new Date();
    
    setQuizState(prev => {
      const timeTaken = Math.floor((now.getTime() - prev.questionStartTime.getTime()) / 1000);
      const newResponses = [...prev.responses];
      
      newResponses[questionIndex] = {
        ...newResponses[questionIndex],
        student_answer: answer,
        time_taken_seconds: timeTaken,
      };

      return {
        ...prev,
        responses: newResponses,
      };
    });
  }, []);

  const toggleFlag = useCallback((questionIndex: number) => {
    const questionId = quiz.questions[questionIndex].id;
    
    setQuizState(prev => {
      const newFlaggedQuestions = new Set(prev.flaggedQuestions);
      const newResponses = [...prev.responses];
      
      if (newFlaggedQuestions.has(questionId)) {
        newFlaggedQuestions.delete(questionId);
        newResponses[questionIndex].is_flagged = false;
      } else {
        newFlaggedQuestions.add(questionId);
        newResponses[questionIndex].is_flagged = true;
      }

      return {
        ...prev,
        flaggedQuestions: newFlaggedQuestions,
        responses: newResponses,
      };
    });
  }, [quiz.questions]);

  const setCurrentQuestion = useCallback((index: number) => {
    setQuizState(prev => ({
      ...prev,
      currentQuestionIndex: index,
      questionStartTime: new Date(),
    }));
  }, []);

  const submitQuiz = useCallback(() => {
    if (quizState.isSubmitted) return;

    // Calculate final time taken for current question
    const now = new Date();
    const timeTaken = Math.floor((now.getTime() - quizState.questionStartTime.getTime()) / 1000);
    
    setQuizState(prev => {
      const finalResponses = [...prev.responses];
      finalResponses[prev.currentQuestionIndex] = {
        ...finalResponses[prev.currentQuestionIndex],
        time_taken_seconds: finalResponses[prev.currentQuestionIndex].time_taken_seconds + timeTaken,
      };

      return {
        ...prev,
        responses: finalResponses,
        isSubmitted: true,
      };
    });

    // Clear saved state
    localStorage.removeItem(`quiz_${quiz.quiz_id}`);
  }, [quiz.quiz_id, quizState]);

  const exitQuiz = useCallback(() => {
    // Save current state before exiting
    saveState();
  }, [saveState]);

  return {
    quizState,
    updateAnswer,
    toggleFlag,
    setCurrentQuestion,
    submitQuiz,
    exitQuiz,
    lastSaved,
    isSaving,
  };
};