import React, { useState, useEffect } from 'react';
import {
  ArrowLeft as ArrowLeftIcon,
  BarChart3 as ChartBarIcon,
  Clock as ClockIcon,
  GraduationCap as AcademicCapIcon,
  AlertTriangle as ExclamationTriangleIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon
} from 'lucide-react';

interface AssessmentAnalyticsProps {
  assessmentId: string;
  onBack: () => void;
}

interface QuestionAnalytics {
  questionId: string;
  question: string;
  correctRate: number;
  averageTime: number;
  commonMistakes: string[];
  bloomLevel: number;
}

interface ClassComparison {
  classId: string;
  className: string;
  averageScore: number;
  completionRate: number;
  topPerformers: string[];
  strugglingStudents: string[];
}

interface DifficultyAnalysis {
  easy: {
    averageScore: number;
    completionRate: number;
  };
  medium: {
    averageScore: number;
    completionRate: number;
  };
  hard: {
    averageScore: number;
    completionRate: number;
  };
}

interface AnalyticsData {
  assessmentId: string;
  title: string;
  completionRate: number;
  averageScore: number;
  averageTime: number;
  questionAnalytics: QuestionAnalytics[];
  classComparison: ClassComparison[];
  difficultyAnalysis: DifficultyAnalysis;
}

const AssessmentAnalytics: React.FC<AssessmentAnalyticsProps> = ({
  assessmentId,
  onBack
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAnalytics();
  }, [assessmentId]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/v1/assessment/${assessmentId}/analytics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBg = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${getPerformanceBg(analytics!.completionRate)}`}>
              <CheckCircleIcon className={`w-6 h-6 ${getPerformanceColor(analytics!.completionRate)}`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{analytics!.completionRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${getPerformanceBg(analytics!.averageScore)}`}>
              <ChartBarIcon className={`w-6 h-6 ${getPerformanceColor(analytics!.averageScore)}`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-2xl font-bold text-gray-900">{analytics!.averageScore.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <ClockIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Time</p>
              <p className="text-2xl font-bold text-gray-900">{analytics!.averageTime.toFixed(1)}m</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <AcademicCapIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Questions</p>
              <p className="text-2xl font-bold text-gray-900">{analytics!.questionAnalytics.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Difficulty Analysis */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Performance by Difficulty</h3>
        <div className="grid grid-cols-3 gap-6">
          {Object.entries(analytics!.difficultyAnalysis).map(([difficulty, data]) => (
            <div key={difficulty} className="text-center">
              <div className="mb-2">
                <h4 className="text-sm font-medium text-gray-600 capitalize">{difficulty}</h4>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500">Average Score</p>
                  <p className={`text-lg font-bold ${getPerformanceColor(data.averageScore)}`}>
                    {data.averageScore.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Completion Rate</p>
                  <p className={`text-lg font-bold ${getPerformanceColor(data.completionRate)}`}>
                    {data.completionRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performing and Struggling Questions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
            Top Performing Questions
          </h3>
          <div className="space-y-3">
            {analytics!.questionAnalytics
              .sort((a, b) => b.correctRate - a.correctRate)
              .slice(0, 3)
              .map((question, index) => (
                <div key={question.questionId} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Question {index + 1}
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      {question.question}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">
                      {question.correctRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">
                      Bloom Level {question.bloomLevel}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
            Challenging Questions
          </h3>
          <div className="space-y-3">
            {analytics!.questionAnalytics
              .sort((a, b) => a.correctRate - b.correctRate)
              .slice(0, 3)
              .map((question, index) => (
                <div key={question.questionId} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Question {index + 1}
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      {question.question}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">
                      {question.correctRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">
                      Bloom Level {question.bloomLevel}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderQuestionAnalysis = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Question-by-Question Analysis</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {analytics!.questionAnalytics.map((question, index) => (
            <div key={question.questionId} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Question {index + 1}
                  </h4>
                  <p className="text-gray-700 text-sm mb-2">{question.question}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>Bloom Level {question.bloomLevel}</span>
                    <span>Avg Time: {question.averageTime.toFixed(1)}s</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    question.correctRate >= 80 
                      ? 'bg-green-100 text-green-800'
                      : question.correctRate >= 60
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {question.correctRate.toFixed(1)}% Correct
                  </div>
                </div>
              </div>

              {question.commonMistakes.length > 0 && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Common Mistakes:</h5>
                  <ul className="space-y-1">
                    {question.commonMistakes.map((mistake, mistakeIndex) => (
                      <li key={mistakeIndex} className="text-sm text-red-600 flex items-center">
                        <XCircleIcon className="w-4 h-4 mr-2" />
                        {mistake}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      question.correctRate >= 80 
                        ? 'bg-green-500'
                        : question.correctRate >= 60
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${question.correctRate}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderClassComparison = () => (
    <div className="space-y-6">
      {analytics!.classComparison.length > 0 ? (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Class Performance Comparison</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {analytics!.classComparison.map((classData) => (
              <div key={classData.classId} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900">{classData.className}</h4>
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Average Score</p>
                      <p className={`text-lg font-bold ${getPerformanceColor(classData.averageScore)}`}>
                        {classData.averageScore.toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Completion Rate</p>
                      <p className={`text-lg font-bold ${getPerformanceColor(classData.completionRate)}`}>
                        {classData.completionRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h5 className="text-sm font-medium text-green-700 mb-2">Top Performers</h5>
                    <ul className="space-y-1">
                      {classData.topPerformers.map((student, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-center">
                          <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                          {student}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium text-red-700 mb-2">Needs Support</h5>
                    <ul className="space-y-1">
                      {classData.strugglingStudents.map((student, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-center">
                          <ExclamationTriangleIcon className="w-4 h-4 text-red-500 mr-2" />
                          {student}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <AcademicCapIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Class Data Available</h3>
          <p className="text-gray-500">Class comparison data will appear here once students complete the assessment.</p>
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-500 ml-3">Loading analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Failed to load analytics data.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{analytics.title}</h1>
            <p className="text-gray-600">Assessment Analytics</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'questions', label: 'Question Analysis' },
            { id: 'classes', label: 'Class Comparison' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'questions' && renderQuestionAnalysis()}
      {activeTab === 'classes' && renderClassComparison()}
    </div>
  );
};

export default AssessmentAnalytics;