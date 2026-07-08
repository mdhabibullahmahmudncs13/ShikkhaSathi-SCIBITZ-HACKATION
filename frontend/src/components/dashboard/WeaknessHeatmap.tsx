import React from 'react';
import { WeakArea } from '../../types/dashboard';

interface WeaknessHeatmapProps {
  weakAreas: WeakArea[];
  className?: string;
}

const WeaknessHeatmap: React.FC<WeaknessHeatmapProps> = ({
  weakAreas,
  className = ''
}) => {
  // Group weak areas by subject
  const groupedWeakAreas = weakAreas.reduce((acc, area) => {
    if (!acc[area.subject]) {
      acc[area.subject] = [];
    }
    acc[area.subject].push(area);
    return acc;
  }, {} as { [subject: string]: WeakArea[] });

  // Get color intensity based on success rate (lower success rate = more intense red)
  const getIntensityColor = (successRate: number) => {
    if (successRate >= 80) return 'bg-green-100 text-green-800';
    if (successRate >= 60) return 'bg-yellow-100 text-yellow-800';
    if (successRate >= 40) return 'bg-orange-100 text-orange-800';
    if (successRate >= 20) return 'bg-red-100 text-red-800';
    return 'bg-red-200 text-red-900';
  };

  const getBloomLevelName = (level: number) => {
    const levels = {
      1: 'Remember',
      2: 'Understand', 
      3: 'Apply',
      4: 'Analyze',
      5: 'Evaluate',
      6: 'Create'
    };
    return levels[level as keyof typeof levels] || `Level ${level}`;
  };

  if (weakAreas.length === 0) {
    return (
      <div className={`bg-white rounded-lg p-6 shadow-sm border border-gray-200 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Weakness Analysis</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-gray-600">Great job! No significant weak areas detected.</p>
          <p className="text-sm text-gray-500 mt-1">Keep up the excellent work!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg p-6 shadow-sm border border-gray-200 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Weakness Analysis</h3>
          <p className="text-sm text-gray-600">Areas that need more attention</p>
        </div>
        <div className="text-sm text-gray-500">
          {weakAreas.length} area{weakAreas.length !== 1 ? 's' : ''} to improve
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedWeakAreas).map(([subject, areas]) => (
          <div key={subject} className="space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center">
              <span className="text-lg mr-2">
                {subject === 'Mathematics' && '📊'}
                {subject === 'Physics' && '⚛️'}
                {subject === 'Chemistry' && '🧪'}
                {subject === 'Biology' && '🧬'}
                {subject === 'Bangla' && '📚'}
                {subject === 'English' && '🌍'}
                {subject === 'ICT' && '💻'}
              </span>
              {subject}
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {areas.map((area, index) => (
                <div
                  key={`${area.subject}-${area.topic}-${index}`}
                  className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${getIntensityColor(area.successRate)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-sm mb-1">{area.topic}</h5>
                      <p className="text-xs opacity-75 mb-2">
                        {getBloomLevelName(area.bloomLevel)}
                      </p>
                      <div className="flex items-center space-x-2">
                        <div className="text-xs font-medium">
                          {Math.round(area.successRate)}% success
                        </div>
                      </div>
                    </div>
                    <div className="ml-2">
                      {area.successRate < 50 && (
                        <span className="text-lg" title="Needs urgent attention">⚠️</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Mini progress bar */}
                  <div className="mt-3">
                    <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
                      <div
                        className="bg-current h-2 rounded-full transition-all duration-300"
                        style={{ width: `${area.successRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Action suggestions */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="font-medium text-gray-900 mb-3">Recommended Actions</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button className="flex items-center p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
            <span className="mr-2">📚</span>
            <span className="text-sm font-medium">Review Study Materials</span>
          </button>
          <button className="flex items-center p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
            <span className="mr-2">🎯</span>
            <span className="text-sm font-medium">Take Practice Quiz</span>
          </button>
          <button className="flex items-center p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
            <span className="mr-2">💬</span>
            <span className="text-sm font-medium">Ask AI Tutor</span>
          </button>
          <button className="flex items-center p-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors">
            <span className="mr-2">📖</span>
            <span className="text-sm font-medium">Get Learning Path</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeaknessHeatmap;