import { offlineStorage, OfflineQuizAttempt, OfflineProgress, OfflineChatMessage, OfflineAchievement } from './offlineStorage';
import { getApiBaseUrl } from '../utils/apiUrl';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  pendingItems: number;
  failedItems: number;
  syncProgress: number; // 0-100
}

export interface SyncConflict {
  id: string;
  type: 'quiz-attempt' | 'progress' | 'chat-message' | 'achievement';
  localData: any;
  serverData: any;
  timestamp: Date;
  resolved: boolean;
}

export interface SyncError {
  id: string;
  type: 'network' | 'server' | 'conflict' | 'validation';
  message: string;
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

export type SyncEventType = 'status-change' | 'progress-update' | 'conflict-detected' | 'sync-complete' | 'sync-error';

export interface SyncEvent {
  type: SyncEventType;
  data: any;
  timestamp: Date;
}

class SyncManager {
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;
  private syncStatus: SyncStatus;
  private conflicts: SyncConflict[] = [];
  private errors: SyncError[] = [];
  private eventListeners: Map<SyncEventType, ((event: SyncEvent) => void)[]> = new Map();
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000, 5000, 15000]; // Progressive delays in ms
  private readonly SYNC_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.syncStatus = {
      isOnline: this.isOnline,
      isSyncing: false,
      lastSyncTime: null,
      pendingItems: 0,
      failedItems: 0,
      syncProgress: 0
    };

    this.initializeOnlineDetection();
    this.startPeriodicSync();
    this.loadStoredConflicts();
  }

  // Online/Offline Detection
  private initializeOnlineDetection(): void {
    // Enhanced online detection with actual connectivity test
    window.addEventListener('online', () => {
      this.handleOnlineStatusChange(true);
    });

    window.addEventListener('offline', () => {
      this.handleOnlineStatusChange(false);
    });

    // Periodic connectivity check
    setInterval(() => {
      this.checkConnectivity();
    }, 10000); // Check every 10 seconds
  }

  private async checkConnectivity(): Promise<boolean> {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/v1/health`, {
        method: 'HEAD',
        cache: 'no-cache',
        mode: 'cors',
        credentials: 'omit',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      const isOnline = response.ok;
      if (isOnline !== this.isOnline) {
        this.handleOnlineStatusChange(isOnline);
      }
      
      this.isOnline = isOnline;
      return isOnline;
    } catch (error) {
      // Silently handle ERR_BLOCKED_BY_CLIENT and other connection errors
      // Don't log these errors as they're usually caused by ad blockers
      const isOnline = false;
      if (isOnline !== this.isOnline) {
        this.handleOnlineStatusChange(isOnline);
      }
      
      this.isOnline = isOnline;
      return isOnline;
    }
  }

  private handleOnlineStatusChange(isOnline: boolean): void {
    const wasOnline = this.isOnline;
    this.isOnline = isOnline;
    this.syncStatus.isOnline = isOnline;

    this.emitEvent('status-change', { 
      isOnline, 
      wasOnline,
      timestamp: new Date()
    });

    if (isOnline && !wasOnline) {
      // Just came online, start sync
      this.startSync();
    }
  }

  // Sync Management
  public async startSync(): Promise<void> {
    if (this.isSyncing || !this.isOnline) {
      return;
    }

    this.isSyncing = true;
    this.syncStatus.isSyncing = true;
    this.syncStatus.syncProgress = 0;

    try {
      await this.performSync();
      this.syncStatus.lastSyncTime = new Date();
      this.emitEvent('sync-complete', { 
        timestamp: new Date(),
        conflicts: this.conflicts.length,
        errors: this.errors.length
      });
    } catch (error) {
      this.handleSyncError('sync', 'Failed to complete sync', error);
    } finally {
      this.isSyncing = false;
      this.syncStatus.isSyncing = false;
      this.syncStatus.syncProgress = 100;
    }
  }

  private async performSync(): Promise<void> {
    const syncTasks = [
      { name: 'quiz-attempts', fn: () => this.syncQuizAttempts() },
      { name: 'progress', fn: () => this.syncProgress() },
      { name: 'chat-messages', fn: () => this.syncChatMessages() },
      { name: 'achievements', fn: () => this.syncAchievements() }
    ];

    let completedTasks = 0;
    const totalTasks = syncTasks.length;

    for (const task of syncTasks) {
      try {
        await task.fn();
        completedTasks++;
        this.syncStatus.syncProgress = Math.round((completedTasks / totalTasks) * 100);
        this.emitEvent('progress-update', {
          progress: this.syncStatus.syncProgress,
          currentTask: task.name,
          completedTasks,
          totalTasks
        });
      } catch (error) {
        this.handleSyncError('sync', `Failed to sync ${task.name}`, error);
      }
    }

    await this.updateSyncCounts();
  }

  // Individual sync methods
  private async syncQuizAttempts(): Promise<void> {
    const unsyncedAttempts = await offlineStorage.getUnsyncedQuizAttempts();
    
    // Filter out invalid attempts before syncing
    const validAttempts = unsyncedAttempts.filter(attempt => 
      attempt.id?.trim() && attempt.userId?.trim() && attempt.quizId?.trim()
    );
    
    for (const attempt of validAttempts) {
      try {
        await this.syncQuizAttempt(attempt);
      } catch (error) {
        this.handleSyncError('quiz-attempt', 'Failed to sync quiz attempt', error, attempt);
      }
    }
  }

  private async syncQuizAttempt(attempt: OfflineQuizAttempt): Promise<void> {
    // Validate attempt data before syncing
    if (!attempt.id?.trim() || !attempt.userId?.trim() || !attempt.quizId?.trim()) {
      throw new Error('Invalid quiz attempt data: missing required fields');
    }

    const baseUrl = import.meta.env.VITE_API_URL || 'getApiBaseUrl()';
    
    try {
      const response = await fetch(`${baseUrl}/api/v1/quiz/attempts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          quiz_id: attempt.quizId,
          subject: attempt.subject,
          topic: attempt.topic,
          score: attempt.score,
          max_score: attempt.maxScore,
          time_taken_seconds: attempt.timeTaken,
          difficulty_level: attempt.difficultyLevel,
          answers: attempt.questions.map(q => ({
            question_id: q.id,
            user_answer: q.userAnswer,
            correct_answer: q.correctAnswer
          })),
          completed_at: attempt.completedAt?.toISOString()
        }),
      });

      if (response.ok) {
        await offlineStorage.markQuizAttemptSynced(attempt.id);
      } else if (response.status === 409) {
        // Conflict - attempt already exists
        const serverData = await response.json();
        await this.handleConflict('quiz-attempt', attempt, serverData);
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      throw error;
    }
  }

  private async syncProgress(): Promise<void> {
    const unsyncedProgress = await offlineStorage.getUnsyncedProgress();
    
    // Filter out invalid progress items before syncing
    const validProgress = unsyncedProgress.filter(progress => 
      progress.id?.trim() && progress.userId?.trim() && progress.subject?.trim() && progress.topic?.trim()
    );
    
    for (const progress of validProgress) {
      try {
        await this.syncProgressItem(progress);
      } catch (error) {
        this.handleSyncError('progress', 'Failed to sync progress', error, progress);
      }
    }
  }

  private async syncProgressItem(progress: OfflineProgress): Promise<void> {
    // Validate progress data before syncing
    if (!progress.id?.trim() || !progress.userId?.trim() || !progress.subject?.trim() || !progress.topic?.trim()) {
      throw new Error('Invalid progress data: missing required fields');
    }

    const baseUrl = import.meta.env.VITE_API_URL || 'getApiBaseUrl()';
    
    try {
      const response = await fetch(`${baseUrl}/api/v1/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          subject: progress.subject,
          topic: progress.topic,
          bloom_level: progress.bloomLevel,
          completion_percentage: progress.completionPercentage,
          time_spent_minutes: progress.timeSpentMinutes,
          mastery_level: progress.masteryLevel,
          last_accessed: progress.lastAccessed.toISOString()
        }),
      });

      if (response.ok) {
        await offlineStorage.markProgressSynced(progress.id);
      } else if (response.status === 409) {
        // Conflict - progress data differs
        const serverData = await response.json();
        await this.handleConflict('progress', progress, serverData);
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      throw error;
    }
  }

  private async syncChatMessages(): Promise<void> {
    const unsyncedMessages = await offlineStorage.getUnsyncedChatMessages();
    
    // Filter out invalid messages before syncing
    const validMessages = unsyncedMessages.filter(message => 
      message.id?.trim() && message.userId?.trim() && message.sessionId?.trim() && message.content?.trim()
    );
    
    for (const message of validMessages) {
      try {
        await this.syncChatMessage(message);
      } catch (error) {
        this.handleSyncError('chat-message', 'Failed to sync chat message', error, message);
      }
    }
  }

  private async syncChatMessage(message: OfflineChatMessage): Promise<void> {
    // Validate message data before syncing
    if (!message.id?.trim() || !message.userId?.trim() || !message.sessionId?.trim() || !message.content?.trim()) {
      throw new Error('Invalid chat message data: missing required fields');
    }

    const baseUrl = import.meta.env.VITE_API_URL || 'getApiBaseUrl()';
    
    try {
      const response = await fetch(`${baseUrl}/api/v1/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          session_id: message.sessionId,
          role: message.role,
          content: message.content,
          sources: message.sources,
          voice_input: message.voiceInput,
          timestamp: message.timestamp.toISOString()
        }),
      });

      if (response.ok) {
        await offlineStorage.markChatMessageSynced(message.id);
      } else if (response.status === 409) {
        // Message already exists, mark as synced
        await offlineStorage.markChatMessageSynced(message.id);
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      throw error;
    }
  }

  private async syncAchievements(): Promise<void> {
    const unsyncedAchievements = await offlineStorage.getUnsyncedAchievements();
    
    for (const achievement of unsyncedAchievements) {
      try {
        await this.syncAchievement(achievement);
      } catch (error) {
        this.handleSyncError('achievement', 'Failed to sync achievement', error, achievement);
      }
    }
  }

  private async syncAchievement(achievement: OfflineAchievement): Promise<void> {
    const baseUrl = import.meta.env.VITE_API_URL || 'getApiBaseUrl()';
    
    try {
      const response = await fetch(`${baseUrl}/api/v1/gamification/achievements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          achievement_id: achievement.achievementId,
          unlocked_at: achievement.unlockedAt.toISOString()
        }),
      });

      if (response.ok) {
        await offlineStorage.markAchievementSynced(achievement.id);
      } else if (response.status === 409) {
        // Achievement already exists, mark as synced
        await offlineStorage.markAchievementSynced(achievement.id);
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      throw error;
    }
  }

  // Conflict Resolution
  private async handleConflict(type: string, localData: any, serverData: any): Promise<void> {
    const conflict: SyncConflict = {
      id: `${type}-${localData.id}-${Date.now()}`,
      type: type as any,
      localData,
      serverData,
      timestamp: new Date(),
      resolved: false
    };

    this.conflicts.push(conflict);
    await this.storeConflict(conflict);
    
    this.emitEvent('conflict-detected', conflict);

    // Auto-resolve some conflicts based on business rules
    await this.attemptAutoResolve(conflict);
  }

  private async attemptAutoResolve(conflict: SyncConflict): Promise<void> {
    let resolved = false;

    switch (conflict.type) {
      case 'progress':
        // For progress, take the higher completion percentage and more recent timestamp
        const localProgress = conflict.localData as OfflineProgress;
        const serverProgress = conflict.serverData;
        
        if (localProgress.completionPercentage >= serverProgress.completion_percentage &&
            localProgress.lastAccessed >= new Date(serverProgress.last_accessed)) {
          // Local data is more recent and complete, force update server
          await this.forceUpdateServer(conflict);
          resolved = true;
        } else if (serverProgress.completion_percentage > localProgress.completionPercentage) {
          // Server has more progress, update local
          await this.updateLocalFromServer(conflict);
          resolved = true;
        }
        // If neither condition is met, leave conflict unresolved for manual resolution
        break;

      case 'quiz-attempt':
        // Quiz attempts should not conflict if they have different timestamps
        // If they do conflict, keep both with different IDs
        await offlineStorage.markQuizAttemptSynced(conflict.localData.id);
        resolved = true;
        break;
    }

    if (resolved) {
      conflict.resolved = true;
      await this.updateStoredConflict(conflict);
    }
  }

  private async forceUpdateServer(conflict: SyncConflict): Promise<void> {
    // Implementation depends on the specific data type
    // This would make another API call to force update the server
    console.log('Force updating server with local data:', conflict);
  }

  private async updateLocalFromServer(conflict: SyncConflict): Promise<void> {
    // Update local data with server data
    console.log('Updating local data with server data:', conflict);
  }

  // Error Handling and Retry Logic
  private handleSyncError(type: string, message: string, error: any, data?: any): void {
    const syncError: SyncError = {
      id: `${type}-${Date.now()}`,
      type: this.categorizeError(error),
      message,
      data,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: this.MAX_RETRIES
    };

    this.errors.push(syncError);
    this.emitEvent('sync-error', syncError);

    // Schedule retry if appropriate
    if (syncError.type === 'network' && syncError.retryCount < syncError.maxRetries) {
      this.scheduleRetry(syncError);
    }
  }

  private categorizeError(error: any): 'network' | 'server' | 'conflict' | 'validation' {
    if (error.name === 'TypeError' || error.message.includes('fetch') || error.message.includes('Network error')) {
      return 'network';
    }
    if (error.message.includes('409') || error.message.includes('conflict')) {
      return 'conflict';
    }
    if (error.message.includes('400') || error.message.includes('validation') || error.message.includes('Invalid')) {
      return 'validation';
    }
    return 'server';
  }

  private scheduleRetry(error: SyncError): void {
    const delay = this.RETRY_DELAYS[error.retryCount] || this.RETRY_DELAYS[this.RETRY_DELAYS.length - 1];
    
    const timeoutId = setTimeout(async () => {
      error.retryCount++;
      
      try {
        await this.retrySync(error);
        // Remove from errors if successful
        this.errors = this.errors.filter(e => e.id !== error.id);
      } catch (retryError) {
        if (error.retryCount < error.maxRetries) {
          this.scheduleRetry(error);
        } else {
          // Max retries reached, keep in errors list
          console.error('Max retries reached for sync error:', error);
        }
      }
      
      this.retryTimeouts.delete(error.id);
    }, delay);

    this.retryTimeouts.set(error.id, timeoutId);
  }

  private async retrySync(error: SyncError): Promise<void> {
    // Retry the specific sync operation based on error type and data
    if (!error.data) return;

    switch (error.data.constructor.name) {
      case 'OfflineQuizAttempt':
        await this.syncQuizAttempt(error.data);
        break;
      case 'OfflineProgress':
        await this.syncProgressItem(error.data);
        break;
      case 'OfflineChatMessage':
        await this.syncChatMessage(error.data);
        break;
      case 'OfflineAchievement':
        await this.syncAchievement(error.data);
        break;
    }
  }

  // Periodic Sync
  private startPeriodicSync(): void {
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.startSync();
      }
    }, this.SYNC_INTERVAL);
  }

  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Status and Progress
  public getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  public getConflicts(): SyncConflict[] {
    return [...this.conflicts];
  }

  public getErrors(): SyncError[] {
    return [...this.errors];
  }

  private async updateSyncCounts(): Promise<void> {
    const [quizAttempts, progress, chatMessages, achievements] = await Promise.all([
      offlineStorage.getUnsyncedQuizAttempts(),
      offlineStorage.getUnsyncedProgress(),
      offlineStorage.getUnsyncedChatMessages(),
      offlineStorage.getUnsyncedAchievements()
    ]);

    this.syncStatus.pendingItems = quizAttempts.length + progress.length + chatMessages.length + achievements.length;
    this.syncStatus.failedItems = this.errors.length;
  }

  // Event System
  public addEventListener(type: SyncEventType, listener: (event: SyncEvent) => void): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type)!.push(listener);
  }

  public removeEventListener(type: SyncEventType, listener: (event: SyncEvent) => void): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitEvent(type: SyncEventType, data: any): void {
    const event: SyncEvent = {
      type,
      data,
      timestamp: new Date()
    };

    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in sync event listener:', error);
        }
      });
    }
  }

  // Persistence for conflicts
  private async storeConflict(conflict: SyncConflict): Promise<void> {
    try {
      const stored = localStorage.getItem('sync-conflicts');
      const conflicts = stored && stored !== 'mock-token' ? JSON.parse(stored) : [];
      conflicts.push(conflict);
      localStorage.setItem('sync-conflicts', JSON.stringify(conflicts));
    } catch (error) {
      console.error('Failed to store conflict:', error);
    }
  }

  private async updateStoredConflict(conflict: SyncConflict): Promise<void> {
    try {
      const stored = localStorage.getItem('sync-conflicts');
      if (stored && stored !== 'mock-token') {
        const conflicts = JSON.parse(stored);
        const index = conflicts.findIndex((c: SyncConflict) => c.id === conflict.id);
        if (index > -1) {
          conflicts[index] = conflict;
          localStorage.setItem('sync-conflicts', JSON.stringify(conflicts));
        }
      }
    } catch (error) {
      console.error('Failed to update stored conflict:', error);
    }
  }

  private async loadStoredConflicts(): Promise<void> {
    try {
      const stored = localStorage.getItem('sync-conflicts');
      if (stored && stored !== 'mock-token') {
        this.conflicts = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load stored conflicts:', error);
    }
  }

  // Public API
  public async forcSync(): Promise<void> {
    await this.startSync();
  }

  public async resolveConflict(conflictId: string, resolution: 'local' | 'server' | 'merge'): Promise<void> {
    const conflict = this.conflicts.find(c => c.id === conflictId);
    if (!conflict) return;

    switch (resolution) {
      case 'local':
        await this.forceUpdateServer(conflict);
        break;
      case 'server':
        await this.updateLocalFromServer(conflict);
        break;
      case 'merge':
        // Implementation depends on data type
        break;
    }

    conflict.resolved = true;
    await this.updateStoredConflict(conflict);
  }

  public clearResolvedConflicts(): void {
    this.conflicts = this.conflicts.filter(c => !c.resolved);
    localStorage.setItem('sync-conflicts', JSON.stringify(this.conflicts));
  }

  public clearErrors(): void {
    // Cancel any pending retries
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
    
    this.errors = [];
  }

  public destroy(): void {
    this.stopPeriodicSync();
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
    this.eventListeners.clear();
  }
}

export const syncManager = new SyncManager();