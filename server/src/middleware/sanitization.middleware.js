import sanitizeHtml from 'sanitize-html';

/**
 * Decode HTML entities back to their original characters
 * @param {string} text - Text with HTML entities
 * @returns {string} Text with decoded entities
 */
const decodeHtmlEntities = (text) => {
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
  };
  
  return text.replace(/&[#\w]+;/g, (entity) => entities[entity] || entity);
};

/**
 * Sanitize a single value (string)
 * Removes all HTML tags while preserving safe special characters
 * @param {string} value - Value to sanitize
 * @returns {string} Sanitized value
 */
const sanitizeValue = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  // First sanitize to remove HTML tags
  let sanitized = sanitizeHtml(value, {
    allowedTags: [], // Strip all HTML tags
    allowedAttributes: {},
    disallowedTagsMode: 'discard'
  });
  
  // Then decode HTML entities to preserve safe special characters
  sanitized = decodeHtmlEntities(sanitized);
  
  // Finally trim whitespace
  return sanitized.trim();
};

/**
 * Recursively sanitize an object or array
 * @param {*} obj - Object, array, or primitive to sanitize
 * @returns {*} Sanitized object/array/primitive
 */
const sanitizeObject = (obj) => {
  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  // Handle objects
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  // Handle strings
  if (typeof obj === 'string') {
    return sanitizeValue(obj);
  }

  // Return other primitives as-is (numbers, booleans, etc.)
  return obj;
};

/**
 * Global middleware to sanitize all request body fields
 * Recursively sanitizes strings in req.body, req.query, and req.params
 * 
 * Protects against XSS attacks by removing HTML tags and malicious scripts
 * 
 * Usage:
 *   app.use('/api/v1', sanitizeRequestBody);
 */
export const sanitizeRequestBody = (req, res, next) => {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Note: req.query and req.params are read-only in Express 5
    // Sanitize query parameters by mutating in place
    if (req.query && typeof req.query === 'object') {
      for (const key of Object.keys(req.query)) {
        req.query[key] = sanitizeObject(req.query[key]);
      }
    }

    // Sanitize URL parameters by mutating in place
    if (req.params && typeof req.params === 'object') {
      for (const key of Object.keys(req.params)) {
        req.params[key] = sanitizeObject(req.params[key]);
      }
    }

    next();
  } catch (error) {
    console.error('[ERROR] Sanitization middleware error:', error);
    // Don't block the request if sanitization fails
    next();
  }
};

/**
 * Middleware to sanitize testimonial input fields
 * Strips all HTML tags while preserving safe special characters
 * 
 * @deprecated Use sanitizeRequestBody instead for global protection
 */
export const sanitizeTestimonialInput = (req, res, next) => {
  const fieldsToSanitize = ['userName', 'userRole', 'userLocation', 'content'];
  
  fieldsToSanitize.forEach(field => {
    if (req.body[field]) {
      req.body[field] = sanitizeValue(req.body[field]);
    }
  });
  
  next();
};
