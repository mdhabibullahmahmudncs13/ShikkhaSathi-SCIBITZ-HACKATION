import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  TrendingUp, 
  Users, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Settings,
  Play,
  Pause,
  RefreshCw,
  FileText,
  Send
} from 'lucide-react';
import { 
  ProgressReport, 
  WeeklySummary, 
  PerformanceAlert,
  NotificationSettings,
  ClassOverview,
  StudentSummary
} from '../../types/teacher';

interface NotificationDashboardProps {
  classes: ClassOverview[];
  onGenerateProgressReport: (studentId: string, days: number) => Promise<ProgressReport>;
  onSendProgressReport: (studentId: string, days: number, includeParents: boolean) => Promise<void>;
  onCheckPerformanceAlerts: (classIds: string[], threshold: number, days: number) => Promise<PerformanceAlert[]>;
  onGenerateWeeklySummary: (classId: string) => Promise<WeeklySummary>;
  onSendWeeklySummary: (classId: string, includeParents: boolean) => Promise<void>;
  notificationSettings: NotificationSettings;
  onUpdateSettings: (settings: NotificationSettings) => Promise<void>;
}

const NotificationDashboard: React.FC<NotificationDashboardProps> = ({
  classes,
  onGenerateProgressReport,
  onSendProgressReport,
  onCheckPerformanceAlerts,
  onGenerateWeeklySummary,
  onSendWeeklySummary,
  notificationSettings,
  onUpdateSettings
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'alerts' | 'summaries' | 'settings'>('overview');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [progressReports, setProgressReports] = useState<ProgressReport[]>([]);
  const [performanceAlerts, setPerformanceAlerts] = useState<PerformanceAlert[]>([]);
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>([]);

  useEffect(() => {
    if (classes.length > 0 && !selectedClass) {
      setSelectedClass(classes[0].id);
    }
  }, [classes, selectedClass]);

  const handleGenerateProgressReport = async (studentId: string, days: number = 7) => {
    setLoading(true);
    try {
      const report = await onGenerateProgressReport(studentId, days);
      setProgressReports(prev => [report, ...prev.filter(r => r.studentId !== studentId)]);
    } catch (error) {
      console.error('Failed to generate progress report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendProgressReport = async (studentId: string, days: number = 7, includeParents: boolean = true) => {
    setLoading(true);
    try {
      await onSendProgressReport(studentId, days, includeParents);
    } catch (error) {
      console.error('Failed to send progress report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAlerts = async () => {
    if (!selectedClass) return;
    
    setLoading(true);
    try {
      const alerts = await onCheckPerformanceAlerts(
        [selectedClass], 
        notificationSettings.performanceAlerts.threshold,
        notificationSettings.performanceAlerts.daysToCheck
      );
      setPerformanceAlerts(alerts);
    } catch (error) {
      console.error('Failed to check performance alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWeeklySummary = async (classId: string) => {
    setLoading(true);
    try {
      const summary = await onGenerateWeeklySummary(classId);
      setWeeklySummaries(prev => [summary, ...prev.filter(s => s.classId !== classId)]);
    } catch (error) {
      console.error('Failed to generate weekly summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedClassData = () => {
    return classes.find(c => c.id === selectedClass);
  };

  const getAtRiskStudents = () => {
    const classData = getSelectedClassData();
    if (!classData) return [];
    return classData.students.filter(s => s.riskLevel === 'high' || s.riskLevel === 'medium');
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'progress', label: 'Progress Reports', icon: FileText },
    { id: 'alerts', label: 'Performance Alerts', icon: AlertTriangle },
    { id: 'summaries', label: 'Weekly Summaries', icon: Calendar },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notification Dashboard</h1>
          <p className="text-gray-600">Manage automated notifications and reports</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {classes.map((classData) => (
              <option key={classData.id} value={classData.id}>
                {classData.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Stats Cards */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{classes.length}</div>
                <div className="text-sm text-gray-600">Active Classes</div>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {classes.reduce((total, c) => total + c.studentCount, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Students</div>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{getAtRiskStudents().length}</div>
                <div className="text-sm text-gray-600">At-Risk Students</div>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{progressReports.length}</div>
                <div className="text-sm text-gray-600">Reports Generated</div>
              </div>
              <FileText className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          {/* Recent Activity */}
          <div className="md:col-span-2 lg:col-span-4 bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Recent Notifications</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {progressReports.slice(0, 3).map((report) => (
                  <div key={report.studentId} className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">Progress report generated for {report.studentName}</div>
                      <div className="text-xs text-gray-500">
                        {report.generatedAt.toLocaleDateString()} • {report.reportPeriod.days} days
                      </div>
                    </div>
                  </div>
                ))}
                {performanceAlerts.slice(0, 2).map((alert) => (
                  <div key={alert.studentId} className="flex items-center space-x-3">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">Performance alert for {alert.studentName}</div>
                      <div className="text-xs text-gray-500">
                        Average: {alert.averageScore}% (Threshold: {alert.threshold}%)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'progress' && (
        <div className="space-y-6">
          {/* Progress Report Controls */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Progress Reports</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Student</label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a student</option>
                  {getSelectedClassData()?.students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end space-x-2">
                <button
                  onClick={() => selectedStudent && handleGenerateProgressReport(selectedStudent)}
                  disabled={!selectedStudent || loading}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText className="w-4 h-4" />
                  <span>Generate Report</span>
                </button>
                <button
                  onClick={() => selectedStudent && handleSendProgressReport(selectedStudent)}
                  disabled={!selectedStudent || loading}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Report</span>
                </button>
              </div>
            </div>
          </div>

          {/* Generated Reports */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Recent Progress Reports</h3>
            </div>
            <div className="divide-y">
              {progressReports.map((report) => (
                <div key={report.studentId} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{report.studentName}</h4>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">XP Gained:</span>
                          <span className="ml-2 font-medium">{report.metrics.totalXpGained}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Average Score:</span>
                          <span className="ml-2 font-medium">{report.metrics.averageScore}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Topics Completed:</span>
                          <span className="ml-2 font-medium">{report.metrics.topicsCompleted}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Current Streak:</span>
                          <span className="ml-2 font-medium">{report.metrics.currentStreak} days</span>
                        </div>
                      </div>
                      {report.weakAreas.length > 0 && (
                        <div className="mt-3">
                          <span className="text-sm text-gray-500">Weak Areas:</span>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {report.weakAreas.map((area, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800"
                              >
                                {area.subject}: {area.averageScore}%
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {report.generatedAt.toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-6">
          {/* Alert Controls */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Performance Alerts</h3>
              <button
                onClick={handleCheckAlerts}
                disabled={loading}
                className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Check for Alerts</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Threshold:</span>
                <span className="ml-2 font-medium">{notificationSettings.performanceAlerts.threshold}%</span>
              </div>
              <div>
                <span className="text-gray-500">Check Period:</span>
                <span className="ml-2 font-medium">{notificationSettings.performanceAlerts.daysToCheck} days</span>
              </div>
              <div>
                <span className="text-gray-500">Include Parents:</span>
                <span className="ml-2 font-medium">
                  {notificationSettings.performanceAlerts.includeParents ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Active Alerts */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Active Performance Alerts</h3>
            </div>
            <div className="divide-y">
              {performanceAlerts.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p>No performance alerts at this time</p>
                  <p className="text-sm">Students are performing above the threshold</p>
                </div>
              ) : (
                performanceAlerts.map((alert) => (
                  <div key={alert.studentId} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-5 h-5 text-orange-500" />
                          <h4 className="font-medium text-gray-900">{alert.studentName}</h4>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          Average Score: <span className="font-medium text-orange-600">{alert.averageScore}%</span>
                          <span className="text-gray-400 mx-2">•</span>
                          Threshold: {alert.threshold}%
                        </div>
                        <div className="mt-3">
                          <span className="text-sm text-gray-500">Recent Performance:</span>
                          <div className="mt-1 space-y-1">
                            {alert.recentPerformance.slice(0, 3).map((perf, index) => (
                              <div key={index} className="text-xs text-gray-600">
                                {perf.subject}: {perf.score}% ({perf.date.toLocaleDateString()})
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {alert.alertGeneratedAt.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'summaries' && (
        <div className="space-y-6">
          {/* Summary Controls */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Weekly Class Summaries</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => selectedClass && handleGenerateWeeklySummary(selectedClass)}
                  disabled={!selectedClass || loading}
                  className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Generate Summary</span>
                </button>
                <button
                  onClick={() => selectedClass && onSendWeeklySummary(selectedClass, true)}
                  disabled={!selectedClass || loading}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Summary</span>
                </button>
              </div>
            </div>
          </div>

          {/* Generated Summaries */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Recent Weekly Summaries</h3>
            </div>
            <div className="divide-y">
              {weeklySummaries.map((summary) => (
                <div key={summary.classId} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{summary.className}</h4>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Engagement:</span>
                          <span className="ml-2 font-medium">{summary.metrics.engagementRate}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Class Average:</span>
                          <span className="ml-2 font-medium">{summary.metrics.classAverage}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Active Students:</span>
                          <span className="ml-2 font-medium">
                            {summary.metrics.activeStudents}/{summary.metrics.totalStudents}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Total Attempts:</span>
                          <span className="ml-2 font-medium">{summary.metrics.totalAttempts}</span>
                        </div>
                      </div>
                      {summary.topPerformers.length > 0 && (
                        <div className="mt-3">
                          <span className="text-sm text-gray-500">Top Performers:</span>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {summary.topPerformers.slice(0, 3).map((performer, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800"
                              >
                                {performer.name}: {performer.averageScore}%
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {summary.generatedAt.toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Notification Settings</h3>
          
          <div className="space-y-8">
            {/* Progress Reports Settings */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Progress Reports</h4>
              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={notificationSettings.progressReports.enabled}
                    onChange={(e) => onUpdateSettings({
                      ...notificationSettings,
                      progressReports: {
                        ...notificationSettings.progressReports,
                        enabled: e.target.checked
                      }
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">Enable automated progress reports</span>
                </label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                    <select
                      value={notificationSettings.progressReports.frequency}
                      onChange={(e) => onUpdateSettings({
                        ...notificationSettings,
                        progressReports: {
                          ...notificationSettings.progressReports,
                          frequency: e.target.value as 'weekly' | 'monthly'
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={notificationSettings.progressReports.includeParents}
                        onChange={(e) => onUpdateSettings({
                          ...notificationSettings,
                          progressReports: {
                            ...notificationSettings.progressReports,
                            includeParents: e.target.checked
                          }
                        })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">Include parents</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Alerts Settings */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Performance Alerts</h4>
              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={notificationSettings.performanceAlerts.enabled}
                    onChange={(e) => onUpdateSettings({
                      ...notificationSettings,
                      performanceAlerts: {
                        ...notificationSettings.performanceAlerts,
                        enabled: e.target.checked
                      }
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">Enable performance alerts</span>
                </label>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Threshold (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={notificationSettings.performanceAlerts.threshold}
                      onChange={(e) => onUpdateSettings({
                        ...notificationSettings,
                        performanceAlerts: {
                          ...notificationSettings.performanceAlerts,
                          threshold: parseInt(e.target.value)
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Check Period (days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={notificationSettings.performanceAlerts.daysToCheck}
                      onChange={(e) => onUpdateSettings({
                        ...notificationSettings,
                        performanceAlerts: {
                          ...notificationSettings.performanceAlerts,
                          daysToCheck: parseInt(e.target.value)
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={notificationSettings.performanceAlerts.includeParents}
                        onChange={(e) => onUpdateSettings({
                          ...notificationSettings,
                          performanceAlerts: {
                            ...notificationSettings.performanceAlerts,
                            includeParents: e.target.checked
                          }
                        })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">Include parents</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Summaries Settings */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Weekly Summaries</h4>
              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={notificationSettings.weeklySummaries.enabled}
                    onChange={(e) => onUpdateSettings({
                      ...notificationSettings,
                      weeklySummaries: {
                        ...notificationSettings.weeklySummaries,
                        enabled: e.target.checked
                      }
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">Enable weekly summaries</span>
                </label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Day of Week</label>
                    <select
                      value={notificationSettings.weeklySummaries.dayOfWeek}
                      onChange={(e) => onUpdateSettings({
                        ...notificationSettings,
                        weeklySummaries: {
                          ...notificationSettings.weeklySummaries,
                          dayOfWeek: parseInt(e.target.value)
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="0">Sunday</option>
                      <option value="1">Monday</option>
                      <option value="2">Tuesday</option>
                      <option value="3">Wednesday</option>
                      <option value="4">Thursday</option>
                      <option value="5">Friday</option>
                      <option value="6">Saturday</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={notificationSettings.weeklySummaries.includeParents}
                        onChange={(e) => onUpdateSettings({
                          ...notificationSettings,
                          weeklySummaries: {
                            ...notificationSettings.weeklySummaries,
                            includeParents: e.target.checked
                          }
                        })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">Include parents</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDashboard;