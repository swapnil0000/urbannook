
/**
 * Validation Error (400)
 * Used when request data fails validation
 */
export class ValidationError extends Error {
  constructor(message = 'Validation failed', data = null) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.data = data;
    this.success = false;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Authentication Error (401)
 * Used when authentication fails or token is invalid
 */
export class AuthenticationError extends Error {
  constructor(message = 'Authentication failed', data = null) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
    this.data = data;
    this.success = false;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Authorization Error (403)
 * Used when user lacks permission to access resource
 */
export class AuthorizationError extends Error {
  constructor(message = 'Access denied', data = null) {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = 403;
    this.data = data;
    this.success = false;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not Found Error (404)
 * Used when requested resource doesn't exist
 */
export class NotFoundError extends Error {
  constructor(message = 'Resource not found', data = null) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
    this.data = data;
    this.success = false;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Conflict Error (409)
 * Used when request conflicts with current state
 */
export class ConflictError extends Error {
  constructor(message = 'Resource conflict', data = null) {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
    this.data = data;
    this.success = false;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Internal Server Error (500)
 * Used for unexpected server errors
 */
export class InternalServerError extends Error {
  constructor(message = 'Internal server error', data = null) {
    super(message);
    this.name = 'InternalServerError';
    this.statusCode = 500;
    this.data = data;
    this.success = false;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Bad Request Error (400)
 * Used for general bad request errors
 */
export class BadRequestError extends Error {
  constructor(message = 'Bad request', data = null) {
    super(message);
    this.name = 'BadRequestError';
    this.statusCode = 400;
    this.data = data;
    this.success = false;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Service Unavailable Error (503)
 * Used when external service is unavailable
 */
export class ServiceUnavailableError extends Error {
  constructor(message = 'Service temporarily unavailable', data = null) {
    super(message);
    this.name = 'ServiceUnavailableError';
    this.statusCode = 503;
    this.data = data;
    this.success = false;
    Error.captureStackTrace(this, this.constructor);
  }
}
