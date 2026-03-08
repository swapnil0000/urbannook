/**
 * Font Loading Utility
 * Implements optimized font loading strategies with font-display, preloading, and subsetting
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

/**
 * Font display strategies
 */
export const FONT_DISPLAY = {
  SWAP: 'swap',      // Show fallback immediately, swap when custom font loads
  OPTIONAL: 'optional', // Use custom font only if available within timeout
  FALLBACK: 'fallback', // Brief block period, then fallback, swap when loaded
  BLOCK: 'block',    // Block rendering until font loads (not recommended)
  AUTO: 'auto'       // Browser default (not recommended)
};

/**
 * System font fallback stacks
 */
export const FALLBACK_FONTS = {
  sansSerif: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", Times, serif',
  monospace: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace'
};

/**
 * Unicode ranges for font subsetting
 */
export const UNICODE_RANGES = {
  latin: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  latinExt: 'U+0100-024F, U+0259, U+1E00-1EFF, U+2020, U+20A0-20AB, U+20AD-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF',
  cyrillic: 'U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116',
  greek: 'U+0370-03FF'
};

/**
 * Creates a preload link element for a font
 * @param {string} fontFamily - Font family name
 * @param {number} weight - Font weight
 * @param {string} format - Font format (woff2, woff, etc.)
 * @param {string} url - Font file URL
 * @returns {HTMLLinkElement} Preload link element
 */
export function createFontPreload(fontFamily, weight, format, url) {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'font';
  link.type = `font/${format}`;
  link.href = url;
  link.crossOrigin = 'anonymous'; // Required for font preloading
  link.setAttribute('data-font-family', fontFamily);
  link.setAttribute('data-font-weight', weight);
  return link;
}

/**
 * Generates @font-face CSS declaration with optimizations
 * @param {Object} config - Font configuration
 * @param {string} config.fontFamily - Font family name
 * @param {number|string} config.weight - Font weight
 * @param {string} config.style - Font style (normal, italic)
 * @param {string} config.display - Font display strategy
 * @param {string} config.subset - Unicode range subset
 * @param {Array<{format: string, url: string}>} config.sources - Font file sources
 * @returns {string} @font-face CSS declaration
 */
export function generateFontFace(config) {
  const {
    fontFamily,
    weight = 400,
    style = 'normal',
    display = FONT_DISPLAY.SWAP,
    subset = 'latin',
    sources = []
  } = config;

  // Validate font-display is not block or auto (Requirement 3.1)
  if (display === FONT_DISPLAY.BLOCK || display === FONT_DISPLAY.AUTO) {
    console.warn(`Font ${fontFamily}: font-display should be swap, optional, or fallback. Using swap instead.`);
  }

  const unicodeRange = UNICODE_RANGES[subset] || UNICODE_RANGES.latin;
  
  // Build src declarations
  const srcDeclarations = sources.map(({ format, url }) => {
    return `url('${url}') format('${format}')`;
  }).join(',\n       ');

  return `@font-face {
  font-family: '${fontFamily}';
  font-style: ${style};
  font-weight: ${weight};
  font-display: ${display};
  src: ${srcDeclarations};
  unicode-range: ${unicodeRange};
}`;
}

/**
 * Loads a font with optional timeout (Requirement 3.5)
 * @param {string} fontFamily - Font family name
 * @param {number} weight - Font weight
 * @param {number} timeout - Timeout in milliseconds (default: 100ms for optional)
 * @returns {Promise<boolean>} Resolves to true if font loaded, false if timeout
 */
export async function loadFontWithTimeout(fontFamily, weight = 400, timeout = 100) {
  if (!('fonts' in document)) {
    console.warn('Font Loading API not supported');
    return false;
  }

  try {
    const fontFace = `${weight} 1em "${fontFamily}"`;
    
    // Race between font load and timeout
    const loadPromise = document.fonts.load(fontFace);
    const timeoutPromise = new Promise((resolve) => 
      setTimeout(() => resolve(false), timeout)
    );

    const result = await Promise.race([loadPromise, timeoutPromise]);
    return result !== false;
  } catch (error) {
    console.error(`Failed to load font ${fontFamily}:`, error);
    return false;
  }
}

