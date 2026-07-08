import React from 'react';
import { Calculator, Globe, BookOpen } from 'lucide-react';

interface ModelOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  subjects: string[];
}

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
  className?: string;
}

const modelOptions: ModelOption[] = [
  {
    id: 'bangla',
    name: 'বাংলা মডেল',
    description: 'ONLY for Bengali language & literature (সন্ধি, সমাস, প্রত্যয়, সাহিত্য)',
    icon: <BookOpen className="w-5 h-5" />,
    color: 'bg-green-500',
    subjects: ['Bangla', 'বাংলা', 'Bengali Literature', 'Grammar']
  },
  {
    id: 'math',
    name: 'Math Model',
    description: 'ONLY for Mathematics (Algebra, Geometry, Calculus, Trigonometry)',
    icon: <Calculator className="w-5 h-5" />,
    color: 'bg-blue-500',
    subjects: ['Mathematics', 'Algebra', 'Geometry', 'Calculus', 'Trigonometry']
  },
  {
    id: 'general',
    name: 'General Model',
    description: 'For ALL other subjects (Physics, Chemistry, Biology, English, History)',
    icon: <Globe className="w-5 h-5" />,
    color: 'bg-purple-500',
    subjects: ['Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography']
  }
];

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  disabled = false,
  className = ''
}) => {
  const selectedOption = modelOptions.find(option => option.id === selectedModel);

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-gray-700">AI Model</h3>
        {selectedOption && (
          <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
            {selectedOption.name}
          </span>
        )}
      </div>
      
      <div className="flex flex-wrap gap-1.5">
        {modelOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => onModelChange(option.id)}
            disabled={disabled}
            className={`
              flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs transition-all
              ${selectedModel === option.id
                ? `${option.color} text-white shadow-sm`
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
      
      {!selectedModel && (
        <p className="text-xs text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">
          ⚠️ Choose an AI model to start chatting
        </p>
      )}
      
      {selectedModel && (
        <div className="text-xs text-gray-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
          <strong>💡 Tip:</strong> {
            selectedModel === 'bangla' ? 'Ask questions about বাংলা ব্যাকরণ, সাহিত্য, or Bengali language' :
            selectedModel === 'math' ? 'Ask questions about equations, geometry, calculus, or any math topic' :
            'Ask questions about science, English, history, or any general subject'
          }
        </div>
      )}
    </div>
  );
};

export default ModelSelector;