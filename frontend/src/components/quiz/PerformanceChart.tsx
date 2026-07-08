import React from 'react';
import { QuestionFeedback } from '../../types/quiz';

interface PerformanceChartProps {
  feedbacks: QuestionFeedback[];
  title?: string;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({
  feedbacks,
  title = 'Question Performance',
}) => {

  
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      <div className="space-y-3">
        {feedbacks.map((feedback, index) => {
          const percentage = (feedback.score / feedback.max_score) * 100;
          const isCorrect = feedback.is_correct;
          
          return (
            <div key={feedback.question_id} className="flex items-center gap-3">
              <div className="w-8 text-sm font-medium text-gray-600">
                Q{index + 1}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">
                    {feedback.score}/{feedback.max_score} points
                  </span>
                  <span className={`text-sm font-medium ${
                    isCorrect ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {Math.round(percentage)}%
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      isCorrect ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
              
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}>
                {isCorrect ? '✓' : '✗'}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">
              {feedbacks.filter(f => f.is_correct).length}
            </div>
            <div className="text-sm text-gray-600">Correct</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {feedbacks.filter(f => !f.is_correct).length}
            </div>
            <div className="text-sm text-gray-600">Incorrect</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {Math.round((feedbacks.reduce((sum, f) => sum + f.score, 0) / feedbacks.reduce((sum, f) => sum + f.max_score, 0)) * 100)}%
            </div>
            <div className="text-sm text-gray-600">Overall</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceChart;