import { useState, useEffect, useCallback } from 'react';
import { StudentSummary, ClassOverview } from '../types/teacher';
import { teacherAPI } from '../services/apiClient';
import { useAPI } from './useAPI';

interface UseStudentRosterProps {
  classId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface StudentRosterData {
  students: StudentSummary[];
  classInfo: ClassOverview | null;
  totalStudents: number;
  atRiskCount: number;
  averagePerformance: number;
}

export const useStudentRoster = ({
  classId,
  autoRefresh = true,
  refreshInterval = 30000
}: UseStudentRosterProps = {}) => {
  const [rosterData, setRosterData] = useState<StudentRosterData>({
    students: [],
    classInfo: null,
    totalStudents: 0,
    atRiskCount: 0,
    averagePerformance: 0
  });

  // Fetch class overview data which includes student roster
  const {
    data: classOverviewData,
    loading,
    error,
    refetch
  } = useAPI(
    () => teacherAPI.getClassOverview(),
    [classId],
    {
      immediate: true,
      onSuccess: (data) => {
        processClassOverviewData(data);
      },
      onError: (error) => {
        console.error('Failed to fetch student roster:', error);
      }
    }
  );

  const processClassOverviewData = useCallback((data: any) => {
    // Process the API response to extract student roster information
    let allStudents: StudentSummary[] = [];
    let selectedClass: ClassOverview | null = null;

    if (data && data.classes) {
      // If classId is specified, filter for that class
      if (classId) {
        selectedClass = data.classes.find((cls: ClassOverview) => cls.id === classId);
        allStudents = selectedClass?.students || [];
      } else {
        // If no classId specified, get all students from all classes
        allStudents = data.classes.flatMap((cls: ClassOverview) => cls.students || []);
        selectedClass = data.classes[0] || null; // Use first class as default
      }
    }

    // Calculate metrics
    const totalStudents = allStudents.length;
    const atRiskCount = allStudents.filter(student => student.riskLevel === 'high').length;
    const averagePerformance = totalStudents > 0 
      ? allStudents.reduce((sum, student) => sum + student.averageScore, 0) / totalStudents 
      : 0;

    setRosterData({
      students: allStudents,
      classInfo: selectedClass,
      totalStudents,
      atRiskCount,
      averagePerformance: Math.round(averagePerformance)
    });
  }, [classId]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      refetch();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, refetch]);

  // Manual refresh function
  const refreshRoster = useCallback(async () => {
    try {
      await refetch();
    } catch (error) {
      console.error('Failed to refresh roster:', error);
      throw error;
    }
  }, [refetch]);

  // Filter students by risk level
  const getStudentsByRiskLevel = useCallback((riskLevel: 'low' | 'medium' | 'high') => {
    return rosterData.students.filter(student => student.riskLevel === riskLevel);
  }, [rosterData.students]);

  // Get students who haven't been active recently
  const getInactiveStudents = useCallback((daysSinceLastActive: number = 7) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastActive);
    
    return rosterData.students.filter(student => 
      new Date(student.lastActive) < cutoffDate
    );
  }, [rosterData.students]);

  // Get top performing students
  const getTopPerformers = useCallback((limit: number = 5) => {
    return [...rosterData.students]
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, limit);
  }, [rosterData.students]);

  // Get students who need attention
  const getStudentsNeedingAttention = useCallback(() => {
    return rosterData.students.filter(student => 
      student.riskLevel === 'high' || 
      student.averageScore < 60 ||
      student.currentStreak === 0
    );
  }, [rosterData.students]);

  return {
    // Data
    ...rosterData,
    
    // Loading states
    loading,
    error,
    
    // Actions
    refreshRoster,
    
    // Computed data
    getStudentsByRiskLevel,
    getInactiveStudents,
    getTopPerformers,
    getStudentsNeedingAttention,
    
    // Metrics
    engagementRate: rosterData.totalStudents > 0 
      ? Math.round((rosterData.students.filter(s => s.currentStreak > 0).length / rosterData.totalStudents) * 100)
      : 0,
    
    // Raw data for advanced usage
    classOverviewData
  };
};

export default useStudentRoster;