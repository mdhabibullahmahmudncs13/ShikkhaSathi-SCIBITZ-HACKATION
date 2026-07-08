import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  BookOpen,
  Award,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { ClassPerformanceMetrics, WeaknessPattern, InterventionRecommendation } from '../../types/teacher';

interface ClassAnalyticsProps {
  classId: string;
  performanceData: ClassPerformanceMetrics;
  weaknessPatterns: WeaknessPattern[];
  interventionRecommendations: InterventionRecommendation[];
  onRefresh?: () => Promise<void>;
  onExportReport?: (format: 'pdf' | 'csv' | 'excel') => void;
  onInterventionAction?: (recommendationId: string, action: string) => void;
}

type TimeRange = '7d' | '30d' | '90d' | '1y';
type AnalyticsView = 'overview' | 'performance' | 'engagement' | 'weaknesses' | 'interventions';

const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#6366F1',
  gray: '#6B7280'
};

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899'];

export const ClassAnalytics: React.FC<ClassAnalyticsProps> = ({
  classId,
  performanceData,
  weaknessPatterns,
  interventionRecommendations,
  onRefresh,
  onExportReport,
  onInterventionAction
}) => {
  const [activeView, setActiveView] = useState<AnalyticsView>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle manual refresh
  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      await onRefresh();
    } catch (error) {
      console.error('Failed to refresh analytics:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Calculate key metrics
  const keyMetrics = useMemo(() => {
    const { engagementMetrics, timeAnalytics } = performanceData;
    
    return {
      totalStudents: Object.values(engagementMetrics.streakDistribution).reduce((a, b) => a + b, 0),
      averageScore: Math.round(performanceData.averageScore),
      completionRate: Math.round(performanceData.completionRate),
      averageStudyTime: Math.round(timeAnalytics.averageStudyTime / 60), // Convert to hours
      activeStudents: engagementMetrics.dailyActiveUsers,
      atRiskStudents: weaknessPatterns.filter(p => p.severity === 'high').length,
      improvingStudents: timeAnalytics.monthlyComparison.growthRate > 0 ? 
        Math.round(timeAnalytics.monthlyComparison.currentMonth.activeStudents * 0.3) : 0,
      needsAttention: interventionRecommendations.filter(r => r.priority === 'high').length
    };
  }, [performanceData, weaknessPatterns, interventionRecommendations]);

  // Prepare chart data
  const weeklyTrendData = useMemo(() => {
    return performanceData.timeAnalytics.weeklyTrends.map(trend => ({
      week: trend.week,
      averageScore: trend.averageScore,
      studyTime: Math.round(trend.totalTime / 60),
      activeStudents: trend.activeStudents
    }));
  }, [performanceData.timeAnalytics.weeklyTrends]);

  const subjectPerformanceData = useMemo(() => {
    return performanceData.subjectPerformance.map(subject => ({
      subject: subject.subject,
      averageScore: subject.averageScore,
      completionRate: subject.completionRate
    }));
  }, [performanceData.subjectPerformance]);

  const bloomLevelData = useMemo(() => {
    const bloomData = performanceData.subjectPerformance[0]?.bloomLevelDistribution;
    if (!bloomData) return [];
    
    return [
      { level: 'Remember', value: bloomData.level1, color: PIE_COLORS[0] },
      { level: 'Understand', value: bloomData.level2, color: PIE_COLORS[1] },
      { level: 'Apply', value: bloomData.level3, color: PIE_COLORS[2] },
      { level: 'Analyze', value: bloomData.level4, color: PIE_COLORS[3] },
      { level: 'Evaluate', value: bloomData.level5, color: PIE_COLORS[4] },
      { level: 'Create', value: bloomData.level6, color: PIE_COLORS[5] }
    ];
  }, [performanceData.subjectPerformance]);

  const streakDistributionData = useMemo(() => {
    const streaks = performanceData.engagementMetrics.streakDistribution;
    return [
      { range: '0-7 days', students: streaks['0-7'], color: COLORS.danger },
      { range: '8-14 days', students: streaks['8-14'], color: COLORS.warning },
      { range: '15-30 days', students: streaks['15-30'], color: COLORS.info },
      { range: '30+ days', students: streaks['30+'], color: COLORS.success }
    ];
  }, [performanceData.engagementMetrics.streakDistribution]);

  const renderOverviewView = () => (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-2xl font-bold text-gray-900">{keyMetrics.averageScore}%</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            {performanceData.timeAnalytics.monthlyComparison.growthRate > 0 ? (
              <>
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-green-600">
                  +{performanceData.timeAnalytics.monthlyComparison.growthRate}% from last month
                </span>
              </>
            ) : (
              <>
                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                <span className="text-red-600">
                  {performanceData.timeAnalytics.monthlyComparison.growthRate}% from last month
                </span>
              </>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Students</p>
              <p className="text-2xl font-bold text-gray-900">{keyMetrics.activeStudents}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            of {keyMetrics.totalStudents} total students
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Study Time</p>
              <p className="text-2xl font-bold text-gray-900">{keyMetrics.averageStudyTime}h</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            per week per student
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">At Risk</p>
              <p className="text-2xl font-bold text-gray-900">{keyMetrics.atRiskStudents}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            students need attention
          </div>
        </div>
      </div>

      {/* Performance Trend Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={weeklyTrendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="averageScore"
              stackId="1"
              stroke={COLORS.primary}
              fill={COLORS.primary}
              fillOpacity={0.6}
              name="Average Score (%)"
            />
            <Area
              type="monotone"
              dataKey="activeStudents"
              stackId="2"
              stroke={COLORS.success}
              fill={COLORS.success}
              fillOpacity={0.6}
              name="Active Students"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Subject Performance and Engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Performance</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={subjectPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="averageScore" fill={COLORS.primary} name="Average Score (%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Streak Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={streakDistributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ range, students }) => `${range}: ${students}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="students"
              >
                {streakDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderPerformanceView = () => (
    <div className="space-y-6">
      {/* Detailed Subject Analysis */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Subject Analysis</h3>
        <div className="space-y-4">
          {performanceData.subjectPerformance.map((subject, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">{subject.subject}</h4>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    Avg Score: <span className="font-semibold">{subject.averageScore}%</span>
                  </span>
                  <span className="text-sm text-gray-600">
                    Completion: <span className="font-semibold">{subject.completionRate}%</span>
                  </span>
                </div>
              </div>
              
              {/* Topic Performance */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {subject.topicPerformance.map((topic, topicIndex) => (
                  <div key={topicIndex} className="bg-gray-50 p-3 rounded">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{topic.topic}</span>
                      <span className={`text-sm font-semibold ${
                        topic.averageScore >= 80 ? 'text-green-600' :
                        topic.averageScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {topic.averageScore}%
                      </span>
                    </div>
                    <div className="mt-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            topic.averageScore >= 80 ? 'bg-green-500' :
                            topic.averageScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${topic.completionRate}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 mt-1">
                        {topic.completionRate}% completion
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bloom's Taxonomy Distribution */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bloom's Taxonomy Performance</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={bloomLevelData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="level" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill={COLORS.info} name="Performance Score" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderWeaknessesView = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Identified Weakness Patterns</h3>
        <div className="space-y-4">
          {weaknessPatterns.map((pattern, index) => (
            <div key={index} className={`border-l-4 p-4 rounded-r-lg ${
              pattern.severity === 'high' ? 'border-red-500 bg-red-50' :
              pattern.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
              'border-blue-500 bg-blue-50'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-2">{pattern.pattern}</h4>
                  <p className="text-sm text-gray-600 mb-3">{pattern.recommendedIntervention}</p>
                  
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {pattern.affectedStudents} students affected
                    </span>
                    <span className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-1" />
                      {pattern.subjects.join(', ')}
                    </span>
                  </div>
                  
                  <div className="mt-2">
                    <span className="text-xs text-gray-500">Topics: </span>
                    <span className="text-xs text-gray-700">{pattern.topics.join(', ')}</span>
                  </div>
                </div>
                
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  pattern.severity === 'high' ? 'bg-red-100 text-red-800' :
                  pattern.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {pattern.severity.toUpperCase()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderInterventionsView = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Intervention Recommendations</h3>
        <div className="space-y-4">
          {interventionRecommendations.map((recommendation, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-medium text-gray-900">{recommendation.studentName}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      recommendation.priority === 'high' ? 'bg-red-100 text-red-800' :
                      recommendation.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {recommendation.priority.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      recommendation.estimatedImpact === 'high' ? 'bg-green-100 text-green-800' :
                      recommendation.estimatedImpact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {recommendation.estimatedImpact} impact
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{recommendation.description}</p>
                  
                  <div className="mb-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-1">Suggested Actions:</h5>
                    <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                      {recommendation.suggestedActions.map((action, actionIndex) => (
                        <li key={actionIndex}>{action}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>Timeframe: {recommendation.timeframe}</span>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => onInterventionAction?.(recommendation.id, 'implement')}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    Implement
                  </button>
                  <button
                    onClick={() => onInterventionAction?.(recommendation.id, 'dismiss')}
                    className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
              
              {recommendation.resources.length > 0 && (
                <div className="border-t pt-3">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Recommended Resources:</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {recommendation.resources.map((resource, resourceIndex) => (
                      <a
                        key={resourceIndex}
                        href={resource.url}
                        className="flex items-center p-2 bg-gray-50 rounded text-sm hover:bg-gray-100"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <BookOpen className="h-4 w-4 mr-2 text-gray-500" />
                        <div>
                          <div className="font-medium text-gray-900">{resource.title}</div>
                          <div className="text-gray-500">{resource.type}</div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Class Analytics</h2>
            <p className="text-sm text-gray-600 mt-1">
              Comprehensive insights into class performance and learning patterns
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            
            {onRefresh && (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`p-2 rounded-md text-gray-600 hover:bg-gray-100 ${
                  isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title="Refresh analytics"
              >
                <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
            
            {onExportReport && (
              <div className="relative">
                <button className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="mt-6 border-b">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: Target },
              { id: 'performance', label: 'Performance', icon: TrendingUp },
              { id: 'engagement', label: 'Engagement', icon: Users },
              { id: 'weaknesses', label: 'Weaknesses', icon: AlertTriangle },
              { id: 'interventions', label: 'Interventions', icon: CheckCircle }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveView(id as AnalyticsView)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      {activeView === 'overview' && renderOverviewView()}
      {activeView === 'performance' && renderPerformanceView()}
      {activeView === 'engagement' && renderOverviewView()} {/* Reuse overview for now */}
      {activeView === 'weaknesses' && renderWeaknessesView()}
      {activeView === 'interventions' && renderInterventionsView()}
    </div>
  );
};

export default ClassAnalytics;