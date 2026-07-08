import React, { useState, useEffect } from 'react';
import {
  Download,
  Upload,
  FileText,
  BarChart3,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  ExternalLink,
  Users,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { useGradebookIntegration } from '../../hooks/useGradebookIntegration';
import {
  GradebookExportRequest,
  ImportResult,
  ExportFormat,
  GradeScale
} from '../../types/gradebook';

interface GradebookIntegrationProps {
  classId: string;
  onOperationComplete?: (operation: string, result: any) => void;
}

interface ExportConfigState {
  format: ExportFormat;
  gradeScale: GradeScale;
  dateFrom: string;
  dateTo: string;
  includeAssignments: boolean;
  includeQuizzes: boolean;
  includeAssessments: boolean;
  selectedStudents: string[];
}

interface ImportState {
  isOpen: boolean;
  file: File | null;
  gradeScale: GradeScale;
  isProcessing: boolean;
  results: ImportResult | null;
  validationResults: any | null;
  error: string | null;
}

const GradebookIntegration: React.FC<GradebookIntegrationProps> = ({
  classId,
  onOperationComplete
}) => {
  const {
    statistics,
    isLoading,
    error,
    exportGradebook,
    importGradebook,
    validateCSV,
    getStatistics,
    getMappingSuggestions
  } = useGradebookIntegration(classId);

  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'statistics' | 'sync'>('export');
  const [exportConfig, setExportConfig] = useState<ExportConfigState>({
    format: 'standard' as ExportFormat,
    gradeScale: 'percentage' as GradeScale,
    dateFrom: '',
    dateTo: '',
    includeAssignments: true,
    includeQuizzes: true,
    includeAssessments: true,
    selectedStudents: []
  });
  const [importState, setImportState] = useState<ImportState>({
    isOpen: false,
    file: null,
    gradeScale: 'percentage' as GradeScale,
    isProcessing: false,
    results: null,
    validationResults: null,
    error: null
  });
  const [mappingSuggestions, setMappingSuggestions] = useState<any>(null);

  // Load initial data
  useEffect(() => {
    getStatistics();
    loadMappingSuggestions();
  }, [classId]);

  const loadMappingSuggestions = async () => {
    try {
      const suggestions = await getMappingSuggestions();
      setMappingSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to load mapping suggestions:', error);
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      const exportRequest: GradebookExportRequest = {
        format: exportConfig.format,
        grade_scale: exportConfig.gradeScale,
        date_from: exportConfig.dateFrom ? new Date(exportConfig.dateFrom) : undefined,
        date_to: exportConfig.dateTo ? new Date(exportConfig.dateTo) : undefined,
        student_ids: exportConfig.selectedStudents.length > 0 ? exportConfig.selectedStudents : undefined,
        include_assignments: exportConfig.includeAssignments,
        include_quizzes: exportConfig.includeQuizzes,
        include_assessments: exportConfig.includeAssessments
      };

      await exportGradebook(exportRequest);
      onOperationComplete?.('export', exportRequest);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Handle file validation
  const handleFileValidation = async (file: File) => {
    try {
      const results = await validateCSV(file);
      setImportState(prev => ({
        ...prev,
        validationResults: results,
        error: results.valid ? null : results.errors?.join(', ') || 'Validation failed'
      }));
    } catch (error) {
      setImportState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Validation failed'
      }));
    }
  };

  // Handle import
  const handleImport = async () => {
    if (!importState.file) return;

    setImportState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      const results = await importGradebook(importState.file, importState.gradeScale);
      setImportState(prev => ({
        ...prev,
        isProcessing: false,
        results
      }));
      onOperationComplete?.('import', results);
    } catch (error) {
      setImportState(prev => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Import failed'
      }));
    }
  };

  const tabs = [
    { id: 'export', label: 'Export', icon: Download },
    { id: 'import', label: 'Import', icon: Upload },
    { id: 'statistics', label: 'Statistics', icon: BarChart3 },
    { id: 'sync', label: 'Sync', icon: RefreshCw }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading gradebook...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <FileText className="w-6 h-6 mr-2 text-blue-600" />
            Gradebook Integration
          </h2>
          <p className="text-gray-600">
            Import, export, and sync grades with external systems
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'export' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Export Gradebook</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Format
                </label>
                <select
                  value={exportConfig.format}
                  onChange={(e) => setExportConfig(prev => ({ 
                    ...prev, 
                    format: e.target.value as ExportFormat 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="standard">Standard CSV</option>
                  <option value="detailed">Detailed CSV</option>
                  <option value="google_classroom">Google Classroom</option>
                  <option value="canvas">Canvas LMS</option>
                  <option value="blackboard">Blackboard</option>
                  <option value="moodle">Moodle</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grade Scale
                </label>
                <select
                  value={exportConfig.gradeScale}
                  onChange={(e) => setExportConfig(prev => ({ 
                    ...prev, 
                    gradeScale: e.target.value as GradeScale 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="percentage">Percentage (0-100%)</option>
                  <option value="4_point">4.0 GPA Scale</option>
                  <option value="bangladesh">Bangladesh Grading</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date From
                </label>
                <input
                  type="date"
                  value={exportConfig.dateFrom}
                  onChange={(e) => setExportConfig(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date To
                </label>
                <input
                  type="date"
                  value={exportConfig.dateTo}
                  onChange={(e) => setExportConfig(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Include Data Types
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportConfig.includeQuizzes}
                    onChange={(e) => setExportConfig(prev => ({ 
                      ...prev, 
                      includeQuizzes: e.target.checked 
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Quizzes</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportConfig.includeAssessments}
                    onChange={(e) => setExportConfig(prev => ({ 
                      ...prev, 
                      includeAssessments: e.target.checked 
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Assessments</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportConfig.includeAssignments}
                    onChange={(e) => setExportConfig(prev => ({ 
                      ...prev, 
                      includeAssignments: e.target.checked 
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Assignments</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleExport}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Gradebook
              </button>
            </div>
          </div>
        )}

        {activeTab === 'import' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Import Gradebook</h3>
            
            {!importState.results ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grade Scale
                  </label>
                  <select
                    value={importState.gradeScale}
                    onChange={(e) => setImportState(prev => ({ 
                      ...prev, 
                      gradeScale: e.target.value as GradeScale 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="percentage">Percentage (0-100%)</option>
                    <option value="4_point">4.0 GPA Scale</option>
                    <option value="bangladesh">Bangladesh Grading</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select CSV File
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setImportState(prev => ({ ...prev, file }));
                      if (file) {
                        handleFileValidation(file);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    CSV should include: student_id, student_name, and grade columns
                  </p>
                </div>

                {importState.validationResults && (
                  <div className={`p-3 rounded-md ${
                    importState.validationResults.valid 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center">
                      {importState.validationResults.valid ? (
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
                      )}
                      <span className={`text-sm ${
                        importState.validationResults.valid ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {importState.validationResults.valid 
                          ? `Valid CSV with ${importState.validationResults.total_rows} rows`
                          : 'Invalid CSV format'
                        }
                      </span>
                    </div>
                    {importState.validationResults.warnings?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-yellow-700">Warnings:</p>
                        <ul className="text-xs text-yellow-700 list-disc list-inside">
                          {importState.validationResults.warnings.map((warning: string, index: number) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {importState.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">{importState.error}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={handleImport}
                    disabled={!importState.file || !importState.validationResults?.valid || importState.isProcessing}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {importState.isProcessing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Import Gradebook
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <h4 className="font-medium text-green-800 mb-2">Import Results</h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>✅ {importState.results.successful} grades imported successfully</p>
                    {importState.results.failed > 0 && (
                      <p>❌ {importState.results.failed} grades failed to import</p>
                    )}
                    {importState.results.warnings && importState.results.warnings.length > 0 && (
                      <div>
                        <p>⚠️ Warnings:</p>
                        <ul className="list-disc list-inside ml-4">
                          {importState.results.warnings.map((warning: any, index: number) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setImportState({
                    isOpen: false,
                    file: null,
                    gradeScale: 'percentage' as GradeScale,
                    isProcessing: false,
                    results: null,
                    validationResults: null,
                    error: null
                  })}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Import Another File
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'statistics' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Grade Statistics</h3>
            
            {statistics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Users className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-blue-900">Total Students</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{statistics.total_students}</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-green-900">Class Average</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900 mt-1">
                    {statistics.average_score.toFixed(1)}%
                  </p>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <BarChart3 className="w-5 h-5 text-yellow-600 mr-2" />
                    <span className="text-sm font-medium text-yellow-900">Median Score</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-900 mt-1">
                    {statistics.median_score.toFixed(1)}%
                  </p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 text-purple-600 mr-2" />
                    <span className="text-sm font-medium text-purple-900">Total Assignments</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900 mt-1">{statistics.total_assignments}</p>
                </div>
              </div>
            )}

            {mappingSuggestions && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Grade Mapping Suggestions</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Recommended scale: <span className="font-medium">{mappingSuggestions.recommended_scale}</span>
                </p>
                {mappingSuggestions.mapping_suggestions?.suggested_adjustments?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Suggestions:</p>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                      {mappingSuggestions.mapping_suggestions.suggested_adjustments.map((suggestion: string, index: number) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'sync' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">External System Sync</h3>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex items-center">
                <Info className="w-5 h-5 text-yellow-600 mr-2" />
                <span className="text-yellow-800 text-sm">
                  External system synchronization is coming soon. Currently supports manual import/export.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'Google Classroom', status: 'Coming Soon', icon: ExternalLink },
                { name: 'Canvas LMS', status: 'Coming Soon', icon: ExternalLink },
                { name: 'Blackboard', status: 'Coming Soon', icon: ExternalLink },
                { name: 'Moodle', status: 'Coming Soon', icon: ExternalLink }
              ].map((system) => {
                const Icon = system.icon;
                return (
                  <div key={system.name} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Icon className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="font-medium text-gray-900">{system.name}</span>
                      </div>
                      <span className="text-sm text-gray-500">{system.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GradebookIntegration;