/**
 * useLearningPathAssignment Hook
 * 
 * Custom hook for managing learning path assignment operations including
 * path creation, assignment, recommendations, and progress tracking.
 */

import { useState, useCallback, useEffect } from 'react';
import { teacherAPI } from '../services/apiClient';
import {
  LearningPath,
  PathRecommendation,
  AssignmentRequest,
  PathCreationRequest,
  PathTemplate,
  ClassInfo,
  StudentAssignment,
  AssignmentProgress,
  PathAnalytics,
  BulkAssignmentRequest,
  BulkAssignmentResponse,
  PathAssignmentResponse
} from '../types/learningPath';

interface UseLearningPathAssignmentReturn {
  // Data
  availablePaths: LearningPath[];
  pathTemplates: PathTemplate[];
  classes: ClassInfo[];
  students: StudentAssignment[];
  assignments: AssignmentProgress[];
  
  // Loading states
  isLoading: boolean;
  isAssigning: boolean;
  isLoadingRecommendations: boolean;
  
  // Error states
  error: string | null;
  assignmentError: string | null;
  
  // Operations
  assignPath: (request: AssignmentRequest) => Promise<PathAssignmentResponse>;
  bulkAssignPath: (request: BulkAssignmentRequest) => Promise<BulkAssignmentResponse>;
  getRecommendations: (studentId: string, subject: string) => Promise<PathRecommendation[]>;
  createCustomPath: (request: PathCreationRequest) => Promise<LearningPath>;
  updatePathProgress: (assignmentId: string, progress: Partial<AssignmentProgress>) => Promise<void>;
  getPathAnalytics: (pathId: string) => Promise<PathAnalytics>;
  
  // Data loading
  loadPaths: () => Promise<void>;
  loadTemplates: () => Promise<void>;
  loadClasses: () => Promise<void>;
  loadStudents: (classId?: string) => Promise<void>;
  loadAssignments: (filters?: any) => Promise<void>;
  
  // Utility functions
  validateAssignment: (request: AssignmentRequest) => string[];
  resetError: () => void;
}

