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
import { escapeToExternalBrowser } from './utils/browserEnv.js';
// test
if (typeof window !== 'undefined') {
  // Instagram/Facebook in-app browsers break Google login, passkeys & autofill.
  // On Android, hand the page straight to Chrome BEFORE React mounts (no-op elsewhere).
  escapeToExternalBrowser();

  initPerformanceMetrics();
  
  if (import.meta.env.DEV) {
    monitorPerformance();
  }
}

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

// Catch stale Vite chunk errors before React sees them (second layer after ErrorBoundary)
window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message || '';
  const isChunkError =
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module');
  if (isChunkError) {
    const RELOAD_KEY = 'vite_chunk_reload_at';
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last > 60_000) {
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
      window.location.reload();
    }
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={config.googleClientId}>
      <CookiesProvider>
         <App />
      </CookiesProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
