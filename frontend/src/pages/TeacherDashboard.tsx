import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  BarChart3, 
  TrendingUp, 
  Clock,
  FileText as DocumentTextIcon,
  Plus,
  Settings,
  BookOpen,
  Calendar,
  Upload,
  Eye,
  Edit,
  Trash2,
  Download,
  Image,
  FileVideo,
  X,
  Video,
  Mic,
  MicOff,
  VideoOff,
  Users as UsersIcon,
  Share,
  MessageSquare,
  Phone,
  PhoneOff,
  Monitor,
  Settings as SettingsIcon
} from 'lucide-react';
import { codeConnectionService } from '../services/codeConnectionService';
import LiveClassInterface from '../components/teacher/LiveClassInterface';
import EnhancedLiveClassInterface from '../components/teacher/EnhancedLiveClassInterface';
import ScheduleClassForm from '../components/teacher/ScheduleClassForm';

interface TeacherData {
  teacher: {
    id: string;
    name: string;
    email: string;
    subjects: string[];
    classes: any[];
  };
  classes: any[];
  students: any[];
  analytics: {
    totalStudents: number;
    activeStudents: number;
    averageScore: number;
    completionRate: number;
  };
  notifications?: any[];
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  class_id: string;
  subject: string;
  due_date: string;
  max_points: number;
  instructions: string;
  allowed_file_types: string[];
  max_file_size: string;
  created_at: string;
  status: string;
  submission_count?: number;
  total_students?: number;
}

