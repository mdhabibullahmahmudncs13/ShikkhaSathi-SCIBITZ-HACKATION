/**
 * **Feature: shikkhasathi-platform, Property 12: Offline-Online Data Synchronization**
 * **Validates: Requirements 4.3**
 * 
 * Property-based test for sync management system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { syncManager } from '../services/syncManager';
import { offlineStorage, OfflineQuizAttempt, OfflineProgress, OfflineChatMessage, OfflineAchievement } from '../services/offlineStorage';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn((key: string) => {
    if (key === 'token') return 'mock-token';
    if (key === 'sync-conflicts') return '[]';
    return null;
  }),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Helper to create valid test data
const createValidQuizAttempt = (overrides: Partial<OfflineQuizAttempt> = {}): OfflineQuizAttempt => ({
  id: 'quiz-attempt-123',
  userId: 'user-456',
  quizId: 'quiz-789',
  subject: 'Math',
  topic: 'Algebra',
  questions: [{
    id: 'q1',
    question: 'What is 2+2?',
    options: ['3', '4', '5', '6'],
    correctAnswer: 1,
    userAnswer: 1,
    bloomLevel: 1
  }],
  score: 100,
  maxScore: 100,
  timeTaken: 60,
  difficultyLevel: 2,
  completedAt: new Date(),
  synced: false,
  createdAt: new Date(),
  ...overrides
});

const createValidProgress = (overrides: Partial<OfflineProgress> = {}): OfflineProgress => ({
  id: 'progress-123',
  userId: 'user-456',
  subject: 'Math',
  topic: 'Algebra',
  bloomLevel: 2,
  completionPercentage: 75,
  timeSpentMinutes: 120,
  lastAccessed: new Date(),
  masteryLevel: 'intermediate',
  synced: false,
  ...overrides
});

const createValidChatMessage = (overrides: Partial<OfflineChatMessage> = {}): OfflineChatMessage => ({
  id: 'msg-123',
  userId: 'user-456',
  sessionId: 'session-789',
  role: 'user',
  content: 'What is algebra?',
  sources: ['textbook-ch1'],
  voiceInput: false,
  timestamp: new Date(),
  synced: false,
  ...overrides
});

describe('Sync Management System Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === 'token') return 'mock-token';
      if (key === 'sync-conflicts') return '[]';
      return null;
    });
  });

  afterEach(() => {
    syncManager.destroy();
  });

  describe('Property 12: Offline-Online Data Synchronization', () => {
    it('should sync valid offline quiz attempts when connectivity returns', async () => {
      // Test with valid quiz attempts
      const validAttempts = [
        createValidQuizAttempt({ id: 'attempt-1', score: 80 }),
        createValidQuizAttempt({ id: 'attempt-2', score: 90 })
      ];

      // Setup: Store unsynced quiz attempts
      const mockGetUnsyncedQuizAttempts = vi.spyOn(offlineStorage, 'getUnsyncedQuizAttempts');
      const mockMarkQuizAttemptSynced = vi.spyOn(offlineStorage, 'markQuizAttemptSynced');
      
      mockGetUnsyncedQuizAttempts.mockResolvedValue(validAttempts);
      mockMarkQuizAttemptSynced.mockResolvedValue();

      // Mock successful API responses
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      });

      // Mock other sync methods to return empty arrays
      vi.spyOn(offlineStorage, 'getUnsyncedProgress').mockResolvedValue([]);
      vi.spyOn(offlineStorage, 'getUnsyncedChatMessages').mockResolvedValue([]);
      vi.spyOn(offlineStorage, 'getUnsyncedAchievements').mockResolvedValue([]);

      // Act: Trigger sync
      await syncManager.forcSync();

      // Assert: All valid quiz attempts should be synced
      expect(mockFetch).toHaveBeenCalledTimes(validAttempts.length);
      expect(mockMarkQuizAttemptSynced).toHaveBeenCalledTimes(validAttempts.length);
      
      validAttempts.forEach((attempt, index) => {
        const call = mockFetch.mock.calls[index];
        expect(call[0]).toContain('/api/v1/quiz/attempts');
        expect(call[1].method).toBe('POST');
        
        const body = JSON.parse(call[1].body);
        expect(body.quiz_id).toBe(attempt.quizId);
        expect(body.subject).toBe(attempt.subject);
        expect(body.score).toBe(attempt.score);
      });
    });

    it('should sync valid offline progress data when connectivity returns', async () => {
      // Test with valid progress data
      const validProgress = [
        createValidProgress({ id: 'progress-1', completionPercentage: 75 }),
        createValidProgress({ id: 'progress-2', completionPercentage: 85 })
      ];

      // Setup: Store unsynced progress
      const mockGetUnsyncedProgress = vi.spyOn(offlineStorage, 'getUnsyncedProgress');
      const mockMarkProgressSynced = vi.spyOn(offlineStorage, 'markProgressSynced');
      
      mockGetUnsyncedProgress.mockResolvedValue(validProgress);
      mockMarkProgressSynced.mockResolvedValue();

      // Mock successful API responses
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      });

      // Mock other sync methods to return empty arrays
      vi.spyOn(offlineStorage, 'getUnsyncedQuizAttempts').mockResolvedValue([]);
      vi.spyOn(offlineStorage, 'getUnsyncedChatMessages').mockResolvedValue([]);
      vi.spyOn(offlineStorage, 'getUnsyncedAchievements').mockResolvedValue([]);

      // Act: Trigger sync
      await syncManager.forcSync();

      // Assert: All valid progress items should be synced
      expect(mockFetch).toHaveBeenCalledTimes(validProgress.length);
      expect(mockMarkProgressSynced).toHaveBeenCalledTimes(validProgress.length);
      
      validProgress.forEach((progress, index) => {
        const call = mockFetch.mock.calls[index];
        expect(call[0]).toContain('/api/v1/progress');
        expect(call[1].method).toBe('PUT');
        
        const body = JSON.parse(call[1].body);
        expect(body.subject).toBe(progress.subject);
        expect(body.topic).toBe(progress.topic);
        expect(body.completion_percentage).toBe(progress.completionPercentage);
      });
    });

    it('should handle sync conflicts appropriately', async () => {
      // Test with valid progress data that will conflict - create ambiguous case
      const progressItem = createValidProgress({ 
        id: 'progress-conflict', 
        completionPercentage: 50,
        lastAccessed: new Date('2023-01-01')
      });

      // Setup: Store unsynced progress that will conflict
      const mockGetUnsyncedProgress = vi.spyOn(offlineStorage, 'getUnsyncedProgress');
      mockGetUnsyncedProgress.mockResolvedValue([progressItem]);

      // Mock other sync methods to return empty arrays
      vi.spyOn(offlineStorage, 'getUnsyncedQuizAttempts').mockResolvedValue([]);
      vi.spyOn(offlineStorage, 'getUnsyncedChatMessages').mockResolvedValue([]);
      vi.spyOn(offlineStorage, 'getUnsyncedAchievements').mockResolvedValue([]);

      // Mock conflict response (409) - create case that won't auto-resolve
      // Server has same completion but different timestamp - ambiguous case
      const serverData = {
        subject: progressItem.subject,
        topic: progressItem.topic,
        completion_percentage: 50, // Same as local
        last_accessed: new Date('2024-01-01').toISOString() // Different timestamp
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => serverData
      });

      // Act: Trigger sync
      await syncManager.forcSync();

      // Assert: Conflict should be detected and stored
      const conflicts = syncManager.getConflicts();
      expect(conflicts.length).toBeGreaterThan(0);
      
      const conflict = conflicts.find(c => c.type === 'progress');
      expect(conflict).toBeDefined();
      if (conflict) {
        expect(conflict.localData.subject).toBe(progressItem.subject);
        expect(conflict.serverData.subject).toBe(serverData.subject);
        expect(conflict.resolved).toBe(false);
      }
    });

    it('should retry failed sync operations with exponential backoff', async () => {
      // Test with valid chat message
      const chatMessage = createValidChatMessage({ 
        id: 'msg-retry-test',
        content: 'Test message for retry'
      });

      // Setup: Store unsynced chat message
      const mockGetUnsyncedChatMessages = vi.spyOn(offlineStorage, 'getUnsyncedChatMessages');
      mockGetUnsyncedChatMessages.mockResolvedValue([chatMessage]);

      // Mock other sync methods to return empty arrays
      vi.spyOn(offlineStorage, 'getUnsyncedQuizAttempts').mockResolvedValue([]);
      vi.spyOn(offlineStorage, 'getUnsyncedProgress').mockResolvedValue([]);
      vi.spyOn(offlineStorage, 'getUnsyncedAchievements').mockResolvedValue([]);

      // Mock network error
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Act: Trigger sync
      await syncManager.forcSync();

      // Assert: Should have recorded the error
      const errors = syncManager.getErrors();
      expect(errors.length).toBeGreaterThan(0);
      
      const error = errors.find(e => e.type === 'network');
      expect(error).toBeDefined();
      if (error) {
        expect(error.retryCount).toBe(0);
        expect(error.maxRetries).toBe(3);
      }
    });

    it('should maintain data integrity during sync operations', async () => {
      // Test with mixed valid data
      const quizAttempts = [createValidQuizAttempt({ id: 'attempt-1' })];
      const achievements = [
        {
          id: 'achievement-1',
          userId: 'user-456',
          achievementId: 'first-quiz',
          name: 'First Quiz Completed',
          description: 'Completed your first quiz',
          xpReward: 100,
          unlockedAt: new Date(),
          synced: false
        } as OfflineAchievement
      ];

      // Setup: Store multiple types of unsynced data
      vi.spyOn(offlineStorage, 'getUnsyncedQuizAttempts').mockResolvedValue(quizAttempts);
      vi.spyOn(offlineStorage, 'getUnsyncedAchievements').mockResolvedValue(achievements);
      vi.spyOn(offlineStorage, 'getUnsyncedProgress').mockResolvedValue([]);
      vi.spyOn(offlineStorage, 'getUnsyncedChatMessages').mockResolvedValue([]);

      const mockMarkQuizAttemptSynced = vi.spyOn(offlineStorage, 'markQuizAttemptSynced').mockResolvedValue();
      const mockMarkAchievementSynced = vi.spyOn(offlineStorage, 'markAchievementSynced').mockResolvedValue();

      // Mock successful API responses
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      });

      // Act: Trigger sync
      await syncManager.forcSync();

      // Assert: All data should be synced in correct order
      const totalExpectedCalls = quizAttempts.length + achievements.length;
      expect(mockFetch).toHaveBeenCalledTimes(totalExpectedCalls);

      // Verify quiz attempts were synced
      expect(mockMarkQuizAttemptSynced).toHaveBeenCalledTimes(quizAttempts.length);
      quizAttempts.forEach(attempt => {
        expect(mockMarkQuizAttemptSynced).toHaveBeenCalledWith(attempt.id);
      });

      // Verify achievements were synced
      expect(mockMarkAchievementSynced).toHaveBeenCalledTimes(achievements.length);
      achievements.forEach(achievement => {
        expect(mockMarkAchievementSynced).toHaveBeenCalledWith(achievement.id);
      });

      // Verify sync status is updated correctly
      const syncStatus = syncManager.getSyncStatus();
      expect(syncStatus.isSyncing).toBe(false);
      expect(syncStatus.lastSyncTime).toBeDefined();
    });
  });

  describe('Online/Offline Detection', () => {
    it('should correctly detect online/offline status changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
          async (statusChanges) => {
            let eventCount = 0;
            const receivedEvents: any[] = [];

            // Listen for status change events
            syncManager.addEventListener('status-change', (event) => {
              eventCount++;
              receivedEvents.push(event);
            });

            // Simulate status changes
            for (const isOnline of statusChanges) {
              // Mock navigator.onLine
              Object.defineProperty(navigator, 'onLine', {
                value: isOnline,
                writable: true
              });

              // Trigger online/offline event
              const event = new Event(isOnline ? 'online' : 'offline');
              window.dispatchEvent(event);

              // Small delay to allow event processing
              await new Promise(resolve => setTimeout(resolve, 10));
            }

            // Assert: Should have received status change events
            expect(eventCount).toBeGreaterThan(0);
            expect(receivedEvents.length).toBeGreaterThan(0);

            // Verify the final status matches the last change
            const finalStatus = syncManager.getSyncStatus();
            const lastChange = statusChanges[statusChanges.length - 1];
            expect(finalStatus.isOnline).toBe(lastChange);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});