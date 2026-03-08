/**
 * Performance Validation Module
 * 
 * Validates performance metrics against mobile targets:
 * - FCP ≤ 1.8s
 * - LCP ≤ 2.5s
 * - Speed Index ≤ 3.4s
 * 
 * Requirements: 6.2, 6.4, 6.5
 */

import { getMetrics, onMetricsUpdate } from './performanceMetrics.js';

/**
 * Performance targets for mobile devices
 * Based on Core Web Vitals recommendations
 */
export const PERFORMANCE_TARGETS = {
  fcp: 1.8,        // First Contentful Paint target (seconds)
  lcp: 2.5,        // Largest Contentful Paint target (seconds)
  speedIndex: 3.4, // Speed Index target (seconds)
};

/**
 * Validation result structure
 * @typedef {Object} ValidationResult
 * @property {boolean} passed - Whether the metric meets the target
 * @property {number|null} value - The measured value
 * @property {number} target - The target value
 * @property {string} status - 'good', 'needs-improvement', 'poor', or 'pending'
 */

/**
 * Validate First Contentful Paint (FCP)
 * Requirement: 6.2 - Ensure FCP ≤1.8 seconds on mobile
 * 
 * @returns {ValidationResult} Validation result for FCP
 */
export function validateFCP() {
  const metrics = getMetrics();
  const fcp = metrics.fcp;
  
  if (fcp === null) {
    return {
      passed: false,
      value: null,
      target: PERFORMANCE_TARGETS.fcp,
      status: 'pending',
    };
  }
  
  const passed = fcp <= PERFORMANCE_TARGETS.fcp;
  
  return {
    passed,
    value: fcp,
    target: PERFORMANCE_TARGETS.fcp,
    status: getStatus(fcp, 1.8, 3.0, 4.0),
  };
}

/**
 * Validate Largest Contentful Paint (LCP)
 * Requirement: 6.4 - Ensure LCP ≤2.5 seconds on mobile
 * 
 * @returns {ValidationResult} Validation result for LCP
 */
export function validateLCP() {
  const metrics = getMetrics();
  const lcp = metrics.lcp;
  
  if (lcp === null) {
    return {
      passed: false,
      value: null,
      target: PERFORMANCE_TARGETS.lcp,
      status: 'pending',
    };
  }
  
  const passed = lcp <= PERFORMANCE_TARGETS.lcp;
  
  return {
    passed,
    value: lcp,
    target: PERFORMANCE_TARGETS.lcp,
    status: getStatus(lcp, 2.5, 4.0, 5.0),
  };
}

/**
 * Validate Speed Index
 * Requirement: 6.5 - Ensure Speed Index ≤3.4 seconds on mobile
 * 
 * @returns {ValidationResult} Validation result for Speed Index
 */
export function validateSpeedIndex() {
  const metrics = getMetrics();
  const speedIndex = metrics.speedIndex;
  
  if (speedIndex === null) {
    return {
      passed: false,
      value: null,
      target: PERFORMANCE_TARGETS.speedIndex,
      status: 'pending',
    };
  }
  
  const passed = speedIndex <= PERFORMANCE_TARGETS.speedIndex;
  
  return {
    passed,
    value: speedIndex,
    target: PERFORMANCE_TARGETS.speedIndex,
    status: getStatus(speedIndex, 3.4, 5.8, 7.0),
  };
}

/**
 * Get status based on Core Web Vitals thresholds
 * @param {number} value - Measured value
 * @param {number} good - Good threshold
 * @param {number} needsImprovement - Needs improvement threshold
 * @param {number} poor - Poor threshold
 * @returns {string} Status: 'good', 'needs-improvement', or 'poor'
 */
function getStatus(value, good, needsImprovement, poor) {
  if (value <= good) return 'good';
  if (value <= needsImprovement) return 'needs-improvement';
  return 'poor';
}

/**
 * Validate all performance metrics
 * Requirements: 6.2, 6.4, 6.5
 * 
 * @returns {Object} Validation results for all metrics
 */
export function validateAllMetrics() {
  return {
    fcp: validateFCP(),
    lcp: validateLCP(),
    speedIndex: validateSpeedIndex(),
  };
}

/**
 * Check if all performance targets are met
 * @returns {boolean} True if all metrics meet their targets
 */
export function allTargetsMet() {
  const results = validateAllMetrics();
  return results.fcp.passed && results.lcp.passed && results.speedIndex.passed;
}

/**
 * Get a summary report of performance validation
 * @returns {Object} Summary with overall status and details
 */
export function getValidationReport() {
  const results = validateAllMetrics();
  const allPassed = allTargetsMet();
  
  return {
    overall: allPassed ? 'passed' : 'failed',
    timestamp: new Date().toISOString(),
    results,
    summary: {
      passed: Object.values(results).filter(r => r.passed).length,
      failed: Object.values(results).filter(r => !r.passed && r.value !== null).length,
      pending: Object.values(results).filter(r => r.value === null).length,
    },
  };
}

/**
 * Log validation results to console
 * Useful for debugging and monitoring
 */
export function logValidationResults() {
  const report = getValidationReport();
  
  console.group('📊 Performance Validation Report');
  console.log(`Overall Status: ${report.overall.toUpperCase()}`);
  console.log(`Timestamp: ${report.timestamp}`);
  console.log('');
  
  // FCP
  const fcpResult = report.results.fcp;
  console.log(
    `FCP: ${fcpResult.value !== null ? fcpResult.value.toFixed(3) + 's' : 'pending'} ` +
    `(target: ≤${fcpResult.target}s) - ${fcpResult.status.toUpperCase()}`
  );
  
  // LCP
  const lcpResult = report.results.lcp;
  console.log(
    `LCP: ${lcpResult.value !== null ? lcpResult.value.toFixed(3) + 's' : 'pending'} ` +
    `(target: ≤${lcpResult.target}s) - ${lcpResult.status.toUpperCase()}`
  );
  
  // Speed Index
  const siResult = report.results.speedIndex;
  console.log(
    `Speed Index: ${siResult.value !== null ? siResult.value.toFixed(3) + 's' : 'pending'} ` +
    `(target: ≤${siResult.target}s) - ${siResult.status.toUpperCase()}`
  );
  
  console.log('');
  console.log(`Summary: ${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.pending} pending`);
  console.groupEnd();
}

/**
 * Monitor performance metrics and log validation when all metrics are available
 */
export function monitorPerformance() {
  onMetricsUpdate((metrics) => {
    // Only log when all metrics are available
    if (metrics.fcp !== null && metrics.lcp !== null && metrics.speedIndex !== null) {
      logValidationResults();
    }
  });
}
