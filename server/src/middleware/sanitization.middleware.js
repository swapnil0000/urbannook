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
 * Middleware to sanitize testimonial input fields
 * Strips all HTML tags while preserving safe special characters
 */
export const sanitizeTestimonialInput = (req, res, next) => {
  const fieldsToSanitize = ['userName', 'userRole', 'userLocation', 'content'];
  
  fieldsToSanitize.forEach(field => {
    if (req.body[field]) {
      // First sanitize to remove HTML tags
      let sanitized = sanitizeHtml(req.body[field], {
        allowedTags: [], // Strip all HTML tags
        allowedAttributes: {},
        disallowedTagsMode: 'discard'
      });
      
      // Then decode HTML entities to preserve safe special characters
      sanitized = decodeHtmlEntities(sanitized);
      
      // Finally trim whitespace
      req.body[field] = sanitized.trim();
    }
  });
  
  next();
};
