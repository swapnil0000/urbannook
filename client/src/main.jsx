import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted fonts (latin subset only). Served from our origin with the hashed
// assets, so there is no render-blocking fonts.googleapis.com request and no extra
// connection to fonts.gstatic.com. Unused weights cost nothing: @font-face files
// only download when a matching style is actually rendered.
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/archivo/latin-400.css'
import '@fontsource/archivo/latin-500.css'
import '@fontsource/archivo/latin-600.css'
import '@fontsource/archivo/latin-700.css'
import '@fontsource/archivo/latin-800.css'
import '@fontsource/archivo/latin-900.css'
import '@fontsource/anton/latin-400.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-600.css'
import './index.css'
import App from './App.jsx'
import { CookiesProvider } from 'react-cookie';
import { GoogleOAuthProvider } from '@react-oauth/google';
import config from './config/env.js';
import { initPerformanceMetrics, onMetricsUpdate } from './utils/performanceMetrics.js';
import { monitorPerformance } from './utils/performanceValidation.js';
import { escapeToExternalBrowser } from './utils/browserEnv.js';
// test
if (typeof window !== 'undefined') {
  // Instagram/Facebook in-app browsers break Google login & autofill.
  // On Android, hand the page straight to Chrome BEFORE React mounts (no-op elsewhere).
  escapeToExternalBrowser();

  initPerformanceMetrics();
  
  if (import.meta.env.DEV) {
    monitorPerformance();
  }
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
