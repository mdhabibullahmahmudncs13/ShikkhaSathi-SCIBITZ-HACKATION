import { useState, useEffect } from 'react';
import { dashboardAPI, gamificationAPI } from '../services/apiClient';
import { StudentProgress } from '../types/dashboard';
import { logger } from '../services/logger';

interface UseDashboardDataReturn {
  studentProgress: StudentProgress | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useDashboardData = (): UseDashboardDataReturn => {
  const [studentProgress, setStudentProgress] = useState<StudentProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard data and gamification data in parallel
      const [dashboardData, gamificationData] = await Promise.all([
        dashboardAPI.getDashboardData(),
        gamificationAPI.getGamificationData()
      ]);

      logger.debug('Dashboard API response:', dashboardData);
      logger.debug('Gamification API response:', gamificationData);

      // Transform backend data to match frontend StudentProgress type
      const combinedData: StudentProgress = {
        userId: dashboardData.user_info?.id || localStorage.getItem('user_id') || '',
        totalXP: gamificationData.total_xp || 0,
        currentLevel: gamificationData.current_level || 1,
        currentStreak: gamificationData.streak?.current_streak || 0,
        longestStreak: gamificationData.streak?.longest_streak || 0,
        
        // Transform subject progress from backend format
        subjectProgress: (dashboardData.subject_progress || []).map((subject: any) => ({
          subject: subject.subject,
          completionPercentage: Math.round(subject.completion_percentage || 0),
          bloomLevelProgress: subject.bloom_level_progress?.map((level: number, index: number) => ({
            level: index + 1,
            mastery: level
          })) || [],
          timeSpent: subject.time_spent || 0,
          lastAccessed: subject.last_accessed ? new Date(subject.last_accessed) : new Date()
        })),
        
        // Transform achievements from backend format
        achievements: (gamificationData.achievements?.unlocked || []).map((ach: any) => ({
          id: ach.id,
          name: ach.name,
          description: ach.description,
          icon: ach.icon || '🏆',
          unlockedAt: ach.unlocked_at ? new Date(ach.unlocked_at) : new Date(),
          progress: ach.progress,
          target: ach.target
        })),
        
        // Transform weak areas from backend format
        weakAreas: (dashboardData.weak_areas || []).map((area: any) => ({
          subject: area.subject || 'General',
          topic: area.topic,
          bloomLevel: area.bloom_level || 1,
          successRate: Math.round(area.average_score || area.success_rate || 0)
        })),
        
        // Transform recommendations from backend format
        recommendedPath: {
          currentTopic: dashboardData.recommendations?.[0]?.title || '',
          recommendedNextTopics: (dashboardData.recommendations || []).map((rec: any) => ({
            subject: rec.subject || 'General',
            topic: rec.title,
            difficulty: rec.priority === 'high' ? 3 : rec.priority === 'medium' ? 2 : 1,
            reason: rec.description,
            estimatedTime: parseInt(rec.estimated_time) || 30
          })),
          completedTopics: []
        }
      };

      setStudentProgress(combinedData);
      logger.info('Dashboard data loaded successfully', {
        xp: combinedData.totalXP,
        level: combinedData.currentLevel,
        subjects: combinedData.subjectProgress.length
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load dashboard data';
      setError(errorMessage);
      logger.error('Failed to load dashboard data', err);
      
      // Use mock data as fallback only in development mode
      if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_DATA !== 'false') {
        logger.warn('Using mock data as fallback in development mode');
        setStudentProgress(getMockData());
      } else {
        // In production, don't use mock data - let the error state show
        logger.error('Dashboard data failed to load in production mode');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return {
    studentProgress,
    loading,
    error,
    refetch: fetchDashboardData
  };
};

// Mock data for development/fallback
const getMockData = (): StudentProgress => ({
  userId: '123e4567-e89b-12d3-a456-426614174000',
  totalXP: 2450,
  currentLevel: 5,
  currentStreak: 7,
  longestStreak: 15,
  subjectProgress: [
    {
      subject: 'Mathematics',
      completionPercentage: 75,
      bloomLevelProgress: [
        { level: 1, mastery: 95 },
        { level: 2, mastery: 88 },
        { level: 3, mastery: 72 },
        { level: 4, mastery: 60 },
        { level: 5, mastery: 45 },
        { level: 6, mastery: 20 }
      ],
      timeSpent: 1200,
      lastAccessed: new Date('2024-12-18')
    },
    {
      subject: 'Physics',
      completionPercentage: 60,
      bloomLevelProgress: [
        { level: 1, mastery: 90 },
        { level: 2, mastery: 75 },
        { level: 3, mastery: 55 },
        { level: 4, mastery: 40 },
        { level: 5, mastery: 25 },
        { level: 6, mastery: 10 }
      ],
      timeSpent: 900,
      lastAccessed: new Date('2024-12-17')
    },
    {
      subject: 'Chemistry',
      completionPercentage: 45,
      bloomLevelProgress: [
        { level: 1, mastery: 85 },
        { level: 2, mastery: 70 },
        { level: 3, mastery: 45 },
        { level: 4, mastery: 30 },
        { level: 5, mastery: 15 },
        { level: 6, mastery: 5 }
      ],
      timeSpent: 600,
      lastAccessed: new Date('2024-12-16')
    }
  ],
  achievements: [
    {
      id: '1',
      name: 'First Steps',
      description: 'Complete your first lesson',
      icon: '🎯',
      unlockedAt: new Date('2024-12-01')
    },
    {
      id: '2',
      name: 'Week Warrior',
      description: 'Maintain a 7-day streak',
      icon: '🔥',
      unlockedAt: new Date('2024-12-18')
    },
    {
      id: '3',
      name: 'Quiz Master',
      description: 'Score 100% on 5 quizzes',
      icon: '🏆',
      progress: 3,
      target: 5
    },
    {
      id: '4',
      name: 'Knowledge Seeker',
      description: 'Complete 50 lessons',
      icon: '📚',
      progress: 32,
      target: 50
    }
  ],
  weakAreas: [
    {
      subject: 'Mathematics',
      topic: 'Quadratic Equations',
      bloomLevel: 3,
      successRate: 45
    },
    {
      subject: 'Physics',
      topic: "Newton's Laws",
      bloomLevel: 4,
      successRate: 38
    },
    {
      subject: 'Chemistry',
      topic: 'Chemical Bonding',
      bloomLevel: 2,
      successRate: 52
    }
  ],
  recommendedPath: {
    currentTopic: 'Algebra - Linear Equations',
    recommendedNextTopics: [
      {
        subject: 'Mathematics',
        topic: 'Quadratic Equations Review',
        difficulty: 2,
        reason: 'Strengthen fundamentals before advancing',
        estimatedTime: 35
      },
      {
        subject: 'Physics',
        topic: 'Force and Motion Basics',
        difficulty: 3,
        reason: "Build foundation for Newton's Laws",
        estimatedTime: 40
      }
    ],
    completedTopics: [
      'Basic Algebra',
      'Number Systems',
      'Introduction to Physics',
      'States of Matter',
      'Bangla Grammar Basics'
    ]
  }
});
