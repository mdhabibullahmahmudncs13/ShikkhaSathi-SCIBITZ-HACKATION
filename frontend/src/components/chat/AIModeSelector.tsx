import React from 'react';
import { GraduationCap, HelpCircle, BookOpen, Zap, Target, Users } from 'lucide-react';

interface AIModeOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
}

interface AIModeSelectorProps {
  selectedMode: string;
  onModeChange: (modeId: string) => void;
  disabled?: boolean;
  className?: string;
}

const aiModeOptions: AIModeOption[] = [
  {
    id: 'tutor',
    name: 'Tutor Mode',
    description: 'Step-by-step explanations and guided learning',
    icon: <GraduationCap className="w-5 h-5" />,
    color: 'bg-blue-500',
    features: ['Detailed explanations', 'Step-by-step guidance', 'Practice problems']
  },
  {
    id: 'quiz',
    name: 'Quiz Mode',
    description: 'Interactive questions and instant feedback',
    icon: <Target className="w-5 h-5" />,
    color: 'bg-green-500',
    features: ['Practice questions', 'Instant feedback', 'Progress tracking']
  },
  {
    id: 'explanation',
    name: 'Explanation Mode',
    description: 'Quick concept explanations and definitions',
    icon: <BookOpen className="w-5 h-5" />,
    color: 'bg-purple-500',
    features: ['Concept definitions', 'Quick explanations', 'Key points']
  },
  {
    id: 'homework',
    name: 'Homework Help',
    description: 'Assistance with homework and assignments',
    icon: <HelpCircle className="w-5 h-5" />,
    color: 'bg-orange-500',
    features: ['Problem solving', 'Homework guidance', 'Solution hints']
  },
  {
    id: 'exam',
    name: 'Exam Prep',
    description: 'SSC exam preparation and practice',
    icon: <Zap className="w-5 h-5" />,
    color: 'bg-red-500',
    features: ['Exam strategies', 'Past questions', 'Time management']
  },
  {
    id: 'discussion',
    name: 'Discussion Mode',
    description: 'Interactive discussions and debates',
    icon: <Users className="w-5 h-5" />,
    color: 'bg-indigo-500',
    features: ['Interactive chat', 'Topic discussions', 'Critical thinking']
  }
];

export const AIModeSelector: React.FC<AIModeSelectorProps> = ({
  selectedMode,
  onModeChange,
  disabled = false,
  className = ''
}) => {
  const selectedOption = aiModeOptions.find(option => option.id === selectedMode);

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-gray-700">AI Mode</h3>
        {selectedOption && (
          <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
            {selectedOption.name}
          </span>
        )}
      </div>
      
      <div className="flex flex-wrap gap-1.5">
        {aiModeOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => onModeChange(option.id)}
            disabled={disabled}
            className={`
              flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs transition-all
              ${selectedMode === option.id
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            title={option.description}
          >
            <div className="w-3 h-3">
              {React.cloneElement(option.icon as React.ReactElement, { className: 'w-3 h-3' })}
            </div>
            <span className="font-medium">{option.name}</span>
          </button>
        ))}
      </div>
      
      {!selectedMode && (
        <p className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
          Choose an AI mode
        </p>
      )}
    </div>
  );
};

export default AIModeSelector;