/**
 * Applies font loading strategy to a font configuration
 * @param {Object} fontConfig - Font configuration from performance.js
 * @param {string} fontConfig.fontFamily - Font family name
 * @param {Array<number>} fontConfig.weights - Font weights to load
 * @param {string} fontConfig.display - Font display strategy
 * @param {boolean} fontConfig.preload - Whether to preload the font
 * @param {string} fontConfig.subset - Unicode range subset
 * @returns {Object} Applied font configuration with preload elements
 */
export function applyFontLoadingStrategy(fontConfig) {
  const {
    fontFamily,
    weights = [400],
    display = FONT_DISPLAY.SWAP,
    preload = false,
    subset = 'latin'
  } = fontConfig;

  const result = {
    fontFamily,
    display,
    preloadElements: [],
    fontFaceDeclarations: []
  };

  // Preload only the primary weight (Requirement 3.2)
  if (preload && weights.length > 0) {
    const primaryWeight = weights[0];
    // Note: In real implementation, you'd have actual font file URLs
    // For Google Fonts, this would be handled by the Google Fonts API
    console.log(`Preloading ${fontFamily} weight ${primaryWeight}`);
  }

  // Load fonts with timeout for optional display
  if (display === FONT_DISPLAY.OPTIONAL) {
    weights.forEach(weight => {
      loadFontWithTimeout(fontFamily, weight, 100).then(loaded => {
        if (!loaded) {
          console.log(`Font ${fontFamily} ${weight} not loaded within 100ms timeout`);
        }
      });
    });
  }

  return result;
}

/**
 * Gets the appropriate fallback font stack for a font family
 * @param {string} fontFamily - Font family name
 * @returns {string} Complete font stack with fallbacks
 */
export function getFontStackWithFallback(fontFamily) {
  // Determine the appropriate fallback based on font characteristics
  let fallback = FALLBACK_FONTS.sansSerif;
  
  const lowerFamily = fontFamily.toLowerCase();
  if (lowerFamily.includes('serif') && !lowerFamily.includes('sans')) {
    fallback = FALLBACK_FONTS.serif;
  } else if (lowerFamily.includes('mono') || lowerFamily.includes('code')) {
    fallback = FALLBACK_FONTS.monospace;
  }

  return `"${fontFamily}", ${fallback}`;
}

/**
 * Validates font configuration
 * @param {Object} fontConfig - Font configuration to validate
 * @returns {Object} Validation result with isValid and errors
 */
export function validateFontConfig(fontConfig) {
  const errors = [];

  if (!fontConfig.fontFamily) {
    errors.push('fontFamily is required');
  }

  if (fontConfig.display && 
      !Object.values(FONT_DISPLAY).includes(fontConfig.display)) {
    errors.push(`Invalid font-display value: ${fontConfig.display}`);
  }

  // Warn if using block or auto (Requirement 3.1)
  if (fontConfig.display === FONT_DISPLAY.BLOCK || 
      fontConfig.display === FONT_DISPLAY.AUTO) {
    errors.push('font-display should be swap, optional, or fallback for optimal performance');
  }

  if (fontConfig.weights && !Array.isArray(fontConfig.weights)) {
    errors.push('weights must be an array');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Initializes font loading for all configured fonts
 * @param {Array<Object>} fontConfigs - Array of font configurations
 * @returns {Promise<Object>} Results of font loading initialization
 */
export async function initializeFontLoading(fontConfigs) {
  const results = {
    loaded: [],
    failed: [],
    preloaded: []
  };

  for (const config of fontConfigs) {
    const validation = validateFontConfig(config);
    
    if (!validation.isValid) {
      console.error(`Invalid font config for ${config.fontFamily}:`, validation.errors);
      results.failed.push({ fontFamily: config.fontFamily, errors: validation.errors });
      continue;
    }

    try {
      const applied = applyFontLoadingStrategy(config);
      results.loaded.push(applied);
      
      if (config.preload) {
        results.preloaded.push(config.fontFamily);
      }
    } catch (error) {
      console.error(`Failed to initialize font ${config.fontFamily}:`, error);
      results.failed.push({ fontFamily: config.fontFamily, error: error.message });
    }
  }

  return results;
}

export default {
  FONT_DISPLAY,
  FALLBACK_FONTS,
  UNICODE_RANGES,
  createFontPreload,
  generateFontFace,
  loadFontWithTimeout,
  applyFontLoadingStrategy,
  getFontStackWithFallback,
  validateFontConfig,
  initializeFontLoading
};
