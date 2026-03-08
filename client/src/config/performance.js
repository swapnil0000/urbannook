/**
 * Performance Optimization Configuration
 * Central configuration for all performance optimization settings
 * Validates: Requirements 1.2, 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { PERFORMANCE_TARGETS } from '../utils/performanceMetrics.js';
import { PRIORITY, RESOURCE_TYPE, LOAD_STRATEGY } from '../utils/resourcePrioritization.js';

/**
 * Performance configuration object
 */
export const performanceConfig = {
  // Core Web Vitals targets
  targets: {
    FCP: PERFORMANCE_TARGETS.FCP,
    LCP: PERFORMANCE_TARGETS.LCP,
    speedIndex: PERFORMANCE_TARGETS.SPEED_INDEX,
    TTI: PERFORMANCE_TARGETS.TTI,
    CLS: PERFORMANCE_TARGETS.CLS
  },

  // Critical CSS settings
  criticalCSS: {
    threshold: 14336, // 14KB in bytes
    viewportHeight: 600, // Mobile viewport height
    enabled: true
  },

  // Responsive image breakpoints
  imageBreakpoints: [
    { width: 640, quality: 75 },   // Mobile
    { width: 768, quality: 80 },   // Tablet portrait
    { width: 1024, quality: 85 },  // Tablet landscape
    { width: 1280, quality: 90 },  // Desktop
    { width: 1920, quality: 95 }   // Large desktop
  ],

  // Font loading configuration
  fonts: [
    {
      fontFamily: 'Poppins',
      weights: [400, 600, 700],
      display: 'swap',
      preload: true,
      subset: 'latin',
      priority: PRIORITY.HIGH
    },
    {
      fontFamily: 'Inter',
      weights: [400, 500],
      display: 'optional',
      preload: false,
      subset: 'latin',
      priority: PRIORITY.MEDIUM
    }
  ],

  // Service Worker configuration
  serviceWorker: {
    enabled: true,
    cacheName: 'urbannook-static',
    version: 'v1',
    cacheStrategy: 'cache-first',
    maxAge: 86400, // 24 hours in seconds
    staticAssets: [
      '/',
      '/assets/hero2.webp',
      '/assets/logo.webp'
    ]
  },

  // Resource prioritization rules
  resourceRules: {
    // Critical resources that must load immediately
    critical: [
      { type: RESOURCE_TYPE.CSS, pattern: 'critical', strategy: LOAD_STRATEGY.INLINE },
      { type: RESOURCE_TYPE.FONT, pattern: 'poppins-400', strategy: LOAD_STRATEGY.PRELOAD }
    ],
    
    // High priority resources
    high: [
      { type: RESOURCE_TYPE.IMAGE, isAboveFold: true, strategy: LOAD_STRATEGY.PRELOAD },
      { type: RESOURCE_TYPE.FONT, isThirdParty: false, strategy: LOAD_STRATEGY.PRELOAD }
    ],
    
    // Low priority resources to defer
    low: [
      { type: RESOURCE_TYPE.CSS, pattern: 'fontawesome', strategy: LOAD_STRATEGY.DEFER },
      { type: RESOURCE_TYPE.SCRIPT, isThirdParty: true, strategy: LOAD_STRATEGY.DEFER },
      { type: RESOURCE_TYPE.SCRIPT, pattern: 'analytics', strategy: LOAD_STRATEGY.DEFER }
    ]
  },

  // Third-party resource domains to defer
  thirdPartyDomains: [
    'google.com',
    'googleapis.com',
    'gstatic.com',
    'accounts.google.com',
    'facebook.com',
    'twitter.com'
  ],

  // Performance monitoring settings
  monitoring: {
    enabled: true,
    logToConsole: true,
    sendToAnalytics: false
  }
};

/**
 * Gets performance configuration
 * @returns {Object} Performance configuration object
 */
export function getPerformanceConfig() {
  return performanceConfig;
}

/**
 * Updates performance configuration
 * @param {Object} updates - Configuration updates to apply
 */
export function updatePerformanceConfig(updates) {
  Object.assign(performanceConfig, updates);
}

/**
 * Checks if performance monitoring is enabled
 * @returns {boolean} True if enabled
 */
export function isPerformanceMonitoringEnabled() {
  return performanceConfig.monitoring.enabled;
}

/**
 * Checks if service worker is enabled
 * @returns {boolean} True if enabled
 */
export function isServiceWorkerEnabled() {
  return performanceConfig.serviceWorker.enabled && 
         'serviceWorker' in navigator;
}

export default performanceConfig;
