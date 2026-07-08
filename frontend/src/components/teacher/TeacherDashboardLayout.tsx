import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BarChart3, 
  BookOpen, 
  Bell, 
  Settings, 
  Search,
  Filter,
  Plus,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { TeacherDashboardData, ClassOverview, TeacherNotification } from '../../types/teacher';

interface TeacherDashboardLayoutProps {
  teacherData: TeacherDashboardData;
  onClassSelect: (classId: string) => void;
  onNotificationClick: (notification: TeacherNotification) => void;
  children: React.ReactNode;
}

export const TeacherDashboardLayout: React.FC<TeacherDashboardLayoutProps> = ({
  teacherData,
  onClassSelect,
  onNotificationClick,
  children
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [filteredClasses, setFilteredClasses] = useState<ClassOverview[]>(teacherData.classes);

  useEffect(() => {
    const filtered = teacherData.classes.filter(cls =>
      cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.subject.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredClasses(filtered);
  }, [searchQuery, teacherData.classes]);

  const handleClassSelect = (classId: string) => {
    setSelectedClass(classId);
    onClassSelect(classId);
  };

  const unreadNotifications = teacherData.notifications.filter(n => !n.read);
  const highPriorityNotifications = unreadNotifications.filter(n => n.priority === 'high');

  const getClassRiskColor = (averagePerformance: number, engagementRate: number) => {
    if (averagePerformance < 50 || engagementRate < 30) return 'text-red-600 bg-red-50';
    if (averagePerformance < 70 || engagementRate < 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <h1 className="ml-3 text-2xl font-bold text-gray-900">
                শিক্ষাসাথী - Teacher Dashboard
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Quick Actions */}
              <button className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Assessment
              </button>
              
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                >
                  <Bell className="h-6 w-6" />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadNotifications.length}
                    </span>
                  )}
                </button>
                
                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div className="p-4 border-b">
                      <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
                      {highPriorityNotifications.length > 0 && (
                        <p className="text-sm text-red-600 mt-1">
                          {highPriorityNotifications.length} high priority alerts
                        </p>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {teacherData.notifications.slice(0, 10).map((notification) => (
                        <div
                          key={notification.id}
                          onClick={() => onNotificationClick(notification)}
                          className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                            !notification.read ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-start">
                            <div className={`flex-shrink-0 ${
                              notification.priority === 'high' ? 'text-red-500' :
                              notification.priority === 'medium' ? 'text-yellow-500' : 'text-green-500'
                            }`}>
                              {notification.actionRequired ? (
                                <AlertTriangle className="h-5 w-5" />
                              ) : (
                                <CheckCircle className="h-5 w-5" />
                              )}
                            </div>
                            <div className="ml-3 flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 mt-2">
                                {new Date(notification.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 border-t">
                      <button className="text-sm text-blue-600 hover:text-blue-800">
                        View all notifications
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* User Menu */}
              <div className="relative group">
                <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                    T
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700">Teacher</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown Menu */}
                <div className="hidden group-hover:block absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                  <a href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                    👤 Profile Settings
                  </a>
                  <a href="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                    ⚙️ Account Settings
                  </a>
                  <div className="border-t border-gray-200 my-2"></div>
                  <a href="/" className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    🚪 Sign Out
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border">
              {/* Class Overview Header */}
              <div className="p-6 border-b">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">My Classes</h2>
                  <span className="text-sm text-gray-500">
                    {teacherData.classes.length} classes
                  </span>
                </div>
                
                {/* Search and Filter */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search classes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button className="flex items-center text-sm text-gray-600 hover:text-gray-900">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter by performance
                  </button>
                </div>
              </div>

              {/* Class List */}
              <div className="max-h-96 overflow-y-auto">
                {filteredClasses.map((classItem) => (
                  <div
                    key={classItem.id}
                    onClick={() => handleClassSelect(classItem.id)}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                      selectedClass === classItem.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{classItem.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        getClassRiskColor(classItem.averagePerformance, classItem.engagementRate)
                      }`}>
                        {classItem.averagePerformance >= 70 && classItem.engagementRate >= 60 ? 'Good' :
                         classItem.averagePerformance >= 50 && classItem.engagementRate >= 30 ? 'Needs Attention' : 'At Risk'}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Grade {classItem.grade} • {classItem.subject}</span>
                        <span>{classItem.studentCount} students</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Score: {classItem.averagePerformance}%</span>
                        <span>Engagement: {classItem.engagementRate}%</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Last activity: {new Date(classItem.lastActivity).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Stats */}
              <div className="p-4 border-t bg-gray-50">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {teacherData.classes.reduce((sum, cls) => sum + cls.studentCount, 0)}
                    </div>
                    <div className="text-xs text-gray-600">Total Students</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(teacherData.classes.reduce((sum, cls) => sum + cls.averagePerformance, 0) / teacherData.classes.length)}%
                    </div>
                    <div className="text-xs text-gray-600">Avg Performance</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Tools */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
              <h3 className="font-medium text-gray-900 mb-3">Quick Tools</h3>
              <div className="space-y-2">
                <button className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                  <BarChart3 className="h-4 w-4 mr-3" />
                  Performance Analytics
                </button>
                <button className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                  <Users className="h-4 w-4 mr-3" />
                  Student Management
                </button>
                <button className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                  <Calendar className="h-4 w-4 mr-3" />
                  Schedule Assessment
                </button>
                <button className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                  <TrendingUp className="h-4 w-4 mr-3" />
                  Progress Reports
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboardLayout;