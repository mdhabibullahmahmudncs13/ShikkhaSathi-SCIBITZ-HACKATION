import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sword, Shield, Crown, Star, Lock, Play, Trophy, 
  Clock, Target, Zap, BookOpen, ChevronRight, Award
} from 'lucide-react';
import { Arena, ArenaProgress } from '../types/learning';
import { useLearningModules } from '../hooks/useLearningModules';

const LearningModules: React.FC = () => {
  const navigate = useNavigate();
  const { arenas, progress, stats, loading, error } = useLearningModules();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl">Loading your adventures...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h2 className="text-2xl font-bold mb-2">Quest Failed</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            Retry Quest
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="w-6 h-6 text-white rotate-180" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Sword className="w-8 h-8 text-yellow-400" />
                  Learning Arenas
                </h1>
                <p className="text-blue-200">Choose your adventure and master new skills</p>
              </div>
            </div>
            
            {/* Stats Display */}
            <div className="hidden md:flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{stats?.currentLevel || 1}</div>
                <div className="text-xs text-blue-200">Level</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{stats?.totalXP.toLocaleString() || 0}</div>
                <div className="text-xs text-blue-200">Total XP</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{stats?.adventuresCompleted || 0}</div>
                <div className="text-xs text-blue-200">Adventures</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Game Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-sm border border-yellow-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Crown className="w-8 h-8 text-yellow-400" />
              <div>
                <div className="text-2xl font-bold text-white">{stats?.currentLevel || 1}</div>
                <div className="text-sm text-yellow-200">Level</div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-green-400" />
              <div>
                <div className="text-2xl font-bold text-white">{stats?.totalXP.toLocaleString() || 0}</div>
                <div className="text-sm text-green-200">Total XP</div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-purple-400" />
              <div>
                <div className="text-2xl font-bold text-white">{stats?.adventuresCompleted || 0}</div>
                <div className="text-sm text-purple-200">Adventures</div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-blue-400" />
              <div>
                <div className="text-2xl font-bold text-white">{stats?.topicsCompleted || 0}</div>
                <div className="text-sm text-blue-200">Topics</div>
              </div>
            </div>
          </div>
        </div>

        {/* Arenas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {arenas?.map((arena) => {
            const arenaProgress = progress?.find((p: ArenaProgress) => p.arenaId === arena.id);
            const completionPercentage = arena.totalAdventures > 0 
              ? Math.round((arena.completedAdventures / arena.totalAdventures) * 100) 
              : 0;
            
            return (
              <ArenaCard
                key={arena.id}
                arena={arena}
                progress={arenaProgress}
                completionPercentage={completionPercentage}
                onClick={() => navigate(`/learning/arena/${arena.id}`)}
              />
            );
          })}
        </div>

        {/* Coming Soon Arenas */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Star className="w-6 h-6 text-yellow-400" />
            Coming Soon
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {['History', 'Geography', 'Economics'].map((subject) => (
              <div key={subject} className="relative">
                <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-600/30 rounded-xl p-6 opacity-60">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-300">{subject}</h3>
                        <p className="text-sm text-gray-500">New adventures await</p>
                      </div>
                    </div>
                    <Lock className="w-6 h-6 text-gray-500" />
                  </div>
                  <div className="text-sm text-gray-500">Coming in future updates</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface ArenaCardProps {
  arena: Arena;
  progress?: ArenaProgress;
  completionPercentage: number;
  onClick: () => void;
}

const ArenaCard: React.FC<ArenaCardProps> = ({ arena, completionPercentage, onClick }) => {
  const isLocked = !arena.isUnlocked;
  
  return (
    <div 
      className={`relative group cursor-pointer transition-all duration-300 ${
        isLocked ? 'opacity-60' : 'hover:scale-105'
      }`}
      onClick={isLocked ? undefined : onClick}
    >
      <div className={`${arena.bgGradient} backdrop-blur-sm border border-white/20 rounded-xl p-6 h-full`}>
        {/* Lock Overlay */}
        {isLocked && (
          <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
            <div className="text-center">
              <Lock className="w-12 h-12 text-white mx-auto mb-2" />
              <p className="text-white font-semibold">Locked</p>
              <p className="text-gray-300 text-sm">Complete previous arenas</p>
            </div>
          </div>
        )}

        {/* Arena Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{arena.icon}</div>
            <div>
              <h3 className="text-xl font-bold text-white">{arena.name}</h3>
              <p className="text-sm text-white/70">{arena.subject}</p>
            </div>
          </div>
          {!isLocked && (
            <div className="text-right">
              <div className="text-lg font-bold text-yellow-400">{arena.earnedXP}</div>
              <div className="text-xs text-white/70">/ {arena.totalXP} XP</div>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-white/80 text-sm mb-4">{arena.description}</p>

        {/* Progress */}
        {!isLocked && (
          <>
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-white/70 mb-2">
                <span>Progress</span>
                <span>{arena.completedAdventures}/{arena.totalAdventures} Adventures</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-white/70" />
                  <span className="text-white/70">
                    {(arena.adventures || []).reduce((acc, adv) => acc + (adv.estimatedTime || 0), 0)}m
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="w-4 h-4 text-white/70" />
                  <span className="text-white/70">{(arena.adventures || []).length} Adventures</span>
                </div>
              </div>
              
              {completionPercentage === 100 && (
                <div className="flex items-center gap-1">
                  <Award className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 font-semibold">Mastered</span>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="mt-4 pt-4 border-t border-white/20">
              <button className="w-full flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold py-3 rounded-lg transition-colors">
                <Play className="w-5 h-5" />
                {completionPercentage === 0 ? 'Start Adventure' : 'Continue'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LearningModules;