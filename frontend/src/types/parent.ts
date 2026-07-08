// Parent portal type definitions
export interface ParentDashboardData {
  parentId: string;
  children: ChildSummary[];
  notifications: ParentNotification[];
  weeklyReports: WeeklyReport[];
  notificationPreferences: NotificationPreferences;
}

export interface ChildSummary {
  id: string;
  name: string;
  email: string;
  grade: number;
  medium: 'bangla' | 'english';
  totalXP: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  averageScore: number;
  timeSpentThisWeek: number;
  lastActive: Date;
  subjectProgress: ChildSubjectProgress[];
  recentAchievements: Achievement[];
  weakAreas: WeakArea[];
  riskLevel: 'low' | 'medium' | 'high';
  classInfo?: {
    className: string;
    teacherName: string;
    classAverage: number;
  };
}

export interface ChildSubjectProgress {
  subject: string;
  completionPercentage: number;
  averageScore: number;
  timeSpent: number;
  bloomLevelProgress: BloomLevelProgress[];
  lastAccessed: Date;
  topicProgress: TopicProgress[];
}

export interface BloomLevelProgress {
  level: number;
  mastery: number;
  questionsAttempted: number;
  successRate: number;
}

export interface TopicProgress {
  topic: string;
  completionPercentage: number;
  averageScore: number;
  timeSpent: number;
  lastAccessed: Date;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'learning' | 'streak' | 'performance' | 'engagement';
  unlockedAt: Date;
  xpReward: number;
}

export interface WeakArea {
  subject: string;
  topic: string;
  bloomLevel: number;
  successRate: number;
  attemptsCount: number;
  recommendedActions: string[];
}

export interface ParentNotification {
  id: string;
  type: 'achievement' | 'streak_milestone' | 'performance_alert' | 'weekly_report' | 'teacher_message';
  title: string;
  message: string;
  childId: string;
  childName: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
  read: boolean;
  actionRequired: boolean;
  relatedData?: {
    achievementId?: string;
    reportId?: string;
    teacherId?: string;
  };
}

export interface WeeklyReport {
  id: string;
  childId: string;
  childName: string;
  weekStartDate: Date;
  weekEndDate: Date;
  summary: WeeklyReportSummary;
  subjectBreakdown: SubjectWeeklyBreakdown[];
  achievements: Achievement[];
  recommendations: ParentRecommendation[];
  comparativeAnalytics: ComparativeAnalytics;
  generatedAt: Date;
}

export interface WeeklyReportSummary {
  totalTimeSpent: number;
  quizzesCompleted: number;
  averageScore: number;
  streakDays: number;
  xpGained: number;
  levelsGained: number;
  topicsCompleted: number;
  improvementAreas: string[];
  strengths: string[];
}

export interface SubjectWeeklyBreakdown {
  subject: string;
  timeSpent: number;
  quizzesCompleted: number;
  averageScore: number;
  topicsStudied: string[];
  improvementFromLastWeek: number;
  bloomLevelDistribution: {
    level1: number;
    level2: number;
    level3: number;
    level4: number;
    level5: number;
    level6: number;
  };
}

export interface ParentRecommendation {
  type: 'study_schedule' | 'additional_practice' | 'reward_system' | 'teacher_contact';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  actionItems: string[];
  estimatedImpact: 'low' | 'medium' | 'high';
  timeframe: string;
}

export interface ComparativeAnalytics {
  classComparison: {
    childRank: number;
    totalStudents: number;
    percentile: number;
    averageClassScore: number;
    childScore: number;
  };
  gradeComparison: {
    childRank: number;
    totalStudents: number;
    percentile: number;
    averageGradeScore: number;
    childScore: number;
  };
  subjectComparisons: SubjectComparison[];
  privacyNote: string;
}

export interface SubjectComparison {
  subject: string;
  childPerformance: number;
  classAverage: number;
  gradeAverage: number;
  trend: 'improving' | 'stable' | 'declining';
  trendPercentage: number;
}

export interface NotificationPreferences {
  achievements: boolean;
  weeklyReports: boolean;
  performanceAlerts: boolean;
  streakMilestones: boolean;
  teacherMessages: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
}

export interface ChildFilter {
  childId?: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
  subject?: string;
  performanceRange?: {
    min: number;
    max: number;
  };
}

export interface ParentAnalytics {
  childId: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  learningTrends: LearningTrend[];
  engagementMetrics: EngagementMetrics;
  performanceMetrics: PerformanceMetrics;
  goalProgress: GoalProgress[];
}

export interface LearningTrend {
  date: string;
  timeSpent: number;
  quizzesCompleted: number;
  averageScore: number;
  xpGained: number;
}

export interface EngagementMetrics {
  averageSessionDuration: number;
  totalSessions: number;
  streakConsistency: number;
  preferredStudyTimes: string[];
  subjectEngagement: {
    subject: string;
    engagementScore: number;
    timeSpent: number;
  }[];
}

export interface PerformanceMetrics {
  overallImprovement: number;
  subjectImprovements: {
    subject: string;
    improvement: number;
    currentLevel: string;
  }[];
  bloomLevelProgression: {
    level: number;
    progressionRate: number;
    currentMastery: number;
  }[];
  weaknessResolution: {
    topic: string;
    initialSuccessRate: number;
    currentSuccessRate: number;
    improvement: number;
  }[];
}

export interface GoalProgress {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: Date;
  progress: number;
  status: 'on_track' | 'behind' | 'ahead' | 'completed';
}

export interface ReportCustomization {
  includeComparativeData: boolean;
  includeWeakAreas: boolean;
  includeRecommendations: boolean;
  includeAchievements: boolean;
  subjectFilter: string[];
  timeRange: 'week' | 'month' | 'quarter';
  format: 'summary' | 'detailed';
}