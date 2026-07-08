/**
 * Content Download Service
 * Handles downloading and managing offline content for the ShikkhaSathi platform
 * Requirements: 4.4 - Allow students to select and download specific subjects or topics for offline access
 */

import { offlineStorage, OfflineLessonContent } from './offlineStorage';

export interface DownloadableContent {
  id: string;
  subject: string;
  grade: number;
  chapter: number;
  topic: string;
  title: string;
  size: number; // Size in bytes
  language: 'bangla' | 'english';
  textbookName?: string;
  pageNumber?: number;
}

export interface DownloadItem {
  id: string;
  content: DownloadableContent;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused';
  progress: number; // 0-100
  downloadedBytes: number;
  totalBytes: number;
  startTime?: Date;
  completedTime?: Date;
  error?: string;
  retryCount: number;
}

export interface DownloadQueue {
  items: DownloadItem[];
  isActive: boolean;
  currentDownload?: string; // ID of currently downloading item
}

export interface StorageQuota {
  used: number; // Bytes used
  available: number; // Bytes available
  total: number; // Total quota
  percentage: number; // Percentage used
}

export interface DownloadProgress {
  itemId: string;
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  speed: number; // Bytes per second
  estimatedTimeRemaining: number; // Seconds
}

export interface ContentSelection {
  subject: string;
  grade: number;
  chapters?: number[];
  topics?: string[];
  language?: 'bangla' | 'english';
}

export class ContentDownloadService {
  private downloadQueue: DownloadQueue = {
    items: [],
    isActive: false
  };
  
  private eventListeners: Map<string, Function[]> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();
  private readonly MAX_CONCURRENT_DOWNLOADS = 2;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly CHUNK_SIZE = 1024 * 1024; // 1MB chunks

  constructor() {
    this.loadQueue();
  }

  // Event handling
  addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  removeEventListener(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Storage quota management
  async getStorageQuota(): Promise<StorageQuota> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const total = estimate.quota || 0;
      const available = total - used;
      const percentage = total > 0 ? (used / total) * 100 : 0;

      return {
        used,
        available,
        total,
        percentage
      };
    }

    // Fallback for browsers without storage API
    return {
      used: 0,
      available: 100 * 1024 * 1024, // 100MB fallback
      total: 100 * 1024 * 1024,
      percentage: 0
    };
  }

  async checkStorageSpace(requiredBytes: number): Promise<boolean> {
    const quota = await this.getStorageQuota();
    return quota.available >= requiredBytes;
  }

  // Content discovery
  async getAvailableContent(selection: ContentSelection): Promise<DownloadableContent[]> {
    try {
      const params = new URLSearchParams({
        subject: selection.subject,
        grade: selection.grade.toString(),
        ...(selection.language && { language: selection.language })
      });

      if (selection.chapters) {
        selection.chapters.forEach(chapter => {
          params.append('chapters', chapter.toString());
        });
      }

      if (selection.topics) {
        selection.topics.forEach(topic => {
          params.append('topics', topic);
        });
      }

      const response = await fetch(`/api/v1/content/available?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch available content: ${response.statusText}`);
      }

      const data = await response.json();
      return data.content || [];
    } catch (error) {
      console.error('Error fetching available content:', error);
      throw error;
    }
  }

  async getDownloadedContent(subject?: string, grade?: number): Promise<OfflineLessonContent[]> {
    if (subject && grade) {
      return await offlineStorage.getLessonsBySubject(subject, grade);
    }
    
    // Get all downloaded content
    const storage = await offlineStorage.exportData();
    return storage.lessonContent;
  }

  // Download queue management
  async addToQueue(content: DownloadableContent[]): Promise<void> {
    const newItems: DownloadItem[] = content.map(item => ({
      id: `download-${item.id}-${Date.now()}`,
      content: item,
      status: 'pending',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: item.size,
      retryCount: 0
    }));

    // Check if items are already in queue or downloaded
    const queueIds = new Set(this.downloadQueue.items.map(item => item.content.id));
    const downloadedContent = await this.getDownloadedContent();
    const downloadedIds = new Set(downloadedContent.map(item => item.id));
    
    const filteredItems = newItems.filter(item => 
      !queueIds.has(item.content.id) && !downloadedIds.has(item.content.id)
    );
    
    this.downloadQueue.items.push(...filteredItems);
    await this.saveQueue();
    
    this.emit('queue-updated', this.downloadQueue);
    
    if (!this.downloadQueue.isActive) {
      this.startQueue();
    }
  }

  async removeFromQueue(itemId: string): Promise<void> {
    // Cancel download if in progress
    const abortController = this.abortControllers.get(itemId);
    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(itemId);
    }

    // Remove from queue
    this.downloadQueue.items = this.downloadQueue.items.filter(item => item.id !== itemId);
    
    if (this.downloadQueue.currentDownload === itemId) {
      this.downloadQueue.currentDownload = undefined;
    }

    await this.saveQueue();
    this.emit('queue-updated', this.downloadQueue);
  }

  async pauseDownload(itemId: string): Promise<void> {
    const item = this.downloadQueue.items.find(item => item.id === itemId);
    if (item && item.status === 'downloading') {
      const abortController = this.abortControllers.get(itemId);
      if (abortController) {
        abortController.abort();
        this.abortControllers.delete(itemId);
      }
      
      item.status = 'paused';
      await this.saveQueue();
      this.emit('download-paused', { itemId });
    }
  }

  async resumeDownload(itemId: string): Promise<void> {
    const item = this.downloadQueue.items.find(item => item.id === itemId);
    if (item && item.status === 'paused') {
      item.status = 'pending';
      await this.saveQueue();
      
      if (!this.downloadQueue.isActive) {
        this.startQueue();
      }
    }
  }

  async clearQueue(): Promise<void> {
    // Cancel all active downloads
    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }
    this.abortControllers.clear();

    this.downloadQueue.items = [];
    this.downloadQueue.isActive = false;
    this.downloadQueue.currentDownload = undefined;
    
    await this.saveQueue();
    this.emit('queue-cleared');
  }

  getQueue(): DownloadQueue {
    return { ...this.downloadQueue };
  }

  // Download processing
  private async startQueue(): Promise<void> {
    if (this.downloadQueue.isActive) return;
    
    this.downloadQueue.isActive = true;
    await this.saveQueue();
    
    this.emit('queue-started');
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    while (this.downloadQueue.isActive && this.downloadQueue.items.length > 0) {
      const activeDownloads = this.downloadQueue.items.filter(item => item.status === 'downloading').length;
      
      if (activeDownloads >= this.MAX_CONCURRENT_DOWNLOADS) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      const nextItem = this.downloadQueue.items.find(item => item.status === 'pending');
      if (!nextItem) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      await this.downloadItem(nextItem);
    }

    this.downloadQueue.isActive = false;
    this.downloadQueue.currentDownload = undefined;
    await this.saveQueue();
    this.emit('queue-completed');
  }

  private async downloadItem(item: DownloadItem): Promise<void> {
    try {
      // Check storage space
      const hasSpace = await this.checkStorageSpace(item.totalBytes - item.downloadedBytes);
      if (!hasSpace) {
        item.status = 'failed';
        item.error = 'Insufficient storage space';
        await this.saveQueue();
        this.emit('download-failed', { itemId: item.id, error: item.error });
        return;
      }

      item.status = 'downloading';
      item.startTime = new Date();
      this.downloadQueue.currentDownload = item.id;
      await this.saveQueue();

      const abortController = new AbortController();
      this.abortControllers.set(item.id, abortController);

      this.emit('download-started', { itemId: item.id });

      // Download content
      const response = await fetch(`/api/v1/content/download/${item.content.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Range': `bytes=${item.downloadedBytes}-`
        },
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const contentData: Uint8Array[] = [];
      let downloadedBytes = item.downloadedBytes;
      const startTime = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        contentData.push(value);
        downloadedBytes += value.length;
        
        const progress = (downloadedBytes / item.totalBytes) * 100;
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = elapsed > 0 ? downloadedBytes / elapsed : 0;
        const estimatedTimeRemaining = speed > 0 ? (item.totalBytes - downloadedBytes) / speed : 0;

        item.progress = progress;
        item.downloadedBytes = downloadedBytes;

        this.emit('download-progress', {
          itemId: item.id,
          progress,
          downloadedBytes,
          totalBytes: item.totalBytes,
          speed,
          estimatedTimeRemaining
        } as DownloadProgress);

        // Save progress periodically
        if (downloadedBytes % (this.CHUNK_SIZE * 5) === 0) {
          await this.saveQueue();
        }
      }

      // Combine all chunks
      const totalLength = contentData.reduce((sum, chunk) => sum + chunk.length, 0);
      const combinedData = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of contentData) {
        combinedData.set(chunk, offset);
        offset += chunk.length;
      }

      // Convert to text and verify integrity
      const contentText = new TextDecoder().decode(combinedData);
      // TODO: Implement content verification using hash
      // const contentHash = await this.calculateHash(contentText);
      
      // Save to offline storage
      const offlineContent: OfflineLessonContent = {
        id: item.content.id,
        subject: item.content.subject,
        grade: item.content.grade,
        chapter: item.content.chapter,
        topic: item.content.topic,
        title: item.content.title,
        content: contentText,
        metadata: {
          language: item.content.language,
          pageNumber: item.content.pageNumber,
          textbookName: item.content.textbookName
        },
        downloadedAt: new Date()
      };

      await offlineStorage.saveLessonContent(offlineContent);

      // Mark as completed
      item.status = 'completed';
      item.progress = 100;
      item.completedTime = new Date();
      
      this.abortControllers.delete(item.id);
      await this.saveQueue();

      this.emit('download-completed', { itemId: item.id, content: offlineContent });

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Download was cancelled
        return;
      }

      item.retryCount++;
      
      if (item.retryCount < this.MAX_RETRY_ATTEMPTS) {
        item.status = 'pending';
        item.error = undefined;
        
        // Exponential backoff
        const delay = Math.pow(2, item.retryCount) * 1000;
        setTimeout(() => {
          this.emit('download-retry', { itemId: item.id, attempt: item.retryCount });
        }, delay);
      } else {
        item.status = 'failed';
        item.error = error instanceof Error ? error.message : 'Unknown error';
        this.emit('download-failed', { itemId: item.id, error: item.error });
      }

      this.abortControllers.delete(item.id);
      await this.saveQueue();
    }
  }

  // Utility methods
  // TODO: Implement content verification using hash
  // private async calculateHash(content: string): Promise<string> {
  //   const encoder = new TextEncoder();
  //   const data = encoder.encode(content);
  //   const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  //   const hashArray = Array.from(new Uint8Array(hashBuffer));
  //   return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  // }

  private async saveQueue(): Promise<void> {
    try {
      localStorage.setItem('download-queue', JSON.stringify(this.downloadQueue));
    } catch (error) {
      console.error('Failed to save download queue:', error);
    }
  }

  private async loadQueue(): Promise<void> {
    try {
      const saved = localStorage.getItem('download-queue');
      if (saved) {
        this.downloadQueue = JSON.parse(saved);
        
        // Reset downloading status to pending on app restart
        this.downloadQueue.items.forEach(item => {
          if (item.status === 'downloading') {
            item.status = 'pending';
          }
        });
        
        this.downloadQueue.isActive = false;
        this.downloadQueue.currentDownload = undefined;
      }
    } catch (error) {
      console.error('Failed to load download queue:', error);
      this.downloadQueue = { items: [], isActive: false };
    }
  }

  // Content management
  async deleteDownloadedContent(contentId: string): Promise<void> {
    // Remove from offline storage
    await (offlineStorage as any).db.lessonContent.delete(contentId);
    this.emit('content-deleted', { contentId });
  }

  async getDownloadStats(): Promise<{
    totalDownloaded: number;
    totalSize: number;
    bySubject: Record<string, { count: number; size: number }>;
  }> {
    const content = await this.getDownloadedContent();
    
    const stats = {
      totalDownloaded: content.length,
      totalSize: 0,
      bySubject: {} as Record<string, { count: number; size: number }>
    };

    content.forEach(item => {
      const size = new Blob([item.content]).size;
      stats.totalSize += size;
      
      if (!stats.bySubject[item.subject]) {
        stats.bySubject[item.subject] = { count: 0, size: 0 };
      }
      
      stats.bySubject[item.subject].count++;
      stats.bySubject[item.subject].size += size;
    });

    return stats;
  }

  // Cleanup and maintenance
  async cleanupOldContent(daysOld: number = 30): Promise<void> {
    await offlineStorage.clearOldData(daysOld);
    this.emit('content-cleaned');
  }

  destroy(): void {
    // Cancel all downloads
    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }
    this.abortControllers.clear();
    
    // Clear event listeners
    this.eventListeners.clear();
    
    // Stop queue
    this.downloadQueue.isActive = false;
  }
}

export const contentDownloadService = new ContentDownloadService();