// Cache Manager for API responses and offline data
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

interface CacheConfig {
  defaultTTL: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
  storageKey: string;
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes default
      maxSize: 100,
      storageKey: 'shikkhasathi_cache',
      ...config
    };

    this.loadFromStorage();
  }

  // Set data in cache
  set<T>(key: string, data: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.config.defaultTTL);
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry
    });

    // Enforce max size
    if (this.cache.size > this.config.maxSize) {
      const oldestKey = this.getOldestKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.saveToStorage();
  }

  // Get data from cache
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }

    return entry.data as T;
  }

  // Check if key exists and is valid
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.saveToStorage();
      return false;
    }

    return true;
  }

  // Delete specific key
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result) {
      this.saveToStorage();
    }
    return result;
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    this.saveToStorage();
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      maxSize: this.config.maxSize,
      defaultTTL: this.config.defaultTTL
    };
  }

  // Clean expired entries
  cleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.saveToStorage();
    }

    return cleanedCount;
  }

  // Get oldest key for eviction
  private getOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  // Save cache to localStorage
  private saveToStorage(): void {
    try {
      const cacheData = Array.from(this.cache.entries());
      localStorage.setItem(this.config.storageKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save cache to storage:', error);
    }
  }

  // Load cache from localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const cacheData = JSON.parse(stored);
        this.cache = new Map(cacheData);
        
        // Clean expired entries on load
        this.cleanup();
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
      this.cache = new Map();
    }
  }
}

// Create cache instances for different data types
export const apiCache = new CacheManager({
  defaultTTL: 5 * 60 * 1000, // 5 minutes for API responses
  maxSize: 50,
  storageKey: 'shikkhasathi_api_cache'
});

export const dashboardCache = new CacheManager({
  defaultTTL: 2 * 60 * 1000, // 2 minutes for dashboard data
  maxSize: 20,
  storageKey: 'shikkhasathi_dashboard_cache'
});

export const quizCache = new CacheManager({
  defaultTTL: 10 * 60 * 1000, // 10 minutes for quiz data
  maxSize: 30,
  storageKey: 'shikkhasathi_quiz_cache'
});

// Cache key generators
export const cacheKeys = {
  dashboardData: (userId: string) => `dashboard_${userId}`,
  userProfile: (userId: string) => `user_${userId}`,
  quizList: (subject?: string, difficulty?: number) => 
    `quiz_list_${subject || 'all'}_${difficulty || 'all'}`,
  quiz: (quizId: string) => `quiz_${quizId}`,
  quizResults: (attemptId: string) => `quiz_results_${attemptId}`,
  chatHistory: (sessionId: string) => `chat_history_${sessionId}`,
  gamificationData: (userId: string) => `gamification_${userId}`,
  leaderboard: (type: string, timeframe: string) => `leaderboard_${type}_${timeframe}`,
  teacherAnalytics: (teacherId: string) => `teacher_analytics_${teacherId}`,
  parentData: (parentId: string, childId: string) => `parent_${parentId}_child_${childId}`
};

// Cache-aware API wrapper
export function withCache<T>(
  cacheManager: CacheManager,
  key: string,
  apiCall: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Check cache first
  const cached = cacheManager.get<T>(key);
  if (cached !== null) {
    return Promise.resolve(cached);
  }

  // Make API call and cache result
  return apiCall().then(result => {
    cacheManager.set(key, result, ttl);
    return result;
  });
}

// Invalidate related cache entries
export function invalidateCache(pattern: string): void {
  const caches = [apiCache, dashboardCache, quizCache];
  
  caches.forEach(cache => {
    const keysToDelete: string[] = [];
    
    // Get all keys that match the pattern
    for (const [key] of (cache as any).cache.entries()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    // Delete matching keys
    keysToDelete.forEach(key => cache.delete(key));
  });
}

// Preload cache with essential data
export async function preloadCache(userId: string): Promise<void> {
  try {
    const { dashboardAPI, gamificationAPI } = require('./apiClient');
    
    // Preload dashboard data
    const dashboardData = await dashboardAPI.getDashboardData();
    dashboardCache.set(cacheKeys.dashboardData(userId), dashboardData);
    
    // Preload gamification data
    const gamificationData = await gamificationAPI.getGamificationData();
    apiCache.set(cacheKeys.gamificationData(userId), gamificationData);
    
  } catch (error) {
    console.warn('Failed to preload cache:', error);
  }
}

// Cache cleanup on app start
export function initializeCache(): void {
  // Clean expired entries
  apiCache.cleanup();
  dashboardCache.cleanup();
  quizCache.cleanup();
  
  // Log cache stats in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Cache stats:', {
      api: apiCache.getStats(),
      dashboard: dashboardCache.getStats(),
      quiz: quizCache.getStats()
    });
  }
}

export default CacheManager;