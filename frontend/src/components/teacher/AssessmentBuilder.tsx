import React, { useState, useCallback, useEffect } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  Search,
  Filter,
  Save,
  Eye,
  Clock,
  Users,
  BookOpen,
  Target,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';
import { CustomAssessment, AssessmentQuestion, AssessmentRubric, RubricCriterion } from '../../types/teacher';

interface AssessmentBuilderProps {
  assessment?: CustomAssessment;
  onSave: (assessment: CustomAssessment) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface QuestionBankItem {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  subject: string;
  topic: string;
  bloomLevel: number;
  difficulty: number;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  points: number;
  usageCount: number;
  averageScore: number;
}

interface QuestionBankFilters {
  subject?: string;
  topic?: string;
  bloomLevel?: number;
  difficulty?: number;
  type?: string;
  searchQuery?: string;
}

const BLOOM_LEVELS = [
  { level: 1, name: 'Remember', description: 'Recall facts and basic concepts' },
  { level: 2, name: 'Understand', description: 'Explain ideas or concepts' },
  { level: 3, name: 'Apply', description: 'Use information in new situations' },
  { level: 4, name: 'Analyze', description: 'Draw connections among ideas' },
  { level: 5, name: 'Evaluate', description: 'Justify a stand or decision' },
  { level: 6, name: 'Create', description: 'Produce new or original work' }
];

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice', icon: '○' },
  { value: 'true_false', label: 'True/False', icon: '✓' },
  { value: 'short_answer', label: 'Short Answer', icon: '✎' },
  { value: 'essay', label: 'Essay', icon: '📝' }
];

const DIFFICULTY_LEVELS = [
  { value: 1, label: 'Very Easy', color: 'bg-green-100 text-green-800' },
  { value: 2, label: 'Easy', color: 'bg-green-50 text-green-700' },
  { value: 3, label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 4, label: 'Hard', color: 'bg-orange-100 text-orange-800' },
  { value: 5, label: 'Very Hard', color: 'bg-red-100 text-red-800' }
];

