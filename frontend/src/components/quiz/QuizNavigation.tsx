import React from 'react';

interface QuizNavigationProps {
  currentQuestionIndex: number;
  totalQuestions: number;
  answeredQuestions: Set<number>;
  flaggedQuestions: Set<number>;
  onQuestionSelect: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
}

const QuizNavigation: React.FC<QuizNavigationProps> = ({
  currentQuestionIndex,
  totalQuestions,
  answeredQuestions,
  flaggedQuestions,
  onQuestionSelect,
  onPrevious,
  onNext,
  onSubmit,
  canSubmit,
}) => {
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
      {/* Question Grid */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Questions</h4>
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
          {Array.from({ length: totalQuestions }, (_, index) => {
            const isAnswered = answeredQuestions.has(index);
            const isFlagged = flaggedQuestions.has(index);
            const isCurrent = index === currentQuestionIndex;

            return (
              <button
                key={index}
                onClick={() => onQuestionSelect(index)}
                className={`relative w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                  isCurrent
                    ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                    : isAnswered
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={`Question ${index + 1}${isAnswered ? ' (Answered)' : ''}${isFlagged ? ' (Flagged)' : ''}`}
              >
                {index + 1}
                {isFlagged && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-white">
                    <svg className="w-2 h-2 text-yellow-700 absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress Summary */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-100 rounded border border-green-300"></div>
              <span className="text-gray-600">Answered: {answeredQuestions.size}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-100 rounded border border-yellow-300"></div>
              <span className="text-gray-600">Flagged: {flaggedQuestions.size}</span>
            </div>
          </div>
          <div className="text-gray-600">
            {answeredQuestions.size}/{totalQuestions} completed
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(answeredQuestions.size / totalQuestions) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={onPrevious}
          disabled={isFirstQuestion}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            isFirstQuestion
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>

        <div className="flex items-center gap-2">
          {!isLastQuestion ? (
            <button
              onClick={onNext}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              onClick={onSubmit}
              disabled={!canSubmit}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                canSubmit
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Submit Quiz
            </button>
          )}
        </div>
      </div>

      {/* Submit Warning */}
      {isLastQuestion && answeredQuestions.size < totalQuestions && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-800">
                You have {totalQuestions - answeredQuestions.size} unanswered questions
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                You can still submit, but unanswered questions will be marked as incorrect.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizNavigation;