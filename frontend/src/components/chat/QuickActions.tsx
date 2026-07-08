import React from 'react';
import { QuickAction } from '../../types/chat';

interface QuickActionsProps {
  onActionClick: (action: QuickAction) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onActionClick }) => {
  const quickActions: QuickAction[] = [
    {
      id: 'explain-concept',
      label: 'Explain a concept',
      question: 'Can you explain a concept from my textbook?',
      icon: '💡',
      category: 'general',
    },
    {
      id: 'solve-math',
      label: 'Solve math problem',
      question: 'Help me solve a mathematics problem step by step',
      icon: '🔢',
      category: 'math',
    },
    {
      id: 'science-experiment',
      label: 'Science help',
      question: 'Explain a science concept or experiment',
      icon: '🔬',
      category: 'science',
    },
    {
      id: 'grammar-help',
      label: 'Grammar help',
      question: 'Help me with Bangla or English grammar',
      icon: '📝',
      category: 'bangla',
    },
    {
      id: 'exam-prep',
      label: 'Exam preparation',
      question: 'Help me prepare for my upcoming exam',
      icon: '📚',
      category: 'general',
    },
    {
      id: 'homework-help',
      label: 'Homework help',
      question: 'I need help with my homework assignment',
      icon: '✏️',
      category: 'general',
    },
  ];

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'math': 'bg-purple-100 text-purple-700 hover:bg-purple-200',
      'science': 'bg-green-100 text-green-700 hover:bg-green-200',
      'bangla': 'bg-red-100 text-red-700 hover:bg-red-200',
      'english': 'bg-blue-100 text-blue-700 hover:bg-blue-200',
      'general': 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    };
    return colors[category] || colors['general'];
  };

  return (
    <div className="p-4 border-b border-gray-200 bg-gray-50">
      <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {quickActions.map((action) => (
          <button
            key={action.id}
            onClick={() => onActionClick(action)}
            className={`p-3 rounded-lg text-left transition-colors ${getCategoryColor(action.category)}`}
            title={action.question}
          >
            <div className="flex items-center space-x-2">
              <span className="text-lg">{action.icon}</span>
              <span className="text-sm font-medium truncate">{action.label}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;