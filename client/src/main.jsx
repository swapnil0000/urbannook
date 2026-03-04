import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { CookiesProvider } from 'react-cookie';
import { GoogleOAuthProvider } from '@react-oauth/google';
import config from './config/env.js';

// Register service worker for better caching (production only)
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