export const useLearningPathAssignment = (): UseLearningPathAssignmentReturn => {
  // State management
  const [availablePaths, setAvailablePaths] = useState<LearningPath[]>([]);
  const [pathTemplates, setPathTemplates] = useState<PathTemplate[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<StudentAssignment[]>([]);
  const [assignments, setAssignments] = useState<AssignmentProgress[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  
  // Error states
  const [error, setError] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  // Load available learning paths
  const loadPaths = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Mock data for now - replace with actual API call
      const mockPaths: LearningPath[] = [
        {
          id: '1',
          title: 'Algebra Fundamentals',
          description: 'Master the basics of algebraic thinking and problem solving',
          subject: 'mathematics',
          gradeLevel: 8,
          topics: [],
          milestones: [],
          estimatedDurationDays: 21,
          difficultyStrategy: 'balanced',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'teacher-1',
          isTemplate: true,
          usageCount: 15,
          effectivenessRating: 4.2
        }
      ];
      
      setAvailablePaths(mockPaths);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load learning paths');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load path templates
  const loadTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Mock data for now - replace with actual API call
      const mockTemplates: PathTemplate[] = [
        {
          id: 'template-1',
          title: 'Basic Mathematics',
          description: 'Foundational math concepts for middle school',
          subject: 'mathematics',
          gradeLevel: 7,
          topics: ['arithmetic', 'fractions', 'decimals'],
          difficultyLevel: 'medium',
          estimatedDurationDays: 14,
          createdBy: 'system',
          createdAt: new Date(),
          usageCount: 25,
          effectivenessRating: 4.5,
          isPublic: true
        }
      ];
      
      setPathTemplates(mockTemplates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load path templates');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load teacher's classes
  const loadClasses = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Mock data for now - replace with actual API call
      const mockClasses: ClassInfo[] = [
        {
          id: 'class-1',
          name: 'Mathematics 8A',
          subject: 'mathematics',
          gradeLevel: 8,
          studentCount: 24,
          students: [],
          selected: false
        }
      ];
      
      setClasses(mockClasses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load classes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load students
  const loadStudents = useCallback(async (classId?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Mock data for now - replace with actual API call
      const mockStudents: StudentAssignment[] = [];
      
      setStudents(mockStudents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load students');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load assignments
  const loadAssignments = useCallback(async (filters?: any) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Mock data for now - replace with actual API call
      const mockAssignments: AssignmentProgress[] = [];
      
      setAssignments(mockAssignments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignments');
    } finally {
      setIsLoading(false);
    }
  }, []);
  // Assign learning path to students
  const assignPath = useCallback(async (request: AssignmentRequest): Promise<PathAssignmentResponse> => {
    try {
      setIsAssigning(true);
      setAssignmentError(null);
      
      // Validate request
      const validationErrors = validateAssignment(request);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }
      
      // Make API call
      const response = await teacherAPI.assignLearningPath(request);
      
      // Update local state if needed
      await loadAssignments();
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign learning path';
      setAssignmentError(errorMessage);
      throw err;
    } finally {
      setIsAssigning(false);
    }
  }, [loadAssignments]);

  // Bulk assign learning paths
  const bulkAssignPath = useCallback(async (request: BulkAssignmentRequest): Promise<BulkAssignmentResponse> => {
    try {
      setIsAssigning(true);
      setAssignmentError(null);
      
      const response = await teacherAPI.bulkAssignLearningPath(request);
      
      // Update local state
      await loadAssignments();
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to bulk assign learning paths';
      setAssignmentError(errorMessage);
      throw err;
    } finally {
      setIsAssigning(false);
    }
  }, [loadAssignments]);

  // Get learning path recommendations
  const getRecommendations = useCallback(async (
    studentId: string, 
    subject: string
  ): Promise<PathRecommendation[]> => {
    try {
      setIsLoadingRecommendations(true);
      setError(null);
      
      const response = await teacherAPI.getLearningPathRecommendations({
        studentId,
        subject,
        maxPathLength: 20
      });
      
      return response.recommendations;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get recommendations';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoadingRecommendations(false);
    }
  }, []);

  // Create custom learning path
  const createCustomPath = useCallback(async (request: PathCreationRequest): Promise<LearningPath> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await teacherAPI.createCustomLearningPath(request);
      
      // Update available paths
      setAvailablePaths(prev => [...prev, response]);
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create custom path';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update path progress
  const updatePathProgress = useCallback(async (
    assignmentId: string, 
    progress: Partial<AssignmentProgress>
  ): Promise<void> => {
    try {
      await teacherAPI.updateLearningPathProgress(assignmentId, progress);
      
      // Update local assignments
      setAssignments(prev => 
        prev.map(assignment => 
          assignment.assignmentId === assignmentId 
            ? { ...assignment, ...progress }
            : assignment
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update progress';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Get path analytics
  const getPathAnalytics = useCallback(async (pathId: string): Promise<PathAnalytics> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await teacherAPI.getLearningPathAnalytics(pathId);
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get path analytics';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Validate assignment request
  const validateAssignment = useCallback((request: AssignmentRequest): string[] => {
    const errors: string[] = [];
    
    if (!request.pathId) {
      errors.push('Learning path is required');
    }
    
    if (request.studentIds.length === 0 && request.classIds.length === 0) {
      errors.push('At least one student or class must be selected');
    }
    
    if (request.customizations) {
      request.customizations.forEach((customization, index) => {
        if (customization.timeExtension && customization.timeExtension < 0) {
          errors.push(`Invalid time extension for customization ${index + 1}`);
        }
      });
    }
    
    return errors;
  }, []);

  // Reset error state
  const resetError = useCallback(() => {
    setError(null);
    setAssignmentError(null);
  }, []);

  // Load initial data on mount
  useEffect(() => {
    loadTemplates();
    loadClasses();
  }, [loadTemplates, loadClasses]);

  return {
    // Data
    availablePaths,
    pathTemplates,
    classes,
    students,
    assignments,
    
    // Loading states
    isLoading,
    isAssigning,
    isLoadingRecommendations,
    
    // Error states
    error,
    assignmentError,
    
    // Operations
    assignPath,
    bulkAssignPath,
    getRecommendations,
    createCustomPath,
    updatePathProgress,
    getPathAnalytics,
    
    // Data loading
    loadPaths,
    loadTemplates,
    loadClasses,
    loadStudents,
    loadAssignments,
    
    // Utility functions
    validateAssignment,
    resetError
  };
};