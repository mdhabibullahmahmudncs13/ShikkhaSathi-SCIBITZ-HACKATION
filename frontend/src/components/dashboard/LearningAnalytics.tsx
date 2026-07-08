/**
 * Learning Analytics Component
 * Real-time learning performance analytics for students
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Target, 
  Clock, 
  Award, 
  Brain, 
  BarChart3,
  Calendar,
  Zap
} from 'lucide-react';

interface LearningSession {
  date: string;
  subject: string;
  timeSpent: number; // minutes
  questionsAnswered: number;
  correctAnswers: number;
  xpGained: number;
}

interface SubjectPerformance {
  subject: string;
  averageScore: number;
  totalTime: number;
  questionsAnswered: number;
  improvement: number; // percentage change
  lastWeekScore: number;
  currentWeekScore: number;
}

interface LearningAnalyticsProps {
  userId?: string;
  timeRange?: 'week' | 'month' | 'all';
}

export const LearningAnalytics: React.FC<LearningAnalyticsProps> = ({
  userId,
  timeRange = 'week'
}) => {
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [subjectPerformance, setSubjectPerformance] = useState<SubjectPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLearningAnalytics = async () => {
      try {
        setIsLoading(true);
        // TODO: Replace with actual API call
        const response = await fetch(`/api/v1/student/${userId}/learning-analytics?timeRange=${timeRange}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch learning analytics');
        }
        
        const data = await response.json();
        setSessions(data.sessions || []);
        setSubjectPerformance(data.subjectPerformance || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
        console.error('Error fetching learning analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchLearningAnalytics();
    }
  }, [userId, timeRange]);

  const getTotalStats = () => {
    const totalTime = sessions.reduce((sum, session) => sum + session.timeSpent, 0);
    const totalQuestions = sessions.reduce((sum, session) => sum + session.questionsAnswered, 0);
    const totalCorrect = sessions.reduce((sum, session) => sum + session.correctAnswers, 0);
    const totalXP = sessions.reduce((sum, session) => sum + session.xpGained, 0);
    const averageAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

    return {
      totalTime,
      totalQuestions,
      totalCorrect,
      totalXP,
      averageAccuracy
    };
  };

  const getStreakInfo = () => {
    // Calculate current streak
    const today = new Date();
    let currentStreak = 0;
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const hasActivity = sessions.some(session => session.date === dateStr);
      if (hasActivity) {
        currentStreak++;
      } else if (i > 0) {
        break;
      }
    }

    return { currentStreak, longestStreak: Math.max(currentStreak, 18) };
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getPerformanceColor = (improvement: number) => {
    if (improvement > 5) return 'text-green-600';
    if (improvement < -5) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getPerformanceIcon = (improvement: number) => {
    if (improvement > 5) return '📈';
    if (improvement < -5) return '📉';
    return '➡️';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  const stats = getTotalStats();
  const streakInfo = getStreakInfo();

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Study Time</p>
              <p className="text-lg font-bold text-gray-900">{formatTime(stats.totalTime)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Accuracy</p>
              <p className="text-lg font-bold text-gray-900">{stats.averageAccuracy.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">XP Earned</p>
              <p className="text-lg font-bold text-gray-900">{stats.totalXP.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Zap className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Streak</p>
              <p className="text-lg font-bold text-gray-900">{streakInfo.currentStreak} days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Performance */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Subject Performance</span>
          </h3>
          <div className="text-sm text-gray-500">
            {timeRange === 'week' ? 'This Week' : timeRange === 'month' ? 'This Month' : 'All Time'}
          </div>
        </div>

        <div className="space-y-4">
          {subjectPerformance.map((subject) => (
            <div key={subject.subject} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <h4 className="font-medium text-gray-900">{subject.subject}</h4>
                  <span className={`text-sm ${getPerformanceColor(subject.improvement)}`}>
                    {getPerformanceIcon(subject.improvement)} {Math.abs(subject.improvement)}%
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">{subject.averageScore}%</div>
                  <div className="text-xs text-gray-500">Average Score</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{subject.averageScore}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      subject.averageScore >= 80 ? 'bg-green-500' :
                      subject.averageScore >= 60 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${subject.averageScore}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Time Spent</div>
                  <div className="font-medium">{formatTime(subject.totalTime)}</div>
                </div>
                <div>
                  <div className="text-gray-600">Questions</div>
                  <div className="font-medium">{subject.questionsAnswered}</div>
                </div>
                <div>
                  <div className="text-gray-600">Improvement</div>
                  <div className={`font-medium ${getPerformanceColor(subject.improvement)}`}>
                    {subject.improvement > 0 ? '+' : ''}{subject.improvement}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <span>Recent Learning Sessions</span>
        </h3>

        <div className="space-y-3">
          {sessions.slice(0, 5).map((session, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <div className="font-medium text-gray-900">{session.subject}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(session.date).toLocaleDateString()} • {formatTime(session.timeSpent)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {((session.correctAnswers / session.questionsAnswered) * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-gray-500">
                  {session.correctAnswers}/{session.questionsAnswered} correct
                </div>
              </div>
            </div>
          ))}
        </div>

        {sessions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No learning sessions yet</p>
            <p className="text-sm">Start learning to see your progress here!</p>
          </div>
        )}
      </div>

      {/* Learning Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Brain className="w-5 h-5" />
          <span>Learning Insights</span>
        </h3>

        <div className="space-y-3">
          {stats.averageAccuracy > 85 && (
            <div className="flex items-start space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-green-600 text-lg">🎯</div>
              <div>
                <div className="font-medium text-green-900">Excellent Accuracy!</div>
                <div className="text-sm text-green-700">
                  You're maintaining {stats.averageAccuracy.toFixed(1)}% accuracy. Keep up the great work!
                </div>
              </div>
            </div>
          )}

          {streakInfo.currentStreak >= 7 && (
            <div className="flex items-start space-x-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="text-orange-600 text-lg">🔥</div>
              <div>
                <div className="font-medium text-orange-900">Amazing Streak!</div>
                <div className="text-sm text-orange-700">
                  {streakInfo.currentStreak} days of consistent learning. You're building great habits!
                </div>
              </div>
            </div>
          )}

          {stats.totalTime > 300 && (
            <div className="flex items-start space-x-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="text-purple-600 text-lg">⏰</div>
              <div>
                <div className="font-medium text-purple-900">Dedicated Learner!</div>
                <div className="text-sm text-purple-700">
                  You've spent {formatTime(stats.totalTime)} learning this {timeRange}. Your dedication is impressive!
                </div>
              </div>
            </div>
          )}

          {subjectPerformance.some(s => s.improvement > 10) && (
            <div className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-blue-600 text-lg">📈</div>
              <div>
                <div className="font-medium text-blue-900">Rapid Improvement!</div>
                <div className="text-sm text-blue-700">
                  Your performance in {subjectPerformance.find(s => s.improvement > 10)?.subject} has improved significantly!
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};