import { useState, useEffect } from 'react';
import { Arena, Adventure, AdventureProgress } from '../types/learning';
import { api } from '../services/apiClient';
import { logger } from '../services/logger';

interface UseArenaDetailReturn {
  arena: Arena | null;
  adventures: Adventure[] | null;
  progress: AdventureProgress[] | null;
  loading: boolean;
  error: string | null;
}

export const useArenaDetail = (arenaId: string): UseArenaDetailReturn => {
  const [arena, setArena] = useState<Arena | null>(null);
  const [adventures, setAdventures] = useState<Adventure[] | null>(null);
  const [progress, setProgress] = useState<AdventureProgress[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArenaDetail = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch real data from API
        const response = await api.get(`/learning/arena/${arenaId}`);
        const data = response;

        setArena(data.arena);
        setAdventures(data.adventures || []);
        setProgress(data.progress || []);

        logger.info('Arena detail loaded successfully', { arenaId });
      } catch (err: any) {
        const errorMessage = err.response?.data?.detail || err.message || 'Failed to load arena details';
        setError(errorMessage);
        logger.error('Failed to load arena details', err);
        
        // Fallback to mock data only in development
        if (import.meta.env.DEV) {
          logger.warn('Using fallback mock data in development mode');
          const mockData = getMockArenaData(arenaId);
          setArena(mockData.arena);
          setAdventures(mockData.adventures);
          setProgress(mockData.progress);
        }
      } finally {
        setLoading(false);
      }
    };

    if (arenaId) {
      fetchArenaDetail();
    }
  }, [arenaId]);

  return {
    arena,
    adventures,
    progress,
    loading,
    error
  };
};

// Fallback mock data for development
const getMockArenaData = (arenaId: string) => {
  const mockArena: Arena = {
    id: arenaId,
    name: 'Mathematics Arena',
    subject: 'Mathematics',
    description: 'Master mathematical concepts from NCTB Grade 9-10 curriculum',
    icon: '🔢',
    color: 'blue',
    bgGradient: 'bg-gradient-to-br from-blue-500/20 to-purple-500/20',
    totalAdventures: 4,
    completedAdventures: 1,
    totalXP: 2000,
    earnedXP: 500,
    isUnlocked: true,
    adventures: []
  };

  const mockAdventures: Adventure[] = [
    {
      id: 'adventure-1',
      arenaId: arenaId,
      name: 'Real Numbers',
      chapter: 'Chapter 1',
      description: 'Learn about real numbers, their properties and operations',
      difficulty: 'Beginner',
      estimatedTime: 120,
      totalTopics: 5,
      completedTopics: 5,
      totalXP: 500,
      earnedXP: 500,
      isUnlocked: true,
      isCompleted: true,
      topics: [],
      chapterBonus: 100
    }
  ];

  const mockProgress: AdventureProgress[] = [
    {
      adventureId: 'adventure-1',
      isStarted: true,
      isCompleted: true,
      currentTopicIndex: 5,
      totalScore: 88,
      earnedXP: 500,
      topicProgress: [],
      startedAt: new Date('2024-12-15'),
      completedAt: new Date('2024-12-20')
    }
  ];

  return { arena: mockArena, adventures: mockAdventures, progress: mockProgress };
};