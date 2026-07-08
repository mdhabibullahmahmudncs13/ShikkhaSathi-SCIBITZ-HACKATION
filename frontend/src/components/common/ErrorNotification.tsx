import { useState, useEffect } from 'react';
import { useErrorHandler } from '../../hooks/useAPI';

interface ErrorNotificationProps {
  error: Error;
  onDismiss: () => void;
  autoHide?: boolean;
  hideDelay?: number;
}

export function ErrorNotification({ 
  error, 
  onDismiss, 
  autoHide = true, 
  hideDelay = 5000 
}: ErrorNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Allow fade out animation
      }, hideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, hideDelay, onDismiss]);

  if (!isVisible) return null;

  const getErrorType = (error: Error) => {
    if (error.message.includes('Network')) return 'network';
    if (error.message.includes('401') || error.message.includes('Unauthorized')) return 'auth';
    if (error.message.includes('403') || error.message.includes('Forbidden')) return 'permission';
    if (error.message.includes('404') || error.message.includes('Not Found')) return 'notfound';
    if (error.message.includes('500') || error.message.includes('Server')) return 'server';
    return 'general';
  };

  const getErrorMessage = (error: Error) => {
    const type = getErrorType(error);
    
    const messages = {
      network: 'ইন্টারনেট সংযোগ সমস্যা। অনুগ্রহ করে আপনার সংযোগ পরীক্ষা করুন।',
      auth: 'আপনার সেশন শেষ হয়ে গেছে। অনুগ্রহ করে আবার লগইন করুন।',
      permission: 'আপনার এই কাজটি করার অনুমতি নেই।',
      notfound: 'অনুরোধকৃত তথ্য পাওয়া যায়নি।',
      server: 'সার্ভারে সমস্যা হয়েছে। অনুগ্রহ করে পরে আবার চেষ্টা করুন।',
      general: error.message || 'একটি অপ্রত্যাশিত ত্রুটি ঘটেছে।'
    };

    return messages[type];
  };

  const getErrorIcon = (error: Error) => {
    const type = getErrorType(error);
    
    const icons = {
      network: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z" />
        </svg>
      ),
      auth: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      permission: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
        </svg>
      ),
      default: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    };

    return icons[type as keyof typeof icons] || icons.default;
  };

  return (
    <div className={`fixed top-4 right-4 max-w-sm w-full bg-red-50 border border-red-200 rounded-lg shadow-lg z-50 transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 text-red-400">
            {getErrorIcon(error)}
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-red-800">
              ত্রুটি
            </p>
            <p className="mt-1 text-sm text-red-700">
              {getErrorMessage(error)}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={() => {
                setIsVisible(false);
                setTimeout(onDismiss, 300);
              }}
              className="inline-flex text-red-400 hover:text-red-600 focus:outline-none focus:text-red-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ErrorNotificationManagerProps {
  maxErrors?: number;
}

export function ErrorNotificationManager({ maxErrors = 3 }: ErrorNotificationManagerProps) {
  const { errors, removeError } = useErrorHandler();

  return (
    <div className="fixed top-4 right-4 space-y-2 z-50">
      {errors.slice(0, maxErrors).map((error, index) => (
        <ErrorNotification
          key={index}
          error={error}
          onDismiss={() => removeError(index)}
        />
      ))}
    </div>
  );
}

interface RetryableErrorProps {
  error: Error;
  onRetry: () => void;
  onDismiss?: () => void;
  retryText?: string;
}

export function RetryableError({ 
  error, 
  onRetry, 
  onDismiss, 
  retryText = 'আবার চেষ্টা করুন' 
}: RetryableErrorProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-center">
        <div className="flex-shrink-0 text-red-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm text-red-700">
            {error.message}
          </p>
        </div>
        <div className="ml-4 flex space-x-2">
          <button
            onClick={onRetry}
            className="text-sm bg-red-100 text-red-800 hover:bg-red-200 px-3 py-1 rounded-md transition-colors"
          >
            {retryText}
          </button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-sm text-red-600 hover:text-red-800 px-2 py-1"
            >
              বাতিল
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  title?: string;
  description?: string;
}

export function ErrorFallback({ 
  error, 
  resetError, 
  title = 'কিছু ভুল হয়েছে',
  description = 'অ্যাপ্লিকেশনে একটি ত্রুটি ঘটেছে।'
}: ErrorFallbackProps) {
  return (
    <div className="min-h-64 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="mx-auto h-12 w-12 text-red-500 mb-4">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {description}
        </p>
        <button
          onClick={resetError}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          আবার চেষ্টা করুন
        </button>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="text-sm text-gray-500 cursor-pointer">
              Error Details (Dev Only)
            </summary>
            <pre className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

export default ErrorNotification;