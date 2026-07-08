/**
 * Utility function to get the correct API base URL based on current environment and host
 */
export const getApiBaseUrl = (): string => {
  // Check if we have an environment variable first
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // For development, use the current hostname but port 8000
  const currentHost = window.location.hostname;
  
  // Backend always runs on HTTP in development, regardless of frontend protocol
  // If accessing via network IP, use the same IP for backend
  if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
    return `http://${currentHost}:8000`;
  }
  
  // Default to localhost for local development
  return 'http://localhost:8000';
};

/**
 * Get the API base URL with /api/v1 suffix
 */
export const getApiV1Url = (): string => {
  return `${getApiBaseUrl()}/api/v1`;
};

/**
 * Get WebSocket URL based on current protocol and host
 */
export const getWebSocketUrl = (): string => {
  const currentHost = window.location.hostname;
  const isSecure = window.location.protocol === 'https:';
  
  // If accessing via network IP, use the same IP for WebSocket
  if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
    return `${isSecure ? 'wss:' : 'ws:'}//${currentHost}:8001`;
  }
  
  // Default to localhost for local development
  return `${isSecure ? 'wss:' : 'ws:'}//localhost:8001`;
};