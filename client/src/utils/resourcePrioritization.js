/**
 * Resource Prioritization Utility
 * 
 * Categorizes resources by priority and identifies resources for deferral.
 * Validates: Requirements 4.1, 4.3, 4.4
 */

/**
 * Resource priority levels
 */
export const PRIORITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

/**
 * Resource types
 */
export const RESOURCE_TYPE = {
  CSS: 'css',
  SCRIPT: 'script',
  FONT: 'font',
  IMAGE: 'image'
};

/**
 * Load strategies for resources
 */
export const LOAD_STRATEGY = {
  INLINE: 'inline',
  PRELOAD: 'preload',
  DEFER: 'defer',
  ASYNC: 'async',
  LAZY: 'lazy'
};

/**
 * Categorizes a resource by priority based on its characteristics
 * 
 * @param {Object} resource - Resource object with type, path, and optional metadata
 * @param {string} resource.type - Resource type (css, script, font, image)
 * @param {string} resource.path - Resource path or URL
 * @param {boolean} [resource.isAboveFold] - Whether resource is needed above the fold
 * @param {boolean} [resource.isThirdParty] - Whether resource is from third-party domain
 * @returns {string} Priority level (critical, high, medium, low)
 * 
 * Validates: Requirement 4.1 - Categorize each resource by priority
 */
export function categorizeResourcePriority(resource) {
  const { type, path, isAboveFold = false, isThirdParty = false } = resource;

  // Critical: Above-fold images and critical CSS
  if (isAboveFold && (type === RESOURCE_TYPE.IMAGE || type === RESOURCE_TYPE.CSS)) {
    return PRIORITY.CRITICAL;
  }

  // Critical: Primary fonts
  if (type === RESOURCE_TYPE.FONT && !isThirdParty && isAboveFold) {
    return PRIORITY.CRITICAL;
  }

  // High: Main application scripts
  if (type === RESOURCE_TYPE.SCRIPT && !isThirdParty && path.includes('main')) {
    return PRIORITY.HIGH;
  }

  // Low: Third-party scripts (analytics, auth, etc.)
  // Validates: Requirement 4.3 - Identify third-party scripts for deferral
  if (isThirdParty) {
    return PRIORITY.LOW;
  }

  // Low: Icon libraries (Font Awesome, etc.)
  // Validates: Requirement 4.4 - Detect Font Awesome and icon libraries
  if (isIconLibrary(path)) {
    return PRIORITY.LOW;
  }

  // Medium: Everything else
  return PRIORITY.MEDIUM;
}

/**
 * Checks if a resource path is an icon library
 * 
 * @param {string} path - Resource path or URL
 * @returns {boolean} True if resource is an icon library
 * 
 * Validates: Requirement 4.4 - Detect Font Awesome and icon libraries
 */
export function isIconLibrary(path) {
  const iconLibraryPatterns = [
    'fontawesome',
    'font-awesome',
    'material-icons',
    'material+icons',
    'bootstrap-icons',
    'feather-icons',
    'ionicons',
    'heroicons'
  ];

  const lowerPath = path.toLowerCase();
  return iconLibraryPatterns.some(pattern => lowerPath.includes(pattern));
}

/**
 * Checks if a resource is from a third-party domain
 * 
 * @param {string} path - Resource path or URL
 * @returns {boolean} True if resource is third-party
 * 
 * Validates: Requirement 4.3 - Identify third-party scripts for deferral
 */
export function isThirdPartyResource(path) {
  // Check if it's an external URL
  if (!path.startsWith('http://') && !path.startsWith('https://')) {
    return false;
  }

  const thirdPartyDomains = [
    'accounts.google.com',
    'cdn.jsdelivr.net',
    'cdnjs.cloudflare.com',
    'unpkg.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'analytics.google.com',
    'www.googletagmanager.com'
  ];

  return thirdPartyDomains.some(domain => path.includes(domain));
}

/**
 * Categorizes an array of resources by priority
 * 
 * @param {Array<Object>} resources - Array of resource objects
 * @returns {Object} Object with resources grouped by priority
 * 
 * Validates: Requirement 4.1 - Categorize each resource by priority
 */
export function categorizeResources(resources) {
  const categorized = {
    [PRIORITY.CRITICAL]: [],
    [PRIORITY.HIGH]: [],
    [PRIORITY.MEDIUM]: [],
    [PRIORITY.LOW]: []
  };

  resources.forEach(resource => {
    const priority = categorizeResourcePriority(resource);
    categorized[priority].push(resource);
  });

  return categorized;
}

/**
 * Separates resources into critical and deferred based on priority
 * 
 * @param {Array<Object>} resources - Array of resource objects
 * @returns {Object} Object with critical and deferred arrays
 * 
 * Validates: Requirements 4.1, 4.5 - Ensure critical path resources load before non-critical
 */
export function deferNonCriticalResources(resources) {
  const critical = [];
  const deferred = [];

  resources.forEach(resource => {
    const priority = categorizeResourcePriority(resource);
    
    // Critical and high priority resources load immediately
    if (priority === PRIORITY.CRITICAL || priority === PRIORITY.HIGH) {
      critical.push(resource);
    } else {
      // Medium and low priority resources are deferred
      deferred.push(resource);
    }
  });

  return { critical, deferred };
}
