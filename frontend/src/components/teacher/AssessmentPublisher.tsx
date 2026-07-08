import React, { useState, useCallback, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Send,
  Eye,
  AlertTriangle,
  CheckCircle,
  X,
  Settings,
  Bell,
  FileText,
  Target,
  BookOpen,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  Info
} from 'lucide-react';
import { CustomAssessment, ClassOverview, StudentSummary } from '../../types/teacher';

interface AssessmentPublisherProps {
  assessment: CustomAssessment;
  onPublish: (publishData: PublishData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface PublishData {
  assessmentId: string;
  assignedClasses: string[];
  assignedStudents: string[];
  scheduledDate?: Date;
  dueDate?: Date;
  availabilityWindow: {
    startTime?: string;
    endTime?: string;
    allowedDays: string[];
  };
  settings: {
    allowRetakes: boolean;
    maxAttempts: number;
    showResultsImmediately: boolean;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    requireProctoring: boolean;
    allowPause: boolean;
    showProgressBar: boolean;
  };
  notifications: {
    notifyStudents: boolean;
    notifyParents: boolean;
    reminderSchedule: string[];
    customMessage?: string;
  };
}

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
}

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' }
];

const REMINDER_OPTIONS = [
  { value: '1_day', label: '1 day before' },
  { value: '3_days', label: '3 days before' },
  { value: '1_week', label: '1 week before' },
  { value: '2_hours', label: '2 hours before' },
  { value: 'at_start', label: 'At start time' }
];

