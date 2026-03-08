/**
 * Performance Metrics Collection Module
 * 
 * Collects Core Web Vitals metrics using the Performance Observer API:
 * - First Contentful Paint (FCP)
 * - Largest Contentful Paint (LCP)
 * - Speed Index (approximated)
 * 
 * Requirements: 6.1, 6.3, 6.5
 */

/**
 * Performance targets for Core Web Vitals
 * Requirements: 6.2, 6.4, 6.5
 */
export const PERFORMANCE_TARGETS = {
  FCP: 1.8,        // First Contentful Paint target (seconds)
  LCP: 2.5,        // Largest Contentful Paint target (seconds)
  SPEED_INDEX: 3.4, // Speed Index target (seconds)
  TTI: 3.8,        // Time to Interactive target (seconds)
  CLS: 0.1         // Cumulative Layout Shift target
};

/**
 * Performance metrics storage
 */
const metrics = {
  fcp: null,
  lcp: null,
  speedIndex: null,
};

/**
 * Callbacks for metric updates
 */
const callbacks = [];

/**
 * Register a callback to be notified when metrics are updated
 * @param {Function} callback - Function to call with updated metrics
 */
export function onMetricsUpdate(callback) {
  if (typeof callback === 'function') {
    callbacks.push(callback);
  }
}

/**
 * Notify all registered callbacks of metric updates
 */
function notifyCallbacks() {
  callbacks.forEach(callback => {
    try {
      callback({ ...metrics });
    } catch (error) {
      console.error('Error in metrics callback:', error);
    }
  });
}

/**
 * Measure First Contentful Paint (FCP)
 * FCP marks when the first text or image is painted
 * Requirement: 6.1
 */
function measureFCP() {
  try {
    // Check if PerformanceObserver is supported
    if (!('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver not supported');
      return;
    }

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          metrics.fcp = entry.startTime / 1000; // Convert to seconds
          console.log(`FCP: ${metrics.fcp.toFixed(3)}s`);
          notifyCallbacks();
          observer.disconnect();
        }
      }
    });

    observer.observe({ type: 'paint', buffered: true });
  } catch (error) {
    console.error('Error measuring FCP:', error);
  }
}

/**
 * Measure Largest Contentful Paint (LCP)
 * LCP marks when the largest content element is painted
 * Requirement: 6.3
 */
function measureLCP() {
  try {
    if (!('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver not supported');
      return;
    }

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      metrics.lcp = lastEntry.startTime / 1000; // Convert to seconds
      console.log(`LCP: ${metrics.lcp.toFixed(3)}s`);
      notifyCallbacks();
    });

    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (error) {
    console.error('Error measuring LCP:', error);
  }
}

/**
 * Approximate Speed Index calculation
 * Speed Index measures how quickly content is visually displayed
 * 
 * Note: True Speed Index requires video analysis. This is an approximation
 * based on paint timing and resource loading.
 * Requirement: 6.5
 */
function measureSpeedIndex() {
  try {
    if (!('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver not supported');
      return;
    }

    // Wait for page load to calculate approximate Speed Index
    window.addEventListener('load', () => {
      // Use a combination of FCP, LCP, and load time as approximation
      const navigation = performance.getEntriesByType('navigation')[0];
      const paintEntries = performance.getEntriesByType('paint');
      
      if (navigation && paintEntries.length > 0) {
        const fcp = paintEntries.find(e => e.name === 'first-contentful-paint');
        const domContentLoaded = navigation.domContentLoadedEventEnd;
        const loadComplete = navigation.loadEventEnd;
        
        // Approximate Speed Index as weighted average of key timing points
        // This is a simplified calculation
        if (fcp && metrics.lcp) {
          const fcpTime = fcp.startTime;
          const lcpTime = metrics.lcp * 1000; // Convert back to ms
          const dclTime = domContentLoaded;
          
          // Weighted formula: 30% FCP + 50% LCP + 20% DCL
          metrics.speedIndex = (
            (fcpTime * 0.3) + 
            (lcpTime * 0.5) + 
            (dclTime * 0.2)
          ) / 1000; // Convert to seconds
          
          console.log(`Speed Index (approx): ${metrics.speedIndex.toFixed(3)}s`);
          notifyCallbacks();
        }
      }
    });
  } catch (error) {
    console.error('Error measuring Speed Index:', error);
  }
}

/**
 * Initialize performance metrics collection
 * Starts measuring FCP, LCP, and Speed Index
 */
export function initPerformanceMetrics() {
  // Check browser support
  if (typeof window === 'undefined') {
    console.warn('Performance metrics can only be measured in browser environment');
    return;
  }

  measureFCP();
  measureLCP();
  measureSpeedIndex();
}

/**
 * Get current performance metrics
 * @returns {Object} Current metrics object with fcp, lcp, and speedIndex
 */
export function getMetrics() {
  return { ...metrics };
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics() {
  metrics.fcp = null;
  metrics.lcp = null;
  metrics.speedIndex = null;
}
