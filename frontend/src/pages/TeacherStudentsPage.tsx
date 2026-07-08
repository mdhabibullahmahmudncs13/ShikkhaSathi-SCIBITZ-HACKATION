import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  Search, 
  Filter,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  TrendingUp,
  Award,
  Eye,
  MessageCircle
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  class_id: string;
  class_name: string;
  joined_at: string;
  last_active: string;
  performance: {
    overall_score: number;
    assignments_completed: number;
    total_assignments: number;
    quiz_average: number;
    attendance_rate: number;
  };
  status: 'active' | 'inactive' | 'pending';
}

const TeacherStudentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      // Mock data for now - in real app, this would fetch from API
      const mockStudents: Student[] = [
        {
          id: '1',
          name: 'আহমেদ রহমান',
          email: 'ahmed.rahman@example.com',
          phone: '+880 1712-345678',
          class_id: '6947',
          class_name: 'Grade 10 Mathematics',
          joined_at: '2024-09-01T00:00:00Z',
          last_active: '2025-01-10T14:30:00Z',
          performance: {
            overall_score: 85,
            assignments_completed: 8,
            total_assignments: 10,
            quiz_average: 82,
            attendance_rate: 95
          },
          status: 'active'
        },
        {
          id: '2',
          name: 'ফাতিমা খাতুন',
          email: 'fatima.khatun@example.com',
          phone: '+880 1812-345679',
          class_id: '6947',
          class_name: 'Grade 10 Mathematics',
          joined_at: '2024-09-01T00:00:00Z',
          last_active: '2025-01-09T16:45:00Z',
          performance: {
            overall_score: 92,
            assignments_completed: 10,
            total_assignments: 10,
            quiz_average: 89,
            attendance_rate: 98
          },
          status: 'active'
        },
        {
          id: '3',
          name: 'মোহাম্মদ করিম',
          email: 'mohammad.karim@example.com',
          class_id: '6947',
          class_name: 'Grade 10 Mathematics',
          joined_at: '2024-09-15T00:00:00Z',
          last_active: '2025-01-08T10:20:00Z',
          performance: {
            overall_score: 76,
            assignments_completed: 6,
            total_assignments: 10,
            quiz_average: 74,
            attendance_rate: 88
          },
          status: 'active'
        },
        {
          id: '4',
          name: 'সাবিনা আক্তার',
          email: 'sabina.akter@example.com',
          phone: '+880 1912-345680',
          class_id: '6948',
          class_name: 'Grade 10 Physics',
          joined_at: '2024-09-01T00:00:00Z',
          last_active: '2025-01-05T12:15:00Z',
          performance: {
            overall_score: 68,
            assignments_completed: 4,
            total_assignments: 8,
            quiz_average: 65,
            attendance_rate: 75
          },
          status: 'inactive'
        }
      ];
      
      setStudents(mockStudents);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = filterClass === 'all' || student.class_id === filterClass;
    const matchesStatus = filterStatus === 'all' || student.status === filterStatus;
    
    return matchesSearch && matchesClass && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const uniqueClasses = Array.from(new Set(students.map(s => s.class_name)));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading students...</p>
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
                <h1 className="text-3xl font-bold text-gray-900">Students</h1>
                <p className="text-gray-600">Manage and monitor student progress</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                {filteredStudents.length} of {students.length} students
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search students by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Class Filter */}
            <div className="md:w-48">
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Classes</option>
                {uniqueClasses.map((className) => (
                  <option key={className} value={students.find(s => s.class_name === className)?.class_id}>
                    {className}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="md:w-32">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Students List */}
        {filteredStudents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
            <p className="text-gray-500">
              {searchTerm || filterClass !== 'all' || filterStatus !== 'all'
                ? "Try adjusting your search or filters."
                : "No students have joined your classes yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredStudents.map((student) => (
              <div key={student.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {student.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{student.name}</h3>
                      <p className="text-sm text-gray-500">{student.class_name}</p>
                    </div>
                  </div>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(student.status)}`}>
                    {student.status}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span>{student.email}</span>
                  </div>
                  {student.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{student.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Joined: {new Date(student.joined_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-gray-900 mb-3">Performance Overview</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">Overall Score</span>
                        <span className={`text-sm font-medium ${getPerformanceColor(student.performance.overall_score)}`}>
                          {student.performance.overall_score}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${student.performance.overall_score}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">Assignments</span>
                        <span className="text-sm font-medium text-gray-900">
                          {student.performance.assignments_completed}/{student.performance.total_assignments}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${(student.performance.assignments_completed / student.performance.total_assignments) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">{student.performance.quiz_average}%</div>
                      <div className="text-xs text-gray-500">Quiz Average</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-600">{student.performance.attendance_rate}%</div>
                      <div className="text-xs text-gray-500">Attendance</div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                    <Eye className="w-4 h-4" />
                    View Profile
                  </button>
                  <button className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors">
                    <MessageCircle className="w-4 h-4" />
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

export default TeacherStudentsPage;