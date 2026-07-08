import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  X, 
  Filter,
  MoreVertical,
  User,
  BookOpen,
  Calendar,
  TrendingDown
} from 'lucide-react';
import { TeacherNotification } from '../../types/teacher';

interface NotificationCenterProps {
  notifications: TeacherNotification[];
  onNotificationClick: (notification: TeacherNotification) => void;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (notificationId: string) => void;
}

type NotificationFilter = 'all' | 'unread' | 'high_priority' | 'student_risk' | 'performance_drop' | 'achievement' | 'system';

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onNotificationClick,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification
}) => {
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read;
      case 'high_priority':
        return notification.priority === 'high';
      case 'student_risk':
        return notification.type === 'student_risk';
      case 'performance_drop':
        return notification.type === 'performance_drop';
      case 'achievement':
        return notification.type === 'achievement';
      case 'system':
        return notification.type === 'system';
      default:
        return true;
    }
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const highPriorityCount = notifications.filter(n => n.priority === 'high' && !n.read).length;

  const getNotificationIcon = (type: string, priority: string) => {
    const iconClass = priority === 'high' ? 'text-red-500' : 
                     priority === 'medium' ? 'text-yellow-500' : 'text-blue-500';
    
    switch (type) {
      case 'student_risk':
        return <AlertTriangle className={`h-5 w-5 ${iconClass}`} />;
      case 'performance_drop':
        return <TrendingDown className={`h-5 w-5 ${iconClass}`} />;
      case 'achievement':
        return <CheckCircle className={`h-5 w-5 ${iconClass}`} />;
      case 'assessment_due':
        return <Calendar className={`h-5 w-5 ${iconClass}`} />;
      case 'system':
        return <Info className={`h-5 w-5 ${iconClass}`} />;
      default:
        return <Bell className={`h-5 w-5 ${iconClass}`} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      case 'low': return 'border-l-blue-500 bg-blue-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Bell className="h-6 w-6 text-gray-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                {unreadCount} unread
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Mark all as read
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-md ${showFilters ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Filter className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Priority Alerts */}
        {highPriorityCount > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-sm font-medium text-red-800">
                {highPriorityCount} high priority alert{highPriorityCount > 1 ? 's' : ''} require immediate attention
              </span>
            </div>
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'All' },
                { key: 'unread', label: 'Unread' },
                { key: 'high_priority', label: 'High Priority' },
                { key: 'student_risk', label: 'Student Risk' },
                { key: 'performance_drop', label: 'Performance' },
                { key: 'achievement', label: 'Achievements' },
                { key: 'system', label: 'System' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as NotificationFilter)}
                  className={`px-3 py-1 text-sm rounded-full ${
                    filter === key
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Notification List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'all' ? 'You\'re all caught up!' : 'No notifications match your filter.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`border-l-4 ${getPriorityColor(notification.priority)} ${
                !notification.read ? 'bg-blue-50' : 'bg-white'
              } hover:bg-gray-50 transition-colors`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start flex-1">
                    <div className="flex-shrink-0 mr-3">
                      {getNotificationIcon(notification.type, notification.priority)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={`text-sm font-medium ${
                          !notification.read ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                        </h4>
                        <span className="text-xs text-gray-500 ml-2">
                          {formatTimeAgo(notification.timestamp)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {notification.message}
                      </p>
                      
                      {/* Student/Class Info */}
                      {(notification.studentName || notification.className) && (
                        <div className="flex items-center text-xs text-gray-500 mb-2">
                          {notification.studentName && (
                            <div className="flex items-center mr-4">
                              <User className="h-3 w-3 mr-1" />
                              {notification.studentName}
                            </div>
                          )}
                          {notification.className && (
                            <div className="flex items-center">
                              <BookOpen className="h-3 w-3 mr-1" />
                              {notification.className}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Action Required Badge */}
                      {notification.actionRequired && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                          Action Required
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-1 ml-2">
                    {!notification.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsRead(notification.id);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Mark as read"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNotification(notification.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete notification"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNotificationClick(notification);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="More options"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;