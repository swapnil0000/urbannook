// API URL Configuration for different environments

const API_URLS = {
  local: 'http://localhost:8000/api/v1',
  development: 'http://localhost:8000/api/v1',
  production: 'https://urbannook.onrender.com/api/v1',
  staging: 'https://urbannook.onrender.com/api/v1'
};

// Environment detection
const getEnvironment = () => {
  // Check if we're in development mode
  if (import.meta.env.DEV) {
    return 'local';
  }
  
  // Check custom environment variable
  if (import.meta.env.VITE_APP_ENV) {
    return import.meta.env.VITE_APP_ENV;
  }
  
  // Check hostname for automatic detection
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'local';
  }
  
  if (hostname.includes('vercel.app') || hostname.includes('netlify.app')) {
    return 'staging';
  }
  
  return 'production';
};

// Get current API URL
export const getApiUrl = () => {
  const env = getEnvironment();
  return API_URLS[env] || API_URLS.production;
};

// Export individual URLs for direct access
export const API_CONFIG = {
  LOCAL: API_URLS.local,
  PRODUCTION: API_URLS.production,
  STAGING: API_URLS.staging,
  CURRENT: getApiUrl()
};

// Debug helper
export const getCurrentConfig = () => {
  const env = getEnvironment();
  return {
    environment: env,
    apiUrl: API_URLS[env],
    hostname: window.location.hostname,
    isDev: import.meta.env.DEV,
    customEnv: import.meta.env.VITE_APP_ENV
  };
};

export default API_CONFIG;