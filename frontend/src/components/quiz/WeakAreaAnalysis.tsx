import React from 'react';
import { QuizResult } from '../../types/quiz';

interface WeakAreaAnalysisProps {
  result: QuizResult;
  onStudyRecommendation?: (area: string) => void;
}

const WeakAreaAnalysis: React.FC<WeakAreaAnalysisProps> = ({
  result,
  onStudyRecommendation,
}) => {
  // Analyze question types and bloom levels for weak areas
  const analyzeWeakAreas = () => {
    const incorrectFeedbacks = result.question_feedbacks.filter(f => !f.is_correct);
    
    if (incorrectFeedbacks.length === 0) {
      return {
        questionTypes: {},
        bloomLevels: {},
        topics: {},
      };
    }

    // This would typically come from the question data, but we'll simulate it
    const questionTypes: { [key: string]: number } = {};
    const bloomLevels: { [key: string]: number } = {};
    const topics: { [key: string]: number } = {};

    // Simulate analysis based on available data
    incorrectFeedbacks.forEach((feedback, index) => {
      // Simulate question type based on answer format
      let questionType = 'multiple_choice';
      if (feedback.student_answer.toLowerCase().includes('true') || 
          feedback.student_answer.toLowerCase().includes('false')) {
        questionType = 'true_false';
      } else if (feedback.student_answer.length > 50) {
        questionType = 'short_answer';
      }
      
      questionTypes[questionType] = (questionTypes[questionType] || 0) + 1;
      
      // Simulate bloom level (would come from question data)
      const bloomLevel = `Level ${(index % 6) + 1}`;
      bloomLevels[bloomLevel] = (bloomLevels[bloomLevel] || 0) + 1;
      
      // Use topic from result
      topics[result.topic] = (topics[result.topic] || 0) + 1;
    });

    return { questionTypes, bloomLevels, topics };
  };

  const { questionTypes, bloomLevels, topics } = analyzeWeakAreas();
  const totalIncorrect = result.question_feedbacks.filter(f => !f.is_correct).length;

  if (totalIncorrect === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Perfect Score!</h3>
          <p className="text-gray-600">
            You answered all questions correctly. Great job! 🎉
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weak Areas Overview */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Areas Needing Attention
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Question Types */}
          {Object.keys(questionTypes).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Question Types</h4>
              <div className="space-y-2">
                {Object.entries(questionTypes).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 capitalize">
                      {type.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{ width: `${(count / totalIncorrect) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-8">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bloom Levels */}
          {Object.keys(bloomLevels).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Cognitive Levels</h4>
              <div className="space-y-2">
                {Object.entries(bloomLevels).map(([level, count]) => (
                  <div key={level} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{level}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full"
                          style={{ width: `${(count / totalIncorrect) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-8">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Topics */}
          {Object.keys(topics).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Topics</h4>
              <div className="space-y-2">
                {Object.entries(topics).map(([topic, count]) => (
                  <div key={topic} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{topic}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-500 h-2 rounded-full"
                          style={{ width: `${(count / totalIncorrect) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-8">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Specific Recommendations */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-blue-700 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Study Recommendations
        </h3>
        
        <div className="space-y-4">
          {result.recommendations.map((recommendation, index) => (
            <div key={index} className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-xs font-bold text-blue-600">{index + 1}</span>
              </div>
              <div className="flex-1">
                <p className="text-gray-700">{recommendation}</p>
                {onStudyRecommendation && (
                  <button
                    onClick={() => onStudyRecommendation(recommendation)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Start studying →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Items */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Next Steps</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Review Incorrect Answers</h4>
            <p className="text-sm text-gray-600 mb-3">
              Go through each incorrect answer to understand your mistakes.
            </p>
            <div className="text-sm text-gray-500">
              {totalIncorrect} questions to review
            </div>
          </div>
          
          <div className="p-4 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Practice Similar Questions</h4>
            <p className="text-sm text-gray-600 mb-3">
              Take more quizzes on the same topic to reinforce learning.
            </p>
            <div className="text-sm text-gray-500">
              Recommended difficulty: {result.next_difficulty}/10
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeakAreaAnalysis;