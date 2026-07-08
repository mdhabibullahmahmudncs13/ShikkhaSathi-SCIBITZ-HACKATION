import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  progress?: number;
  maxProgress?: number;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  progress,
  maxProgress,
  color = 'blue',
  trend,
  trendValue
}) => {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      progress: 'bg-blue-500',
      trend: 'text-blue-600'
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-600',
      progress: 'bg-green-500',
      trend: 'text-green-600'
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      icon: 'text-purple-600',
      progress: 'bg-purple-500',
      trend: 'text-purple-600'
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      icon: 'text-orange-600',
      progress: 'bg-orange-500',
      trend: 'text-orange-600'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      progress: 'bg-red-500',
      trend: 'text-red-600'
    }
  };

  const classes = colorClasses[color];
  const progressPercentage = progress && maxProgress ? (progress / maxProgress) * 100 : 0;

  return (
    <div className={`${classes.bg} ${classes.border} border rounded-xl p-6 transition-all duration-200 hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg bg-white shadow-sm`}>
              <Icon className={`w-5 h-5 ${classes.icon}`} />
            </div>
            <span className="text-sm font-medium text-gray-600">{title}</span>
          </div>
          
          <div className="mb-2">
            <span className="text-3xl font-bold text-gray-900">{value}</span>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>

          {/* Progress Bar */}
          {progress !== undefined && maxProgress !== undefined && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>{progress}/{maxProgress}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`${classes.progress} h-2 rounded-full transition-all duration-500 ease-out`}
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Trend Indicator */}
          {trend && trendValue && (
            <div className="flex items-center gap-1">
              <span className={`text-xs font-medium ${classes.trend}`}>
                {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'} {trendValue}
              </span>
              <span className="text-xs text-gray-400">vs last week</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;