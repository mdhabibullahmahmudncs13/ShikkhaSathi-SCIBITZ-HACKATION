import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import {
  ClassroomStudent,
  ClassroomSettings,
  BulkOperation,
  BulkOperationResult,
  StudentImportResult
} from '../types/teacher';

interface UseClassroomManagementReturn {
  students: ClassroomStudent[];
  classSettings: ClassroomSettings | null;
  isLoading: boolean;
  error: string | null;
  addStudent: (student: Omit<ClassroomStudent, 'id' | 'enrolledAt'>) => Promise<ClassroomStudent>;
  updateStudent: (student: ClassroomStudent) => Promise<ClassroomStudent>;
  removeStudent: (studentId: string) => Promise<void>;
  bulkUpdateStudents: (studentIds: string[], operation: BulkOperation) => Promise<BulkOperationResult>;
  importStudents: (file: File) => Promise<StudentImportResult>;
  exportStudents: (studentIds?: string[]) => Promise<void>;
  updateClassSettings: (settings: Partial<ClassroomSettings>) => Promise<ClassroomSettings>;
  refreshData: () => Promise<void>;
}

export const useClassroomManagement = (classId: string): UseClassroomManagementReturn => {
  const [students, setStudents] = useState<ClassroomStudent[]>([]);
  const [classSettings, setClassSettings] = useState<ClassroomSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch students and class settings
  const fetchData = useCallback(async () => {
    if (!classId) return;

    try {
      setIsLoading(true);
      setError(null);

      const [studentsResponse, settingsResponse] = await Promise.all([
        apiClient.get(`/teacher/classes/${classId}/students`),
        apiClient.get(`/teacher/classes/${classId}/settings`)
      ]);

      setStudents(studentsResponse.data);
      setClassSettings(settingsResponse.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load classroom data';
      setError(errorMessage);
      console.error('Error fetching classroom data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [classId]);

  // Add new student
  const addStudent = useCallback(async (studentData: Omit<ClassroomStudent, 'id' | 'enrolledAt'>): Promise<ClassroomStudent> => {
    try {
      const response = await apiClient.post(`/teacher/classes/${classId}/students`, studentData);
      const newStudent = response.data;
      
      setStudents(prev => [...prev, newStudent]);
      return newStudent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add student';
      throw new Error(errorMessage);
    }
  }, [classId]);

  // Update existing student
  const updateStudent = useCallback(async (student: ClassroomStudent): Promise<ClassroomStudent> => {
    try {
      const response = await apiClient.put(`/teacher/classes/${classId}/students/${student.id}`, student);
      const updatedStudent = response.data;
      
      setStudents(prev => prev.map(s => s.id === student.id ? updatedStudent : s));
      return updatedStudent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update student';
      throw new Error(errorMessage);
    }
  }, [classId]);

  // Remove student
  const removeStudent = useCallback(async (studentId: string): Promise<void> => {
    try {
      await apiClient.delete(`/teacher/classes/${classId}/students/${studentId}`);
      setStudents(prev => prev.filter(s => s.id !== studentId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove student';
      throw new Error(errorMessage);
    }
  }, [classId]);

  // Bulk update students
  const bulkUpdateStudents = useCallback(async (
    studentIds: string[], 
    operation: BulkOperation
  ): Promise<BulkOperationResult> => {
    try {
      const response = await apiClient.post(`/teacher/classes/${classId}/students/bulk`, {
        studentIds,
        operation
      });
      
      const result = response.data;
      
      // Refresh data to get updated student states
      await fetchData();
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bulk operation failed';
      throw new Error(errorMessage);
    }
  }, [classId, fetchData]);

  // Import students from CSV
  const importStudents = useCallback(async (file: File): Promise<StudentImportResult> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post(`/teacher/classes/${classId}/students/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const result = response.data;
      
      // Refresh data to show imported students
      await fetchData();
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Import failed';
      throw new Error(errorMessage);
    }
  }, [classId, fetchData]);

  // Export students to CSV
  const exportStudents = useCallback(async (studentIds?: string[]): Promise<void> => {
    try {
      const params = studentIds ? { studentIds: studentIds.join(',') } : {};
      
      const response = await apiClient.get(`/teacher/classes/${classId}/students/export`, {
        params,
        responseType: 'blob'
      });
      
      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `students_${classId}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      throw new Error(errorMessage);
    }
  }, [classId]);

  // Update class settings
  const updateClassSettings = useCallback(async (
    settingsUpdate: Partial<ClassroomSettings>
  ): Promise<ClassroomSettings> => {
    try {
      const response = await apiClient.put(`/teacher/classes/${classId}/settings`, settingsUpdate);
      const updatedSettings = response.data;
      
      setClassSettings(updatedSettings);
      return updatedSettings;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings';
      throw new Error(errorMessage);
    }
  }, [classId]);

  // Refresh data manually
  const refreshData = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    students,
    classSettings,
    isLoading,
    error,
    addStudent,
    updateStudent,
    removeStudent,
    bulkUpdateStudents,
    importStudents,
    exportStudents,
    updateClassSettings,
    refreshData
  };
};