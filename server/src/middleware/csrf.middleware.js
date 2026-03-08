import crypto from 'crypto';
import { ApiError } from '../utils/index.js';

/**
 * CSRF Protection Middleware
 * 
 * Protects against Cross-Site Request Forgery attacks by validating
 * CSRF tokens on state-changing requests (POST, PUT, PATCH, DELETE)
 */

// Store for CSRF tokens (in production, use Redis or database)
const csrfTokenStore = new Map();

// Token expiry time (15 minutes)
const TOKEN_EXPIRY = 15 * 60 * 1000;

/**
 * Generate a cryptographically secure CSRF token
 */
export const generateCsrfToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Store CSRF token with expiry
 */
const storeToken = (userId, token) => {
  csrfTokenStore.set(userId, {
    token,
    expiresAt: Date.now() + TOKEN_EXPIRY
  });
};

/**
 * Validate CSRF token
 */
const validateToken = (userId, token) => {
  const stored = csrfTokenStore.get(userId);
  
  if (!stored) {
    return false;
  }
  
  // Check if token expired
  if (Date.now() > stored.expiresAt) {
    csrfTokenStore.delete(userId);
    return false;
  }
  
  // Check if token matches
  return stored.token === token;
};

/**
 * Middleware to generate and attach CSRF token
 * Use this on routes that need to provide CSRF token
 */
export const csrfTokenGenerator = (req, res, next) => {
  try {
    // Generate new token
    const token = generateCsrfToken();
    
    // Get user ID from authenticated request
    const userId = req.user?.userId || req.user?.email || 'anonymous';
    
    // Store token
    storeToken(userId, token);
    
    // Attach token to request for controller to use
    req.csrfToken = token;
    
    next();
  } catch (error) {
    console.error('[CSRF] Token generation failed:', error);
    return res.status(500).json(
      new ApiError(500, 'Failed to generate CSRF token', null, false)
    );
  }
};

/**
 * Middleware to validate CSRF token
 * Use this on state-changing routes (POST, PUT, PATCH, DELETE)
 */
export const csrfProtection = (req, res, next) => {
  try {
    // Skip CSRF check for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }
    
    // Get user ID
    const userId = req.user?.userId || req.user?.email;
    
    if (!userId) {
      return res.status(401).json(
        new ApiError(401, 'Authentication required for CSRF validation', null, false)
      );
    }
    
    // Get token from request (check multiple sources)
    const tokenFromHeader = req.headers['x-csrf-token'];
    const tokenFromBody = req.body?._csrf;
    const token = tokenFromHeader || tokenFromBody;
    
    if (!token) {
      console.warn(`[CSRF] Token missing for user: ${userId}, method: ${req.method}, path: ${req.path}`);
      return res.status(403).json(
        new ApiError(403, 'CSRF token missing', null, false)
      );
    }
    
    // Validate token
    const isValid = validateToken(userId, token);
    
    if (!isValid) {
      console.warn(`[CSRF] Invalid token for user: ${userId}, method: ${req.method}, path: ${req.path}`);
      return res.status(403).json(
        new ApiError(403, 'Invalid or expired CSRF token', null, false)
      );
    }
    
    // Token valid, proceed
    next();
  } catch (error) {
    console.error('[CSRF] Validation error:', error);
    return res.status(500).json(
      new ApiError(500, 'CSRF validation failed', null, false)
    );
  }
};

/**
 * Cleanup expired tokens periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of csrfTokenStore.entries()) {
    if (now > data.expiresAt) {
      csrfTokenStore.delete(userId);
    }
  }
}, 5 * 60 * 1000); // Cleanup every 5 minutes

export default {
  csrfTokenGenerator,
  csrfProtection,
  generateCsrfToken
};
