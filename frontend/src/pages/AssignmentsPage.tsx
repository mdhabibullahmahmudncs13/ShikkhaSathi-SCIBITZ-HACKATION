import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  Download,
  Eye,
  Plus
} from 'lucide-react';

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
  submission_status?: 'pending' | 'submitted' | 'graded';
  submission?: any;
}

const AssignmentsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { classId, className, subject } = location.state || {};
  
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [submissionFiles, setSubmissionFiles] = useState<File[]>([]);
  const [textResponse, setTextResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/v1/assignments/student');
      
      if (response.ok) {
        const data = await response.json();
        // Filter assignments for this class if classId is provided
        const filteredAssignments = classId 
          ? data.assignments.filter((a: Assignment) => a.class_id === classId)
          : data.assignments;
        setAssignments(filteredAssignments);
      }
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf', 'video/mp4'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    const validFiles = files.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        alert(`File type ${file.type} is not allowed. Please use PNG, JPG, JPEG, PDF, or MP4.`);
        return false;
      }
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    setSubmissionFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSubmissionFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitAssignment = async () => {
    if (!selectedAssignment) return;

    try {
      setSubmitting(true);
      
      // Simulate file upload (in real app, upload files first)
      const fileData = submissionFiles.map(file => ({
        name: file.name,
        type: file.type,
        size: file.size,
        url: `/uploads/assignments/${file.name}` // Mock URL
      }));

      const submissionData = {
        assignment_id: selectedAssignment.id,
        files: fileData,
        text_response: textResponse
      };

      const response = await fetch('http://localhost:8000/api/v1/assignments/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData)
      });

      if (response.ok) {
        alert('Assignment submitted successfully!');
        setShowSubmissionModal(false);
        setSelectedAssignment(null);
        setSubmissionFiles([]);
        setTextResponse('');
        fetchAssignments(); // Refresh assignments
      } else {
        throw new Error('Failed to submit assignment');
      }
    } catch (error) {
      alert('Failed to submit assignment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'text-green-600 bg-green-100';
      case 'graded': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted': return <CheckCircle className="w-4 h-4" />;
      case 'graded': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
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
          <p className="text-gray-600">Loading assignments...</p>
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
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Assignments</h1>
                {className && (
                  <p className="text-gray-600">{className} • {subject}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {assignments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
            <p className="text-gray-500">Your teacher hasn't assigned any work yet. Check back later!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{assignment.title}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.submission_status || 'pending')}`}>
                        {getStatusIcon(assignment.submission_status || 'pending')}
                        {assignment.submission_status === 'submitted' ? 'Submitted' : 
                         assignment.submission_status === 'graded' ? 'Graded' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{assignment.description}</p>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                        {isOverdue(assignment.due_date) && assignment.submission_status === 'pending' && (
                          <span className="text-red-600 font-medium ml-2">Overdue</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        <span>{assignment.max_points} points</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {assignment.submission_status === 'pending' && (
                      <button
                        onClick={() => {
                          setSelectedAssignment(assignment);
                          setShowSubmissionModal(true);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Submit
                      </button>
                    )}
                    
                    {assignment.submission && (
                      <button
                        onClick={() => {
                          // View submission details
                          alert('Viewing submission details...');
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Submission
                      </button>
                    )}
                  </div>
                </div>
                
                {assignment.instructions && (
                  <div className="bg-gray-50 rounded-lg p-4 mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Instructions:</h4>
                    <p className="text-gray-700 text-sm">{assignment.instructions}</p>
                  </div>
                )}
                
                {assignment.submission_status === 'graded' && assignment.submission && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-green-900">Grade: {assignment.submission.grade}/{assignment.max_points}</h4>
                      <span className="text-sm text-green-700">
                        Graded on {new Date(assignment.submission.graded_at).toLocaleDateString()}
                      </span>
                    </div>
                    {assignment.submission.feedback && (
                      <p className="text-green-800 text-sm">{assignment.submission.feedback}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submission Modal */}
      {showSubmissionModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Submit Assignment</h2>
              <button
                onClick={() => {
                  setShowSubmissionModal(false);
                  setSelectedAssignment(null);
                  setSubmissionFiles([]);
                  setTextResponse('');
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedAssignment.title}</h3>
                <p className="text-gray-600">{selectedAssignment.description}</p>
              </div>
              
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Files
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept=".png,.jpg,.jpeg,.pdf,.mp4"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG, JPEG, PDF, MP4 (max 10MB each)
                    </p>
                  </label>
                </div>
                
                {/* Selected Files */}
                {submissionFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Selected Files:</h4>
                    {submissionFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-900">{file.name}</span>
                          <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Text Response */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Written Response (Optional)
                </label>
                <textarea
                  value={textResponse}
                  onChange={(e) => setTextResponse(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Add any additional comments or explanations..."
                />
              </div>
              
              {/* Submit Button */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowSubmissionModal(false);
                    setSelectedAssignment(null);
                    setSubmissionFiles([]);
                    setTextResponse('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitAssignment}
                  disabled={submitting || (submissionFiles.length === 0 && !textResponse.trim())}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Submit Assignment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentsPage;