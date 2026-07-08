import React, { useState } from 'react';
import { ClassAnalytics } from './ClassAnalytics';
import { useClassAnalytics } from '../../hooks/useClassAnalytics';
import { AlertTriangle } from 'lucide-react';

interface ClassAnalyticsContainerProps {
  classId?: string;
  timeRange?: '7d' | '30d' | '90d' | '1y';
  autoRefresh?: boolean;
  refreshInterval?: number;
  onInterventionImplemented?: (recommendationId: string) => void;
}

export const ClassAnalyticsContainer: React.FC<ClassAnalyticsContainerProps> = ({
  classId,
  timeRange = '30d',
  autoRefresh = true,
  refreshInterval = 300000, // 5 minutes
  onInterventionImplemented
}) => {
  const {
    performanceMetrics,
    weaknessPatterns,
    interventionRecommendations,
    loading,
    error,
    refreshAnalytics,
    exportReport,
    handleInterventionAction,
    derivedMetrics,
    studentsNeedingAttention,
    improvementOpportunities
  } = useClassAnalytics({
    classId,
    timeRange,
    autoRefresh,
    refreshInterval
  });

  const [showInsights, setShowInsights] = useState(true);

  const handleInterventionActionWrapper = async (recommendationId: string, action: string) => {
    try {
      await handleInterventionAction(recommendationId, action as 'implement' | 'dismiss' | 'modify');
      
      if (action === 'implement' && onInterventionImplemented) {
        onInterventionImplemented(recommendationId);
      }
    } catch (error) {
      console.error('Failed to handle intervention action:', error);
    }
  };

  if (loading && !performanceMetrics) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="text-center">
          <div className="text-red-500 mb-2">
            <AlertTriangle className="mx-auto h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load analytics</h3>
          <p className="text-gray-500 mb-4">{error.message}</p>
          <button
            onClick={refreshAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!performanceMetrics) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No analytics data available</h3>
          <p className="text-gray-500">
            Analytics will be available once students start completing assessments and activities.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Insights Banner */}
      {showInsights && derivedMetrics && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Performance Trend</p>
                  <p className={`text-lg font-semibold ${
                    derivedMetrics.performanceTrend === 'improving' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {derivedMetrics.performanceTrend === 'improving' ? '↑ Improving' : '↓ Declining'}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Top Subject</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {derivedMetrics.topPerformingSubject?.subject}
                  </p>
                  <p className="text-xs text-gray-500">
                    {derivedMetrics.topPerformingSubject?.averageScore}% avg
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Needs Attention</p>
                  <p className="text-lg font-semibold text-orange-600">
                    {studentsNeedingAttention.length} students
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Engagement Level</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {Math.round(derivedMetrics.engagementLevel * 100)}%
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Weakest Subject</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {derivedMetrics.weakestSubject?.subject}
                  </p>
                  <p className="text-xs text-gray-500">
                    {derivedMetrics.weakestSubject?.averageScore}% avg
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Urgent Actions</p>
                  <p className="text-lg font-semibold text-red-600">
                    {derivedMetrics.urgentInterventions}
                  </p>
                </div>
              </div>
              
              {improvementOpportunities.length > 0 && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Top Improvement Opportunities:</p>
                  <ul className="space-y-1">
                    {improvementOpportunities.slice(0, 3).map((opportunity, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                        {opportunity.opportunity}
                        {opportunity.impact && (
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                            opportunity.impact === 'high' ? 'bg-red-100 text-red-700' :
                            opportunity.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {opportunity.impact} impact
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setShowInsights(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Analytics Component */}
      <ClassAnalytics
        classId={classId || ''}
        performanceData={performanceMetrics}
        weaknessPatterns={weaknessPatterns}
        interventionRecommendations={interventionRecommendations}
        onRefresh={refreshAnalytics}
        onExportReport={exportReport}
        onInterventionAction={handleInterventionActionWrapper}
      />
    </div>
  );
};

export default ClassAnalyticsContainer;