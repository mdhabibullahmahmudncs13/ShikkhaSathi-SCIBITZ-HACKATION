import { useState, useEffect, useCallback } from 'react';
import { CustomAssessment, AssessmentQuestion } from '../types/teacher';
import { teacherAPI } from '../services/apiClient';
import { logger } from '../services/logger';

interface UseAssessmentBuilderReturn {
  assessment: CustomAssessment | undefined;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  saveAssessment: (assessment: CustomAssessment) => Promise<CustomAssessment>;
  loadAssessment: (assessmentId: string) => Promise<void>;
  validateAssessment: (assessment: CustomAssessment) => ValidationResult;
  generateQuestionSuggestions: (criteria: QuestionCriteria) => Promise<AssessmentQuestion[]>;
  duplicateAssessment: (assessment: CustomAssessment) => CustomAssessment;
}

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: string[];
}

interface QuestionCriteria {
  subject: string;
  topic?: string;
  bloomLevel?: number;
  difficulty?: number;
  questionType?: string;
  count: number;
}

export const useAssessmentBuilder = (assessmentId?: string): UseAssessmentBuilderReturn => {
  const [assessment, setAssessment] = useState<CustomAssessment | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load assessment if editing
  const loadAssessment = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      logger.info('Loading assessment for editing', { assessmentId: id });
      
      // In a real app, this would call the API
      // const assessmentData = await teacherAPI.getAssessment(id);
      
      // Mock data for now
      const mockAssessment: CustomAssessment = {
        id,
        title: 'Sample Assessment',
        description: 'A sample assessment for demonstration',
        subject: 'Mathematics',
        grade: 8,
        bloomLevels: [1, 2, 3],
        topics: ['Algebra', 'Geometry'],
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
            explanation: 'Basic addition: 2 + 2 = 4',
            bloomLevel: 1,
            topic: 'Basic Arithmetic',
            difficulty: 1,
            points: 2
          }
        ]
      };

      setAssessment(mockAssessment);
      logger.info('Assessment loaded successfully', { assessmentId: id });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load assessment';
      setError(errorMessage);
      logger.error('Failed to load assessment', { assessmentId: id, error: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load assessment on mount if editing
  useEffect(() => {
    if (assessmentId) {
      loadAssessment(assessmentId);
    }
  }, [assessmentId, loadAssessment]);

  // Save assessment
  const saveAssessment = useCallback(async (assessmentData: CustomAssessment): Promise<CustomAssessment> => {
    setIsSaving(true);
    setError(null);

    try {
      logger.info('Saving assessment', { 
        assessmentId: assessmentData.id,
        title: assessmentData.title,
        questionCount: assessmentData.questions.length
      });

      // Validate assessment before saving
      const validation = validateAssessment(assessmentData);
      if (!validation.isValid) {
        throw new Error('Assessment validation failed: ' + Object.values(validation.errors).join(', '));
      }

      // In a real app, this would call the API
      // const savedAssessment = assessmentData.id 
      //   ? await teacherAPI.updateAssessment(assessmentData.id, assessmentData)
      //   : await teacherAPI.createAssessment(assessmentData);

      // Mock save operation
      const savedAssessment: CustomAssessment = {
        ...assessmentData,
        id: assessmentData.id || `assessment_${Date.now()}`,
      };

      setAssessment(savedAssessment);
      logger.info('Assessment saved successfully', { 
        assessmentId: savedAssessment.id,
        title: savedAssessment.title
      });

      return savedAssessment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save assessment';
      setError(errorMessage);
      logger.error('Failed to save assessment', { 
        assessmentId: assessmentData.id,
        error: errorMessage
      });
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Validate assessment
  const validateAssessment = useCallback((assessmentData: CustomAssessment): ValidationResult => {
    const errors: Record<string, string> = {};
    const warnings: string[] = [];

    // Basic validation
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

    // Question validation
    assessmentData.questions.forEach((question, index) => {
      if (!question.question.trim()) {
        errors[`question_${index}_text`] = `Question ${index + 1} text is required`;
      }

      if (question.type === 'multiple_choice') {
        if (!question.options || question.options.length < 2) {
          errors[`question_${index}_options`] = `Question ${index + 1} must have at least 2 options`;
        }
        
        if (!question.correctAnswer || !question.options?.includes(question.correctAnswer as string)) {
          errors[`question_${index}_answer`] = `Question ${index + 1} must have a valid correct answer`;
        }
      }

      if (!question.correctAnswer) {
        errors[`question_${index}_answer`] = `Question ${index + 1} must have a correct answer`;
      }

      if (question.points <= 0) {
        errors[`question_${index}_points`] = `Question ${index + 1} must have positive points`;
      }
    });

    // Warnings for best practices
    const totalPoints = assessmentData.questions.reduce((sum, q) => sum + q.points, 0);
    if (totalPoints < 10) {
      warnings.push('Consider adding more points to make the assessment more comprehensive');
    }

    const bloomDistribution = assessmentData.questions.reduce((acc, q) => {
      acc[q.bloomLevel] = (acc[q.bloomLevel] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    if (Object.keys(bloomDistribution).length < 2) {
      warnings.push('Consider including questions from multiple Bloom\'s taxonomy levels');
    }

    const difficultyDistribution = assessmentData.questions.reduce((acc, q) => {
      acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    if (Object.keys(difficultyDistribution).length === 1) {
      warnings.push('Consider including questions of varying difficulty levels');
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings
    };
  }, []);

  // Generate question suggestions
  const generateQuestionSuggestions = useCallback(async (criteria: QuestionCriteria): Promise<AssessmentQuestion[]> => {
    try {
      logger.info('Generating question suggestions', criteria);

      // In a real app, this would call an AI service or question bank API
      // const suggestions = await teacherAPI.generateQuestionSuggestions(criteria);

      // Mock suggestions for now
      const mockSuggestions: AssessmentQuestion[] = [
        {
          type: 'multiple_choice',
          question: `What is the main concept in ${criteria.topic || criteria.subject}?`,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 'Option A',
          explanation: 'This is the correct answer because...',
          bloomLevel: criteria.bloomLevel || 1,
          topic: criteria.topic || 'General',
          difficulty: criteria.difficulty || 2,
          points: 2
        },
        {
          type: 'short_answer',
          question: `Explain the importance of ${criteria.topic || criteria.subject} in real life.`,
          correctAnswer: 'Sample answer explaining the importance...',
          explanation: 'Students should demonstrate understanding of practical applications',
          bloomLevel: criteria.bloomLevel || 2,
          topic: criteria.topic || 'General',
          difficulty: criteria.difficulty || 3,
          points: 5
        }
      ];

      return mockSuggestions.slice(0, criteria.count);
    } catch (err) {
      logger.error('Failed to generate question suggestions', { criteria, error: err });
      throw new Error('Failed to generate question suggestions');
    }
  }, []);

  // Duplicate assessment
  const duplicateAssessment = useCallback((originalAssessment: CustomAssessment): CustomAssessment => {
    const duplicated: CustomAssessment = {
      ...originalAssessment,
      id: undefined, // Remove ID to create new assessment
      title: `${originalAssessment.title} (Copy)`,
      questions: originalAssessment.questions.map(q => ({ ...q, id: undefined })),
      assignedClasses: [], // Clear assignments
      scheduledDate: undefined,
      dueDate: undefined
    };

    logger.info('Assessment duplicated', { 
      originalId: originalAssessment.id,
      originalTitle: originalAssessment.title
    });

    return duplicated;
  }, []);

  return {
    assessment,
    isLoading,
    isSaving,
    error,
    saveAssessment,
    loadAssessment,
    validateAssessment,
    generateQuestionSuggestions,
    duplicateAssessment
  };
};