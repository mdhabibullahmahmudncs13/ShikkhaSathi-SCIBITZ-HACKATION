import React from 'react';
import { Trophy, Star, Clock, Target, CheckCircle, XCircle, RotateCcw, Home } from 'lucide-react';
import { QuizResult } from '../../types/quiz';

interface QuizResultsProps {
  result: QuizResult;
  onRetake: () => void;
  onBackToDashboard: () => void;
}

const QuizResults: React.FC<QuizResultsProps> = ({
  result,
  onRetake,
  onBackToDashboard,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getPerformanceMessage = (percentage: number) => {
    if (percentage >= 90) return { text: 'Outstanding!', color: 'text-green-600' };
    if (percentage >= 75) return { text: 'Great Job!', color: 'text-blue-600' };
    if (percentage >= 60) return { text: 'Good Effort!', color: 'text-yellow-600' };
    return { text: 'Keep Practicing!', color: 'text-orange-600' };
  };

  const performance = getPerformanceMessage(result.percentage);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Score Card */}
      <div className="bg-white rounded-lg border p-8 mb-6 text-center">
        <div className="mb-4">
          <Trophy className="w-16 h-16 mx-auto text-yellow-500" />
        </div>
        
        <h1 className={`text-3xl font-bold mb-2 ${performance.color}`}>
          {performance.text}
        </h1>
        
        <div className="text-6xl font-bold text-gray-900 mb-4">
          {result.percentage.toFixed(0)}%
        </div>
        
        <p className="text-gray-600 text-lg mb-6">
          You scored {result.score} out of {result.max_score}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
          <div className="p-4 bg-blue-50 rounded-lg">
            <Star className="w-6 h-6 mx-auto text-blue-600 mb-2" />
            <div className="text-2xl font-bold text-blue-600">+{result.xp_earned}</div>
            <div className="text-sm text-gray-600">XP Earned</div>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg">
            <CheckCircle className="w-6 h-6 mx-auto text-green-600 mb-2" />
            <div className="text-2xl font-bold text-green-600">{result.score}</div>
            <div className="text-sm text-gray-600">Correct</div>
          </div>
          
          <div className="p-4 bg-orange-50 rounded-lg">
            <Clock className="w-6 h-6 mx-auto text-orange-600 mb-2" />
            <div className="text-2xl font-bold text-orange-600">
              {formatTime(result.time_taken_seconds)}
            </div>
            <div className="text-sm text-gray-600">Time Taken</div>
          </div>
        </div>
      </div>

      {/* Question Review */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5" />
          Question Review
        </h2>

        <div className="space-y-4">
          {result.results?.map((qResult, index) => (
            <div
              key={qResult.question_id}
              className={`p-4 rounded-lg border-2 ${
                qResult.is_correct
                  ? 'border-green-200 bg-green-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                {qResult.is_correct ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-1" />
                )}
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-2">
                    {index + 1}. {qResult.question_text}
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Your answer:</span>
                      <span className={qResult.is_correct ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {qResult.student_answer || 'Not answered'}
                      </span>
                    </div>
                    
                    {!qResult.is_correct && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Correct answer:</span>
                        <span className="text-green-600 font-medium">
                          {qResult.correct_answer}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {qResult.explanation && (
                    <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">Explanation:</div>
                      <div className="text-sm text-gray-700">{qResult.explanation}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )) || []}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={onRetake}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50"
        >
          <RotateCcw className="w-5 h-5" />
          Retake Quiz
        </button>
        
        <button
          onClick={onBackToDashboard}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          <Home className="w-5 h-5" />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default QuizResults;
