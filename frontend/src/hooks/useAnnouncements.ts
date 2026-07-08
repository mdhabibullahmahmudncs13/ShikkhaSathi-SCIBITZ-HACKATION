import { useState, useEffect, useCallback } from 'react';
import { 
  Announcement,
  AnnouncementCreate,
  ProgressReport,
  ProgressReportRequest,
  PerformanceAlert,
  PerformanceAlertRequest,
  WeeklySummary,
  NotificationSettings,
  AnnouncementTemplate
} from '../types/teacher';
import { apiClient } from '../services/apiClient';

interface UseAnnouncementsReturn {
  // State
  announcements: Announcement[];
  progressReports: ProgressReport[];
  performanceAlerts: PerformanceAlert[];
  weeklySummaries: WeeklySummary[];
  templates: AnnouncementTemplate[];
  notificationSettings: NotificationSettings | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  createAnnouncement: (announcement: AnnouncementCreate) => Promise<void>;
  generateProgressReport: (studentId: string, days: number) => Promise<ProgressReport>;
  sendProgressReport: (studentId: string, days: number, includeParents: boolean) => Promise<void>;
  checkPerformanceAlerts: (classIds: string[], threshold: number, days: number) => Promise<PerformanceAlert[]>;
  generateWeeklySummary: (classId: string) => Promise<WeeklySummary>;
  sendWeeklySummary: (classId: string, includeParents: boolean) => Promise<void>;
  updateNotificationSettings: (settings: NotificationSettings) => Promise<void>;
  
  // Data loading
  loadAnnouncements: () => Promise<void>;
  loadTemplates: () => Promise<void>;
  loadNotificationSettings: () => Promise<void>;
  refreshData: () => Promise<void>;
}

export const useAnnouncements = (): UseAnnouncementsReturn => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [progressReports, setProgressReports] = useState<ProgressReport[]>([]);
  const [performanceAlerts, setPerformanceAlerts] = useState<PerformanceAlert[]>([]);
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>([]);
  const [templates, setTemplates] = useState<AnnouncementTemplate[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create announcement
  const createAnnouncement = useCallback(async (announcementData: AnnouncementCreate) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.post('/announcements/announcements', {
        title: announcementData.title,
        content: announcementData.content,
        target_classes: announcementData.targetClasses,
        priority: announcementData.priority,
        scheduled_at: announcementData.scheduledAt?.toISOString(),
        include_parents: announcementData.includeParents,
        metadata: announcementData.metadata
      });
      
      // Transform response to match frontend types
      const newAnnouncement: Announcement = {
        id: response.data.id,
        title: response.data.subject,
        content: response.data.content,
        targetClasses: announcementData.targetClasses,
        priority: response.data.priority,
        scheduledAt: response.data.scheduled_at ? new Date(response.data.scheduled_at) : undefined,
        createdAt: new Date(response.data.created_at),
        includeParents: announcementData.includeParents,
        metadata: response.data.metadata
      };
      
      setAnnouncements(prev => [newAnnouncement, ...prev]);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create announcement');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate progress report
  const generateProgressReport = useCallback(async (studentId: string, days: number = 7): Promise<ProgressReport> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.post('/announcements/progress-reports/generate', {
        student_id: studentId,
        report_period_days: days,
        include_parents: false
      });
      
      // Transform response
      const report: ProgressReport = {
        studentId: response.data.student_id,
        studentName: response.data.student_name,
        reportPeriod: {
          startDate: new Date(response.data.report_period.start_date),
          endDate: new Date(response.data.report_period.end_date),
          days: response.data.report_period.days
        },
        metrics: {
          totalXpGained: response.data.metrics.total_xp_gained,
          currentLevel: response.data.metrics.current_level,
          currentStreak: response.data.metrics.current_streak,
          subjectsStudied: response.data.metrics.subjects_studied,
          topicsCompleted: response.data.metrics.topics_completed,
          averageScore: response.data.metrics.average_score,
          totalAttempts: response.data.metrics.total_attempts
        },
        weakAreas: response.data.weak_areas.map((area: any) => ({
          subject: area.subject,
          averageScore: area.average_score,
          attempts: area.attempts
        })),
        recommendations: response.data.recommendations,
        generatedAt: new Date(response.data.generated_at)
      };
      
      setProgressReports(prev => [report, ...prev.filter(r => r.studentId !== studentId)]);
      return report;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate progress report');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Send progress report
  const sendProgressReport = useCallback(async (studentId: string, days: number = 7, includeParents: boolean = true) => {
    setLoading(true);
    setError(null);
    
    try {
      await apiClient.post('/announcements/progress-reports/send', {
        student_id: studentId,
        report_period_days: days,
        include_parents: includeParents
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send progress report');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Check performance alerts
  const checkPerformanceAlerts = useCallback(async (
    classIds: string[], 
    threshold: number = 70, 
    days: number = 7
  ): Promise<PerformanceAlert[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.post('/announcements/performance-alerts/check', {
        class_ids: classIds,
        performance_threshold: threshold,
        days_to_check: days
      });
      
      // Transform response - assuming the API returns alert messages
      // We'll need to extract alert data from the message metadata
      const alerts: PerformanceAlert[] = response.data.map((message: any) => {
        const metadata = message.metadata;
        return {
          studentId: metadata.student_id,
          studentName: message.recipients[0]?.recipient_name || 'Unknown Student',
          averageScore: metadata.average_score,
          threshold: metadata.threshold,
          alertGeneratedAt: new Date(metadata.alert_generated_at),
          recentPerformance: [] // This would need to be populated from the service
        };
      });
      
      setPerformanceAlerts(alerts);
      return alerts;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to check performance alerts');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate weekly summary
  const generateWeeklySummary = useCallback(async (classId: string): Promise<WeeklySummary> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.get(`/announcements/weekly-summary/${classId}`);
      
      // Transform response
      const summary: WeeklySummary = {
        classId: response.data.class_id,
        className: response.data.class_name,
        weekPeriod: {
          startDate: new Date(response.data.week_period.start_date),
          endDate: new Date(response.data.week_period.end_date)
        },
        metrics: {
          totalStudents: response.data.metrics.total_students,
          activeStudents: response.data.metrics.active_students,
          engagementRate: response.data.metrics.engagement_rate,
          totalAttempts: response.data.metrics.total_attempts,
          classAverage: response.data.metrics.class_average
        },
        subjectPerformance: response.data.subject_performance,
        topPerformers: response.data.top_performers,
        generatedAt: new Date(response.data.generated_at)
      };
      
      setWeeklySummaries(prev => [summary, ...prev.filter(s => s.classId !== classId)]);
      return summary;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate weekly summary');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Send weekly summary
  const sendWeeklySummary = useCallback(async (classId: string, includeParents: boolean = false) => {
    setLoading(true);
    setError(null);
    
    try {
      await apiClient.post(`/announcements/weekly-summary/${classId}/send?include_parents=${includeParents}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send weekly summary');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load announcement templates
  const loadTemplates = useCallback(async () => {
    setError(null);
    
    try {
      const response = await apiClient.get('/announcements/announcements/templates');
      
      const transformedTemplates: AnnouncementTemplate[] = response.data.map((template: any) => ({
        id: template.id,
        name: template.name,
        subjectTemplate: template.subject_template,
        contentTemplate: template.content_template,
        variables: template.variables,
        category: template.category
      }));
      
      setTemplates(transformedTemplates);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load templates');
      console.error('Failed to load templates:', err);
    }
  }, []);

  // Load notification settings
  const loadNotificationSettings = useCallback(async () => {
    setError(null);
    
    try {
      // This would be implemented when we have a settings endpoint
      // For now, use default settings
      const defaultSettings: NotificationSettings = {
        progressReports: {
          enabled: true,
          frequency: 'weekly',
          includeParents: true
        },
        performanceAlerts: {
          enabled: true,
          threshold: 70,
          daysToCheck: 7,
          includeParents: true
        },
        weeklySummaries: {
          enabled: true,
          dayOfWeek: 1, // Monday
          includeParents: false
        },
        achievements: {
          enabled: true,
          includeParents: true
        }
      };
      
      setNotificationSettings(defaultSettings);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load notification settings');
      console.error('Failed to load notification settings:', err);
    }
  }, []);

  // Update notification settings
  const updateNotificationSettings = useCallback(async (settings: NotificationSettings) => {
    setError(null);
    
    try {
      // This would be implemented when we have a settings endpoint
      // For now, just update local state
      setNotificationSettings(settings);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update notification settings');
      throw err;
    }
  }, []);

  // Load announcements (placeholder - would integrate with messages API)
  const loadAnnouncements = useCallback(async () => {
    setError(null);
    
    try {
      // This would load announcements from the messages API
      // For now, just initialize empty array
      setAnnouncements([]);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load announcements');
      console.error('Failed to load announcements:', err);
    }
  }, []);

  // Refresh all data
  const refreshData = useCallback(async () => {
    await Promise.all([
      loadAnnouncements(),
      loadTemplates(),
      loadNotificationSettings()
    ]);
  }, [loadAnnouncements, loadTemplates, loadNotificationSettings]);

  // Load initial data
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    // State
    announcements,
    progressReports,
    performanceAlerts,
    weeklySummaries,
    templates,
    notificationSettings,
    loading,
    error,
    
    // Actions
    createAnnouncement,
    generateProgressReport,
    sendProgressReport,
    checkPerformanceAlerts,
    generateWeeklySummary,
    sendWeeklySummary,
    updateNotificationSettings,
    
    // Data loading
    loadAnnouncements,
    loadTemplates,
    loadNotificationSettings,
    refreshData
  };
};