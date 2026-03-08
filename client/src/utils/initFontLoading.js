/**
 * Font Loading Initialization
 * Initializes optimized font loading on application startup
 * Validates: Requirements 3.1, 3.2, 3.5
 */

import { loadFontWithTimeout, FONT_DISPLAY } from './fontLoader.js';
import { performanceConfig } from '../config/performance.js';

/**
 * Initializes font loading for all configured fonts
 * Enforces 100ms timeout for optional fonts (Requirement 3.5)
 */
export async function initializeFonts() {
  const { fonts } = performanceConfig;

  if (!fonts || fonts.length === 0) {
    console.warn('No fonts configured for loading');
    return;
  }

  const results = {
    loaded: [],
    timedOut: [],
    errors: []
  };

  for (const fontConfig of fonts) {
    const { fontFamily, weights, display } = fontConfig;

    // For optional fonts, enforce 100ms timeout (Requirement 3.5)
    if (display === FONT_DISPLAY.OPTIONAL) {
      for (const weight of weights) {
        try {
          const loaded = await loadFontWithTimeout(fontFamily, weight, 100);
          
          if (loaded) {
            results.loaded.push({ fontFamily, weight });
            console.log(`✓ Font loaded: ${fontFamily} ${weight}`);
          } else {
            results.timedOut.push({ fontFamily, weight });
            console.log(`⏱ Font timeout: ${fontFamily} ${weight} (using fallback)`);
          }
        } catch (error) {
          results.errors.push({ fontFamily, weight, error: error.message });
          console.error(`✗ Font error: ${fontFamily} ${weight}`, error);
        }
      }
    } else {
      // For swap/fallback fonts, just log that they're configured
      console.log(`Font configured with ${display}: ${fontFamily}`);
      results.loaded.push({ fontFamily, display });
    }
  }

  return results;
}

/**
 * Checks if Font Loading API is supported
 * @returns {boolean} True if supported
 */
export function isFontLoadingAPISupported() {
  return 'fonts' in document;
}

/**
 * Gets the status of a specific font
 * @param {string} fontFamily - Font family name
 * @param {number} weight - Font weight
 * @returns {string} Font status: 'loaded', 'loading', 'unloaded', or 'unsupported'
 */
export function getFontStatus(fontFamily, weight = 400) {
  if (!isFontLoadingAPISupported()) {
    return 'unsupported';
  }

  const fontFace = `${weight} 1em "${fontFamily}"`;
  const isLoaded = document.fonts.check(fontFace);
  
  return isLoaded ? 'loaded' : 'unloaded';
}

/**
 * Waits for all fonts to be ready
 * @param {number} timeout - Maximum time to wait in milliseconds
 * @returns {Promise<boolean>} True if fonts are ready, false if timeout
 */
export async function waitForFontsReady(timeout = 3000) {
  if (!isFontLoadingAPISupported()) {
    return false;
  }

  try {
    const readyPromise = document.fonts.ready;
    const timeoutPromise = new Promise((resolve) => 
      setTimeout(() => resolve(false), timeout)
    );

    const result = await Promise.race([readyPromise, timeoutPromise]);
    return result !== false;
  } catch (error) {
    console.error('Error waiting for fonts:', error);
    return false;
  }
}

export default {
  initializeFonts,
  isFontLoadingAPISupported,
  getFontStatus,
  waitForFontsReady
};
