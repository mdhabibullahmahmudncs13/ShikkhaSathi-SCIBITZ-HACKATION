import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Play, Lock, CheckCircle, Star, Clock, 
  Target, Trophy, Zap, BookOpen, Award, Crown, Brain,
  ChevronRight, RotateCcw
} from 'lucide-react';
import { Adventure, Topic, TopicProgress, BloomLevel } from '../types/learning';
import { useAdventureDetail } from '../hooks/useAdventureDetail';

const AdventureDetail: React.FC = () => {
  const { adventureId } = useParams<{ adventureId: string }>();
  const navigate = useNavigate();
  const { adventure, topics, progress, loading, error } = useAdventureDetail(adventureId!);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl">Loading adventure...</p>
        </div>
      </div>
    );
  }

  if (error || !adventure) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h2 className="text-2xl font-bold mb-2">Adventure Not Found</h2>
          <p className="text-gray-300 mb-4">{error || 'This adventure does not exist'}</p>
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/learning/arena/${adventure.arenaId}`)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white">{adventure.name}</h1>
                <p className="text-blue-200">{adventure.description}</p>
                <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border mt-2 ${getDifficultyColor(adventure.difficulty)}`}>
                  <Star className="w-3 h-3" />
                  {adventure.difficulty}
                </div>
              </div>
            </div>
            
            {/* Adventure Stats */}
            <div className="hidden md:flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{adventure.earnedXP}</div>
                <div className="text-xs text-blue-200">XP Earned</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{completionPercentage}%</div>
                <div className="text-xs text-blue-200">Complete</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{adventure.completedTopics}</div>
                <div className="text-xs text-blue-200">Topics Done</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Adventure Progress Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Adventure Progress</h2>
            {adventure.isCompleted && (
              <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-full px-4 py-2">
                <Trophy className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-semibold">Adventure Complete!</span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{adventure.completedTopics}</div>
              <div className="text-sm text-gray-300">Topics Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{adventure.earnedXP.toLocaleString()}</div>
              <div className="text-sm text-gray-300">XP Earned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{adventure.estimatedTime}m</div>
              <div className="text-sm text-gray-300">Estimated Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{adventure.totalXP}</div>
              <div className="text-sm text-gray-300">Total XP Available</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-white/70 mb-2">
              <span>Progress</span>
              <span>{adventure.completedTopics}/{adventure.totalTopics} Topics</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-400 to-purple-500 h-3 rounded-full transition-all duration-700"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Chapter Bonus Info */}
          {!adventure.isCompleted && (
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-400 font-semibold">Chapter Completion Bonus</span>
              </div>
              <p className="text-yellow-200 text-sm">
                Complete all {adventure.totalTopics} topics to earn an additional <strong>+{adventure.chapterBonus} XP</strong> bonus!
              </p>
            </div>
          )}
        </div>

        {/* Topics List */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Brain className="w-6 h-6 text-purple-400" />
            Learning Topics
          </h2>
          
          <div className="space-y-4">
            {topics?.map((topic, index) => {
              const topicProgress = progress?.topicProgress.find(p => p.topicId === topic.id);
              return (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  progress={topicProgress}
                  index={index}
                  onClick={() => navigate(`/learning/topic/${topic.id}`)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

interface TopicCardProps {
  topic: Topic;
  progress?: TopicProgress;
  index: number;
  onClick: () => void;
}

const TopicCard: React.FC<TopicCardProps> = ({ topic, progress, index, onClick }) => {
  const isLocked = !topic.isUnlocked;
  const isCompleted = topic.isCompleted;

  const getBloomLevelInfo = (level: BloomLevel) => {
    const bloomInfo = {
      [BloomLevel.REMEMBER]: { name: 'Remember', color: 'text-green-400', icon: '🧠' },
      [BloomLevel.UNDERSTAND]: { name: 'Understand', color: 'text-blue-400', icon: '💡' },
      [BloomLevel.APPLY]: { name: 'Apply', color: 'text-yellow-400', icon: '⚡' },
      [BloomLevel.ANALYZE]: { name: 'Analyze', color: 'text-orange-400', icon: '🔍' },
      [BloomLevel.EVALUATE]: { name: 'Evaluate', color: 'text-red-400', icon: '⚖️' },
      [BloomLevel.CREATE]: { name: 'Create', color: 'text-purple-400', icon: '✨' }
    };
    return bloomInfo[level] || bloomInfo[BloomLevel.REMEMBER];
  };

  const bloomInfo = getBloomLevelInfo(topic.bloomLevel);

  return (
    <div 
      className={`group transition-all duration-300 ${
        isLocked ? 'opacity-60' : 'hover:scale-[1.02] cursor-pointer'
      }`}
      onClick={isLocked ? undefined : onClick}
    >
      <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
        {/* Lock Overlay */}
        {isLocked && (
          <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
            <div className="text-center">
              <Lock className="w-6 h-6 text-white mx-auto mb-2" />
              <p className="text-white font-semibold">Locked</p>
              <p className="text-gray-300 text-sm">Complete previous topics</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          {/* Topic Info */}
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                isCompleted ? 'bg-green-500/20 border border-green-500/30 text-green-400' :
                isLocked ? 'bg-gray-500/20 border border-gray-500/30 text-gray-400' :
                'bg-blue-500/20 border border-blue-500/30 text-blue-400'
              }`}>
                {isCompleted ? <CheckCircle className="w-5 h-5" /> : index + 1}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{topic.name}</h3>
                <p className="text-sm text-white/70">{topic.description}</p>
              </div>
            </div>
          </div>

          {/* Topic Details */}
          <div className="flex items-center gap-6">
            {/* Bloom Level */}
            <div className="text-center">
              <div className={`text-lg ${bloomInfo.color}`}>{bloomInfo.icon}</div>
              <div className={`text-xs font-semibold ${bloomInfo.color}`}>{bloomInfo.name}</div>
            </div>

            {/* XP Reward */}
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-400">+{topic.xpReward}</div>
              <div className="text-xs text-white/70">XP</div>
            </div>

            {/* Questions Count */}
            <div className="text-center">
              <div className="text-lg font-bold text-purple-400">{topic.questions.length}</div>
              <div className="text-xs text-white/70">Questions</div>
            </div>

            {/* Action Button */}
            <div className="flex items-center gap-2">
              {isCompleted ? (
                <button className="flex items-center gap-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 px-4 py-2 rounded-lg font-semibold transition-colors">
                  <RotateCcw className="w-4 h-4" />
                  Review
                </button>
              ) : !isLocked ? (
                <button className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 px-4 py-2 rounded-lg font-semibold transition-colors">
                  <Play className="w-4 h-4" />
                  Start
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-gray-500/20 border border-gray-500/30 text-gray-400 px-4 py-2 rounded-lg">
                  <Lock className="w-4 h-4" />
                  Locked
                </div>
              )}
              <ChevronRight className="w-5 h-5 text-white/50" />
            </div>
          </div>
        </div>

        {/* Progress Bar for Completed Topics */}
        {progress && progress.isCompleted && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/70">Score: {progress.score}%</span>
              <span className="text-white/70">
                Completed {progress.completedAt ? new Date(progress.completedAt).toLocaleDateString() : 'Recently'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdventureDetail;