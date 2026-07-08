// Gradebook integration system types

export type GradeScale = 'percentage' | 'gpa_4_0' | 'bangladesh';
export type ExportFormat = 'standard' | 'detailed' | 'google_classroom' | 'canvas' | 'blackboard' | 'moodle';

export interface GradebookEntry {
  studentId: string;
  studentName: string;
  assessmentId: string;
  assessmentTitle: string;
  score: number;
  maxScore: number;
  percentage: number;
  letterGrade?: string;
  submittedAt: Date;
  gradedAt?: Date;
  feedback?: string;
  attempts: number;
  timeSpent: number;
  subject: string;
  topic: string;
}

export interface GradebookExportRequest {
  classId: string;
  dateFrom?: Date;
  dateTo?: Date;
  format: ExportFormat;
  gradeScale: GradeScale;
  includeDetails: boolean;
  includeComments: boolean;
  includeStatistics: boolean;
  assessmentIds?: string[];
  studentIds?: string[];
}

export interface GradebookImportRequest {
  classId: string;
  csvData: string;
  format: ExportFormat;
  gradeScale: GradeScale;
  hasHeaders: boolean;
  columnMapping: Record<string, string>;
  validateOnly: boolean;
}

export interface ImportValidationResult {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ImportError[];
  warnings: ImportWarning[];
  preview: GradebookEntry[];
}

export interface ImportError {
  row: number;
  column: string;
  value: any;
  error: string;
  severity: 'error' | 'warning';
}

export interface ImportWarning {
  row: number;
  column: string;
  value: any;
  warning: string;
  suggestion?: string;
}

export interface ImportResult {
  successful: number;
  failed: number;
  updated: number;
  created: number;
  skipped: number;
  errors: ImportError[];
  summary: {
    totalProcessed: number;
    processingTimeMs: number;
    duplicatesFound: number;
    gradesImported: number;
  };
}

export interface GradeMapping {
  sourceScale: GradeScale;
  targetScale: GradeScale;
  mappings: Array<{
    sourceValue: string | number;
    targetValue: string | number;
    description: string;
  }>;
}

export interface GradeMappingSuggestion {
  confidence: number;
  mapping: GradeMapping;
  reasoning: string;
  alternatives?: GradeMapping[];
}

export interface ClassStatistics {
  classId: string;
  className: string;
  totalStudents: number;
  totalAssessments: number;
  overallMetrics: {
    classAverage: number;
    median: number;
    standardDeviation: number;
    highestScore: number;
    lowestScore: number;
    passingRate: number;
  };
  gradeDistribution: Record<string, number>;
  subjectBreakdown: Record<string, {
    average: number;
    assessmentCount: number;
    studentCount: number;
  }>;
  performanceTrends: Array<{
    date: Date;
    average: number;
    assessmentCount: number;
  }>;
  topPerformers: Array<{
    studentId: string;
    studentName: string;
    average: number;
  }>;
  strugglingStudents: Array<{
    studentId: string;
    studentName: string;
    average: number;
  }>;
}

export interface ExternalSystemConfig {
  systemType: 'google_classroom' | 'canvas' | 'blackboard' | 'moodle' | 'custom';
  apiEndpoint?: string;
  apiKey?: string;
  credentials?: Record<string, any>;
  syncSettings: {
    autoSync: boolean;
    syncFrequency: 'hourly' | 'daily' | 'weekly';
    lastSync?: Date;
    nextSync?: Date;
  };
  fieldMappings: Record<string, string>;
}

export interface SyncResult {
  systemType: string;
  syncedAt: Date;
  successful: number;
  failed: number;
  updated: number;
  created: number;
  errors: Array<{
    recordId: string;
    error: string;
  }>;
  summary: {
    totalProcessed: number;
    processingTimeMs: number;
    dataIntegrityChecks: boolean;
  };
}

export interface GradebookTemplate {
  id: string;
  name: string;
  description: string;
  format: ExportFormat;
  gradeScale: GradeScale;
  columns: Array<{
    name: string;
    type: 'student_info' | 'assessment' | 'calculated' | 'metadata';
    required: boolean;
    defaultValue?: any;
  }>;
  settings: {
    includeComments: boolean;
    includeStatistics: boolean;
    groupBySubject: boolean;
    sortBy: string;
  };
}

export interface GradebookFilter {
  classId?: string;
  studentIds?: string[];
  assessmentIds?: string[];
  subjects?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  gradeRange?: {
    min: number;
    max: number;
  };
  includeIncomplete?: boolean;
}

export interface GradebookState {
  entries: GradebookEntry[];
  statistics: ClassStatistics | null;
  isLoading: boolean;
  isExporting: boolean;
  isImporting: boolean;
  isSyncing: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface ExportProgress {
  stage: 'preparing' | 'processing' | 'formatting' | 'finalizing';
  progress: number;
  message: string;
  estimatedTimeRemaining?: number;
}

export interface ImportProgress {
  stage: 'validating' | 'processing' | 'saving' | 'finalizing';
  progress: number;
  message: string;
  processedRows: number;
  totalRows: number;
  estimatedTimeRemaining?: number;
}

export interface GradebookIntegrationSettings {
  defaultGradeScale: GradeScale;
  defaultExportFormat: ExportFormat;
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  dataRetentionDays: number;
  allowBulkOperations: boolean;
  requireConfirmation: boolean;
  externalSystems: ExternalSystemConfig[];
}