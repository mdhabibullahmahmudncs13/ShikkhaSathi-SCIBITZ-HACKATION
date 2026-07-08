import React, { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AssessmentPublisher } from './AssessmentPublisher';
import { useAssessmentPublisher } from '../../hooks/useAssessmentPublisher';
import { CustomAssessment } from '../../types/teacher';
import { AlertCircle, CheckCircle, Loader, Send } from 'lucide-react';

interface PublishData {
  assessmentId: string;
  assignedClasses: string[];
  assignedStudents: string[];
  scheduledDate?: Date;
  dueDate?: Date;
  availabilityWindow: {
    startTime?: string;
    endTime?: string;
    allowedDays: string[];
  };
  settings: {
    allowRetakes: boolean;
    maxAttempts: number;
    showResultsImmediately: boolean;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    requireProctoring: boolean;
    allowPause: boolean;
    showProgressBar: boolean;
  };
  notifications: {
    notifyStudents: boolean;
    notifyParents: boolean;
    reminderSchedule: string[];
    customMessage?: string;
  };
}

interface AssessmentPublisherContainerProps {
  assessment?: CustomAssessment;
}

export const AssessmentPublisherContainer: React.FC<AssessmentPublisherContainerProps> = ({
  assessment: propAssessment
}) => {
  const navigate = useNavigate();
  const { assessmentId } = useParams<{ assessmentId: string }>();
  
  const {
    assessment,
    isLoading,
    isPublishing,
    error,
    publishAssessment,
    loadAssessment
  } = useAssessmentPublisher(assessmentId, propAssessment);

  const [publishStatus, setPublishStatus] = useState<'idle' | 'publishing' | 'success' | 'error'>('idle');
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedData, setPublishedData] = useState<any>(null);

  // Handle publish assessment
  const handlePublish = useCallback(async (publishData: PublishData) => {
    if (!assessment) {
      setPublishError('Assessment data not available');
      return;
    }

    setPublishStatus('publishing');
    setPublishError(null);

    try {
      const result = await publishAssessment(publishData);
      setPublishedData(result);
      setPublishStatus('success');
      
      // Show success message briefly, then navigate
      setTimeout(() => {
        navigate(`/teacher/assessments/${assessment.id}/results`);
      }, 2000);
    } catch (error) {
      console.error('Failed to publish assessment:', error);
      setPublishStatus('error');
      setPublishError(error instanceof Error ? error.message : 'Failed to publish assessment');
    }
  }, [assessment, publishAssessment, navigate]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (assessment?.id) {
      navigate(`/teacher/assessments/${assessment.id}`);
    } else {
      navigate('/teacher/assessments');
    }
  }, [assessment, navigate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Loading Assessment</h2>
          <p className="text-gray-600">Please wait while we load the assessment data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !assessment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
            <div>
              <h2 className="text-lg font-medium text-gray-900">Error Loading Assessment</h2>
              <p className="text-sm text-gray-600">We encountered an issue loading the assessment</p>
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">
              {error || 'Assessment not found or not available for publishing'}
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Publish Status Banner */}
      {publishStatus === 'publishing' && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
          <div className="flex items-center space-x-3">
            <Loader className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-blue-800 font-medium">Publishing assessment...</span>
            <span className="text-blue-600 text-sm">
              Notifying students and setting up availability
            </span>
          </div>
        </div>
      )}

      {publishStatus === 'success' && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <span className="text-green-800 font-medium">
                Assessment published successfully!
              </span>
              <div className="text-green-700 text-sm mt-1">
                {publishedData && (
                  <div className="space-y-1">
                    <p>• {publishedData.totalStudents || 0} students notified</p>
                    <p>• Available {publishedData.availableFrom || 'immediately'}</p>
                    {publishedData.dueDate && <p>• Due {publishedData.dueDate}</p>}
                  </div>
                )}
                <p className="mt-2">Redirecting to assessment results...</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {publishStatus === 'error' && publishError && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <span className="text-red-800 font-medium">Failed to publish assessment</span>
                <p className="text-red-700 text-sm mt-1">{publishError}</p>
              </div>
            </div>
            <button
              onClick={() => setPublishStatus('idle')}
              className="text-red-600 hover:text-red-800 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="py-8">
        <AssessmentPublisher
          assessment={assessment}
          onPublish={handlePublish}
          onCancel={handleCancel}
          isLoading={isPublishing}
        />
      </div>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 md:hidden">
        <button
          onClick={() => {
            // Scroll to publish button or trigger publish
            const publishButton = document.querySelector('[data-publish-button]');
            if (publishButton) {
              publishButton.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          className="flex items-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        >
          <Send className="w-5 h-5" />
          <span className="font-medium">Publish</span>
        </button>
      </div>
    </div>
  );
};

export default AssessmentPublisherContainer;