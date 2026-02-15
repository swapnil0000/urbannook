import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { CookiesProvider } from 'react-cookie';
import { initPerformanceMonitoring } from './utils/performanceMonitor';

// Initialize performance monitoring
initPerformanceMonitoring({
  onMetric: () => {
    // In production, you could send metrics to analytics service
    // For now, metrics are logged to console in development
    if (import.meta.env.PROD) {
      // Example: Send to analytics
      // analytics.track('performance', metric);
    }
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CookiesProvider>
       <App />
    </CookiesProvider>
  </StrictMode>,
)
