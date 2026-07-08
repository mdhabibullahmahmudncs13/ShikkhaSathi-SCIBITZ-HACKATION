// Graceful degradation service for handling service failures
import React from 'react';
import { logger } from './logger';

interface ServiceStatus {
  name: string;
  isAvailable: boolean;
  lastChecked: Date;
  errorCount: number;
  maxRetries: number;
}

interface FallbackConfig {
  enableOfflineMode: boolean;
  enableCachedData: boolean;
  enableReducedFeatures: boolean;
  showDegradationNotice: boolean;
}

class GracefulDegradationService {
  private services: Map<string, ServiceStatus> = new Map();
  private config: FallbackConfig = {
    enableOfflineMode: true,
    enableCachedData: true,
    enableReducedFeatures: true,
    showDegradationNotice: true
  };
  private listeners: ((status: Map<string, ServiceStatus>) => void)[] = [];

  constructor() {
    this.initializeServices();
    this.startHealthChecks();
  }

  private initializeServices() {
    const serviceNames = [
      'api',
      'chat',
      'quiz',
      'voice',
      'gamification',
      'analytics'
    ];

    serviceNames.forEach(name => {
      this.services.set(name, {
        name,
        isAvailable: true,
        lastChecked: new Date(),
        errorCount: 0,
        maxRetries: 3
      });
    });
  }

  // Register service failure
  reportServiceFailure(serviceName: string, error: Error) {
    const service = this.services.get(serviceName);
    if (!service) return;

    service.errorCount++;
    service.lastChecked = new Date();

    // Mark as unavailable if error count exceeds threshold
    if (service.errorCount >= service.maxRetries) {
      service.isAvailable = false;
      logger.warn(`Service ${serviceName} marked as unavailable after ${service.errorCount} failures`);
      this.notifyListeners();
    }

    logger.error(`Service failure reported for ${serviceName}`, {
      error: error.message,
      errorCount: service.errorCount,
      isAvailable: service.isAvailable
    });
  }

  // Report service recovery
  reportServiceRecovery(serviceName: string) {
    const service = this.services.get(serviceName);
    if (!service) return;

    service.isAvailable = true;
    service.errorCount = 0;
    service.lastChecked = new Date();

    logger.info(`Service ${serviceName} recovered`);
    this.notifyListeners();
  }

  // Check if service is available
  isServiceAvailable(serviceName: string): boolean {
    const service = this.services.get(serviceName);
    return service ? service.isAvailable : false;
  }

  // Get fallback for unavailable service
  getFallbackStrategy(serviceName: string): string {
    if (!this.isServiceAvailable(serviceName)) {
      switch (serviceName) {
        case 'api':
          return 'offline_mode';
        case 'chat':
          return 'cached_responses';
        case 'quiz':
          return 'offline_quizzes';
        case 'voice':
          return 'text_only';
        case 'gamification':
          return 'local_tracking';
        case 'analytics':
          return 'basic_stats';
        default:
          return 'disabled';
      }
    }
    return 'normal';
  }

  // Get user-friendly degradation message
  getDegradationMessage(serviceName: string): string {
    const strategy = this.getFallbackStrategy(serviceName);
    
    const messages = {
      offline_mode: 'ইন্টারনেট সংযোগ নেই। অফলাইন মোডে কাজ করছি।',
      cached_responses: 'AI টিউটর সাময়িকভাবে বন্ধ। সংরক্ষিত উত্তর দেখাচ্ছি।',
      offline_quizzes: 'কুইজ সেবা বন্ধ। অফলাইন কুইজ উপলব্ধ।',
      text_only: 'ভয়েস সেবা বন্ধ। শুধু টেক্সট ব্যবহার করুন।',
      local_tracking: 'গেমিফিকেশন সেবা বন্ধ। স্থানীয় ট্র্যাকিং চালু।',
      basic_stats: 'বিশ্লেষণ সেবা বন্ধ। মৌলিক পরিসংখ্যান দেখাচ্ছি।',
      disabled: 'এই সেবা সাময়িকভাবে বন্ধ।'
    };

    return messages[strategy as keyof typeof messages] || 'সেবায় সমস্যা হয়েছে।';
  }

  // Execute with fallback
  async executeWithFallback<T>(
    serviceName: string,
    primaryAction: () => Promise<T>,
    fallbackAction?: () => Promise<T> | T
  ): Promise<T> {
    try {
      if (!this.isServiceAvailable(serviceName)) {
        throw new Error(`Service ${serviceName} is not available`);
      }

      const result = await primaryAction();
      
      // Report success if service was previously failing
      const service = this.services.get(serviceName);
      if (service && service.errorCount > 0) {
        this.reportServiceRecovery(serviceName);
      }

      return result;
    } catch (error) {
      this.reportServiceFailure(serviceName, error as Error);

      if (fallbackAction) {
        logger.info(`Using fallback for ${serviceName}`);
        return await fallbackAction();
      }

      throw error;
    }
  }

