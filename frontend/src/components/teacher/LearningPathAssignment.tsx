/**
 * LearningPathAssignment Component
 * 
 * Interface for creating, customizing, and assigning learning paths to students.
 * Supports individual and bulk assignments with progress tracking.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  BookOpen, 
  Target, 
  Calendar, 
  Settings, 
  Send, 
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Clock,
  Award,
  AlertCircle,
  CheckCircle,
  User,
  Mail,
  Bell
} from 'lucide-react';

import {
  LearningPath,
  StudentAssignment,
  ClassInfo,
  PathRecommendation,
  AssignmentRequest,
  PathCustomization,
  NotificationSettings,
  PathTemplate,
  DifficultyLevel,
  DifficultyStrategy
} from '../../types/learningPath';

interface LearningPathAssignmentProps {
  onAssignPath: (request: AssignmentRequest) => Promise<void>;
  onGetRecommendations: (studentId: string, subject: string) => Promise<PathRecommendation[]>;
  onCreateCustomPath: (request: any) => Promise<LearningPath>;
  className?: string;
}

interface AssignmentTab {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

const ASSIGNMENT_TABS: AssignmentTab[] = [
  { id: 'selection', label: 'Path Selection', icon: BookOpen },
  { id: 'students', label: 'Student Assignment', icon: Users },
  { id: 'customization', label: 'Customization', icon: Settings },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'review', label: 'Review & Assign', icon: Send }
];

export const LearningPathAssignment: React.FC<LearningPathAssignmentProps> = ({
  onAssignPath,
  onGetRecommendations,
  onCreateCustomPath,
  className = ''
}) => {
  // State management
  const [activeTab, setActiveTab] = useState('selection');
  const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<StudentAssignment[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<ClassInfo[]>([]);
  const [customizations, setCustomizations] = useState<PathCustomization[]>([]);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    notifyStudents: true,
    notifyParents: true,
    reminderSchedule: [],
    customMessage: ''
  });
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Data states
  const [availablePaths, setAvailablePaths] = useState<LearningPath[]>([]);
  const [pathTemplates, setPathTemplates] = useState<PathTemplate[]>([]);
  const [recommendations, setRecommendations] = useState<PathRecommendation[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);

  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyLevel | ''>('');

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // Load available paths, templates, and classes
      // This would typically come from API calls
      setAvailablePaths([]);
      setPathTemplates([]);
      setClasses([]);
    } catch (err) {
      setError('Failed to load initial data');
    } finally {
      setIsLoading(false);
    }
  };
  // Validation
  const validateAssignment = useCallback((): string[] => {
    const errors: string[] = [];
    
    if (!selectedPath) {
      errors.push('Please select a learning path');
    }
    
    if (selectedStudents.length === 0 && selectedClasses.length === 0) {
      errors.push('Please select at least one student or class');
    }
    
    // Validate customizations
    customizations.forEach((customization, index) => {
      if (customization.timeExtension && customization.timeExtension < 0) {
        errors.push(`Invalid time extension for student ${index + 1}`);
      }
    });
    
    return errors;
  }, [selectedPath, selectedStudents, selectedClasses, customizations]);

  // Handle assignment submission
  const handleAssignPath = async () => {
    const errors = validateAssignment();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    if (!selectedPath) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const request: AssignmentRequest = {
        pathId: selectedPath.id,
        studentIds: selectedStudents.map(s => s.studentId),
        classIds: selectedClasses.map(c => c.id),
        customMessage: notifications.customMessage,
        notifyParents: notifications.notifyParents,
        customizations
      };

      await onAssignPath(request);
      
      // Reset form after successful assignment
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign learning path');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedPath(null);
    setSelectedStudents([]);
    setSelectedClasses([]);
    setCustomizations([]);
    setNotifications({
      notifyStudents: true,
      notifyParents: true,
      reminderSchedule: [],
      customMessage: ''
    });
    setActiveTab('selection');
    setValidationErrors([]);
  };

  // Tab navigation
  const canProceedToTab = (tabId: string): boolean => {
    switch (tabId) {
      case 'students':
        return !!selectedPath;
      case 'customization':
        return !!selectedPath && (selectedStudents.length > 0 || selectedClasses.length > 0);
      case 'notifications':
        return !!selectedPath && (selectedStudents.length > 0 || selectedClasses.length > 0);
      case 'review':
        return validateAssignment().length === 0;
      default:
        return true;
    }
  };

  const handleTabChange = (tabId: string) => {
    if (canProceedToTab(tabId)) {
      setActiveTab(tabId);
      setValidationErrors([]);
    }
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'selection':
        return <PathSelectionTab />;
      case 'students':
        return <StudentSelectionTab />;
      case 'customization':
        return <CustomizationTab />;
      case 'notifications':
        return <NotificationsTab />;
      case 'review':
        return <ReviewTab />;
      default:
        return null;
    }
  };
  // Path Selection Tab Component
  const PathSelectionTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Select Learning Path</h3>
        <button
          onClick={() => {/* Handle create new path */}}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Path
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search learning paths..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">All Subjects</option>
          <option value="mathematics">Mathematics</option>
          <option value="science">Science</option>
          <option value="english">English</option>
        </select>

        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value as DifficultyLevel | '')}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {/* Path Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pathTemplates.map((template) => (
          <div
            key={template.id}
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              selectedPath?.id === template.id
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => {/* Handle template selection */}}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{template.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span className="flex items-center">
                    <BookOpen className="w-3 h-3 mr-1" />
                    {template.subject}
                  </span>
                  <span className="flex items-center">
                    <Target className="w-3 h-3 mr-1" />
                    Grade {template.gradeLevel}
                  </span>
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {template.estimatedDurationDays} days
                  </span>
                </div>
              </div>
              
              <div className="flex flex-col items-end">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  template.difficultyLevel === 'easy' ? 'bg-green-100 text-green-800' :
                  template.difficultyLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {template.difficultyLevel}
                </span>
                
                <div className="flex items-center mt-2 text-xs text-gray-500">
                  <Award className="w-3 h-3 mr-1" />
                  {template.effectivenessRating.toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  // Student Selection Tab Component
  const StudentSelectionTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Select Students</h3>
      
      {/* Class Selection */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">Assign to Classes</h4>
        <div className="space-y-2">
          {classes.map((classInfo) => (
            <div
              key={classInfo.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedClasses.some(c => c.id === classInfo.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedClasses([...selectedClasses, classInfo]);
                    } else {
                      setSelectedClasses(selectedClasses.filter(c => c.id !== classInfo.id));
                    }
                  }}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{classInfo.name}</p>
                  <p className="text-sm text-gray-500">
                    {classInfo.subject} • Grade {classInfo.gradeLevel} • {classInfo.studentCount} students
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => {/* Handle expand class details */}}
                className="text-gray-400 hover:text-gray-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Individual Student Selection */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">Individual Students</h4>
        
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search students..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto space-y-2">
          {/* This would be populated with actual student data */}
          <div className="text-sm text-gray-500 text-center py-4">
            Select classes above or search for individual students
          </div>
        </div>
      </div>

      {/* Selection Summary */}
      {(selectedStudents.length > 0 || selectedClasses.length > 0) && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-indigo-900 mb-2">Assignment Summary</h4>
          <div className="text-sm text-indigo-700">
            {selectedClasses.length > 0 && (
              <p>{selectedClasses.length} class(es) selected</p>
            )}
            {selectedStudents.length > 0 && (
              <p>{selectedStudents.length} individual student(s) selected</p>
            )}
            <p className="font-medium mt-1">
              Total: {selectedClasses.reduce((sum, c) => sum + c.studentCount, 0) + selectedStudents.length} students
            </p>
          </div>
        </div>
      )}
    </div>
  );
  // Customization Tab Component
  const CustomizationTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Path Customization</h3>
      
      {/* Global Customizations */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-gray-900 mb-3">Global Settings</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Difficulty Strategy
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500">
              <option value="balanced">Balanced</option>
              <option value="conservative">Conservative</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Per-Student Customizations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-medium text-gray-900">Student-Specific Customizations</h4>
          <button className="text-sm text-indigo-600 hover:text-indigo-700">
            Auto-customize based on performance
          </button>
        </div>
        
        {selectedStudents.length === 0 && selectedClasses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Select students first to customize their learning paths</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Show customization options for selected students */}
            <div className="text-sm text-gray-600">
              Customizations will be available after student selection
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Notifications Tab Component
  const NotificationsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Notification Settings</h3>
      
      {/* Notification Recipients */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">Recipients</h4>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={notifications.notifyStudents}
              onChange={(e) => setNotifications({
                ...notifications,
                notifyStudents: e.target.checked
              })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="ml-3 text-sm text-gray-700">Notify students</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={notifications.notifyParents}
              onChange={(e) => setNotifications({
                ...notifications,
                notifyParents: e.target.checked
              })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="ml-3 text-sm text-gray-700">Notify parents</span>
          </label>
        </div>
      </div>

      {/* Custom Message */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Custom Message (Optional)
        </label>
        <textarea
          value={notifications.customMessage}
          onChange={(e) => setNotifications({
            ...notifications,
            customMessage: e.target.value
          })}
          rows={4}
          placeholder="Add a personal message for students and parents..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Reminder Schedule */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">Reminder Schedule</h4>
        <div className="space-y-2">
          {[
            { label: 'Path start reminder', value: 'path_start' },
            { label: 'Milestone due reminders', value: 'milestone_due' },
            { label: 'Progress check reminders', value: 'progress_check' }
          ].map((reminder) => (
            <label key={reminder.value} className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm text-gray-700">{reminder.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
  // Review Tab Component
  const ReviewTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Review Assignment</h3>
      
      {/* Assignment Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Assignment Summary</h4>
        
        {selectedPath && (
          <div className="space-y-4">
            {/* Selected Path */}
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Learning Path</h5>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                <p className="font-medium text-indigo-900">{selectedPath.title}</p>
                <p className="text-sm text-indigo-700 mt-1">{selectedPath.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-indigo-600">
                  <span>{selectedPath.subject}</span>
                  <span>Grade {selectedPath.gradeLevel}</span>
                  <span>{selectedPath.estimatedDurationDays} days</span>
                  <span>{selectedPath.topics.length} topics</span>
                </div>
              </div>
            </div>

            {/* Selected Students/Classes */}
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Recipients</h5>
              <div className="space-y-2">
                {selectedClasses.map((classInfo) => (
                  <div key={classInfo.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{classInfo.name}</p>
                      <p className="text-xs text-gray-500">{classInfo.studentCount} students</p>
                    </div>
                    <Users className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
                
                {selectedStudents.map((student) => (
                  <div key={student.studentId} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{student.studentName}</p>
                      <p className="text-xs text-gray-500">Individual assignment</p>
                    </div>
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>

            {/* Notifications */}
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Notifications</h5>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {notifications.notifyStudents && (
                    <span className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                      Students
                    </span>
                  )}
                  {notifications.notifyParents && (
                    <span className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                      Parents
                    </span>
                  )}
                </div>
                {notifications.customMessage && (
                  <p className="text-sm text-gray-600 mt-2 italic">
                    "{notifications.customMessage}"
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Please fix the following issues:</h4>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          onClick={resetForm}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Reset Form
        </button>
        
        <button
          onClick={handleAssignPath}
          disabled={isLoading || validationErrors.length > 0}
          className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Assigning...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Assign Learning Path
            </>
          )}
        </button>
      </div>
    </div>
  );
  // Main render
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Learning Path Assignment</h2>
            <p className="text-sm text-gray-600 mt-1">
              Create and assign personalized learning paths to students
            </p>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-red-400 mr-2" />
                <span className="text-sm text-red-800">{error}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-6 py-4 border-b border-gray-200">
        <nav className="flex space-x-8">
          {ASSIGNMENT_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const canAccess = canProceedToTab(tab.id);
            
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                disabled={!canAccess}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'text-indigo-700 bg-indigo-100'
                    : canAccess
                    ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    : 'text-gray-300 cursor-not-allowed'
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
      <div className="px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-3 text-gray-600">Loading...</span>
          </div>
        ) : (
          renderTabContent()
        )}
      </div>

      {/* Navigation Footer */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              const currentIndex = ASSIGNMENT_TABS.findIndex(tab => tab.id === activeTab);
              if (currentIndex > 0) {
                setActiveTab(ASSIGNMENT_TABS[currentIndex - 1].id);
              }
            }}
            disabled={activeTab === 'selection'}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <div className="flex items-center space-x-2">
            {ASSIGNMENT_TABS.map((tab, index) => (
              <div
                key={tab.id}
                className={`w-2 h-2 rounded-full ${
                  tab.id === activeTab
                    ? 'bg-indigo-600'
                    : canProceedToTab(tab.id)
                    ? 'bg-gray-300'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          
          <button
            onClick={() => {
              const currentIndex = ASSIGNMENT_TABS.findIndex(tab => tab.id === activeTab);
              if (currentIndex < ASSIGNMENT_TABS.length - 1) {
                const nextTab = ASSIGNMENT_TABS[currentIndex + 1];
                if (canProceedToTab(nextTab.id)) {
                  setActiveTab(nextTab.id);
                }
              }
            }}
            disabled={activeTab === 'review' || !canProceedToTab(
              ASSIGNMENT_TABS[ASSIGNMENT_TABS.findIndex(tab => tab.id === activeTab) + 1]?.id
            )}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {activeTab === 'review' ? 'Assign' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LearningPathAssignment;