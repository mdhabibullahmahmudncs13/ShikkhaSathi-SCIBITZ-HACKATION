/**
 * LearningPathAssignmentContainer Component
 * 
 * Container component that provides state management and API integration
 * for the LearningPathAssignment component.
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

import LearningPathAssignment from './LearningPathAssignment';
import { useLearningPathAssignment } from '../../hooks/useLearningPathAssignment';
import {
  AssignmentRequest,
  PathRecommendation,
  LearningPath,
  PathCreationRequest
} from '../../types/learningPath';

interface LearningPathAssignmentContainerProps {
  className?: string;
}

export const LearningPathAssignmentContainer: React.FC<LearningPathAssignmentContainerProps> = ({
  className
}) => {
  const navigate = useNavigate();
  const {
    assignPath,
    getRecommendations,
    createCustomPath,
    isLoading,
    error
  } = useLearningPathAssignment();

  const [assignmentStatus, setAssignmentStatus] = useState<'idle' | 'assigning' | 'success' | 'error'>('idle');

  // Handle path assignment
  const handleAssignPath = useCallback(async (request: AssignmentRequest) => {
    try {
      setAssignmentStatus('assigning');
      
      const result = await assignPath(request);
      
      setAssignmentStatus('success');
      
      // Show success notification
      toast.success(
        `Learning path assigned to ${
          request.studentIds.length + request.classIds.length
        } recipient(s) successfully!`,
        {
          duration: 5000,
          position: 'top-right'
        }
      );

      // Navigate to assignments view after short delay
      setTimeout(() => {
        navigate('/teacher/learning-paths/assignments');
      }, 2000);

    } catch (err) {
      setAssignmentStatus('error');
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign learning path';
      toast.error(errorMessage, {
        duration: 5000,
        position: 'top-right'
      });
      
      throw err; // Re-throw to let the component handle it
    }
  }, [assignPath, navigate]);

  // Handle getting recommendations
  const handleGetRecommendations = useCallback(async (
    studentId: string, 
    subject: string
  ): Promise<PathRecommendation[]> => {
    try {
      const recommendations = await getRecommendations(studentId, subject);
      
      if (recommendations.length === 0) {
        toast.info('No recommendations found for this student and subject', {
          duration: 3000,
          position: 'top-right'
        });
      }
      
      return recommendations;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get recommendations';
      toast.error(errorMessage, {
        duration: 4000,
        position: 'top-right'
      });
      
      return [];
    }
  }, [getRecommendations]);

  // Handle creating custom path
  const handleCreateCustomPath = useCallback(async (
    request: PathCreationRequest
  ): Promise<LearningPath> => {
    try {
      const path = await createCustomPath(request);
      
      toast.success('Custom learning path created successfully!', {
        duration: 4000,
        position: 'top-right'
      });
      
      return path;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create custom path';
      toast.error(errorMessage, {
        duration: 4000,
        position: 'top-right'
      });
      
      throw err;
    }
  }, [createCustomPath]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success State */}
        {assignmentStatus === 'success' && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Learning Path Assigned Successfully!
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Students and parents have been notified. Redirecting to assignments view...</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Component */}
        <LearningPathAssignment
          onAssignPath={handleAssignPath}
          onGetRecommendations={handleGetRecommendations}
          onCreateCustomPath={handleCreateCustomPath}
          className={className}
        />

        {/* Loading Overlay */}
        {assignmentStatus === 'assigning' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Assigning Learning Path</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Please wait while we assign the learning path to students...
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LearningPathAssignmentContainer;