import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  Clock, 
  Target,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { ClassPerformanceMetrics } from '../../types/teacher';
import { useTeacherAnalytics } from '../../hooks/useTeacherAnalytics';

interface ClassPerformanceOverviewProps {
  classId: string;
  className: string;
  onDrillDown: (subject: string, topic?: string) => void;
}

export const ClassPerformanceOverview: React.FC<ClassPerformanceOverviewProps> = ({
  classId,
  className,
  onDrillDown
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'week' | 'month' | 'quarter'>('month');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  
  const {
    classMetrics,
    loading,
    error,
    loadClassMetrics,
    clearError
  } = useTeacherAnalytics(classId, false);

  // Load metrics when component mounts or time range changes
  useEffect(() => {
    loadClassMetrics(classId, selectedTimeRange);
  }, [classId, selectedTimeRange, loadClassMetrics]);

  // Handle time range change
  const handleTimeRangeChange = (newTimeRange: 'week' | 'month' | 'quarter') => {
    setSelectedTimeRange(newTimeRange);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <h3 className="text-red-800 font-medium">Error Loading Analytics</h3>
        </div>
        <p className="text-red-700 mt-2">{error}</p>
        <button
          onClick={clearError}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!classMetrics) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <p className="text-gray-600">No analytics data available for this class.</p>
      </div>
    );
  }

  const metrics = classMetrics;

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getPerformanceIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (score >= 60) return <Clock className="h-5 w-5 text-yellow-600" />;
    return <AlertTriangle className="h-5 w-5 text-red-600" />;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-100 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-100 border-blue-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{className} Performance</h2>
            <p className="text-sm text-gray-600 mt-1">
              Comprehensive analytics and insights for class performance
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={selectedTimeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value as 'week' | 'month' | 'quarter')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
            </select>
            
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Subjects</option>
              {metrics.subjectPerformance.map((subject) => (
                <option key={subject.subject} value={subject.subject}>
                  {subject.subject}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-900">Average Score</p>
                <p className="text-2xl font-bold text-blue-900">{metrics.averageScore}%</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-900">Completion Rate</p>
                <p className="text-2xl font-bold text-green-900">{metrics.completionRate}%</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-900">Active Students</p>
                <p className="text-2xl font-bold text-purple-900">{metrics.engagementMetrics.dailyActiveUsers}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-orange-900">Avg Session</p>
                <p className="text-2xl font-bold text-orange-900">
                  {Math.round(metrics.engagementMetrics.averageSessionDuration)}m
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Performance Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Performance</h3>
        <div className="space-y-4">
          {metrics.subjectPerformance
            .filter(subject => selectedSubject === 'all' || subject.subject === selectedSubject)
            .map((subject) => (
              <div
                key={subject.subject}
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => onDrillDown(subject.subject)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <h4 className="text-lg font-medium text-gray-900">{subject.subject}</h4>
                    {getPerformanceIcon(subject.averageScore)}
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPerformanceColor(subject.averageScore)}`}>
                      {subject.averageScore}% avg
                    </span>
                    <span className="text-sm text-gray-600">
                      {subject.completionRate}% completion
                    </span>
                  </div>
                </div>

                {/* Bloom Level Distribution */}
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Bloom's Taxonomy Distribution</p>
                  <div className="grid grid-cols-6 gap-2">
                    {Object.entries(subject.bloomLevelDistribution).map(([level, percentage]) => (
                      <div key={level} className="text-center">
                        <div className="text-xs text-gray-600 mb-1">L{level.slice(-1)}</div>
                        <div className="h-2 bg-gray-200 rounded-full">
                          <div
                            className="h-2 bg-blue-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{percentage}%</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Performing Topics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Top Performing Topics</p>
                    <div className="space-y-1">
                      {subject.topicPerformance
                        .sort((a, b) => b.averageScore - a.averageScore)
                        .slice(0, 3)
                        .map((topic) => (
                          <div key={topic.topic} className="flex justify-between text-sm">
                            <span className="text-gray-600">{topic.topic}</span>
                            <span className="text-green-600 font-medium">{topic.averageScore}%</span>
                          </div>
                        ))}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Needs Attention</p>
                    <div className="space-y-1">
                      {subject.topicPerformance
                        .sort((a, b) => a.averageScore - b.averageScore)
                        .slice(0, 3)
                        .map((topic) => (
                          <div key={topic.topic} className="flex justify-between text-sm">
                            <span className="text-gray-600">{topic.topic}</span>
                            <span className="text-red-600 font-medium">{topic.averageScore}%</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Weakness Patterns */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Identified Weakness Patterns</h3>
        {metrics.weaknessPatterns.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No significant patterns detected</h3>
            <p className="mt-1 text-sm text-gray-500">
              Class performance is well-distributed across topics and skills.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {metrics.weaknessPatterns.map((pattern, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${getSeverityColor(pattern.severity)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center">
                    <AlertTriangle className={`h-5 w-5 mr-2 ${
                      pattern.severity === 'high' ? 'text-red-600' :
                      pattern.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                    }`} />
                    <h4 className="font-medium text-gray-900">{pattern.pattern}</h4>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    pattern.severity === 'high' ? 'bg-red-100 text-red-800' :
                    pattern.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {pattern.severity} priority
                  </span>
                </div>
                
                <div className="text-sm text-gray-700 mb-3">
                  <p><strong>Affected Students:</strong> {pattern.affectedStudents}</p>
                  <p><strong>Subjects:</strong> {pattern.subjects.join(', ')}</p>
                  <p><strong>Topics:</strong> {pattern.topics.join(', ')}</p>
                </div>
                
                <div className="bg-white bg-opacity-50 rounded p-3">
                  <p className="text-sm font-medium text-gray-900 mb-1">Recommended Intervention:</p>
                  <p className="text-sm text-gray-700">{pattern.recommendedIntervention}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Time Analytics */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Time & Engagement Analytics</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Study Time Trends */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Weekly Study Time Trends</h4>
            <div className="space-y-3">
              {metrics.timeAnalytics.weeklyTrends.map((week) => (
                <div key={week.week} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{week.week}</p>
                    <p className="text-xs text-gray-600">{week.activeStudents} active students</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {Math.round(week.totalTime / 60)}h total
                    </p>
                    <p className="text-xs text-gray-600">{week.averageScore}% avg score</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Streak Distribution */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Learning Streak Distribution</h4>
            <div className="space-y-3">
              {Object.entries(metrics.engagementMetrics.streakDistribution).map(([range, count]) => (
                <div key={range} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{range} days</span>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ 
                          width: `${(count / Math.max(...Object.values(metrics.engagementMetrics.streakDistribution))) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly Comparison */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Monthly Performance Comparison</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Study Time</p>
              <p className="text-lg font-bold text-gray-900">
                {Math.round(metrics.timeAnalytics.monthlyComparison.currentMonth.totalTime / 60)}h
              </p>
              <p className={`text-xs ${
                metrics.timeAnalytics.monthlyComparison.growthRate > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {metrics.timeAnalytics.monthlyComparison.growthRate > 0 ? '+' : ''}
                {metrics.timeAnalytics.monthlyComparison.growthRate}%
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600">Avg Score</p>
              <p className="text-lg font-bold text-gray-900">
                {metrics.timeAnalytics.monthlyComparison.currentMonth.averageScore}%
              </p>
              <p className={`text-xs ${
                metrics.timeAnalytics.monthlyComparison.currentMonth.averageScore > 
                metrics.timeAnalytics.monthlyComparison.previousMonth.averageScore ? 'text-green-600' : 'text-red-600'
              }`}>
                {metrics.timeAnalytics.monthlyComparison.currentMonth.averageScore > 
                 metrics.timeAnalytics.monthlyComparison.previousMonth.averageScore ? '+' : ''}
                {metrics.timeAnalytics.monthlyComparison.currentMonth.averageScore - 
                 metrics.timeAnalytics.monthlyComparison.previousMonth.averageScore}%
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600">Quizzes</p>
              <p className="text-lg font-bold text-gray-900">
                {metrics.timeAnalytics.monthlyComparison.currentMonth.completedQuizzes}
              </p>
              <p className={`text-xs ${
                metrics.timeAnalytics.monthlyComparison.currentMonth.completedQuizzes > 
                metrics.timeAnalytics.monthlyComparison.previousMonth.completedQuizzes ? 'text-green-600' : 'text-red-600'
              }`}>
                {metrics.timeAnalytics.monthlyComparison.currentMonth.completedQuizzes > 
                 metrics.timeAnalytics.monthlyComparison.previousMonth.completedQuizzes ? '+' : ''}
                {metrics.timeAnalytics.monthlyComparison.currentMonth.completedQuizzes - 
                 metrics.timeAnalytics.monthlyComparison.previousMonth.completedQuizzes}
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600">Active Students</p>
              <p className="text-lg font-bold text-gray-900">
                {metrics.timeAnalytics.monthlyComparison.currentMonth.activeStudents}
              </p>
              <p className={`text-xs ${
                metrics.timeAnalytics.monthlyComparison.currentMonth.activeStudents > 
                metrics.timeAnalytics.monthlyComparison.previousMonth.activeStudents ? 'text-green-600' : 'text-red-600'
              }`}>
                {metrics.timeAnalytics.monthlyComparison.currentMonth.activeStudents > 
                 metrics.timeAnalytics.monthlyComparison.previousMonth.activeStudents ? '+' : ''}
                {metrics.timeAnalytics.monthlyComparison.currentMonth.activeStudents - 
                 metrics.timeAnalytics.monthlyComparison.previousMonth.activeStudents}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassPerformanceOverview;