/**
 * Download Manager Component
 * Main interface for managing content downloads and offline access
 * Requirements: 4.4 - Allow students to select and download specific subjects or topics for offline access
 */

import React, { useState, useEffect } from 'react';
import { Download, HardDrive, Wifi, WifiOff, Settings, Trash2, RefreshCw } from 'lucide-react';
import { ContentDownloadModal } from './ContentDownloadModal';
import { DownloadQueueModal } from './DownloadQueueModal';
import { contentDownloadService, StorageQuota } from '../../services/contentDownloadService';
import { offlineStorage } from '../../services/offlineStorage';

export const DownloadManager: React.FC = () => {
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [storageQuota, setStorageQuota] = useState<StorageQuota | null>(null);
  const [downloadStats, setDownloadStats] = useState<{
    totalDownloaded: number;
    totalSize: number;
    bySubject: Record<string, { count: number; size: number }>;
  } | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    loadData();
    
    // Set up event listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleQueueUpdate = (queue: any) => setQueueCount(queue.items.length);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    contentDownloadService.addEventListener('queue-updated', handleQueueUpdate);

    // Load initial queue count
    setQueueCount(contentDownloadService.getQueue().items.length);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      contentDownloadService.removeEventListener('queue-updated', handleQueueUpdate);
    };
  }, []);

  const loadData = async () => {
    try {
      const [quota, stats] = await Promise.all([
        contentDownloadService.getStorageQuota(),
        contentDownloadService.getDownloadStats()
      ]);
      
      setStorageQuota(quota);
      setDownloadStats(stats);
    } catch (error) {
      console.error('Failed to load download manager data:', error);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCleanupOldContent = async () => {
    if (window.confirm('This will remove content that hasn\'t been accessed in the last 30 days. Continue?')) {
      try {
        await contentDownloadService.cleanupOldContent(30);
        await loadData();
      } catch (error) {
        console.error('Failed to cleanup old content:', error);
      }
    }
  };

  const handleClearAllContent = async () => {
    if (window.confirm('This will remove ALL downloaded content. This action cannot be undone. Continue?')) {
      try {
        await offlineStorage.clearAllData();
        await loadData();
      } catch (error) {
        console.error('Failed to clear all content:', error);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <HardDrive className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Offline Content</h2>
            <p className="text-sm text-gray-600">Manage downloads for offline access</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <Wifi className="w-5 h-5 text-green-600" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-600" />
          )}
          <span className={`text-sm ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Storage Usage */}
      {storageQuota && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">Storage Usage</h3>
            <span className="text-sm text-gray-600">
              {formatBytes(storageQuota.used)} / {formatBytes(storageQuota.total)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                storageQuota.percentage > 90
                  ? 'bg-red-600'
                  : storageQuota.percentage > 70
                  ? 'bg-yellow-600'
                  : 'bg-blue-600'
              }`}
              style={{ width: `${storageQuota.percentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{storageQuota.percentage.toFixed(1)}% used</span>
            <span>{formatBytes(storageQuota.available)} available</span>
          </div>
        </div>
      )}

      {/* Download Stats */}
      {downloadStats && (
        <div className="mb-6">
          <h3 className="font-medium text-gray-900 mb-3">Downloaded Content</h3>
          {downloadStats.totalDownloaded === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Download className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No content downloaded yet</p>
              <p className="text-sm">Download content to access it offline</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Total Items:</span>
                <span className="font-medium">{downloadStats.totalDownloaded}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Total Size:</span>
                <span className="font-medium">{formatBytes(downloadStats.totalSize)}</span>
              </div>
              
              {/* By Subject */}
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">By Subject</h4>
                <div className="space-y-2">
                  {Object.entries(downloadStats.bySubject).map(([subject, data]) => (
                    <div key={subject} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{subject}:</span>
                      <span className="text-gray-900">
                        {data.count} items ({formatBytes(data.size)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={() => setShowDownloadModal(true)}
          disabled={!isOnline}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-5 h-5" />
          <span>Download New Content</span>
        </button>

        <button
          onClick={() => setShowQueueModal(true)}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Settings className="w-5 h-5" />
          <span>
            Manage Downloads
            {queueCount > 0 && (
              <span className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                {queueCount}
              </span>
            )}
          </span>
        </button>

        <div className="flex space-x-3">
          <button
            onClick={handleCleanupOldContent}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Cleanup Old</span>
          </button>
          
          <button
            onClick={handleClearAllContent}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <ContentDownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
      />
      
      <DownloadQueueModal
        isOpen={showQueueModal}
        onClose={() => setShowQueueModal(false)}
      />
    </div>
  );
};