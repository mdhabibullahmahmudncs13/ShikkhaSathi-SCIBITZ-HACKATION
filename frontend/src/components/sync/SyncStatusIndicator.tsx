import React, { useEffect, useState } from 'react';
import { syncManager, SyncStatus, SyncEvent } from '../../services/syncManager';

export const SyncStatusIndicator: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncManager.getSyncStatus());
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const handleStatusChange = (event: SyncEvent) => {
      setSyncStatus(syncManager.getSyncStatus());
    };

    const handleProgressUpdate = (event: SyncEvent) => {
      setSyncStatus(syncManager.getSyncStatus());
    };

    const handleSyncComplete = (event: SyncEvent) => {
      setSyncStatus(syncManager.getSyncStatus());
    };

    syncManager.addEventListener('status-change', handleStatusChange);
    syncManager.addEventListener('progress-update', handleProgressUpdate);
    syncManager.addEventListener('sync-complete', handleSyncComplete);

    return () => {
      syncManager.removeEventListener('status-change', handleStatusChange);
      syncManager.removeEventListener('progress-update', handleProgressUpdate);
      syncManager.removeEventListener('sync-complete', handleSyncComplete);
    };
  }, []);

  const getStatusColor = () => {
    if (!syncStatus.isOnline) return 'bg-red-500';
    if (syncStatus.isSyncing) return 'bg-yellow-500';
    if (syncStatus.pendingItems > 0) return 'bg-orange-500';
    if (syncStatus.failedItems > 0) return 'bg-red-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!syncStatus.isOnline) return 'অফলাইন';
    if (syncStatus.isSyncing) return 'সিঙ্ক হচ্ছে...';
    if (syncStatus.pendingItems > 0) return `${syncStatus.pendingItems} আইটেম বাকি`;
    if (syncStatus.failedItems > 0) return `${syncStatus.failedItems} ব্যর্থ`;
    return 'সিঙ্ক সম্পন্ন';
  };

  const formatLastSync = () => {
    if (!syncStatus.lastSyncTime) return 'কখনো নয়';
    
    const now = new Date();
    const diff = now.getTime() - syncStatus.lastSyncTime.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'এইমাত্র';
    if (minutes < 60) return `${minutes} মিনিট আগে`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ঘন্টা আগে`;
    
    const days = Math.floor(hours / 24);
    return `${days} দিন আগে`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Sync status"
      >
        <div className="relative">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}>
            {syncStatus.isSyncing && (
              <div className="absolute inset-0 rounded-full bg-yellow-500 animate-ping opacity-75"></div>
            )}
          </div>
        </div>
        <span className="text-sm font-medium text-gray-700">{getStatusText()}</span>
      </button>

      {showDetails && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">সিঙ্ক স্ট্যাটাস</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">সংযোগ:</span>
                <span className={`font-medium ${syncStatus.isOnline ? 'text-green-600' : 'text-red-600'}`}>
                  {syncStatus.isOnline ? 'অনলাইন' : 'অফলাইন'}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">শেষ সিঙ্ক:</span>
                <span className="font-medium text-gray-900">{formatLastSync()}</span>
              </div>

              {syncStatus.pendingItems > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">বাকি আইটেম:</span>
                  <span className="font-medium text-orange-600">{syncStatus.pendingItems}</span>
                </div>
              )}

              {syncStatus.failedItems > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">ব্যর্থ আইটেম:</span>
                  <span className="font-medium text-red-600">{syncStatus.failedItems}</span>
                </div>
              )}

              {syncStatus.isSyncing && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">অগ্রগতি:</span>
                    <span className="font-medium text-gray-900">{syncStatus.syncProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${syncStatus.syncProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {syncStatus.isOnline && !syncStatus.isSyncing && (
              <button
                onClick={() => syncManager.forcSync()}
                className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                এখনই সিঙ্ক করুন
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
