import React, { useEffect, useState } from 'react';
import { syncManager, SyncConflict, SyncEvent } from '../../services/syncManager';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({ isOpen, onClose }) => {
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<SyncConflict | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConflicts(syncManager.getConflicts().filter(c => !c.resolved));
    }

    const handleConflictDetected = (event: SyncEvent) => {
      if (isOpen) {
        setConflicts(syncManager.getConflicts().filter(c => !c.resolved));
      }
    };

    syncManager.addEventListener('conflict-detected', handleConflictDetected);

    return () => {
      syncManager.removeEventListener('conflict-detected', handleConflictDetected);
    };
  }, [isOpen]);

  const getConflictTypeDisplay = (type: string): string => {
    const types: Record<string, string> = {
      'quiz-attempt': 'কুইজ উত্তর',
      'progress': 'অগ্রগতি',
      'chat-message': 'চ্যাট বার্তা',
      'achievement': 'অর্জন'
    };
    return types[type] || type;
  };

  const formatData = (data: any, type: string): string => {
    switch (type) {
      case 'progress':
        return `বিষয়: ${data.subject}, টপিক: ${data.topic}, সম্পূর্ণতা: ${data.completion_percentage || data.completionPercentage}%`;
      case 'quiz-attempt':
        return `বিষয়: ${data.subject}, স্কোর: ${data.score}/${data.max_score || data.maxScore}`;
      case 'chat-message':
        return `বার্তা: ${data.content?.substring(0, 50)}...`;
      case 'achievement':
        return `অর্জন: ${data.name}`;
      default:
        return JSON.stringify(data).substring(0, 100) + '...';
    }
  };

  const handleResolveConflict = async (conflictId: string, resolution: 'local' | 'server') => {
    setResolving(conflictId);
    try {
      await syncManager.resolveConflict(conflictId, resolution);
      setConflicts(prev => prev.filter(c => c.id !== conflictId));
      if (selectedConflict?.id === conflictId) {
        setSelectedConflict(null);
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    } finally {
      setResolving(null);
    }
  };

  const handleClearResolved = () => {
    syncManager.clearResolvedConflicts();
    setConflicts(syncManager.getConflicts().filter(c => !c.resolved));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">ডেটা দ্বন্দ্ব সমাধান</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            অফলাইন এবং অনলাইন ডেটার মধ্যে পার্থক্য পাওয়া গেছে। কোন ভার্সন রাখতে চান তা নির্বাচন করুন।
          </p>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Conflict List */}
          <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-3">দ্বন্দ্বের তালিকা ({conflicts.length})</h3>
              {conflicts.length === 0 ? (
                <p className="text-gray-500 text-sm">কোন দ্বন্দ্ব নেই</p>
              ) : (
                <div className="space-y-2">
                  {conflicts.map((conflict) => (
                    <button
                      key={conflict.id}
                      onClick={() => setSelectedConflict(conflict)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedConflict?.id === conflict.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-sm text-gray-900">
                        {getConflictTypeDisplay(conflict.type)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(conflict.timestamp).toLocaleString('bn-BD')}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Conflict Details */}
          <div className="flex-1 overflow-y-auto">
            {selectedConflict ? (
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {getConflictTypeDisplay(selectedConflict.type)} দ্বন্দ্ব
                  </h3>
                  <p className="text-gray-600 text-sm">
                    সময়: {new Date(selectedConflict.timestamp).toLocaleString('bn-BD')}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Local Data */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">স্থানীয় ডেটা</h4>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        অফলাইন
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      {formatData(selectedConflict.localData, selectedConflict.type)}
                    </div>
                    <button
                      onClick={() => handleResolveConflict(selectedConflict.id, 'local')}
                      disabled={resolving === selectedConflict.id}
                      className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {resolving === selectedConflict.id ? 'সমাধান করা হচ্ছে...' : 'এই ভার্সন রাখুন'}
                    </button>
                  </div>

                  {/* Server Data */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">সার্ভার ডেটা</h4>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        অনলাইন
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      {formatData(selectedConflict.serverData, selectedConflict.type)}
                    </div>
                    <button
                      onClick={() => handleResolveConflict(selectedConflict.id, 'server')}
                      disabled={resolving === selectedConflict.id}
                      className="w-full mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {resolving === selectedConflict.id ? 'সমাধান করা হচ্ছে...' : 'এই ভার্সন রাখুন'}
                    </button>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <h5 className="font-medium text-yellow-800">সতর্কতা</h5>
                      <p className="text-sm text-yellow-700 mt-1">
                        একবার সমাধান করার পর, অন্য ভার্সনের ডেটা হারিয়ে যাবে। সিদ্ধান্ত নেওয়ার আগে ভালো করে দেখে নিন।
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>একটি দ্বন্দ্ব নির্বাচন করুন</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between">
            <button
              onClick={handleClearResolved}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              সমাধান হওয়া দ্বন্দ্ব পরিষ্কার করুন
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};