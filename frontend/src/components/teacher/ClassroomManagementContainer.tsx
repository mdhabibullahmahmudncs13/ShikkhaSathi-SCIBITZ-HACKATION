import React, { useState } from 'react';
import {
  Users,
  Settings,
  Shield,
  FileText,
  MessageSquare,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import ClassroomManagement from './ClassroomManagement';
import ClassroomSettings from './ClassroomSettings';
import StudentPermissions from './StudentPermissions';
import {
  ClassroomStudent,
  ClassroomSettings as ClassroomSettingsType
} from '../../types/teacher';

interface ClassroomManagementContainerProps {
  classId: string;
  className?: string;
}

type ActiveView = 'roster' | 'settings';

const ClassroomManagementContainer: React.FC<ClassroomManagementContainerProps> = ({
  classId,
  className = ''
}) => {
  const [activeView, setActiveView] = useState<ActiveView>('roster');
  const [selectedStudent, setSelectedStudent] = useState<ClassroomStudent | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  // Handle student selection for permissions editing
  const handleStudentPermissionsEdit = (student: ClassroomStudent) => {
    setSelectedStudent(student);
    setShowPermissionsModal(true);
  };

  // Handle permissions update
  const handlePermissionsUpdated = (updatedStudent: ClassroomStudent) => {
    // This would typically trigger a refresh of the student data
    // For now, we'll just close the modal
    setShowPermissionsModal(false);
    setSelectedStudent(null);
  };

  // Handle settings update
  const handleSettingsUpdated = (settings: ClassroomSettingsType) => {
    // This would typically trigger a refresh of related data
    console.log('Settings updated:', settings);
  };

  const views = [
    {
      id: 'roster' as const,
      label: 'Student Roster',
      icon: Users,
      description: 'Manage students and their information'
    },
    {
      id: 'settings' as const,
      label: 'Classroom Settings',
      icon: Settings,
      description: 'Configure permissions and restrictions'
    }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Navigation Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Classroom Management</h1>
            <p className="text-gray-600">
              Manage your students, permissions, and classroom settings
            </p>
          </div>
        </div>

        {/* View Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {views.map((view) => {
            const Icon = view.icon;
            return (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`flex-1 flex items-center justify-center px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                  activeView === view.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {view.label}
              </button>
            );
          })}
        </div>

        {/* View Description */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            {views.find(v => v.id === activeView)?.description}
          </p>
        </div>
      </div>

      {/* View Content */}
      <div className="min-h-[600px]">
        {activeView === 'roster' && (
          <ClassroomManagement
            classId={classId}
            onStudentUpdated={(student) => {
              // Handle student updates
              console.log('Student updated:', student);
            }}
            onBulkOperationComplete={(operation, results) => {
              // Handle bulk operation completion
              console.log('Bulk operation completed:', operation, results);
            }}
          />
        )}

        {activeView === 'settings' && (
          <ClassroomSettings
            classId={classId}
            onSettingsUpdated={handleSettingsUpdated}
          />
        )}
      </div>

      {/* Student Permissions Modal */}
      {showPermissionsModal && selectedStudent && (
        <StudentPermissions
          student={selectedStudent}
          onPermissionsUpdated={handlePermissionsUpdated}
          onClose={() => {
            setShowPermissionsModal(false);
            setSelectedStudent(null);
          }}
        />
      )}

      {/* Quick Actions Sidebar */}
      <div className="fixed right-6 top-1/2 transform -translate-y-1/2 space-y-2">
        <div className="bg-white rounded-lg shadow-lg p-2">
          <button
            onClick={() => setActiveView(activeView === 'roster' ? 'settings' : 'roster')}
            className="p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title={`Switch to ${activeView === 'roster' ? 'Settings' : 'Roster'}`}
          >
            {activeView === 'roster' ? (
              <Settings className="w-5 h-5" />
            ) : (
              <Users className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="fixed top-20 left-6 bg-white rounded-lg shadow-sm px-4 py-2">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>Classroom Management</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-blue-600 font-medium">
            {views.find(v => v.id === activeView)?.label}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ClassroomManagementContainer;