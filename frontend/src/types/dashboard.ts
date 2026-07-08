// Dashboard type definitions
export interface StudentProgress {
  userId: string;
  totalXP: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  subjectProgress: SubjectProgress[];
  achievements: Achievement[];
  weakAreas: WeakArea[];
  recommendedPath: LearningPath;
}

export interface SubjectProgress {
  subject: string;
  completionPercentage: number;
  bloomLevelProgress: BloomProgress[];
  timeSpent: number;
  lastAccessed: Date;
}

export interface BloomProgress {
  level: number;
  mastery: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  progress?: number;
  target?: number;
}

export interface WeakArea {
  subject: string;
  topic: string;
  bloomLevel: number;
  successRate: number;
}

export interface LearningPath {
  currentTopic: string;
  recommendedNextTopics: RecommendedTopic[];
  completedTopics: string[];
}

export interface RecommendedTopic {
  subject: string;
  topic: string;
  difficulty: number;
  reason: string;
  estimatedTime: number;
}

export interface Notification {
  id: string;
  type: 'achievement' | 'streak' | 'recommendation' | 'quiz';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}
