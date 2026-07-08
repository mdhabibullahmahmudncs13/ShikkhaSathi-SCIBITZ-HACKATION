import React, { useState, useCallback } from 'react';
import { StudentRoster } from './StudentRoster';
import { useStudentRoster } from '../../hooks/useStudentRoster';
import { StudentSummary } from '../../types/teacher';

interface StudentRosterContainerProps {
  classId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onStudentSelect?: (studentId: string) => void;
  onStudentAction?: (studentId: string, action: string) => void;
}

export const StudentRosterContainer: React.FC<StudentRosterContainerProps> = ({
  classId,
  autoRefresh = true,
  refreshInterval = 30000,
  onStudentSelect,
  onStudentAction
}) => {
  const {
    students,
    classInfo,
    loading,
    error,
    refreshRoster,
    totalStudents,
    atRiskCount,
    averagePerformance,
    engagementRate
  } = useStudentRoster({
    classId,
    autoRefresh,
    refreshInterval
  });

  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const handleStudentSelect = useCallback((studentId: string) => {
    setSelectedStudent(studentId);
    if (onStudentSelect) {
      onStudentSelect(studentId);
    }
  }, [onStudentSelect]);

  const handleStudentAction = useCallback((studentId: string, action: string) => {
    // Handle various student actions
    switch (action) {
      case 'view_details':
        console.log(`Viewing details for student ${studentId}`);
        break;
      case 'send_message':
        console.log(`Sending message to student ${studentId}`);
        break;
      case 'assign_intervention':
        console.log(`Assigning intervention to student ${studentId}`);
        break;
      case 'contact_parent':
        console.log(`Contacting parent of student ${studentId}`);
        break;
      default:
        console.log(`Unknown action ${action} for student ${studentId}`);
    }

    if (onStudentAction) {
      onStudentAction(studentId, action);
    }
  }, [onStudentAction]);

  if (loading && students.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="text-center">
          <div className="text-red-500 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load student roster</h3>
          <p className="text-gray-500 mb-4">{error.message}</p>
          <button
            onClick={refreshRoster}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-gray-900">{totalStudents}</div>
          <div className="text-sm text-gray-500">Total Students</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-green-600">{averagePerformance}%</div>
          <div className="text-sm text-gray-500">Avg Performance</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-blue-600">{engagementRate}%</div>
          <div className="text-sm text-gray-500">Engagement Rate</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-red-600">{atRiskCount}</div>
          <div className="text-sm text-gray-500">At Risk Students</div>
        </div>
      </div>

      {/* Student Roster */}
      <StudentRoster
        students={students}
        classId={classId || classInfo?.id || ''}
        onStudentSelect={handleStudentSelect}
        onStudentAction={handleStudentAction}
        onRefresh={refreshRoster}
        autoRefreshInterval={refreshInterval}
      />
    </div>
  );
};

export default StudentRosterContainer;