import { useState, useCallback } from 'react';
import { authAPI } from '../services/apiClient';
import { logger } from '../services/logger';
import { useUser } from '../contexts/UserContext';

interface ProfileUpdateData {
  full_name?: string;
  email?: string;
  grade?: number;
  medium?: 'bangla' | 'english';
  is_active?: boolean;
}

interface UseProfileReturn {
  updating: boolean;
  error: string | null;
  updateProfile: (data: ProfileUpdateData) => Promise<boolean>;
  clearError: () => void;
}

export const useProfile = (): UseProfileReturn => {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshUser } = useUser();

  const updateProfile = useCallback(async (data: ProfileUpdateData): Promise<boolean> => {
    try {
      setUpdating(true);
      setError(null);

      // Validate data
      if (data.grade && (data.grade < 6 || data.grade > 12)) {
        throw new Error('Grade must be between 6 and 12');
      }

      if (data.email && !data.email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      if (data.full_name && data.full_name.trim().length < 2) {
        throw new Error('Full name must be at least 2 characters long');
      }

      // Send update request
      const response = await authAPI.updateProfile(data);

      if (response) {
        // Refresh user context with updated data
        await refreshUser();
        
        logger.info('Profile updated successfully', {
          updatedFields: Object.keys(data)
        });

        return true;
      }

      return false;

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update profile';
      setError(errorMessage);
      logger.error('Failed to update profile', err);
      return false;
    } finally {
      setUpdating(false);
    }
  }, [refreshUser]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    updating,
    error,
    updateProfile,
    clearError
  };
};