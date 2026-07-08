import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import {
  ClassroomSettings,
  ClassroomSettingsUpdate
} from '../types/teacher';

interface UseClassroomSettingsReturn {
  settings: ClassroomSettings | null;
  isLoading: boolean;
  error: string | null;
  updateSettings: (settings: ClassroomSettingsUpdate) => Promise<ClassroomSettings>;
  resetToDefaults: () => Promise<ClassroomSettings>;
  refreshSettings: () => Promise<void>;
}

export const useClassroomSettings = (classId: string): UseClassroomSettingsReturn => {
  const [settings, setSettings] = useState<ClassroomSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch classroom settings
  const fetchSettings = useCallback(async () => {
    if (!classId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.get(`/teacher/classes/${classId}/settings`);
      setSettings(response.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load classroom settings';
      setError(errorMessage);
      console.error('Error fetching classroom settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [classId]);

  // Update classroom settings
  const updateSettings = useCallback(async (settingsUpdate: ClassroomSettingsUpdate): Promise<ClassroomSettings> => {
    try {
      const response = await apiClient.put(`/teacher/classes/${classId}/settings`, settingsUpdate);
      const updatedSettings = response.data;
      
      setSettings(updatedSettings);
      return updatedSettings;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings';
      throw new Error(errorMessage);
    }
  }, [classId]);

  // Reset to default settings
  const resetToDefaults = useCallback(async (): Promise<ClassroomSettings> => {
    try {
      const defaultSettings: ClassroomSettingsUpdate = {
        allow_self_enrollment: false,
        require_approval: true,
        max_students: undefined,
        default_permissions: {
          can_access_chat: true,
          can_take_quizzes: true,
          can_view_leaderboard: true,
          content_restrictions: undefined,
          time_restrictions: undefined
        },
        content_filters: [],
        assessment_settings: {
          allow_retakes: true,
          max_attempts: undefined,
          time_limit: undefined,
          show_correct_answers: true
        },
        communication_settings: {
          allow_student_messages: true,
          allow_parent_notifications: true,
          auto_progress_reports: true
        }
      };

      const response = await apiClient.put(`/teacher/classes/${classId}/settings`, defaultSettings);
      const updatedSettings = response.data;
      
      setSettings(updatedSettings);
      return updatedSettings;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset settings';
      throw new Error(errorMessage);
    }
  }, [classId]);

  // Refresh settings manually
  const refreshSettings = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

  // Initial settings fetch
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    resetToDefaults,
    refreshSettings
  };
};