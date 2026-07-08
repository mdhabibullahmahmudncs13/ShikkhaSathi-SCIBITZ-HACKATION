import { useState, useEffect } from 'react';
import { Arena, ArenaProgress, GameModeStats } from '../types/learning';
import { learningAPI } from '../services/apiClient';
import { logger } from '../services/logger';

interface UseLearningModulesReturn {
  arenas: Arena[] | null;
  progress: ArenaProgress[] | null;
  stats: GameModeStats | null;
  loading: boolean;
  error: string | null;
}

export const useLearningModules = (): UseLearningModulesReturn => {
  const [arenas, setArenas] = useState<Arena[] | null>(null);
  const [progress, setProgress] = useState<ArenaProgress[] | null>(null);
  const [stats, setStats] = useState<GameModeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLearningModules = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch real data from API
        const response = await learningAPI.getArenas();
        const data = response;

        setArenas(data.arenas || []);
        setProgress(data.progress || []);
        setStats(data.stats || {
          totalXP: 0,
          currentLevel: 1,
          arenasUnlocked: 0,
          adventuresCompleted: 0,
          topicsCompleted: 0,
          averageBloomLevel: 1,
          streak: 0,
          achievements: []
        });

        logger.info('Learning modules loaded successfully', {
          arenasCount: data.arenas?.length || 0,
          totalXP: data.stats?.totalXP || 0
        });
      } catch (err: any) {
        const errorMessage = err.response?.data?.detail || err.message || 'Failed to load learning modules';
        setError(errorMessage);
        logger.error('Failed to load learning modules', err);
        
        // Fallback to mock data only in development
        if (import.meta.env.DEV) {
          logger.warn('Using fallback mock data in development mode');
          setArenas(getMockArenas());
          setProgress([]);
          setStats(getMockStats());
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLearningModules();
  }, []);

  return {
    arenas,
    progress,
    stats,
    loading,
    error
  };
};

// Fallback mock data for development
const getMockArenas = (): Arena[] => [
  {
    id: 'arena-math',
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
  }
];

const getMockStats = (): GameModeStats => ({
  totalXP: 500,
  currentLevel: 3,
  arenasUnlocked: 2,
  adventuresCompleted: 1,
  topicsCompleted: 5,
  averageBloomLevel: 2.2,
  streak: 7,
  achievements: [
    {
      id: 'first-adventure',
      name: 'First Adventure',
      description: 'Complete your first adventure',
      icon: '🎯',
      type: 'adventure',
      requirement: 1,
      progress: 1,
      isUnlocked: true,
      unlockedAt: new Date('2024-12-20')
    }
  ]
});