import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Save, 
  Calendar, 
  Users, 
  AlertCircle, 
  X,
  FileText,
  Clock,
  Megaphone,
  CheckCircle
} from 'lucide-react';
import { 
  AnnouncementCreate, 
  MessagePriority, 
  ClassOverview,
  AnnouncementTemplate
} from '../../types/teacher';

interface AnnouncementComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (announcement: AnnouncementCreate) => Promise<void>;
  onSaveDraft: (announcement: AnnouncementCreate) => Promise<void>;
  classes: ClassOverview[];
  templates: AnnouncementTemplate[];
}

const AnnouncementComposer: React.FC<AnnouncementComposerProps> = ({
  isOpen,
  onClose,
  onSend,
  onSaveDraft,
  classes,
  templates
}) => {
  const [announcement, setAnnouncement] = useState<AnnouncementCreate>({
    title: '',
    content: '',
    targetClasses: [],
    priority: 'normal',
    includeParents: false
  });

  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    { value: 'normal', label: 'Normal', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { value: 'high', label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600', bgColor: 'bg-red-100' }
  ];

  const validateAnnouncement = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!announcement.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!announcement.content.trim()) {
      newErrors.content = 'Content is required';
    }

    if (announcement.targetClasses.length === 0) {
      newErrors.classes = 'Please select at least one class';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSend = async () => {
    if (!validateAnnouncement()) return;

    setIsLoading(true);
    try {
      await onSend(announcement);
      onClose();
    } catch (error) {
      console.error('Failed to send announcement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsLoading(true);
    try {
      await onSaveDraft(announcement);
      onClose();
    } catch (error) {
      console.error('Failed to save draft:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateSelect = (template: AnnouncementTemplate) => {
    setAnnouncement(prev => ({
      ...prev,
      title: template.subjectTemplate,
      content: template.contentTemplate
    }));
    setShowTemplateSelector(false);
  };

  const handleClassToggle = (classId: string) => {
    setAnnouncement(prev => ({
      ...prev,
      targetClasses: prev.targetClasses.includes(classId)
        ? prev.targetClasses.filter(id => id !== classId)
        : [...prev.targetClasses, classId]
    }));
  };

  const getSelectedStudentCount = (): number => {
    return announcement.targetClasses.reduce((total, classId) => {
      const classData = classes.find(c => c.id === classId);
      return total + (classData?.studentCount || 0);
    }, 0);
  };

  const getEstimatedReach = (): number => {
    const studentCount = getSelectedStudentCount();
    return announcement.includeParents ? studentCount * 2 : studentCount;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Megaphone className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Create Announcement</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Composer */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Title */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Announcement Title
              </label>
              <input
                type="text"
                value={announcement.title}
                onChange={(e) => setAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter announcement title"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            {/* Priority Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Priority Level
              </label>
              <div className="grid grid-cols-4 gap-3">
                {priorityOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setAnnouncement(prev => ({ 
                      ...prev, 
                      priority: option.value as MessagePriority 
                    }))}
                    className={`p-3 border rounded-lg text-center transition-colors ${
                      announcement.priority === option.value
                        ? `border-blue-500 ${option.bgColor}`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`font-medium ${option.color}`}>{option.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Classes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Target Classes
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {classes.map((classData) => (
                  <label key={classData.id} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={announcement.targetClasses.includes(classData.id)}
                      onChange={() => handleClassToggle(classData.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{classData.name}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({classData.studentCount} students)
                      </span>
                    </div>
                  </label>
                ))}
              </div>
              {errors.classes && (
                <p className="mt-1 text-sm text-red-600">{errors.classes}</p>
              )}
            </div>

            {/* Include Parents */}
            <div className="mb-6">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={announcement.includeParents}
                  onChange={(e) => setAnnouncement(prev => ({ 
                    ...prev, 
                    includeParents: e.target.checked 
                  }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Also notify parents</span>
              </label>
            </div>

            {/* Content */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Announcement Content
                </label>
                <button
                  onClick={() => setShowTemplateSelector(true)}
                  className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <FileText className="w-4 h-4" />
                  <span>Use Template</span>
                </button>
              </div>
              <textarea
                value={announcement.content}
                onChange={(e) => setAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                rows={8}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your announcement content"
              />
              {errors.content && (
                <p className="mt-1 text-sm text-red-600">{errors.content}</p>
              )}
            </div>

            {/* Schedule Option */}
            <div className="mb-6">
              <label className="flex items-center space-x-3 mb-3">
                <input
                  type="checkbox"
                  checked={!!announcement.scheduledAt}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      tomorrow.setHours(9, 0, 0, 0);
                      setAnnouncement(prev => ({ ...prev, scheduledAt: tomorrow }));
                    } else {
                      setAnnouncement(prev => ({ ...prev, scheduledAt: undefined }));
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Schedule for later</span>
              </label>
              
              {announcement.scheduledAt && (
                <div className="ml-6">
                  <input
                    type="datetime-local"
                    value={announcement.scheduledAt.toISOString().slice(0, 16)}
                    onChange={(e) => setAnnouncement(prev => ({ 
                      ...prev, 
                      scheduledAt: new Date(e.target.value) 
                    }))}
                    className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 border-l bg-gray-50 p-6">
            {/* Preview */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Announcement Preview</h3>
              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Estimated Reach</span>
                  <span className="text-xs font-medium">{getEstimatedReach()} recipients</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Classes</span>
                  <span className="text-xs">{announcement.targetClasses.length}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Priority</span>
                  <span className={`text-xs font-medium ${
                    priorityOptions.find(p => p.value === announcement.priority)?.color
                  }`}>
                    {priorityOptions.find(p => p.value === announcement.priority)?.label}
                  </span>
                </div>
                {announcement.scheduledAt && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">Scheduled</span>
                    <span className="text-xs">
                      {announcement.scheduledAt.toLocaleDateString()} {announcement.scheduledAt.toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {announcement.scheduledAt ? <Clock className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                <span>
                  {isLoading ? 'Sending...' : announcement.scheduledAt ? 'Schedule Announcement' : 'Send Now'}
                </span>
              </button>
              
              <button
                onClick={handleSaveDraft}
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Save Draft</span>
              </button>
            </div>

            {/* Tips */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-xs text-blue-700">
                  <p className="font-medium mb-1">Tips for effective announcements:</p>
                  <ul className="space-y-1">
                    <li>• Keep the title clear and specific</li>
                    <li>• Use appropriate priority levels</li>
                    <li>• Include action items if needed</li>
                    <li>• Consider timing for maximum impact</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Template Selector Modal */}
        {showTemplateSelector && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">Select Template</h3>
                <button
                  onClick={() => setShowTemplateSelector(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto">
                <div className="space-y-3">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900 mb-1">{template.name}</div>
                      <div className="text-sm text-gray-600 mb-2">{template.subjectTemplate}</div>
                      <div className="text-xs text-gray-500 line-clamp-2">{template.contentTemplate}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementComposer;