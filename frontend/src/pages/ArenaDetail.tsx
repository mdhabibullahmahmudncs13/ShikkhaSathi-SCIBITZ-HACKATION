import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Play, Lock, CheckCircle, Star, Clock, 
  Target, Trophy, Zap, BookOpen, Award, Crown
} from 'lucide-react';
import { Adventure, Arena, AdventureProgress, BloomLevel } from '../types/learning';
import { useArenaDetail } from '../hooks/useArenaDetail';

const ArenaDetail: React.FC = () => {
  const { arenaId } = useParams<{ arenaId: string }>();
  const navigate = useNavigate();
  const { arena, adventures, progress, loading, error } = useArenaDetail(arenaId!);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl">Loading arena...</p>
        </div>
      </div>
    );
  }

  if (error || !arena) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h2 className="text-2xl font-bold mb-2">Arena Not Found</h2>
          <p className="text-gray-300 mb-4">{error || 'This arena does not exist'}</p>
          <button 
            onClick={() => navigate('/learning')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            Back to Arenas
          </button>
        </div>
      </div>
    );
  }

  const completionPercentage = arena.totalAdventures > 0 
    ? Math.round((arena.completedAdventures / arena.totalAdventures) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/learning')}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <div className="flex items-center gap-4">
                <div className="text-5xl">{arena.icon}</div>
                <div>
                  <h1 className="text-3xl font-bold text-white">{arena.name}</h1>
                  <p className="text-blue-200">{arena.description}</p>
                </div>
              </div>
            </div>
            
            {/* Arena Stats */}
            <div className="hidden md:flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{arena.earnedXP}</div>
                <div className="text-xs text-blue-200">XP Earned</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{completionPercentage}%</div>
                <div className="text-xs text-blue-200">Complete</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{arena.completedAdventures}</div>
                <div className="text-xs text-blue-200">Adventures</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Arena Progress Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Arena Progress</h2>
            {completionPercentage === 100 && (
              <div className="flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/30 rounded-full px-4 py-2">
                <Crown className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-400 font-semibold">Arena Mastered!</span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{arena.completedAdventures}</div>
              <div className="text-sm text-gray-300">Adventures Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{arena.earnedXP.toLocaleString()}</div>
              <div className="text-sm text-gray-300">XP Earned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {adventures?.reduce((acc, adv) => acc + adv.completedTopics, 0) || 0}
              </div>
              <div className="text-sm text-gray-300">Topics Mastered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {Math.round(adventures?.reduce((acc, adv) => acc + adv.estimatedTime, 0) || 0)}m
              </div>
              <div className="text-sm text-gray-300">Total Time</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-white/70 mb-2">
              <span>Overall Progress</span>
              <span>{arena.completedAdventures}/{arena.totalAdventures} Adventures</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full transition-all duration-700"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Adventures Grid */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-blue-400" />
            Adventures
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {adventures?.map((adventure, index) => {
              const adventureProgress = progress?.find(p => p.adventureId === adventure.id);
              return (
                <AdventureCard
                  key={adventure.id}
                  adventure={adventure}
                  progress={adventureProgress}
                  index={index}
                  onClick={() => navigate(`/learning/adventure/${adventure.id}`)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

interface AdventureCardProps {
  adventure: Adventure;
  progress?: AdventureProgress;
  index: number;
  onClick: () => void;
}

const AdventureCard: React.FC<AdventureCardProps> = ({ adventure, progress, index, onClick }) => {
  const isLocked = !adventure.isUnlocked;
  const isCompleted = adventure.isCompleted;
  const completionPercentage = adventure.totalTopics > 0 
    ? Math.round((adventure.completedTopics / adventure.totalTopics) * 100) 
    : 0;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'Intermediate': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'Advanced': return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
      case 'Expert': return 'text-red-400 bg-red-500/20 border-red-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  return (
    <div 
      className={`relative group transition-all duration-300 ${
        isLocked ? 'opacity-60' : 'hover:scale-105 cursor-pointer'
      }`}
      onClick={isLocked ? undefined : onClick}
    >
      <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 h-full">
        {/* Lock Overlay */}
        {isLocked && (
          <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
            <div className="text-center">
              <Lock className="w-8 h-8 text-white mx-auto mb-2" />
              <p className="text-white font-semibold">Locked</p>
              <p className="text-gray-300 text-sm">Complete previous adventures</p>
            </div>
          </div>
        )}

        {/* Adventure Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-blue-500/20 border border-blue-500/30 rounded-lg flex items-center justify-center text-blue-400 font-bold text-sm">
                {index + 1}
              </div>
              <h3 className="text-lg font-bold text-white">{adventure.name}</h3>
            </div>
            <p className="text-sm text-white/70 mb-3">{adventure.description}</p>
            
            {/* Difficulty Badge */}
            <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getDifficultyColor(adventure.difficulty)}`}>
              <Star className="w-3 h-3" />
              {adventure.difficulty}
            </div>
          </div>

          {/* Completion Status */}
          {isCompleted && (
            <div className="flex items-center gap-1 bg-green-500/20 border border-green-500/30 rounded-full px-3 py-1">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm font-semibold">Complete</span>
            </div>
          )}
        </div>

        {/* Progress */}
        {!isLocked && (
          <>
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-white/70 mb-2">
                <span>Progress</span>
                <span>{adventure.completedTopics}/{adventure.totalTopics} Topics</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-400 to-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-400">{adventure.earnedXP}</div>
                <div className="text-xs text-white/70">XP Earned</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-white">{adventure.estimatedTime}m</div>
                <div className="text-xs text-white/70">Est. Time</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-400">{adventure.totalTopics}</div>
                <div className="text-xs text-white/70">Topics</div>
              </div>
            </div>

            {/* Chapter Bonus */}
            {!isCompleted && (
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 font-semibold text-sm">
                    Chapter Bonus: +{adventure.chapterBonus} XP
                  </span>
                </div>
                <p className="text-xs text-yellow-200 mt-1">Complete all topics to earn bonus XP!</p>
              </div>
            )}

            {/* Action Button */}
            <button className="w-full flex items-center justify-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 font-semibold py-3 rounded-lg transition-colors">
              <Play className="w-5 h-5" />
              {completionPercentage === 0 ? 'Start Adventure' : 
               completionPercentage === 100 ? 'Review' : 'Continue'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ArenaDetail;