/**
 * Property-Based Tests for Error Handling
 * 
 * Tests universal properties of error handling middleware:
 * - Property 9: Error Response Consistency (Requirement 18.2)
 * - Property 10: HTTP Status Code Correctness (Requirements 18.3, 18.4, 18.5, 18.6, 18.7)
 */

import fc from 'fast-check';
import { errorHandler } from '../../middleware/errorHandler.middleware.js';
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  InternalServerError,
  BadRequestError,
  ServiceUnavailableError
} from '../../utils/errors.js';

describe('Error Handler Property-Based Tests', () => {
  let mockReq, mockRes, mockNext, originalNodeEnv;

  beforeEach(() => {
    // Save original NODE_ENV
    originalNodeEnv = process.env.NODE_ENV;
    
    // Create mock request
    mockReq = {
      method: 'GET',
      url: '/test',
      user: null
    };
    
    // Create mock response with chainable methods
    mockRes = {
      statusValue: null,
      jsonValue: null,
      status: function(code) {
        this.statusValue = code;
        return this;
      },
      json: function(data) {
        this.jsonValue = data;
        return this;
      }
    };
    
    mockNext = () => {};
  });

  afterEach(() => {
    // Restore original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  });

  /**
   * Property 9: Error Response Consistency
   * Validates: Requirements 18.2
   * 
   * Property: For ANY error thrown, the error handler MUST return a response
   * with a consistent structure containing:
   * - statusCode (number)
   * - message (string)
   * - data (any or null)
   * - success (boolean, always false)
   */
  describe('Property 9: Error Response Consistency', () => {
    test('should return consistent error response structure for any error', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary error messages and status codes
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.integer({ min: 400, max: 599 }),
          fc.oneof(
            fc.constant(null),
            fc.string(),
            fc.object(),
            fc.array(fc.string())
          ),
          (errorMessage, statusCode, errorData) => {
            // Create error with arbitrary properties
            const error = new Error(errorMessage);
            error.statusCode = statusCode;
            error.data = errorData;

            // Call error handler
            errorHandler(error, mockReq, mockRes, mockNext);

            // Verify response structure
            expect(mockRes.statusValue).toBe(statusCode);
            expect(mockRes.jsonValue).toBeDefined();

            const response = mockRes.jsonValue;

            // Property: Response MUST have consistent structure
            expect(response).toHaveProperty('statusCode');
            expect(response).toHaveProperty('message');
            expect(response).toHaveProperty('data');
            expect(response).toHaveProperty('success');

            // Property: statusCode MUST be a number
            expect(typeof response.statusCode).toBe('number');

            // Property: message MUST be a string
            expect(typeof response.message).toBe('string');

            // Property: success MUST always be false for errors
            expect(response.success).toBe(false);

            // Property: statusCode in response MUST match status() call
            expect(response.statusCode).toBe(statusCode);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should return consistent structure for errors without statusCode', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          (errorMessage) => {
            // Create error without statusCode (should default to 500)
            const error = new Error(errorMessage);

            // Call error handler
            errorHandler(error, mockReq, mockRes, mockNext);

            const response = mockRes.jsonValue;

            // Property: Errors without statusCode MUST default to 500
            expect(mockRes.statusValue).toBe(500);
            expect(response.statusCode).toBe(500);

            // Property: Response structure MUST be consistent
            expect(response).toMatchObject({
              statusCode: expect.any(Number),
              message: expect.any(String),
              success: false
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 10: HTTP Status Code Correctness
   * Validates: Requirements 18.3, 18.4, 18.5, 18.6, 18.7
   * 
   * Property: Each custom error class MUST return its designated HTTP status code:
   * - ValidationError -> 400
   * - AuthenticationError -> 401
   * - AuthorizationError -> 403
   * - NotFoundError -> 404
   * - ConflictError -> 409
   * - InternalServerError -> 500
   * - ServiceUnavailableError -> 503
   */
  describe('Property 10: HTTP Status Code Correctness', () => {
    const errorClassTestCases = [
      { ErrorClass: ValidationError, expectedStatus: 400, requirement: '18.3' },
      { ErrorClass: AuthenticationError, expectedStatus: 401, requirement: '18.4' },
      { ErrorClass: AuthorizationError, expectedStatus: 403, requirement: '18.5' },
      { ErrorClass: NotFoundError, expectedStatus: 404, requirement: '18.6' },
      { ErrorClass: InternalServerError, expectedStatus: 500, requirement: '18.7' },
      { ErrorClass: ConflictError, expectedStatus: 409, requirement: '18.3' },
      { ErrorClass: BadRequestError, expectedStatus: 400, requirement: '18.3' },
      { ErrorClass: ServiceUnavailableError, expectedStatus: 503, requirement: '18.7' }
    ];

    errorClassTestCases.forEach(({ ErrorClass, expectedStatus, requirement }) => {
      test(`${ErrorClass.name} should always return ${expectedStatus} status code (Req ${requirement})`, () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 0, maxLength: 200 }),
            (errorMessage) => {
              // Create error instance with arbitrary message
              const error = errorMessage 
                ? new ErrorClass(errorMessage)
                : new ErrorClass();

              // Call error handler
              errorHandler(error, mockReq, mockRes, mockNext);

              // Property: Error class MUST return its designated status code
              expect(mockRes.statusValue).toBe(expectedStatus);

              const response = mockRes.jsonValue;
              expect(response.statusCode).toBe(expectedStatus);

              // Property: success MUST always be false
              expect(response.success).toBe(false);
            }
          ),
          { numRuns: 50 }
        );
      });
    });

    test('should preserve custom status codes for any 4xx or 5xx error', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 400, max: 599 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (statusCode, message) => {
            const error = new Error(message);
            error.statusCode = statusCode;

            // Call error handler
            errorHandler(error, mockReq, mockRes, mockNext);

            // Property: Custom status codes MUST be preserved
            expect(mockRes.statusValue).toBe(statusCode);

            const response = mockRes.jsonValue;
            expect(response.statusCode).toBe(statusCode);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional Property: Production Error Message Sanitization
   * 
   * Property: In production mode, 500 errors MUST NOT expose internal details
   */
  describe('Production Error Message Sanitization', () => {
    test('should hide internal error details in production for 500 errors', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          (errorMessage) => {
            // Set production environment
            process.env.NODE_ENV = 'production';

            const error = new InternalServerError(errorMessage);

            // Call error handler
            errorHandler(error, mockReq, mockRes, mockNext);

            const response = mockRes.jsonValue;

            // Property: Production 500 errors MUST show generic message
            expect(response.message).toBe('Internal server error');

            // Property: Production 500 errors MUST NOT expose stack traces
            expect(response.data).toBeNull();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should expose error details in development for 500 errors', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          (errorMessage) => {
            // Set development environment
            process.env.NODE_ENV = 'development';

            const error = new InternalServerError(errorMessage);

            // Call error handler
            errorHandler(error, mockReq, mockRes, mockNext);

            const response = mockRes.jsonValue;

            // Property: Development errors MUST show actual message
            expect(response.message).toBe(errorMessage);

            // Property: Development errors MAY expose stack traces
            expect(response.data).toBeDefined();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should always expose client error messages (4xx) regardless of environment', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('production', 'development', 'test'),
          fc.string({ minLength: 1, maxLength: 200 }),
          (nodeEnv, errorMessage) => {
            process.env.NODE_ENV = nodeEnv;

            // Test with various 4xx errors
            const error = new ValidationError(errorMessage);

            // Call error handler
            errorHandler(error, mockReq, mockRes, mockNext);

            const response = mockRes.jsonValue;

            // Property: Client errors (4xx) MUST always show actual message
            expect(response.message).toBe(errorMessage);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Additional Property: Error Response Immutability
   * 
   * Property: The error handler MUST NOT modify the original error object
   */
  describe('Error Object Immutability', () => {
    test('should not modify the original error object', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.integer({ min: 400, max: 599 }),
          (message, statusCode) => {
            const error = new Error(message);
            error.statusCode = statusCode;

            // Capture original properties
            const originalMessage = error.message;
            const originalStatusCode = error.statusCode;
            const originalStack = error.stack;

            // Call error handler
            errorHandler(error, mockReq, mockRes, mockNext);

            // Property: Original error properties MUST remain unchanged
            expect(error.message).toBe(originalMessage);
            expect(error.statusCode).toBe(originalStatusCode);
            expect(error.stack).toBe(originalStack);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
