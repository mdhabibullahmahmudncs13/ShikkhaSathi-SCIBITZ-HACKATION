import React, { useState, useEffect } from 'react';
import { 
  Plus as PlusIcon, 
  GraduationCap as AcademicCapIcon, 
  Clock as ClockIcon, 
  FileText as DocumentTextIcon,
  Sparkles as SparklesIcon,
  Eye as EyeIcon,
  Check as CheckIcon
} from 'lucide-react';

interface AssessmentCreatorProps {
  onAssessmentCreated?: (assessmentId: string) => void;
  onCancel?: () => void;
}

interface SubjectTemplate {
  topics: string[];
  bloom_levels: number[];
  difficulty_levels: string[];
}

interface AssessmentFormData {
  title: string;
  description: string;
  subject: string;
  grade: number;
  bloom_levels: number[];
  topics: string[];
  question_count: number;
  time_limit: number;
  difficulty: string;
  scheduled_date: string;
  due_date: string;
  assigned_classes: string[];
  rubric?: {
    title: string;
    description: string;
    total_points: number;
    criteria: RubricCriterion[];
  };
}

interface RubricCriterion {
  name: string;
  description: string;
  weight: number;
  levels: RubricLevel[];
}

interface RubricLevel {
  name: string;
  description: string;
  points: number;
}

