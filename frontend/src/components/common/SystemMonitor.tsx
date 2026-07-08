import { useState, useEffect } from 'react';
import { useGracefulDegradation } from '../../services/gracefulDegradation';
import { useLogger } from '../../services/logger';

interface SystemMonitorProps {
  showDetails?: boolean;
  className?: string;
}

export function SystemMonitor({ showDetails = false, className = '' }: SystemMonitorProps) {
  const {
    systemStatus,
    services,
    getDegradationNotice,
    getFeatureFlags
  } = useGracefulDegradation();
  
  const { getMetrics, getLogs } = useLogger();
  const [isExpanded, setIsExpanded] = useState(false);
  const [metrics, setMetrics] = useState<any[]>([]);

  useEffect(() => {
    if (showDetails) {
      const interval = setInterval(() => {
        setMetrics(getMetrics().slice(-10)); // Last 10 metrics
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [showDetails, getMetrics]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'degraded':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'critical':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const degradationNotice = getDegradationNotice();
  const featureFlags = getFeatureFlags();

  if (!showDetails && systemStatus === 'healthy') {
    return null; // Don't show anything when system is healthy and details not requested
  }

  return (
    <div className={`${className}`}>
      {/* System Status Indicator */}
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(systemStatus)}`}>
        {getStatusIcon(systemStatus)}
        <span className="ml-2">
          {systemStatus === 'healthy' && 'সিস্টেম স্বাভাবিক'}
          {systemStatus === 'degraded' && 'সিস্টেমে সমস্যা'}
          {systemStatus === 'critical' && 'গুরুতর সমস্যা'}
        </span>
        
        {showDetails && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-2 text-xs underline hover:no-underline"
          >
            {isExpanded ? 'কম দেখুন' : 'বিস্তারিত'}
          </button>
        )}
      </div>

      {/* Degradation Notice */}
      {degradationNotice && (
        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">{degradationNotice}</p>
            </div>
          </div>
        </div>
      )}

      {/* Detailed System Information */}
      {showDetails && isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Service Status */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">সেবা অবস্থা</h3>
            <div className="grid grid-cols-2 gap-3">
              {Array.from(services.entries()).map(([name, service]) => (
                <div key={name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium text-gray-700 capitalize">{name}</span>
                  <div className={`flex items-center px-2 py-1 rounded text-xs ${
                    service.isAvailable ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
                  }`}>
                    <div className={`w-2 h-2 rounded-full mr-1 ${
                      service.isAvailable ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    {service.isAvailable ? 'চালু' : 'বন্ধ'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feature Flags */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">বৈশিষ্ট্য অবস্থা</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(featureFlags).map(([feature, enabled]) => (
                <div key={feature} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium text-gray-700">
                    {feature.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </span>
                  <div className={`px-2 py-1 rounded text-xs ${
                    enabled ? 'text-green-700 bg-green-100' : 'text-gray-700 bg-gray-100'
                  }`}>
                    {enabled ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Metrics */}
          {metrics.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">কর্মক্ষমতা</h3>
              <div className="space-y-2">
                {metrics.slice(-5).map((metric, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{metric.name}</span>
                    <span className="font-medium">
                      {metric.value.toFixed(2)}
                      {metric.name.includes('time') ? 'ms' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">দ্রুত কাজ</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
              >
                পেজ রিফ্রেশ
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
              >
                ক্যাশ পরিষ্কার
              </button>
              {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={() => {
                    const logs = getLogs();
                    console.log('System Logs:', logs);
                    alert('লগ কনসোলে দেখুন');
                  }}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                >
                  লগ দেখুন
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact system status indicator for header/navbar
export function SystemStatusIndicator() {
  const { systemStatus, getDegradationNotice } = useGracefulDegradation();
  const [showTooltip, setShowTooltip] = useState(false);

  if (systemStatus === 'healthy') {
    return null;
  }

  const degradationNotice = getDegradationNotice();

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`flex items-center px-2 py-1 rounded text-xs font-medium ${
          systemStatus === 'degraded' 
            ? 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200' 
            : 'text-red-700 bg-red-100 hover:bg-red-200'
        }`}
      >
        <div className={`w-2 h-2 rounded-full mr-1 ${
          systemStatus === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
        }`} />
        {systemStatus === 'degraded' ? 'সমস্যা' : 'গুরুতর'}
      </button>

      {showTooltip && degradationNotice && (
        <div className="absolute top-full left-0 mt-1 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-50">
          {degradationNotice}
        </div>
      )}
    </div>
  );
}

export default SystemMonitor;