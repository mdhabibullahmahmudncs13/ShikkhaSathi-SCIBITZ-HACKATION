import { useState, useEffect, useCallback } from 'react';
import { 
  ReportType,
  ReportTemplate,
  ReportResponse,
  IndividualStudentReportRequest,
  ClassSummaryReportRequest,
  ComparativeAnalysisReportRequest,
  ExportFormat,
  ExportFormatInfo
} from '../types/teacher';
import { apiClient } from '../services/apiClient';

interface UseReportsReturn {
  // State
  templates: ReportTemplate[];
  exportFormats: ExportFormatInfo[];
  loading: boolean;
  error: string | null;
  
  // Actions
  generateIndividualStudentReport: (request: IndividualStudentReportRequest) => Promise<ReportResponse>;
  generateClassSummaryReport: (request: ClassSummaryReportRequest) => Promise<ReportResponse>;
  generateComparativeAnalysisReport: (request: ComparativeAnalysisReportRequest) => Promise<ReportResponse>;
  exportReport: (reportData: any, format: ExportFormat, filename?: string) => Promise<void>;
  emailReport: (reportData: any, recipientEmail: string, subject?: string, message?: string) => Promise<void>;
  
  // Data loading
  loadTemplates: () => Promise<void>;
  loadExportFormats: () => Promise<void>;
  refreshData: () => Promise<void>;
}

export const useReports = (): UseReportsReturn => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [exportFormats, setExportFormats] = useState<ExportFormatInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate individual student report
  const generateIndividualStudentReport = useCallback(async (request: IndividualStudentReportRequest): Promise<ReportResponse> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.post('/reports/individual-student', {
        student_id: request.studentId,
        date_from: request.dateFrom?.toISOString(),
        date_to: request.dateTo?.toISOString(),
        template_id: request.templateId
      });
      
      // Transform response
      const report: ReportResponse = {
        reportId: response.data.report_id,
        reportType: response.data.report_type,
        reportData: transformReportData(response.data.report_data),
        generatedAt: new Date(response.data.generated_at),
        generationTimeMs: response.data.generation_time_ms
      };
      
      return report;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate individual student report');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate class summary report
  const generateClassSummaryReport = useCallback(async (request: ClassSummaryReportRequest): Promise<ReportResponse> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.post('/reports/class-summary', {
        class_id: request.classId,
        date_from: request.dateFrom?.toISOString(),
        date_to: request.dateTo?.toISOString(),
        template_id: request.templateId
      });
      
      // Transform response
      const report: ReportResponse = {
        reportId: response.data.report_id,
        reportType: response.data.report_type,
        reportData: transformReportData(response.data.report_data),
        generatedAt: new Date(response.data.generated_at),
        generationTimeMs: response.data.generation_time_ms
      };
      
      return report;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate class summary report');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate comparative analysis report
  const generateComparativeAnalysisReport = useCallback(async (request: ComparativeAnalysisReportRequest): Promise<ReportResponse> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.post('/reports/comparative-analysis', {
        class_ids: request.classIds,
        date_from: request.dateFrom?.toISOString(),
        date_to: request.dateTo?.toISOString(),
        template_id: request.templateId
      });
      
      // Transform response
      const report: ReportResponse = {
        reportId: response.data.report_id,
        reportType: response.data.report_type,
        reportData: transformReportData(response.data.report_data),
        generatedAt: new Date(response.data.generated_at),
        generationTimeMs: response.data.generation_time_ms
      };
      
      return report;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate comparative analysis report');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Export report
  const exportReport = useCallback(async (reportData: any, format: ExportFormat, filename?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      let endpoint = '';
      let responseType: 'blob' | 'json' = 'blob';
      
      switch (format) {
        case 'csv':
          endpoint = '/reports/export/csv';
          break;
        case 'json':
          endpoint = '/reports/export/json';
          break;
        case 'pdf':
          endpoint = '/reports/export/pdf';
          break;
        case 'excel':
          endpoint = '/reports/export/excel';
          break;
        default:
          throw new Error('Unsupported export format');
      }
      
      const response = await apiClient.post(endpoint, {
        report_data: reportData,
        format: format,
        filename: filename
      }, {
        responseType
      });
      
      // Create download link
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `report.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to export report');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Email report
  const emailReport = useCallback(async (reportData: any, recipientEmail: string, subject?: string, message?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // First export the report as PDF
      const exportResponse = await apiClient.post('/reports/export/pdf', {
        report_data: reportData,
        format: 'pdf',
        filename: `report_${Date.now()}.pdf`
      }, {
        responseType: 'blob'
      });
      
      // Create export result object
      const exportResult = {
        success: true,
        file_path: '', // Not needed for frontend
        filename: `report_${Date.now()}.pdf`,
        format: 'pdf' as ExportFormat,
        size_bytes: exportResponse.data.size || 0,
        generated_at: new Date().toISOString()
      };
      
      // Send email with the exported report
      await apiClient.post('/reports/email', {
        export_result: exportResult,
        recipient_email: recipientEmail,
        subject: subject,
        message: message
      });
      
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to email report');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load report templates
  const loadTemplates = useCallback(async () => {
    setError(null);
    
    try {
      const response = await apiClient.get('/reports/templates');
      
      const transformedTemplates: ReportTemplate[] = response.data.map((template: any) => ({
        id: template.id,
        name: template.name,
        description: template.description,
        type: template.type,
        sections: template.sections
      }));
      
      setTemplates(transformedTemplates);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load report templates');
      console.error('Failed to load templates:', err);
    }
  }, []);

  // Load export formats
  const loadExportFormats = useCallback(async () => {
    setError(null);
    
    try {
      const response = await apiClient.get('/reports/formats');
      
      const transformedFormats: ExportFormatInfo[] = response.data.map((format: any) => ({
        format: format.format,
        name: format.name,
        description: format.description,
        mimeType: format.mime_type
      }));
      
      setExportFormats(transformedFormats);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load export formats');
      console.error('Failed to load export formats:', err);
    }
  }, []);

  // Refresh all data
  const refreshData = useCallback(async () => {
    await Promise.all([
      loadTemplates(),
      loadExportFormats()
    ]);
  }, [loadTemplates, loadExportFormats]);

  // Load initial data
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    // State
    templates,
    exportFormats,
    loading,
    error,
    
    // Actions
    generateIndividualStudentReport,
    generateClassSummaryReport,
    generateComparativeAnalysisReport,
    exportReport,
    emailReport,
    
    // Data loading
    loadTemplates,
    loadExportFormats,
    refreshData
  };
};

// Helper function to transform report data from API format to frontend format
function transformReportData(data: any): any {
  if (!data) return data;
  
  // Transform date strings to Date objects
  const transformDates = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'string') {
      // Check if it's a date string
      if (obj.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        return new Date(obj);
      }
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(transformDates);
    }
    
    if (typeof obj === 'object') {
      const transformed: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Transform snake_case to camelCase for specific keys
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        transformed[camelKey] = transformDates(value);
      }
      return transformed;
    }
    
    return obj;
  };
  
  return transformDates(data);
}