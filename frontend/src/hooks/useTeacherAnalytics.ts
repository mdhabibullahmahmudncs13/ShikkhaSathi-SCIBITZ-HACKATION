/**
 * Teacher Analytics Hook
 * Custom hook for managing teacher analytics data and state
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  ClassPerformanceMetrics, 
  StudentSummary, 
  InterventionRecommendation,
  WeaknessPattern 
} from '../types/teacher';
import { teacherAnalyticsService } from '../services/teacherAnalyticsService';

interface UseTeacherAnalyticsState {
  classMetrics: ClassPerformanceMetrics | null;
  studentAnalytics: any | null;
  atRiskStudents: StudentSummary[];
  weaknessPatterns: WeaknessPattern[];
  engagementMetrics: any | null;
  performanceTrends: any | null;
  engagementAnalysis: any | null;
  retentionMetrics: any | null;
  activityPatterns: any | null;
  loading: boolean;
  error: string | null;
}

interface UseTeacherAnalyticsActions {
  loadClassMetrics: (classId?: string, timeRange?: 'week' | 'month' | 'quarter') => Promise<void>;
  loadStudentAnalytics: (studentId: string, timeRange?: 'week' | 'month' | 'quarter') => Promise<void>;
  loadAtRiskStudents: (classId?: string) => Promise<void>;
  loadWeaknessPatterns: (classId?: string, timeRange?: 'week' | 'month' | 'quarter') => Promise<void>;
  loadEngagementMetrics: (classId?: string, timeRange?: 'week' | 'month' | 'quarter') => Promise<void>;
  loadPerformanceTrends: (classId?: string, subject?: string) => Promise<void>;
  loadDetailedEngagementAnalysis: (classId?: string, timeRange?: 'week' | 'month' | 'quarter') => Promise<void>;
  loadRetentionAnalysis: (classId?: string, timeRange?: 'week' | 'month' | 'quarter') => Promise<void>;
  loadActivityPatterns: (classId?: string, timeRange?: 'week' | 'month' | 'quarter') => Promise<void>;
  contactStudent: (studentId: string, method: 'email' | 'message') => Promise<void>;
  assignIntervention: (studentId: string, intervention: InterventionRecommendation) => Promise<void>;
  clearError: () => void;
  refresh: () => Promise<void>;
}

export function useTeacherAnalytics(
  initialClassId?: string,
  autoLoad: boolean = true
): UseTeacherAnalyticsState & UseTeacherAnalyticsActions {
  const [state, setState] = useState<UseTeacherAnalyticsState>({
    classMetrics: null,
    studentAnalytics: null,
    atRiskStudents: [],
    weaknessPatterns: [],
    engagementMetrics: null,
    performanceTrends: null,
    engagementAnalysis: null,
    retentionMetrics: null,
    activityPatterns: null,
    loading: false,
    error: null,
  });

  const [currentClassId, setCurrentClassId] = useState<string | undefined>(initialClassId);
  const [currentTimeRange, setCurrentTimeRange] = useState<'week' | 'month' | 'quarter'>('month');

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, loading: false }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const loadClassMetrics = useCallback(async (
    classId?: string,
    timeRange: 'week' | 'month' | 'quarter' = 'month'
  ) => {
    try {
      setLoading(true);
      clearError();
      
      const metrics = await teacherAnalyticsService.getClassPerformanceMetrics(classId, timeRange);
      
      setState(prev => ({
        ...prev,
        classMetrics: metrics,
        loading: false
      }));
      
      setCurrentClassId(classId);
      setCurrentTimeRange(timeRange);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load class metrics');
    }
  }, [setLoading, clearError, setError]);

  const loadStudentAnalytics = useCallback(async (
    studentId: string,
    timeRange: 'week' | 'month' | 'quarter' = 'month'
  ) => {
    try {
      setLoading(true);
      clearError();
      
      const analytics = await teacherAnalyticsService.getStudentAnalytics(studentId, timeRange);
      
      setState(prev => ({
        ...prev,
        studentAnalytics: analytics,
        loading: false
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load student analytics');
    }
  }, [setLoading, clearError, setError]);

  const loadAtRiskStudents = useCallback(async (classId?: string) => {
    try {
      setLoading(true);
      clearError();
      
      const students = await teacherAnalyticsService.getAtRiskStudents(classId);
      
      setState(prev => ({
        ...prev,
        atRiskStudents: students,
        loading: false
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load at-risk students');
    }
  }, [setLoading, clearError, setError]);

  const loadWeaknessPatterns = useCallback(async (
    classId?: string,
    timeRange: 'week' | 'month' | 'quarter' = 'month'
  ) => {
    try {
      setLoading(true);
      clearError();
      
      const patterns = await teacherAnalyticsService.getWeaknessPatterns(classId, timeRange);
      
      setState(prev => ({
        ...prev,
        weaknessPatterns: patterns,
        loading: false
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load weakness patterns');
    }
  }, [setLoading, clearError, setError]);

  const loadEngagementMetrics = useCallback(async (
    classId?: string,
    timeRange: 'week' | 'month' | 'quarter' = 'month'
  ) => {
    try {
      setLoading(true);
      clearError();
      
      const metrics = await teacherAnalyticsService.getEngagementMetrics(classId, timeRange);
      
      setState(prev => ({
        ...prev,
        engagementMetrics: metrics,
        loading: false
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load engagement metrics');
    }
  }, [setLoading, clearError, setError]);

  const loadPerformanceTrends = useCallback(async (
    classId?: string,
    subject?: string
  ) => {
    try {
      setLoading(true);
      clearError();
      
      const trends = await teacherAnalyticsService.getPerformanceTrends(classId, subject);
      
      setState(prev => ({
        ...prev,
        performanceTrends: trends,
        loading: false
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load performance trends');
    }
  }, [setLoading, clearError, setError]);

  const contactStudent = useCallback(async (
    studentId: string,
    method: 'email' | 'message'
  ) => {
    try {
      setLoading(true);
      clearError();
      
      await teacherAnalyticsService.contactStudent(studentId, method);
      
      setState(prev => ({ ...prev, loading: false }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to contact student');
    }
  }, [setLoading, clearError, setError]);

  const assignIntervention = useCallback(async (
    studentId: string,
    intervention: InterventionRecommendation
  ) => {
    try {
      setLoading(true);
      clearError();
      
      await teacherAnalyticsService.assignIntervention(studentId, intervention);
      
      setState(prev => ({ ...prev, loading: false }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to assign intervention');
    }
  }, [setLoading, clearError, setError]);

  const loadDetailedEngagementAnalysis = useCallback(async (
    classId?: string,
    timeRange: 'week' | 'month' | 'quarter' = 'month'
  ) => {
    try {
      setLoading(true);
      clearError();
      
      const analysis = await teacherAnalyticsService.getDetailedEngagementAnalysis(classId, timeRange);
      
      setState(prev => ({
        ...prev,
        engagementAnalysis: analysis,
        loading: false
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load engagement analysis');
    }
  }, [setLoading, clearError, setError]);

  const loadRetentionAnalysis = useCallback(async (
    classId?: string,
    timeRange: 'week' | 'month' | 'quarter' = 'month'
  ) => {
    try {
      setLoading(true);
      clearError();
      
      const retention = await teacherAnalyticsService.getRetentionAnalysis(classId, timeRange);
      
      setState(prev => ({
        ...prev,
        retentionMetrics: retention,
        loading: false
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load retention analysis');
    }
  }, [setLoading, clearError, setError]);

  const loadActivityPatterns = useCallback(async (
    classId?: string,
    timeRange: 'week' | 'month' | 'quarter' = 'month'
  ) => {
    try {
      setLoading(true);
      clearError();
      
      const patterns = await teacherAnalyticsService.getActivityPatterns(classId, timeRange);
      
      setState(prev => ({
        ...prev,
        activityPatterns: patterns,
        loading: false
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load activity patterns');
    }
  }, [setLoading, clearError, setError]);

  const refresh = useCallback(async () => {
    if (currentClassId || autoLoad) {
      await Promise.all([
        loadClassMetrics(currentClassId, currentTimeRange),
        loadAtRiskStudents(currentClassId),
        loadWeaknessPatterns(currentClassId, currentTimeRange),
        loadEngagementMetrics(currentClassId, currentTimeRange),
        loadPerformanceTrends(currentClassId)
      ]);
    }
  }, [
    currentClassId,
    currentTimeRange,
    autoLoad,
    loadClassMetrics,
    loadAtRiskStudents,
    loadWeaknessPatterns,
    loadEngagementMetrics,
    loadPerformanceTrends
  ]);

  // Auto-load data on mount if enabled
  useEffect(() => {
    if (autoLoad) {
      refresh();
    }
  }, [autoLoad, refresh]);

  return {
    // State
    ...state,
    
    // Actions
    loadClassMetrics,
    loadStudentAnalytics,
    loadAtRiskStudents,
    loadWeaknessPatterns,
    loadEngagementMetrics,
    loadPerformanceTrends,
    loadDetailedEngagementAnalysis,
    loadRetentionAnalysis,
    loadActivityPatterns,
    contactStudent,
    assignIntervention,
    clearError,
    refresh,
  };
}