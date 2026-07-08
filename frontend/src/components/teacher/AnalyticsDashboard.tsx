import React, { useState } from 'react';
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  Target,
  BookOpen,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { ClassPerformanceOverview } from './ClassPerformanceOverview';
import { StudentAnalytics } from './StudentAnalytics';
import { useTeacherAnalytics } from '../../hooks/useTeacherAnalytics';
import { StudentSummary } from '../../types/teacher';

interface AnalyticsDashboardProps {
  classId: string;
  className: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  classId,
  className
}) => {
  const [activeView, setActiveView] = useState<'overview' | 'student'>('overview');
  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month');

  const {
    classMetrics,
    atRiskStudents,
    weaknessPatterns,
    engagementMetrics,
    performanceTrends,
    loading,
    error,
    refresh,
    clearError
  } = useTeacherAnalytics(classId, true);

  const handleStudentSelect = (student: StudentSummary) => {
    setSelectedStudent(student);
    setActiveView('student');
  };

  const handleBackToOverview = () => {
    setActiveView('overview');
    setSelectedStudent(null);
  };

  const handleDrillDown = (subject: string, topic?: string) => {
    // Handle drill down into specific subject/topic analytics
    console.log('Drill down:', subject, topic);
  };

  const handleRefresh = async () => {
    await refresh();
  };

  const handleExportData = () => {
    // Handle data export functionality
    console.log('Exporting analytics data...');
  };

  if (loading && !classMetrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading analytics dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {activeView === 'overview' ? 'Class Analytics' : 'Student Analytics'}
            </h1>
            <p className="text-gray-600 mt-1">
              {activeView === 'overview' 
                ? `Comprehensive performance insights for ${className}`
                : `Detailed analysis for ${selectedStudent?.name}`
              }
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {activeView === 'student' && (
              <button
                onClick={handleBackToOverview}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                ← Back to Overview
              </button>
            )}
            
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            <button
              onClick={handleExportData}
              className="flex items-center px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800 font-medium">Error: {error}</span>
            </div>
            <button
              onClick={clearError}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      {activeView === 'overview' && classMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-gray-900">{classMetrics?.averageScore || 0}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{classMetrics?.completionRate || 0}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Students</p>
                <p className="text-2xl font-bold text-gray-900">
                  {classMetrics?.engagementMetrics?.dailyActiveUsers || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">At Risk Students</p>
                <p className="text-2xl font-bold text-gray-900">{atRiskStudents?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* At-Risk Students Alert */}
      {activeView === 'overview' && atRiskStudents && atRiskStudents.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
            <h3 className="text-lg font-semibold text-yellow-900">
              Students Requiring Attention ({atRiskStudents?.length || 0})
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {atRiskStudents?.slice(0, 6).map((student) => (
              <div
                key={student.id}
                className="bg-white p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleStudentSelect(student)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{student.name}</h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    student.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                    student.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {student.riskLevel} risk
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Score: {student.averageScore}%</p>
                  <p>Streak: {student.currentStreak} days</p>
                  <p>Weak areas: {student.weakAreas?.length || 0}</p>
                </div>
              </div>
            ))}
          </div>
          
          {atRiskStudents && atRiskStudents.length > 6 && (
            <div className="mt-4 text-center">
              <button className="text-yellow-700 hover:text-yellow-900 font-medium">
                View all {atRiskStudents?.length || 0} at-risk students →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      {activeView === 'overview' ? (
        <ClassPerformanceOverview
          classId={classId}
          className={className}
          onDrillDown={handleDrillDown}
        />
      ) : (
        selectedStudent && (
          <StudentAnalytics
            student={selectedStudent}
            classId={classId}
          />
        )
      )}

      {/* Weakness Patterns Summary */}
      {activeView === 'overview' && weaknessPatterns && weaknessPatterns.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Key Insights & Recommendations
          </h3>
          
          <div className="space-y-4">
            {weaknessPatterns?.slice(0, 3).map((pattern, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${
                  pattern.severity === 'high' ? 'border-red-200 bg-red-50' :
                  pattern.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                  'border-blue-200 bg-blue-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{pattern.pattern}</h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    pattern.severity === 'high' ? 'bg-red-100 text-red-800' :
                    pattern.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {pattern.severity} priority
                  </span>
                </div>
                
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Affected:</strong> {pattern.affectedStudents} students in {pattern.subjects.join(', ')}
                </p>
                
                <p className="text-sm text-gray-700">
                  <strong>Recommendation:</strong> {pattern.recommendedIntervention}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;