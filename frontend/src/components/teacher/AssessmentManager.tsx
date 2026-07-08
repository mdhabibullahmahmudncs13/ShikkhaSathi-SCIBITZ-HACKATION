import React, { useState, useEffect } from 'react';
import {
  Plus as PlusIcon,
  Eye as EyeIcon,
  Edit as PencilIcon,
  Trash2 as TrashIcon,
  BarChart3 as ChartBarIcon,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  GraduationCap as AcademicCapIcon,
  FileText as DocumentTextIcon
} from 'lucide-react';
import AssessmentCreator from './AssessmentCreator';
import AssessmentAnalytics from './AssessmentAnalytics';

interface Assessment {
  id: string;
  title: string;
  subject: string;
  grade: number;
  question_count: number;
  time_limit: number;
  difficulty: string;
  scheduled_date: string | null;
  due_date: string | null;
  is_published: boolean;
  created_at: string;
  attempts_count: number;
  completion_rate: number;
}

interface AssessmentManagerProps {
  teacherId: string;
}

const AssessmentManager: React.FC<AssessmentManagerProps> = ({ teacherId }) => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async (page = 0) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/v1/assessment/list?limit=20&offset=${page * 20}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (page === 0) {
          setAssessments(data.assessments);
        } else {
          setAssessments(prev => [...prev, ...data.assessments]);
        }
        setHasMore(data.has_more);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Failed to fetch assessments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssessmentCreated = (assessmentId: string) => {
    setShowCreator(false);
    fetchAssessments(); // Refresh the list
  };

  const handleDeleteAssessment = async (assessmentId: string) => {
    if (!confirm('Are you sure you want to delete this assessment?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/assessment/${assessmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setAssessments(prev => prev.filter(a => a.id !== assessmentId));
      }
    } catch (error) {
      console.error('Failed to delete assessment:', error);
    }
  };

  const handlePublishAssessment = async (assessmentId: string) => {
    try {
      const response = await fetch(`/api/v1/assessment/${assessmentId}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setAssessments(prev => prev.map(a => 
          a.id === assessmentId ? { ...a, is_published: true } : a
        ));
      }
    } catch (error) {
      console.error('Failed to publish assessment:', error);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      case 'adaptive': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (showCreator) {
    return (
      <AssessmentCreator
        onAssessmentCreated={handleAssessmentCreated}
        onCancel={() => setShowCreator(false)}
      />
    );
  }

  if (showAnalytics && selectedAssessment) {
    return (
      <AssessmentAnalytics
        assessmentId={selectedAssessment}
        onBack={() => {
          setShowAnalytics(false);
          setSelectedAssessment(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assessment Management</h1>
          <p className="text-gray-600 mt-1">Create, manage, and analyze your assessments</p>
        </div>
        <button
          onClick={() => setShowCreator(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Create Assessment</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <DocumentTextIcon className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Assessments</p>
              <p className="text-2xl font-bold text-gray-900">{assessments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <AcademicCapIcon className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Published</p>
              <p className="text-2xl font-bold text-gray-900">
                {assessments.filter(a => a.is_published).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <ChartBarIcon className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Attempts</p>
              <p className="text-2xl font-bold text-gray-900">
                {assessments.reduce((sum, a) => sum + a.attempts_count, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <ClockIcon className="w-8 h-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Completion</p>
              <p className="text-2xl font-bold text-gray-900">
                {assessments.length > 0 
                  ? Math.round(assessments.reduce((sum, a) => sum + a.completion_rate, 0) / assessments.length)
                  : 0
                }%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Assessments List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Your Assessments</h2>
        </div>

        {isLoading && assessments.length === 0 ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading assessments...</p>
          </div>
        ) : assessments.length === 0 ? (
          <div className="p-8 text-center">
            <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments yet</h3>
            <p className="text-gray-500 mb-4">Create your first assessment to get started</p>
            <button
              onClick={() => setShowCreator(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Assessment
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {assessments.map((assessment) => (
              <div key={assessment.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {assessment.title}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(assessment.difficulty)}`}>
                        {assessment.difficulty}
                      </span>
                      {assessment.is_published ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Published
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                          Draft
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                      <span className="flex items-center space-x-1">
                        <AcademicCapIcon className="w-4 h-4" />
                        <span>{assessment.subject} - Grade {assessment.grade}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <DocumentTextIcon className="w-4 h-4" />
                        <span>{assessment.question_count} questions</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <ClockIcon className="w-4 h-4" />
                        <span>{assessment.time_limit} minutes</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <ChartBarIcon className="w-4 h-4" />
                        <span>{assessment.attempts_count} attempts</span>
                      </span>
                    </div>

                    <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                      <span className="flex items-center space-x-1">
                        <CalendarIcon className="w-4 h-4" />
                        <span>Created: {formatDate(assessment.created_at)}</span>
                      </span>
                      {assessment.due_date && (
                        <span className="flex items-center space-x-1">
                          <CalendarIcon className="w-4 h-4" />
                          <span>Due: {formatDate(assessment.due_date)}</span>
                        </span>
                      )}
                    </div>

                    {assessment.completion_rate > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Completion Rate</span>
                          <span className="font-medium">{assessment.completion_rate.toFixed(1)}%</span>
                        </div>
                        <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${assessment.completion_rate}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => {
                        setSelectedAssessment(assessment.id);
                        setShowAnalytics(true);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="View Analytics"
                    >
                      <ChartBarIcon className="w-5 h-5" />
                    </button>

                    <button
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                      title="Preview Assessment"
                    >
                      <EyeIcon className="w-5 h-5" />
                    </button>

                    <button
                      className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg"
                      title="Edit Assessment"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>

                    {!assessment.is_published && (
                      <button
                        onClick={() => handlePublishAssessment(assessment.id)}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Publish
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteAssessment(assessment.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete Assessment"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && assessments.length > 0 && (
          <div className="p-6 border-t border-gray-200 text-center">
            <button
              onClick={() => fetchAssessments(currentPage + 1)}
              disabled={isLoading}
              className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentManager;