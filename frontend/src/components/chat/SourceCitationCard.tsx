import React from 'react';
import { SourceCitation } from '../../types/chat';

interface SourceCitationCardProps {
  source: SourceCitation;
}

const SourceCitationCard: React.FC<SourceCitationCardProps> = ({ source }) => {
  const getSubjectColor = (subject: string) => {
    const colors: { [key: string]: string } = {
      'Physics': 'bg-blue-50 border-blue-200 text-blue-800',
      'Chemistry': 'bg-green-50 border-green-200 text-green-800',
      'Mathematics': 'bg-purple-50 border-purple-200 text-purple-800',
      'Biology': 'bg-emerald-50 border-emerald-200 text-emerald-800',
      'Bangla': 'bg-red-50 border-red-200 text-red-800',
      'English': 'bg-indigo-50 border-indigo-200 text-indigo-800',
      'History': 'bg-yellow-50 border-yellow-200 text-yellow-800',
      'Geography': 'bg-teal-50 border-teal-200 text-teal-800',
    };
    return colors[subject] || 'bg-gray-50 border-gray-200 text-gray-800';
  };

  return (
    <div className={`p-3 rounded-lg border ${getSubjectColor(source.subject)} text-sm`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 mb-1">{source.title}</h4>
          <div className="flex items-center space-x-2 text-xs opacity-75">
            <span className="px-2 py-1 bg-white bg-opacity-50 rounded">
              {source.subject}
            </span>
            <span>Grade {source.grade}</span>
            <span>Ch. {source.chapter}</span>
            <span>Page {source.pageNumber}</span>
          </div>
        </div>
        <button
          className="ml-2 p-1 hover:bg-white hover:bg-opacity-50 rounded"
          title="Open full reference"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
      </div>
      
      <div className="text-xs text-gray-600 mb-2">
        <strong>From:</strong> {source.textbookName}
      </div>
      
      {source.relevantText && (
        <div className="text-xs bg-white bg-opacity-50 p-2 rounded italic">
          "{source.relevantText.length > 100 
            ? source.relevantText.substring(0, 100) + '...' 
            : source.relevantText}"
        </div>
      )}
    </div>
  );
};

export default SourceCitationCard;