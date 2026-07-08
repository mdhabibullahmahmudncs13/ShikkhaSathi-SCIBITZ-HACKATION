import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AssessmentBuilder } from '../../../components/teacher/AssessmentBuilder';
import { CustomAssessment } from '../../../types/teacher';

// Mock the hooks
vi.mock('../../../hooks/useAssessmentBuilder', () => ({
  useAssessmentBuilder: vi.fn(() => ({
    assessment: undefined,
    isLoading: false,
    isSaving: false,
    error: null,
    saveAssessment: vi.fn(),
    loadAssessment: vi.fn(),
    validateAssessment: vi.fn(),
    generateQuestionSuggestions: vi.fn(),
    duplicateAssessment: vi.fn()
  }))
}));

describe('AssessmentBuilder', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    onSave: mockOnSave,
    onCancel: mockOnCancel,
    isLoading: false
  };

  const mockAssessment: CustomAssessment = {
    id: 'test-assessment',
    title: 'Test Assessment',
    description: 'A test assessment',
    subject: 'Mathematics',
    grade: 8,
    bloomLevels: [1, 2, 3],
    topics: ['Algebra'],
    questionCount: 5,
    timeLimit: 60,
    difficulty: 'medium',
    assignedClasses: [],
    questions: [
      {
        id: '1',
        type: 'multiple_choice',
        question: 'What is 2 + 2?',
        options: ['3', '4', '5', '6'],
        correctAnswer: '4',
        explanation: 'Basic addition',
        bloomLevel: 1,
        topic: 'Arithmetic',
        difficulty: 1,
        points: 2
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders create mode correctly', () => {
      render(<AssessmentBuilder {...defaultProps} />);
      
      expect(screen.getByText('Create New Assessment')).toBeInTheDocument();
      expect(screen.getByText('Build comprehensive assessments with drag-and-drop question builder')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save assessment/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('renders edit mode correctly', () => {
      render(<AssessmentBuilder {...defaultProps} assessment={mockAssessment} />);
      
      expect(screen.getByText('Edit Assessment')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Assessment')).toBeInTheDocument();
      expect(screen.getByDisplayValue('A test assessment')).toBeInTheDocument();
    });

    it('renders all tabs', () => {
      render(<AssessmentBuilder {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /assessment details/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /questions/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /rubric/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument();
    });
  });

  describe('Assessment Details Tab', () => {
    it('allows editing basic information', async () => {
      const user = userEvent.setup();
      render(<AssessmentBuilder {...defaultProps} />);
      
      const titleInput = screen.getByPlaceholderText('Enter assessment title');
      const descriptionInput = screen.getByPlaceholderText('Describe the purpose and scope of this assessment');
      
      await user.type(titleInput, 'New Assessment Title');
      await user.type(descriptionInput, 'New assessment description');
      
      expect(titleInput).toHaveValue('New Assessment Title');
      expect(descriptionInput).toHaveValue('New assessment description');
    });

    it('validates required fields', async () => {
      const user = userEvent.setup();
      render(<AssessmentBuilder {...defaultProps} />);
      
      const saveButton = screen.getByRole('button', { name: /save assessment/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Assessment title is required')).toBeInTheDocument();
        expect(screen.getByText('Subject is required')).toBeInTheDocument();
      });
    });

    it('allows selecting subject and grade', async () => {
      const user = userEvent.setup();
      render(<AssessmentBuilder {...defaultProps} />);
      
      const subjectSelect = screen.getByDisplayValue('Select Subject');
      const gradeSelect = screen.getByDisplayValue('Grade 6');
      
      await user.selectOptions(subjectSelect, 'Mathematics');
      await user.selectOptions(gradeSelect, '8');
      
      expect(subjectSelect).toHaveValue('Mathematics');
      expect(gradeSelect).toHaveValue('8');
    });

    it('allows configuring assessment settings', async () => {
      const user = userEvent.setup();
      render(<AssessmentBuilder {...defaultProps} />);
      
      const questionCountInput = screen.getByDisplayValue('10');
      const timeLimitInput = screen.getByDisplayValue('60');
      const difficultySelect = screen.getByDisplayValue('Medium');
      
      await user.clear(questionCountInput);
      await user.type(questionCountInput, '15');
      
      await user.clear(timeLimitInput);
      await user.type(timeLimitInput, '90');
      
      await user.selectOptions(difficultySelect, 'hard');
      
      expect(questionCountInput).toHaveValue(15);
      expect(timeLimitInput).toHaveValue(90);
      expect(difficultySelect).toHaveValue('hard');
    });

    it('allows selecting Bloom\'s taxonomy levels', async () => {
      const user = userEvent.setup();
      render(<AssessmentBuilder {...defaultProps} />);
      
      const rememberCheckbox = screen.getByRole('checkbox', { name: /remember/i });
      const analyzeCheckbox = screen.getByRole('checkbox', { name: /analyze/i });
      
      expect(rememberCheckbox).toBeChecked(); // Default selection
      expect(analyzeCheckbox).not.toBeChecked();
      
      await user.click(analyzeCheckbox);
      expect(analyzeCheckbox).toBeChecked();
    });
  });

  describe('Questions Tab', () => {
    it('switches to questions tab', async () => {
      const user = userEvent.setup();
      render(<AssessmentBuilder {...defaultProps} />);
      
      const questionsTab = screen.getByRole('button', { name: /questions/i });
      await user.click(questionsTab);
      
      expect(screen.getByText('Questions (0)')).toBeInTheDocument();
      expect(screen.getByText('No questions yet')).toBeInTheDocument();
    });

    it('allows adding new questions', async () => {
      const user = userEvent.setup();
      render(<AssessmentBuilder {...defaultProps} />);
      
      // Switch to questions tab
      const questionsTab = screen.getByRole('button', { name: /questions/i });
      await user.click(questionsTab);
      
      // Add a question
      const addQuestionButton = screen.getByRole('button', { name: /add first question/i });
      await user.click(addQuestionButton);
      
      expect(screen.getByText('Questions (1)')).toBeInTheDocument();
      expect(screen.getByText('Question 1')).toBeInTheDocument();
    });

    it('allows editing question details', async () => {
      const user = userEvent.setup();
      render(<AssessmentBuilder {...defaultProps} assessment={mockAssessment} />);
      
      // Switch to questions tab
      const questionsTab = screen.getByRole('button', { name: /questions/i });
      await user.click(questionsTab);
      
      // Edit question text
      const questionTextarea = screen.getByDisplayValue('What is 2 + 2?');
      await user.clear(questionTextarea);
      await user.type(questionTextarea, 'What is 3 + 3?');
      
      expect(questionTextarea).toHaveValue('What is 3 + 3?');
    });

    it('shows question bank modal', async () => {
      const user = userEvent.setup();
      render(<AssessmentBuilder {...defaultProps} />);
      
      // Switch to questions tab
      const questionsTab = screen.getByRole('button', { name: /questions/i });
      await user.click(questionsTab);
      
      // Open question bank
      const questionBankButton = screen.getByRole('button', { name: /question bank/i });
      await user.click(questionBankButton);
      
      expect(screen.getByText('Question Bank')).toBeInTheDocument();
      expect(screen.getByText('Browse and add questions from the question bank')).toBeInTheDocument();
    });
  });

  describe('Rubric Tab', () => {
    it('switches to rubric tab and shows default criterion', async () => {
      const user = userEvent.setup();
      render(<AssessmentBuilder {...defaultProps} />);
      
      const rubricTab = screen.getByRole('button', { name: /rubric/i });
      await user.click(rubricTab);
      
      expect(screen.getByText('Assessment Rubric')).toBeInTheDocument();
      expect(screen.getByText('Criterion 1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Content Knowledge')).toBeInTheDocument();
    });

    it('allows adding new criteria', async () => {
      const user = userEvent.setup();
      render(<AssessmentBuilder {...defaultProps} />);
      
      const rubricTab = screen.getByRole('button', { name: /rubric/i });
      await user.click(rubricTab);
      
      const addCriterionButton = screen.getByRole('button', { name: /add criterion/i });
      await user.click(addCriterionButton);
      
      expect(screen.getByText('Criterion 2')).toBeInTheDocument();
    });
  });

  describe('Preview Tab', () => {
    it('shows assessment preview with statistics', async () => {
      const user = userEvent.setup();
      render(<AssessmentBuilder {...defaultProps} assessment={mockAssessment} />);
      
      const previewTab = screen.getByRole('button', { name: /preview/i });
      await user.click(previewTab);
      
      expect(screen.getByText('Test Assessment')).toBeInTheDocument();
      expect(screen.getByText('A test assessment')).toBeInTheDocument();
      expect(screen.getByText('Mathematics')).toBeInTheDocument();
      expect(screen.getByText('Grade 8')).toBeInTheDocument();
      expect(screen.getByText('60 minutes')).toBeInTheDocument();
    });

    it('shows question distribution', async () => {
      const user = userEvent.setup();
      render(<AssessmentBuilder {...defaultProps} assessment={mockAssessment} />);
      
      const previewTab = screen.getByRole('button', { name: /preview/i });
      await user.click(previewTab);
      
      expect(screen.getByText('Question Distribution')).toBeInTheDocument();
      expect(screen.getByText('Multiple Choice')).toBeInTheDocument();
    });

    it('shows questions preview', async () => {
      const user = userEvent.setup();
      render(<AssessmentBuilder {...defaultProps} assessment={mockAssessment} />);
      
      const previewTab = screen.getByRole('button', { name: /preview/i });
      await user.click(previewTab);
      
      expect(screen.getByText('Questions Preview')).toBeInTheDocument();
      expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();
      expect(screen.getByText('(2 points)')).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('shows validation errors for empty assessment', async () => {
      const user = userEvent.setup();
      render(<AssessmentBuilder {...defaultProps} />);
      
      const saveButton = screen.getByRole('button', { name: /save assessment/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please fix the following errors:')).toBeInTheDocument();
        expect(screen.getByText('Assessment title is required')).toBeInTheDocument();
        expect(screen.getByText('Subject is required')).toBeInTheDocument();
        expect(screen.getByText('At least one question is required')).toBeInTheDocument();
      });
    });

    it('disables save button when there are validation errors', async () => {
      render(<AssessmentBuilder {...defaultProps} />);
      
      const saveButton = screen.getByRole('button', { name: /save assessment/i });
      
      // Initially disabled due to validation errors
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Actions', () => {
    it('calls onSave when save button is clicked with valid data', async () => {
      const user = userEvent.setup();
      render(<AssessmentBuilder {...defaultProps} assessment={mockAssessment} />);
      
      const saveButton = screen.getByRole('button', { name: /save assessment/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Test Assessment',
          subject: 'Mathematics',
          questions: expect.arrayContaining([
            expect.objectContaining({
              question: 'What is 2 + 2?'
            })
          ])
        }));
      });
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<AssessmentBuilder {...defaultProps} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('shows loading state when saving', () => {
      render(<AssessmentBuilder {...defaultProps} isLoading={true} />);
      
      const saveButton = screen.getByRole('button', { name: /saving.../i });
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Question Types', () => {
    it('handles multiple choice questions correctly', async () => {
      const user = userEvent.setup();
      render(<AssessmentBuilder {...defaultProps} assessment={mockAssessment} />);
      
      // Switch to questions tab
      const questionsTab = screen.getByRole('button', { name: /questions/i });
      await user.click(questionsTab);
      
      // Check multiple choice options
      expect(screen.getByDisplayValue('3')).toBeInTheDocument();
      expect(screen.getByDisplayValue('4')).toBeInTheDocument();
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
      expect(screen.getByDisplayValue('6')).toBeInTheDocument();
    });

    it('allows changing question type', async () => {
      const user = userEvent.setup();
      render(<AssessmentBuilder {...defaultProps} assessment={mockAssessment} />);
      
      // Switch to questions tab
      const questionsTab = screen.getByRole('button', { name: /questions/i });
      await user.click(questionsTab);
      
      // Change question type
      const typeSelect = screen.getByDisplayValue('Multiple Choice');
      await user.selectOptions(typeSelect, 'true_false');
      
      expect(typeSelect).toHaveValue('true_false');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<AssessmentBuilder {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /save assessment/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<AssessmentBuilder {...defaultProps} />);
      
      const titleInput = screen.getByPlaceholderText('Enter assessment title');
      titleInput.focus();
      
      expect(titleInput).toHaveFocus();
      
      await user.tab();
      const descriptionInput = screen.getByPlaceholderText('Describe the purpose and scope of this assessment');
      expect(descriptionInput).toHaveFocus();
    });
  });
});