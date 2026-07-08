import React, { useState } from 'react';
import { WeeklyReport } from '../../types/parent';
import { 
  Calendar, 
  Clock, 
  Target, 
  TrendingUp, 
  TrendingDown,
  Award,
  BookOpen,
  Users,
  Download,
  Share,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface WeeklyReportViewerProps {
  report: WeeklyReport;
  onDownload?: (reportId: string) => void;
  onShare?: (reportId: string) => void;
}

export const WeeklyReportViewer: React.FC<WeeklyReportViewerProps> = ({
  report,
  onDownload,
  onShare
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 bg-gray-400 rounded-full"></div>;
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Weekly Report - {report.childName}
            </h2>
            <div className="flex items-center text-sm text-gray-600 mt-1">
              <Calendar className="h-4 w-4 mr-1" />
              {new Date(report.weekStartDate).toLocaleDateString()} - {new Date(report.weekEndDate).toLocaleDateString()}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onDownload && (
              <button
                onClick={() => onDownload(report.id)}
                className="flex items-center px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </button>
            )}
            {onShare && (
              <button
                onClick={() => onShare(report.id)}
                className="flex items-center px-3 py-2 text-sm bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Share className="h-4 w-4 mr-1" />
                Share
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="p-6">
        <button
          onClick={() => toggleSection('summary')}
          className="flex items-center justify-between w-full text-left mb-4"
        >
          <h3 className="text-lg font-medium text-gray-900">Weekly Summary</h3>
          {expandedSections.has('summary') ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>

        {expandedSections.has('summary') && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {formatTime(report.summary.totalTimeSpent)}
              </p>
              <p className="text-sm text-gray-600">Study Time</p>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Target className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {report.summary.quizzesCompleted}
              </p>
              <p className="text-sm text-gray-600">Quizzes</p>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <p className={`text-2xl font-bold ${getPerformanceColor(report.summary.averageScore)}`}>
                {report.summary.averageScore}%
              </p>
              <p className="text-sm text-gray-600">Avg Score</p>
            </div>

            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <Award className="h-6 w-6 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {report.summary.xpGained}
              </p>
              <p className="text-sm text-gray-600">XP Gained</p>
            </div>
          </div>
        )}

        {/* Strengths and Improvements */}
        {expandedSections.has('summary') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-3 flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Strengths
              </h4>
              <ul className="space-y-2">
                {report.summary.strengths.map((strength, index) => (
                  <li key={index} className="text-sm text-green-800 flex items-start">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-3 flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Areas for Improvement
              </h4>
              <ul className="space-y-2">
                {report.summary.improvementAreas.map((area, index) => (
                  <li key={index} className="text-sm text-yellow-800 flex items-start">
                    <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                    {area}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Subject Breakdown */}
      <div className="p-6 border-t">
        <button
          onClick={() => toggleSection('subjects')}
          className="flex items-center justify-between w-full text-left mb-4"
        >
          <h3 className="text-lg font-medium text-gray-900">Subject Breakdown</h3>
          {expandedSections.has('subjects') ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>

        {expandedSections.has('subjects') && (
          <div className="space-y-4">
            {report.subjectBreakdown.map((subject) => (
              <div key={subject.subject} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">{subject.subject}</h4>
                  <div className="flex items-center space-x-2">
                    {getTrendIcon('stable')}
                    <span className="text-sm text-gray-600">
                      {subject.improvementFromLastWeek > 0 ? '+' : ''}{subject.improvementFromLastWeek}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-900">
                      {formatTime(subject.timeSpent)}
                    </p>
                    <p className="text-xs text-gray-600">Time Spent</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-900">
                      {subject.quizzesCompleted}
                    </p>
                    <p className="text-xs text-gray-600">Quizzes</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-lg font-semibold ${getPerformanceColor(subject.averageScore)}`}>
                      {subject.averageScore.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-600">Avg Score</p>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-2">Topics Studied:</p>
                  <div className="flex flex-wrap gap-1">
                    {subject.topicsStudied.map((topic, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-xs text-gray-700 rounded"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bloom Level Distribution */}
                <div>
                  <p className="text-sm text-gray-600 mb-2">Bloom Level Distribution:</p>
                  <div className="grid grid-cols-6 gap-1">
                    {Object.entries(subject.bloomLevelDistribution).map(([level, count]) => (
                      <div key={level} className="text-center">
                        <div className="text-xs text-gray-500 mb-1">
                          L{level.replace('level', '')}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${Math.min(100, (count as number) * 10)}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">{count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Achievements */}
      {report.achievements.length > 0 && (
        <div className="p-6 border-t">
          <button
            onClick={() => toggleSection('achievements')}
            className="flex items-center justify-between w-full text-left mb-4"
          >
            <h3 className="text-lg font-medium text-gray-900">Achievements This Week</h3>
            {expandedSections.has('achievements') ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </button>

          {expandedSections.has('achievements') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center space-x-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg"
                >
                  <div className="text-2xl">{achievement.icon}</div>
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
          )}
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div className="p-6 border-t">
          <button
            onClick={() => toggleSection('recommendations')}
            className="flex items-center justify-between w-full text-left mb-4"
          >
            <h3 className="text-lg font-medium text-gray-900">Recommendations</h3>
            {expandedSections.has('recommendations') ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </button>

          {expandedSections.has('recommendations') && (
            <div className="space-y-4">
              {report.recommendations.map((recommendation, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    recommendation.priority === 'high' ? 'border-red-400 bg-red-50' :
                    recommendation.priority === 'medium' ? 'border-yellow-400 bg-yellow-50' :
                    'border-blue-400 bg-blue-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{recommendation.title}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      recommendation.priority === 'high' ? 'bg-red-100 text-red-800' :
                      recommendation.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {recommendation.priority} priority
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">{recommendation.description}</p>
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-900 mb-2">Action Items:</p>
                    <ul className="space-y-1">
                      {recommendation.actionItems.map((item, itemIndex) => (
                        <li key={itemIndex} className="text-sm text-gray-700 flex items-start">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>Impact: {recommendation.estimatedImpact}</span>
                    <span>Timeframe: {recommendation.timeframe}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Comparative Analytics */}
      <div className="p-6 border-t">
        <button
          onClick={() => toggleSection('analytics')}
          className="flex items-center justify-between w-full text-left mb-4"
        >
          <h3 className="text-lg font-medium text-gray-900">Performance Comparison</h3>
          {expandedSections.has('analytics') ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>

        {expandedSections.has('analytics') && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Class Comparison
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Rank:</span>
                    <span className="text-sm font-medium">
                      {report.comparativeAnalytics.classComparison.childRank} of {report.comparativeAnalytics.classComparison.totalStudents}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Percentile:</span>
                    <span className="text-sm font-medium">
                      {report.comparativeAnalytics.classComparison.percentile}th
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Class Average:</span>
                    <span className="text-sm font-medium">
                      {report.comparativeAnalytics.classComparison.averageClassScore}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Grade Comparison
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Rank:</span>
                    <span className="text-sm font-medium">
                      {report.comparativeAnalytics.gradeComparison.childRank} of {report.comparativeAnalytics.gradeComparison.totalStudents}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Percentile:</span>
                    <span className="text-sm font-medium">
                      {report.comparativeAnalytics.gradeComparison.percentile}th
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Grade Average:</span>
                    <span className="text-sm font-medium">
                      {report.comparativeAnalytics.gradeComparison.averageGradeScore}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500 italic">
              {report.comparativeAnalytics.privacyNote}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 bg-gray-50 border-t text-center">
        <p className="text-xs text-gray-500">
          Report generated on {new Date(report.generatedAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
};