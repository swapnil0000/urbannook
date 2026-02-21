/**
 * Custom Error Classes
 * Provides specific error types with appropriate HTTP status codes
 */

/**
 * Base API Error class
 */
class APIError extends Error {
  constructor(message, statusCode, data = null) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error (400)
 * Used when request data fails validation
 */
export class ValidationError extends APIError {
  constructor(message = 'Validation failed', fields = null) {
    super(message, 400, fields);
    this.fields = fields;
  }
}

/**
 * Authentication Error (401)
 * Used when authentication fails or token is invalid
 */
export class AuthenticationError extends APIError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

/**
 * Authorization Error (403)
 * Used when user lacks permission to access resource
 */
export class AuthorizationError extends APIError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

/**
 * Not Found Error (404)
 * Used when requested resource doesn't exist
 */
export class NotFoundError extends APIError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

/**
 * Conflict Error (409)
 * Used when request conflicts with current state
 */
export class ConflictError extends APIError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
  }
}

/**
 * Internal Server Error (500)
 * Used for unexpected server errors
 */
export class InternalServerError extends APIError {
  constructor(message = 'Internal server error') {
    super(message, 500);
  }
}

/**
 * Bad Request Error (400)
 * Used for general bad request errors
 */
export class BadRequestError extends APIError {
  constructor(message = 'Bad request') {
    super(message, 400);
  }
}

/**
 * Service Unavailable Error (503)
 * Used when external service is unavailable
 */
export class ServiceUnavailableError extends APIError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503);
  }
}
