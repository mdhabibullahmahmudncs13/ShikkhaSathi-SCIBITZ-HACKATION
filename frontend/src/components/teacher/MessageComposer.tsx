import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Save, 
  Users, 
  User, 
  Calendar, 
  AlertCircle, 
  X,
  Plus,
  Search,
  Clock,
  Mail,
  MessageSquare,
  Megaphone,
  FileText
} from 'lucide-react';
import { 
  MessageComposerState, 
  MessageType, 
  MessagePriority, 
  ClassOverview,
  StudentSummary,
  MessageTemplate,
  RecipientInfo
} from '../../types/teacher';

interface MessageComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (message: MessageComposerState) => Promise<void>;
  onSaveDraft: (message: MessageComposerState) => Promise<void>;
  classes: ClassOverview[];
  templates: MessageTemplate[];
  initialMessage?: Partial<MessageComposerState>;
}

const MessageComposer: React.FC<MessageComposerProps> = ({
  isOpen,
  onClose,
  onSend,
  onSaveDraft,
  classes,
  templates,
  initialMessage
}) => {
  const [message, setMessage] = useState<MessageComposerState>({
    subject: '',
    content: '',
    messageType: 'direct',
    priority: 'normal',
    selectedRecipients: [],
    selectedClasses: [],
    includeParents: false,
    isDraft: false,
    ...initialMessage
  });

  const [showRecipientSelector, setShowRecipientSelector] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialMessage) {
      setMessage(prev => ({ ...prev, ...initialMessage }));
    }
  }, [initialMessage]);

  const messageTypeOptions = [
    { value: 'direct', label: 'Direct Message', icon: User, description: 'Send to specific individuals' },
    { value: 'group', label: 'Group Message', icon: Users, description: 'Send to selected group' },
    { value: 'class', label: 'Class Message', icon: MessageSquare, description: 'Send to entire class' },
    { value: 'announcement', label: 'Announcement', icon: Megaphone, description: 'Public announcement' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'text-gray-600' },
    { value: 'normal', label: 'Normal', color: 'text-blue-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600' }
  ];

  const validateMessage = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!message.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!message.content.trim()) {
      newErrors.content = 'Message content is required';
    }

    if (message.messageType === 'direct' || message.messageType === 'group') {
      if (message.selectedRecipients.length === 0) {
        newErrors.recipients = 'Please select at least one recipient';
      }
    }

    if (message.messageType === 'class') {
      if (message.selectedClasses.length === 0) {
        newErrors.classes = 'Please select at least one class';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSend = async () => {
    if (!validateMessage()) return;

    setIsLoading(true);
    try {
      await onSend({ ...message, isDraft: false });
      onClose();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsLoading(true);
    try {
      await onSaveDraft({ ...message, isDraft: true });
      onClose();
    } catch (error) {
      console.error('Failed to save draft:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateSelect = (template: MessageTemplate) => {
    setMessage(prev => ({
      ...prev,
      subject: template.subjectTemplate,
      content: template.contentTemplate,
      template
    }));
    setShowTemplateSelector(false);
  };

  const getRecipientCount = (): number => {
    if (message.messageType === 'class') {
      return message.selectedClasses.reduce((total, classId) => {
        const classData = classes.find(c => c.id === classId);
        return total + (classData?.studentCount || 0);
      }, 0) * (message.includeParents ? 2 : 1);
    }
    return message.selectedRecipients.length;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Compose Message</h2>
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
            {/* Message Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Message Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {messageTypeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setMessage(prev => ({ 
                        ...prev, 
                        messageType: option.value as MessageType,
                        selectedRecipients: [],
                        selectedClasses: []
                      }))}
                      className={`p-3 border rounded-lg text-left transition-colors ${
                        message.messageType === option.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <Icon className="w-4 h-4" />
                        <span className="font-medium">{option.label}</span>
                      </div>
                      <p className="text-xs text-gray-600">{option.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recipients/Classes Selection */}
            {(message.messageType === 'direct' || message.messageType === 'group') && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipients
                </label>
                <button
                  onClick={() => setShowRecipientSelector(true)}
                  className="w-full p-3 border border-gray-300 rounded-lg text-left hover:border-gray-400 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">
                      {message.selectedRecipients.length > 0
                        ? `${message.selectedRecipients.length} recipients selected`
                        : 'Select recipients'
                      }
                    </span>
                    <Plus className="w-4 h-4" />
                  </div>
                </button>
                {errors.recipients && (
                  <p className="mt-1 text-sm text-red-600">{errors.recipients}</p>
                )}
              </div>
            )}

            {message.messageType === 'class' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Classes
                </label>
                <div className="space-y-2">
                  {classes.map((classData) => (
                    <label key={classData.id} className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={message.selectedClasses.includes(classData.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setMessage(prev => ({
                              ...prev,
                              selectedClasses: [...prev.selectedClasses, classData.id]
                            }));
                          } else {
                            setMessage(prev => ({
                              ...prev,
                              selectedClasses: prev.selectedClasses.filter(id => id !== classData.id)
                            }));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">
                        {classData.name} ({classData.studentCount} students)
                      </span>
                    </label>
                  ))}
                </div>
                {message.messageType === 'class' && (
                  <label className="flex items-center space-x-3 mt-3">
                    <input
                      type="checkbox"
                      checked={message.includeParents}
                      onChange={(e) => setMessage(prev => ({ 
                        ...prev, 
                        includeParents: e.target.checked 
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">Also notify parents</span>
                  </label>
                )}
                {errors.classes && (
                  <p className="mt-1 text-sm text-red-600">{errors.classes}</p>
                )}
              </div>
            )}

            {/* Priority Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={message.priority}
                onChange={(e) => setMessage(prev => ({ 
                  ...prev, 
                  priority: e.target.value as MessagePriority 
                }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {priorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={message.subject}
                onChange={(e) => setMessage(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter message subject"
              />
              {errors.subject && (
                <p className="mt-1 text-sm text-red-600">{errors.subject}</p>
              )}
            </div>

            {/* Content */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message Content
              </label>
              <textarea
                value={message.content}
                onChange={(e) => setMessage(prev => ({ ...prev, content: e.target.value }))}
                rows={8}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your message content"
              />
              {errors.content && (
                <p className="mt-1 text-sm text-red-600">{errors.content}</p>
              )}
            </div>

            {/* Schedule Option */}
            <div className="mb-6">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={!!message.scheduledAt}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      tomorrow.setHours(9, 0, 0, 0);
                      setMessage(prev => ({ ...prev, scheduledAt: tomorrow }));
                    } else {
                      setMessage(prev => ({ ...prev, scheduledAt: undefined }));
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Schedule for later</span>
              </label>
              
              {message.scheduledAt && (
                <div className="mt-3">
                  <input
                    type="datetime-local"
                    value={message.scheduledAt.toISOString().slice(0, 16)}
                    onChange={(e) => setMessage(prev => ({ 
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
            {/* Message Preview */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Message Preview</h3>
              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Recipients</span>
                  <span className="text-xs font-medium">{getRecipientCount()}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Priority</span>
                  <span className={`text-xs font-medium ${
                    priorityOptions.find(p => p.value === message.priority)?.color
                  }`}>
                    {priorityOptions.find(p => p.value === message.priority)?.label}
                  </span>
                </div>
                {message.scheduledAt && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">Scheduled</span>
                    <span className="text-xs">
                      {message.scheduledAt.toLocaleDateString()} {message.scheduledAt.toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Templates */}
            <div className="mb-6">
              <button
                onClick={() => setShowTemplateSelector(true)}
                className="w-full flex items-center justify-center space-x-2 p-3 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>Use Template</span>
              </button>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>{isLoading ? 'Sending...' : 'Send Message'}</span>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageComposer;