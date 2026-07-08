import React, { useState } from 'react';
import { FileText, BarChart3, TrendingUp, Download } from 'lucide-react';
import ReportGenerator from './ReportGenerator';
import { useReports } from '../../hooks/useReports';
import { 
  ReportType,
  ReportResponse,
  IndividualStudentReportRequest,
  ClassSummaryReportRequest,
  ComparativeAnalysisReportRequest,
  ExportFormat,
  ClassOverview
} from '../../types/teacher';

interface ReportContainerProps {
  classes: ClassOverview[];
}

const ReportContainer: React.FC<ReportContainerProps> = ({ classes }) => {
  const {
    templates,
    exportFormats,
    loading,
    error,
    generateIndividualStudentReport,
    generateClassSummaryReport,
    generateComparativeAnalysisReport,
    exportReport
  } = useReports();

  const [activeTab, setActiveTab] = useState<'generator' | 'analytics'>('generator');

  const handleGenerateReport = async (type: ReportType, request: any): Promise<ReportResponse> => {
    switch (type) {
      case 'individual_student':
        return await generateIndividualStudentReport(request as IndividualStudentReportRequest);
      case 'class_summary':
        return await generateClassSummaryReport(request as ClassSummaryReportRequest);
      case 'comparative_analysis':
        return await generateComparativeAnalysisReport(request as ComparativeAnalysisReportRequest);
      default:
        throw new Error(`Unsupported report type: ${type}`);
    }
  };

  const handleExportReport = async (reportData: any, format: ExportFormat, filename?: string) => {
    await exportReport(reportData, format, filename);
  };

  const tabs = [
    { id: 'generator', label: 'Report Generator', icon: FileText },
    { id: 'analytics', label: 'Report Analytics', icon: BarChart3 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Generate comprehensive reports and export data</p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="text-red-600 text-sm">{error}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'generator' && (
        <ReportGenerator
          classes={classes}
          onGenerateReport={handleGenerateReport}
          onExportReport={handleExportReport}
          templates={templates}
          exportFormats={exportFormats}
        />
      )}

      {activeTab === 'analytics' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Report Analytics</h3>
            <p className="text-gray-600 mb-6">
              Advanced analytics and insights from your generated reports will be available here.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="text-2xl font-bold text-gray-900 mb-2">0</div>
                <div className="text-sm text-gray-600">Reports Generated</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="text-2xl font-bold text-gray-900 mb-2">0</div>
                <div className="text-sm text-gray-600">Data Exports</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="text-2xl font-bold text-gray-900 mb-2">0</div>
                <div className="text-sm text-gray-600">Insights Generated</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportContainer;