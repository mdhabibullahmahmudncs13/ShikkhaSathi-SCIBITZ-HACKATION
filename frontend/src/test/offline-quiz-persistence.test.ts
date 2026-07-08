import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { offlineStorage } from '../services/offlineStorage';

describe('Offline Quiz Persistence', () => {
  beforeEach(async () => {
    await offlineStorage.clearAllData();
  });

  afterEach(async () => {
    await offlineStorage.clearAllData();
  });

  it('should save and retrieve quiz attempts', async () => {
    const quizAttempt = {
      id: 'test-quiz-1',
      userId: 'user-1',
      quizId: 'quiz-1',
      subject: 'Physics',
      topic: 'Mechanics',
      questions: [
        {
          id: 'q1',
          question: 'What is force?',
          options: ['Push or pull', 'Energy', 'Power', 'Work'],
          correctAnswer: 0,
          userAnswer: 0,
          bloomLevel: 1
        }
      ],
      score: 100,
      maxScore: 100,
      timeTaken: 60,
      difficultyLevel: 1,
      completedAt: new Date(),
      synced: false,
      createdAt: new Date()
    };

    await offlineStorage.saveQuizAttempt(quizAttempt);
    const retrieved = await offlineStorage.getQuizAttempt('test-quiz-1');
    
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe('test-quiz-1');
    expect(retrieved!.subject).toBe('Physics');
  });

  it('should track unsynced attempts', async () => {
    const attempt1 = {
      id: 'test-attempt-1',
      userId: 'user-1',
      quizId: 'quiz-1',
      subject: 'Physics',
      topic: 'Mechanics',
      questions: [
        {
          id: 'q1',
          question: 'What is force?',
          options: ['Push or pull', 'Energy', 'Power', 'Work'],
          correctAnswer: 0,
          userAnswer: 0,
          bloomLevel: 1
        }
      ],
      score: 85,
      maxScore: 100,
      timeTaken: 120,
      difficultyLevel: 1,
      completedAt: new Date(),
      synced: false,
      createdAt: new Date()
    };

    const attempt2 = {
      id: 'test-attempt-2',
      userId: 'user-1',
      quizId: 'quiz-2',
      subject: 'Chemistry',
      topic: 'Atoms',
      questions: [
        {
          id: 'q2',
          question: 'What is an atom?',
          options: ['Smallest unit', 'Large particle', 'Energy form', 'Wave'],
          correctAnswer: 0,
          userAnswer: 0,
          bloomLevel: 1
        }
      ],
      score: 90,
      maxScore: 100,
      timeTaken: 100,
      difficultyLevel: 1,
      completedAt: new Date(),
      synced: true,
      createdAt: new Date()
    };

    await offlineStorage.saveQuizAttempt(attempt1);
    await offlineStorage.saveQuizAttempt(attempt2);

    const unsynced = await offlineStorage.getUnsyncedQuizAttempts();
    expect(unsynced).toHaveLength(1);
    expect(unsynced[0].id).toBe('test-attempt-1');
  });

  it('should mark attempts as synced', async () => {
    const attempt = {
      id: 'test-sync-attempt',
      userId: 'user-1',
      quizId: 'quiz-1',
      subject: 'Physics',
      topic: 'Mechanics',
      questions: [
        {
          id: 'q1',
          question: 'What is force?',
          options: ['Push or pull', 'Energy', 'Power', 'Work'],
          correctAnswer: 0,
          userAnswer: 0,
          bloomLevel: 1
        }
      ],
      score: 75,
      maxScore: 100,
      timeTaken: 150,
      difficultyLevel: 1,
      completedAt: new Date(),
      synced: false,
      createdAt: new Date()
    };

    await offlineStorage.saveQuizAttempt(attempt);
    await offlineStorage.markQuizAttemptSynced('test-sync-attempt');

    const retrieved = await offlineStorage.getQuizAttempt('test-sync-attempt');
    expect(retrieved!.synced).toBe(true);
  });
});