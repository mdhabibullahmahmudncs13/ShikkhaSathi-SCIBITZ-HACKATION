import React, { useState } from 'react';
import { Calendar, Clock, Users, Bell, Video, AlertCircle } from 'lucide-react';

interface ScheduleClassFormProps {
  classInfo: {
    id: string;
    name: string;
    subject: string;
    student_count: number;
  };
  onSchedule: (scheduleData: ScheduledClass) => void;
  onCancel: () => void;
}

interface ScheduledClass {
  classId: string;
  title: string;
  description: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  notifyBefore: number;
  isRecurring: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly';
  maxParticipants?: number;
}

const ScheduleClassForm: React.FC<ScheduleClassFormProps> = ({ classInfo, onSchedule, onCancel }) => {
  const [formData, setFormData] = useState<ScheduledClass>({
    classId: classInfo.id,
    title: `${classInfo.name} - Online Class`,
    description: '',
    scheduledDate: '',
    scheduledTime: '',
    duration: 60,
    notifyBefore: 15,
    isRecurring: false,
    maxParticipants: classInfo.student_count
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Class title is required';
    }

    if (!formData.scheduledDate) {
      newErrors.scheduledDate = 'Date is required';
    } else {
      const selectedDate = new Date(formData.scheduledDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.scheduledDate = 'Cannot schedule class in the past';
      }
    }

    if (!formData.scheduledTime) {
      newErrors.scheduledTime = 'Time is required';
    }

    if (formData.duration < 15 || formData.duration > 180) {
      newErrors.duration = 'Duration must be between 15 and 180 minutes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSchedule(formData);
    }
  };

  const handleInputChange = (field: keyof ScheduledClass, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Class Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Class Title *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.title ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter class title"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.title}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Add class description, topics to cover, or special instructions..."
        />
      </div>

      {/* Date and Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Date *
          </label>
          <input
            type="date"
            value={formData.scheduledDate}
            onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
            min={today}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.scheduledDate ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.scheduledDate && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.scheduledDate}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4 inline mr-1" />
            Time *
          </label>
          <input
            type="time"
            value={formData.scheduledTime}
            onChange={(e) => handleInputChange('scheduledTime', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.scheduledTime ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.scheduledTime && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.scheduledTime}
            </p>
          )}
        </div>
      </div>

      {/* Duration and Notification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Video className="w-4 h-4 inline mr-1" />
            Duration (minutes) *
          </label>
          <select
            value={formData.duration}
            onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.duration ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
            <option value={180}>3 hours</option>
          </select>
          {errors.duration && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.duration}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Bell className="w-4 h-4 inline mr-1" />
            Notify students before
          </label>
          <select
            value={formData.notifyBefore}
            onChange={(e) => handleInputChange('notifyBefore', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={5}>5 minutes</option>
            <option value={10}>10 minutes</option>
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
            <option value={120}>2 hours</option>
            <option value={1440}>1 day</option>
          </select>
        </div>
      </div>

      {/* Max Participants */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Users className="w-4 h-4 inline mr-1" />
          Maximum Participants
        </label>
        <input
          type="number"
          value={formData.maxParticipants || ''}
          onChange={(e) => handleInputChange('maxParticipants', parseInt(e.target.value) || undefined)}
          min={1}
          max={100}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Leave empty for no limit"
        />
        <p className="mt-1 text-sm text-gray-500">
          Current class has {classInfo.student_count} students enrolled
        </p>
      </div>

      {/* Recurring Options */}
      <div className="border-t pt-4">
        <div className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            id="recurring"
            checked={formData.isRecurring}
            onChange={(e) => handleInputChange('isRecurring', e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="recurring" className="text-sm font-medium text-gray-700">
            Make this a recurring class
          </label>
        </div>

        {formData.isRecurring && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Repeat Pattern
            </label>
            <select
              value={formData.recurringPattern || 'weekly'}
              onChange={(e) => handleInputChange('recurringPattern', e.target.value as 'daily' | 'weekly' | 'monthly')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Calendar className="w-4 h-4" />
          Schedule Class
        </button>
      </div>
    </form>
  );
};

export default ScheduleClassForm;