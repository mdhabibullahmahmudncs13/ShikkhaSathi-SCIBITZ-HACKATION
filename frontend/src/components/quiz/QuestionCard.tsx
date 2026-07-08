import React from 'react';
import { Question } from '../../types/quiz';

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: string;
  isFlagged: boolean;
  onAnswerSelect: (answer: string) => void;
  onFlagToggle: () => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  isFlagged,
  onAnswerSelect,
  onFlagToggle,
}) => {
  const renderQuestionContent = () => {
    switch (question.question_type) {
      case 'multiple_choice':
        return (
          <div className="space-y-3">
            {question.options?.map((option, index) => {
              const optionLetter = String.fromCharCode(65 + index); // A, B, C, D
              const isSelected = selectedAnswer === optionLetter;
              
              return (
                <button
                  key={index}
                  onClick={() => onAnswerSelect(optionLetter)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start">
                    <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold mr-3 ${
                      isSelected
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {optionLetter}
                    </span>
                    <span className="flex-1 text-gray-900">{option}</span>
                  </div>
                </button>
              );
            })}
          </div>
        );

      case 'true_false':
        return (
          <div className="space-y-3">
            {['True', 'False'].map((option) => {
              const isSelected = selectedAnswer === option;
              
              return (
                <button
                  key={option}
                  onClick={() => onAnswerSelect(option)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold mr-3 ${
                      isSelected
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {option === 'True' ? '✓' : '✗'}
                    </span>
                    <span className="flex-1 text-gray-900">{option}</span>
                  </div>
                </button>
              );
            })}
          </div>
        );

      case 'short_answer':
        return (
          <div>
            <textarea
              value={selectedAnswer}
              onChange={(e) => onAnswerSelect(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
              rows={4}
            />
            <p className="mt-2 text-sm text-gray-500">
              Write a clear and concise answer (2-3 sentences)
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      {/* Question Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-500">
              Question {questionNumber} of {totalQuestions}
            </span>
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
              Bloom Level {question.bloom_level}
            </span>
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
              Difficulty {question.difficulty_level}/10
            </span>
          </div>
        </div>
        
        {/* Flag Button */}
        <button
          onClick={onFlagToggle}
          className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
            isFlagged
              ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
          }`}
          title={isFlagged ? 'Unflag question' : 'Flag for review'}
        >
          <svg
            className="w-5 h-5"
            fill={isFlagged ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
            />
          </svg>
        </button>
      </div>

      {/* Question Text */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 leading-relaxed">
          {question.question_text}
        </h3>
      </div>

      {/* Question Type Badge */}
      <div className="mb-4">
        <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
          {question.question_type === 'multiple_choice' && '📝 Multiple Choice'}
          {question.question_type === 'true_false' && '✓✗ True/False'}
          {question.question_type === 'short_answer' && '✍️ Short Answer'}
        </span>
      </div>

      {/* Answer Options */}
      {renderQuestionContent()}
    </div>
  );
};

export default QuestionCard;