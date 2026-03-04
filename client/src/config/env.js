/**
 * Environment Configuration
 * Centralized environment variable management with validation and defaults
 */

// Environment variable access (Vite-specific)
const env = import.meta.env;

// Validate required environment variables
const requiredEnvVars = {
  VITE_GOOGLE_CLIENT_ID: 'Google OAuth Client ID is required',
  VITE_API_BASE_URL: 'API Base URL is required'
};

// Check for missing required variables
const missingVars = Object.keys(requiredEnvVars).filter(key => !env[key]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}: ${requiredEnvVars[varName]}`);
  });
  
  // In development, show helpful error
  if (env.DEV) {
    throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
  }
}

// Environment configuration object
const config = {
  // App Environment
  isDevelopment: env.DEV,
  isProduction: env.PROD,
  mode: env.MODE,
  
  // API Configuration
  apiBaseUrl: env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  
  // Google OAuth
  googleClientId: env.VITE_GOOGLE_CLIENT_ID,
  
  // App Configuration
  appEnv: env.VITE_APP_ENV || 'development',
  port: env.VITE_PORT || 3000,
  domainBaseUrl: env.VITE_DOMAIN_BASE_URL || 'http://localhost:3000',
  
  // Feature Flags (optional)
  features: {
    enableGoogleOAuth: !!env.VITE_GOOGLE_CLIENT_ID,
    enableAnalytics: env.VITE_ENABLE_ANALYTICS === 'true',
    enableServiceWorker: env.PROD && env.VITE_ENABLE_SW !== 'false'
  }
};

// Log configuration in development
if (config.isDevelopment) {
  console.log('🔧 App Configuration:', {
    mode: config.mode,
    apiBaseUrl: config.apiBaseUrl,
    googleOAuth: config.features.enableGoogleOAuth ? '✅ Enabled' : '❌ Disabled',
    port: config.port
  });
}

export default config;