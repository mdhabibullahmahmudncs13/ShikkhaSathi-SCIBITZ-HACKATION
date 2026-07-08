import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import {
  GradebookExportRequest,
  GradebookImportResult,
  ClassGradeStatistics,
  GradeScale
} from '../types/gradebook';

interface UseGradebookIntegrationReturn {
  statistics: ClassGradeStatistics | null;
  supportedFormats: any | null;
  isLoading: boolean;
  error: string | null;
  exportGradebook: (request: GradebookExportRequest) => Promise<void>;
  importGradebook: (file: File, gradeScale: GradeScale) => Promise<GradebookImportResult>;
  validateCSV: (file: File) => Promise<any>;
  getStatistics: () => Promise<void>;
  getMappingSuggestions: () => Promise<any>;
  syncWithExternal: (system: string, config: any) => Promise<any>;
}

export const useGradebookIntegration = (classId: string): UseGradebookIntegrationReturn => {
  const [statistics, setStatistics] = useState<ClassGradeStatistics | null>(null);
  const [supportedFormats, setSupportedFormats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch statistics
  const getStatistics = useCallback(async () => {
    if (!classId) return;

    try {
      setError(null);
      const response = await apiClient.get(`/gradebook/classes/${classId}/gradebook/statistics`);
      setStatistics(response.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load statistics';
      setError(errorMessage);
      console.error('Error fetching gradebook statistics:', err);
    }
  }, [classId]);

  // Fetch supported formats
  const fetchSupportedFormats = useCallback(async () => {
    try {
      const response = await apiClient.get('/gradebook/formats');
      setSupportedFormats(response.data);
    } catch (err) {
      console.error('Error fetching supported formats:', err);
    }
  }, []);

  // Export gradebook
  const exportGradebook = useCallback(async (request: GradebookExportRequest): Promise<void> => {
    try {
      const response = await apiClient.post(
        `/gradebook/classes/${classId}/gradebook/export`,
        request,
        {
          responseType: 'blob'
        }
      );

      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `gradebook_${request.format}_${timestamp}.csv`;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      throw new Error(errorMessage);
    }
  }, [classId]);

  // Import gradebook
  const importGradebook = useCallback(async (
    file: File, 
    gradeScale: GradeScale
  ): Promise<GradebookImportResult> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post(
        `/gradebook/classes/${classId}/gradebook/import?grade_scale=${gradeScale}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Import failed';
      throw new Error(errorMessage);
    }
  }, [classId]);

  // Validate CSV
  const validateCSV = useCallback(async (file: File): Promise<any> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post(
        `/gradebook/classes/${classId}/gradebook/validate-csv`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Validation failed';
      throw new Error(errorMessage);
    }
  }, [classId]);

  // Get mapping suggestions
  const getMappingSuggestions = useCallback(async (): Promise<any> => {
    try {
      const response = await apiClient.get(
        `/gradebook/classes/${classId}/gradebook/mapping-suggestions`
      );
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get suggestions';
      throw new Error(errorMessage);
    }
  }, [classId]);

  // Sync with external system
  const syncWithExternal = useCallback(async (system: string, config: any): Promise<any> => {
    try {
      const response = await apiClient.post(
        `/gradebook/classes/${classId}/gradebook/sync`,
        {
          external_system: system,
          mapping_config: config
        }
      );
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync failed';
      throw new Error(errorMessage);
    }
  }, [classId]);

  // Initial data loading
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          getStatistics(),
          fetchSupportedFormats()
        ]);
      } catch (err) {
        console.error('Error loading initial data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (classId) {
      loadInitialData();
    }
  }, [classId, getStatistics, fetchSupportedFormats]);

  return {
    statistics,
    supportedFormats,
    isLoading,
    error,
    exportGradebook,
    importGradebook,
    validateCSV,
    getStatistics,
    getMappingSuggestions,
    syncWithExternal
  };
};