import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QuizPage from '../pages/QuizPage';
import { QuizContainer } from '../components/quiz';
import { Quiz } from '../types/quiz';

// Mock the quiz service
vi.mock('../services/quizService', () => ({
  quizService: {
    generateQuiz: vi.fn().mockResolvedValue({
      quiz_id: 'test-quiz-1',
      questions: [
        {
          id: 'q1',
          question_text: 'What is 2 + 2?',
          question_type: 'multiple_choice',
          bloom_level: 1,
          difficulty_level: 2,
          options: ['2', '3', '4', '5'],
          subject: 'Mathematics',
          topic: 'Basic Arithmetic',
          grade: 6,
        },
        {
          id: 'q2',
          question_text: 'Is the Earth round?',
          question_type: 'true_false',
          bloom_level: 1,
          difficulty_level: 1,
          options: ['True', 'False'],
          subject: 'Science',
          topic: 'Earth Science',
          grade: 6,
        },
      ],
      metadata: {
        subject: 'Mathematics',
        topic: 'Basic Arithmetic',
        grade: 6,
        difficulty_level: 2,
        bloom_level: 1,
        total_questions: 2,
      },
    }),
    submitQuiz: vi.fn().mockResolvedValue({
      quiz_id: 'test-quiz-1',
      total_score: 20,
      max_score: 20,
      percentage: 100,
    }),
  },
}));

const mockQuiz: Quiz = {
  quiz_id: 'test-quiz-1',
  questions: [
    {
      id: 'q1',
      question_text: 'What is 2 + 2?',
      question_type: 'multiple_choice',
      bloom_level: 1,
      difficulty_level: 2,
      options: ['2', '3', '4', '5'],
      subject: 'Mathematics',
      topic: 'Basic Arithmetic',
      grade: 6,
    },
    {
      id: 'q2',
      question_text: 'Is the Earth round?',
      question_type: 'true_false',
      bloom_level: 1,
      difficulty_level: 1,
      options: ['True', 'False'],
      subject: 'Science',
      topic: 'Earth Science',
      grade: 6,
    },
  ],
  metadata: {
    subject: 'Mathematics',
    topic: 'Basic Arithmetic',
    grade: 6,
    difficulty_level: 2,
    bloom_level: 1,
    total_questions: 2,
  },
};

describe('Quiz Interface', () => {
  it('renders quiz setup form', () => {
    render(
      <BrowserRouter>
        <QuizPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Start a Quiz')).toBeInTheDocument();
    expect(screen.getByText('Subject')).toBeInTheDocument();
    expect(screen.getByText('Number of Questions')).toBeInTheDocument();
    expect(screen.getByText('Start Quiz')).toBeInTheDocument();
  });

  it('displays quiz questions correctly', () => {
    const mockOnSubmit = vi.fn();
    const mockOnExit = vi.fn();

    render(
      <QuizContainer
        quiz={mockQuiz}
        onSubmit={mockOnSubmit}
        onExit={mockOnExit}
      />
    );

    // Check if first question is displayed
    expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();
    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();
    
    // Check if multiple choice options are displayed
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('allows selecting answers', () => {
    const mockOnSubmit = vi.fn();
    const mockOnExit = vi.fn();

    render(
      <QuizContainer
        quiz={mockQuiz}
        onSubmit={mockOnSubmit}
        onExit={mockOnExit}
      />
    );

    // Click on option C (which should be "4")
    const optionC = screen.getByText('C');
    fireEvent.click(optionC.closest('button')!);

    // Check if the option is selected (would need to check styling or state)
    expect(optionC.closest('button')).toHaveClass('border-blue-500');
  });

  it('shows navigation between questions', () => {
    const mockOnSubmit = vi.fn();
    const mockOnExit = vi.fn();

    render(
      <QuizContainer
        quiz={mockQuiz}
        onSubmit={mockOnSubmit}
        onExit={mockOnExit}
      />
    );

    // Check navigation elements
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
    
    // Previous should be disabled on first question
    expect(screen.getByText('Previous').closest('button')).toBeDisabled();
  });

  it('displays timer', () => {
    const mockOnSubmit = vi.fn();
    const mockOnExit = vi.fn();

    render(
      <QuizContainer
        quiz={mockQuiz}
        onSubmit={mockOnSubmit}
        onExit={mockOnExit}
      />
    );

    // Check if timer is displayed (should show time in MM:SS format)
    expect(screen.getByText(/\d{1,2}:\d{2}/)).toBeInTheDocument();
  });

  it('allows flagging questions', () => {
    const mockOnSubmit = vi.fn();
    const mockOnExit = vi.fn();

    render(
      <QuizContainer
        quiz={mockQuiz}
        onSubmit={mockOnSubmit}
        onExit={mockOnExit}
      />
    );

    // Find and click the flag button
    const flagButton = screen.getByTitle(/flag/i);
    fireEvent.click(flagButton);

    // Check if question is flagged (would show in navigation)
    // This would require checking the navigation component state
  });

  it('shows progress indicators', () => {
    const mockOnSubmit = vi.fn();
    const mockOnExit = vi.fn();

    render(
      <QuizContainer
        quiz={mockQuiz}
        onSubmit={mockOnSubmit}
        onExit={mockOnExit}
      />
    );

    // Check progress indicators
    expect(screen.getByText('Questions')).toBeInTheDocument();
    expect(screen.getByText('1/2 completed')).toBeInTheDocument();
    
    // Check question number buttons
    expect(screen.getByTitle('Question 1 (Answered) (Flagged)')).toBeInTheDocument();
    expect(screen.getByTitle('Question 2')).toBeInTheDocument();
  });
});

describe('Quiz State Management', () => {
  it('saves answers locally', async () => {
    const mockOnSubmit = vi.fn();
    const mockOnExit = vi.fn();

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
    });

    render(
      <QuizContainer
        quiz={mockQuiz}
        onSubmit={mockOnSubmit}
        onExit={mockOnExit}
      />
    );

    // Select an answer
    const optionC = screen.getByText('C');
    fireEvent.click(optionC.closest('button')!);

    // Wait for auto-save (would need to wait for the auto-save interval)
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalled();
    }, { timeout: 35000 }); // Wait for auto-save interval
  });
});