import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { CookiesProvider } from 'react-cookie';
import { GoogleOAuthProvider } from '@react-oauth/google';
import config from './config/env.js';
import { initializeFonts } from './utils/initFontLoading.js';
import { initPerformanceMetrics, onMetricsUpdate } from './utils/performanceMetrics.js';
import { monitorPerformance } from './utils/performanceValidation.js';

// Initialize performance metrics collection
// Validates: Requirements 6.1, 6.3, 6.5
if (typeof window !== 'undefined') {
  initPerformanceMetrics();
  
  // Monitor and validate performance metrics in development
  if (import.meta.env.DEV) {
    monitorPerformance();
  }
}

// Initialize optimized font loading with timeout for optional fonts
// Validates: Requirements 3.1, 3.5
if (document.fonts) {
  initializeFonts().then((results) => {
    if (results) {
      console.log('✅ Font loading initialized:', {
        loaded: results.loaded.length,
        timedOut: results.timedOut.length,
        errors: results.errors.length
      });
    }
  }).catch((error) => {
    console.error('❌ Font loading initialization failed:', error);
  });
}

// Register service worker for better caching (production only)
// Validates: Requirements 5.1, 5.6
if ('serviceWorker' in navigator && config.features.enableServiceWorker) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('❌ SW registration failed: ', registrationError);
      });
  });
} else {
  // Gracefully handle browsers that don't support service workers
  // Validates: Requirements 5.6
  if (!('serviceWorker' in navigator)) {
    console.log('ℹ️ Service workers not supported in this browser. Continuing without caching.');
  }
}

// Validate Google Client ID is configured
if (!config.googleClientId) {
  console.error('❌ Google Client ID not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={config.googleClientId}>
      <CookiesProvider>
         <App />
      </CookiesProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