export const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [showViewClassModal, setShowViewClassModal] = useState(false);
  const [showEditClassModal, setShowEditClassModal] = useState(false);
  const [showCreateAssignmentModal, setShowCreateAssignmentModal] = useState(false);
  const [showAssignmentsModal, setShowAssignmentsModal] = useState(false);
  const [showEditAssignmentModal, setShowEditAssignmentModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [showLiveClassModal, setShowLiveClassModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showJoinClassModal, setShowJoinClassModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [scheduledClasses, setScheduledClasses] = useState<any[]>([]);
  const [createClassLoading, setCreateClassLoading] = useState(false);
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  const fetchScheduledClasses = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/scheduled-classes/teacher/2', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setScheduledClasses(data.scheduled_classes || []);
      }
    } catch (error) {
      console.error('Failed to fetch scheduled classes:', error);
    }
  }, []);

  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        setLoading(true);
        
        // Fetch real teacher data from backend
        const response = await fetch('http://localhost:8000/api/v1/connect/teacher/dashboard', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // In a real app, we'd include the JWT token here
            // 'Authorization': `Bearer ${token}`
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Validate that we received data
        if (!data) {
          throw new Error('No data received from server');
        }
        
        // Transform backend data to match frontend interface
        const transformedData: TeacherData = {
          teacher: {
            id: data.teacher_id || "teacher_001",
            name: data.name || "Teacher Name",
            email: data.email || "teacher@example.com",
            subjects: ['Mathematics', 'Science'], // Mock subjects for now
            classes: data.classes || []
          },
          classes: data.classes || [],
          students: [], // Will be populated from classes
          analytics: {
            totalStudents: data.total_students || 0,
            activeStudents: data.total_students || 0,
            averageScore: data.class_performance?.average_score || 0,
            completionRate: data.class_performance?.completion_rate || 85
          },
          notifications: data.notifications || []
        };
        
        setTeacherData(transformedData);
        
        // Fetch scheduled classes
        await fetchScheduledClasses();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load teacher data');
        console.error('Error fetching teacher data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherData();
  }, [fetchScheduledClasses]);

  // Additional useEffect to ensure scheduled classes are fetched
  useEffect(() => {
    if (teacherData) {
      fetchScheduledClasses();
    }
  }, [teacherData, fetchScheduledClasses]);

  const handleCreateClass = async (classData: {
    class_name: string;
    subject: string;
    grade_level: number;
    section?: string;
    description?: string;
  }) => {
    try {
      setCreateClassLoading(true);
      const result = await codeConnectionService.createClassWithCode(classData);
      
      if (result.success) {
        // Refresh the teacher data to show the new class
        const response = await fetch('http://localhost:8000/api/v1/connect/teacher/dashboard', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          
          // Validate that we received data
          if (!data) {
            throw new Error('No data received from server');
          }
          
          // Transform backend data to match frontend interface
          const transformedData: TeacherData = {
            teacher: {
              id: data.teacher_id || "teacher_001",
              name: data.name || "Teacher Name",
              email: data.email || "teacher@example.com",
              subjects: ['Mathematics', 'Science'],
              classes: data.classes || []
            },
            classes: data.classes || [],
            students: [],
            analytics: {
              totalStudents: data.total_students || 0,
              activeStudents: data.total_students || 0,
              averageScore: data.class_performance?.average_score || 0,
              completionRate: data.class_performance?.completion_rate || 85
            },
            notifications: data.notifications || []
          };
          
          setTeacherData(transformedData);
        }
        
        setShowCreateClassModal(false);
        alert(`Class created successfully! Share code "${result.class_code}" with students.`);
      }
    } catch (error: any) {
      alert(`Failed to create class: ${error.message}`);
    } finally {
      setCreateClassLoading(false);
    }
  };

  const handleSettings = () => {
    alert('Settings functionality coming soon!');
  };

  const handleViewClass = (classItem: any) => {
    setSelectedClass(classItem);
    setShowViewClassModal(true);
  };

  const handleEditClass = (classItem: any) => {
    setSelectedClass(classItem);
    setShowEditClassModal(true);
  };

  const handleDeleteClass = async (classId: string) => {
    if (window.confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
      try {
        // Call the backend delete API endpoint
        const response = await fetch(`http://localhost:8000/api/v1/connect/teacher/delete-class/${classId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const result = await response.json();

        if (result.success) {
          // Remove the class from local state
          setTeacherData(prev => prev ? {
            ...prev,
            classes: prev.classes.filter(c => c.id !== classId)
          } : prev);
          
          alert(result.message || 'Class deleted successfully!');
        } else {
          // Handle backend error (e.g., trying to delete default classes)
          alert(result.message || 'Failed to delete class.');
        }
      } catch (error) {
        console.error('Error deleting class:', error);
        alert('Failed to delete class. Please check your connection and try again.');
      }
    }
  };

  const handleUpdateClass = async (updatedClassData: any) => {
    try {
      // In a real app, we'd call an update API endpoint
      // For now, we'll just update the local state
      setTeacherData(prev => prev ? {
        ...prev,
        classes: prev.classes.map(c => 
          c.id === selectedClass.id 
            ? { ...c, ...updatedClassData }
            : c
        )
      } : prev);
      
      setShowEditClassModal(false);
      setSelectedClass(null);
      alert('Class updated successfully!');
    } catch (error) {
      alert('Failed to update class. Please try again.');
    }
  };

  const handleViewAssignments = async (classItem: any) => {
    try {
      setSelectedClass(classItem);
      setAssignmentLoading(true);
      
      const response = await fetch(`http://localhost:8000/api/v1/assignments/class/${classItem.id}`);
      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);
      }
      
      setShowAssignmentsModal(true);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      alert('Failed to load assignments. Please try again.');
    } finally {
      setAssignmentLoading(false);
    }
  };

  const handleCreateAssignment = async (assignmentData: {
    title: string;
    description: string;
    subject: string;
    due_date: string;
    max_points: number;
    instructions: string;
  }) => {
    try {
      setAssignmentLoading(true);
      
      const response = await fetch('http://localhost:8000/api/v1/assignments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...assignmentData,
          class_id: selectedClass.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAssignments(prev => [...prev, data.assignment]);
        setShowCreateAssignmentModal(false);
        alert('Assignment created successfully!');
      } else {
        throw new Error('Failed to create assignment');
      }
    } catch (error) {
      alert('Failed to create assignment. Please try again.');
    } finally {
      setAssignmentLoading(false);
    }
  };

  const handleViewSubmissions = async (assignment: Assignment) => {
    try {
      setSelectedAssignment(assignment);
      setAssignmentLoading(true);
      
      const response = await fetch(`http://localhost:8000/api/v1/assignments/${assignment.id}/submissions`);
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.submissions || []);
        setShowSubmissionsModal(true);
      } else {
        throw new Error('Failed to fetch submissions');
      }
    } catch (error) {
      console.error('Failed to load submissions:', error);
      alert('Failed to load submissions. Please try again.');
    } finally {
      setAssignmentLoading(false);
    }
  };

  const handleGradeSubmission = async (submissionId: string, studentId: string, grade: number, feedback: string) => {
    if (!selectedAssignment) return;

    try {
      const response = await fetch('http://localhost:8000/api/v1/assignments/grade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignment_id: selectedAssignment.id,
          student_id: studentId,
          grade: grade,
          feedback: feedback
        })
      });

      if (response.ok) {
        // Update the submission in local state
        setSubmissions(prev => prev.map(sub => 
          sub.student_id === studentId 
            ? { ...sub, grade, feedback, status: 'graded', graded_at: new Date().toISOString() }
            : sub
        ));
        alert('Assignment graded successfully!');
      } else {
        throw new Error('Failed to grade assignment');
      }
    } catch (error) {
      alert('Failed to grade assignment. Please try again.');
    }
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setShowEditAssignmentModal(true);
  };

  const handleUpdateAssignment = async (updatedData: {
    title: string;
    description: string;
    subject: string;
    due_date: string;
    max_points: number;
    instructions: string;
  }) => {
    if (!selectedAssignment) return;

    try {
      setAssignmentLoading(true);
      
      const response = await fetch(`http://localhost:8000/api/v1/assignments/${selectedAssignment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData)
      });

      if (response.ok) {
        const data = await response.json();
        // Update the assignment in the local state
        setAssignments(prev => prev.map(a => 
          a.id === selectedAssignment.id ? data.assignment : a
        ));
        setShowEditAssignmentModal(false);
        setSelectedAssignment(null);
        alert('Assignment updated successfully!');
      } else {
        throw new Error('Failed to update assignment');
      }
    } catch (error) {
      alert('Failed to update assignment. Please try again.');
    } finally {
      setAssignmentLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignment: Assignment) => {
    if (!window.confirm(`Are you sure you want to delete "${assignment.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/v1/assignments/${assignment.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Remove assignment from local state
        setAssignments(prev => prev.filter(a => a.id !== assignment.id));
        alert('Assignment deleted successfully!');
      } else {
        throw new Error('Failed to delete assignment');
      }
    } catch (error) {
      alert('Failed to delete assignment. Please try again.');
    }
  };

  const handleScheduleClass = async (scheduleData: any) => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/scheduled-classes/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...scheduleData,
          teacher_id: "2" // teacher1@example.com
        })
      });

      if (response.ok) {
        const data = await response.json();
        setShowScheduleModal(false);
        setSelectedClass(null);
        
        // Refresh scheduled classes list
        await fetchScheduledClasses();
        
        alert(`Class scheduled successfully! Students will be notified ${scheduleData.notifyBefore} minutes before the class starts.`);
      } else {
        throw new Error('Failed to schedule class');
      }
    } catch (error) {
      console.error('Failed to schedule class:', error);
      alert('Failed to schedule class. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading teacher dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!teacherData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No teacher data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
              <p className="text-gray-600">Welcome back, {teacherData.teacher.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowCreateClassModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Class
              </button>
              <button 
                onClick={handleSettings}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-3xl font-bold text-gray-900">{teacherData.analytics.totalStudents}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Students</p>
                <p className="text-3xl font-bold text-gray-900">{teacherData.analytics.activeStudents}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-3xl font-bold text-gray-900">{teacherData.analytics.averageScore}%</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-3xl font-bold text-gray-900">{teacherData.analytics.completionRate}%</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Classes Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">My Classes</h2>
            <button 
              onClick={() => setShowCreateClassModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Class
            </button>
          </div>
          
          {teacherData.classes.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No classes yet</h3>
              <p className="text-gray-500 mb-6">Create your first class to start managing students and assignments.</p>
              <button 
                onClick={() => setShowCreateClassModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Your First Class
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teacherData.classes.map((classItem: any) => (
                <div key={classItem.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{classItem.name}</h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditClass(classItem)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit Class"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClass(classItem.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Class"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{classItem.subject} • Grade {classItem.grade}</p>
                  <p className="text-xs text-gray-500 mb-4">Code: {classItem.class_code}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-500">
                      {classItem.student_count || 0} students
                    </span>
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                      Active
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleViewClass(classItem)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      View Details
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedClass(classItem);
                        setShowLiveClassModal(true);
                      }}
                      className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                    >
                      <Video className="w-4 h-4" />
                      Live Class
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedClass(classItem);
                        setShowScheduleModal(true);
                      }}
                      className="flex-1 px-3 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1"
                    >
                      <Calendar className="w-4 h-4" />
                      Schedule
                    </button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button 
                      onClick={() => handleViewAssignments(classItem)}
                      className="flex-1 px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
                    >
                      Assignments
                    </button>
                    <button 
                      onClick={() => handleEditClass(classItem)}
                      className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scheduled Classes Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Scheduled Classes</h2>
            <span className="text-sm text-gray-500">{scheduledClasses.length} scheduled</span>
          </div>
          
          {scheduledClasses.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No scheduled classes</h3>
              <p className="text-gray-500 mb-6">Schedule online classes for your students using the "Schedule" button on your class cards above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {scheduledClasses.map((scheduledClass: any) => (
                <div key={scheduledClass.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{scheduledClass.title}</h3>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          scheduledClass.status === 'live' ? 'bg-green-100 text-green-800' :
                          scheduledClass.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                          scheduledClass.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {scheduledClass.status === 'live' ? 'Live Now' : 
                           scheduledClass.status === 'scheduled' ? 'Scheduled' :
                           scheduledClass.status === 'completed' ? 'Completed' : 'Cancelled'}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{scheduledClass.description}</p>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(`${scheduledClass.scheduled_date}T${scheduledClass.scheduled_time}`).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{scheduledClass.duration} minutes</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{scheduledClass.participants?.length || 0} joined</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      {scheduledClass.status === 'scheduled' && (
                        <button
                          onClick={() => {
                            // Start the scheduled class
                            fetch(`http://localhost:8000/api/v1/scheduled-classes/${scheduledClass.id}/start`, {
                              method: 'POST'
                            }).then(() => {
                              fetchScheduledClasses(); // Refresh the list
                              alert('Class started! Students can now join.');
                            });
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Video className="w-4 h-4" />
                          Start Class
                        </button>
                      )}
                      
                      {scheduledClass.status === 'live' && (
                        <button
                          onClick={() => navigate(`/live/${scheduledClass.id}`)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Video className="w-4 h-4" />
                          Join Live
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 mt-3">
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <strong>Meeting ID:</strong> {scheduledClass.meeting_id}
                      </div>
                      <div>
                        <strong>Notify:</strong> {scheduledClass.notify_before} min before
                      </div>
                      {scheduledClass.is_recurring && (
                        <div>
                          <strong>Recurring:</strong> {scheduledClass.recurring_pattern}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h2>
          <div className="text-center py-8">
            <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No recent activity to display</p>
          </div>
        </div>
      </div>

      {/* View Class Modal */}
      {showViewClassModal && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Class Details</h2>
              <button
                onClick={() => {
                  setShowViewClassModal(false);
                  setSelectedClass(null);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Class Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Class Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Class Name</label>
                      <p className="text-gray-900">{selectedClass.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Subject</label>
                      <p className="text-gray-900">{selectedClass.subject}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Grade</label>
                      <p className="text-gray-900">Grade {selectedClass.grade}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Class Code</label>
                      <div className="flex items-center gap-2">
                        <p className="text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                          {selectedClass.class_code}
                        </p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedClass.class_code);
                            alert('Class code copied to clipboard!');
                          }}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Total Students</label>
                      <p className="text-2xl font-bold text-blue-600">{selectedClass.student_count || 0}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Created</label>
                      <p className="text-gray-900">
                        {new Date(selectedClass.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Status</label>
                      <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-sm rounded">
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Description */}
              {selectedClass.description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {selectedClass.description}
                  </p>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowViewClassModal(false);
                    handleEditClass(selectedClass);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Edit Class
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedClass.class_code);
                    alert('Class code copied! Share it with students to join.');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Share Code
                </button>
                <button
                  onClick={() => {
                    setShowViewClassModal(false);
                    handleDeleteClass(selectedClass.id);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {showEditClassModal && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Edit Class</h2>
              <button
                onClick={() => {
                  setShowEditClassModal(false);
                  setSelectedClass(null);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleUpdateClass({
                  name: formData.get('class_name') as string,
                  subject: formData.get('subject') as string,
                  grade: parseInt(formData.get('grade_level') as string),
                  description: formData.get('description') as string || undefined,
                });
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class Name *
                </label>
                <input
                  type="text"
                  name="class_name"
                  required
                  defaultValue={selectedClass.name}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <select
                  name="subject"
                  required
                  defaultValue={selectedClass.subject}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="English">English</option>
                  <option value="Bangla">Bangla</option>
                  <option value="History">History</option>
                  <option value="Geography">Geography</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grade *
                </label>
                <select
                  name="grade_level"
                  required
                  defaultValue={selectedClass.grade}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {[6, 7, 8, 9, 10].map(grade => (
                    <option key={grade} value={grade}>Grade {grade}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={selectedClass.description || ''}
                  placeholder="Optional class description..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditClassModal(false);
                    setSelectedClass(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Class Modal */}
      {showCreateClassModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Create New Class</h2>
              <button
                onClick={() => setShowCreateClassModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCreateClass({
                  class_name: formData.get('class_name') as string,
                  subject: formData.get('subject') as string,
                  grade_level: parseInt(formData.get('grade_level') as string),
                  section: formData.get('section') as string || undefined,
                  description: formData.get('description') as string || undefined,
                });
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class Name *
                </label>
                <input
                  type="text"
                  name="class_name"
                  required
                  placeholder="e.g., Physics Advanced"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <select
                  name="subject"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Subject</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="English">English</option>
                  <option value="Bangla">Bangla</option>
                  <option value="History">History</option>
                  <option value="Geography">Geography</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grade *
                  </label>
                  <select
                    name="grade_level"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Grade</option>
                    {[6, 7, 8, 9, 10].map(grade => (
                      <option key={grade} value={grade}>Grade {grade}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Section
                  </label>
                  <input
                    type="text"
                    name="section"
                    placeholder="A, B, C..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Brief description of the class..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateClassModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={createClassLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createClassLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createClassLoading ? 'Creating...' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Assignment Modal */}
      {showCreateAssignmentModal && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Create Assignment</h2>
              <button
                onClick={() => {
                  setShowCreateAssignmentModal(false);
                  setSelectedClass(null);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCreateAssignment({
                  title: formData.get('title') as string,
                  description: formData.get('description') as string,
                  subject: formData.get('subject') as string,
                  due_date: formData.get('due_date') as string,
                  max_points: parseInt(formData.get('max_points') as string),
                  instructions: formData.get('instructions') as string,
                });
              }}
              className="p-6 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assignment Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    placeholder="e.g., Chapter 5 Math Problems"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <select
                    name="subject"
                    required
                    defaultValue={selectedClass.subject}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                    <option value="English">English</option>
                    <option value="Bangla">Bangla</option>
                    <option value="History">History</option>
                    <option value="Geography">Geography</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date *
                  </label>
                  <input
                    type="datetime-local"
                    name="due_date"
                    required
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Points *
                  </label>
                  <input
                    type="number"
                    name="max_points"
                    required
                    min="1"
                    max="1000"
                    defaultValue="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    name="description"
                    required
                    rows={3}
                    placeholder="Brief description of the assignment..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instructions
                  </label>
                  <textarea
                    name="instructions"
                    rows={4}
                    placeholder="Detailed instructions for students..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">📎 File Upload Support</h4>
                <p className="text-sm text-blue-800">
                  Students can submit: <strong>PNG, JPG, JPEG, PDF, MP4</strong> files (max 10MB each)
                </p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateAssignmentModal(false);
                    setSelectedClass(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={assignmentLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignmentLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assignmentLoading ? 'Creating...' : 'Create Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignments View Modal */}
      {showAssignmentsModal && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Assignments</h2>
                <p className="text-gray-600">{selectedClass.name} • {selectedClass.subject}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCreateAssignmentModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Assignment
                </button>
                <button
                  onClick={() => {
                    setShowAssignmentsModal(false);
                    setSelectedClass(null);
                    setAssignments([]);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {assignmentLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading assignments...</span>
                </div>
              ) : assignments.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
                  <p className="text-gray-500 mb-6">Create your first assignment to get started!</p>
                  <button
                    onClick={() => setShowCreateAssignmentModal(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Assignment
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{assignment.title}</h3>
                            <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              Active
                            </span>
                          </div>
                          <p className="text-gray-600 mb-3">{assignment.description}</p>
                          
                          <div className="flex items-center gap-6 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <DocumentTextIcon className="w-4 h-4" />
                              <span>{assignment.max_points} points</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{assignment.submission_count || 0}/{assignment.total_students || 0} submitted</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewSubmissions(assignment)}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            View Submissions
                          </button>
                          <button
                            onClick={() => handleEditAssignment(assignment)}
                            className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAssignment(assignment)}
                            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                      
                      {assignment.instructions && (
                        <div className="bg-gray-50 rounded-lg p-4 mt-4">
                          <h4 className="font-medium text-gray-900 mb-2">Instructions:</h4>
                          <p className="text-gray-700 text-sm">{assignment.instructions}</p>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-500">
                          Created: {new Date(assignment.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">Accepts:</span>
                          <div className="flex gap-1">
                            {assignment.allowed_file_types.map((type) => (
                              <span key={type} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded uppercase">
                                {type}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Assignment Modal */}
      {showEditAssignmentModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Edit Assignment</h2>
              <button
                onClick={() => {
                  setShowEditAssignmentModal(false);
                  setSelectedAssignment(null);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleUpdateAssignment({
                  title: formData.get('title') as string,
                  description: formData.get('description') as string,
                  subject: formData.get('subject') as string,
                  due_date: formData.get('due_date') as string,
                  max_points: parseInt(formData.get('max_points') as string),
                  instructions: formData.get('instructions') as string,
                });
              }}
              className="p-6 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assignment Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    defaultValue={selectedAssignment.title}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <select
                    name="subject"
                    required
                    defaultValue={selectedAssignment.subject}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                    <option value="English">English</option>
                    <option value="Bangla">Bangla</option>
                    <option value="History">History</option>
                    <option value="Geography">Geography</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date *
                  </label>
                  <input
                    type="datetime-local"
                    name="due_date"
                    required
                    defaultValue={selectedAssignment.due_date.slice(0, 16)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Points *
                  </label>
                  <input
                    type="number"
                    name="max_points"
                    required
                    min="1"
                    max="1000"
                    defaultValue={selectedAssignment.max_points}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    name="description"
                    required
                    rows={3}
                    defaultValue={selectedAssignment.description}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instructions
                  </label>
                  <textarea
                    name="instructions"
                    rows={4}
                    defaultValue={selectedAssignment.instructions}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">📎 File Upload Support</h4>
                <p className="text-sm text-blue-800">
                  Students can submit: <strong>PNG, JPG, JPEG, PDF, MP4</strong> files (max 10MB each)
                </p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditAssignmentModal(false);
                    setSelectedAssignment(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={assignmentLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignmentLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assignmentLoading ? 'Updating...' : 'Update Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submissions View Modal */}
      {showSubmissionsModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Assignment Submissions</h2>
                <p className="text-gray-600">{selectedAssignment.title}</p>
              </div>
              <button
                onClick={() => {
                  setShowSubmissionsModal(false);
                  setSelectedAssignment(null);
                  setSubmissions([]);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
              {assignmentLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading submissions...</span>
                </div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-12">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions yet</h3>
                  <p className="text-gray-500">Students haven't submitted their work yet.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-blue-900">Assignment Details</h3>
                        <p className="text-sm text-blue-800 mt-1">{selectedAssignment.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-blue-700">
                          <strong>{submissions.length}</strong> submissions received
                        </div>
                        <div className="text-sm text-blue-700">
                          Max Points: <strong>{selectedAssignment.max_points}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {submissions.map((submission) => (
                    <SubmissionCard
                      key={submission.id}
                      submission={submission}
                      assignment={selectedAssignment}
                      onGrade={handleGradeSubmission}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Schedule Class Modal */}
      {showScheduleModal && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Schedule Online Class</h2>
                <p className="text-gray-600">{selectedClass.name} • {selectedClass.subject}</p>
              </div>
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setSelectedClass(null);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
              <ScheduleClassForm
                classInfo={selectedClass}
                onSchedule={handleScheduleClass}
                onCancel={() => {
                  setShowScheduleModal(false);
                  setSelectedClass(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Live Class Modal */}
      {showLiveClassModal && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Live Class</h2>
                <p className="text-gray-600">{selectedClass.name} • {selectedClass.subject}</p>
              </div>
              <button
                onClick={() => {
                  setShowLiveClassModal(false);
                  setSelectedClass(null);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
              <EnhancedLiveClassInterface classInfo={selectedClass} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;

// Submission Card Component
interface SubmissionCardProps {
  submission: any;
  assignment: Assignment;
  onGrade: (submissionId: string, studentId: string, grade: number, feedback: string) => void;
}

const SubmissionCard: React.FC<SubmissionCardProps> = ({ submission, assignment, onGrade }) => {
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [grade, setGrade] = useState(submission.grade || '');
  const [feedback, setFeedback] = useState(submission.feedback || '');

  const handleGradeSubmit = () => {
    const gradeNum = parseInt(grade);
    if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > assignment.max_points) {
      alert(`Grade must be between 0 and ${assignment.max_points}`);
      return;
    }
    
    onGrade(submission.id, submission.student_id, gradeNum, feedback);
    setShowGradeModal(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'graded': return 'bg-green-100 text-green-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{submission.student_name}</h3>
            <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(submission.status)}`}>
              {submission.status === 'graded' ? 'Graded' : 'Submitted'}
            </span>
            {submission.grade !== null && (
              <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-sm rounded font-medium">
                {submission.grade}/{assignment.max_points}
              </span>
            )}
          </div>
          
          <div className="text-sm text-gray-500 mb-3">
            Submitted: {new Date(submission.submitted_at).toLocaleString()}
            {submission.graded_at && (
              <span className="ml-4">
                Graded: {new Date(submission.graded_at).toLocaleString()}
              </span>
            )}
          </div>

          {submission.text_response && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Student Response:</h4>
              <p className="text-gray-700 text-sm">{submission.text_response}</p>
            </div>
          )}

          {submission.files && submission.files.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Submitted Files:</h4>
              <div className="space-y-2">
                {submission.files.map((file: any, index: number) => (
                  <FilePreviewCard key={index} file={file} />
                ))}
              </div>
            </div>
          )}

          {submission.feedback && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <h4 className="font-medium text-green-900 mb-2">Teacher Feedback:</h4>
              <p className="text-green-800 text-sm">{submission.feedback}</p>
            </div>
          )}
        </div>
        
        <div className="flex gap-2 ml-4">
          <button
            onClick={() => setShowGradeModal(true)}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              submission.status === 'graded' 
                ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Edit className="w-4 h-4" />
            {submission.status === 'graded' ? 'Update Grade' : 'Grade'}
          </button>
        </div>
      </div>

      {/* Grade Modal */}
      {showGradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Grade Submission</h3>
              <button
                onClick={() => setShowGradeModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student: {submission.student_name}
                </label>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grade (out of {assignment.max_points}) *
                </label>
                <input
                  type="number"
                  min="0"
                  max={assignment.max_points}
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`Enter grade (0-${assignment.max_points})`}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feedback
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Provide feedback to the student..."
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowGradeModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGradeSubmit}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Grade
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// File Preview Card Component
interface FilePreviewCardProps {
  file: {
    name: string;
    type: string;
    size: number;
    url: string;
  };
}

const FilePreviewCard: React.FC<FilePreviewCardProps> = ({ file }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />;
    if (type === 'application/pdf') return <DocumentTextIcon className="w-5 h-5 text-red-500" />;
    if (type.startsWith('video/')) return <FileVideo className="w-5 h-5 text-purple-500" />;
    return <DocumentTextIcon className="w-5 h-5 text-gray-500" />;
  };

  const canPreview = (type: string) => {
    return type.startsWith('image/') || type === 'application/pdf' || type.startsWith('video/');
  };

  const handleDownload = () => {
    // In a real implementation, this would trigger actual file download
    // For now, we'll simulate it
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    link.click();
  };

  const renderPreview = () => {
    if (previewError) {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
          <div className="text-center">
            <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Preview not available</p>
            <p className="text-sm text-gray-400 mt-1">File may not exist or preview is not supported</p>
            <button
              onClick={handleDownload}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Download to View
            </button>
          </div>
        </div>
      );
    }

    if (file.type.startsWith('image/')) {
      return (
        <div className="max-h-96 overflow-hidden rounded-lg bg-gray-50 border">
          <div className="flex flex-col items-center justify-center p-8">
            <Image className="w-16 h-16 text-blue-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Image Preview</h3>
            <p className="text-gray-600 mb-2">{file.name}</p>
            <p className="text-sm text-gray-500 mb-4">
              Size: {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            
            {/* Sample image placeholder */}
            <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 mb-4 w-64 h-48 flex items-center justify-center">
              <div className="text-center">
                <Image className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Student's handwritten work</p>
                <p className="text-xs text-gray-400">Math problems & solutions</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => window.open(file.url, '_blank')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                View Full Image
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (file.type === 'application/pdf') {
      // Provide multiple options for PDF viewing since iframe may be blocked
      return (
        <div className="h-96 rounded-lg overflow-hidden bg-gray-50 border">
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <DocumentTextIcon className="w-20 h-20 text-red-500 mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 mb-3">PDF Document</h3>
            <p className="text-gray-600 mb-2 font-medium">{file.name}</p>
            <p className="text-sm text-gray-500 mb-6">
              Size: {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            
            {/* Sample content preview */}
            <div className="bg-white border rounded-lg p-4 mb-6 max-w-md shadow-sm">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <DocumentTextIcon className="w-4 h-4" />
                Document Preview
              </h4>
              <div className="text-left text-sm text-gray-700 space-y-2">
                <div className="border-b pb-2 mb-2">
                  <p><strong>Student Assignment Submission</strong></p>
                </div>
                <p><strong>Name:</strong> Student One</p>
                <p><strong>Subject:</strong> Mathematics</p>
                <p><strong>Assignment:</strong> Quadratic Equations</p>
                <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                <div className="mt-3 pt-2 border-t">
                  <p className="text-xs text-gray-500">
                    ✓ Problems 1-10 completed<br/>
                    ✓ All work shown<br/>
                    ✓ Solutions provided
                  </p>
                </div>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.open(file.url, '_blank')}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-medium"
              >
                <Eye className="w-5 h-5" />
                Open PDF in New Tab
              </button>
              <button
                onClick={handleDownload}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 font-medium"
              >
                <Download className="w-5 h-5" />
                Download PDF
              </button>
            </div>
            
            <p className="text-xs text-gray-400 mt-4 max-w-sm">
              Click "Open PDF in New Tab" to view the full document in your browser's PDF viewer
            </p>
          </div>
        </div>
      );
    }

    if (file.type.startsWith('video/')) {
      return (
        <div className="max-h-96 rounded-lg overflow-hidden bg-gray-50 border-2 border-dashed border-gray-300">
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <FileVideo className="w-16 h-16 text-purple-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Video Preview</h3>
            <p className="text-gray-600 mb-2">{file.name}</p>
            <p className="text-sm text-gray-500 mb-4">
              In a real implementation, this would show the actual video player.
            </p>
            <div className="bg-white border rounded-lg p-4 max-w-md">
              <h4 className="font-medium text-gray-900 mb-2">🎥 Video Details:</h4>
              <div className="text-left text-sm text-gray-700 space-y-1">
                <p><strong>Duration:</strong> ~5 minutes</p>
                <p><strong>Quality:</strong> HD (1080p)</p>
                <p><strong>Content:</strong> Student explanation</p>
                <p><strong>Format:</strong> MP4</p>
              </div>
            </div>
            <button
              onClick={handleDownload}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Video
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
        {getFileIcon(file.type)}
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900">{file.name}</div>
          <div className="text-xs text-gray-500">
            {file.type} • {(file.size / 1024 / 1024).toFixed(2)} MB
          </div>
        </div>
        <div className="flex gap-2">
          {canPreview(file.type) && (
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
          )}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{file.name}</h3>
                <p className="text-sm text-gray-500">
                  {file.type} • {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 overflow-auto max-h-[calc(90vh-120px)]">
              {renderPreview()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};