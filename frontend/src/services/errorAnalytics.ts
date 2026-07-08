// Error analytics and reporting system
import { logger } from './logger';

interface ErrorPattern {
  type: string;
  count: number;
  lastOccurrence: Date;
  affectedUsers: Set<string>;
  contexts: any[];
}

interface ErrorReport {
  id: string;
  timestamp: Date;
  error: Error;
  context: any;
  userId?: string;
  sessionId: string;
  url: string;
  userAgent: string;
  resolved: boolean;
}

interface ErrorTrend {
  period: string;
  errorCount: number;
  errorTypes: Record<string, number>;
  affectedFeatures: string[];
}

class ErrorAnalyticsService {
  private errorReports: ErrorReport[] = [];
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private maxReports = 500;
  private sessionId: string;

  constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.loadPersistedData();
    this.setupErrorTracking();
  }

  // Track error occurrence
  trackError(error: Error, context: any = {}, userId?: string) {
    const errorReport: ErrorReport = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      error,
      context,
      userId,
      sessionId: this.sessionId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      resolved: false
    };

    this.errorReports.push(errorReport);
    this.updateErrorPatterns(error, context, userId);
    this.persistData();

    // Keep only recent reports
    if (this.errorReports.length > this.maxReports) {
      this.errorReports = this.errorReports.slice(-this.maxReports);
    }

    logger.error('Error tracked', {
      errorId: errorReport.id,
      errorType: error.constructor.name,
      message: error.message,
      context
    });

    // Send to external service in production
    this.sendToExternalService(errorReport);
  }

  // Update error patterns for analysis
  private updateErrorPatterns(error: Error, context: any, userId?: string) {
    const errorType = error.constructor.name;
    const pattern = this.errorPatterns.get(errorType) || {
      type: errorType,
      count: 0,
      lastOccurrence: new Date(),
      affectedUsers: new Set<string>(),
      contexts: []
    };

    pattern.count++;
    pattern.lastOccurrence = new Date();
    pattern.contexts.push(context);

    if (userId) {
      pattern.affectedUsers.add(userId);
    }

    // Keep only recent contexts
    if (pattern.contexts.length > 50) {
      pattern.contexts = pattern.contexts.slice(-50);
    }

    this.errorPatterns.set(errorType, pattern);
  }

  // Get error statistics
  getErrorStatistics(timeframe: 'hour' | 'day' | 'week' = 'day') {
    const now = new Date();
    const cutoff = new Date();
    
    switch (timeframe) {
      case 'hour':
        cutoff.setHours(now.getHours() - 1);
        break;
      case 'day':
        cutoff.setDate(now.getDate() - 1);
        break;
      case 'week':
        cutoff.setDate(now.getDate() - 7);
        break;
    }

    const recentErrors = this.errorReports.filter(
      report => report.timestamp >= cutoff
    );

    const errorsByType = recentErrors.reduce((acc, report) => {
      const type = report.error.constructor.name;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const affectedFeatures = recentErrors.reduce((acc, report) => {
      if (report.context.feature) {
        acc.add(report.context.feature);
      }
      return acc;
    }, new Set<string>());

    return {
      totalErrors: recentErrors.length,
      errorsByType,
      affectedFeatures: Array.from(affectedFeatures),
      timeframe,
      period: `${cutoff.toISOString()} - ${now.toISOString()}`
    };
  }

  // Get error trends over time
  getErrorTrends(days: number = 7): ErrorTrend[] {
    const trends: ErrorTrend[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayErrors = this.errorReports.filter(
        report => report.timestamp >= date && report.timestamp < nextDate
      );

      const errorTypes = dayErrors.reduce((acc, report) => {
        const type = report.error.constructor.name;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const affectedFeatures = dayErrors.reduce((acc, report) => {
        if (report.context.feature) {
          acc.add(report.context.feature);
        }
        return acc;
      }, new Set<string>());

      trends.push({
        period: date.toISOString().split('T')[0],
        errorCount: dayErrors.length,
        errorTypes,
        affectedFeatures: Array.from(affectedFeatures)
      });
    }

    return trends;
  }

  // Get most common error patterns
  getCommonErrorPatterns(limit: number = 10): ErrorPattern[] {
    return Array.from(this.errorPatterns.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(pattern => ({
        ...pattern,
        affectedUsers: new Set(pattern.affectedUsers) // Clone the Set
      }));
  }

  // Get errors by feature/component
  getErrorsByFeature(): Record<string, number> {
    return this.errorReports.reduce((acc, report) => {
      const feature = report.context.feature || 'unknown';
      acc[feature] = (acc[feature] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  // Get user impact analysis
  getUserImpactAnalysis(): {
    totalAffectedUsers: number;
    errorsByUser: Record<string, number>;
    mostAffectedUsers: Array<{ userId: string; errorCount: number }>;
  } {
    const errorsByUser = this.errorReports.reduce((acc, report) => {
      if (report.userId) {
        acc[report.userId] = (acc[report.userId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const mostAffectedUsers = Object.entries(errorsByUser)
      .map(([userId, errorCount]) => ({ userId, errorCount }))
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, 10);

    return {
      totalAffectedUsers: Object.keys(errorsByUser).length,
      errorsByUser,
      mostAffectedUsers
    };
  }

  // Mark error as resolved
  markErrorResolved(errorId: string) {
    const report = this.errorReports.find(r => r.id === errorId);
    if (report) {
      report.resolved = true;
      this.persistData();
      logger.info(`Error ${errorId} marked as resolved`);
    }
  }

  // Get unresolved errors
  getUnresolvedErrors(): ErrorReport[] {
    return this.errorReports.filter(report => !report.resolved);
  }

  // Generate error report for support
  generateErrorReport(): string {
    const statistics = this.getErrorStatistics('day');
    const patterns = this.getCommonErrorPatterns(5);
    const trends = this.getErrorTrends(7);
    const userImpact = this.getUserImpactAnalysis();

    const report = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      statistics,
      commonPatterns: patterns.map(p => ({
        type: p.type,
        count: p.count,
        lastOccurrence: p.lastOccurrence,
        affectedUsersCount: p.affectedUsers.size
      })),
      trends,
      userImpact,
      systemInfo: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        screen: {
          width: screen.width,
          height: screen.height
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    };

    return JSON.stringify(report, null, 2);
  }

  // Setup automatic error tracking
  private setupErrorTracking() {
    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        { type: 'unhandled_promise_rejection', reason: event.reason }
      );
    });

    // Track JavaScript errors
    window.addEventListener('error', (event) => {
      this.trackError(
        event.error || new Error(event.message),
        {
          type: 'javascript_error',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      );
    });
  }

  // Persist data to localStorage
  private persistData() {
    try {
      const data = {
        errorReports: this.errorReports.slice(-100), // Keep only recent reports
        errorPatterns: Array.from(this.errorPatterns.entries()).map(([key, pattern]) => [
          key,
          {
            ...pattern,
            affectedUsers: Array.from(pattern.affectedUsers),
            contexts: pattern.contexts.slice(-10) // Keep only recent contexts
          }
        ])
      };
      
      localStorage.setItem('shikkhasathi_error_analytics', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to persist error analytics data:', error);
    }
  }

  // Load persisted data
  private loadPersistedData() {
    try {
      const stored = localStorage.getItem('shikkhasathi_error_analytics');
      if (stored) {
        const data = JSON.parse(stored);
        
        this.errorReports = data.errorReports || [];
        
        if (data.errorPatterns) {
          this.errorPatterns = new Map(
            data.errorPatterns.map(([key, pattern]: [string, any]) => [
              key,
              {
                ...pattern,
                affectedUsers: new Set(pattern.affectedUsers),
                lastOccurrence: new Date(pattern.lastOccurrence)
              }
            ])
          );
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted error analytics data:', error);
    }
  }

  // Send error to external monitoring service
  private async sendToExternalService(errorReport: ErrorReport) {
    // In production, send to services like Sentry, LogRocket, etc.
    if (process.env.NODE_ENV === 'production') {
      try {
        // Example: await sendToSentry(errorReport);
        console.log('Would send to external service:', errorReport.id);
      } catch (error) {
        console.warn('Failed to send error to external service:', error);
      }
    }
  }

  // Clear old data
  clearOldData(daysToKeep: number = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);

    this.errorReports = this.errorReports.filter(
      report => report.timestamp >= cutoff
    );

    // Update patterns to remove old contexts
    for (const pattern of this.errorPatterns.values()) {
      pattern.contexts = pattern.contexts.filter(
        (context: any) => context.timestamp >= cutoff
      );
    }

    this.persistData();
    logger.info(`Cleared error data older than ${daysToKeep} days`);
  }
}

// Create global instance
export const errorAnalytics = new ErrorAnalyticsService();

// React hook for error analytics
export function useErrorAnalytics() {
  return {
    trackError: errorAnalytics.trackError.bind(errorAnalytics),
    getErrorStatistics: errorAnalytics.getErrorStatistics.bind(errorAnalytics),
    getErrorTrends: errorAnalytics.getErrorTrends.bind(errorAnalytics),
    getCommonErrorPatterns: errorAnalytics.getCommonErrorPatterns.bind(errorAnalytics),
    getErrorsByFeature: errorAnalytics.getErrorsByFeature.bind(errorAnalytics),
    getUserImpactAnalysis: errorAnalytics.getUserImpactAnalysis.bind(errorAnalytics),
    generateErrorReport: errorAnalytics.generateErrorReport.bind(errorAnalytics),
    getUnresolvedErrors: errorAnalytics.getUnresolvedErrors.bind(errorAnalytics),
    markErrorResolved: errorAnalytics.markErrorResolved.bind(errorAnalytics)
  };
}

export default errorAnalytics;