  // Get cached data as fallback
  getCachedFallback<T>(key: string, defaultValue: T): T {
    try {
      const cached = localStorage.getItem(`fallback_${key}`);
      return cached ? JSON.parse(cached) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  // Cache data for fallback use
  cacheFallbackData<T>(key: string, data: T): void {
    try {
      localStorage.setItem(`fallback_${key}`, JSON.stringify(data));
    } catch (error) {
      logger.warn('Failed to cache fallback data', { key, error });
    }
  }

  // Start periodic health checks
  private startHealthChecks() {
    setInterval(() => {
      this.performHealthChecks();
    }, 30000); // Check every 30 seconds
  }

  private async performHealthChecks() {
    for (const [serviceName, service] of this.services.entries()) {
      if (!service.isAvailable) {
        // Try to recover failed services
        try {
          await this.checkServiceHealth(serviceName);
          this.reportServiceRecovery(serviceName);
        } catch {
          // Service still unavailable
        }
      }
    }
  }

  private async checkServiceHealth(serviceName: string): Promise<void> {
    switch (serviceName) {
      case 'api':
        const response = await fetch('/health');
        if (!response.ok) throw new Error('API health check failed');
        break;
      case 'chat':
        // Check WebSocket connection
        break;
      default:
        // Basic connectivity check
        break;
    }
  }

  // Subscribe to service status changes
  subscribe(listener: (status: Map<string, ServiceStatus>) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(new Map(this.services)));
  }

  // Get overall system status
  getSystemStatus(): 'healthy' | 'degraded' | 'critical' {
    const services = Array.from(this.services.values());
    const unavailableCount = services.filter(s => !s.isAvailable).length;
    const totalServices = services.length;

    if (unavailableCount === 0) return 'healthy';
    if (unavailableCount < totalServices / 2) return 'degraded';
    return 'critical';
  }

  // Get degradation notice for UI
  getDegradationNotice(): string | null {
    const status = this.getSystemStatus();
    
    if (status === 'healthy') return null;
    
    const unavailableServices = Array.from(this.services.values())
      .filter(s => !s.isAvailable)
      .map(s => s.name);

    if (status === 'critical') {
      return 'একাধিক সেবায় সমস্যা হয়েছে। সীমিত কার্যকারিতা উপলব্ধ।';
    }

    return `কিছু সেবায় সমস্যা হয়েছে (${unavailableServices.join(', ')})। বিকল্প ব্যবস্থা চালু।`;
  }

  // Enable/disable features based on service availability
  getFeatureFlags(): Record<string, boolean> {
    return {
      chatEnabled: this.isServiceAvailable('chat'),
      voiceEnabled: this.isServiceAvailable('voice'),
      quizEnabled: this.isServiceAvailable('quiz'),
      analyticsEnabled: this.isServiceAvailable('analytics'),
      gamificationEnabled: this.isServiceAvailable('gamification'),
      offlineMode: !this.isServiceAvailable('api')
    };
  }
}

// Create global instance
export const gracefulDegradation = new GracefulDegradationService();

// React hook for using graceful degradation
export function useGracefulDegradation() {
  const [services, setServices] = React.useState(new Map());
  const [systemStatus, setSystemStatus] = React.useState<'healthy' | 'degraded' | 'critical'>('healthy');

  React.useEffect(() => {
    const unsubscribe = gracefulDegradation.subscribe((updatedServices) => {
      setServices(new Map(updatedServices));
      setSystemStatus(gracefulDegradation.getSystemStatus());
    });

    return unsubscribe;
  }, []);

  return {
    services,
    systemStatus,
    isServiceAvailable: gracefulDegradation.isServiceAvailable.bind(gracefulDegradation),
    getFallbackStrategy: gracefulDegradation.getFallbackStrategy.bind(gracefulDegradation),
    getDegradationMessage: gracefulDegradation.getDegradationMessage.bind(gracefulDegradation),
    executeWithFallback: gracefulDegradation.executeWithFallback.bind(gracefulDegradation),
    getFeatureFlags: gracefulDegradation.getFeatureFlags.bind(gracefulDegradation),
    getDegradationNotice: gracefulDegradation.getDegradationNotice.bind(gracefulDegradation)
  };
}

export default gracefulDegradation;