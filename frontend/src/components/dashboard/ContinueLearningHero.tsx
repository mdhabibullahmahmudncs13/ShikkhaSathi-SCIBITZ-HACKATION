import React from 'react';
import { Play, Clock, Target, TrendingUp } from 'lucide-react';
import { StudentProgress } from '../../types/dashboard';

interface ContinueLearningHeroProps {
  studentProgress: StudentProgress;
  onContinue: () => void;
}

const ContinueLearningHero: React.FC<ContinueLearningHeroProps> = ({
  studentProgress,
  onContinue
}) => {
  // Find the most recently accessed subject or current topic
  const getLastAccessedSubject = () => {
    if (studentProgress.subjectProgress.length === 0) {
      return { subject: 'Mathematics', topic: 'Get Started', progress: 0 };
    }

    const sortedByAccess = [...studentProgress.subjectProgress].sort(
      (a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime()
    );

    const lastSubject = sortedByAccess[0];
    return {
      subject: lastSubject.subject,
      topic: studentProgress.recommendedPath.currentTopic || `${lastSubject.subject} Basics`,
      progress: lastSubject.completionPercentage
    };
  };

  const currentLearning = getLastAccessedSubject();
  const nextRecommendation = studentProgress.recommendedPath.recommendedNextTopics[0];

  // Calculate estimated time to next level
  const xpToNextLevel = (studentProgress.currentLevel * 100) - (studentProgress.totalXP % 100);
  const estimatedMinutes = Math.ceil(xpToNextLevel / 10); // Assuming ~10 XP per minute

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 rounded-2xl p-8 text-white">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-20 -translate-y-20"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full translate-x-16 translate-y-16"></div>
        <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-white rounded-full"></div>
      </div>

      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Main Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-blue-100">Ready to continue</span>
            </div>
            
            <h2 className="text-3xl lg:text-4xl font-bold mb-2">
              {currentLearning.topic}
            </h2>
            
            <p className="text-lg text-blue-100 mb-6">
              {nextRecommendation 
                ? `Continue with ${nextRecommendation.topic} in ${nextRecommendation.subject}`
                : `Continue your ${currentLearning.subject} journey`
              }
            </p>

            {/* Progress Stats */}
            <div className="flex flex-wrap gap-6 mb-6">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-200" />
                <span className="text-sm">
                  <span className="font-semibold">{currentLearning.progress}%</span> complete
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-200" />
                <span className="text-sm">
                  <span className="font-semibold">{nextRecommendation?.estimatedTime || 30}</span> min session
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-200" />
                <span className="text-sm">
                  <span className="font-semibold">{estimatedMinutes}</span> min to level up
                </span>
              </div>
            </div>

            {/* Continue Button */}
            <button
              onClick={onContinue}
              className="inline-flex items-center gap-3 bg-white text-blue-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-50 transition-all duration-200 hover:scale-105 shadow-lg"
            >
              <Play className="w-6 h-6" />
              Continue Learning
            </button>
          </div>

          {/* Side Stats */}
          <div className="lg:w-80">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold mb-4">Today's Progress</h3>
              
              <div className="space-y-4">
                {/* XP Progress */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span>Level {studentProgress.currentLevel}</span>
                    <span>{studentProgress.totalXP % 100}/100 XP</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(studentProgress.totalXP % 100)}%` }}
                    />
                  </div>
                </div>

                {/* Streak */}
                <div className="flex items-center justify-between">
                  <span className="text-sm">Current Streak</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xl">🔥</span>
                    <span className="font-bold">{studentProgress.currentStreak} days</span>
                  </div>
                </div>

                {/* Total XP */}
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total XP</span>
                  <span className="font-bold">{studentProgress.totalXP.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContinueLearningHero;