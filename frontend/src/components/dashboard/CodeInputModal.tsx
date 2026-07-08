import React, { useState } from 'react';
import { X, Users, UserPlus, Eye, EyeOff, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { codeConnectionService } from '../../services/codeConnectionService';

interface CodeInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'class' | 'parent';
  onSubmit: (code: string) => Promise<void>;
  loading?: boolean;
}

const CodeInputModal: React.FC<CodeInputModalProps> = ({
  isOpen,
  onClose,
  type,
  onSubmit,
  loading = false
}) => {
  const [code, setCode] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isClassType = type === 'class';
  const title = isClassType ? 'Join Class' : 'Connect to Parent';
  const placeholder = isClassType ? 'Enter class code (e.g., ABC1234)' : 'Enter parent code (e.g., ABCD1234)';
  const icon = isClassType ? Users : UserPlus;
  const IconComponent = icon;

  const handleCodeChange = (value: string) => {
    setCode(value.toUpperCase());
    setError('');
    setSuccess('');
    setPreviewData(null);
  };

  const handlePreview = async () => {
    if (!code.trim()) {
      setError('Please enter a code');
      return;
    }

    setPreviewLoading(true);
    setError('');

    try {
      if (isClassType) {
        const result = await codeConnectionService.previewClassByCode(code);
        if (result.success && result.class_info) {
          setPreviewData(result.class_info);
          setShowPreview(true);
        } else {
          setError(result.message || 'Invalid class code');
        }
      } else {
        const result = await codeConnectionService.previewParentByCode(code);
        if (result.success && result.parent_info) {
          setPreviewData(result.parent_info);
          setShowPreview(true);
        } else {
          setError(result.message || 'Invalid parent code');
        }
      }
    } catch (err: any) {
      // Handle specific connection errors
      if (err.message.includes('ad blocker') || err.message.includes('ERR_BLOCKED_BY_CLIENT')) {
        setError('Connection blocked by ad blocker. Please disable your ad blocker or whitelist localhost:8000 to preview.');
      } else {
        setError(err.message || 'Failed to preview. Please check your connection.');
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      setError('Please enter a code');
      return;
    }

    try {
      await onSubmit(code);
      setSuccess(isClassType ? 'Successfully joined class!' : 'Successfully connected to parent!');
      setTimeout(() => {
        onClose();
        resetModal();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to connect. Please try again.');
    }
  };

  const resetModal = () => {
    setCode('');
    setShowPreview(false);
    setPreviewData(null);
    setError('');
    setSuccess('');
  };

  const handleClose = () => {
    onClose();
    resetModal();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isClassType ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
            }`}>
              <IconComponent className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-green-800 font-medium">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Code Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {isClassType ? 'Class Code' : 'Parent Code'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono tracking-wider"
                maxLength={isClassType ? 10 : 8}
                disabled={loading || success}
              />
            </div>
            <p className="text-xs text-gray-500 text-center">
              {isClassType 
                ? 'Ask your teacher for the class code'
                : 'Ask your parent/guardian for the connection code'
              }
            </p>
          </div>

          {/* Preview Button */}
          {!showPreview && !success && (
            <button
              onClick={handlePreview}
              disabled={!code.trim() || previewLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {previewLoading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              Preview {isClassType ? 'Class' : 'Parent'}
            </button>
          )}

          {/* Preview Data */}
          {showPreview && previewData && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Preview</h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <EyeOff className="w-4 h-4" />
                </button>
              </div>
              
              {isClassType ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Class:</span>
                    <span className="text-sm font-medium">{previewData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Subject:</span>
                    <span className="text-sm font-medium">{previewData.subject}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Grade:</span>
                    <span className="text-sm font-medium">Grade {previewData.grade}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Teacher:</span>
                    <span className="text-sm font-medium">{previewData.teacher_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Students:</span>
                    <span className="text-sm font-medium">
                      {previewData.students_count}/{previewData.max_students}
                    </span>
                  </div>
                  {!previewData.can_join && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">
                        This class is not accepting new students at the moment.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="text-sm font-medium">{previewData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Relationship:</span>
                    <span className="text-sm font-medium capitalize">{previewData.relationship_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Expires:</span>
                    <span className="text-sm font-medium">
                      {new Date(previewData.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                  {!previewData.can_connect && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">
                        This connection code has expired.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {!success && (
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!code.trim() || loading || (showPreview && previewData && !previewData.can_join && !previewData.can_connect)}
                className={`flex-1 px-4 py-3 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  isClassType 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {loading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <IconComponent className="w-4 h-4" />
                )}
                {isClassType ? 'Join Class' : 'Connect'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeInputModal;