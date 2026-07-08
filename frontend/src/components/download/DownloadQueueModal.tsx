/**
 * Download Queue Modal Component
 * Displays and manages the download queue with progress tracking
 * Requirements: 4.4 - Progressive download with progress tracking and queue management
 */

import React, { useState, useEffect } from 'react';
import { X, Download, Pause, Play, Trash2, RotateCcw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { contentDownloadService, DownloadQueue, DownloadItem, DownloadProgress } from '../../services/contentDownloadService';

interface DownloadQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadQueueModal: React.FC<DownloadQueueModalProps> = ({
  isOpen,
  onClose
}) => {
  const [queue, setQueue] = useState<DownloadQueue>({ items: [], isActive: false });
  const [downloadProgress, setDownloadProgress] = useState<Map<string, DownloadProgress>>(new Map());

  useEffect(() => {
    if (!isOpen) return;

    // Load initial queue
    setQueue(contentDownloadService.getQueue());

    // Set up event listeners
    const handleQueueUpdate = (updatedQueue: DownloadQueue) => {
      setQueue(updatedQueue);
    };

    const handleDownloadProgress = (progress: DownloadProgress) => {
      setDownloadProgress(prev => new Map(prev.set(progress.itemId, progress)));
    };

    const handleDownloadCompleted = ({ itemId }: { itemId: string }) => {
      setDownloadProgress(prev => {
        const newMap = new Map(prev);
        newMap.delete(itemId);
        return newMap;
      });
    };

    const handleDownloadFailed = ({ itemId }: { itemId: string }) => {
      setDownloadProgress(prev => {
        const newMap = new Map(prev);
        newMap.delete(itemId);
        return newMap;
      });
    };

    contentDownloadService.addEventListener('queue-updated', handleQueueUpdate);
    contentDownloadService.addEventListener('download-progress', handleDownloadProgress);
    contentDownloadService.addEventListener('download-completed', handleDownloadCompleted);
    contentDownloadService.addEventListener('download-failed', handleDownloadFailed);

    return () => {
      contentDownloadService.removeEventListener('queue-updated', handleQueueUpdate);
      contentDownloadService.removeEventListener('download-progress', handleDownloadProgress);
      contentDownloadService.removeEventListener('download-completed', handleDownloadCompleted);
      contentDownloadService.removeEventListener('download-failed', handleDownloadFailed);
    };
  }, [isOpen]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  const handlePauseResume = async (item: DownloadItem) => {
    if (item.status === 'downloading') {
      await contentDownloadService.pauseDownload(item.id);
    } else if (item.status === 'paused') {
      await contentDownloadService.resumeDownload(item.id);
    }
  };

  const handleRemove = async (itemId: string) => {
    await contentDownloadService.removeFromQueue(itemId);
  };

  const handleClearQueue = async () => {
    if (window.confirm('Are you sure you want to clear the entire download queue?')) {
      await contentDownloadService.clearQueue();
    }
  };

  const getStatusIcon = (item: DownloadItem) => {
    switch (item.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'downloading':
        return <Download className="w-5 h-5 text-blue-600 animate-pulse" />;
      case 'paused':
        return <Pause className="w-5 h-5 text-yellow-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-gray-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'downloading':
        return 'text-blue-600 bg-blue-50';
      case 'paused':
        return 'text-yellow-600 bg-yellow-50';
      case 'pending':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const totalItems = queue.items.length;
  const completedItems = queue.items.filter(item => item.status === 'completed').length;
  const failedItems = queue.items.filter(item => item.status === 'failed').length;
  const activeItems = queue.items.filter(item => item.status === 'downloading').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Download className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Download Queue</h2>
              <p className="text-sm text-gray-600">
                {totalItems} items • {completedItems} completed • {failedItems} failed • {activeItems} downloading
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {totalItems > 0 && (
              <button
                onClick={handleClearQueue}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear All</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Queue Status */}
        {queue.isActive && (
          <div className="p-4 bg-blue-50 border-b">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-blue-700 font-medium">Queue is active</span>
            </div>
          </div>
        )}

        {/* Queue Items */}
        <div className="flex-1 overflow-y-auto">
          {totalItems === 0 ? (
            <div className="text-center py-12">
              <Download className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No downloads in queue</h3>
              <p className="text-gray-600">Start downloading content to see it here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {queue.items.map(item => {
                const progress = downloadProgress.get(item.id);
                
                return (
                  <div key={item.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        {getStatusIcon(item)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium text-gray-900 truncate">
                              {item.content.title}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-600 mb-3">
                            {item.content.subject} • Grade {item.content.grade} • Chapter {item.content.chapter}
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                              <span>
                                {formatBytes(item.downloadedBytes)} / {formatBytes(item.totalBytes)}
                              </span>
                              <span>{Math.round(item.progress)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  item.status === 'completed'
                                    ? 'bg-green-600'
                                    : item.status === 'failed'
                                    ? 'bg-red-600'
                                    : item.status === 'downloading'
                                    ? 'bg-blue-600'
                                    : 'bg-gray-400'
                                }`}
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                          </div>

                          {/* Download Info */}
                          {progress && item.status === 'downloading' && (
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span>{formatSpeed(progress.speed)}</span>
                              <span>ETA: {formatTime(progress.estimatedTimeRemaining)}</span>
                            </div>
                          )}

                          {item.status === 'failed' && item.error && (
                            <div className="text-sm text-red-600 mt-2">
                              Error: {item.error}
                              {item.retryCount > 0 && (
                                <span className="ml-2">
                                  (Retry {item.retryCount}/3)
                                </span>
                              )}
                            </div>
                          )}

                          {item.status === 'completed' && item.completedTime && (
                            <div className="text-sm text-green-600 mt-2">
                              Completed at {item.completedTime.toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 ml-4">
                        {(item.status === 'downloading' || item.status === 'paused') && (
                          <button
                            onClick={() => handlePauseResume(item)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                            title={item.status === 'downloading' ? 'Pause' : 'Resume'}
                          >
                            {item.status === 'downloading' ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        
                        {item.status === 'failed' && (
                          <button
                            onClick={() => handlePauseResume(item)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Retry"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleRemove(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Remove from queue"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {totalItems > 0 && (
              <>
                {completedItems} of {totalItems} completed
                {failedItems > 0 && (
                  <span className="text-red-600 ml-2">• {failedItems} failed</span>
                )}
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};