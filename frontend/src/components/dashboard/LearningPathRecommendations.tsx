import React, { useState } from 'react';
import { RecommendedTopic, StudentProgress } from '../../types/dashboard';

interface LearningPathRecommendationsProps {
  studentProgress: StudentProgress;
  className?: string;
}

const LearningPathRecommendations: React.FC<LearningPathRecommendationsProps> = ({
  studentProgress,
  className = ''
}) => {
  const [selectedGoal, setSelectedGoal] = useState<string>('improve_weak_areas');

  // Generate recommendations based on performance and Bloom's taxonomy
  const generateRecommendations = (): RecommendedTopic[] => {
    const recommendations: RecommendedTopic[] = [];
    
    // Analyze weak areas and suggest topics at appropriate Bloom levels
    studentProgress.weakAreas.forEach((weakArea) => {
      // Start with lower Bloom levels for weak areas
      const targetBloomLevel = Math.max(1, weakArea.bloomLevel - 1);
      
      recommendations.push({
        subject: weakArea.subject,
        topic: `${weakArea.topic} - Foundation Review`,
        difficulty: Math.max(1, Math.ceil((100 - weakArea.successRate) / 20)),
        reason: `Low success rate (${Math.round(weakArea.successRate)}%) - Review fundamentals`,
        estimatedTime: 30 + (5 - targetBloomLevel) * 10
      });
    });

    // Suggest progression in strong areas
    studentProgress.subjectProgress.forEach((subject) => {
      if (subject.completionPercentage > 70) {
        // Find highest mastered Bloom level
        const highestBloomLevel = Math.max(...subject.bloomLevelProgress.map(bp => 
          bp.mastery > 80 ? bp.level : 0
        ));
        
        if (highestBloomLevel < 6) {
          const nextBloomLevel = Math.min(6, highestBloomLevel + 1);
          recommendations.push({
            subject: subject.subject,
            topic: `Advanced ${subject.subject} - ${getBloomLevelName(nextBloomLevel)}`,
            difficulty: nextBloomLevel,
            reason: `Ready for higher-order thinking (Bloom Level ${nextBloomLevel})`,
            estimatedTime: 45 + nextBloomLevel * 5
          });
        }
      }
    });

    // Add variety based on learning goals
    if (selectedGoal === 'balanced_growth') {
      // Suggest topics from different subjects
      const subjectCounts = recommendations.reduce((acc, rec) => {
        acc[rec.subject] = (acc[rec.subject] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      const underrepresentedSubjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Bangla', 'English', 'ICT']
        .filter(subject => (subjectCounts[subject] || 0) < 2);

      underrepresentedSubjects.forEach(subject => {
        recommendations.push({
          subject,
          topic: `${subject} Exploration`,
          difficulty: 2,
          reason: 'Balanced learning across subjects',
          estimatedTime: 25
        });
      });
    }

    return recommendations.slice(0, 6); // Limit to top 6 recommendations
  };

  const getBloomLevelName = (level: number): string => {
    const levels = {
      1: 'Remember',
      2: 'Understand',
      3: 'Apply',
      4: 'Analyze',
      5: 'Evaluate',
      6: 'Create'
    };
    return levels[level as keyof typeof levels] || `Level ${level}`;
  };

  const getBloomLevelColor = (level: number): string => {
    const colors = {
      1: 'bg-gray-100 text-gray-700',
      2: 'bg-blue-100 text-blue-700',
      3: 'bg-green-100 text-green-700',
      4: 'bg-yellow-100 text-yellow-700',
      5: 'bg-orange-100 text-orange-700',
      6: 'bg-red-100 text-red-700'
    };
    return colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const getDifficultyIcon = (difficulty: number): string => {
    if (difficulty <= 2) return '🟢';
    if (difficulty <= 4) return '🟡';
    return '🔴';
  };

  const getSubjectIcon = (subject: string): string => {
    const icons = {
      'Mathematics': '📊',
      'Physics': '⚛️',
      'Chemistry': '🧪',
      'Biology': '🧬',
      'Bangla': '📚',
      'English': '🌍',
      'ICT': '💻'
    };
    return icons[subject as keyof typeof icons] || '📖';
  };

  const recommendations = generateRecommendations();
  const currentPath = studentProgress.recommendedPath;

  const learningGoals = [
    { id: 'improve_weak_areas', name: 'Improve Weak Areas', icon: '🎯' },
    { id: 'advance_strengths', name: 'Advance Strengths', icon: '🚀' },
    { id: 'balanced_growth', name: 'Balanced Growth', icon: '⚖️' },
    { id: 'exam_preparation', name: 'Exam Preparation', icon: '📝' }
  ];

  return (
    <div className={`bg-white rounded-lg p-6 shadow-sm border border-gray-200 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Learning Path Recommendations</h3>
          <p className="text-sm text-gray-600">Personalized suggestions based on your progress</p>
        </div>
        <div className="text-2xl">🗺️</div>
      </div>

      {/* Learning Goals Selection */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-3">Learning Goal</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {learningGoals.map((goal) => (
            <button
              key={goal.id}
              onClick={() => setSelectedGoal(goal.id)}
              className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                selectedGoal === goal.id
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-transparent'
              }`}
            >
              <div className="text-lg mb-1">{goal.icon}</div>
              <div>{goal.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Current Topic */}
      {currentPath.currentTopic && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">Currently Learning</h4>
              <p className="text-blue-700">{currentPath.currentTopic}</p>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Recommended Topics */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 flex items-center">
          <span className="mr-2">✨</span>
          Recommended for You
        </h4>
        
        {recommendations.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🎉</div>
            <p className="text-gray-600">Great job! You're doing well across all areas.</p>
            <p className="text-sm text-gray-500 mt-1">Keep up the excellent work!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {recommendations.map((topic, index) => (
              <div
                key={`${topic.subject}-${topic.topic}-${index}`}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 hover:border-blue-300"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getSubjectIcon(topic.subject)}</span>
                    <div>
                      <h5 className="font-medium text-gray-900">{topic.topic}</h5>
                      <p className="text-sm text-gray-600">{topic.subject}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm">{getDifficultyIcon(topic.difficulty)}</span>
                  </div>
                </div>

                {/* Bloom Level Indicator */}
                <div className="mb-3">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getBloomLevelColor(topic.difficulty)}`}>
                    Bloom Level {topic.difficulty}: {getBloomLevelName(topic.difficulty)}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-3">{topic.reason}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span className="flex items-center">
                      <span className="mr-1">⏱️</span>
                      {topic.estimatedTime} min
                    </span>
                    <span className="flex items-center">
                      <span className="mr-1">📊</span>
                      Level {topic.difficulty}
                    </span>
                  </div>
                  <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
                    Start Learning
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Topics */}
      {currentPath.completedTopics.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <span className="mr-2">✅</span>
            Recently Completed ({currentPath.completedTopics.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {currentPath.completedTopics.slice(0, 6).map((topic, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full"
              >
                {topic}
              </span>
            ))}
            {currentPath.completedTopics.length > 6 && (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                +{currentPath.completedTopics.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Progress Insights */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="font-medium text-gray-900 mb-3">Learning Insights</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-blue-600">
              {studentProgress.subjectProgress.filter(s => s.completionPercentage > 70).length}
            </div>
            <div className="text-xs text-blue-500">Strong Subjects</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-orange-600">
              {studentProgress.weakAreas.length}
            </div>
            <div className="text-xs text-orange-500">Areas to Improve</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-green-600">
              {Math.round(studentProgress.subjectProgress.reduce((acc, s) => acc + s.completionPercentage, 0) / studentProgress.subjectProgress.length)}%
            </div>
            <div className="text-xs text-green-500">Overall Progress</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningPathRecommendations;