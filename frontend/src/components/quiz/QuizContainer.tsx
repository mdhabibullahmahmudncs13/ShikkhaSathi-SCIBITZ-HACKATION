import React, { useCallback } from 'react';
import { Quiz, QuestionResponse } from '../../types/quiz';
import { useQuizState } from '../../hooks/useQuizState';
import QuestionCard from './QuestionCard';
import QuizNavigation from './QuizNavigation';
import QuizTimer from './QuizTimer';
import AutoSaveIndicator from './AutoSaveIndicator';

interface QuizContainerProps {
  quiz: Quiz;
  onSubmit: (responses: QuestionResponse[]) => void;
  onExit: () => void;
}

const QuizContainer: React.FC<QuizContainerProps> = ({
  quiz,
  onSubmit,
  onExit,
}) => {
  const {
    quizState,
    updateAnswer,
    toggleFlag,
    setCurrentQuestion,
    submitQuiz,
    exitQuiz,
    lastSaved,
    isSaving,
  } = useQuizState({
    quiz,
    autoSaveInterval: 30000, // 30 seconds
    timeLimit: 30 * 60, // 30 minutes
  });

  const currentQuestion = quiz.questions[quizState.currentQuestionIndex];
  const currentResponse = quizState.responses[quizState.currentQuestionIndex];

  const handleAnswerSelect = useCallback((answer: string) => {
    updateAnswer(quizState.currentQuestionIndex, answer);
  }, [updateAnswer, quizState.currentQuestionIndex]);

  const handleFlagToggle = useCallback(() => {
    toggleFlag(quizState.currentQuestionIndex);
  }, [toggleFlag, quizState.currentQuestionIndex]);

  const handleQuestionSelect = useCallback((index: number) => {
    setCurrentQuestion(index);
  }, [setCurrentQuestion]);

  const handlePrevious = useCallback(() => {
    if (quizState.currentQuestionIndex > 0) {
      setCurrentQuestion(quizState.currentQuestionIndex - 1);
    }
  }, [quizState.currentQuestionIndex, setCurrentQuestion]);

  const handleNext = useCallback(() => {
    if (quizState.currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestion(quizState.currentQuestionIndex + 1);
    }
  }, [quizState.currentQuestionIndex, quiz.questions.length, setCurrentQuestion]);

  const handleSubmit = useCallback(() => {
    submitQuiz();
    onSubmit(quizState.responses);
  }, [submitQuiz, onSubmit, quizState.responses]);

  const handleExit = useCallback(() => {
    if (window.confirm('Are you sure you want to exit? Your progress will be saved.')) {
      exitQuiz();
      onExit();
    }
  }, [exitQuiz, onExit]);

  const handleTimeUp = useCallback(() => {
    alert('Time is up! Your quiz will be submitted automatically.');
    handleSubmit();
  }, [handleSubmit]);

  const handleTimeWarning = useCallback((minutesLeft: number) => {
    if (minutesLeft === 5) {
      alert('⚠️ 5 minutes remaining! Please review your answers.');
    } else if (minutesLeft === 1) {
      alert('⚠️ 1 minute remaining! The quiz will be submitted automatically when time runs out.');
    }
  }, []);

  // Calculate answered questions
  const answeredQuestions = new Set(
    quizState.responses
      .map((response, index) => response.student_answer.trim() ? index : -1)
      .filter(index => index !== -1)
  );

  const flaggedQuestionIndices = new Set(
    Array.from(quizState.flaggedQuestions).map(questionId =>
      quiz.questions.findIndex(q => q.id === questionId)
    ).filter(index => index !== -1)
  );

  const canSubmit = answeredQuestions.size > 0; // Allow submission with at least one answer



  if (quizState.isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Quiz Submitted!</h2>
          <p className="text-gray-600 mb-4">
            Your answers have been submitted successfully. Please wait while we process your results.
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold text-gray-900">
                {quiz.metadata.subject} - {quiz.metadata.topic}
              </h1>
              <span className="ml-3 px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-700">
                Grade {quiz.metadata.grade}
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Timer */}
              <QuizTimer
                timeRemaining={quizState.timeRemaining}
                totalTime={30 * 60} // 30 minutes
                onTimeUp={handleTimeUp}
                onWarning={handleTimeWarning}
              />
              
              {/* Auto-save Indicator */}
              <AutoSaveIndicator
                lastSaved={lastSaved}
                isSaving={isSaving}
              />
              
              {/* Exit Button */}
              <button
                onClick={handleExit}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Exit Quiz
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Card */}
          <div className="lg:col-span-3">
            <QuestionCard
              question={currentQuestion}
              questionNumber={quizState.currentQuestionIndex + 1}
              totalQuestions={quiz.questions.length}
              selectedAnswer={currentResponse.student_answer}
              isFlagged={quizState.flaggedQuestions.has(currentQuestion.id)}
              onAnswerSelect={handleAnswerSelect}
              onFlagToggle={handleFlagToggle}
            />
          </div>

          {/* Navigation Panel */}
          <div className="lg:col-span-1">
            <QuizNavigation
              currentQuestionIndex={quizState.currentQuestionIndex}
              totalQuestions={quiz.questions.length}
              answeredQuestions={answeredQuestions}
              flaggedQuestions={flaggedQuestionIndices}
              onQuestionSelect={handleQuestionSelect}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onSubmit={handleSubmit}
              canSubmit={canSubmit}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizContainer;