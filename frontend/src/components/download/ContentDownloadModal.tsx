/**
 * Content Download Modal Component
 * Provides interface for selecting and downloading content for offline access
 * Requirements: 4.4 - Allow students to select and download specific subjects or topics for offline access
 */

import React, { useState, useEffect } from 'react';
import { X, Download, HardDrive, Wifi, WifiOff, CheckCircle, AlertCircle } from 'lucide-react';
import { contentDownloadService, DownloadableContent, ContentSelection, StorageQuota } from '../../services/contentDownloadService';

interface ContentDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Interface for future use when implementing chapter-based selection
// interface SubjectData {
//   subject: string;
//   grade: number;
//   chapters: Array<{
//     number: number;
//     title: string;
//     topics: Array<{
//       name: string;
//       size: number;
//       downloaded: boolean;
//     }>;
//   }>;
// }

export const ContentDownloadModal: React.FC<ContentDownloadModalProps> = ({
  isOpen,
  onClose
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<number>(6);
  const [selectedLanguage, setSelectedLanguage] = useState<'bangla' | 'english'>('bangla');
  const [availableContent, setAvailableContent] = useState<DownloadableContent[]>([]);
  const [selectedContent, setSelectedContent] = useState<Set<string>>(new Set());
  const [storageQuota, setStorageQuota] = useState<StorageQuota | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const subjects = [
    'Mathematics',
    'Science',
    'English',
    'Bangla',
    'Social Studies',
    'Religion',
    'ICT'
  ];

  const grades = [6, 7, 8, 9, 10];

  useEffect(() => {
    if (isOpen) {
      loadStorageQuota();
      loadAvailableContent();
    }
  }, [isOpen, selectedSubject, selectedGrade, selectedLanguage]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadStorageQuota = async () => {
    try {
      const quota = await contentDownloadService.getStorageQuota();
      setStorageQuota(quota);
    } catch (error) {
      console.error('Failed to load storage quota:', error);
    }
  };

  const loadAvailableContent = async () => {
    if (!selectedSubject) return;

    setLoading(true);
    setError(null);

    try {
      const selection: ContentSelection = {
        subject: selectedSubject,
        grade: selectedGrade,
        language: selectedLanguage
      };

      const content = await contentDownloadService.getAvailableContent(selection);
      setAvailableContent(content);

      // Check which content is already downloaded
      const downloaded = await contentDownloadService.getDownloadedContent(selectedSubject, selectedGrade);
      const downloadedIds = new Set(downloaded.map(item => item.id));
      
      // Remove already downloaded content from selection
      setSelectedContent(prev => {
        const newSelection = new Set(prev);
        downloadedIds.forEach(id => newSelection.delete(id));
        return newSelection;
      });

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const handleContentToggle = (contentId: string) => {
    setSelectedContent(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(contentId)) {
        newSelection.delete(contentId);
      } else {
        newSelection.add(contentId);
      }
      return newSelection;
    });
  };

  const handleSelectAll = () => {
    const availableIds = availableContent
      .filter(content => !isContentDownloaded(content.id))
      .map(content => content.id);
    
    setSelectedContent(new Set(availableIds));
  };

  const handleDeselectAll = () => {
    setSelectedContent(new Set());
  };

  const isContentDownloaded = (_contentId: string): boolean => {
    // This would be checked against downloaded content
    // For now, we'll assume none are downloaded
    return false;
  };

  const getSelectedSize = (): number => {
    return availableContent
      .filter(content => selectedContent.has(content.id))
      .reduce((total, content) => total + content.size, 0);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = async () => {
    if (selectedContent.size === 0) return;

    const contentToDownload = availableContent.filter(content => 
      selectedContent.has(content.id)
    );

    const totalSize = getSelectedSize();
    
    // Check storage space
    if (storageQuota && storageQuota.available < totalSize) {
      setError(`Insufficient storage space. Need ${formatBytes(totalSize)}, but only ${formatBytes(storageQuota.available)} available.`);
      return;
    }

    try {
      await contentDownloadService.addToQueue(contentToDownload);
      setSelectedContent(new Set());
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start download');
    }
  };

  const groupContentByChapter = (content: DownloadableContent[]): Record<number, DownloadableContent[]> => {
    return content.reduce((groups, item) => {
      if (!groups[item.chapter]) {
        groups[item.chapter] = [];
      }
      groups[item.chapter].push(item);
      return groups;
    }, {} as Record<number, DownloadableContent[]>);
  };

  if (!isOpen) return null;

  const selectedSize = getSelectedSize();
  const groupedContent = groupContentByChapter(availableContent);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Download className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Download Content for Offline Access</h2>
          </div>
          <div className="flex items-center space-x-4">
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
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Storage Info */}
        {storageQuota && (
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <HardDrive className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Storage Usage</span>
              </div>
              <span className="text-sm text-gray-600">
                {formatBytes(storageQuota.used)} / {formatBytes(storageQuota.total)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${storageQuota.percentage}%` }}
              />
            </div>
            {selectedSize > 0 && (
              <div className="mt-2 text-sm text-blue-600">
                Selected: {formatBytes(selectedSize)}
              </div>
            )}
          </div>
        )}

        {/* Content Selection */}
        <div className="flex-1 overflow-hidden">
          <div className="p-6">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!isOnline}
                >
                  <option value="">Select Subject</option>
                  {subjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grade
                </label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!isOnline}
                >
                  {grades.map(grade => (
                    <option key={grade} value={grade}>Grade {grade}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value as 'bangla' | 'english')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!isOnline}
                >
                  <option value="bangla">Bangla</option>
                  <option value="english">English</option>
                </select>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {/* Content List */}
            {!isOnline ? (
              <div className="text-center py-8 text-gray-500">
                <WifiOff className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Internet connection required to browse and download content</p>
              </div>
            ) : loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading available content...</p>
              </div>
            ) : availableContent.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No content available for the selected criteria</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Selection Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={handleSelectAll}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Select All
                    </button>
                    <button
                      onClick={handleDeselectAll}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      Deselect All
                    </button>
                  </div>
                  <div className="text-sm text-gray-600">
                    {selectedContent.size} of {availableContent.length} selected
                  </div>
                </div>

                {/* Content by Chapter */}
                <div className="max-h-96 overflow-y-auto space-y-4">
                  {Object.entries(groupedContent).map(([chapterNum, chapterContent]) => (
                    <div key={chapterNum} className="border border-gray-200 rounded-lg">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <h3 className="font-medium text-gray-900">
                          Chapter {chapterNum}
                        </h3>
                      </div>
                      <div className="p-4 space-y-2">
                        {chapterContent.map(content => {
                          const isDownloaded = isContentDownloaded(content.id);
                          const isSelected = selectedContent.has(content.id);
                          
                          return (
                            <div
                              key={content.id}
                              className={`flex items-center justify-between p-3 rounded-md border ${
                                isDownloaded
                                  ? 'bg-green-50 border-green-200'
                                  : isSelected
                                  ? 'bg-blue-50 border-blue-200'
                                  : 'bg-white border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                {isDownloaded ? (
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleContentToggle(content.id)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                )}
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {content.title}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {content.topic}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-gray-600">
                                  {formatBytes(content.size)}
                                </div>
                                {isDownloaded && (
                                  <div className="text-xs text-green-600">
                                    Downloaded
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedContent.size > 0 && (
              <>Selected: {selectedContent.size} items ({formatBytes(selectedSize)})</>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              disabled={selectedContent.size === 0 || !isOnline}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Selected</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};