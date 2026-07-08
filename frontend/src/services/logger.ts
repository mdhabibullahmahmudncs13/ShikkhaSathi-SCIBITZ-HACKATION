// Comprehensive logging and monitoring system
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: any;
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
}

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: string;
  context?: any;
}

interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  userId?: string;
  url: string;
  userAgent: string;
  context?: any;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private sessionId: string;
  private userId?: string;

  constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.setupGlobalErrorHandling();
    this.setupPerformanceMonitoring();
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  private createLogEntry(
    level: LogEntry['level'],
    message: string,
    context?: any
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      userId: this.userId,
      sessionId: this.sessionId,
      url: window.location.href,
      userAgent: navigator.userAgent
    };
  }

  debug(message: string, context?: any) {
    const entry = this.createLogEntry('debug', message, context);
    this.addLog(entry);
    
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, context);
    }
  }

  info(message: string, context?: any) {
    const entry = this.createLogEntry('info', message, context);
    this.addLog(entry);
    console.info(`[INFO] ${message}`, context);
  }

  warn(message: string, context?: any) {
    const entry = this.createLogEntry('warn', message, context);
    this.addLog(entry);
    console.warn(`[WARN] ${message}`, context);
  }

  error(message: string, context?: any) {
    const entry = this.createLogEntry('error', message, context);
    this.addLog(entry);
    console.error(`[ERROR] ${message}`, context);
    
    // Send error to monitoring service
    this.reportError({
      message,
      timestamp: entry.timestamp,
      userId: this.userId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      context
    });
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Store in localStorage for persistence
    this.persistLogs();
  }

  private persistLogs() {
    try {
      const recentLogs = this.logs.slice(-100); // Keep only 100 most recent
      localStorage.setItem('shikkhasathi_logs', JSON.stringify(recentLogs));
    } catch (error) {
      console.warn('Failed to persist logs:', error);
    }
  }

  private loadPersistedLogs() {
    try {
      const stored = localStorage.getItem('shikkhasathi_logs');
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load persisted logs:', error);
    }
  }

  getLogs(level?: LogEntry['level']): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem('shikkhasathi_logs');
  }

  // Performance monitoring
  private performanceMetrics: PerformanceMetric[] = [];

  recordMetric(name: string, value: number, context?: any) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: new Date().toISOString(),
      context
    };
    
    this.performanceMetrics.push(metric);
    
    // Keep only recent metrics
    if (this.performanceMetrics.length > 500) {
      this.performanceMetrics = this.performanceMetrics.slice(-500);
    }
    
    this.debug(`Performance metric: ${name} = ${value}`, context);
  }

  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.performanceMetrics.filter(metric => metric.name === name);
    }
    return [...this.performanceMetrics];
  }

  // Error reporting
  private async reportError(error: ErrorReport) {
    try {
      // In a real application, send to error tracking service
      // For now, just log to console and store locally
      console.error('Error Report:', error);
      
      // Store error reports locally
      const errors = JSON.parse(localStorage.getItem('shikkhasathi_errors') || '[]');
      errors.push(error);
      
      // Keep only recent errors
      if (errors.length > 50) {
        errors.splice(0, errors.length - 50);
      }
      
      localStorage.setItem('shikkhasathi_errors', JSON.stringify(errors));
      
    } catch (err) {
      console.error('Failed to report error:', err);
    }
  }

  // Global error handling setup
  private setupGlobalErrorHandling() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled promise rejection', {
        reason: event.reason,
        promise: event.promise
      });
    });

    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
      this.error('JavaScript error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });
  }

  // Performance monitoring setup
  private setupPerformanceMonitoring() {
    // Monitor page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          this.recordMetric('page_load_time', navigation.loadEventEnd - navigation.fetchStart);
          this.recordMetric('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart);
          this.recordMetric('first_paint', navigation.responseEnd - navigation.fetchStart);
        }
      }, 0);
    });

    // Monitor resource loading (only in browser environment)
    if (typeof PerformanceObserver !== 'undefined') {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resource = entry as PerformanceResourceTiming;
            this.recordMetric('resource_load_time', resource.responseEnd - resource.fetchStart, {
              name: resource.name,
              type: resource.initiatorType
            });
          }
        }
      });

      observer.observe({ entryTypes: ['resource'] });
    }
  }

  // API call monitoring
  monitorAPICall(url: string, method: string, startTime: number, endTime: number, success: boolean, error?: any) {
    const duration = endTime - startTime;
    
    this.recordMetric('api_call_duration', duration, {
      url,
      method,
      success
    });
    
    if (success) {
      this.debug(`API call successful: ${method} ${url} (${duration}ms)`);
    } else {
      this.error(`API call failed: ${method} ${url} (${duration}ms)`, error);
    }
  }

  // User interaction tracking
  trackUserAction(action: string, context?: any) {
    this.info(`User action: ${action}`, context);
    
    this.recordMetric('user_action', 1, {
      action,
      ...context
    });
  }

  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify({
      logs: this.logs,
      metrics: this.performanceMetrics,
      session: this.sessionId,
      userId: this.userId,
      timestamp: new Date().toISOString()
    }, null, 2);
  }

  // Get system information
  getSystemInfo() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      url: window.location.href,
      referrer: document.referrer,
      timestamp: new Date().toISOString()
    };
  }
}

// Create global logger instance
export const logger = new Logger();

// Convenience functions
export const log = {
  debug: (message: string, context?: any) => logger.debug(message, context),
  info: (message: string, context?: any) => logger.info(message, context),
  warn: (message: string, context?: any) => logger.warn(message, context),
  error: (message: string, context?: any) => logger.error(message, context),
  metric: (name: string, value: number, context?: any) => logger.recordMetric(name, value, context),
  action: (action: string, context?: any) => logger.trackUserAction(action, context)
};

// React hook for logging
export function useLogger() {
  return {
    debug: logger.debug.bind(logger),
    info: logger.info.bind(logger),
    warn: logger.warn.bind(logger),
    error: logger.error.bind(logger),
    metric: logger.recordMetric.bind(logger),
    action: logger.trackUserAction.bind(logger),
    getLogs: logger.getLogs.bind(logger),
    getMetrics: logger.getMetrics.bind(logger),
    exportLogs: logger.exportLogs.bind(logger)
  };
}

export default logger;