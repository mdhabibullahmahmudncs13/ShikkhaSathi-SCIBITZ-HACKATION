import React, { useState, useEffect } from 'react';
import {
  Shield,
  User,
  MessageSquare,
  FileText,
  Eye,
  EyeOff,
  Clock,
  Filter,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Info,
  Loader2
} from 'lucide-react';
import {
  ClassroomStudent,
  StudentPermissions as StudentPermissionsType
} from '../../types/teacher';

interface StudentPermissionsProps {
  student: ClassroomStudent;
  onPermissionsUpdated: (student: ClassroomStudent) => void;
  onClose: () => void;
}

interface PermissionSectionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const PermissionSection: React.FC<PermissionSectionProps> = ({
  title,
  description,
  icon,
  children
}) => (
  <div className="border border-gray-200 rounded-lg p-4">
    <div className="flex items-start space-x-3 mb-4">
      <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
        {icon}
      </div>
      <div>
        <h4 className="font-medium text-gray-900">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
    {children}
  </div>
);

interface PermissionToggleProps {
  label: string;
  description?: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

const PermissionToggle: React.FC<PermissionToggleProps> = ({
  label,
  description,
  enabled,
  onChange,
  disabled = false
}) => (
  <div className="flex items-center justify-between py-2">
    <div>
      <div className="font-medium text-gray-900">{label}</div>
      {description && (
        <div className="text-sm text-gray-600">{description}</div>
      )}
    </div>
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        disabled 
          ? 'bg-gray-200 cursor-not-allowed' 
          : enabled 
            ? 'bg-green-600' 
            : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

const StudentPermissions: React.FC<StudentPermissionsProps> = ({
  student,
  onPermissionsUpdated,
  onClose
}) => {
  const [permissions, setPermissions] = useState<StudentPermissionsType>(
    student.permissions || {
      can_access_chat: true,
      can_take_quizzes: true,
      can_view_leaderboard: true,
      content_restrictions: undefined,
      time_restrictions: undefined
    }
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track changes
  useEffect(() => {
    const originalPermissions = student.permissions || {
      can_access_chat: true,
      can_take_quizzes: true,
      can_view_leaderboard: true,
      content_restrictions: undefined,
      time_restrictions: undefined
    };
    
    setHasChanges(JSON.stringify(permissions) !== JSON.stringify(originalPermissions));
  }, [permissions, student.permissions]);

  // Update permissions
  const updatePermissions = (updates: Partial<StudentPermissionsType>) => {
    setPermissions(prev => ({ ...prev, ...updates }));
  };

  // Save permissions
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Create updated student object
      const updatedStudent: ClassroomStudent = {
        ...student,
        permissions
      };

      // Call the parent callback to update the student
      onPermissionsUpdated(updatedStudent);
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save permissions');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    const defaultPermissions: StudentPermissionsType = {
      can_access_chat: true,
      can_take_quizzes: true,
      can_view_leaderboard: true,
      content_restrictions: undefined,
      time_restrictions: undefined
    };
    setPermissions(defaultPermissions);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Student Permissions</h3>
                <p className="text-sm text-gray-600">{student.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
                <span className="text-red-800 text-sm">{error}</span>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Basic Permissions */}
            <PermissionSection
              title="Basic Access"
              description="Core platform features and functionality"
              icon={<User className="w-4 h-4" />}
            >
              <div className="space-y-2">
                <PermissionToggle
                  label="AI Tutor Chat"
                  description="Access to AI-powered tutoring conversations"
                  enabled={permissions.can_access_chat}
                  onChange={(enabled) => updatePermissions({ can_access_chat: enabled })}
                />
                <PermissionToggle
                  label="Quizzes & Assessments"
                  description="Take quizzes and complete assessments"
                  enabled={permissions.can_take_quizzes}
                  onChange={(enabled) => updatePermissions({ can_take_quizzes: enabled })}
                />
                <PermissionToggle
                  label="Leaderboard"
                  description="View class rankings and achievements"
                  enabled={permissions.can_view_leaderboard}
                  onChange={(enabled) => updatePermissions({ can_view_leaderboard: enabled })}
                />
              </div>
            </PermissionSection>

            {/* Content Restrictions */}
            <PermissionSection
              title="Content Restrictions"
              description="Limit access to specific content types"
              icon={<Filter className="w-4 h-4" />}
            >
              <div className="space-y-2">
                {['inappropriate', 'violence', 'adult_content', 'external_links'].map((restriction) => (
                  <PermissionToggle
                    key={restriction}
                    label={restriction.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    enabled={permissions.content_restrictions?.includes(restriction) || false}
                    onChange={(enabled) => {
                      const current = permissions.content_restrictions || [];
                      const updated = enabled
                        ? [...current, restriction]
                        : current.filter(r => r !== restriction);
                      updatePermissions({ 
                        content_restrictions: updated.length > 0 ? updated : undefined 
                      });
                    }}
                  />
                ))}
              </div>
            </PermissionSection>

            {/* Time Restrictions */}
            <PermissionSection
              title="Time Restrictions"
              description="Control when the student can access the platform"
              icon={<Clock className="w-4 h-4" />}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={permissions.time_restrictions?.startTime || ''}
                      onChange={(e) => updatePermissions({
                        time_restrictions: {
                          ...permissions.time_restrictions,
                          startTime: e.target.value,
                          endTime: permissions.time_restrictions?.endTime || '23:59',
                          allowedDays: permissions.time_restrictions?.allowedDays || [1,2,3,4,5,6,7]
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={permissions.time_restrictions?.endTime || ''}
                      onChange={(e) => updatePermissions({
                        time_restrictions: {
                          ...permissions.time_restrictions,
                          startTime: permissions.time_restrictions?.startTime || '00:00',
                          endTime: e.target.value,
                          allowedDays: permissions.time_restrictions?.allowedDays || [1,2,3,4,5,6,7]
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allowed Days
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 1, label: 'Mon' },
                      { value: 2, label: 'Tue' },
                      { value: 3, label: 'Wed' },
                      { value: 4, label: 'Thu' },
                      { value: 5, label: 'Fri' },
                      { value: 6, label: 'Sat' },
                      { value: 7, label: 'Sun' }
                    ].map((day) => {
                      const isSelected = permissions.time_restrictions?.allowedDays?.includes(day.value) || false;
                      return (
                        <button
                          key={day.value}
                          onClick={() => {
                            const current = permissions.time_restrictions?.allowedDays || [1,2,3,4,5,6,7];
                            const updated = isSelected
                              ? current.filter(d => d !== day.value)
                              : [...current, day.value];
                            updatePermissions({
                              time_restrictions: {
                                ...permissions.time_restrictions,
                                startTime: permissions.time_restrictions?.startTime || '00:00',
                                endTime: permissions.time_restrictions?.endTime || '23:59',
                                allowedDays: updated
                              }
                            });
                          }}
                          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Clear all time restrictions</span>
                  <button
                    onClick={() => updatePermissions({ time_restrictions: undefined })}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </PermissionSection>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {hasChanges && (
                <div className="flex items-center text-sm text-yellow-600">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Unsaved changes
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Reset to Defaults
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentPermissions;