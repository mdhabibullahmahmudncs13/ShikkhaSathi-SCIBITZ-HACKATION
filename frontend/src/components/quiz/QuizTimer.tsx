import React, { useEffect, useState } from 'react';

interface QuizTimerProps {
  timeRemaining: number; // in seconds
  totalTime: number; // in seconds
  onTimeUp: () => void;
  onWarning?: (minutesLeft: number) => void;
}

const QuizTimer: React.FC<QuizTimerProps> = ({
  timeRemaining,
  totalTime,
  onTimeUp,
  onWarning,
}) => {
  const [hasWarned5Min, setHasWarned5Min] = useState(false);
  const [hasWarned1Min, setHasWarned1Min] = useState(false);

  useEffect(() => {
    if (timeRemaining <= 0) {
      onTimeUp();
      return;
    }

    // 5 minute warning
    if (timeRemaining <= 300 && !hasWarned5Min) {
      setHasWarned5Min(true);
      onWarning?.(5);
    }

    // 1 minute warning
    if (timeRemaining <= 60 && !hasWarned1Min) {
      setHasWarned1Min(true);
      onWarning?.(1);
    }
  }, [timeRemaining, hasWarned5Min, hasWarned1Min, onTimeUp, onWarning]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    const percentageRemaining = (timeRemaining / totalTime) * 100;
    
    if (percentageRemaining <= 10 || timeRemaining <= 60) {
      return 'text-red-700 bg-red-100 border-red-300';
    } else if (percentageRemaining <= 25 || timeRemaining <= 300) {
      return 'text-yellow-700 bg-yellow-100 border-yellow-300';
    }
    return 'text-gray-700 bg-gray-100 border-gray-300';
  };

  const getProgressColor = () => {
    const percentageRemaining = (timeRemaining / totalTime) * 100;
    
    if (percentageRemaining <= 10 || timeRemaining <= 60) {
      return 'bg-red-500';
    } else if (percentageRemaining <= 25 || timeRemaining <= 300) {
      return 'bg-yellow-500';
    }
    return 'bg-blue-500';
  };

  const percentageRemaining = (timeRemaining / totalTime) * 100;

  return (
    <div className="space-y-2">
      {/* Timer Display */}
      <div className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-semibold border-2 ${getTimerColor()}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {formatTime(timeRemaining)}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-1000 ${getProgressColor()}`}
          style={{ width: `${Math.max(0, percentageRemaining)}%` }}
        ></div>
      </div>

      {/* Time Warnings */}
      {timeRemaining <= 60 && timeRemaining > 0 && (
        <div className="animate-pulse text-xs text-red-600 font-medium text-center">
          ⚠️ Less than 1 minute remaining!
        </div>
      )}
      {timeRemaining <= 300 && timeRemaining > 60 && (
        <div className="text-xs text-yellow-600 font-medium text-center">
          ⏰ {Math.floor(timeRemaining / 60)} minutes remaining
        </div>
      )}
    </div>
  );
};

export default QuizTimer;