const AssessmentCreator: React.FC<AssessmentCreatorProps> = ({
  onAssessmentCreated,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [subjectTemplates, setSubjectTemplates] = useState<Record<string, SubjectTemplate>>({});
  const [formData, setFormData] = useState<AssessmentFormData>({
    title: '',
    description: '',
    subject: '',
    grade: 9,
    bloom_levels: [1, 2, 3],
    topics: [],
    question_count: 10,
    time_limit: 60,
    difficulty: 'medium',
    scheduled_date: '',
    due_date: '',
    assigned_classes: ['default-class']
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    fetchSubjectTemplates();
  }, []);

  const fetchSubjectTemplates = async () => {
    try {
      const response = await fetch('/api/v1/assessment/templates/subjects', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSubjectTemplates(data.subjects);
      }
    } catch (error) {
      console.error('Failed to fetch subject templates:', error);
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.title.trim()) newErrors.title = 'Title is required';
        if (!formData.subject) newErrors.subject = 'Subject is required';
        if (formData.grade < 6 || formData.grade > 12) newErrors.grade = 'Grade must be between 6 and 12';
        break;
      
      case 2:
        if (formData.bloom_levels.length === 0) newErrors.bloom_levels = 'At least one Bloom level is required';
        if (formData.topics.length === 0) newErrors.topics = 'At least one topic is required';
        if (formData.question_count < 5 || formData.question_count > 50) {
          newErrors.question_count = 'Question count must be between 5 and 50';
        }
        break;
      
      case 3:
        if (formData.time_limit < 10 || formData.time_limit > 300) {
          newErrors.time_limit = 'Time limit must be between 10 and 300 minutes';
        }
        if (formData.scheduled_date && formData.due_date) {
          if (new Date(formData.scheduled_date) >= new Date(formData.due_date)) {
            newErrors.due_date = 'Due date must be after scheduled date';
          }
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 4) {
        handlePreview();
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handlePreview = async () => {
    setIsLoading(true);
    try {
      // Create assessment first
      const response = await fetch('/api/v1/assessment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        
        // Get preview data
        const previewResponse = await fetch(`/api/v1/assessment/${result.assessment_id}/preview`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (previewResponse.ok) {
          const preview = await previewResponse.json();
          setPreviewData({ ...preview, assessment_id: result.assessment_id });
          setCurrentStep(5);
        }
      } else {
        const error = await response.json();
        setErrors({ general: error.detail || 'Failed to create assessment' });
      }
    } catch (error) {
      setErrors({ general: 'Failed to create assessment' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!previewData?.assessment_id) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/assessment/${previewData.assessment_id}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        onAssessmentCreated?.(previewData.assessment_id);
      } else {
        const error = await response.json();
        setErrors({ general: error.detail || 'Failed to publish assessment' });
      }
    } catch (error) {
      setErrors({ general: 'Failed to publish assessment' });
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof AssessmentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4, 5].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
            ${step <= currentStep 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-600'
            }
          `}>
            {step < currentStep ? <CheckIcon className="w-5 h-5" /> : step}
          </div>
          {step < 5 && (
            <div className={`
              w-12 h-1 mx-2
              ${step < currentStep ? 'bg-blue-600' : 'bg-gray-200'}
            `} />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <AcademicCapIcon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Basic Information</h2>
        <p className="text-gray-600">Set up the basic details for your assessment</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assessment Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => updateFormData('title', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.title ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter assessment title"
          />
          {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => updateFormData('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe the assessment purpose and instructions"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject *
            </label>
            <select
              value={formData.subject}
              onChange={(e) => updateFormData('subject', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.subject ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select Subject</option>
              {Object.keys(subjectTemplates).map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
            {errors.subject && <p className="text-red-500 text-sm mt-1">{errors.subject}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Grade *
            </label>
            <select
              value={formData.grade}
              onChange={(e) => updateFormData('grade', parseInt(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.grade ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              {[6, 7, 8, 9, 10, 11, 12].map(grade => (
                <option key={grade} value={grade}>Grade {grade}</option>
              ))}
            </select>
            {errors.grade && <p className="text-red-500 text-sm mt-1">{errors.grade}</p>}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <SparklesIcon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Content Configuration</h2>
        <p className="text-gray-600">Configure topics, difficulty, and question parameters</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Topics * (Select topics to include)
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
            {formData.subject && subjectTemplates[formData.subject]?.topics.map(topic => (
              <label key={topic} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.topics.includes(topic)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateFormData('topics', [...formData.topics, topic]);
                    } else {
                      updateFormData('topics', formData.topics.filter(t => t !== topic));
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">{topic}</span>
              </label>
            ))}
          </div>
          {errors.topics && <p className="text-red-500 text-sm mt-1">{errors.topics}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bloom's Taxonomy Levels * (Select cognitive levels to assess)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 1, label: 'Remember' },
              { value: 2, label: 'Understand' },
              { value: 3, label: 'Apply' },
              { value: 4, label: 'Analyze' },
              { value: 5, label: 'Evaluate' },
              { value: 6, label: 'Create' }
            ].map(level => (
              <label key={level.value} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.bloom_levels.includes(level.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateFormData('bloom_levels', [...formData.bloom_levels, level.value]);
                    } else {
                      updateFormData('bloom_levels', formData.bloom_levels.filter(l => l !== level.value));
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">{level.label}</span>
              </label>
            ))}
          </div>
          {errors.bloom_levels && <p className="text-red-500 text-sm mt-1">{errors.bloom_levels}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Questions *
            </label>
            <input
              type="number"
              min="5"
              max="50"
              value={formData.question_count}
              onChange={(e) => updateFormData('question_count', parseInt(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.question_count ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.question_count && <p className="text-red-500 text-sm mt-1">{errors.question_count}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Difficulty Level
            </label>
            <select
              value={formData.difficulty}
              onChange={(e) => updateFormData('difficulty', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="adaptive">Adaptive</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <ClockIcon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Scheduling & Settings</h2>
        <p className="text-gray-600">Set timing and assignment details</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time Limit (minutes) *
          </label>
          <input
            type="number"
            min="10"
            max="300"
            value={formData.time_limit}
            onChange={(e) => updateFormData('time_limit', parseInt(e.target.value))}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.time_limit ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.time_limit && <p className="text-red-500 text-sm mt-1">{errors.time_limit}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scheduled Date
            </label>
            <input
              type="datetime-local"
              value={formData.scheduled_date}
              onChange={(e) => updateFormData('scheduled_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due Date
            </label>
            <input
              type="datetime-local"
              value={formData.due_date}
              onChange={(e) => updateFormData('due_date', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.due_date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.due_date && <p className="text-red-500 text-sm mt-1">{errors.due_date}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assigned Classes *
          </label>
          <div className="space-y-2">
            {/* This would typically be populated from actual class data */}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.assigned_classes.includes('default-class')}
                onChange={(e) => {
                  if (e.target.checked) {
                    updateFormData('assigned_classes', [...formData.assigned_classes, 'default-class']);
                  } else {
                    updateFormData('assigned_classes', formData.assigned_classes.filter(c => c !== 'default-class'));
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">Default Class</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <DocumentTextIcon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Review & Generate</h2>
        <p className="text-gray-600">Review your settings and generate AI-powered questions</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium text-gray-900">Assessment Details</h3>
            <p className="text-sm text-gray-600">Title: {formData.title}</p>
            <p className="text-sm text-gray-600">Subject: {formData.subject}</p>
            <p className="text-sm text-gray-600">Grade: {formData.grade}</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Configuration</h3>
            <p className="text-sm text-gray-600">Questions: {formData.question_count}</p>
            <p className="text-sm text-gray-600">Time Limit: {formData.time_limit} minutes</p>
            <p className="text-sm text-gray-600">Difficulty: {formData.difficulty}</p>
          </div>
        </div>
        
        <div>
          <h3 className="font-medium text-gray-900">Topics</h3>
          <p className="text-sm text-gray-600">{formData.topics.join(', ')}</p>
        </div>
        
        <div>
          <h3 className="font-medium text-gray-900">Bloom Levels</h3>
          <p className="text-sm text-gray-600">
            {formData.bloom_levels.map(level => {
              const labels = ['', 'Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
              return labels[level];
            }).join(', ')}
          </p>
        </div>
      </div>

      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600 text-sm">{errors.general}</p>
        </div>
      )}
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <EyeIcon className="w-12 h-12 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Assessment Preview</h2>
        <p className="text-gray-600">Review the generated questions before publishing</p>
      </div>

      {previewData && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900">{previewData.assessment.title}</h3>
            <p className="text-sm text-blue-700 mt-1">{previewData.assessment.description}</p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-blue-600">
              <span>📚 {previewData.assessment.subject}</span>
              <span>🎓 Grade {previewData.assessment.grade}</span>
              <span>⏱️ {previewData.assessment.time_limit} minutes</span>
              <span>❓ {previewData.assessment.question_count} questions</span>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-4">
            {previewData.questions.map((question: any, index: number) => (
              <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Question {index + 1}</h4>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>Bloom Level {question.bloom_level}</span>
                    <span>•</span>
                    <span>{question.points} pts</span>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-3">{question.question_text}</p>
                
                {question.options && (
                  <div className="space-y-1">
                    {question.options.map((option: string, optIndex: number) => (
                      <div key={optIndex} className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">
                          {String.fromCharCode(65 + optIndex)})
                        </span>
                        <span className="text-sm text-gray-700">{option}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-2 text-xs text-gray-500">
                  Topic: {question.topic} • Difficulty: {question.difficulty}/10
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      {renderStepIndicator()}
      
      <div className="bg-white rounded-lg shadow-lg p-8">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
        
        <div className="flex justify-between mt-8">
          <div>
            {currentStep > 1 && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isLoading}
              >
                Previous
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            
            {currentStep < 4 && (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={isLoading}
              >
                Next
              </button>
            )}
            
            {currentStep === 4 && (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                disabled={isLoading}
              >
                <SparklesIcon className="w-4 h-4" />
                <span>{isLoading ? 'Generating...' : 'Generate Questions'}</span>
              </button>
            )}
            
            {currentStep === 5 && (
              <button
                onClick={handlePublish}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                disabled={isLoading}
              >
                <CheckIcon className="w-4 h-4" />
                <span>{isLoading ? 'Publishing...' : 'Publish Assessment'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentCreator;