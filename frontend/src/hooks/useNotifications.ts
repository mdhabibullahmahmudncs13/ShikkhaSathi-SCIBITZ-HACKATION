import { useState, useEffect, useCallback } from 'react';
import { notificationAPI } from '../services/apiClient';
import { logger } from '../services/logger';

export interface Notification {
  id: string;
  type: 'achievement' | 'recommendation' | 'alert' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: any;
}

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  hasMore: boolean;
  fetchNotifications: (offset?: number) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

export const useNotifications = (limit: number = 20): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const fetchNotifications = useCallback(async (newOffset: number = 0) => {
    try {
      setLoading(true);
      setError(null);

      const response = await notificationAPI.getNotifications({
        limit,
        offset: newOffset,
        unread_only: false
      });

      const notificationsData = response.notifications.map(notification => ({
        ...notification,
        timestamp: new Date(notification.timestamp)
      }));

      if (newOffset === 0) {
        // Fresh fetch - replace all notifications
        setNotifications(notificationsData);
      } else {
        // Load more - append to existing notifications
        setNotifications(prev => [...prev, ...notificationsData]);
      }

      setHasMore(response.has_more);
      setOffset(newOffset + notificationsData.length);

      logger.info('Notifications loaded successfully', {
        count: notificationsData.length,
        total: response.total,
        offset: newOffset
      });

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load notifications';
      setError(errorMessage);
      logger.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationAPI.getUnreadCount();
      setUnreadCount(response.unread_count);
    } catch (err: any) {
      logger.error('Failed to fetch unread count', err);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );

      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));

      logger.info('Notification marked as read', { notificationId });

    } catch (err: any) {
      logger.error('Failed to mark notification as read', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationAPI.markAllAsRead();
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );

      setUnreadCount(0);

      logger.info('All notifications marked as read');

    } catch (err: any) {
      logger.error('Failed to mark all notifications as read', err);
    }
  }, []);

  const refetch = useCallback(async () => {
    setOffset(0);
    await fetchNotifications(0);
    await fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  // Initial load
  useEffect(() => {
    fetchNotifications(0);
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  // Periodic refresh for unread count
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    hasMore,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    refetch
  };
};