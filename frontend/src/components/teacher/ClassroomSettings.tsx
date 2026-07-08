import React, { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  Shield,
  Clock,
  BookOpen,
  Filter,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Info,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  MessageSquare,
  Bell,
  FileText,
  Loader2
} from 'lucide-react';
import { useClassroomSettings } from '../../hooks/useClassroomSettings';
import {
  ClassroomSettings as ClassroomSettingsType,
  StudentPermissions,
  AssessmentSettings,
  CommunicationSettings
} from '../../types/teacher';

interface ClassroomSettingsProps {
  classId: string;
  onSettingsUpdated?: (settings: ClassroomSettingsType) => void;
}

interface PermissionToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  icon: React.ReactNode;
}

const PermissionToggle: React.FC<PermissionToggleProps> = ({
  label,
  description,
  enabled,
  onChange,
  icon
}) => (
  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
    <div className="flex items-start space-x-3">
      <div className={`p-2 rounded-lg ${enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
        {icon}
      </div>
      <div>
        <h4 className="font-medium text-gray-900">{label}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-green-600' : 'bg-gray-200'
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

const ClassroomSettings: React.FC<ClassroomSettingsProps> = ({
  classId,
  onSettingsUpdated
}) => {
  const {
    settings,
    isLoading,
    error,
    updateSettings,
    resetToDefaults
  } = useClassroomSettings(classId);

  const [localSettings, setLocalSettings] = useState<ClassroomSettingsType | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'permissions' | 'assessments' | 'communication'>('general');

  // Initialize local settings when settings are loaded
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
      setHasChanges(false);
    }
  }, [settings]);

  // Update local settings and track changes
  const updateLocalSettings = (updates: Partial<ClassroomSettingsType>) => {
    if (!localSettings) return;
    
    const newSettings = { ...localSettings, ...updates };
    setLocalSettings(newSettings);
    setHasChanges(true);
  };

  // Update default permissions
  const updateDefaultPermissions = (updates: Partial<StudentPermissions>) => {
    if (!localSettings) return;
    
    updateLocalSettings({
      default_permissions: {
        ...localSettings.default_permissions,
        ...updates
      }
    });
  };

  // Update assessment settings
  const updateAssessmentSettings = (updates: Partial<AssessmentSettings>) => {
    if (!localSettings) return;
    
    updateLocalSettings({
      assessment_settings: {
        ...localSettings.assessment_settings,
        ...updates
      }
    });
  };

  // Update communication settings
  const updateCommunicationSettings = (updates: Partial<CommunicationSettings>) => {
    if (!localSettings) return;
    
    updateLocalSettings({
      communication_settings: {
        ...localSettings.communication_settings,
        ...updates
      }
    });
  };

  // Save settings
  const handleSave = async () => {
    if (!localSettings || !hasChanges) return;

    setIsSaving(true);
    try {
      const updatedSettings = await updateSettings(localSettings);
      setHasChanges(false);
      onSettingsUpdated?.(updatedSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      try {
        const defaultSettings = await resetToDefaults();
        setLocalSettings(defaultSettings);
        setHasChanges(false);
        onSettingsUpdated?.(defaultSettings);
      } catch (error) {
        console.error('Failed to reset settings:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading settings...</span>
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

  if (!localSettings) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center">
          <Info className="w-5 h-5 text-gray-600 mr-2" />
          <span className="text-gray-800">No settings found</span>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'permissions', label: 'Permissions', icon: Shield },
    { id: 'assessments', label: 'Assessments', icon: FileText },
    { id: 'communication', label: 'Communication', icon: MessageSquare }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Settings className="w-6 h-6 mr-2 text-blue-600" />
            Classroom Settings
          </h2>
          <p className="text-gray-600">
            Configure permissions, restrictions, and classroom behavior
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleReset}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {/* Changes indicator */}
      {hasChanges && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
            <span className="text-yellow-800 text-sm">You have unsaved changes</span>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">General Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Self Enrollment
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => updateLocalSettings({ allow_self_enrollment: !localSettings.allow_self_enrollment })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      localSettings.allow_self_enrollment ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localSettings.allow_self_enrollment ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-600">
                    Allow students to join this class without approval
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Require Approval
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => updateLocalSettings({ require_approval: !localSettings.require_approval })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      localSettings.require_approval ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localSettings.require_approval ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-600">
                    Require teacher approval for new enrollments
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Students
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={localSettings.max_students || ''}
                  onChange={(e) => updateLocalSettings({ 
                    max_students: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="No limit"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for no limit
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content Filters
                </label>
                <div className="space-y-2">
                  {['inappropriate', 'violence', 'adult_content', 'external_links'].map((filter) => (
                    <label key={filter} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={localSettings.content_filters.includes(filter)}
                        onChange={(e) => {
                          const filters = e.target.checked
                            ? [...localSettings.content_filters, filter]
                            : localSettings.content_filters.filter(f => f !== filter);
                          updateLocalSettings({ content_filters: filters });
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">
                        {filter.replace('_', ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'permissions' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Default Student Permissions</h3>
            <p className="text-sm text-gray-600">
              These permissions will be applied to all new students by default. You can override them for individual students.
            </p>
            
            <div className="space-y-4">
              <PermissionToggle
                label="AI Tutor Chat Access"
                description="Allow students to interact with the AI tutor"
                enabled={localSettings.default_permissions.can_access_chat}
                onChange={(enabled) => updateDefaultPermissions({ can_access_chat: enabled })}
                icon={<MessageSquare className="w-4 h-4" />}
              />

              <PermissionToggle
                label="Quiz Access"
                description="Allow students to take quizzes and assessments"
                enabled={localSettings.default_permissions.can_take_quizzes}
                onChange={(enabled) => updateDefaultPermissions({ can_take_quizzes: enabled })}
                icon={<FileText className="w-4 h-4" />}
              />

              <PermissionToggle
                label="Leaderboard Visibility"
                description="Show student rankings and leaderboards"
                enabled={localSettings.default_permissions.can_view_leaderboard}
                onChange={(enabled) => updateDefaultPermissions({ can_view_leaderboard: enabled })}
                icon={<Eye className="w-4 h-4" />}
              />
            </div>

            <div className="border-t pt-6">
              <h4 className="font-medium text-gray-900 mb-4">Time Restrictions</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={localSettings.default_permissions.time_restrictions?.startTime || ''}
                    onChange={(e) => updateDefaultPermissions({
                      time_restrictions: {
                        ...localSettings.default_permissions.time_restrictions,
                        startTime: e.target.value,
                        endTime: localSettings.default_permissions.time_restrictions?.endTime || '23:59',
                        allowedDays: localSettings.default_permissions.time_restrictions?.allowedDays || [1,2,3,4,5,6,7]
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
                    value={localSettings.default_permissions.time_restrictions?.endTime || ''}
                    onChange={(e) => updateDefaultPermissions({
                      time_restrictions: {
                        ...localSettings.default_permissions.time_restrictions,
                        startTime: localSettings.default_permissions.time_restrictions?.startTime || '00:00',
                        endTime: e.target.value,
                        allowedDays: localSettings.default_permissions.time_restrictions?.allowedDays || [1,2,3,4,5,6,7]
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assessments' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Assessment Settings</h3>
            
            <div className="space-y-4">
              <PermissionToggle
                label="Allow Retakes"
                description="Students can retake assessments multiple times"
                enabled={localSettings.assessment_settings.allow_retakes}
                onChange={(enabled) => updateAssessmentSettings({ allow_retakes: enabled })}
                icon={<RotateCcw className="w-4 h-4" />}
              />

              <PermissionToggle
                label="Show Correct Answers"
                description="Display correct answers after assessment completion"
                enabled={localSettings.assessment_settings.show_correct_answers}
                onChange={(enabled) => updateAssessmentSettings({ show_correct_answers: enabled })}
                icon={<CheckCircle className="w-4 h-4" />}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Attempts
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={localSettings.assessment_settings.max_attempts || ''}
                  onChange={(e) => updateAssessmentSettings({ 
                    max_attempts: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Unlimited"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for unlimited attempts
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Time Limit (minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={localSettings.assessment_settings.time_limit || ''}
                  onChange={(e) => updateAssessmentSettings({ 
                    time_limit: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="No time limit"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for no time limit
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'communication' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Communication Settings</h3>
            
            <div className="space-y-4">
              <PermissionToggle
                label="Student Messages"
                description="Allow students to send messages to teacher"
                enabled={localSettings.communication_settings.allow_student_messages}
                onChange={(enabled) => updateCommunicationSettings({ allow_student_messages: enabled })}
                icon={<MessageSquare className="w-4 h-4" />}
              />

              <PermissionToggle
                label="Parent Notifications"
                description="Send notifications to parents about student progress"
                enabled={localSettings.communication_settings.allow_parent_notifications}
                onChange={(enabled) => updateCommunicationSettings({ allow_parent_notifications: enabled })}
                icon={<Bell className="w-4 h-4" />}
              />

              <PermissionToggle
                label="Automatic Progress Reports"
                description="Generate and send weekly progress reports automatically"
                enabled={localSettings.communication_settings.auto_progress_reports}
                onChange={(enabled) => updateCommunicationSettings({ auto_progress_reports: enabled })}
                icon={<FileText className="w-4 h-4" />}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassroomSettings;