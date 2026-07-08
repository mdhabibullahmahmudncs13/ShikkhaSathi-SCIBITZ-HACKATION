import React, { useState } from 'react';
import { 
  ParentDashboardData, 
  ChildSummary, 
  ParentNotification 
} from '../../types/parent';
import { 
  User, 
  Bell, 
  Settings, 
  LogOut, 
  ChevronDown,
  Users,
  TrendingUp,
  FileText,
  Award
} from 'lucide-react';

interface ParentDashboardLayoutProps {
  parentData: ParentDashboardData;
  selectedChild: ChildSummary | null;
  onChildSelect: (child: ChildSummary) => void;
  onNotificationClick: (notification: ParentNotification) => void;
  children: React.ReactNode;
}

export const ParentDashboardLayout: React.FC<ParentDashboardLayoutProps> = ({
  parentData,
  selectedChild,
  onChildSelect,
  onNotificationClick,
  children
}) => {
  const [showChildDropdown, setShowChildDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadNotifications = parentData.notifications.filter(n => !n.read);
  const highPriorityNotifications = unreadNotifications.filter(n => n.priority === 'high');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-blue-600">
                  শিক্ষাসাথী
                </h1>
              </div>
              <div className="ml-6">
                <h2 className="text-lg font-medium text-gray-900">
                  Parent Portal
                </h2>
              </div>
            </div>

            {/* Child Selector */}
            <div className="flex items-center space-x-4">
              {parentData.children.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowChildDropdown(!showChildDropdown)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <User className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      {selectedChild ? selectedChild.name : 'Select Child'}
                    </span>
                    <ChevronDown className="h-4 w-4 text-blue-600" />
                  </button>

                  {showChildDropdown && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border z-50">
                      <div className="py-1">
                        {parentData.children.map((child) => (
                          <button
                            key={child.id}
                            onClick={() => {
                              onChildSelect(child);
                              setShowChildDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                              selectedChild?.id === child.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{child.name}</p>
                                <p className="text-xs text-gray-500">
                                  Grade {child.grade} • Level {child.currentLevel}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                {child.riskLevel === 'high' && (
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                )}
                                {child.riskLevel === 'medium' && (
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                )}
                                {child.riskLevel === 'low' && (
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Bell className="h-6 w-6" />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border z-50 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
                        {unreadNotifications.length > 0 && (
                          <span className="text-sm text-blue-600">
                            {unreadNotifications.length} unread
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {parentData.notifications.slice(0, 5).map((notification) => (
                        <div
                          key={notification.id}
                          onClick={() => {
                            onNotificationClick(notification);
                            setShowNotifications(false);
                          }}
                          className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                            !notification.read ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                              notification.priority === 'high' ? 'bg-red-500' :
                              notification.priority === 'medium' ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}></div>
                            <div className="flex-1">
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
                      {parentData.notifications.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                          <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>No notifications yet</p>
                        </div>
                      )}
                    </div>
                    {parentData.notifications.length > 5 && (
                      <div className="p-3 border-t bg-gray-50">
                        <button className="w-full text-sm text-blue-600 hover:text-blue-800">
                          View all notifications
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative group">
                <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-medium">
                    P
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700">Parent</span>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats Bar */}
        {selectedChild && (
          <div className="mb-8 bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedChild.name}'s Overview
              </h3>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  selectedChild.riskLevel === 'low' ? 'bg-green-100 text-green-800' :
                  selectedChild.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {selectedChild.riskLevel === 'low' ? 'On Track' :
                   selectedChild.riskLevel === 'medium' ? 'Needs Attention' :
                   'At Risk'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Award className="h-5 w-5 text-blue-600 mr-1" />
                  <span className="text-sm font-medium text-gray-600">Level</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{selectedChild.currentLevel}</p>
                <p className="text-xs text-gray-500">{selectedChild.totalXP} XP</p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600 mr-1" />
                  <span className="text-sm font-medium text-gray-600">Streak</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{selectedChild.currentStreak}</p>
                <p className="text-xs text-gray-500">days</p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <FileText className="h-5 w-5 text-purple-600 mr-1" />
                  <span className="text-sm font-medium text-gray-600">Avg Score</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{selectedChild.averageScore}%</p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Users className="h-5 w-5 text-orange-600 mr-1" />
                  <span className="text-sm font-medium text-gray-600">This Week</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{Math.round(selectedChild.timeSpentThisWeek / 60)}</p>
                <p className="text-xs text-gray-500">hours</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        {children}
      </main>
    </div>
  );
};