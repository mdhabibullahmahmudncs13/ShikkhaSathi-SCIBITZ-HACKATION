import React, { useState, useEffect } from 'react';
import { X, UserPlus, Upload, Mail, Search } from 'lucide-react';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  className: string;
  onStudentAdded: () => void;
}

interface Student {
  id: string;
  name: string;
  email: string;
  grade: number;
  medium: string;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  classId,
  className,
  onStudentAdded
}) => {
  const [activeTab, setActiveTab] = useState<'individual' | 'bulk' | 'search'>('individual');
  const [isLoading, setIsLoading] = useState(false);
  
  // Individual student form
  const [studentForm, setStudentForm] = useState({
    name: '',
    email: '',
    studentId: '',
    grade: '',
    parentEmail: '',
    parentPhone: '',
    notes: ''
  });
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Bulk upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  if (!isOpen) return null;

  const handleIndividualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/v1/classroom/classes/${classId}/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          name: studentForm.name,
          email: studentForm.email,
          student_id: studentForm.studentId || null,
          grade: parseInt(studentForm.grade),
          parent_email: studentForm.parentEmail || null,
          parent_phone: studentForm.parentPhone || null,
          notes: studentForm.notes || null
        })
      });
      
      if (response.ok) {
        alert('Student added successfully!');
        setStudentForm({
          name: '', email: '', studentId: '', grade: '',
          parentEmail: '', parentPhone: '', notes: ''
        });
        onStudentAdded();
        onClose();
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail || 'Failed to add student'}`);
      }
    } catch (error) {
      console.error('Error adding student:', error);
      alert('Failed to add student. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    
    setIsSearching(true);
    try {
      // TODO: Replace with actual API call to search students
      const response = await fetch(`/api/v1/users/search?q=${encodeURIComponent(searchQuery)}&role=student`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleEnrollExistingStudent = async (studentId: string) => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/v1/classroom/classes/${classId}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          student_id: studentId
        })
      });
      
      if (response.ok) {
        alert('Student enrolled successfully!');
        onStudentAdded();
        onClose();
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail || 'Failed to enroll student'}`);
      }
    } catch (error) {
      console.error('Error enrolling student:', error);
      alert('Failed to enroll student. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!csvFile) return;
    
    setIsLoading(true);
    setUploadProgress(0);
    
    const formData = new FormData();
    formData.append('file', csvFile);
    
    try {
      const response = await fetch(`/api/v1/classroom/classes/${classId}/bulk-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Bulk upload completed! Added: ${result.successful}, Failed: ${result.failed}`);
        setCsvFile(null);
        onStudentAdded();
        onClose();
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail || 'Bulk upload failed'}`);
      }
    } catch (error) {
      console.error('Bulk upload error:', error);
      alert('Bulk upload failed. Please try again.');
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `name,email,student_id,grade,parent_email,parent_phone,notes
John Doe,john@example.com,STU001,9,parent@example.com,+1234567890,Good student
Jane Smith,jane@example.com,STU002,9,jane.parent@example.com,+1234567891,Needs extra help`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Add Students</h2>
            <p className="text-sm text-gray-600">Class: {className}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('individual')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'individual'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <UserPlus className="w-4 h-4 inline mr-2" />
              Add Individual
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'search'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Search className="w-4 h-4 inline mr-2" />
              Enroll Existing
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'bulk'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Upload className="w-4 h-4 inline mr-2" />
              Bulk Upload
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'individual' && (
            <form onSubmit={handleIndividualSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Student Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={studentForm.name}
                    onChange={(e) => setStudentForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={studentForm.email}
                    onChange={(e) => setStudentForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Student ID
                  </label>
                  <input
                    type="text"
                    value={studentForm.studentId}
                    onChange={(e) => setStudentForm(prev => ({ ...prev, studentId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grade *
                  </label>
                  <select
                    required
                    value={studentForm.grade}
                    onChange={(e) => setStudentForm(prev => ({ ...prev, grade: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Grade</option>
                    {[6, 7, 8, 9, 10, 11, 12].map(grade => (
                      <option key={grade} value={grade}>Grade {grade}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Email
                  </label>
                  <input
                    type="email"
                    value={studentForm.parentEmail}
                    onChange={(e) => setStudentForm(prev => ({ ...prev, parentEmail: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Phone
                  </label>
                  <input
                    type="tel"
                    value={studentForm.parentPhone}
                    onChange={(e) => setStudentForm(prev => ({ ...prev, parentPhone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={studentForm.notes}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any additional notes about the student..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <UserPlus className="w-4 h-4 mr-2" />
                  )}
                  Add Student
                </button>
              </div>
            </form>
          )}

          {activeTab === 'search' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Enroll Existing Students</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Search for students who already have accounts and enroll them in your class.
                </p>
              </div>

              <div className="flex space-x-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search by name or email..."
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching || searchQuery.length < 2}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSearching ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="border rounded-md">
                  <div className="p-3 bg-gray-50 border-b">
                    <h4 className="font-medium text-gray-900">Search Results</h4>
                  </div>
                  <div className="divide-y">
                    {searchResults.map((student) => (
                      <div key={student.id} className="p-4 flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-gray-900">{student.name}</h5>
                          <p className="text-sm text-gray-600">{student.email}</p>
                          <p className="text-sm text-gray-500">
                            Grade {student.grade} • {student.medium} Medium
                          </p>
                        </div>
                        <button
                          onClick={() => handleEnrollExistingStudent(student.id)}
                          disabled={isLoading}
                          className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center text-sm"
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Enroll
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'bulk' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Bulk Upload Students</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Upload a CSV file with student information to add multiple students at once.
                </p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="csv-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        {csvFile ? csvFile.name : 'Choose CSV file or drag and drop'}
                      </span>
                      <input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                      />
                    </label>
                    <p className="mt-1 text-xs text-gray-500">CSV up to 10MB</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={downloadTemplate}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Download CSV Template
                </button>
                
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkUpload}
                    disabled={!csvFile || isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Upload Students
                  </button>
                </div>
              </div>

              {uploadProgress > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};