export const AssessmentBuilder: React.FC<AssessmentBuilderProps> = ({
  assessment,
  onSave,
  onCancel,
  isLoading = false
}) => {
  // Assessment state
  const [assessmentData, setAssessmentData] = useState<CustomAssessment>({
    title: '',
    description: '',
    subject: '',
    grade: 6,
    bloomLevels: [1, 2, 3],
    topics: [],
    questionCount: 10,
    timeLimit: 60,
    difficulty: 'medium',
    assignedClasses: [],
    questions: [],
    ...assessment
  });

  // UI state
  const [activeTab, setActiveTab] = useState<'details' | 'questions' | 'rubric' | 'preview'>('details');
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [draggedQuestion, setDraggedQuestion] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Question bank state
  const [questionBank, setQuestionBank] = useState<QuestionBankItem[]>([]);
  const [questionBankFilters, setQuestionBankFilters] = useState<QuestionBankFilters>({});
  const [questionBankLoading, setQuestionBankLoading] = useState(false);

  // Mock question bank data (in real app, this would come from API)
  const mockQuestionBank: QuestionBankItem[] = [
    {
      id: '1',
      question: 'What is the capital of Bangladesh?',
      type: 'multiple_choice',
      subject: 'Geography',
      topic: 'Countries and Capitals',
      bloomLevel: 1,
      difficulty: 1,
      options: ['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi'],
      correctAnswer: 'Dhaka',
      explanation: 'Dhaka is the capital and largest city of Bangladesh.',
      points: 2,
      usageCount: 45,
      averageScore: 0.85
    },
    {
      id: '2',
      question: 'Explain the process of photosynthesis.',
      type: 'essay',
      subject: 'Biology',
      topic: 'Plant Biology',
      bloomLevel: 2,
      difficulty: 3,
      correctAnswer: 'Photosynthesis is the process by which plants convert light energy into chemical energy...',
      explanation: 'Students should explain the basic process including light reactions and Calvin cycle.',
      points: 10,
      usageCount: 23,
      averageScore: 0.72
    }
  ];

  // Load question bank
  useEffect(() => {
    setQuestionBankLoading(true);
    // Simulate API call
    setTimeout(() => {
      setQuestionBank(mockQuestionBank);
      setQuestionBankLoading(false);
    }, 1000);
  }, [questionBankFilters]);

  // Validation
  const validateAssessment = useCallback(() => {
    const errors: Record<string, string> = {};

    if (!assessmentData.title.trim()) {
      errors.title = 'Assessment title is required';
    }

    if (!assessmentData.subject.trim()) {
      errors.subject = 'Subject is required';
    }

    if (assessmentData.questions.length === 0) {
      errors.questions = 'At least one question is required';
    }

    if (assessmentData.timeLimit < 5) {
      errors.timeLimit = 'Time limit must be at least 5 minutes';
    }

    // Validate individual questions
    assessmentData.questions.forEach((question, index) => {
      if (!question.question.trim()) {
        errors[`question_${index}_text`] = `Question ${index + 1} text is required`;
      }

      if (question.type === 'multiple_choice' && (!question.options || question.options.length < 2)) {
        errors[`question_${index}_options`] = `Question ${index + 1} must have at least 2 options`;
      }

      if (!question.correctAnswer) {
        errors[`question_${index}_answer`] = `Question ${index + 1} must have a correct answer`;
      }

      if (question.points <= 0) {
        errors[`question_${index}_points`] = `Question ${index + 1} must have positive points`;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [assessmentData]);

  // Handle assessment data changes
  const updateAssessmentData = useCallback((updates: Partial<CustomAssessment>) => {
    setAssessmentData(prev => ({ ...prev, ...updates }));
  }, []);

  // Handle question changes
  const updateQuestion = useCallback((index: number, updates: Partial<AssessmentQuestion>) => {
    setAssessmentData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => i === index ? { ...q, ...updates } : q)
    }));
  }, []);

  // Add new question
  const addQuestion = useCallback((template?: Partial<AssessmentQuestion>) => {
    const newQuestion: AssessmentQuestion = {
      type: 'multiple_choice',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      explanation: '',
      bloomLevel: 1,
      topic: '',
      difficulty: 1,
      points: 2,
      ...template
    };

    setAssessmentData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  }, []);

  // Remove question
  const removeQuestion = useCallback((index: number) => {
    setAssessmentData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  }, []);

  // Add question from bank
  const addQuestionFromBank = useCallback((bankQuestion: QuestionBankItem) => {
    const newQuestion: AssessmentQuestion = {
      type: bankQuestion.type,
      question: bankQuestion.question,
      options: bankQuestion.options,
      correctAnswer: bankQuestion.correctAnswer,
      explanation: bankQuestion.explanation,
      bloomLevel: bankQuestion.bloomLevel,
      topic: bankQuestion.topic,
      difficulty: bankQuestion.difficulty,
      points: bankQuestion.points
    };

    addQuestion(newQuestion);
    setShowQuestionBank(false);
  }, [addQuestion]);

  // Handle drag and drop
  const handleDragStart = useCallback((index: number) => {
    setDraggedQuestion(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedQuestion === null) return;

    const questions = [...assessmentData.questions];
    const draggedItem = questions[draggedQuestion];
    
    questions.splice(draggedQuestion, 1);
    questions.splice(dropIndex, 0, draggedItem);

    setAssessmentData(prev => ({ ...prev, questions }));
    setDraggedQuestion(null);
  }, [draggedQuestion, assessmentData.questions]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!validateAssessment()) {
      return;
    }

    try {
      await onSave(assessmentData);
    } catch (error) {
      console.error('Failed to save assessment:', error);
    }
  }, [assessmentData, validateAssessment, onSave]);

  // Filter question bank
  const filteredQuestionBank = questionBank.filter(question => {
    if (questionBankFilters.subject && question.subject !== questionBankFilters.subject) return false;
    if (questionBankFilters.topic && question.topic !== questionBankFilters.topic) return false;
    if (questionBankFilters.bloomLevel && question.bloomLevel !== questionBankFilters.bloomLevel) return false;
    if (questionBankFilters.difficulty && question.difficulty !== questionBankFilters.difficulty) return false;
    if (questionBankFilters.type && question.type !== questionBankFilters.type) return false;
    if (questionBankFilters.searchQuery) {
      const query = questionBankFilters.searchQuery.toLowerCase();
      return question.question.toLowerCase().includes(query) ||
             question.topic.toLowerCase().includes(query) ||
             question.subject.toLowerCase().includes(query);
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {assessment ? 'Edit Assessment' : 'Create New Assessment'}
          </h1>
          <p className="text-gray-600 mt-1">
            Build comprehensive assessments with drag-and-drop question builder
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || Object.keys(validationErrors).length > 0}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{isLoading ? 'Saving...' : 'Save Assessment'}</span>
          </button>
        </div>
      </div>

      {/* Validation Errors */}
      {Object.keys(validationErrors).length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h3 className="font-medium text-red-800">Please fix the following errors:</h3>
          </div>
          <ul className="list-disc list-inside space-y-1 text-red-700">
            {Object.values(validationErrors).map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'details', label: 'Assessment Details', icon: BookOpen },
            { id: 'questions', label: 'Questions', icon: Target },
            { id: 'rubric', label: 'Rubric', icon: CheckCircle },
            { id: 'preview', label: 'Preview', icon: Eye }
          ].map(({ id, label, icon: Icon }) => (
            <button
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
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'details' && (
          <AssessmentDetailsTab
            assessmentData={assessmentData}
            updateAssessmentData={updateAssessmentData}
            validationErrors={validationErrors}
          />
        )}

        {activeTab === 'questions' && (
          <QuestionsTab
            questions={assessmentData.questions}
            updateQuestion={updateQuestion}
            addQuestion={addQuestion}
            removeQuestion={removeQuestion}
            addQuestionFromBank={addQuestionFromBank}
            showQuestionBank={showQuestionBank}
            setShowQuestionBank={setShowQuestionBank}
            questionBank={filteredQuestionBank}
            questionBankFilters={questionBankFilters}
            setQuestionBankFilters={setQuestionBankFilters}
            questionBankLoading={questionBankLoading}
            handleDragStart={handleDragStart}
            handleDragOver={handleDragOver}
            handleDrop={handleDrop}
            draggedQuestion={draggedQuestion}
            validationErrors={validationErrors}
          />
        )}

        {activeTab === 'rubric' && (
          <RubricTab
            rubric={assessmentData.rubric}
            updateRubric={(rubric) => updateAssessmentData({ rubric })}
          />
        )}

        {activeTab === 'preview' && (
          <PreviewTab assessment={assessmentData} />
        )}
      </div>

      {/* Question Bank Modal */}
      {showQuestionBank && (
        <QuestionBankModal
          questionBank={filteredQuestionBank}
          filters={questionBankFilters}
          setFilters={setQuestionBankFilters}
          loading={questionBankLoading}
          onAddQuestion={addQuestionFromBank}
          onClose={() => setShowQuestionBank(false)}
        />
      )}
    </div>
  );
};

// Assessment Details Tab Component
interface AssessmentDetailsTabProps {
  assessmentData: CustomAssessment;
  updateAssessmentData: (updates: Partial<CustomAssessment>) => void;
  validationErrors: Record<string, string>;
}

const AssessmentDetailsTab: React.FC<AssessmentDetailsTabProps> = ({
  assessmentData,
  updateAssessmentData,
  validationErrors
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assessment Title *
          </label>
          <input
            type="text"
            value={assessmentData.title}
            onChange={(e) => updateAssessmentData({ title: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              validationErrors.title ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter assessment title"
          />
          {validationErrors.title && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.title}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={assessmentData.description}
            onChange={(e) => updateAssessmentData({ description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe the purpose and scope of this assessment"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject *
            </label>
            <select
              value={assessmentData.subject}
              onChange={(e) => updateAssessmentData({ subject: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                validationErrors.subject ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select Subject</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Science">Science</option>
              <option value="English">English</option>
              <option value="Bangla">Bangla</option>
              <option value="Social Studies">Social Studies</option>
              <option value="Geography">Geography</option>
              <option value="History">History</option>
            </select>
            {validationErrors.subject && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.subject}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grade Level
            </label>
            <select
              value={assessmentData.grade}
              onChange={(e) => updateAssessmentData({ grade: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {[6, 7, 8, 9, 10, 11, 12].map(grade => (
                <option key={grade} value={grade}>Grade {grade}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Assessment Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Assessment Settings</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question Count
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={assessmentData.questionCount}
              onChange={(e) => updateAssessmentData({ questionCount: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Limit (minutes)
            </label>
            <input
              type="number"
              min="5"
              max="180"
              value={assessmentData.timeLimit}
              onChange={(e) => updateAssessmentData({ timeLimit: parseInt(e.target.value) || 5 })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                validationErrors.timeLimit ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {validationErrors.timeLimit && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.timeLimit}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Difficulty Level
          </label>
          <select
            value={assessmentData.difficulty}
            onChange={(e) => updateAssessmentData({ difficulty: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="adaptive">Adaptive</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bloom's Taxonomy Levels
          </label>
          <div className="space-y-2">
            {BLOOM_LEVELS.map(level => (
              <label key={level.level} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={assessmentData.bloomLevels.includes(level.level)}
                  onChange={(e) => {
                    const bloomLevels = e.target.checked
                      ? [...assessmentData.bloomLevels, level.level]
                      : assessmentData.bloomLevels.filter(l => l !== level.level);
                    updateAssessmentData({ bloomLevels });
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">
                  <span className="font-medium">{level.name}</span>
                  <span className="text-gray-500 ml-1">- {level.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentBuilder;
// Questions Tab Component
interface QuestionsTabProps {
  questions: AssessmentQuestion[];
  updateQuestion: (index: number, updates: Partial<AssessmentQuestion>) => void;
  addQuestion: (template?: Partial<AssessmentQuestion>) => void;
  removeQuestion: (index: number) => void;
  addQuestionFromBank: (question: QuestionBankItem) => void;
  showQuestionBank: boolean;
  setShowQuestionBank: (show: boolean) => void;
  questionBank: QuestionBankItem[];
  questionBankFilters: QuestionBankFilters;
  setQuestionBankFilters: (filters: QuestionBankFilters) => void;
  questionBankLoading: boolean;
  handleDragStart: (index: number) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, index: number) => void;
  draggedQuestion: number | null;
  validationErrors: Record<string, string>;
}

const QuestionsTab: React.FC<QuestionsTabProps> = ({
  questions,
  updateQuestion,
  addQuestion,
  removeQuestion,
  setShowQuestionBank,
  handleDragStart,
  handleDragOver,
  handleDrop,
  draggedQuestion,
  validationErrors
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Questions ({questions.length})</h3>
          <p className="text-sm text-gray-600">Drag and drop to reorder questions</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowQuestionBank(true)}
            className="flex items-center space-x-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>Question Bank</span>
          </button>
          <button
            onClick={() => addQuestion()}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No questions yet</h3>
            <p className="text-gray-600 mb-4">Start building your assessment by adding questions</p>
            <button
              onClick={() => addQuestion()}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Question</span>
            </button>
          </div>
        ) : (
          questions.map((question, index) => (
            <QuestionEditor
              key={index}
              question={question}
              index={index}
              updateQuestion={updateQuestion}
              removeQuestion={removeQuestion}
              handleDragStart={handleDragStart}
              handleDragOver={handleDragOver}
              handleDrop={handleDrop}
              isDragged={draggedQuestion === index}
              validationErrors={validationErrors}
            />
          ))
        )}
      </div>
    </div>
  );
};

// Question Editor Component
interface QuestionEditorProps {
  question: AssessmentQuestion;
  index: number;
  updateQuestion: (index: number, updates: Partial<AssessmentQuestion>) => void;
  removeQuestion: (index: number) => void;
  handleDragStart: (index: number) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, index: number) => void;
  isDragged: boolean;
  validationErrors: Record<string, string>;
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  index,
  updateQuestion,
  removeQuestion,
  handleDragStart,
  handleDragOver,
  handleDrop,
  isDragged,
  validationErrors
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const questionTypeIcon = QUESTION_TYPES.find(t => t.value === question.type)?.icon || '?';
  const difficultyLevel = DIFFICULTY_LEVELS.find(d => d.value === question.difficulty);
  const bloomLevel = BLOOM_LEVELS.find(b => b.level === question.bloomLevel);

  return (
    <div
      draggable
      onDragStart={() => handleDragStart(index)}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, index)}
      className={`bg-white border rounded-lg shadow-sm transition-all ${
        isDragged ? 'opacity-50 scale-95' : 'hover:shadow-md'
      }`}
    >
      {/* Question Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
          <div className="flex items-center space-x-2">
            <span className="text-lg font-mono">{questionTypeIcon}</span>
            <span className="font-medium text-gray-900">Question {index + 1}</span>
            <span className={`px-2 py-1 text-xs rounded-full ${difficultyLevel?.color || 'bg-gray-100 text-gray-800'}`}>
              {difficultyLevel?.label}
            </span>
            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
              {bloomLevel?.name}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {isExpanded ? <X className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={() => removeQuestion(index)}
            className="p-1 text-red-400 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Question Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Question Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question Text *
            </label>
            <textarea
              value={question.question}
              onChange={(e) => updateQuestion(index, { question: e.target.value })}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                validationErrors[`question_${index}_text`] ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter your question here..."
            />
            {validationErrors[`question_${index}_text`] && (
              <p className="mt-1 text-sm text-red-600">{validationErrors[`question_${index}_text`]}</p>
            )}
          </div>

          {/* Question Settings */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={question.type}
                onChange={(e) => updateQuestion(index, { type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {QUESTION_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bloom's Level</label>
              <select
                value={question.bloomLevel}
                onChange={(e) => updateQuestion(index, { bloomLevel: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {BLOOM_LEVELS.map(level => (
                  <option key={level.level} value={level.level}>{level.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select
                value={question.difficulty}
                onChange={(e) => updateQuestion(index, { difficulty: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {DIFFICULTY_LEVELS.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
              <input
                type="number"
                min="1"
                max="20"
                value={question.points}
                onChange={(e) => updateQuestion(index, { points: parseInt(e.target.value) || 1 })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors[`question_${index}_points`] ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {validationErrors[`question_${index}_points`] && (
                <p className="mt-1 text-sm text-red-600">{validationErrors[`question_${index}_points`]}</p>
              )}
            </div>
          </div>

          {/* Question Type Specific Fields */}
          {question.type === 'multiple_choice' && (
            <MultipleChoiceEditor
              question={question}
              index={index}
              updateQuestion={updateQuestion}
              validationErrors={validationErrors}
            />
          )}

          {question.type === 'true_false' && (
            <TrueFalseEditor
              question={question}
              index={index}
              updateQuestion={updateQuestion}
              validationErrors={validationErrors}
            />
          )}

          {(question.type === 'short_answer' || question.type === 'essay') && (
            <OpenEndedEditor
              question={question}
              index={index}
              updateQuestion={updateQuestion}
              validationErrors={validationErrors}
            />
          )}

          {/* Explanation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Explanation (Optional)
            </label>
            <textarea
              value={question.explanation}
              onChange={(e) => updateQuestion(index, { explanation: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Provide an explanation for the correct answer..."
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Multiple Choice Editor
interface MultipleChoiceEditorProps {
  question: AssessmentQuestion;
  index: number;
  updateQuestion: (index: number, updates: Partial<AssessmentQuestion>) => void;
  validationErrors: Record<string, string>;
}

const MultipleChoiceEditor: React.FC<MultipleChoiceEditorProps> = ({
  question,
  index,
  updateQuestion,
  validationErrors
}) => {
  const options = question.options || ['', '', '', ''];

  const updateOption = (optionIndex: number, value: string) => {
    const newOptions = [...options];
    newOptions[optionIndex] = value;
    updateQuestion(index, { options: newOptions });
  };

  const addOption = () => {
    updateQuestion(index, { options: [...options, ''] });
  };

  const removeOption = (optionIndex: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== optionIndex);
      updateQuestion(index, { options: newOptions });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">Answer Options *</label>
        <button
          onClick={addOption}
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          + Add Option
        </button>
      </div>
      
      <div className="space-y-2">
        {options.map((option, optionIndex) => (
          <div key={optionIndex} className="flex items-center space-x-3">
            <input
              type="radio"
              name={`question_${index}_correct`}
              checked={question.correctAnswer === option}
              onChange={() => updateQuestion(index, { correctAnswer: option })}
              className="text-blue-600 focus:ring-blue-500"
            />
            <input
              type="text"
              value={option}
              onChange={(e) => updateOption(optionIndex, e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={`Option ${optionIndex + 1}`}
            />
            {options.length > 2 && (
              <button
                onClick={() => removeOption(optionIndex)}
                className="p-1 text-red-400 hover:text-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      
      {validationErrors[`question_${index}_options`] && (
        <p className="text-sm text-red-600">{validationErrors[`question_${index}_options`]}</p>
      )}
      {validationErrors[`question_${index}_answer`] && (
        <p className="text-sm text-red-600">{validationErrors[`question_${index}_answer`]}</p>
      )}
    </div>
  );
};

// True/False Editor
interface TrueFalseEditorProps {
  question: AssessmentQuestion;
  index: number;
  updateQuestion: (index: number, updates: Partial<AssessmentQuestion>) => void;
  validationErrors: Record<string, string>;
}

const TrueFalseEditor: React.FC<TrueFalseEditorProps> = ({
  question,
  index,
  updateQuestion,
  validationErrors
}) => {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">Correct Answer *</label>
      <div className="flex items-center space-x-6">
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            name={`question_${index}_tf`}
            checked={question.correctAnswer === 'true'}
            onChange={() => updateQuestion(index, { correctAnswer: 'true' })}
            className="text-blue-600 focus:ring-blue-500"
          />
          <span>True</span>
        </label>
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            name={`question_${index}_tf`}
            checked={question.correctAnswer === 'false'}
            onChange={() => updateQuestion(index, { correctAnswer: 'false' })}
            className="text-blue-600 focus:ring-blue-500"
          />
          <span>False</span>
        </label>
      </div>
      {validationErrors[`question_${index}_answer`] && (
        <p className="text-sm text-red-600">{validationErrors[`question_${index}_answer`]}</p>
      )}
    </div>
  );
};

// Open Ended Editor
interface OpenEndedEditorProps {
  question: AssessmentQuestion;
  index: number;
  updateQuestion: (index: number, updates: Partial<AssessmentQuestion>) => void;
  validationErrors: Record<string, string>;
}

const OpenEndedEditor: React.FC<OpenEndedEditorProps> = ({
  question,
  index,
  updateQuestion,
  validationErrors
}) => {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Sample Answer / Grading Criteria *
      </label>
      <textarea
        value={question.correctAnswer as string}
        onChange={(e) => updateQuestion(index, { correctAnswer: e.target.value })}
        rows={question.type === 'essay' ? 4 : 2}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          validationErrors[`question_${index}_answer`] ? 'border-red-300' : 'border-gray-300'
        }`}
        placeholder={
          question.type === 'essay'
            ? 'Provide a sample answer or detailed grading criteria...'
            : 'Provide expected keywords or sample answers...'
        }
      />
      {validationErrors[`question_${index}_answer`] && (
        <p className="text-sm text-red-600">{validationErrors[`question_${index}_answer`]}</p>
      )}
    </div>
  );
};

// Rubric Tab Component
interface RubricTabProps {
  rubric?: AssessmentRubric;
  updateRubric: (rubric: AssessmentRubric) => void;
}

const RubricTab: React.FC<RubricTabProps> = ({ rubric, updateRubric }) => {
  const [localRubric, setLocalRubric] = useState<AssessmentRubric>(
    rubric || {
      criteria: [
        {
          name: 'Content Knowledge',
          description: 'Demonstrates understanding of key concepts',
          weight: 40,
          levels: [
            { name: 'Excellent', description: 'Complete understanding', points: 4 },
            { name: 'Good', description: 'Good understanding', points: 3 },
            { name: 'Fair', description: 'Basic understanding', points: 2 },
            { name: 'Poor', description: 'Limited understanding', points: 1 }
          ]
        }
      ],
      totalPoints: 100
    }
  );

  useEffect(() => {
    updateRubric(localRubric);
  }, [localRubric, updateRubric]);

  const addCriterion = () => {
    setLocalRubric(prev => ({
      ...prev,
      criteria: [
        ...prev.criteria,
        {
          name: '',
          description: '',
          weight: 20,
          levels: [
            { name: 'Excellent', description: '', points: 4 },
            { name: 'Good', description: '', points: 3 },
            { name: 'Fair', description: '', points: 2 },
            { name: 'Poor', description: '', points: 1 }
          ]
        }
      ]
    }));
  };

  const removeCriterion = (index: number) => {
    setLocalRubric(prev => ({
      ...prev,
      criteria: prev.criteria.filter((_, i) => i !== index)
    }));
  };

  const updateCriterion = (index: number, updates: Partial<RubricCriterion>) => {
    setLocalRubric(prev => ({
      ...prev,
      criteria: prev.criteria.map((criterion, i) =>
        i === index ? { ...criterion, ...updates } : criterion
      )
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Assessment Rubric</h3>
          <p className="text-sm text-gray-600">Define scoring criteria for consistent grading</p>
        </div>
        <button
          onClick={addCriterion}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Criterion</span>
        </button>
      </div>

      <div className="space-y-6">
        {localRubric.criteria.map((criterion, index) => (
          <div key={index} className="bg-white border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900">Criterion {index + 1}</h4>
              <button
                onClick={() => removeCriterion(index)}
                className="p-1 text-red-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Criterion Name
                </label>
                <input
                  type="text"
                  value={criterion.name}
                  onChange={(e) => updateCriterion(index, { name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Content Knowledge"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={criterion.description}
                  onChange={(e) => updateCriterion(index, { description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Brief description of this criterion"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={criterion.weight}
                  onChange={(e) => updateCriterion(index, { weight: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="font-medium text-gray-900">Performance Levels</h5>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                {criterion.levels.map((level, levelIndex) => (
                  <div key={levelIndex} className="border rounded-lg p-3">
                    <div className="mb-2">
                      <input
                        type="text"
                        value={level.name}
                        onChange={(e) => {
                          const newLevels = [...criterion.levels];
                          newLevels[levelIndex] = { ...level, name: e.target.value };
                          updateCriterion(index, { levels: newLevels });
                        }}
                        className="w-full px-2 py-1 text-sm font-medium border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Level name"
                      />
                    </div>
                    <div className="mb-2">
                      <textarea
                        value={level.description}
                        onChange={(e) => {
                          const newLevels = [...criterion.levels];
                          newLevels[levelIndex] = { ...level, description: e.target.value };
                          updateCriterion(index, { levels: newLevels });
                        }}
                        rows={2}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Description"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={level.points}
                        onChange={(e) => {
                          const newLevels = [...criterion.levels];
                          newLevels[levelIndex] = { ...level, points: parseInt(e.target.value) || 0 };
                          updateCriterion(index, { levels: newLevels });
                        }}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Points"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {localRubric.criteria.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No rubric criteria</h3>
          <p className="text-gray-600 mb-4">Add criteria to create a comprehensive grading rubric</p>
          <button
            onClick={addCriterion}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Criterion</span>
          </button>
        </div>
      )}
    </div>
  );
};

// Preview Tab Component
interface PreviewTabProps {
  assessment: CustomAssessment;
}

const PreviewTab: React.FC<PreviewTabProps> = ({ assessment }) => {
  const totalPoints = assessment.questions.reduce((sum, q) => sum + q.points, 0);
  const bloomDistribution = BLOOM_LEVELS.map(level => ({
    ...level,
    count: assessment.questions.filter(q => q.bloomLevel === level.level).length
  }));

  return (
    <div className="space-y-6">
      {/* Assessment Overview */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-xl font-bold text-blue-900 mb-2">{assessment.title}</h3>
        {assessment.description && (
          <p className="text-blue-800 mb-4">{assessment.description}</p>
        )}
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-blue-600">Subject</p>
              <p className="font-medium text-blue-900">{assessment.subject}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-blue-600">Grade</p>
              <p className="font-medium text-blue-900">Grade {assessment.grade}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-blue-600">Time Limit</p>
              <p className="font-medium text-blue-900">{assessment.timeLimit} minutes</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-blue-600">Total Points</p>
              <p className="font-medium text-blue-900">{totalPoints}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Assessment Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4">Question Distribution</h4>
          <div className="space-y-3">
            {QUESTION_TYPES.map(type => {
              const count = assessment.questions.filter(q => q.type === type.value).length;
              return (
                <div key={type.value} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{type.label}</span>
                  <span className="font-medium">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4">Bloom's Taxonomy Distribution</h4>
          <div className="space-y-3">
            {bloomDistribution.map(level => (
              <div key={level.level} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{level.name}</span>
                <span className="font-medium">{level.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Questions Preview */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Questions Preview</h4>
        <div className="space-y-6">
          {assessment.questions.map((question, index) => (
            <div key={index} className="border-l-4 border-blue-500 pl-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-medium text-gray-900">Question {index + 1}</span>
                <span className="text-sm text-gray-500">({question.points} points)</span>
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                  {BLOOM_LEVELS.find(b => b.level === question.bloomLevel)?.name}
                </span>
              </div>
              
              <p className="text-gray-800 mb-3">{question.question}</p>
              
              {question.type === 'multiple_choice' && question.options && (
                <div className="space-y-1">
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {String.fromCharCode(65 + optionIndex)}.
                      </span>
                      <span className={`text-sm ${
                        option === question.correctAnswer ? 'text-green-600 font-medium' : 'text-gray-700'
                      }`}>
                        {option}
                      </span>
                      {option === question.correctAnswer && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {question.type === 'true_false' && (
                <div className="text-sm">
                  <span className="text-gray-600">Correct Answer: </span>
                  <span className="font-medium text-green-600">
                    {question.correctAnswer === 'true' ? 'True' : 'False'}
                  </span>
                </div>
              )}
              
              {question.explanation && (
                <div className="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-700">
                  <strong>Explanation:</strong> {question.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Question Bank Modal Component
interface QuestionBankModalProps {
  questionBank: QuestionBankItem[];
  filters: QuestionBankFilters;
  setFilters: (filters: QuestionBankFilters) => void;
  loading: boolean;
  onAddQuestion: (question: QuestionBankItem) => void;
  onClose: () => void;
}

const QuestionBankModal: React.FC<QuestionBankModalProps> = ({
  questionBank,
  filters,
  setFilters,
  loading,
  onAddQuestion,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Question Bank</h2>
            <p className="text-gray-600">Browse and add questions from the question bank</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <input
                type="text"
                placeholder="Search questions..."
                value={filters.searchQuery || ''}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <select
              value={filters.subject || ''}
              onChange={(e) => setFilters({ ...filters, subject: e.target.value || undefined })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Subjects</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Science">Science</option>
              <option value="English">English</option>
              <option value="Geography">Geography</option>
            </select>
            
            <select
              value={filters.type || ''}
              onChange={(e) => setFilters({ ...filters, type: e.target.value || undefined })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              {QUESTION_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            
            <select
              value={filters.bloomLevel || ''}
              onChange={(e) => setFilters({ ...filters, bloomLevel: e.target.value ? parseInt(e.target.value) : undefined })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Bloom Levels</option>
              {BLOOM_LEVELS.map(level => (
                <option key={level.level} value={level.level}>{level.name}</option>
              ))}
            </select>
            
            <select
              value={filters.difficulty || ''}
              onChange={(e) => setFilters({ ...filters, difficulty: e.target.value ? parseInt(e.target.value) : undefined })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Difficulties</option>
              {DIFFICULTY_LEVELS.map(level => (
                <option key={level.value} value={level.value}>{level.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Question List */}
        <div className="p-6 overflow-y-auto max-h-96">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading questions...</p>
            </div>
          ) : questionBank.length === 0 ? (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No questions found</h3>
              <p className="text-gray-600">Try adjusting your filters to find more questions</p>
            </div>
          ) : (
            <div className="space-y-4">
              {questionBank.map((question) => (
                <div key={question.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg font-mono">
                          {QUESTION_TYPES.find(t => t.value === question.type)?.icon}
                        </span>
                        <span className="text-sm text-gray-600">{question.subject} • {question.topic}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          DIFFICULTY_LEVELS.find(d => d.value === question.difficulty)?.color
                        }`}>
                          {DIFFICULTY_LEVELS.find(d => d.value === question.difficulty)?.label}
                        </span>
                        <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                          {BLOOM_LEVELS.find(b => b.level === question.bloomLevel)?.name}
                        </span>
                      </div>
                      
                      <p className="text-gray-800 mb-2">{question.question}</p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Used {question.usageCount} times</span>
                        <span>Avg. Score: {Math.round(question.averageScore * 100)}%</span>
                        <span>{question.points} points</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => onAddQuestion(question)}
                      className="ml-4 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};