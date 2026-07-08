import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  FileText, 
  Calendar, 
  Users, 
  BarChart3,
  Eye,
  Edit,
  Trash2,
  Clock
} from 'lucide-react';

interface Assessment {
  id: string;
  title: string;
  description: string;
  type: 'quiz' | 'assignment' | 'exam';
  subject: string;
  class_id: string;
  class_name: string;
  due_date: string;
  max_points: number;
  created_at: string;
  status: 'draft' | 'published' | 'completed';
  submission_count: number;
  total_students: number;
}

const TeacherAssessmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'quiz' | 'assignment' | 'exam'>('all');

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      // Mock data for now - in real app, this would fetch from API
      const mockAssessments: Assessment[] = [
        {
          id: '1',
          title: 'Quadratic Equations Quiz',
          description: 'Test understanding of quadratic equations and their solutions',
          type: 'quiz',
          subject: 'Mathematics',
          class_id: '6947',
          class_name: 'Grade 10 Mathematics',
          due_date: '2025-01-15T23:59:00',
          max_points: 50,
          created_at: '2025-01-08T10:00:00Z',
          status: 'published',
          submission_count: 12,
          total_students: 25
        },
        {
          id: '2',
          title: 'Physics Lab Report',
          description: 'Submit your pendulum experiment analysis',
          type: 'assignment',
          subject: 'Physics',
          class_id: '6947',
          class_name: 'Grade 10 Physics',
          due_date: '2025-01-20T23:59:00',
          max_points: 100,
          created_at: '2025-01-09T14:30:00Z',
          status: 'published',
          submission_count: 8,
          total_students: 25
        },
        {
          id: '3',
          title: 'Mid-term Examination',
          description: 'Comprehensive exam covering chapters 1-5',
          type: 'exam',
          subject: 'Mathematics',
          class_id: '6947',
          class_name: 'Grade 10 Mathematics',
          due_date: '2025-01-25T14:00:00',
          max_points: 200,
          created_at: '2025-01-05T09:00:00Z',
          status: 'draft',
          submission_count: 0,
          total_students: 25
        }
      ];
      
      setAssessments(mockAssessments);
    } catch (error) {
      console.error('Failed to fetch assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssessments = assessments.filter(assessment => 
    filter === 'all' || assessment.type === filter
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'quiz': return <FileText className="w-5 h-5 text-blue-500" />;
      case 'assignment': return <Edit className="w-5 h-5 text-green-500" />;
      case 'exam': return <BarChart3 className="w-5 h-5 text-red-500" />;
      default: return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/teacher')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Assessments</h1>
                <p className="text-gray-600">Manage quizzes, assignments, and exams</p>
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              Create Assessment
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'all', label: 'All Assessments', count: assessments.length },
            { key: 'quiz', label: 'Quizzes', count: assessments.filter(a => a.type === 'quiz').length },
            { key: 'assignment', label: 'Assignments', count: assessments.filter(a => a.type === 'assignment').length },
            { key: 'exam', label: 'Exams', count: assessments.filter(a => a.type === 'exam').length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Assessments Grid */}
        {filteredAssessments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments found</h3>
            <p className="text-gray-500 mb-6">
              {filter === 'all' 
                ? "You haven't created any assessments yet." 
                : `No ${filter}s found. Try a different filter.`}
            </p>
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Create Your First Assessment
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssessments.map((assessment) => (
              <div key={assessment.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(assessment.type)}
                    <div>
                      <h3 className="font-semibold text-gray-900">{assessment.title}</h3>
                      <p className="text-sm text-gray-500 capitalize">{assessment.type}</p>
                    </div>
                  </div>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(assessment.status)}`}>
                    {assessment.status}
                  </span>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{assessment.description}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>Due: {new Date(assessment.due_date).toLocaleDateString()}</span>
                    {isOverdue(assessment.due_date) && assessment.status === 'published' && (
                      <span className="text-red-600 font-medium ml-2">Overdue</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Users className="w-4 h-4" />
                    <span>{assessment.submission_count}/{assessment.total_students} submitted</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <BarChart3 className="w-4 h-4" />
                    <span>{assessment.max_points} points</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="px-3 py-2 border border-red-300 text-red-700 text-sm rounded hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherAssessmentsPage;