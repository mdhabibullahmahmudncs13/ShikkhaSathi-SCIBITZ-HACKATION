import React, { useState } from 'react';
import { Achievement } from '../../types/dashboard';

interface AchievementShowcaseProps {
  achievements: Achievement[];
  className?: string;
}

const AchievementShowcase: React.FC<AchievementShowcaseProps> = ({
  achievements,
  className = ''
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Categorize achievements
  const categories = {
    all: 'All Achievements',
    learning: 'Learning',
    streak: 'Streaks',
    quiz: 'Quizzes',
    social: 'Social',
    milestone: 'Milestones'
  };

  // Sample achievement data with categories
  const categorizedAchievements = achievements.map(achievement => {
    const category = achievement.name.toLowerCase().includes('streak') ? 'streak' :
              achievement.name.toLowerCase().includes('quiz') ? 'quiz' :
              achievement.name.toLowerCase().includes('friend') || achievement.name.toLowerCase().includes('help') ? 'social' :
              achievement.name.toLowerCase().includes('level') || achievement.name.toLowerCase().includes('xp') ? 'milestone' :
              'learning';
    return { ...achievement, category };
  });

  const filteredAchievements = selectedCategory === 'all' 
    ? categorizedAchievements 
    : categorizedAchievements.filter(a => (a as any).category === selectedCategory);

  const unlockedAchievements = filteredAchievements.filter(a => a.unlockedAt);
  const lockedAchievements = filteredAchievements.filter(a => !a.unlockedAt);

  const getAchievementIcon = (achievement: Achievement & { category?: string }) => {
    if (achievement.icon) return achievement.icon;
    
    // Default icons based on category
    const categoryIcons = {
      learning: '📚',
      streak: '🔥',
      quiz: '🎯',
      social: '👥',
      milestone: '🏆'
    };
    
    return categoryIcons[achievement.category as keyof typeof categoryIcons] || '🏅';
  };

  const getProgressPercentage = (achievement: Achievement) => {
    if (!achievement.progress || !achievement.target) return 0;
    return Math.min((achievement.progress / achievement.target) * 100, 100);
  };

  return (
    <div className={`bg-white rounded-lg p-6 shadow-sm border border-gray-200 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Achievements</h3>
          <p className="text-sm text-gray-600">
            {unlockedAchievements.length} of {filteredAchievements.length} unlocked
          </p>
        </div>
        <div className="text-2xl">🏆</div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(categories).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === key
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Achievement grid */}
      <div className="space-y-6">
        {/* Unlocked achievements */}
        {unlockedAchievements.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <span className="mr-2">✨</span>
              Unlocked ({unlockedAchievements.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {unlockedAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg hover:shadow-md transition-all duration-200 hover:scale-105"
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">{getAchievementIcon(achievement)}</div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 mb-1">{achievement.name}</h5>
                      <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
                      {achievement.unlockedAt && (
                        <p className="text-xs text-yellow-600 font-medium">
                          Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locked achievements with progress */}
        {lockedAchievements.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <span className="mr-2">🔒</span>
              In Progress ({lockedAchievements.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {lockedAchievements.map((achievement) => {
                const progressPercentage = getProgressPercentage(achievement);
                
                return (
                  <div
                    key={achievement.id}
                    className="p-4 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl opacity-50">{getAchievementIcon(achievement)}</div>
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-700 mb-1">{achievement.name}</h5>
                        <p className="text-sm text-gray-500 mb-3">{achievement.description}</p>
                        
                        {achievement.progress !== undefined && achievement.target && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">
                                {achievement.progress} / {achievement.target}
                              </span>
                              <span className="font-medium text-gray-700">
                                {Math.round(progressPercentage)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progressPercentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-yellow-50 rounded-lg p-3">
            <div className="text-lg font-semibold text-yellow-600">{unlockedAchievements.length}</div>
            <div className="text-xs text-yellow-500">Unlocked</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-lg font-semibold text-blue-600">{lockedAchievements.length}</div>
            <div className="text-xs text-blue-500">In Progress</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-lg font-semibold text-green-600">
              {Math.round((unlockedAchievements.length / filteredAchievements.length) * 100)}%
            </div>
            <div className="text-xs text-green-500">Completion</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AchievementShowcase;