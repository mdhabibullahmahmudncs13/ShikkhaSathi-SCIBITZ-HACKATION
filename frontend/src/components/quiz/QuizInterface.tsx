import React, { useState, useEffect } from 'react';
import { Clock, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { quizAPI } from '../../services/apiClient';
import { Quiz, QuizResult } from '../../types/quiz';

interface QuizInterfaceProps {
  quiz: Quiz;
  onComplete: (result: QuizResult) => void;
}

const QuizInterface: React.FC<QuizInterfaceProps> = ({ quiz, onComplete }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(
    (quiz.time_limit_minutes || 20) * 60
  );
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;
  const answeredCount = Object.keys(answers).length;
  const startTime = Date.now();

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (answer: string) => {
    setAnswers({
      ...answers,
      [currentQuestion.id]: answer,
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;

    setSubmitting(true);
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);

    try {
      const result = await quizAPI.submitQuiz({
        quiz_id: quiz.quiz_id,
        answers,
        time_taken_seconds: timeTaken,
      });

      onComplete(result);
    } catch (err) {
      console.error('Failed to submit quiz:', err);
      alert('Failed to submit quiz. Please try again.');
      setSubmitting(false);
    }
  };

  const getOptionLabel = (option: string) => {
    return currentQuestion.options[option as keyof typeof currentQuestion.options] || '';
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{quiz.subject}</h2>
            {quiz.topic && (
              <p className="text-gray-600">{quiz.topic}</p>
            )}
          </div>
          <div className="flex items-center gap-2 text-orange-600 font-medium">
            <Clock className="w-5 h-5" />
            <span className="text-lg">{formatTime(timeRemaining)}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{
                width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%`,
              }}
            />
          </div>
          <span className="text-sm text-gray-600 whitespace-nowrap">
            {currentQuestionIndex + 1} / {quiz.questions.length}
          </span>
        </div>

        {/* Answered Count */}
        <div className="mt-4 text-sm text-gray-600">
          <CheckCircle className="w-4 h-4 inline mr-1" />
          {answeredCount} of {quiz.questions.length} answered
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-lg border p-8 mb-6">
        <div className="mb-6">
          <span className="text-sm text-gray-500">Question {currentQuestionIndex + 1}</span>
          <h3 className="text-xl font-medium text-gray-900 mt-2">
            {currentQuestion.question_text}
          </h3>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {['A', 'B', 'C', 'D'].map((option) => (
            <button
              key={option}
              onClick={() => handleAnswerSelect(option)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                answers[currentQuestion.id] === option
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center font-medium">
                  {option}
                </span>
                <span className="flex-1 pt-1">{getOptionLabel(option)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
          Previous
        </button>

        {isLastQuestion ? (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={answeredCount === 0}
            className="px-8 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Submit Quiz
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Confirm Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Submit Quiz?
            </h3>
            <p className="text-gray-600 mb-6">
              You have answered {answeredCount} out of {quiz.questions.length} questions.
              {answeredCount < quiz.questions.length && (
                <span className="block mt-2 text-orange-600">
                  Unanswered questions will be marked as incorrect.
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizInterface;
