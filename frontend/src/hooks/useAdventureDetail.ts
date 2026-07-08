import { useState, useEffect } from 'react';
import { Adventure, Topic, AdventureProgress } from '../types/learning';
import { logger } from '../services/logger';

interface UseAdventureDetailReturn {
  adventure: Adventure | null;
  topics: Topic[] | null;
  progress: AdventureProgress | null;
  loading: boolean;
  error: string | null;
}

export const useAdventureDetail = (adventureId: string): UseAdventureDetailReturn => {
  const [adventure, setAdventure] = useState<Adventure | null>(null);
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [progress, setProgress] = useState<AdventureProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdventureDetail = async () => {
      try {
        setLoading(true);
        setError(null);

        // TODO: Replace with actual API calls
        // const [adventureResponse, topicsResponse, progressResponse] = await Promise.all([
        //   learningAPI.getAdventure(adventureId),
        //   learningAPI.getAdventureTopics(adventureId),
        //   learningAPI.getAdventureProgress(adventureId)
        // ]);

        // Mock data for now
        const mockAdventure: Adventure = {
          id: adventureId,
          arenaId: 'arena-math',
          name: 'Algebra Fundamentals',
          chapter: 'Chapter 1',
          description: 'Master the basics of algebraic expressions, equations, and problem-solving techniques',
          difficulty: 'Beginner',
          estimatedTime: 120,
          totalTopics: 5,
          completedTopics: 2,
          totalXP: 500,
          earnedXP: 200,
          isUnlocked: true,
          isCompleted: false,
          topics: [],
          chapterBonus: 100
        };

        const mockTopics: Topic[] = [
          {
            id: 'topic-1',
            adventureId: adventureId,
            name: 'Introduction to Variables',
            description: 'Learn what variables are and how they are used in algebra',
            content: 'Variables are symbols that represent unknown values...',
            bloomLevel: 1, // REMEMBER
            xpReward: 100,
            isCompleted: true,
            isUnlocked: true,
            questions: [],
            completedAt: new Date('2024-12-20')
          },
          {
            id: 'topic-2',
            adventureId: adventureId,
            name: 'Algebraic Expressions',
            description: 'Understanding how to write and simplify algebraic expressions',
            content: 'An algebraic expression is a mathematical phrase...',
            bloomLevel: 2, // UNDERSTAND
            xpReward: 100,
            isCompleted: true,
            isUnlocked: true,
            questions: [],
            completedAt: new Date('2024-12-21')
          },
          {
            id: 'topic-3',
            adventureId: adventureId,
            name: 'Solving Linear Equations',
            description: 'Learn techniques for solving equations with one variable',
            content: 'Linear equations are equations where the variable...',
            bloomLevel: 3, // APPLY
            xpReward: 100,
            isCompleted: false,
            isUnlocked: true,
            questions: []
          },
          {
            id: 'topic-4',
            adventureId: adventureId,
            name: 'Word Problems',
            description: 'Apply algebraic concepts to solve real-world problems',
            content: 'Word problems require translating English into math...',
            bloomLevel: 3, // APPLY
            xpReward: 100,
            isCompleted: false,
            isUnlocked: false,
            questions: []
          },
          {
            id: 'topic-5',
            adventureId: adventureId,
            name: 'Advanced Applications',
            description: 'Complex problem-solving using algebraic methods',
            content: 'Advanced applications involve multiple steps...',
            bloomLevel: 4, // ANALYZE
            xpReward: 100,
            isCompleted: false,
            isUnlocked: false,
            questions: []
          }
        ];

        const mockProgress: AdventureProgress = {
          adventureId: adventureId,
          isStarted: true,
          isCompleted: false,
          currentTopicIndex: 2,
          totalScore: 85,
          earnedXP: 200,
          topicProgress: [
            {
              topicId: 'topic-1',
              isCompleted: true,
              score: 90,
              bloomScores: { 1: 90 },
              attempts: 1,
              timeSpent: 1200,
              completedAt: new Date('2024-12-20')
            },
            {
              topicId: 'topic-2',
              isCompleted: true,
              score: 80,
              bloomScores: { 2: 80 },
              attempts: 2,
              timeSpent: 1500,
              completedAt: new Date('2024-12-21')
            }
          ],
          startedAt: new Date('2024-12-20')
        };

        setAdventure(mockAdventure);
        setTopics(mockTopics);
        setProgress(mockProgress);

        logger.info('Adventure detail loaded successfully', { adventureId });
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to load adventure details';
        setError(errorMessage);
        logger.error('Failed to load adventure details', err);
      } finally {
        setLoading(false);
      }
    };

    if (adventureId) {
      fetchAdventureDetail();
    }
  }, [adventureId]);

  return {
    adventure,
    topics,
    progress,
    loading,
    error
  };
};