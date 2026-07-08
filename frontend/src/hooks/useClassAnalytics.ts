import { useState, useEffect, useCallback } from 'react';
import { 
  ClassPerformanceMetrics, 
  WeaknessPattern, 
  InterventionRecommendation 
} from '../types/teacher';
import { teacherAPI } from '../services/apiClient';
import { useAPI } from './useAPI';

interface UseClassAnalyticsProps {
  classId?: string;
  timeRange?: '7d' | '30d' | '90d' | '1y';
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface ClassAnalyticsData {
  performanceMetrics: ClassPerformanceMetrics | null;
  weaknessPatterns: WeaknessPattern[];
  interventionRecommendations: InterventionRecommendation[];
  lastUpdated: Date | null;
}

export const useClassAnalytics = ({
  classId,
  timeRange = '30d',
  autoRefresh = true,
  refreshInterval = 300000 // 5 minutes
}: UseClassAnalyticsProps = {}) => {
  const [analyticsData, setAnalyticsData] = useState<ClassAnalyticsData>({
    performanceMetrics: null,
    weaknessPatterns: [],
    interventionRecommendations: [],
    lastUpdated: null
  });

  // Fetch performance metrics
  const {
    data: performanceData,
    loading: performanceLoading,
    error: performanceError,
    refetch: refetchPerformance
  } = useAPI(
    () => teacherAPI.getClassPerformanceMetrics(classId, timeRange),
    [classId, timeRange],
    {
      immediate: !!classId,
      onSuccess: (data) => {
        setAnalyticsData(prev => ({
          ...prev,
          performanceMetrics: data,
          lastUpdated: new Date()
        }));
      }
    }
  );

  // Fetch weakness patterns
  const {
    data: weaknessData,
    loading: weaknessLoading,
    error: weaknessError,
    refetch: refetchWeakness
  } = useAPI(
    () => teacherAPI.getWeaknessPatterns(classId, timeRange),
    [classId, timeRange],
    {
      immediate: !!classId,
      onSuccess: (data) => {
        setAnalyticsData(prev => ({
          ...prev,
          weaknessPatterns: data || [],
          lastUpdated: new Date()
        }));
      }
    }
  );

  // Fetch intervention recommendations
  const {
    data: interventionData,
    loading: interventionLoading,
    error: interventionError,
    refetch: refetchInterventions
  } = useAPI(
    () => teacherAPI.getInterventionRecommendations(classId),
    [classId],
    {
      immediate: !!classId,
      onSuccess: (data) => {
        setAnalyticsData(prev => ({
          ...prev,
          interventionRecommendations: data || [],
          lastUpdated: new Date()
        }));
      }
    }
  );

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0 || !classId) return;

    const intervalId = setInterval(() => {
      refreshAnalytics();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, classId]);

  // Manual refresh function
  const refreshAnalytics = useCallback(async () => {
    try {
      await Promise.all([
        refetchPerformance(),
        refetchWeakness(),
        refetchInterventions()
      ]);
    } catch (error) {
      console.error('Failed to refresh analytics:', error);
      throw error;
    }
  }, [refetchPerformance, refetchWeakness, refetchInterventions]);

