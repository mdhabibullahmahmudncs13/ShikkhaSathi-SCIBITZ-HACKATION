import React, { useEffect, useState } from 'react';
import { syncManager, SyncStatus, SyncEvent } from '../../services/syncManager';

interface SyncProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SyncProgressModal: React.FC<SyncProgressModalProps> = ({ isOpen, onClose }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncManager.getSyncStatus());
  const [currentTask, setCurrentTask] = useState<string>('');
  const [completedTasks, setCompletedTasks] = useState<number>(0);
  const [totalTasks, setTotalTasks] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) return;

    const handleProgressUpdate = (event: SyncEvent) => {
      setSyncStatus(syncManager.getSyncStatus());
      if (event.data.currentTask) {
        setCurrentTask(event.data.currentTask);
        setCompletedTasks(event.data.completedTasks);
        setTotalTasks(event.data.totalTasks);
      }
    };

    const handleSyncComplete = (event: SyncEvent) => {
      setSyncStatus(syncManager.getSyncStatus());
      setTimeout(() => {
        onClose();
      }, 2000); // Auto-close after 2 seconds
    };

    const handleSyncError = (event: SyncEvent) => {
      setSyncStatus(syncManager.getSyncStatus());
    };

    syncManager.addEventListener('progress-update', handleProgressUpdate);
    syncManager.addEventListener('sync-complete', handleSyncComplete);
    syncManager.addEventListener('sync-error', handleSyncError);

    return () => {
      syncManager.removeEventListener('progress-update', handleProgressUpdate);
      syncManager.removeEventListener('sync-complete', handleSyncComplete);
      syncManager.removeEventListener('sync-error', handleSyncError);
    };
  }, [isOpen, onClose]);

  const getTaskDisplayName = (taskName: string): string => {
    const taskNames: Record<string, string> = {
      'quiz-attempts': 'কুইজ উত্তর',
      'progress': 'অগ্রগতি ডেটা',
      'chat-messages': 'চ্যাট বার্তা',
      'achievements': 'অর্জন'
    };
    return taskNames[taskName] || taskName;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto mb-4">
              {syncStatus.isSyncing ? (
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              ) : (
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>

            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {syncStatus.isSyncing ? 'ডেটা সিঙ্ক হচ্ছে...' : 'সিঙ্ক সম্পন্ন!'}
            </h2>

            {syncStatus.isSyncing && currentTask && (
              <p className="text-gray-600 mb-4">
                {getTaskDisplayName(currentTask)} সিঙ্ক করা হচ্ছে...
              </p>
            )}
          </div>

          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>অগ্রগতি</span>
                <span>{syncStatus.syncProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${syncStatus.syncProgress}%` }}
                ></div>
              </div>
            </div>

            {/* Task Progress */}
            {totalTasks > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>কাজ সম্পন্ন</span>
                <span>{completedTasks} / {totalTasks}</span>
              </div>
            )}

            {/* Pending Items */}
            {syncStatus.pendingItems > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>বাকি আইটেম</span>
                <span>{syncStatus.pendingItems}</span>
              </div>
            )}

            {/* Error Count */}
            {syncStatus.failedItems > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>ব্যর্থ আইটেম</span>
                <span>{syncStatus.failedItems}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex space-x-3">
            {!syncStatus.isSyncing && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                বন্ধ করুন
              </button>
            )}

            {syncStatus.failedItems > 0 && !syncStatus.isSyncing && (
              <button
                onClick={() => {
                  syncManager.clearErrors();
                  syncManager.forcSync();
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                পুনরায় চেষ্টা
              </button>
            )}
          </div>

          {/* Cancel Button (only during sync) */}
          {syncStatus.isSyncing && (
            <button
              onClick={onClose}
              className="mt-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              ব্যাকগ্রাউন্ডে চালিয়ে যান
            </button>
          )}
        </div>
      </div>
    </div>
  );
};