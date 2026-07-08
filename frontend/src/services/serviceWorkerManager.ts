import { Workbox } from 'workbox-window';
import { getApiBaseUrl } from '../utils/apiUrl';

export interface SyncData {
  type: 'quiz-attempt' | 'progress-update' | 'chat-message';
  data: any;
  timestamp: number;
  id: string;
}

class ServiceWorkerManager {
  private wb: Workbox | null = null;
  private isOnline = navigator.onLine;
  private syncQueue: SyncData[] = [];

  constructor() {
    this.initializeServiceWorker();
    this.setupOnlineOfflineListeners();
  }

  private initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
      this.wb = new Workbox('/sw.js');
      
      this.wb.addEventListener('waiting', (event) => {
        // Show update available notification
        this.showUpdateAvailable();
      });

      this.wb.addEventListener('controlling', (event) => {
        // Reload page when new service worker takes control
        window.location.reload();
      });

      this.wb.register();
    }
  }

  private setupOnlineOfflineListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  public isOnlineStatus(): boolean {
    return this.isOnline;
  }

  public addToSyncQueue(syncData: SyncData) {
    this.syncQueue.push(syncData);
    
    // Store in IndexedDB for persistence
    this.storeSyncData(syncData);
    
    // Try to sync immediately if online
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  private async storeSyncData(syncData: SyncData) {
    try {
      const db = await this.openSyncDB();
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      await store.add(syncData);
    } catch (error) {
      console.error('Failed to store sync data:', error);
    }
  }

  private async openSyncDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ShikkhaSathiSync', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('syncQueue')) {
          const store = db.createObjectStore('syncQueue', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  private async processSyncQueue() {
    if (!this.isOnline || this.syncQueue.length === 0) return;

    const itemsToSync = [...this.syncQueue];
    this.syncQueue = [];

    for (const item of itemsToSync) {
      try {
        await this.syncItem(item);
        await this.removeSyncData(item.id);
      } catch (error) {
        console.error('Failed to sync item:', error);
        // Re-add to queue for retry
        this.syncQueue.push(item);
      }
    }
  }

  private async syncItem(item: SyncData): Promise<void> {
    const baseUrl = import.meta.env.VITE_API_URL || getApiBaseUrl();
    
    switch (item.type) {
      case 'quiz-attempt':
        await fetch(`${baseUrl}/api/v1/quiz/attempts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(item.data),
        });
        break;
        
      case 'progress-update':
        await fetch(`${baseUrl}/api/v1/progress`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(item.data),
        });
        break;
        
      case 'chat-message':
        await fetch(`${baseUrl}/api/v1/chat/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(item.data),
        });
        break;
    }
  }

  private async removeSyncData(id: string) {
    try {
      const db = await this.openSyncDB();
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      await store.delete(id);
    } catch (error) {
      console.error('Failed to remove sync data:', error);
    }
  }

  private showUpdateAvailable() {
    // Create a simple notification for update availability
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50';
    notification.innerHTML = `
      <div class="flex items-center justify-between">
        <span>নতুন আপডেট উপলব্ধ</span>
        <button id="update-btn" class="ml-4 bg-white text-blue-600 px-3 py-1 rounded text-sm">
          আপডেট করুন
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    document.getElementById('update-btn')?.addEventListener('click', () => {
      if (this.wb) {
        this.wb.messageSkipWaiting();
      }
      notification.remove();
    });
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 10000);
  }

  public async clearCache(cacheName?: string) {
    if ('caches' in window) {
      if (cacheName) {
        await caches.delete(cacheName);
      } else {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
    }
  }

  public async getCacheSize(): Promise<number> {
    if (!('caches' in window)) return 0;
    
    let totalSize = 0;
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
    }
    
    return totalSize;
  }
}

export const serviceWorkerManager = new ServiceWorkerManager();