/**
 * Learning Path Type Definitions
 * 
 * TypeScript interfaces for learning path management in the teacher dashboard.
 */

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  subject: string;
  gradeLevel: number;
  topics: TopicNode[];
  milestones: PathMilestone[];
  estimatedDurationDays: number;
  difficultyStrategy: DifficultyStrategy;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isTemplate: boolean;
  usageCount: number;
  effectivenessRating: number;
}

export interface TopicNode {
  topicId: string;
  title: string;
  description?: string;
  difficultyLevel: DifficultyLevel;
  currentMastery: number;
  targetMastery: number;
  estimatedDays: number;
  prerequisites: string[];
  isWeakArea: boolean;
  resources?: LearningResource[];
}

export interface PathMilestone {
  id: string;
  title: string;
  description: string;
  milestoneType: 'foundation' | 'progress' | 'mastery';
  topicIds: string[];
  targetDate: Date;
  requiredMastery: number;
  rewardXp: number;
  isCritical: boolean;
  completedAt?: Date;
}

export interface LearningResource {
  id: string;
  title: string;
  type: 'video' | 'article' | 'quiz' | 'exercise' | 'game';
  url?: string;
  duration?: number;
  difficulty: DifficultyLevel;
}

export interface StudentAssignment {
  studentId: string;
  studentName: string;
  studentEmail: string;
  currentLevel: number;
  overallProgress: number;
  isAtRisk: boolean;
  weakAreas: string[];
  strongAreas: string[];
  lastActive: Date;
  selected: boolean;
}

export interface ClassInfo {
  id: string;
  name: string;
  subject: string;
  gradeLevel: number;
  studentCount: number;
  students: StudentAssignment[];
  selected: boolean;
}

export interface PathRecommendation {
  path: LearningPath;
  confidenceScore: number;
  reasoning: string;
  alternativePaths: LearningPath[];
}

export interface AssignmentRequest {
  pathId: string;
  studentIds: string[];
  classIds: string[];
  customMessage?: string;
  notifyParents: boolean;
  startDate?: Date;
  customizations?: PathCustomization[];
}

export interface PathCustomization {
  studentId: string;
  difficultyAdjustment?: DifficultyStrategy;
  additionalTopics?: string[];
  excludedTopics?: string[];
  timeExtension?: number;
  customMilestones?: PathMilestone[];
}

export interface AssignmentProgress {
  assignmentId: string;
  studentId: string;
  pathId: string;
  completedTopics: string[];
  currentTopic?: string;
  completedMilestones: string[];
  overallProgress: number;
  timeSpent: number;
  lastActivity: Date;
  isOnTrack: boolean;
  strugglingTopics: string[];
}

export interface PathTemplate {
  id: string;
  title: string;
  description: string;
  subject: string;
  gradeLevel: number;
  topics: string[];
  difficultyLevel: DifficultyLevel;
  estimatedDurationDays: number;
  createdBy: string;
  createdAt: Date;
  usageCount: number;
  effectivenessRating: number;
  isPublic: boolean;
}

export interface NotificationSettings {
  notifyStudents: boolean;
  notifyParents: boolean;
  reminderSchedule: ReminderSchedule[];
  customMessage?: string;
  emailTemplate?: string;
}

export interface ReminderSchedule {
  type: 'milestone_due' | 'path_start' | 'progress_check' | 'completion';
  daysBefore: number;
  enabled: boolean;
}

export interface PathAnalytics {
  pathId: string;
  totalAssignments: number;
  completionRate: number;
  averageCompletionTime: number;
  topicSuccessRates: Record<string, number>;
  commonStrugglePoints: string[];
  effectivenessScore: number;
  studentFeedback: PathFeedback[];
}

export interface PathFeedback {
  studentId: string;
  rating: number;
  difficulty: number;
  engagement: number;
  comments?: string;
  submittedAt: Date;
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type DifficultyStrategy = 'conservative' | 'balanced' | 'aggressive';

export interface PathCreationRequest {
  title: string;
  description: string;
  subject: string;
  gradeLevel: number;
  targetTopics: string[];
  difficultyPreference?: DifficultyLevel;
  timeConstraintDays?: number;
  includePrerequisites: boolean;
  customMilestones?: Partial<PathMilestone>[];
}

export interface BulkAssignmentRequest {
  pathTemplateId: string;
  studentIds: string[];
  customizePerStudent: boolean;
  startDate?: Date;
  notificationSettings: NotificationSettings;
}

export interface PathValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface PathAssignmentFilters {
  subject?: string;
  gradeLevel?: number;
  difficultyLevel?: DifficultyLevel;
  completionStatus?: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  assignedDateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
}

export interface PathAssignmentSortOptions {
  field: 'assignedDate' | 'progress' | 'studentName' | 'dueDate' | 'difficulty';
  direction: 'asc' | 'desc';
}

// API Response Types
export interface PathRecommendationResponse {
  studentId: string;
  subject: string;
  recommendations: PathRecommendation[];
  generatedAt: Date;
  expiresAt: Date;
}

export interface PathAssignmentResponse {
  assignmentId: string;
  studentId: string;
  path: LearningPath;
  assignedAt: Date;
  notificationsSent: string[];
}

export interface BulkAssignmentResponse {
  successfulAssignments: PathAssignmentResponse[];
  failedAssignments: Array<{
    studentId: string;
    reason: string;
  }>;
  totalRequested: number;
  totalSuccessful: number;
  notificationsSent: number;
}