// Learning Modules - Game Mode Types
export interface Arena {
  id: string;
  name: string;
  subject: string;
  description: string;
  icon: string;
  color: string;
  bgGradient: string;
  totalAdventures: number;
  completedAdventures: number;
  totalXP: number;
  earnedXP: number;
  isUnlocked: boolean;
  adventures: Adventure[];
}

export interface Adventure {
  id: string;
  arenaId: string;
  name: string;
  chapter: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  estimatedTime: number; // in minutes
  totalTopics: number;
  completedTopics: number;
  totalXP: number;
  earnedXP: number;
  isUnlocked: boolean;
  isCompleted: boolean;
  topics: Topic[];
  chapterBonus: number; // 1000 XP bonus for completing adventure
}

export interface Topic {
  id: string;
  adventureId: string;
  name: string;
  description: string;
  content: string;
  bloomLevel: BloomLevel;
  xpReward: number; // 100 XP per topic
  isCompleted: boolean;
  isUnlocked: boolean;
  questions: BloomQuestion[];
  completedAt?: Date;
}

export interface BloomQuestion {
  id: string;
  topicId: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  bloomLevel: BloomLevel;
  options?: string[]; // for multiple choice
  correctAnswer: string | string[];
  explanation: string;
  points: number;
}

export enum BloomLevel {
  REMEMBER = 1,    // Knowledge - recall facts
  UNDERSTAND = 2,  // Comprehension - explain ideas
  APPLY = 3,       // Application - use knowledge
  ANALYZE = 4,     // Analysis - break down info
  EVALUATE = 5,    // Evaluation - make judgments
  CREATE = 6       // Synthesis - create new ideas
}

export interface TopicProgress {
  topicId: string;
  isCompleted: boolean;
  score: number;
  bloomScores: { [key in BloomLevel]?: number };
  attempts: number;
  timeSpent: number;
  completedAt?: Date;
}

export interface AdventureProgress {
  adventureId: string;
  isStarted: boolean;
  isCompleted: boolean;
  currentTopicIndex: number;
  totalScore: number;
  earnedXP: number;
  topicProgress: TopicProgress[];
  startedAt?: Date;
  completedAt?: Date;
}

export interface ArenaProgress {
  arenaId: string;
  isUnlocked: boolean;
  totalXP: number;
  earnedXP: number;
  adventureProgress: AdventureProgress[];
  unlockedAt?: Date;
}

export interface GameModeStats {
  totalXP: number;
  currentLevel: number;
  arenasUnlocked: number;
  adventuresCompleted: number;
  topicsCompleted: number;
  averageBloomLevel: number;
  streak: number;
  achievements: GameAchievement[];
}

export interface GameAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'arena' | 'adventure' | 'topic' | 'bloom' | 'streak' | 'xp';
  requirement: number;
  progress: number;
  isUnlocked: boolean;
  unlockedAt?: Date;
}

// API Response Types
export interface LearningModulesResponse {
  arenas: Arena[];
  progress: ArenaProgress[];
  stats: GameModeStats;
}

export interface TopicContentResponse {
  topic: Topic;
  content: string;
  nextTopic?: Topic;
  previousTopic?: Topic;
}

export interface QuizSubmissionRequest {
  topicId: string;
  answers: { questionId: string; answer: string | string[] }[];
  timeSpent: number;
}

export interface QuizSubmissionResponse {
  score: number;
  totalPoints: number;
  xpEarned: number;
  bloomScores: { [key in BloomLevel]?: number };
  feedback: QuestionFeedback[];
  isTopicCompleted: boolean;
  isAdventureCompleted: boolean;
  nextTopic?: Topic;
}

export interface QuestionFeedback {
  questionId: string;
  isCorrect: boolean;
  userAnswer: string | string[];
  correctAnswer: string | string[];
  explanation: string;
  bloomLevel: BloomLevel;
}