import React from 'react';
import { Clock, TrendingUp } from 'lucide-react';
import { SubjectProgress } from '../../types/dashboard';

interface SubjectCardProps {
  subject: SubjectProgress;
  onClick?: () => void;
}

const SubjectCard: React.FC<SubjectCardProps> = ({ subject, onClick }) => {
  // Subject-specific icons and colors
  const getSubjectConfig = (subjectName: string) => {
    const configs: Record<string, { icon: string; color: string; bgColor: string }> = {
      'Mathematics': { icon: '📊', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' },
      'Physics': { icon: '⚛️', color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-200' },
      'Chemistry': { icon: '🧪', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200' },
      'Biology': { icon: '🧬', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200' },
      'Bangla': { icon: '📚', color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-200' },
      'English': { icon: '🌍', color: 'text-indigo-600', bgColor: 'bg-indigo-50 border-indigo-200' },
      'ICT': { icon: '💻', color: 'text-gray-600', bgColor: 'bg-gray-50 border-gray-200' },
    };
    
    return configs[subjectName] || { icon: '📖', color: 'text-gray-600', bgColor: 'bg-gray-50 border-gray-200' };
  };

  const config = getSubjectConfig(subject.subject);
  const completionPercentage = Math.round(subject.completionPercentage);
  const hoursSpent = Math.floor(subject.timeSpent / 60);
  const minutesSpent = subject.timeSpent % 60;
  
  // Calculate days since last accessed
  const daysSinceAccess = Math.floor((Date.now() - subject.lastAccessed.getTime()) / (1000 * 60 * 60 * 24));
  const isRecentlyAccessed = daysSinceAccess <= 1;

  return (
    <div 
      className={`${config.bgColor} border rounded-xl p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 group`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{config.icon}</div>
          <div>
            <h3 className="font-bold text-lg text-gray-900 group-hover:text-gray-700 transition-colors">
              {subject.subject}
            </h3>
            {isRecentlyAccessed && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Recently active
              </span>
            )}
          </div>
        </div>
        
        {/* Completion Badge */}
        <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
          completionPercentage >= 80 ? 'bg-green-100 text-green-800' :
          completionPercentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-600'
        }`}>
          {completionPercentage}%
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span className="font-medium">{completionPercentage}% complete</span>
        </div>
        <div className="w-full bg-white rounded-full h-3 shadow-inner">
          <div 
            className={`h-3 rounded-full transition-all duration-700 ease-out ${
              completionPercentage >= 80 ? 'bg-green-500' :
              completionPercentage >= 60 ? 'bg-yellow-500' :
              completionPercentage >= 30 ? 'bg-blue-500' :
              'bg-gray-400'
            }`}
            style={{ width: `${Math.min(completionPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>
            {hoursSpent > 0 ? `${hoursSpent}h ` : ''}
            {minutesSpent}m studied
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <TrendingUp className="w-4 h-4" />
          <span>
            {daysSinceAccess === 0 ? 'Today' : 
             daysSinceAccess === 1 ? 'Yesterday' : 
             `${daysSinceAccess}d ago`}
          </span>
        </div>
      </div>

      {/* Bloom Level Progress (Mini indicators) */}
      {subject.bloomLevelProgress && subject.bloomLevelProgress.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/50">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Skill Levels</span>
            <span>Mastery</span>
          </div>
          <div className="flex gap-1">
            {subject.bloomLevelProgress.slice(0, 6).map((bloom, index) => (
              <div key={index} className="flex-1">
                <div className="w-full bg-white rounded-full h-1.5 shadow-inner">
                  <div 
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      bloom.mastery >= 80 ? 'bg-green-400' :
                      bloom.mastery >= 60 ? 'bg-yellow-400' :
                      bloom.mastery >= 30 ? 'bg-blue-400' :
                      'bg-gray-300'
                    }`}
                    style={{ width: `${Math.min(bloom.mastery, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectCard;