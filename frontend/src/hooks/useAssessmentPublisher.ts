import { useState, useEffect, useCallback } from 'react';
import { CustomAssessment } from '../types/teacher';
import { teacherAPI } from '../services/apiClient';
import { logger } from '../services/logger';

interface PublishData {
  assessmentId: string;
  assignedClasses: string[];
  assignedStudents: string[];
  scheduledDate?: Date;
  dueDate?: Date;
  availabilityWindow: {
    startTime?: string;
    endTime?: string;
    allowedDays: string[];
  };
  settings: {
    allowRetakes: boolean;
    maxAttempts: number;
    showResultsImmediately: boolean;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    requireProctoring: boolean;
    allowPause: boolean;
    showProgressBar: boolean;
  };
  notifications: {
    notifyStudents: boolean;
    notifyParents: boolean;
    reminderSchedule: string[];
    customMessage?: string;
  };
}

interface PublishResult {
  success: boolean;
  assessmentId: string;
  totalStudents: number;
  availableFrom: string;
  dueDate?: string;
  notificationsSent: number;
}

interface UseAssessmentPublisherReturn {
  assessment: CustomAssessment | undefined;
  isLoading: boolean;
  isPublishing: boolean;
  error: string | null;
  publishAssessment: (publishData: PublishData) => Promise<PublishResult>;
  loadAssessment: (assessmentId: string) => Promise<void>;
  validatePublishData: (publishData: PublishData) => ValidationResult;
  scheduleReminders: (publishData: PublishData) => Promise<void>;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const useAssessmentPublisher = (
  assessmentId?: string,
  initialAssessment?: CustomAssessment
): UseAssessmentPublisherReturn => {
  const [assessment, setAssessment] = useState<CustomAssessment | undefined>(initialAssessment);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load assessment if ID provided
  const loadAssessment = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      logger.info('Loading assessment for publishing', { assessmentId: id });
      
      // In a real app, this would call the API
      const assessmentData = await teacherAPI.getAssessment(id);
      
      setAssessment(assessmentData);
      logger.info('Assessment loaded successfully', { assessmentId: id });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load assessment';
      setError(errorMessage);
      logger.error('Failed to load assessment', { assessmentId: id, error: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load assessment on mount if ID provided and no initial assessment
  useEffect(() => {
    if (assessmentId && !initialAssessment) {
      loadAssessment(assessmentId);
    }
  }, [assessmentId, initialAssessment, loadAssessment]);

  // Validate publish data
  const validatePublishData = useCallback((publishData: PublishData): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Assignment validation
    if (publishData.assignedClasses.length === 0 && publishData.assignedStudents.length === 0) {
      errors.push('At least one class or student must be assigned');
    }

    // Schedule validation
    if (publishData.scheduledDate && publishData.dueDate) {
      if (publishData.scheduledDate >= publishData.dueDate) {
        errors.push('Due date must be after the scheduled start date');
      }
    }

    if (publishData.scheduledDate && publishData.scheduledDate <= new Date()) {
      warnings.push('Scheduled date is in the past. Assessment will be available immediately.');
    }

    // Settings validation
    if (publishData.settings.maxAttempts < 1 || publishData.settings.maxAttempts > 10) {
      errors.push('Maximum attempts must be between 1 and 10');
    }

    // Availability window validation
    if (publishData.availabilityWindow.startTime && publishData.availabilityWindow.endTime) {
      const startTime = new Date(`2000-01-01 ${publishData.availabilityWindow.startTime}`);
      const endTime = new Date(`2000-01-01 ${publishData.availabilityWindow.endTime}`);
      
      if (startTime >= endTime) {
        errors.push('End time must be after start time');
      }
    }

    if (publishData.availabilityWindow.allowedDays.length === 0) {
      warnings.push('No days selected for availability. Students will not be able to access the assessment.');
    }

    // Notification validation
    if (publishData.notifications.notifyParents && !publishData.notifications.notifyStudents) {
      warnings.push('Parent notifications are enabled but student notifications are disabled');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, []);

  // Schedule reminders
  const scheduleReminders = useCallback(async (publishData: PublishData): Promise<void> => {
    if (publishData.notifications.reminderSchedule.length === 0) {
      return;
    }

    try {
      logger.info('Scheduling reminders', {
        assessmentId: publishData.assessmentId,
        reminderCount: publishData.notifications.reminderSchedule.length
      });

      // In a real app, this would call the API to schedule reminders
      // await teacherAPI.scheduleReminders(publishData.assessmentId, {
      //   schedule: publishData.notifications.reminderSchedule,
      //   customMessage: publishData.notifications.customMessage
      // });

      logger.info('Reminders scheduled successfully', {
        assessmentId: publishData.assessmentId
      });
    } catch (err) {
      logger.error('Failed to schedule reminders', {
        assessmentId: publishData.assessmentId,
        error: err
      });
      // Don't throw - reminders are not critical
    }
  }, []);

  // Publish assessment
  const publishAssessment = useCallback(async (publishData: PublishData): Promise<PublishResult> => {
    if (!assessment) {
      throw new Error('Assessment not loaded');
    }

    setIsPublishing(true);
    setError(null);

    try {
      logger.info('Publishing assessment', {
        assessmentId: publishData.assessmentId,
        assignedClasses: publishData.assignedClasses.length,
        assignedStudents: publishData.assignedStudents.length
      });

      // Validate publish data
      const validation = validatePublishData(publishData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // In a real app, this would call the API
      // const result = await teacherAPI.publishAssessment(publishData.assessmentId, publishData);

      // Mock publish operation
      const totalStudents = publishData.assignedClasses.length * 25 + publishData.assignedStudents.length;
      
      const result: PublishResult = {
        success: true,
        assessmentId: publishData.assessmentId,
        totalStudents,
        availableFrom: publishData.scheduledDate
          ? publishData.scheduledDate.toLocaleString()
          : 'immediately',
        dueDate: publishData.dueDate?.toLocaleString(),
        notificationsSent: publishData.notifications.notifyStudents ? totalStudents : 0
      };

      // Schedule reminders
      await scheduleReminders(publishData);

      logger.info('Assessment published successfully', {
        assessmentId: publishData.assessmentId,
        totalStudents: result.totalStudents,
        notificationsSent: result.notificationsSent
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to publish assessment';
      setError(errorMessage);
      logger.error('Failed to publish assessment', {
        assessmentId: publishData.assessmentId,
        error: errorMessage
      });
      throw err;
    } finally {
      setIsPublishing(false);
    }
  }, [assessment, validatePublishData, scheduleReminders]);

  return {
    assessment,
    isLoading,
    isPublishing,
    error,
    publishAssessment,
    loadAssessment,
    validatePublishData,
    scheduleReminders
  };
};