import React, { useState, useEffect } from 'react';
import { 
  User, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Award, 
  Target,
  AlertTriangle,
  CheckCircle,
  BookOpen,
  Calendar,
  MessageCircle,
  Mail
} from 'lucide-react';
import { StudentSummary, InterventionRecommendation } from '../../types/teacher';
import { useTeacherAnalytics } from '../../hooks/useTeacherAnalytics';

interface StudentAnalyticsProps {
  student: StudentSummary;
  classId: string;
  onContactStudent?: (studentId: string, method: 'email' | 'message') => void;
  onAssignIntervention?: (studentId: string, intervention: InterventionRecommendation) => void;
}

export const StudentAnalytics: React.FC<StudentAnalyticsProps> = ({
  student,
  classId,
  onContactStudent,
  onAssignIntervention
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'week' | 'month' | 'quarter'>('month');
  const [showInterventions, setShowInterventions] = useState(false);

  const {
    studentAnalytics,
    loading,
    error,
    loadStudentAnalytics,
    contactStudent,
    assignIntervention,
    clearError
  } = useTeacherAnalytics(classId, false);

  // Load student analytics when component mounts or time range changes
  useEffect(() => {
    loadStudentAnalytics(student.id, selectedTimeRange);
  }, [student.id, selectedTimeRange, loadStudentAnalytics]);

  const handleContactStudent = async (method: 'email' | 'message') => {
    try {
      await contactStudent(student.id, method);
      if (onContactStudent) {
        onContactStudent(student.id, method);
      }
    } catch (error) {
      console.error('Failed to contact student:', error);
    }
  };

  const handleAssignIntervention = async (intervention: InterventionRecommendation) => {
    try {
      await assignIntervention(student.id, intervention);
      if (onAssignIntervention) {
        onAssignIntervention(student.id, intervention);
      }
    } catch (error) {
      console.error('Failed to assign intervention:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading student analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <h3 className="text-red-800 font-medium">Error Loading Student Analytics</h3>
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

  // Use real analytics data from props, with proper error handling
  const analytics = studentAnalytics;

  if (!analytics) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">
          <p>No analytics data available for this student</p>
        </div>
      </div>
    );
  }



  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'text-red-600 bg-red-100 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getPerformanceTrend = () => {
    const recent = analytics.performanceHistory.slice(-3);
    const earlier = analytics.performanceHistory.slice(-6, -3);
    const recentAvg = recent.reduce((sum: number, item: any) => sum + item.score, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum: number, item: any) => sum + item.score, 0) / earlier.length;
    
    if (recentAvg > earlierAvg + 2) return { trend: 'up', color: 'text-green-600' };
    if (recentAvg < earlierAvg - 2) return { trend: 'down', color: 'text-red-600' };
    return { trend: 'stable', color: 'text-gray-600' };
  };

  const performanceTrend = getPerformanceTrend();

  const getBloomLevelColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Student Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <div className="h-16 w-16 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-gray-600" />
            </div>
            <div className="ml-4">
              <h2 className="text-xl font-semibold text-gray-900">{student.name}</h2>
              <p className="text-sm text-gray-600">{student.email}</p>
              <div className="flex items-center mt-2 space-x-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRiskLevelColor(student.riskLevel)}`}>
                  {student.riskLevel === 'high' && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {student.riskLevel === 'medium' && <Clock className="h-3 w-3 mr-1" />}
                  {student.riskLevel === 'low' && <CheckCircle className="h-3 w-3 mr-1" />}
                  {student.riskLevel} risk
                </span>
                <span className="text-sm text-gray-600">
                  Level {student.currentLevel} • {student.totalXP} XP
                </span>
                <span className="text-sm text-gray-600">
                  {student.currentStreak} day streak
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleContactStudent('message')}
              className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Message
            </button>
            <button
              onClick={() => handleContactStudent('email')}
              className="flex items-center px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <div className="flex items-center">
                <p className="text-2xl font-bold text-gray-900">{student.averageScore}%</p>
                {performanceTrend.trend === 'up' && <TrendingUp className={`h-5 w-5 ml-2 ${performanceTrend.color}`} />}
                {performanceTrend.trend === 'down' && <TrendingDown className={`h-5 w-5 ml-2 ${performanceTrend.color}`} />}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Study Time</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(student.timeSpent / 60)}h</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Current Streak</p>
              <p className="text-2xl font-bold text-gray-900">{student.currentStreak}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Last Active</p>
              <p className="text-lg font-bold text-gray-900">
                {new Date(student.lastActive).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance History Chart */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Performance History</h3>
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
          </select>
        </div>
        
        <div className="h-64 flex items-end space-x-2">
          {analytics.performanceHistory.map((item: any, index: number) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-blue-500 rounded-t"
                style={{ height: `${(item.score / 100) * 200}px` }}
                title={`${item.score}% on ${item.date}`}
              />
              <div className="text-xs text-gray-600 mt-2 transform -rotate-45">
                {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Subject Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Performance</h3>
        <div className="space-y-4">
          {analytics.subjectBreakdown.map((subject: any) => (
            <div key={subject.subject} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <BookOpen className="h-5 w-5 text-gray-600 mr-2" />
                  <h4 className="font-medium text-gray-900">{subject.subject}</h4>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  subject.averageScore >= 80 ? 'bg-green-100 text-green-800' :
                  subject.averageScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {subject.averageScore}%
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Progress</p>
                  <p className="font-medium">
                    {subject.completedLessons}/{subject.totalLessons} lessons
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(subject.completedLessons / subject.totalLessons) * 100}%` }}
                    />
                  </div>
                </div>
                
                <div>
                  <p className="text-gray-600">Time Spent</p>
                  <p className="font-medium">{Math.round(subject.timeSpent / 60)}h</p>
                </div>
                
                <div>
                  <p className="text-gray-600">Avg per Lesson</p>
                  <p className="font-medium">{Math.round(subject.timeSpent / subject.completedLessons)}m</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bloom's Taxonomy Progress */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bloom's Taxonomy Progress</h3>
        <div className="space-y-4">
          {Object.entries(analytics.bloomLevelProgress).map(([level, percentage]) => {
            const levelNames = {
              level1: 'Remember',
              level2: 'Understand', 
              level3: 'Apply',
              level4: 'Analyze',
              level5: 'Evaluate',
              level6: 'Create'
            };
            
            const numericPercentage = Number(percentage);
            
            return (
              <div key={level} className="flex items-center">
                <div className="w-20 text-sm text-gray-600">
                  Level {level.slice(-1)}
                </div>
                <div className="w-24 text-sm text-gray-700">
                  {levelNames[level as keyof typeof levelNames]}
                </div>
                <div className="flex-1 mx-4">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${getBloomLevelColor(numericPercentage)}`}
                      style={{ width: `${numericPercentage}%` }}
                    />
                  </div>
                </div>
                <div className="w-12 text-sm font-medium text-gray-900">
                  {numericPercentage}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weak Areas */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Areas Needing Attention</h3>
        {student.weakAreas.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No significant weak areas</h3>
            <p className="mt-1 text-sm text-gray-500">
              Student is performing well across all topics.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {student.weakAreas.map((area, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
                  <div>
                    <p className="font-medium text-red-900">{area.topic}</p>
                    <p className="text-sm text-red-700">
                      {area.subject} • Bloom Level {area.bloomLevel} • {area.attemptsCount} attempts
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-red-900">{area.successRate}%</p>
                  <p className="text-xs text-red-700">success rate</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Intervention Recommendations */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Intervention Recommendations</h3>
          <button
            onClick={() => setShowInterventions(!showInterventions)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showInterventions ? 'Hide' : 'Show'} Details
          </button>
        </div>
        
        {showInterventions && (
          <div className="space-y-4">
            {analytics.interventionRecommendations.map((intervention: any) => (
              <div key={intervention.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{intervention.description}</h4>
                    <div className="flex items-center mt-2 space-x-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        intervention.priority === 'high' ? 'bg-red-100 text-red-800' :
                        intervention.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {intervention.priority} priority
                      </span>
                      <span className="text-sm text-gray-600">
                        {intervention.estimatedImpact} impact • {intervention.timeframe}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAssignIntervention(intervention)}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Assign
                  </button>
                </div>
                
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Suggested Actions:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {intervention.suggestedActions.map((action: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {intervention.resources.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Recommended Resources:</p>
                    <div className="space-y-2">
                      {intervention.resources.map((resource: any, index: number) => (
                        <div key={index} className="flex items-center p-2 bg-gray-50 rounded">
                          <BookOpen className="h-4 w-4 text-gray-600 mr-2" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{resource.title}</p>
                            <p className="text-xs text-gray-600">{resource.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAnalytics;