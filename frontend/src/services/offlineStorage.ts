import Dexie, { Table } from 'dexie';

// Define interfaces for offline data
export interface OfflineUser {
  id: string;
  email: string;
  fullName: string;
  grade: number;
  medium: 'bangla' | 'english';
  totalXP: number;
  currentLevel: number;
  currentStreak: number;
  lastSync: Date;
}

export interface OfflineLessonContent {
  id: string;
  subject: string;
  grade: number;
  chapter: number;
  topic: string;
  title: string;
  content: string;
  metadata: {
    language: 'bangla' | 'english';
    pageNumber?: number;
    textbookName?: string;
  };
  downloadedAt: Date;
  lastAccessed?: Date;
}

export interface OfflineQuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  subject: string;
  topic: string;
  questions: Array<{
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    userAnswer?: number;
    bloomLevel: number;
  }>;
  score?: number;
  maxScore: number;
  timeTaken?: number;
  difficultyLevel: number;
  completedAt?: Date;
  synced: boolean;
  createdAt: Date;
}

export interface OfflineProgress {
  id: string;
  userId: string;
  subject: string;
  topic: string;
  bloomLevel: number;
  completionPercentage: number;
  timeSpentMinutes: number;
  lastAccessed: Date;
  masteryLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  synced: boolean;
}

export interface OfflineChatMessage {
  id: string;
  userId: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  voiceInput?: boolean;
  timestamp: Date;
  synced: boolean;
}

export interface OfflineAchievement {
  id: string;
  userId: string;
  achievementId: string;
  name: string;
  description: string;
  xpReward: number;
  unlockedAt: Date;
  synced: boolean;
}

// Dexie database class
class ShikkhaSathiDB extends Dexie {
  users!: Table<OfflineUser>;
  lessonContent!: Table<OfflineLessonContent>;
  quizAttempts!: Table<OfflineQuizAttempt>;
  progress!: Table<OfflineProgress>;
  chatMessages!: Table<OfflineChatMessage>;
  achievements!: Table<OfflineAchievement>;

  constructor() {
    super('ShikkhaSathiDB');
    
    this.version(1).stores({
      users: 'id, email, grade, medium, lastSync',
      lessonContent: 'id, subject, grade, chapter, topic, downloadedAt, lastAccessed, [subject+grade]',
      quizAttempts: 'id, userId, quizId, subject, topic, createdAt, completedAt',
      progress: 'id, userId, subject, topic, bloomLevel, lastAccessed',
      chatMessages: 'id, userId, sessionId, timestamp',
      achievements: 'id, userId, achievementId, unlockedAt'
    });
  }
}

export const db = new ShikkhaSathiDB();

// Storage service class
export class OfflineStorageService {
  // User data methods
  async saveUser(user: OfflineUser): Promise<void> {
    await db.users.put(user);
  }

  async getUser(userId: string): Promise<OfflineUser | undefined> {
    return await db.users.get(userId);
  }

  async getCurrentUser(): Promise<OfflineUser | undefined> {
    return await db.users.orderBy('lastSync').reverse().first();
  }

  // Lesson content methods
  async saveLessonContent(content: OfflineLessonContent): Promise<void> {
    await db.lessonContent.put(content);
  }

  async getLessonContent(id: string): Promise<OfflineLessonContent | undefined> {
    return await db.lessonContent.get(id);
  }

  async getLessonsBySubject(subject: string, grade: number): Promise<OfflineLessonContent[]> {
    return await db.lessonContent
      .where('subject')
      .equals(subject)
      .and(lesson => lesson.grade === grade)
      .toArray();
  }

  async searchLessons(query: string, subject?: string): Promise<OfflineLessonContent[]> {
    let collection = db.lessonContent.toCollection();
    
    if (subject) {
      collection = db.lessonContent.where('subject').equals(subject);
    }
    
    return await collection
      .filter(lesson => 
        lesson.title.toLowerCase().includes(query.toLowerCase()) ||
        lesson.content.toLowerCase().includes(query.toLowerCase()) ||
        lesson.topic.toLowerCase().includes(query.toLowerCase())
      )
      .toArray();
  }

  async updateLastAccessed(contentId: string): Promise<void> {
    await db.lessonContent.update(contentId, { lastAccessed: new Date() });
  }

  // Quiz attempt methods
  async saveQuizAttempt(attempt: OfflineQuizAttempt): Promise<void> {
    await db.quizAttempts.put(attempt);
  }

  async getQuizAttempt(id: string): Promise<OfflineQuizAttempt | undefined> {
    return await db.quizAttempts.get(id);
  }

  async getUnsyncedQuizAttempts(): Promise<OfflineQuizAttempt[]> {
    return await db.quizAttempts.filter(attempt => attempt.synced === false).toArray();
  }

  async markQuizAttemptSynced(id: string): Promise<void> {
    await db.quizAttempts.update(id, { synced: true });
  }

  async getQuizAttemptsByUser(userId: string): Promise<OfflineQuizAttempt[]> {
    return await db.quizAttempts.where('userId').equals(userId).toArray();
  }

  // Progress methods
  async saveProgress(progress: OfflineProgress): Promise<void> {
    await db.progress.put(progress);
  }

  async getProgress(userId: string, subject: string, topic: string): Promise<OfflineProgress | undefined> {
    return await db.progress
      .where({ userId, subject, topic })
      .first();
  }

  async getProgressByUser(userId: string): Promise<OfflineProgress[]> {
    return await db.progress.where('userId').equals(userId).toArray();
  }

  async getUnsyncedProgress(): Promise<OfflineProgress[]> {
    return await db.progress.filter(progress => progress.synced === false).toArray();
  }

  async markProgressSynced(id: string): Promise<void> {
    await db.progress.update(id, { synced: true });
  }

  // Chat message methods
  async saveChatMessage(message: OfflineChatMessage): Promise<void> {
    await db.chatMessages.put(message);
  }

  async getChatMessages(userId: string, sessionId: string): Promise<OfflineChatMessage[]> {
    return await db.chatMessages
      .where({ userId, sessionId })
      .orderBy('timestamp')
      .toArray();
  }

  async getUnsyncedChatMessages(): Promise<OfflineChatMessage[]> {
    return await db.chatMessages.filter(message => message.synced === false).toArray();
  }

  async markChatMessageSynced(id: string): Promise<void> {
    await db.chatMessages.update(id, { synced: true });
  }

  // Achievement methods
  async saveAchievement(achievement: OfflineAchievement): Promise<void> {
    await db.achievements.put(achievement);
  }

  async getAchievements(userId: string): Promise<OfflineAchievement[]> {
    return await db.achievements.where('userId').equals(userId).toArray();
  }

  async getUnsyncedAchievements(): Promise<OfflineAchievement[]> {
    return await db.achievements.filter(achievement => achievement.synced === false).toArray();
  }

  async markAchievementSynced(id: string): Promise<void> {
    await db.achievements.update(id, { synced: true });
  }

  // Storage management methods
  async getStorageUsage(): Promise<{
    users: number;
    lessonContent: number;
    quizAttempts: number;
    progress: number;
    chatMessages: number;
    achievements: number;
    total: number;
  }> {
    const [users, lessonContent, quizAttempts, progress, chatMessages, achievements] = await Promise.all([
      db.users.count(),
      db.lessonContent.count(),
      db.quizAttempts.count(),
      db.progress.count(),
      db.chatMessages.count(),
      db.achievements.count()
    ]);

    const total = users + lessonContent + quizAttempts + progress + chatMessages + achievements;

    return {
      users,
      lessonContent,
      quizAttempts,
      progress,
      chatMessages,
      achievements,
      total
    };
  }

  async clearOldData(daysOld: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Clear old lesson content that hasn't been accessed
    await db.lessonContent
      .where('lastAccessed')
      .below(cutoffDate)
      .delete();

    // Clear old synced quiz attempts
    await db.quizAttempts
      .filter(attempt => attempt.synced === true && attempt.createdAt < cutoffDate)
      .delete();

    // Clear old synced chat messages
    await db.chatMessages
      .filter(message => message.synced === true && message.timestamp < cutoffDate)
      .delete();
  }

  async exportData(): Promise<{
    users: OfflineUser[];
    lessonContent: OfflineLessonContent[];
    quizAttempts: OfflineQuizAttempt[];
    progress: OfflineProgress[];
    chatMessages: OfflineChatMessage[];
    achievements: OfflineAchievement[];
  }> {
    const [users, lessonContent, quizAttempts, progress, chatMessages, achievements] = await Promise.all([
      db.users.toArray(),
      db.lessonContent.toArray(),
      db.quizAttempts.toArray(),
      db.progress.toArray(),
      db.chatMessages.toArray(),
      db.achievements.toArray()
    ]);

    return {
      users,
      lessonContent,
      quizAttempts,
      progress,
      chatMessages,
      achievements
    };
  }

  async clearAllData(): Promise<void> {
    await Promise.all([
      db.users.clear(),
      db.lessonContent.clear(),
      db.quizAttempts.clear(),
      db.progress.clear(),
      db.chatMessages.clear(),
      db.achievements.clear()
    ]);
  }
}

export const offlineStorage = new OfflineStorageService();