import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  UserMinus,
  Edit3,
  Search,
  Filter,
  Mail,
  BookOpen,
  Download,
  Upload,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useClassroomManagement } from '../../hooks/useClassroomManagement';
import {
  ClassroomStudent,
  BulkOperation,
  StudentFilter,
  StudentImportResult
} from '../../types/teacher';

interface ClassroomManagementProps {
  classId: string;
  onStudentUpdated?: (student: ClassroomStudent) => void;
  onBulkOperationComplete?: (operation: BulkOperation, results: any) => void;
}

interface BulkActionState {
  isOpen: boolean;
  selectedStudents: string[];
  operation: BulkOperation | null;
  isProcessing: boolean;
}

interface ImportState {
  isOpen: boolean;
  file: File | null;
  isProcessing: boolean;
  results: StudentImportResult | null;
  error: string | null;
}

const ClassroomManagement: React.FC<ClassroomManagementProps> = ({
  classId,
  onStudentUpdated,
  onBulkOperationComplete
}) => {
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<StudentFilter>('all');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [bulkActionState, setBulkActionState] = useState<BulkActionState>({
    isOpen: false,
    selectedStudents: [],
    operation: null,
    isProcessing: false
  });
  const [importState, setImportState] = useState<ImportState>({
    isOpen: false,
    file: null,
    isProcessing: false,
    results: null,
    error: null
  });

  // Hooks
  const {
    students,
    isLoading,
    error,
    updateStudent,
    removeStudent,
    bulkUpdateStudents,
    importStudents,
    exportStudents
  } = useClassroomManagement(classId);

  // Filter students based on search and filter criteria
  const filteredStudents = students.filter((student: ClassroomStudent) => {
    // Search filter
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.studentId?.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    let matchesFilter = true;
    switch (selectedFilter) {
      case 'active':
        matchesFilter = student.isActive;
        break;
      case 'inactive':
        matchesFilter = !student.isActive;
        break;
      case 'at_risk':
        matchesFilter = student.isAtRisk;
        break;
      case 'high_performer':
        matchesFilter = student.isHighPerformer;
        break;
      case 'all':
      default:
        matchesFilter = true;
        break;
    }

    // Show inactive filter
    const matchesVisibility = showInactive || student.isActive;

    return matchesSearch && matchesFilter && matchesVisibility;
  });

  // Handle student selection
  const handleStudentSelect = (studentId: string, selected: boolean) => {
    if (selected) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  // Handle select all
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedStudents(filteredStudents.map((s: ClassroomStudent) => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  // Handle bulk operations
  const handleBulkOperation = async (operation: BulkOperation) => {
    setBulkActionState({
      isOpen: true,
      selectedStudents,
      operation,
      isProcessing: false
    });
  };

  const executeBulkOperation = async () => {
    if (!bulkActionState.operation) return;

    setBulkActionState(prev => ({ ...prev, isProcessing: true }));

    try {
      const results = await bulkUpdateStudents(
        bulkActionState.selectedStudents,
        bulkActionState.operation
      );

      onBulkOperationComplete?.(bulkActionState.operation, results);
      setSelectedStudents([]);
      setBulkActionState({
        isOpen: false,
        selectedStudents: [],
        operation: null,
        isProcessing: false
      });
    } catch (error) {
      console.error('Bulk operation failed:', error);
    } finally {
      setBulkActionState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  // Handle student import
  const handleFileImport = async () => {
    if (!importState.file) return;

    setImportState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      const results = await importStudents(importState.file);
      setImportState(prev => ({
        ...prev,
        isProcessing: false,
        results
      }));
    } catch (error) {
      setImportState(prev => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Import failed'
      }));
    }
  };

  // Handle student export
  const handleExport = async () => {
    try {
      await exportStudents(selectedStudents.length > 0 ? selectedStudents : undefined);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Handle student editing
  const handleEditStudent = (student: ClassroomStudent) => {
    // TODO: Open edit modal or navigate to edit page
    console.log('Edit student:', student);
  };

  // Handle student removal
  const handleRemoveStudent = async (studentId: string) => {
    if (window.confirm('Are you sure you want to remove this student from the class?')) {
      try {
        await removeStudent(studentId);
      } catch (error) {
        console.error('Failed to remove student:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading classroom...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Users className="w-6 h-6 mr-2 text-blue-600" />
            Classroom Management
          </h2>
          <p className="text-gray-600">
            Manage students, permissions, and classroom settings
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setImportState(prev => ({ ...prev, isOpen: true }))}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </button>
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button
            onClick={() => {/* Open add student modal */}}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Student
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Filter className="w-4 h-4 text-gray-400 mr-2" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value as StudentFilter)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Students</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="at_risk">At Risk</option>
                <option value="high_performer">High Performers</option>
              </select>
            </div>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Show inactive</span>
            </label>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedStudents.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">
                {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleBulkOperation('activate')}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Activate
                </button>
                <button
                  onClick={() => handleBulkOperation('deactivate')}
                  className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
                >
                  Deactivate
                </button>
                <button
                  onClick={() => handleBulkOperation('remove')}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Student List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Students ({filteredStudents.length})
            </h3>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Select all</span>
            </label>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredStudents.map((student: ClassroomStudent) => (
            <div key={student.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.id)}
                    onChange={(e) => handleStudentSelect(student.id, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {student.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {student.name}
                      </p>
                      {!student.isActive && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <EyeOff className="w-3 h-3 mr-1" />
                          Inactive
                        </span>
                      )}
                      {student.isAtRisk && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          At Risk
                        </span>
                      )}
                      {student.isHighPerformer && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          High Performer
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <p className="text-sm text-gray-500 flex items-center">
                        <Mail className="w-3 h-3 mr-1" />
                        {student.email}
                      </p>
                      {student.studentId && (
                        <p className="text-sm text-gray-500">
                          ID: {student.studentId}
                        </p>
                      )}
                      {student.grade && (
                        <p className="text-sm text-gray-500 flex items-center">
                          <BookOpen className="w-3 h-3 mr-1" />
                          Grade {student.grade}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="text-right text-sm">
                    <p className="text-gray-900">
                      {student.totalXP || 0} XP
                    </p>
                    <p className="text-gray-500">
                      Level {student.level || 1}
                    </p>
                  </div>
                  
                  <div className="relative">
                    <button
                      onClick={() => handleEditStudent(student)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="relative">
                    <button
                      onClick={() => handleRemoveStudent(student.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredStudents.length === 0 && (
          <div className="px-6 py-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm || selectedFilter !== 'all' 
                ? 'No students match your search criteria'
                : 'No students in this classroom yet'
              }
            </p>
            {!searchTerm && selectedFilter === 'all' && (
              <button
                onClick={() => {/* Open add student modal */}}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Add your first student
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bulk Action Modal */}
      {bulkActionState.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirm Bulk Action
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to {bulkActionState.operation} {bulkActionState.selectedStudents.length} student{bulkActionState.selectedStudents.length !== 1 ? 's' : ''}?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setBulkActionState(prev => ({ ...prev, isOpen: false }))}
                disabled={bulkActionState.isProcessing}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={executeBulkOperation}
                disabled={bulkActionState.isProcessing}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {bulkActionState.isProcessing && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importState.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Import Students
            </h3>
            
            {!importState.results ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select CSV file
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setImportState(prev => ({ 
                      ...prev, 
                      file: e.target.files?.[0] || null 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    CSV should include: name, email, student_id (optional), grade (optional)
                  </p>
                </div>

                {importState.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">{importState.error}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setImportState({
                      isOpen: false,
                      file: null,
                      isProcessing: false,
                      results: null,
                      error: null
                    })}
                    disabled={importState.isProcessing}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFileImport}
                    disabled={!importState.file || importState.isProcessing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                  >
                    {importState.isProcessing && (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    )}
                    Import
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <h4 className="font-medium text-green-800 mb-2">Import Results</h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>✅ {importState.results.successful} students imported successfully</p>
                    {importState.results.failed > 0 && (
                      <p>❌ {importState.results.failed} students failed to import</p>
                    )}
                    {importState.results.duplicates > 0 && (
                      <p>⚠️ {importState.results.duplicates} duplicates skipped</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setImportState({
                    isOpen: false,
                    file: null,
                    isProcessing: false,
                    results: null,
                    error: null
                  })}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassroomManagement;