import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, X, Bell, Home, Target, Brain, BookOpen, 
  Trophy, Settings, LogOut, Wifi, WifiOff 
} from 'lucide-react';
import { Notification, StudentProgress } from '../../types/dashboard';
import { useUser } from '../../contexts/UserContext';
import NavItem from './NavItem';

// User Menu Component
const UserMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useUser();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = user?.full_name || user?.first_name || 'User';
  const initials = getInitials(displayName);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
          {initials}
        </div>
        <span className="hidden sm:block text-sm font-medium text-gray-700">
          {displayName.split(' ')[0]} {/* Show first name only */}
        </span>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop to close menu */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
            <div className="px-4 py-2 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
              {user?.grade && (
                <p className="text-xs text-gray-500">Grade {user.grade} • {user.medium}</p>
              )}
            </div>
            <a href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
              👤 Profile Settings
            </a>
            <a href="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
              ⚙️ Account Settings
            </a>
            <div className="border-t border-gray-200 my-2"></div>
            <button 
              onClick={logout}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              🚪 Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
};

interface DashboardLayoutProps {
  children: React.ReactNode;
  studentProgress: StudentProgress;
  notifications: Notification[];
  onNotificationRead: (id: string) => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  studentProgress,
  notifications,
  onNotificationRead
}) => {
  const navigate = useNavigate();
  const { user, logout } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = user?.full_name || user?.first_name || 'User';

  // Listen for online/offline status
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const subjects = [
    { name: 'Mathematics', icon: '📊', color: 'bg-blue-500' },
    { name: 'Physics', icon: '⚛️', color: 'bg-purple-500' },
    { name: 'Chemistry', icon: '🧪', color: 'bg-green-500' },
    { name: 'Biology', icon: '🧬', color: 'bg-red-500' },
    { name: 'Bangla', icon: '📚', color: 'bg-yellow-500' },
    { name: 'English', icon: '🌍', color: 'bg-indigo-500' },
    { name: 'ICT', icon: '💻', color: 'bg-gray-500' },
  ];

  const unreadNotifications = notifications.filter(n => !n.read);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Modern Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex lg:flex-col ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 font-bengali">ShikkhaSathi</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Profile Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
              {getInitials(displayName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
              <p className="text-xs text-gray-500">Level {studentProgress.currentLevel} • {studentProgress.totalXP} XP</p>
            </div>
          </div>
          
          {/* Quick XP Progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Level Progress</span>
              <span>{studentProgress.totalXP % 100}/100 XP</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(studentProgress.totalXP % 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          {/* Main Navigation */}
          <div className="mb-8">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Main</h3>
            <div className="space-y-1">
              <NavItem
                icon={Home}
                label="Dashboard"
                isActive={true}
                onClick={() => navigate('/dashboard')}
              />
              <NavItem
                icon={Target}
                label="Take Quiz"
                onClick={() => navigate('/quiz')}
                color="primary"
              />
              <NavItem
                icon={Brain}
                label="AI Tutor"
                onClick={() => navigate('/chat')}
                color="success"
              />
              <NavItem
                icon={BookOpen}
                label="Learning Arenas"
                onClick={() => navigate('/learning')}
                color="primary"
              />
              <NavItem
                icon={Trophy}
                label="Achievements"
                onClick={() => navigate('/achievements')}
                badge={studentProgress.achievements.filter(a => a.unlockedAt).length}
                color="warning"
              />
            </div>
          </div>

          {/* Subjects */}
          <div>
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Subjects</h3>
            <div className="space-y-2">
              {subjects.map((subject) => {
                const progress = studentProgress.subjectProgress.find(p => p.subject === subject.name);
                const completionPercentage = progress?.completionPercentage || 0;
                
                return (
                  <div
                    key={subject.name}
                    className="px-3 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 cursor-pointer transition-colors"
                    onClick={() => navigate('/quiz')}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg flex-shrink-0">{subject.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium truncate">{subject.name}</span>
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{Math.round(completionPercentage)}%</span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ease-out ${subject.color}`}
                            style={{ width: `${Math.min(Math.max(completionPercentage, 0), 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="space-y-1">
            <NavItem
              icon={Settings}
              label="Settings"
              onClick={() => navigate('/settings')}
            />
            <NavItem
              icon={LogOut}
              label="Sign Out"
              onClick={logout}
              color="danger"
            />
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Modern Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center min-w-0">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 mr-2"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 truncate">Dashboard</h2>
                <p className="text-sm text-gray-500 truncate">Welcome back! Ready to learn?</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 flex-shrink-0">
              {/* Online/Offline Indicator */}
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                isOnline 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isOnline ? 'Online' : 'Offline'}
              </div>

              {/* XP and Level Display */}
              <div className="hidden sm:flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full">
                <Trophy className="w-4 h-4" />
                <span className="text-sm font-medium">Level {studentProgress.currentLevel}</span>
                <span className="text-xs opacity-75">•</span>
                <span className="text-sm">{studentProgress.totalXP} XP</span>
              </div>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 relative transition-colors"
                >
                  <Bell className="w-6 h-6" />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
                    </span>
                  )}
                </button>

                {/* Notifications dropdown */}
                {notificationsOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setNotificationsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                          {unreadNotifications.length > 0 && (
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                              {unreadNotifications.length} new
                            </span>
                          )}
                        </div>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {notifications.slice(0, 5).map((notification) => (
                            <div
                              key={notification.id}
                              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                notification.read 
                                  ? 'bg-gray-50 hover:bg-gray-100' 
                                  : 'bg-blue-50 border-l-4 border-blue-500 hover:bg-blue-100'
                              }`}
                              onClick={() => onNotificationRead(notification.id)}
                            >
                              <div className="flex items-start">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{notification.title}</p>
                                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(notification.timestamp).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {notifications.length === 0 && (
                          <div className="text-center py-8">
                            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-500">No notifications yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* User menu */}
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;