import React, { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AssessmentBuilder } from './AssessmentBuilder';
import { useAssessmentBuilder } from '../../hooks/useAssessmentBuilder';
import { CustomAssessment } from '../../types/teacher';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface AssessmentBuilderContainerProps {
  mode?: 'create' | 'edit';
}

export const AssessmentBuilderContainer: React.FC<AssessmentBuilderContainerProps> = ({
  mode = 'create'
}) => {
  const navigate = useNavigate();
  const { assessmentId } = useParams<{ assessmentId: string }>();
  
  const {
    assessment,
    isLoading,
    isSaving,
    error,
    saveAssessment,
    loadAssessment
  } = useAssessmentBuilder(assessmentId);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  // Handle save assessment
  const handleSave = useCallback(async (assessmentData: CustomAssessment) => {
    setSaveStatus('saving');
    setSaveError(null);

    try {
      const savedAssessment = await saveAssessment(assessmentData);
      setSaveStatus('success');
      
      // Show success message briefly, then navigate
      setTimeout(() => {
        navigate(`/teacher/assessments/${savedAssessment.id}`);
      }, 1500);
    } catch (error) {
      console.error('Failed to save assessment:', error);
      setSaveStatus('error');
      setSaveError(error instanceof Error ? error.message : 'Failed to save assessment');
    }
  }, [saveAssessment, navigate]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    navigate('/teacher/assessments');
  }, [navigate]);

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
  if (error) {
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
            <p className="text-red-800 text-sm">{error}</p>
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
      {/* Save Status Banner */}
      {saveStatus === 'saving' && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
          <div className="flex items-center space-x-3">
            <Loader className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-blue-800 font-medium">Saving assessment...</span>
          </div>
        </div>
      )}

      {saveStatus === 'success' && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-medium">
              Assessment saved successfully! Redirecting...
            </span>
          </div>
        </div>
      )}

      {saveStatus === 'error' && saveError && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800 font-medium">Failed to save assessment</span>
            </div>
            <button
              onClick={() => setSaveStatus('idle')}
              className="text-red-600 hover:text-red-800 transition-colors"
            >
              ×
            </button>
          </div>
          <p className="text-red-700 text-sm mt-1 ml-8">{saveError}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="py-8">
        <AssessmentBuilder
          assessment={assessment}
          onSave={handleSave}
          onCancel={handleCancel}
          isLoading={isSaving}
        />
      </div>
    </div>
  );
};

export default AssessmentBuilderContainer;