export const AssessmentPublisher: React.FC<AssessmentPublisherProps> = ({
  assessment,
  onPublish,
  onCancel,
  isLoading = false
}) => {
  // State for publish data
  const [publishData, setPublishData] = useState<PublishData>({
    assessmentId: assessment.id || '',
    assignedClasses: [],
    assignedStudents: [],
    scheduledDate: undefined,
    dueDate: undefined,
    availabilityWindow: {
      allowedDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    },
    settings: {
      allowRetakes: false,
      maxAttempts: 1,
      showResultsImmediately: true,
      shuffleQuestions: false,
      shuffleOptions: true,
      requireProctoring: false,
      allowPause: true,
      showProgressBar: true
    },
    notifications: {
      notifyStudents: true,
      notifyParents: true,
      reminderSchedule: ['1_day'],
      customMessage: ''
    }
  });

  // UI state
  const [activeTab, setActiveTab] = useState<'assignment' | 'schedule' | 'settings' | 'notifications' | 'review'>('assignment');
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    classes: true,
    students: false,
    availability: false
  });

  // Mock data for classes and students
  const [availableClasses] = useState<ClassOverview[]>([
    {
      id: 'class-1',
      name: 'Grade 8A Mathematics',
      grade: 8,
      subject: 'Mathematics',
      studentCount: 25,
      averagePerformance: 78,
      engagementRate: 85,
      lastActivity: new Date(),
      students: []
    },
    {
      id: 'class-2',
      name: 'Grade 8B Mathematics',
      grade: 8,
      subject: 'Mathematics',
      studentCount: 23,
      averagePerformance: 82,
      engagementRate: 90,
      lastActivity: new Date(),
      students: []
    }
  ]);

  const [availableStudents] = useState<StudentSummary[]>([
    {
      id: 'student-1',
      name: 'Ahmed Rahman',
      email: 'ahmed@example.com',
      totalXP: 1250,
      currentLevel: 5,
      currentStreak: 7,
      averageScore: 85,
      timeSpent: 120,
      lastActive: new Date(),
      weakAreas: [],
      riskLevel: 'low'
    },
    {
      id: 'student-2',
      name: 'Fatima Khan',
      email: 'fatima@example.com',
      totalXP: 980,
      currentLevel: 4,
      currentStreak: 3,
      averageScore: 72,
      timeSpent: 95,
      lastActive: new Date(),
      weakAreas: [],
      riskLevel: 'medium'
    }
  ]);

  // Validation
  const validatePublishData = useCallback(() => {
    const issues: ValidationIssue[] = [];

    // Assignment validation
    if (publishData.assignedClasses.length === 0 && publishData.assignedStudents.length === 0) {
      issues.push({
        type: 'error',
        message: 'Please assign the assessment to at least one class or student',
        field: 'assignment'
      });
    }

    // Schedule validation
    if (publishData.scheduledDate && publishData.dueDate) {
      if (publishData.scheduledDate >= publishData.dueDate) {
        issues.push({
          type: 'error',
          message: 'Due date must be after the scheduled start date',
          field: 'schedule'
        });
      }
    }

    if (publishData.scheduledDate && publishData.scheduledDate <= new Date()) {
      issues.push({
        type: 'warning',
        message: 'Scheduled date is in the past. Assessment will be available immediately.',
        field: 'schedule'
      });
    }

    // Settings validation
    if (publishData.settings.maxAttempts < 1 || publishData.settings.maxAttempts > 10) {
      issues.push({
        type: 'error',
        message: 'Maximum attempts must be between 1 and 10',
        field: 'settings'
      });
    }

    // Availability window validation
    if (publishData.availabilityWindow.startTime && publishData.availabilityWindow.endTime) {
      const startTime = new Date(`2000-01-01 ${publishData.availabilityWindow.startTime}`);
      const endTime = new Date(`2000-01-01 ${publishData.availabilityWindow.endTime}`);
      
      if (startTime >= endTime) {
        issues.push({
          type: 'error',
          message: 'End time must be after start time',
          field: 'schedule'
        });
      }
    }

    if (publishData.availabilityWindow.allowedDays.length === 0) {
      issues.push({
        type: 'warning',
        message: 'No days selected for availability. Students will not be able to access the assessment.',
        field: 'schedule'
      });
    }

    // Assessment content validation
    if (assessment.questions.length === 0) {
      issues.push({
        type: 'error',
        message: 'Assessment must have at least one question before publishing',
        field: 'content'
      });
    }

    const totalPoints = assessment.questions.reduce((sum, q) => sum + q.points, 0);
    if (totalPoints === 0) {
      issues.push({
        type: 'error',
        message: 'Assessment must have a total point value greater than 0',
        field: 'content'
      });
    }

    // Informational messages
    if (publishData.settings.shuffleQuestions && assessment.questions.length < 5) {
      issues.push({
        type: 'info',
        message: 'Question shuffling is enabled but there are fewer than 5 questions',
        field: 'settings'
      });
    }

    if (publishData.notifications.notifyParents && !publishData.notifications.notifyStudents) {
      issues.push({
        type: 'info',
        message: 'Parent notifications are enabled but student notifications are disabled',
        field: 'notifications'
      });
    }

    setValidationIssues(issues);
    return issues.filter(issue => issue.type === 'error').length === 0;
  }, [publishData, assessment]);

  // Update publish data
  const updatePublishData = useCallback((updates: Partial<PublishData>) => {
    setPublishData(prev => ({ ...prev, ...updates }));
  }, []);

  // Update settings
  const updateSettings = useCallback((updates: Partial<PublishData['settings']>) => {
    setPublishData(prev => ({
      ...prev,
      settings: { ...prev.settings, ...updates }
    }));
  }, []);

  // Update notifications
  const updateNotifications = useCallback((updates: Partial<PublishData['notifications']>) => {
    setPublishData(prev => ({
      ...prev,
      notifications: { ...prev.notifications, ...updates }
    }));
  }, []);

  // Update availability window
  const updateAvailabilityWindow = useCallback((updates: Partial<PublishData['availabilityWindow']>) => {
    setPublishData(prev => ({
      ...prev,
      availabilityWindow: { ...prev.availabilityWindow, ...updates }
    }));
  }, []);

  // Toggle section expansion
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  // Handle class selection
  const handleClassSelection = useCallback((classId: string, selected: boolean) => {
    const updatedClasses = selected
      ? [...publishData.assignedClasses, classId]
      : publishData.assignedClasses.filter(id => id !== classId);
    
    updatePublishData({ assignedClasses: updatedClasses });
  }, [publishData.assignedClasses, updatePublishData]);

  // Handle student selection
  const handleStudentSelection = useCallback((studentId: string, selected: boolean) => {
    const updatedStudents = selected
      ? [...publishData.assignedStudents, studentId]
      : publishData.assignedStudents.filter(id => id !== studentId);
    
    updatePublishData({ assignedStudents: updatedStudents });
  }, [publishData.assignedStudents, updatePublishData]);

  // Handle day selection
  const handleDaySelection = useCallback((day: string, selected: boolean) => {
    const updatedDays = selected
      ? [...publishData.availabilityWindow.allowedDays, day]
      : publishData.availabilityWindow.allowedDays.filter(d => d !== day);
    
    updateAvailabilityWindow({ allowedDays: updatedDays });
  }, [publishData.availabilityWindow.allowedDays, updateAvailabilityWindow]);

  // Handle reminder selection
  const handleReminderSelection = useCallback((reminder: string, selected: boolean) => {
    const updatedReminders = selected
      ? [...publishData.notifications.reminderSchedule, reminder]
      : publishData.notifications.reminderSchedule.filter(r => r !== reminder);
    
    updateNotifications({ reminderSchedule: updatedReminders });
  }, [publishData.notifications.reminderSchedule, updateNotifications]);

  // Handle publish
  const handlePublish = useCallback(async () => {
    if (!validatePublishData()) {
      return;
    }

    try {
      await onPublish(publishData);
    } catch (error) {
      console.error('Failed to publish assessment:', error);
    }
  }, [publishData, validatePublishData, onPublish]);

  // Validate on data changes
  useEffect(() => {
    validatePublishData();
  }, [validatePublishData]);

  // Calculate totals
  const totalAssignedStudents = publishData.assignedClasses.reduce((total, classId) => {
    const classData = availableClasses.find(c => c.id === classId);
    return total + (classData?.studentCount || 0);
  }, 0) + publishData.assignedStudents.length;

  const hasErrors = validationIssues.some(issue => issue.type === 'error');

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Publish Assessment</h1>
          <p className="text-gray-600 mt-1">
            Configure and publish "{assessment.title}" to students
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={isLoading || hasErrors}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>{isLoading ? 'Publishing...' : 'Publish Assessment'}</span>
          </button>
        </div>
      </div>

      {/* Validation Issues */}
      {validationIssues.length > 0 && (
        <div className="mb-6 space-y-2">
          {validationIssues.map((issue, index) => (
            <div
              key={index}
              className={`flex items-start space-x-3 p-4 rounded-lg border ${
                issue.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : issue.type === 'warning'
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              {issue.type === 'error' ? (
                <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              ) : issue.type === 'warning' ? (
                <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              ) : (
                <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
              )}
              <span className="text-sm">{issue.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'assignment', label: 'Assignment', icon: Users },
            { id: 'schedule', label: 'Schedule', icon: Calendar },
            { id: 'settings', label: 'Settings', icon: Settings },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'review', label: 'Review', icon: Eye }
          ].map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              {id === 'assignment' && totalAssignedStudents > 0 && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {totalAssignedStudents}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'assignment' && (
          <AssignmentTab
            publishData={publishData}
            availableClasses={availableClasses}
            availableStudents={availableStudents}
            expandedSections={expandedSections}
            onClassSelection={handleClassSelection}
            onStudentSelection={handleStudentSelection}
            onToggleSection={toggleSection}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleTab
            publishData={publishData}
            updatePublishData={updatePublishData}
            updateAvailabilityWindow={updateAvailabilityWindow}
            onDaySelection={handleDaySelection}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            settings={publishData.settings}
            updateSettings={updateSettings}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsTab
            notifications={publishData.notifications}
            updateNotifications={updateNotifications}
            onReminderSelection={handleReminderSelection}
          />
        )}

        {activeTab === 'review' && (
          <ReviewTab
            assessment={assessment}
            publishData={publishData}
            availableClasses={availableClasses}
            availableStudents={availableStudents}
            validationIssues={validationIssues}
          />
        )}
      </div>
    </div>
  );
};

// Assignment Tab Component
interface AssignmentTabProps {
  publishData: PublishData;
  availableClasses: ClassOverview[];
  availableStudents: StudentSummary[];
  expandedSections: Record<string, boolean>;
  onClassSelection: (classId: string, selected: boolean) => void;
  onStudentSelection: (studentId: string, selected: boolean) => void;
  onToggleSection: (section: string) => void;
}

const AssignmentTab: React.FC<AssignmentTabProps> = ({
  publishData,
  availableClasses,
  availableStudents,
  expandedSections,
  onClassSelection,
  onStudentSelection,
  onToggleSection
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Assign Assessment</h3>
        <p className="text-gray-600 mb-6">
          Select the classes and individual students who should receive this assessment.
        </p>
      </div>

      {/* Classes Section */}
      <div className="bg-white border rounded-lg">
        <button
          type="button"
          onClick={() => onToggleSection('classes')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Users className="w-5 h-5 text-gray-400" />
            <div>
              <h4 className="font-medium text-gray-900">Classes</h4>
              <p className="text-sm text-gray-600">
                Assign to entire classes ({publishData.assignedClasses.length} selected)
              </p>
            </div>
          </div>
          {expandedSections.classes ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {expandedSections.classes && (
          <div className="border-t p-4 space-y-3">
            {availableClasses.map((classData) => (
              <label key={classData.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  name={`class-${classData.id}`}
                  aria-label={`${classData.name} ${classData.subject} Grade ${classData.grade}`}
                  checked={publishData.assignedClasses.includes(classData.id)}
                  onChange={(e) => onClassSelection(classData.id, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-gray-900">{classData.name}</h5>
                    <span className="text-sm text-gray-500">{classData.studentCount} students</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                    <span>Grade {classData.grade}</span>
                    <span>Avg. Performance: {classData.averagePerformance}%</span>
                    <span>Engagement: {classData.engagementRate}%</span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Individual Students Section */}
      <div className="bg-white border rounded-lg">
        <button
          type="button"
          onClick={() => onToggleSection('students')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Target className="w-5 h-5 text-gray-400" />
            <div>
              <h4 className="font-medium text-gray-900">Individual Students</h4>
              <p className="text-sm text-gray-600">
                Assign to specific students ({publishData.assignedStudents.length} selected)
              </p>
            </div>
          </div>
          {expandedSections.students ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {expandedSections.students && (
          <div className="border-t p-4">
            <div className="mb-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {availableStudents.map((student) => (
                <label key={student.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    name={`student-${student.id}`}
                    aria-label={`${student.name} - Grade ${student.grade}`}
                    checked={publishData.assignedStudents.includes(student.id)}
                    onChange={(e) => onStudentSelection(student.id, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium text-gray-900">{student.name}</h5>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        student.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                        student.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {student.riskLevel} risk
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      <span>Level {student.currentLevel}</span>
                      <span>Avg. Score: {student.averageScore}%</span>
                      <span>Streak: {student.currentStreak} days</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Assignment Summary */}
      {(publishData.assignedClasses.length > 0 || publishData.assignedStudents.length > 0) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Assignment Summary</h4>
          <div className="space-y-1 text-sm text-blue-800">
            {publishData.assignedClasses.length > 0 && (
              <p>{publishData.assignedClasses.length} classes selected</p>
            )}
            {publishData.assignedStudents.length > 0 && (
              <p>{publishData.assignedStudents.length} individual students selected</p>
            )}
            <p className="font-medium">
              Total estimated recipients: {
                publishData.assignedClasses.reduce((total, classId) => {
                  const classData = availableClasses.find(c => c.id === classId);
                  return total + (classData?.studentCount || 0);
                }, 0) + publishData.assignedStudents.length
              } students
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentPublisher;
// Schedule Tab Component
interface ScheduleTabProps {
  publishData: PublishData;
  updatePublishData: (updates: Partial<PublishData>) => void;
  updateAvailabilityWindow: (updates: Partial<PublishData['availabilityWindow']>) => void;
  onDaySelection: (day: string, selected: boolean) => void;
}

const ScheduleTab: React.FC<ScheduleTabProps> = ({
  publishData,
  updatePublishData,
  updateAvailabilityWindow,
  onDaySelection
}) => {
  const formatDateForInput = (date?: Date) => {
    if (!date) return '';
    return date.toISOString().slice(0, 16);
  };

  const parseInputDate = (dateString: string) => {
    return dateString ? new Date(dateString) : undefined;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Schedule Assessment</h3>
        <p className="text-gray-600 mb-6">
          Configure when students can access and complete the assessment.
        </p>
      </div>

      {/* Basic Scheduling */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span>Assessment Dates</span>
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="available-from" className="block text-sm font-medium text-gray-700 mb-2">
              Available From (Optional)
            </label>
            <input
              id="available-from"
              type="datetime-local"
              value={formatDateForInput(publishData.scheduledDate)}
              onChange={(e) => updatePublishData({ scheduledDate: parseInputDate(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to make available immediately
            </p>
          </div>

          <div>
            <label htmlFor="due-date" className="block text-sm font-medium text-gray-700 mb-2">
              Due Date (Optional)
            </label>
            <input
              id="due-date"
              type="datetime-local"
              value={formatDateForInput(publishData.dueDate)}
              onChange={(e) => updatePublishData({ dueDate: parseInputDate(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty for no due date
            </p>
          </div>
        </div>
      </div>

      {/* Availability Window */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
          <Clock className="w-5 h-5 text-gray-400" />
          <span>Availability Window</span>
        </h4>
        
        <div className="space-y-4">
          {/* Time Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Daily Time Range (Optional)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="time"
                  value={publishData.availabilityWindow.startTime || ''}
                  onChange={(e) => updateAvailabilityWindow({ startTime: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Start time</p>
              </div>
              <div>
                <input
                  type="time"
                  value={publishData.availabilityWindow.endTime || ''}
                  onChange={(e) => updateAvailabilityWindow({ endTime: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">End time</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Leave empty to allow access at any time of day
            </p>
          </div>

          {/* Days of Week */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Allowed Days
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <label key={day.value} className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publishData.availabilityWindow.allowedDays.includes(day.value)}
                    onChange={(e) => onDaySelection(day.value, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{day.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Summary */}
      <div className="bg-gray-50 border rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Schedule Summary</h4>
        <div className="space-y-1 text-sm text-gray-700">
          <p>
            <strong>Availability:</strong>{' '}
            {publishData.scheduledDate
              ? `From ${publishData.scheduledDate.toLocaleString()}`
              : 'Available immediately'
            }
            {publishData.dueDate && ` until ${publishData.dueDate.toLocaleString()}`}
          </p>
          
          {(publishData.availabilityWindow.startTime || publishData.availabilityWindow.endTime) && (
            <p>
              <strong>Daily hours:</strong>{' '}
              {publishData.availabilityWindow.startTime || '00:00'} -{' '}
              {publishData.availabilityWindow.endTime || '23:59'}
            </p>
          )}
          
          <p>
            <strong>Allowed days:</strong>{' '}
            {publishData.availabilityWindow.allowedDays.length === 7
              ? 'All days'
              : publishData.availabilityWindow.allowedDays.length === 0
              ? 'No days selected'
              : publishData.availabilityWindow.allowedDays
                  .map(day => DAYS_OF_WEEK.find(d => d.value === day)?.label)
                  .join(', ')
            }
          </p>
        </div>
      </div>
    </div>
  );
};

// Settings Tab Component
interface SettingsTabProps {
  settings: PublishData['settings'];
  updateSettings: (updates: Partial<PublishData['settings']>) => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  updateSettings
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Assessment Settings</h3>
        <p className="text-gray-600 mb-6">
          Configure how students will interact with the assessment.
        </p>
      </div>

      {/* Attempt Settings */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Attempt Settings</h4>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900">Allow Retakes</label>
              <p className="text-sm text-gray-600">Allow students to retake the assessment</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowRetakes}
                onChange={(e) => updateSettings({ allowRetakes: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {settings.allowRetakes && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Attempts
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.maxAttempts}
                onChange={(e) => updateSettings({ maxAttempts: parseInt(e.target.value) || 1 })}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Display Settings */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Display Settings</h4>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900">Show Results Immediately</label>
              <p className="text-sm text-gray-600">Show results and feedback after submission</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showResultsImmediately}
                onChange={(e) => updateSettings({ showResultsImmediately: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900">Show Progress Bar</label>
              <p className="text-sm text-gray-600">Display progress indicator during assessment</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showProgressBar}
                onChange={(e) => updateSettings({ showProgressBar: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Question Settings */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Question Settings</h4>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900">Shuffle Questions</label>
              <p className="text-sm text-gray-600">Randomize question order for each student</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.shuffleQuestions}
                onChange={(e) => updateSettings({ shuffleQuestions: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900">Shuffle Answer Options</label>
              <p className="text-sm text-gray-600">Randomize multiple choice options</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.shuffleOptions}
                onChange={(e) => updateSettings({ shuffleOptions: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Security & Control</h4>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900">Allow Pause</label>
              <p className="text-sm text-gray-600">Students can pause and resume the assessment</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowPause}
                onChange={(e) => updateSettings({ allowPause: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900">Require Proctoring</label>
              <p className="text-sm text-gray-600">Enable browser lockdown and monitoring</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.requireProctoring}
                onChange={(e) => updateSettings({ requireProctoring: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

// Notifications Tab Component
interface NotificationsTabProps {
  notifications: PublishData['notifications'];
  updateNotifications: (updates: Partial<PublishData['notifications']>) => void;
  onReminderSelection: (reminder: string, selected: boolean) => void;
}

const NotificationsTab: React.FC<NotificationsTabProps> = ({
  notifications,
  updateNotifications,
  onReminderSelection
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Notifications</h3>
        <p className="text-gray-600 mb-6">
          Configure how students and parents will be notified about the assessment.
        </p>
      </div>

      {/* Notification Recipients */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Recipients</h4>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900">Notify Students</label>
              <p className="text-sm text-gray-600">Send notifications to assigned students</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.notifyStudents}
                onChange={(e) => updateNotifications({ notifyStudents: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900">Notify Parents</label>
              <p className="text-sm text-gray-600">Send notifications to student parents/guardians</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.notifyParents}
                onChange={(e) => updateNotifications({ notifyParents: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Reminder Schedule */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Reminder Schedule</h4>
        <p className="text-sm text-gray-600 mb-4">
          Select when to send reminder notifications
        </p>
        
        <div className="space-y-3">
          {REMINDER_OPTIONS.map((reminder) => (
            <label key={reminder.value} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.reminderSchedule.includes(reminder.value)}
                onChange={(e) => onReminderSelection(reminder.value, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-900">{reminder.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Custom Message */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Custom Message</h4>
        <p className="text-sm text-gray-600 mb-4">
          Add a custom message to include with notifications (optional)
        </p>
        
        <textarea
          value={notifications.customMessage || ''}
          onChange={(e) => updateNotifications({ customMessage: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter a custom message for students and parents..."
        />
        <p className="text-xs text-gray-500 mt-2">
          This message will be included in all assessment notifications
        </p>
      </div>
    </div>
  );
};

// Review Tab Component
interface ReviewTabProps {
  assessment: CustomAssessment;
  publishData: PublishData;
  availableClasses: ClassOverview[];
  availableStudents: StudentSummary[];
  validationIssues: ValidationIssue[];
}

const ReviewTab: React.FC<ReviewTabProps> = ({
  assessment,
  publishData,
  availableClasses,
  availableStudents,
  validationIssues
}) => {
  const totalPoints = assessment.questions.reduce((sum, q) => sum + q.points, 0);
  const totalStudents = publishData.assignedClasses.reduce((total, classId) => {
    const classData = availableClasses.find(c => c.id === classId);
    return total + (classData?.studentCount || 0);
  }, 0) + publishData.assignedStudents.length;

  const assignedClassNames = publishData.assignedClasses.map(classId => 
    availableClasses.find(c => c.id === classId)?.name
  ).filter(Boolean);

  const assignedStudentNames = publishData.assignedStudents.map(studentId =>
    availableStudents.find(s => s.id === studentId)?.name
  ).filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Review & Publish</h3>
        <p className="text-gray-600 mb-6">
          Review all settings before publishing the assessment to students.
        </p>
      </div>

      {/* Validation Status */}
      {validationIssues.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <span>Validation Status</span>
          </h4>
          
          <div className="space-y-2">
            {validationIssues.map((issue, index) => (
              <div
                key={index}
                className={`flex items-start space-x-3 p-3 rounded-lg ${
                  issue.type === 'error'
                    ? 'bg-red-50 text-red-800'
                    : issue.type === 'warning'
                    ? 'bg-yellow-50 text-yellow-800'
                    : 'bg-blue-50 text-blue-800'
                }`}
              >
                {issue.type === 'error' ? (
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                ) : issue.type === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                <span className="text-sm">{issue.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assessment Overview */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
          <FileText className="w-5 h-5 text-gray-400" />
          <span>Assessment Overview</span>
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{assessment.questions.length}</div>
            <div className="text-sm text-gray-600">Questions</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{totalPoints}</div>
            <div className="text-sm text-gray-600">Total Points</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{assessment.timeLimit}</div>
            <div className="text-sm text-gray-600">Minutes</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{totalStudents}</div>
            <div className="text-sm text-gray-600">Students</div>
          </div>
        </div>
      </div>

      {/* Assignment Summary */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
          <Users className="w-5 h-5 text-gray-400" />
          <span>Assignment Summary</span>
        </h4>
        
        <div className="space-y-4">
          {assignedClassNames.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Assigned Classes ({assignedClassNames.length})</h5>
              <div className="flex flex-wrap gap-2">
                {assignedClassNames.map((className, index) => (
                  <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                    {className}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {assignedStudentNames.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Individual Students ({assignedStudentNames.length})</h5>
              <div className="flex flex-wrap gap-2">
                {assignedStudentNames.slice(0, 10).map((studentName, index) => (
                  <span key={index} className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                    {studentName}
                  </span>
                ))}
                {assignedStudentNames.length > 10 && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
                    +{assignedStudentNames.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Summary */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span>Schedule Summary</span>
        </h4>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Available from:</span>
            <span className="font-medium">
              {publishData.scheduledDate ? publishData.scheduledDate.toLocaleString() : 'Immediately'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Due date:</span>
            <span className="font-medium">
              {publishData.dueDate ? publishData.dueDate.toLocaleString() : 'No due date'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Daily availability:</span>
            <span className="font-medium">
              {publishData.availabilityWindow.startTime || publishData.availabilityWindow.endTime
                ? `${publishData.availabilityWindow.startTime || '00:00'} - ${publishData.availabilityWindow.endTime || '23:59'}`
                : 'All day'
              }
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Allowed days:</span>
            <span className="font-medium">
              {publishData.availabilityWindow.allowedDays.length === 7
                ? 'All days'
                : `${publishData.availabilityWindow.allowedDays.length} days`
              }
            </span>
          </div>
        </div>
      </div>

      {/* Settings Summary */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
          <Settings className="w-5 h-5 text-gray-400" />
          <span>Settings Summary</span>
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Retakes allowed:</span>
              <span className="font-medium">{publishData.settings.allowRetakes ? 'Yes' : 'No'}</span>
            </div>
            
            {publishData.settings.allowRetakes && (
              <div className="flex justify-between">
                <span className="text-gray-600">Max attempts:</span>
                <span className="font-medium">{publishData.settings.maxAttempts}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-gray-600">Show results:</span>
              <span className="font-medium">{publishData.settings.showResultsImmediately ? 'Immediately' : 'Later'}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Shuffle questions:</span>
              <span className="font-medium">{publishData.settings.shuffleQuestions ? 'Yes' : 'No'}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Shuffle options:</span>
              <span className="font-medium">{publishData.settings.shuffleOptions ? 'Yes' : 'No'}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Allow pause:</span>
              <span className="font-medium">{publishData.settings.allowPause ? 'Yes' : 'No'}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Proctoring:</span>
              <span className="font-medium">{publishData.settings.requireProctoring ? 'Required' : 'Not required'}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Progress bar:</span>
              <span className="font-medium">{publishData.settings.showProgressBar ? 'Shown' : 'Hidden'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications Summary */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
          <Bell className="w-5 h-5 text-gray-400" />
          <span>Notifications Summary</span>
        </h4>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Notify students:</span>
            <span className="font-medium">{publishData.notifications.notifyStudents ? 'Yes' : 'No'}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Notify parents:</span>
            <span className="font-medium">{publishData.notifications.notifyParents ? 'Yes' : 'No'}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Reminders:</span>
            <span className="font-medium">
              {publishData.notifications.reminderSchedule.length > 0
                ? `${publishData.notifications.reminderSchedule.length} scheduled`
                : 'None'
              }
            </span>
          </div>
          
          {publishData.notifications.customMessage && (
            <div>
              <span className="text-gray-600">Custom message:</span>
              <p className="mt-1 p-2 bg-gray-50 rounded text-gray-800 italic">
                "{publishData.notifications.customMessage}"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Final Status */}
      <div className={`border rounded-lg p-6 ${
        validationIssues.some(issue => issue.type === 'error')
          ? 'bg-red-50 border-red-200'
          : 'bg-green-50 border-green-200'
      }`}>
        <div className="flex items-center space-x-3">
          {validationIssues.some(issue => issue.type === 'error') ? (
            <AlertTriangle className="w-6 h-6 text-red-600" />
          ) : (
            <CheckCircle className="w-6 h-6 text-green-600" />
          )}
          <div>
            <h4 className={`font-medium ${
              validationIssues.some(issue => issue.type === 'error') ? 'text-red-900' : 'text-green-900'
            }`}>
              {validationIssues.some(issue => issue.type === 'error')
                ? 'Assessment Not Ready'
                : 'Assessment Ready to Publish'
              }
            </h4>
            <p className={`text-sm ${
              validationIssues.some(issue => issue.type === 'error') ? 'text-red-700' : 'text-green-700'
            }`}>
              {validationIssues.some(issue => issue.type === 'error')
                ? 'Please fix the validation errors before publishing'
                : 'All validation checks passed. You can now publish the assessment.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};