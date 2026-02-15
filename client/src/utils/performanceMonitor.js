/**
 * Performance Monitoring Utility
 * Monitors Core Web Vitals and other performance metrics
 */

// Core Web Vitals thresholds (in milliseconds)
const THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 }, // Largest Contentful Paint
  FID: { good: 100, needsImprovement: 300 },   // First Input Delay
  CLS: { good: 0.1, needsImprovement: 0.25 },  // Cumulative Layout Shift
  FCP: { good: 1800, needsImprovement: 3000 }, // First Contentful Paint
  TTFB: { good: 800, needsImprovement: 1800 }, // Time to First Byte
};

/**
 * Get rating based on metric value and thresholds
 */
function getRating(value, thresholds) {
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.needsImprovement) return 'needs-improvement';
  return 'poor';
}

/**
 * Log performance metric
 */
function logMetric(name, value, rating, unit = 'ms') {
  const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌';
  console.log(`${emoji} ${name}: ${value.toFixed(2)}${unit} (${rating})`);
}

/**
 * Monitor Largest Contentful Paint (LCP)
 * Measures loading performance - should occur within 2.5s
 */
function observeLCP(callback) {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      const value = lastEntry.renderTime || lastEntry.loadTime;
      const rating = getRating(value, THRESHOLDS.LCP);
      
      callback({ name: 'LCP', value, rating });
      logMetric('LCP', value, rating);
    });

    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (error) {
    console.error('Error observing LCP:', error);
  }
}

/**
 * Monitor First Input Delay (FID)
 * Measures interactivity - should be less than 100ms
 */
function observeFID(callback) {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const value = entry.processingStart - entry.startTime;
        const rating = getRating(value, THRESHOLDS.FID);
        
        callback({ name: 'FID', value, rating });
        logMetric('FID', value, rating);
      });
    });

    observer.observe({ type: 'first-input', buffered: true });
  } catch (error) {
    console.error('Error observing FID:', error);
  }
}

/**
 * Monitor Cumulative Layout Shift (CLS)
 * Measures visual stability - should be less than 0.1
 */
function observeCLS(callback) {
  if (!('PerformanceObserver' in window)) return;

  try {
    let clsValue = 0;
    let clsEntries = [];

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        // Only count layout shifts without recent user input
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          clsEntries.push(entry);
        }
      });

      const rating = getRating(clsValue, THRESHOLDS.CLS);
      callback({ name: 'CLS', value: clsValue, rating });
      logMetric('CLS', clsValue, rating, '');
    });

    observer.observe({ type: 'layout-shift', buffered: true });
  } catch (error) {
    console.error('Error observing CLS:', error);
  }
}

/**
 * Monitor First Contentful Paint (FCP)
 * Measures when first content is painted - should be under 1.8s
 */
function observeFCP(callback) {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          const value = entry.startTime;
          const rating = getRating(value, THRESHOLDS.FCP);
          
          callback({ name: 'FCP', value, rating });
          logMetric('FCP', value, rating);
        }
      });
    });

    observer.observe({ type: 'paint', buffered: true });
  } catch (error) {
    console.error('Error observing FCP:', error);
  }
}

/**
 * Monitor Time to First Byte (TTFB)
 * Measures server response time - should be under 800ms
 */
function observeTTFB(callback) {
  if (!('performance' in window) || !('timing' in window.performance)) return;

  try {
    // Use Navigation Timing API
    const navigationTiming = performance.getEntriesByType('navigation')[0];
    
    if (navigationTiming) {
      const value = navigationTiming.responseStart - navigationTiming.requestStart;
      const rating = getRating(value, THRESHOLDS.TTFB);
      
      callback({ name: 'TTFB', value, rating });
      logMetric('TTFB', value, rating);
    }
  } catch (error) {
    console.error('Error observing TTFB:', error);
  }
}

/**
 * Monitor Long Tasks (tasks that block main thread for >50ms)
 * Helps identify performance bottlenecks
 */
function observeLongTasks(callback) {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        const duration = entry.duration;
        
        // Log tasks longer than 50ms
        if (duration > 50) {
          console.warn(`⏱️ Long Task detected: ${duration.toFixed(2)}ms`);
          
          callback({
            name: 'Long Task',
            duration,
            startTime: entry.startTime,
            attribution: entry.attribution
          });
        }
      });
    });

    observer.observe({ type: 'longtask', buffered: true });
  } catch (error) {
    console.debug('Long Task API not supported');
  }
}

/**
 * Initialize performance monitoring
 * @param {Object} options - Configuration options
 * @param {Function} options.onMetric - Callback for each metric
 * @param {boolean} options.logToConsole - Whether to log to console (default: true in dev)
 */
export function initPerformanceMonitoring(options = {}) {
  const {
    onMetric = () => {},
  } = options;

  // Only run in browser environment
  if (typeof window === 'undefined') return;

  console.log('🚀 Performance monitoring initialized');

  // Observe Core Web Vitals
  observeLCP(onMetric);
  observeFID(onMetric);
  observeCLS(onMetric);
  observeFCP(onMetric);
  observeTTFB(onMetric);

  // Observe Long Tasks
  observeLongTasks((task) => {
    onMetric({ name: 'LongTask', ...task });
  });

  // Report initial page load metrics
  if (window.performance && window.performance.timing) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const timing = window.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        const domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;
        
        console.log(`📊 Page Load Time: ${loadTime}ms`);
        console.log(`📊 DOM Content Loaded: ${domContentLoaded}ms`);
        
        onMetric({ name: 'PageLoad', value: loadTime });
        onMetric({ name: 'DOMContentLoaded', value: domContentLoaded });
      }, 0);
    });
  }
}

/**
 * Get current performance metrics summary
 */
export function getPerformanceMetrics() {
  if (typeof window === 'undefined' || !window.performance) {
    return null;
  }

  const navigation = performance.getEntriesByType('navigation')[0];
  const paint = performance.getEntriesByType('paint');

  return {
    navigation: navigation ? {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      domInteractive: navigation.domInteractive,
      transferSize: navigation.transferSize,
      encodedBodySize: navigation.encodedBodySize,
      decodedBodySize: navigation.decodedBodySize,
    } : null,
    paint: paint.reduce((acc, entry) => {
      acc[entry.name] = entry.startTime;
      return acc;
    }, {}),
    memory: performance.memory ? {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
    } : null,
  };
}

/**
 * Mark a custom performance measurement
 */
export function markPerformance(name) {
  if (typeof window !== 'undefined' && window.performance) {
    performance.mark(name);
  }
}

/**
 * Measure time between two marks
 */
export function measurePerformance(name, startMark, endMark) {
  if (typeof window !== 'undefined' && window.performance) {
    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name)[0];
      console.log(`⏱️ ${name}: ${measure.duration.toFixed(2)}ms`);
      return measure.duration;
    } catch (error) {
      console.error('Error measuring performance:', error);
    }
  }
  return null;
}

export default {
  initPerformanceMonitoring,
  getPerformanceMetrics,
  markPerformance,
  measurePerformance,
};
