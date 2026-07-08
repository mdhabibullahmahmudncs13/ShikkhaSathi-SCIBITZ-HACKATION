import React from 'react';

interface XPProgressBarProps {
  currentXP: number;
  currentLevel: number;
  className?: string;
}

const XPProgressBar: React.FC<XPProgressBarProps> = ({
  currentXP,
  currentLevel,
  className = ''
}) => {
  // Calculate XP needed for current level and next level
  // Using formula: level = floor(sqrt(total_xp / 100))
  // So: total_xp = level^2 * 100
  const currentLevelXP = currentLevel * currentLevel * 100;
  const nextLevelXP = (currentLevel + 1) * (currentLevel + 1) * 100;
  const xpInCurrentLevel = currentXP - currentLevelXP;
  const xpNeededForNextLevel = nextLevelXP - currentLevelXP;
  const progressPercentage = (xpInCurrentLevel / xpNeededForNextLevel) * 100;

  return (
    <div className={`bg-white rounded-lg p-6 shadow-sm border border-gray-200 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Level Progress</h3>
          <p className="text-sm text-gray-600">
            {xpInCurrentLevel} / {xpNeededForNextLevel} XP to Level {currentLevel + 1}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">Level {currentLevel}</div>
          <div className="text-sm text-gray-500">{currentXP} Total XP</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative">
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-4 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          >
            {/* Animated shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse" />
          </div>
        </div>
        
        {/* Level markers */}
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Level {currentLevel}</span>
          <span className="font-medium text-blue-600">
            {Math.round(progressPercentage)}%
          </span>
          <span>Level {currentLevel + 1}</span>
        </div>
      </div>

      {/* XP breakdown */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-lg font-semibold text-blue-600">{currentXP}</div>
          <div className="text-xs text-blue-500">Total XP</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-3">
          <div className="text-lg font-semibold text-purple-600">{currentLevel}</div>
          <div className="text-xs text-purple-500">Current Level</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <div className="text-lg font-semibold text-green-600">{nextLevelXP - currentXP}</div>
          <div className="text-xs text-green-500">XP to Next</div>
        </div>
      </div>
    </div>
  );
};

export default XPProgressBar;