import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AssessmentPublisher } from '../../../components/teacher/AssessmentPublisher';
import { CustomAssessment } from '../../../types/teacher';

// Mock the hooks
vi.mock('../../../hooks/useAssessmentPublisher', () => ({
  useAssessmentPublisher: vi.fn(() => ({
    assessment: undefined,
    isLoading: false,
    isPublishing: false,
    error: null,
    publishAssessment: vi.fn(),
    loadAssessment: vi.fn(),
    validatePublishData: vi.fn(),
    scheduleReminders: vi.fn()
  }))
}));

describe('AssessmentPublisher', () => {
  const mockOnPublish = vi.fn();
  const mockOnCancel = vi.fn();

  const mockAssessment: CustomAssessment = {
    id: 'test-assessment',
    title: 'Test Assessment',
    description: 'A test assessment for publishing',
    subject: 'Mathematics',
    grade: 8,
    bloomLevels: [1, 2, 3],
    topics: ['Algebra'],
    questionCount: 10,
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
      },
      {
        id: '2',
        type: 'short_answer',
        question: 'Explain the Pythagorean theorem.',
        correctAnswer: 'a² + b² = c²',
        explanation: 'The theorem relates the sides of a right triangle',
        bloomLevel: 2,
        topic: 'Geometry',
        difficulty: 3,
        points: 5
      }
    ]
  };

  const defaultProps = {
    assessment: mockAssessment,
    onPublish: mockOnPublish,
    onCancel: mockOnCancel,
    isLoading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders publish interface correctly', () => {
      render(<AssessmentPublisher {...defaultProps} />);
      
      expect(screen.getByText('Publish Assessment')).toBeInTheDocument();
      expect(screen.getByText('Configure and publish "Test Assessment" to students')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /publish assessment/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('renders all tabs', () => {
      render(<AssessmentPublisher {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /assignment/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /schedule/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /review/i })).toBeInTheDocument();
    });

    it('shows validation errors when no assignments are made', () => {
      render(<AssessmentPublisher {...defaultProps} />);
      
      expect(screen.getByText('Please assign the assessment to at least one class or student')).toBeInTheDocument();
    });

    it('disables publish button when there are validation errors', () => {
      render(<AssessmentPublisher {...defaultProps} />);
      
      const publishButton = screen.getByRole('button', { name: /publish assessment/i });
      expect(publishButton).toBeDisabled();
    });
  });

  describe('Assignment Tab', () => {
    it('allows selecting classes', async () => {
      const user = userEvent.setup();
      render(<AssessmentPublisher {...defaultProps} />);
      
      // Expand classes section
      const classesButton = screen.getByText('Classes');
      await user.click(classesButton);
      
      // Select a class
      const classCheckbox = screen.getByRole('checkbox', { name: /grade 8a mathematics/i });
      await user.click(classCheckbox);
      
      expect(classCheckbox).toBeChecked();
    });

    it('allows selecting individual students', async () => {
      const user = userEvent.setup();
      render(<AssessmentPublisher {...defaultProps} />);
      
      // Expand students section
      const studentsButton = screen.getByText('Individual Students');
      await user.click(studentsButton);
      
      // Select a student
      const studentCheckbox = screen.getByRole('checkbox', { name: /ahmed rahman/i });
      await user.click(studentCheckbox);
      
      expect(studentCheckbox).toBeChecked();
    });

    it('shows assignment summary when selections are made', async () => {
      const user = userEvent.setup();
      render(<AssessmentPublisher {...defaultProps} />);
      
      // Expand and select a class
      const classesButton = screen.getByText('Classes');
      await user.click(classesButton);
      
      const classCheckbox = screen.getByRole('checkbox', { name: /grade 8a mathematics/i });
      await user.click(classCheckbox);
      
      expect(screen.getByText('Assignment Summary')).toBeInTheDocument();
      expect(screen.getByText('1 classes selected')).toBeInTheDocument();
    });

    it('provides search functionality for students', async () => {
      const user = userEvent.setup();
      render(<AssessmentPublisher {...defaultProps} />);
      
      // Expand students section
      const studentsButton = screen.getByText('Individual Students');
      await user.click(studentsButton);
      
      const searchInput = screen.getByPlaceholderText('Search students...');
      expect(searchInput).toBeInTheDocument();
      
      await user.type(searchInput, 'Ahmed');
      expect(searchInput).toHaveValue('Ahmed');
    });
  });

  describe('Schedule Tab', () => {
    it('switches to schedule tab and shows date inputs', async () => {
      const user = userEvent.setup();
      render(<AssessmentPublisher {...defaultProps} />);
      
      const scheduleTab = screen.getByRole('button', { name: /schedule/i });
      await user.click(scheduleTab);
      
      expect(screen.getByText('Schedule Assessment')).toBeInTheDocument();
      expect(screen.getByLabelText(/available from/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
    });

    it('allows setting availability window', async () => {
      const user = userEvent.setup();
      render(<AssessmentPublisher {...defaultProps} />);
      
      const scheduleTab = screen.getByRole('button', { name: /schedule/i });
      await user.click(scheduleTab);
      
      // Set time range
      const startTimeInput = screen.getByDisplayValue('');
      await user.type(startTimeInput, '09:00');
      
      expect(startTimeInput).toHaveValue('09:00');
    });

    it('allows selecting allowed days', async () => {
      const user = userEvent.setup();
      render(<AssessmentPublisher {...defaultProps} />);
      
      const scheduleTab = screen.getByRole('button', { name: /schedule/i });
      await user.click(scheduleTab);
      
      // Monday should be selected by default
      const mondayCheckbox = screen.getByRole('checkbox', { name: /monday/i });
      expect(mondayCheckbox).toBeChecked();
      
      // Uncheck Monday
      await user.click(mondayCheckbox);
      expect(mondayCheckbox).not.toBeChecked();
    });

    it('shows schedule summary', async () => {
      const user = userEvent.setup();
      render(<AssessmentPublisher {...defaultProps} />);
      
      const scheduleTab = screen.getByRole('button', { name: /schedule/i });
      await user.click(scheduleTab);
      
      expect(screen.getByText('Schedule Summary')).toBeInTheDocument();
      expect(screen.getByText('Available immediately')).toBeInTheDocument();
    });
  });

  describe('Settings Tab', () => {
    it('switches to settings tab and shows configuration options', async () => {
      const user = userEvent.setup();
      render(<AssessmentPublisher {...defaultProps} />);
      
      const settingsTab = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsTab);
      
      expect(screen.getByText('Assessment Settings')).toBeInTheDocument();
      expect(screen.getByText('Allow Retakes')).toBeInTheDocument();
      expect(screen.getByText('Show Results Immediately')).toBeInTheDocument();
    });

    it('allows toggling retakes setting', async () => {
      const user = userEvent.setup();
      render(<AssessmentPublisher {...defaultProps} />);
      
      const settingsTab = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsTab);
      
      // Find the retakes toggle (it's a hidden checkbox with a custom UI)
      const retakesToggle = screen.getByRole('checkbox', { name: '' });
      
      // Initially should be unchecked (allow retakes is false by default)
      expect(retakesToggle).not.toBeChecked();
      
      await user.click(retakesToggle);
      expect(retakesToggle).toBeChecked();
    });

    it('shows max attempts input when retakes are enabled', async () => {
      const user = userEvent.setup();
      render(<AssessmentPublisher {...defaultProps} />);
      
      const settingsTab = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsTab);
      
      // Enable retakes first
      const retakesToggle = screen.getByRole('checkbox', { name: '' });
      await user.click(retakesToggle);
      
      // Max attempts input should appear
      expect(screen.getByLabelText(/maximum attempts/i)).toBeInTheDocument();
    });

    it('allows configuring question and display settings', async () => {
      const user = userEvent.setup();
      render(<AssessmentPublisher {...defaultProps} />);
      
      const settingsTab = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsTab);
      
      expect(screen.getByText('Shuffle Questions')).toBeInTheDocument();
      expect(screen.getByText('Shuffle Answer Options')).toBeInTheDocument();
      expect(screen.getByText('Show Progress Bar')).toBeInTheDocument();
    });
  });

  describe('Notifications Tab', () => {
    it('switches to notifications tab and shows notification options', async () => {
      const user = userEvent.setup();
      render(<AssessmentPublisher {...defaultProps} />);
      
      const notificationsTab = screen.getByRole('button', { name: /notifications/i });
      await user.click(notificationsTab);
      
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Notify Students')).toBeInTheDocument();
      expect(screen.getByText('Notify Parents')).toBeInTheDocument();
    });

    it('allows selecting reminder schedule', async () => {
      const user = userEvent.setup();
      render(<AssessmentPublisher {...defaultProps} />);
      
      const notificationsTab = screen.getByRole('button', { name: /notifications/i });
      await user.click(notificationsTab);
      
      // 1 day before should be selected by default
      const oneDayCheckbox = screen.getByRole('checkbox', { name: /1 day before/i });
      expect(oneDayCheckbox).toBeChecked();
      
      // Select additional reminder
      const threeDaysCheckbox = screen.getByRole('checkbox', { name: /3 days before/i });
      await user.click(threeDaysCheckbox);
      expect(threeDaysCheckbox).toBeChecked();
    });

    it('allows entering custom message', async () => {
      const user = userEvent.setup();
      render(<AssessmentPublisher {...defaultProps} />);
      
      const notificationsTab = screen.getByRole('button', { name: /notifications/i });
      await user.click(notificationsTab);
      
      const customMessageTextarea = screen.getByPlaceholderText(/enter a custom message/i);
      await user.type(customMessageTextarea, 'Please complete this assessment by the due date.');
      
      expect(customMessageTextarea).toHaveValue('Please complete this assessment by the due date.');
    });
  });

  describe('Review Tab', () => {
    it('switches to review tab and shows comprehensive summary', async () => {
      const user = userEvent.setup();
      render(<AssessmentPublisher {...defaultProps} />);
      
      const reviewTab = screen.getByRole('button', { name: /review/i });
      await user.click(reviewTab);
      
      expect(screen.getByText('Review & Publish')).toBeInTheDocument();
      expect(screen.getByText('Assessment Overview')).toBeInTheDocument();
      expect(screen.getByText('Schedule Summary')).toBeInTheDocument();
      expect(screen.getByText('Settings Summary')).toBeInTheDocument();
    });

    it('shows assessment statistics', async () => {
      const user = userEvent.setup();
      render(<AssessmentPublisher {...defaultProps} />);
      
      const reviewTab = screen.getByRole('button', { name: /review/i });
      await user.click(reviewTab);
      
      // Should show question count, total points, time limit
      expect(screen.getByText('2')).toBeInTheDocument(); // 2 questions
      expect(screen.getByText('7')).toBeInTheDocument(); // 7 total points (2+5)
      expect(screen.getByText('60')).toBeInTheDocument(); // 60 minutes
    });

    it('shows validation status', async () => {
      const user = userEvent.setup();
      render(<AssessmentPublisher {...defaultProps} />);
      
      const reviewTab = screen.getByRole('button', { name: /review/i });
      await user.click(reviewTab);
      
      // Should show validation errors (no assignments made)
      expect(screen.getByText('Assessment Not Ready')).toBeInTheDocument();
      expect(screen.getByText('Please fix the validation errors before publishing')).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('validates assignment requirements', () => {
      render(<AssessmentPublisher {...defaultProps} />);
      
      // Should show error for no assignments
      expect(screen.getByText('Please assign the assessment to at least one class or student')).toBeInTheDocument();
    });

    it('validates schedule conflicts', async () => {
      const user = userEvent.setup();
      render(<AssessmentPublisher {...defaultProps} />);
      
      const scheduleTab = screen.getByRole('button', { name: /schedule/i });
      await user.click(scheduleTab);
      
      // Set due date before start date (this would trigger validation)
      const startDateInput = screen.getByLabelText(/available from/i);
      const dueDateInput = screen.getByLabelText(/due date/i);
      
      await user.type(startDateInput, '2024-12-25T10:00');
      await user.type(dueDateInput, '2024-12-24T10:00');
      
      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText('Due date must be after the scheduled start date')).toBeInTheDocument();
      });
    });

    it('shows warnings for past dates', async () => {
      const user = userEvent.setup();
      render(<AssessmentPublisher {...defaultProps} />);
      
      const scheduleTab = screen.getByRole('button', { name: /schedule/i });
      await user.click(scheduleTab);
      
      // Set past date
      const startDateInput = screen.getByLabelText(/available from/i);
      await user.type(startDateInput, '2020-01-01T10:00');
      
      await waitFor(() => {
        expect(screen.getByText(/scheduled date is in the past/i)).toBeInTheDocument();
      });
    });
  });

  describe('Actions', () => {
    it('calls onPublish when publish button is clicked with valid data', async () => {
      const user = userEvent.setup();
      render(<AssessmentPublisher {...defaultProps} />);
      
      // First make a valid assignment
      const classesButton = screen.getByText('Classes');
      await user.click(classesButton);
      
      const classCheckbox = screen.getByRole('checkbox', { name: /grade 8a mathematics/i });
      await user.click(classCheckbox);
      
      // Now publish should be enabled
      const publishButton = screen.getByRole('button', { name: /publish assessment/i });
      
      await waitFor(() => {
        expect(publishButton).not.toBeDisabled();
      });
      
      await user.click(publishButton);
      
      expect(mockOnPublish).toHaveBeenCalledWith(expect.objectContaining({
        assessmentId: 'test-assessment',
        assignedClasses: expect.arrayContaining(['class-1'])
      }));
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<AssessmentPublisher {...defaultProps} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('shows loading state when publishing', () => {
      render(<AssessmentPublisher {...defaultProps} isLoading={true} />);
      
      const publishButton = screen.getByRole('button', { name: /publishing.../i });
      expect(publishButton).toBeDisabled();
    });
  });

  describe('Tab Navigation', () => {
    it('allows switching between tabs', async () => {
      const user = userEvent.setup();
      render(<AssessmentPublisher {...defaultProps} />);
      
      // Start on assignment tab
      expect(screen.getByText('Assign Assessment')).toBeInTheDocument();
      
      // Switch to schedule tab
      const scheduleTab = screen.getByRole('button', { name: /schedule/i });
      await user.click(scheduleTab);
      expect(screen.getByText('Schedule Assessment')).toBeInTheDocument();
      
      // Switch to settings tab
      const settingsTab = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsTab);
      expect(screen.getByText('Assessment Settings')).toBeInTheDocument();
    });

    it('shows assignment count in tab badge', async () => {
      const user = userEvent.setup();
      render(<AssessmentPublisher {...defaultProps} />);
      
      // Make an assignment
      const classesButton = screen.getByText('Classes');
      await user.click(classesButton);
      
      const classCheckbox = screen.getByRole('checkbox', { name: /grade 8a mathematics/i });
      await user.click(classCheckbox);
      
      // Should show count in assignment tab
      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument(); // Student count badge
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<AssessmentPublisher {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /publish assessment/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<AssessmentPublisher {...defaultProps} />);
      
      // Tab navigation should work
      await user.tab();
      expect(document.activeElement).toHaveAttribute('type', 'button');
    });

    it('provides proper form labels', async () => {
      const user = userEvent.setup();
      render(<AssessmentPublisher {...defaultProps} />);
      
      const scheduleTab = screen.getByRole('button', { name: /schedule/i });
      await user.click(scheduleTab);
      
      expect(screen.getByLabelText(/available from/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
    });
  });
});