  // Export report function
  const exportReport = useCallback(async (format: 'pdf' | 'csv' | 'excel') => {
    if (!classId) return;

    try {
      const response = await teacherAPI.exportClassReport(classId, {
        format,
        timeRange,
        includeCharts: format === 'pdf',
        includeWeaknesses: true,
        includeInterventions: true
      });

      // Create download link
      const blob = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' : 
              format === 'csv' ? 'text/csv' : 
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `class-analytics-${classId}-${timeRange}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export report:', error);
      throw error;
    }
  }, [classId, timeRange]);

  // Handle intervention actions
  const handleInterventionAction = useCallback(async (
    recommendationId: string, 
    action: 'implement' | 'dismiss' | 'modify'
  ) => {
    try {
      await teacherAPI.updateInterventionRecommendation(recommendationId, {
        action,
        timestamp: new Date().toISOString()
      });

      // Update local state
      setAnalyticsData(prev => ({
        ...prev,
        interventionRecommendations: prev.interventionRecommendations.filter(
          r => r.id !== recommendationId
        )
      }));
    } catch (error) {
      console.error('Failed to handle intervention action:', error);
      throw error;
    }
  }, []);

  // Calculate derived metrics
  const derivedMetrics = useCallback(() => {
    if (!analyticsData.performanceMetrics) return null;

    const { performanceMetrics, weaknessPatterns, interventionRecommendations } = analyticsData;
    
    return {
      // Performance insights
      performanceTrend: performanceMetrics.timeAnalytics.monthlyComparison.growthRate > 0 ? 'improving' : 'declining',
      topPerformingSubject: performanceMetrics.subjectPerformance.reduce((prev, current) => 
        prev.averageScore > current.averageScore ? prev : current
      ),
      weakestSubject: performanceMetrics.subjectPerformance.reduce((prev, current) => 
        prev.averageScore < current.averageScore ? prev : current
      ),
      
      // Engagement insights
      engagementLevel: performanceMetrics.engagementMetrics.dailyActiveUsers / 
        Object.values(performanceMetrics.engagementMetrics.streakDistribution).reduce((a, b) => a + b, 0),
      
      // Risk assessment
      highRiskPatterns: weaknessPatterns.filter(p => p.severity === 'high').length,
      urgentInterventions: interventionRecommendations.filter(r => r.priority === 'high').length,
      
      // Learning effectiveness
      bloomsDistribution: performanceMetrics.subjectPerformance[0]?.bloomLevelDistribution,
      averageStudyEfficiency: performanceMetrics.averageScore / 
        (performanceMetrics.timeAnalytics.averageStudyTime / 3600), // Score per hour
    };
  }, [analyticsData]);

  // Get students needing immediate attention
  const getStudentsNeedingAttention = useCallback(() => {
    return analyticsData.interventionRecommendations
      .filter(r => r.priority === 'high')
      .map(r => ({
        studentId: r.studentId,
        studentName: r.studentName,
        reason: r.description,
        urgency: r.priority
      }));
  }, [analyticsData.interventionRecommendations]);

  // Get improvement opportunities
  const getImprovementOpportunities = useCallback(() => {
    const opportunities = [];
    
    // Subject-based opportunities
    if (analyticsData.performanceMetrics) {
      analyticsData.performanceMetrics.subjectPerformance.forEach(subject => {
        if (subject.averageScore < 70) {
          opportunities.push({
            type: 'subject_performance',
            subject: subject.subject,
            currentScore: subject.averageScore,
            opportunity: `Improve ${subject.subject} performance`,
            impact: 'medium'
          });
        }
      });
    }

    // Engagement opportunities
    if (analyticsData.performanceMetrics?.engagementMetrics.dailyActiveUsers < 
        Object.values(analyticsData.performanceMetrics.engagementMetrics.streakDistribution).reduce((a, b) => a + b, 0) * 0.7) {
      opportunities.push({
        type: 'engagement',
        opportunity: 'Increase student engagement',
        impact: 'high'
      });
    }

    // Weakness pattern opportunities
    analyticsData.weaknessPatterns.forEach(pattern => {
      if (pattern.severity === 'high') {
        opportunities.push({
          type: 'weakness_pattern',
          pattern: pattern.pattern,
          affectedStudents: pattern.affectedStudents,
          opportunity: pattern.recommendedIntervention,
          impact: 'high'
        });
      }
    });

    return opportunities;
  }, [analyticsData]);

  return {
    // Data
    ...analyticsData,
    
    // Loading states
    loading: performanceLoading || weaknessLoading || interventionLoading,
    error: performanceError || weaknessError || interventionError,
    
    // Actions
    refreshAnalytics,
    exportReport,
    handleInterventionAction,
    
    // Computed data
    derivedMetrics: derivedMetrics(),
    studentsNeedingAttention: getStudentsNeedingAttention(),
    improvementOpportunities: getImprovementOpportunities(),
    
    // Utility functions
    isDataStale: analyticsData.lastUpdated ? 
      (new Date().getTime() - analyticsData.lastUpdated.getTime()) > refreshInterval : true,
  };
};

export default useClassAnalytics;