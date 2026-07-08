import React from 'react';
import { ChildSummary } from '../../types/parent';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Clock, 
  Target, 
  Award,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface ChildProgressOverviewProps {
  child: ChildSummary;
}

export const ChildProgressOverview: React.FC<ChildProgressOverviewProps> = ({ child }) => {
  const getTrendIcon = (improvement: number) => {
    if (improvement > 5) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (improvement < -5) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Subject Progress */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Progress</h3>
        <div className="space-y-4">
          {child.subjectProgress.map((subject) => (
            <div key={subject.subject} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <h4 className="font-medium text-gray-900">{subject.subject}</h4>
                  {getTrendIcon(0)} {/* You would calculate actual trend here */}
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900">
                    {subject.averageScore}%
                  </span>
                  <p className="text-xs text-gray-500">
                    {formatTime(subject.timeSpent)} spent
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">Completion</span>
                  <span className="font-medium">{subject.completionPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getProgressColor(subject.completionPercentage)}`}
                    style={{ width: `${subject.completionPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Bloom Level Progress */}
              <div className="grid grid-cols-6 gap-1">
                {subject.bloomLevelProgress.map((bloom) => (
                  <div key={bloom.level} className="text-center">
                    <div className="text-xs text-gray-500 mb-1">L{bloom.level}</div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${getProgressColor(bloom.mastery)}`}
                        style={{ width: `${bloom.mastery}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{bloom.mastery}%</div>
                  </div>
                ))}
              </div>

              {/* Recent Topics */}
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-gray-500 mb-2">Recent Topics:</p>
                <div className="flex flex-wrap gap-1">
                  {subject.topicProgress.slice(0, 3).map((topic) => (
                    <span
                      key={topic.topic}
                      className="px-2 py-1 bg-gray-100 text-xs text-gray-700 rounded"
                    >
                      {topic.topic} ({topic.completionPercentage}%)
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Achievements */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Achievements</h3>
        {child.recentAchievements.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {child.recentAchievements.slice(0, 4).map((achievement) => (
              <div
                key={achievement.id}
                className="flex items-center space-x-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg"
              >
                <div className="flex-shrink-0">
                  <Award className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{achievement.name}</h4>
                  <p className="text-sm text-gray-600">{achievement.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </span>
                    <span className="text-xs font-medium text-yellow-700">
                      +{achievement.xpReward} XP
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Award className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No recent achievements</p>
            <p className="text-sm">Keep learning to unlock achievements!</p>
          </div>
        )}
      </div>

      {/* Areas for Improvement */}
      {child.weakAreas.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
            Areas for Improvement
          </h3>
          <div className="space-y-3">
            {child.weakAreas.slice(0, 3).map((area, index) => (
              <div key={index} className="border-l-4 border-yellow-400 pl-4 py-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">
                    {area.subject} - {area.topic}
                  </h4>
                  <span className="text-sm text-red-600 font-medium">
                    {area.successRate}% success rate
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Bloom Level {area.bloomLevel} • {area.attemptsCount} attempts
                </p>
                {area.recommendedActions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">Recommended actions:</p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {area.recommendedActions.slice(0, 2).map((action, actionIndex) => (
                        <li key={actionIndex} className="flex items-start">
                          <CheckCircle className="h-3 w-3 text-green-500 mr-1 mt-0.5 flex-shrink-0" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Learning Activity Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Activity</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="h-6 w-6 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-gray-600">Study Time</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatTime(child.timeSpentThisWeek)}
            </p>
            <p className="text-sm text-gray-500">this week</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Target className="h-6 w-6 text-green-600 mr-2" />
              <span className="text-sm font-medium text-gray-600">Streak</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{child.currentStreak}</p>
            <p className="text-sm text-gray-500">
              days (best: {child.longestStreak})
            </p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Award className="h-6 w-6 text-purple-600 mr-2" />
              <span className="text-sm font-medium text-gray-600">Performance</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{child.averageScore}%</p>
            <p className="text-sm text-gray-500">average score</p>
          </div>
        </div>

        {/* Last Activity */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Last active:</span>
            <span className="text-sm font-medium text-gray-900">
              {new Date(child.lastActive).toLocaleString()}
            </span>
          </div>
          {child.classInfo && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-gray-600">Class performance:</span>
              <span className="text-sm font-medium text-gray-900">
                {child.averageScore}% vs {child.classInfo.classAverage}% class avg
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};