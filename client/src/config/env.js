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
  console.error(
    '   These are inlined into the bundle by Vite at dev-server-start/build time from ' +
    'process.env or a local .env file — they are NOT fetched at runtime in the browser. ' +
    'If they exist in Infisical but are missing here, the dev/build script was not run ' +
    'through `infisical run` (check package.json scripts and the terminal running `npm run dev` ' +
    'for the "[env] ..." source trace logged by vite.config.js).'
  );

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
  
  // GTM Configuration
  gtmId: env.VITE_GTM_ID || 'GTM-XXXXXXX',
  metaPixelId: env.VITE_META_PIXEL_ID || '',

  // App Configuration
  appEnv: env.VITE_APP_ENV || 'development',
  port: env.VITE_PORT || 3000,
  domainBaseUrl: env.VITE_DOMAIN_BASE_URL || 'http://localhost:3000',
  specialProductId: env.VITE_SPECIAL_PRODUCT_ID || '019cb45b-99c2-76c4-ae22-e85ce7c17b13',
  offerEndDate: '2026-04-13T23:59:59',
  
  // Feature Flags (optional)
  features: {
    enableGoogleOAuth: !!env.VITE_GOOGLE_CLIENT_ID,
    enableAnalytics: env.VITE_ENABLE_ANALYTICS === 'true',
    analyticsDebug: env.VITE_ANALYTICS_DEBUG === 'true',
    enableServiceWorker: env.PROD && env.VITE_ENABLE_SW !== 'false',
    // Razorpay Magic Checkout (1CC). Must be set at BUILD time — Vite inlines
    // it into the bundle, so setting it on the server has no effect. The server
    // has its own MAGIC_CHECKOUT_ENABLED flag and both must be on.
    enableMagicCheckout: env.VITE_MAGIC_CHECKOUT_ENABLED === 'true'
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