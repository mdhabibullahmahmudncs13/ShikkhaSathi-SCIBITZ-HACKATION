import React, { useState } from 'react';
import { Plus, Megaphone, Bell, BarChart3, Settings } from 'lucide-react';
import AnnouncementComposer from './AnnouncementComposer';
import NotificationDashboard from './NotificationDashboard';
import { useAnnouncements } from '../../hooks/useAnnouncements';
import { ClassOverview } from '../../types/teacher';

interface AnnouncementContainerProps {
  classes: ClassOverview[];
}

const AnnouncementContainer: React.FC<AnnouncementContainerProps> = ({ classes }) => {
  const {
    announcements,
    progressReports,
    performanceAlerts,
    weeklySummaries,
    templates,
    notificationSettings,
    loading,
    error,
    createAnnouncement,
    generateProgressReport,
    sendProgressReport,
    checkPerformanceAlerts,
    generateWeeklySummary,
    sendWeeklySummary,
    updateNotificationSettings
  } = useAnnouncements();

  const [showComposer, setShowComposer] = useState(false);
  const [activeTab, setActiveTab] = useState<'announcements' | 'notifications'>('announcements');

  const handleCreateAnnouncement = async (announcementData: any) => {
    try {
      await createAnnouncement(announcementData);
      setShowComposer(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleSaveDraft = async (announcementData: any) => {
    try {
      // For now, just close the composer
      // In a full implementation, this would save as draft
      setShowComposer(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const tabs = [
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'notifications', label: 'Automated Notifications', icon: Bell }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements & Notifications</h1>
          <p className="text-gray-600">Manage class announcements and automated notifications</p>
        </div>
        {activeTab === 'announcements' && (
          <button
            onClick={() => setShowComposer(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Announcement</span>
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="text-red-600 text-sm">{error}</div>
          </div>
        </div>
      )}

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
      {activeTab === 'announcements' && (
        <div className="space-y-6">
          {/* Recent Announcements */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Recent Announcements</h2>
            </div>
            <div className="divide-y">
              {announcements.length === 0 ? (
                <div className="p-8 text-center">
                  <Megaphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements yet</h3>
                  <p className="text-gray-600 mb-4">
                    Create your first announcement to communicate with students and parents.
                  </p>
                  <button
                    onClick={() => setShowComposer(true)}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Announcement</span>
                  </button>
                </div>
              ) : (
                announcements.map((announcement) => (
                  <div key={announcement.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">{announcement.title}</h3>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            announcement.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            announcement.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            announcement.priority === 'normal' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {announcement.priority}
                          </span>
                          {announcement.scheduledAt && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Scheduled
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-3 line-clamp-3">{announcement.content}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{announcement.targetClasses.length} classes</span>
                          <span>•</span>
                          <span>{announcement.includeParents ? 'Includes parents' : 'Students only'}</span>
                          <span>•</span>
                          <span>{announcement.createdAt.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{announcements.length}</div>
                  <div className="text-sm text-gray-600">Total Announcements</div>
                </div>
                <Megaphone className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {announcements.filter(a => a.scheduledAt && a.scheduledAt > new Date()).length}
                  </div>
                  <div className="text-sm text-gray-600">Scheduled</div>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {classes.reduce((total, c) => total + c.studentCount, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Reach</div>
                </div>
                <Settings className="w-8 h-8 text-green-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && notificationSettings && (
        <NotificationDashboard
          classes={classes}
          onGenerateProgressReport={generateProgressReport}
          onSendProgressReport={sendProgressReport}
          onCheckPerformanceAlerts={checkPerformanceAlerts}
          onGenerateWeeklySummary={generateWeeklySummary}
          onSendWeeklySummary={sendWeeklySummary}
          notificationSettings={notificationSettings}
          onUpdateSettings={updateNotificationSettings}
        />
      )}

      {/* Announcement Composer Modal */}
      <AnnouncementComposer
        isOpen={showComposer}
        onClose={() => setShowComposer(false)}
        onSend={handleCreateAnnouncement}
        onSaveDraft={handleSaveDraft}
        classes={classes}
        templates={templates}
      />
    </div>
  );
};

export default AnnouncementContainer;