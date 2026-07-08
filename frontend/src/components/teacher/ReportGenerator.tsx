import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  Users, 
  User, 
  BarChart3,
  TrendingUp,
  Clock,
  Filter,
  Eye,
  Settings,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { 
  ReportType,
  ReportTemplate,
  ReportRequest,
  IndividualStudentReportRequest,
  ClassSummaryReportRequest,
  ComparativeAnalysisReportRequest,
  ReportResponse,
  ExportFormat,
  ReportGenerationState,
  ClassOverview,
  StudentSummary
} from '../../types/teacher';

interface ReportGeneratorProps {
  classes: ClassOverview[];
  onGenerateReport: (type: ReportType, request: any) => Promise<ReportResponse>;
  onExportReport: (reportData: any, format: ExportFormat, filename?: string) => Promise<void>;
  templates: ReportTemplate[];
  exportFormats: Array<{format: ExportFormat; name: string; description: string}>;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  classes,
  onGenerateReport,
  onExportReport,
  templates,
  exportFormats
}) => {
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('individual_student');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date()
  });
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [generatedReports, setGeneratedReports] = useState<ReportResponse[]>([]);
  const [generationState, setGenerationState] = useState<ReportGenerationState>({
    isGenerating: false,
    progress: 0,
    currentStep: ''
  });
  const [previewReport, setPreviewReport] = useState<ReportResponse | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const reportTypes = [
    {
      type: 'individual_student' as ReportType,
      name: 'Individual Student Report',
      description: 'Detailed report for a specific student',
      icon: User,
      color: 'bg-blue-500'
    },
    {
      type: 'class_summary' as ReportType,
      name: 'Class Summary Report',
      description: 'Overview of entire class performance',
      icon: Users,
      color: 'bg-green-500'
    },
    {
      type: 'comparative_analysis' as ReportType,
      name: 'Comparative Analysis',
      description: 'Compare performance across multiple classes',
      icon: BarChart3,
      color: 'bg-purple-500'
    }
  ];

  const getAvailableTemplates = () => {
    return templates.filter(template => template.type === selectedReportType);
  };

  const getAvailableStudents = () => {
    if (selectedClasses.length === 0) return [];
    
    const students: StudentSummary[] = [];
    selectedClasses.forEach(classId => {
      const classData = classes.find(c => c.id === classId);
      if (classData) {
        students.push(...classData.students);
      }
    });
    
    // Remove duplicates
    return students.filter((student, index, self) => 
      index === self.findIndex(s => s.id === student.id)
    );
  };

  const validateReportRequest = (): string | null => {
    if (selectedReportType === 'individual_student' && !selectedStudent) {
      return 'Please select a student for the individual report';
    }
    
    if (selectedReportType === 'class_summary' && selectedClasses.length !== 1) {
      return 'Please select exactly one class for the class summary report';
    }
    
    if (selectedReportType === 'comparative_analysis' && selectedClasses.length < 2) {
      return 'Please select at least two classes for comparative analysis';
    }
    
    return null;
  };

  const handleGenerateReport = async () => {
    const validationError = validateReportRequest();
    if (validationError) {
      alert(validationError);
      return;
    }

    setGenerationState({
      isGenerating: true,
      progress: 0,
      currentStep: 'Preparing report generation...'
    });

    try {
      let request: any;
      
      if (selectedReportType === 'individual_student') {
        request = {
          studentId: selectedStudent,
          dateFrom: dateRange.start,
          dateTo: dateRange.end,
          templateId: selectedTemplate
        } as IndividualStudentReportRequest;
      } else if (selectedReportType === 'class_summary') {
        request = {
          classId: selectedClasses[0],
          dateFrom: dateRange.start,
          dateTo: dateRange.end,
          templateId: selectedTemplate
        } as ClassSummaryReportRequest;
      } else if (selectedReportType === 'comparative_analysis') {
        request = {
          classIds: selectedClasses,
          dateFrom: dateRange.start,
          dateTo: dateRange.end,
          templateId: selectedTemplate
        } as ComparativeAnalysisReportRequest;
      }

      // Simulate progress updates
      setGenerationState(prev => ({ ...prev, progress: 25, currentStep: 'Collecting data...' }));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setGenerationState(prev => ({ ...prev, progress: 50, currentStep: 'Analyzing performance...' }));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setGenerationState(prev => ({ ...prev, progress: 75, currentStep: 'Generating report...' }));
      
      const report = await onGenerateReport(selectedReportType, request);
      
      setGenerationState(prev => ({ ...prev, progress: 100, currentStep: 'Report completed!' }));
      
      setGeneratedReports(prev => [report, ...prev]);
      
      // Reset generation state after a brief delay
      setTimeout(() => {
        setGenerationState({
          isGenerating: false,
          progress: 0,
          currentStep: ''
        });
      }, 1000);
      
    } catch (error) {
      console.error('Report generation failed:', error);
      setGenerationState({
        isGenerating: false,
        progress: 0,
        currentStep: 'Report generation failed'
      });
    }
  };

  const handlePreviewReport = (report: ReportResponse) => {
    setPreviewReport(report);
    setShowPreview(true);
  };

  const handleExportReport = async (report: ReportResponse, format: ExportFormat) => {
    try {
      const filename = `${report.reportType}_${report.reportId}.${format}`;
      await onExportReport(report.reportData, format, filename);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatGenerationTime = (timeMs: number) => {
    if (timeMs < 1000) return `${timeMs}ms`;
    return `${(timeMs / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report Generator</h1>
          <p className="text-gray-600">Generate comprehensive reports and analytics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Type Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Report Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {reportTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.type}
                    onClick={() => {
                      setSelectedReportType(type.type);
                      setSelectedTemplate('');
                      setSelectedClasses([]);
                      setSelectedStudent('');
                    }}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      selectedReportType === type.type
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg ${type.color} flex items-center justify-center mb-3`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">{type.name}</h4>
                    <p className="text-sm text-gray-600">{type.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Template Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Template</h3>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a template (optional)</option>
              {getAvailableTemplates().map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            {selectedTemplate && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  {getAvailableTemplates().find(t => t.id === selectedTemplate)?.description}
                </p>
              </div>
            )}
          </div>

          {/* Date Range */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Date Range</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={formatDate(dateRange.start)}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={formatDate(dateRange.end)}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Class/Student Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedReportType === 'individual_student' ? 'Select Student' : 'Select Classes'}
            </h3>
            
            {selectedReportType !== 'individual_student' && (
              <div className="space-y-2 mb-4">
                <label className="block text-sm font-medium text-gray-700">Classes</label>
                {classes.map((classData) => (
                  <label key={classData.id} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedClasses.includes(classData.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          if (selectedReportType === 'class_summary') {
                            setSelectedClasses([classData.id]);
                          } else {
                            setSelectedClasses(prev => [...prev, classData.id]);
                          }
                        } else {
                          setSelectedClasses(prev => prev.filter(id => id !== classData.id));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">
                      {classData.name} ({classData.studentCount} students)
                    </span>
                  </label>
                ))}
              </div>
            )}

            {selectedReportType === 'individual_student' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First, select a class</label>
                  <select
                    value={selectedClasses[0] || ''}
                    onChange={(e) => {
                      setSelectedClasses(e.target.value ? [e.target.value] : []);
                      setSelectedStudent('');
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a class</option>
                    {classes.map((classData) => (
                      <option key={classData.id} value={classData.id}>
                        {classData.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedClasses.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Then, select a student</label>
                    <select
                      value={selectedStudent}
                      onChange={(e) => setSelectedStudent(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a student</option>
                      {getAvailableStudents().map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Generate Button */}
          <div className="bg-white rounded-lg shadow p-6">
            <button
              onClick={handleGenerateReport}
              disabled={generationState.isGenerating}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {generationState.isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating Report...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Generate Report</span>
                </>
              )}
            </button>

            {/* Progress Indicator */}
            {generationState.isGenerating && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>{generationState.currentStep}</span>
                  <span>{generationState.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${generationState.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Generated Reports */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated Reports</h3>
            
            {generatedReports.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No reports generated yet</p>
                <p className="text-sm text-gray-500">Generate your first report to see it here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {generatedReports.map((report) => (
                  <div key={report.reportId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 capitalize">
                          {report.reportType.replace('_', ' ')} Report
                        </h4>
                        <p className="text-xs text-gray-500">
                          Generated {report.generatedAt.toLocaleDateString()} • {formatGenerationTime(report.generationTimeMs)}
                        </p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePreviewReport(report)}
                        className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Preview</span>
                      </button>
                      
                      <div className="relative group">
                        <button className="flex items-center space-x-1 text-sm text-green-600 hover:text-green-700">
                          <Download className="w-4 h-4" />
                          <span>Export</span>
                        </button>
                        
                        <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                          <div className="py-1">
                            {exportFormats.map((format) => (
                              <button
                                key={format.format}
                                onClick={() => handleExportReport(report, format.format)}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                {format.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Preview Modal */}
      {showPreview && previewReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Report Preview</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(previewReport.reportData, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportGenerator;