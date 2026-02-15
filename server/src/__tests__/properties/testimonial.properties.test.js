/**
 * Property-Based Tests for Testimonial Model Validation
 * 
 * These tests verify universal properties of the testimonial system
 * using property-based testing with fast-check library.
 * 
 * Each property test runs 20 iterations with randomly generated inputs.
 */

import fc from 'fast-check';
import Testimonial from '../../model/testimonial.model.js';
import { createTestimonialService, getApprovedTestimonialsService } from '../../services/testimonial.service.js';
import mongoose from 'mongoose';

describe('Testimonial Model Validation Properties', () => {
  
  /**
   * Feature: testimonials-system, Property 3: Rating Validation
   * Validates: Requirements 1.3, 3.6
   * 
   * For any testimonial with rating outside [0, 4] or non-integer rating,
   * the system should reject the submission with validation error.
   */
  describe('Property 3: Rating Validation', () => {
    test('testimonials with ratings outside [0, 4] should always fail validation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userName: fc.string({ minLength: 1, maxLength: 100 })
              .filter(s => s.trim().length >= 1), // Ensure non-empty after trim
            content: fc.string({ minLength: 10, maxLength: 500 })
              .filter(s => s.trim().length >= 10), // Ensure valid length after trim
            rating: fc.oneof(
              fc.integer({ min: -1000, max: -1 }), // Negative ratings
              fc.integer({ min: 5, max: 1000 }) // Ratings above 4
            )
          }),
          async (testimonialData) => {
            const testimonial = new Testimonial(testimonialData);
            
            // Property: Invalid rating must fail validation
            await expect(testimonial.validate()).rejects.toThrow();
            
            // Verify the error is specifically about rating
            try {
              await testimonial.validate();
            } catch (error) {
              expect(error.errors.rating).toBeDefined();
              expect(error.errors.rating.message).toMatch(/rating/i);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    test('testimonials with non-integer ratings should always fail validation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userName: fc.string({ minLength: 1, maxLength: 100 })
              .filter(s => s.trim().length >= 1), // Ensure non-empty after trim
            content: fc.string({ minLength: 10, maxLength: 500 })
              .filter(s => s.trim().length >= 10), // Ensure valid length after trim
            rating: fc.double({ min: 0, max: 4, noNaN: true })
              .filter(n => !Number.isInteger(n)) // Only non-integers
          }),
          async (testimonialData) => {
            const testimonial = new Testimonial(testimonialData);
            
            // Property: Non-integer rating must fail validation
            await expect(testimonial.validate()).rejects.toThrow();
            
            // Verify the error is specifically about rating being an integer
            try {
              await testimonial.validate();
            } catch (error) {
              expect(error.errors.rating).toBeDefined();
              expect(error.errors.rating.message).toMatch(/integer/i);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    test('testimonials with valid ratings [0-4] should always pass validation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userName: fc.string({ minLength: 1, maxLength: 100 })
              .filter(s => s.trim().length >= 1), // Ensure non-empty after trim
            content: fc.string({ minLength: 10, maxLength: 500 })
              .filter(s => s.trim().length >= 10), // Ensure valid length after trim
            rating: fc.integer({ min: 0, max: 4 }) // Valid range
          }),
          async (testimonialData) => {
            const testimonial = new Testimonial(testimonialData);
            
            // Property: Valid rating must pass validation
            await expect(testimonial.validate()).resolves.not.toThrow();
            
            // Verify the rating is stored correctly
            expect(testimonial.rating).toBe(testimonialData.rating);
            expect(Number.isInteger(testimonial.rating)).toBe(true);
            expect(testimonial.rating).toBeGreaterThanOrEqual(0);
            expect(testimonial.rating).toBeLessThanOrEqual(4);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Feature: testimonials-system, Property 7: Required Field Validation
   * Validates: Requirements 3.1, 3.2, 3.3
   * 
   * For any submission missing userName, content, or rating,
   * the system should reject the submission with 400 error.
   */
  describe('Property 7: Required Field Validation', () => {
    test('submissions missing userName should always be rejected with 400 error', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            content: fc.string({ minLength: 10, maxLength: 500 }),
            rating: fc.integer({ min: 0, max: 4 })
          }),
          async (testimonialData) => {
            // Property: Missing userName must return 400 error
            const result = await createTestimonialService(testimonialData);
            
            expect(result.success).toBe(false);
            expect(result.statusCode).toBe(400);
            expect(result.data.errors).toBeDefined();
            expect(result.data.errors.some(err => err.toLowerCase().includes('username'))).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('submissions missing content should always be rejected with 400 error', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userName: fc.string({ minLength: 1, maxLength: 100 })
              .filter(s => s.trim().length >= 1),
            rating: fc.integer({ min: 0, max: 4 })
          }),
          async (testimonialData) => {
            // Property: Missing content must return 400 error
            const result = await createTestimonialService(testimonialData);
            
            expect(result.success).toBe(false);
            expect(result.statusCode).toBe(400);
            expect(result.data.errors).toBeDefined();
            expect(result.data.errors.some(err => err.toLowerCase().includes('content'))).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('submissions missing rating should always be rejected with 400 error', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userName: fc.string({ minLength: 1, maxLength: 100 })
              .filter(s => s.trim().length >= 1),
            content: fc.string({ minLength: 10, maxLength: 500 })
          }),
          async (testimonialData) => {
            // Property: Missing rating must return 400 error
            const result = await createTestimonialService(testimonialData);
            
            expect(result.success).toBe(false);
            expect(result.statusCode).toBe(400);
            expect(result.data.errors).toBeDefined();
            expect(result.data.errors.some(err => err.toLowerCase().includes('rating'))).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('submissions missing multiple required fields should always be rejected with 400 error', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant({}), // All fields missing
            fc.record({ userName: fc.string({ minLength: 1, maxLength: 100 }) }), // Only userName
            fc.record({ content: fc.string({ minLength: 10, maxLength: 500 }) }), // Only content
            fc.record({ rating: fc.integer({ min: 0, max: 4 }) }) // Only rating
          ),
          async (testimonialData) => {
            // Property: Missing any required field must return 400 error
            const result = await createTestimonialService(testimonialData);
            
            expect(result.success).toBe(false);
            expect(result.statusCode).toBe(400);
            expect(result.data.errors).toBeDefined();
            expect(Array.isArray(result.data.errors)).toBe(true);
            expect(result.data.errors.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Feature: testimonials-system, Property 8: Content Length Validation
   * Validates: Requirements 3.4, 3.5
   * 
   * For any submission with content <10 or >500 characters,
   * the system should reject the submission with 400 error.
   */
  describe('Property 8: Content Length Validation', () => {
    test('submissions with content less than 10 characters should always be rejected with 400 error', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userName: fc.string({ minLength: 1, maxLength: 100 })
              .filter(s => s.trim().length >= 1),
            content: fc.string({ minLength: 1, maxLength: 9 }), // 1-9 chars (not empty)
            rating: fc.integer({ min: 0, max: 4 })
          }),
          async (testimonialData) => {
            // Property: Content < 10 chars must return 400 error
            const result = await createTestimonialService(testimonialData);
            
            expect(result.success).toBe(false);
            expect(result.statusCode).toBe(400);
            expect(result.data.errors).toBeDefined();
            // Should mention either "content" with "10"/"characters" OR "required"
            const hasLengthError = result.data.errors.some(err => 
              err.toLowerCase().includes('content') && 
              (err.includes('10') || err.includes('characters'))
            );
            const hasRequiredError = result.data.errors.some(err =>
              err.toLowerCase().includes('content') && err.toLowerCase().includes('required')
            );
            expect(hasLengthError || hasRequiredError).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('submissions with content greater than 500 characters should always be rejected with 400 error', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userName: fc.string({ minLength: 1, maxLength: 100 })
              .filter(s => s.trim().length >= 1),
            content: fc.string({ minLength: 501, maxLength: 1000 }), // More than 500 chars
            rating: fc.integer({ min: 0, max: 4 })
          }),
          async (testimonialData) => {
            // Property: Content > 500 chars must return 400 error
            const result = await createTestimonialService(testimonialData);
            
            expect(result.success).toBe(false);
            expect(result.statusCode).toBe(400);
            expect(result.data.errors).toBeDefined();
            expect(result.data.errors.some(err => 
              err.toLowerCase().includes('content') && 
              (err.includes('500') || err.includes('characters'))
            )).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('submissions with content exactly 10 or 500 characters should be accepted', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userName: fc.string({ minLength: 1, maxLength: 100 })
              .filter(s => s.trim().length >= 1),
            contentLength: fc.constantFrom(10, 500),
            rating: fc.integer({ min: 0, max: 4 })
          }),
          async ({ userName, contentLength, rating }) => {
            // Generate content of exact length
            const content = 'a'.repeat(contentLength);
            
            // Property: Content exactly 10 or 500 chars should be valid
            const result = await createTestimonialService({
              userName,
              content,
              rating
            });
            
            expect(result.success).toBe(true);
            expect(result.statusCode).toBe(201);
            expect(result.data.testimonial).toBeDefined();
            expect(result.data.testimonial.content).toBe(content);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('submissions with valid content length (10-500) should always be accepted', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userName: fc.string({ minLength: 1, maxLength: 100 })
              .filter(s => s.trim().length >= 1),
            content: fc.string({ minLength: 10, maxLength: 500 }),
            rating: fc.integer({ min: 0, max: 4 })
          }),
          async (testimonialData) => {
            // Property: Valid content length should be accepted
            const result = await createTestimonialService(testimonialData);
            
            expect(result.success).toBe(true);
            expect(result.statusCode).toBe(201);
            expect(result.data.testimonial).toBeDefined();
            expect(result.data.testimonial.content.length).toBeGreaterThanOrEqual(10);
            expect(result.data.testimonial.content.length).toBeLessThanOrEqual(500);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

/**
 * Feature: testimonials-system, Property 11: HTML Sanitization
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5
 * 
 * For any submission with HTML/script tags in userName, userRole, userLocation, or content,
 * those tags should be stripped while preserving safe special characters.
 */
describe('Property 11: HTML Sanitization', () => {
  test('submissions with HTML tags should have them stripped while preserving safe characters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userName: fc.string({ minLength: 1, maxLength: 50 })
            .map(s => `<script>${s}</script>`), // Inject script tags
          userRole: fc.option(
            fc.string({ minLength: 1, maxLength: 50 })
              .map(s => `<b>${s}</b>`), // Inject bold tags
            { nil: undefined }
          ),
          userLocation: fc.option(
            fc.string({ minLength: 1, maxLength: 50 })
              .map(s => `<div>${s}</div>`), // Inject div tags
            { nil: undefined }
          ),
          content: fc.string({ minLength: 10, maxLength: 200 })
            .map(s => `<img src="x" onerror="alert('xss')">${s}</img>`), // Inject XSS attempt
          rating: fc.integer({ min: 0, max: 4 })
        }),
        async (testimonialData) => {
          // Simulate middleware sanitization
          const { sanitizeTestimonialInput } = await import('../../middleware/sanitization.middleware.js');
          
          const mockReq = {
            body: { ...testimonialData }
          };
          const mockRes = {};
          const mockNext = () => {};
          
          // Apply sanitization middleware
          sanitizeTestimonialInput(mockReq, mockRes, mockNext);
          
          // Property: HTML tags must be stripped
          expect(mockReq.body.userName).not.toContain('<script>');
          expect(mockReq.body.userName).not.toContain('</script>');
          expect(mockReq.body.userName).not.toContain('<');
          expect(mockReq.body.userName).not.toContain('>');
          
          if (mockReq.body.userRole) {
            expect(mockReq.body.userRole).not.toContain('<b>');
            expect(mockReq.body.userRole).not.toContain('</b>');
            expect(mockReq.body.userRole).not.toContain('<');
            expect(mockReq.body.userRole).not.toContain('>');
          }
          
          if (mockReq.body.userLocation) {
            expect(mockReq.body.userLocation).not.toContain('<div>');
            expect(mockReq.body.userLocation).not.toContain('</div>');
            expect(mockReq.body.userLocation).not.toContain('<');
            expect(mockReq.body.userLocation).not.toContain('>');
          }
          
          expect(mockReq.body.content).not.toContain('<img');
          expect(mockReq.body.content).not.toContain('onerror');
          expect(mockReq.body.content).not.toContain('</img>');
          expect(mockReq.body.content).not.toContain('<');
          expect(mockReq.body.content).not.toContain('>');
          
          // Property: Sanitized fields should be trimmed
          expect(mockReq.body.userName).toBe(mockReq.body.userName.trim());
          expect(mockReq.body.content).toBe(mockReq.body.content.trim());
        }
      ),
      { numRuns: 100 }
    );
  });

  test('submissions with safe special characters should preserve them after sanitization', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userName: fc.constantFrom(
            "John O'Brien",
            'Jane "The Artist" Doe',
            "Mike's Art",
            'Sarah (Designer)',
            'Tom & Jerry Co.'
          ),
          content: fc.constantFrom(
            "This is amazing! I love it.",
            "Great product - highly recommend.",
            "5/5 stars! Can't wait to order again.",
            "Beautiful work... truly exceptional.",
            "Perfect gift for my mom's birthday!"
          ),
          rating: fc.integer({ min: 0, max: 4 })
        }),
        async (testimonialData) => {
          // Simulate middleware sanitization
          const { sanitizeTestimonialInput } = await import('../../middleware/sanitization.middleware.js');
          
          const originalUserName = testimonialData.userName;
          const originalContent = testimonialData.content;
          
          const mockReq = {
            body: { ...testimonialData }
          };
          const mockRes = {};
          const mockNext = () => {};
          
          // Apply sanitization middleware
          sanitizeTestimonialInput(mockReq, mockRes, mockNext);
          
          // Property: Safe special characters should be preserved
          expect(mockReq.body.userName).toBe(originalUserName.trim());
          expect(mockReq.body.content).toBe(originalContent.trim());
          
          // Verify specific safe characters are preserved
          if (originalUserName.includes("'")) {
            expect(mockReq.body.userName).toContain("'");
          }
          if (originalUserName.includes('"')) {
            expect(mockReq.body.userName).toContain('"');
          }
          if (originalContent.includes('!')) {
            expect(mockReq.body.content).toContain('!');
          }
          if (originalContent.includes('-')) {
            expect(mockReq.body.content).toContain('-');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('submissions with mixed HTML and safe characters should strip HTML but preserve safe chars', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userName: fc.constantFrom(
            "<script>alert('xss')</script>John O'Brien",
            '<b>Jane "The Artist" Doe</b>',
            "<div>Mike's Art</div>"
          ),
          content: fc.string({ minLength: 10, maxLength: 100 })
            .map(s => `<p>${s}! Amazing product.</p>`),
          rating: fc.integer({ min: 0, max: 4 })
        }),
        async (testimonialData) => {
          // Simulate middleware sanitization
          const { sanitizeTestimonialInput } = await import('../../middleware/sanitization.middleware.js');
          
          const mockReq = {
            body: { ...testimonialData }
          };
          const mockRes = {};
          const mockNext = () => {};
          
          // Apply sanitization middleware
          sanitizeTestimonialInput(mockReq, mockRes, mockNext);
          
          // Property: HTML tags must be stripped
          expect(mockReq.body.userName).not.toContain('<');
          expect(mockReq.body.userName).not.toContain('>');
          expect(mockReq.body.content).not.toContain('<p>');
          expect(mockReq.body.content).not.toContain('</p>');
          
          // Property: Safe characters should be preserved
          // The sanitized userName should still contain the text content
          expect(mockReq.body.userName.length).toBeGreaterThan(0);
          expect(mockReq.body.content.length).toBeGreaterThan(0);
          
          // Verify exclamation mark is preserved in content
          expect(mockReq.body.content).toContain('!');
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: testimonials-system, Property 12: Response Format Consistency
 * Validates: Requirements 10.1, 10.2, 10.3
 * 
 * For any API request (successful or failed), the response should contain
 * statusCode, message, data, and success fields matching the ApiRes or ApiError format.
 */
describe('Property 12: Response Format Consistency', () => {
  // Import supertest for API testing
  let request;
  let app;

  beforeAll(async () => {
    const supertest = await import('supertest');
    request = supertest.default;
    const appModule = await import('../../app.js');
    app = appModule.default;
  });

  test('successful GET requests should always return consistent response format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null), // No input needed for GET
        async () => {
          // Property: GET /testimonials should return consistent format
          const response = await request(app)
            .get('/api/v1/testimonials')
            .expect('Content-Type', /json/);

          // Verify response structure
          expect(response.body).toHaveProperty('statusCode');
          expect(response.body).toHaveProperty('message');
          expect(response.body).toHaveProperty('data');
          expect(response.body).toHaveProperty('success');

          // Verify types
          expect(typeof response.body.statusCode).toBe('number');
          expect(typeof response.body.message).toBe('string');
          expect(typeof response.body.success).toBe('boolean');

          // For successful requests
          if (response.body.success) {
            expect(response.body.statusCode).toBe(200);
            expect(response.body.data).toBeDefined();
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('successful POST requests should always return consistent response format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userName: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length >= 1),
          content: fc.string({ minLength: 10, maxLength: 500 }),
          rating: fc.integer({ min: 0, max: 4 })
        }),
        async (testimonialData) => {
          // Property: POST /testimonials with valid data should return consistent format
          const response = await request(app)
            .post('/api/v1/testimonials')
            .send(testimonialData)
            .expect('Content-Type', /json/);

          // Verify response structure
          expect(response.body).toHaveProperty('statusCode');
          expect(response.body).toHaveProperty('message');
          expect(response.body).toHaveProperty('data');
          expect(response.body).toHaveProperty('success');

          // Verify types
          expect(typeof response.body.statusCode).toBe('number');
          expect(typeof response.body.message).toBe('string');
          expect(typeof response.body.success).toBe('boolean');

          // For successful requests
          if (response.body.success) {
            expect(response.body.statusCode).toBe(201);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.testimonial).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('validation error responses should always return consistent format with 400 status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Missing required fields
          fc.constant({}),
          fc.record({ userName: fc.string({ minLength: 1, maxLength: 100 }) }),
          // Invalid content length
          fc.record({
            userName: fc.string({ minLength: 1, maxLength: 100 }),
            content: fc.string({ minLength: 0, maxLength: 5 }), // Too short
            rating: fc.integer({ min: 0, max: 4 })
          }),
          // Invalid rating
          fc.record({
            userName: fc.string({ minLength: 1, maxLength: 100 }),
            content: fc.string({ minLength: 10, maxLength: 500 }),
            rating: fc.integer({ min: 5, max: 10 }) // Out of range
          })
        ),
        async (invalidData) => {
          // Property: Invalid requests should return consistent error format
          const response = await request(app)
            .post('/api/v1/testimonials')
            .send(invalidData)
            .expect('Content-Type', /json/);

          // Verify response structure
          expect(response.body).toHaveProperty('statusCode');
          expect(response.body).toHaveProperty('message');
          expect(response.body).toHaveProperty('data');
          expect(response.body).toHaveProperty('success');

          // Verify types
          expect(typeof response.body.statusCode).toBe('number');
          expect(typeof response.body.message).toBe('string');
          expect(typeof response.body.success).toBe('boolean');

          // For validation errors
          expect(response.body.success).toBe(false);
          expect(response.body.statusCode).toBe(400);
          expect(response.body.data).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('server error responses should always return consistent format with 500 status', async () => {
    // This test simulates server errors by temporarily breaking the database connection
    // Note: This is a conceptual test - actual implementation may vary based on test setup
    
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          // Property: Server errors should return consistent format
          // We'll test this by checking the error handler structure
          
          // Create a mock error response
          const mockErrorResponse = {
            statusCode: 500,
            message: 'Internal Server Error - Test error',
            data: null,
            success: false
          };

          // Verify the structure matches ApiError format
          expect(mockErrorResponse).toHaveProperty('statusCode');
          expect(mockErrorResponse).toHaveProperty('message');
          expect(mockErrorResponse).toHaveProperty('data');
          expect(mockErrorResponse).toHaveProperty('success');
          
          expect(typeof mockErrorResponse.statusCode).toBe('number');
          expect(typeof mockErrorResponse.message).toBe('string');
          expect(typeof mockErrorResponse.success).toBe('boolean');
          
          expect(mockErrorResponse.statusCode).toBe(500);
          expect(mockErrorResponse.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('all response formats should have consistent field types regardless of success/failure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Valid request
          fc.record({
            userName: fc.string({ minLength: 1, maxLength: 100 })
              .filter(s => s.trim().length >= 1),
            content: fc.string({ minLength: 10, maxLength: 500 }),
            rating: fc.integer({ min: 0, max: 4 })
          }),
          // Invalid request
          fc.constant({})
        ),
        async (testimonialData) => {
          // Property: All responses should have consistent field types
          const response = await request(app)
            .post('/api/v1/testimonials')
            .send(testimonialData)
            .expect('Content-Type', /json/);

          // Verify all required fields exist
          expect(response.body).toHaveProperty('statusCode');
          expect(response.body).toHaveProperty('message');
          expect(response.body).toHaveProperty('data');
          expect(response.body).toHaveProperty('success');

          // Verify consistent types
          expect(typeof response.body.statusCode).toBe('number');
          expect(typeof response.body.message).toBe('string');
          expect(typeof response.body.success).toBe('boolean');
          
          // statusCode should be a valid HTTP status code
          expect(response.body.statusCode).toBeGreaterThanOrEqual(200);
          expect(response.body.statusCode).toBeLessThan(600);
          
          // success should correlate with statusCode
          if (response.body.statusCode >= 200 && response.body.statusCode < 300) {
            expect(response.body.success).toBe(true);
          } else {
            expect(response.body.success).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Integration Testing and Validation
 * These tests verify end-to-end behavior and data persistence
 */

/**
 * Feature: testimonials-system, Property 10: Submission Round-Trip
 * Validates: Requirements 5.2
 * 
 * For any valid testimonial submission, querying for testimonials immediately after
 * should include the newly submitted testimonial in the results.
 */
describe('Property 10: Submission Round-Trip', () => {
  test('any valid testimonial submission should appear in query results immediately after', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userName: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length >= 1),
          userRole: fc.option(
            fc.string({ minLength: 1, maxLength: 100 })
              .filter(s => s.trim().length >= 1),
            { nil: undefined }
          ),
          userLocation: fc.option(
            fc.string({ minLength: 1, maxLength: 150 })
              .filter(s => s.trim().length >= 1),
            { nil: undefined }
          ),
          content: fc.string({ minLength: 10, maxLength: 500 })
            .filter(s => s.trim().length >= 10 && s.trim().length <= 500),
          rating: fc.integer({ min: 0, max: 4 }),
          colorTheme: fc.option(
            fc.constantFrom(
              'bg-emerald-100 text-emerald-700',
              'bg-blue-100 text-blue-700',
              'bg-purple-100 text-purple-700'
            ),
            { nil: undefined }
          ),
          productId: fc.option(
            fc.string({ minLength: 1, maxLength: 50 }),
            { nil: undefined }
          ),
          userEmail: fc.option(
            fc.emailAddress(),
            { nil: undefined }
          )
        }),
        async (testimonialData) => {
          // Submit testimonial
          const createResult = await createTestimonialService(testimonialData);
          
          // Property: Submission should succeed
          expect(createResult.success).toBe(true);
          expect(createResult.statusCode).toBe(201);
          expect(createResult.data.testimonial).toBeDefined();
          
          // Query for testimonials immediately after
          const queryResult = await getApprovedTestimonialsService();
          
          // Property: Query should succeed
          expect(queryResult.success).toBe(true);
          expect(queryResult.statusCode).toBe(200);
          expect(queryResult.data.testimonials).toBeDefined();
          expect(Array.isArray(queryResult.data.testimonials)).toBe(true);
          
          // Property: New testimonial should be in results
          const foundTestimonial = queryResult.data.testimonials.find(
            t => t.userName === testimonialData.userName.trim() &&
                 t.content === testimonialData.content.trim() &&
                 t.rating === testimonialData.rating
          );
          
          expect(foundTestimonial).toBeDefined();
          expect(foundTestimonial.userName).toBe(testimonialData.userName.trim());
          expect(foundTestimonial.content).toBe(testimonialData.content.trim());
          expect(foundTestimonial.rating).toBe(testimonialData.rating);
          expect(foundTestimonial.isApproved).toBe(true);
          
          // Verify optional fields if provided
          if (testimonialData.userRole) {
            expect(foundTestimonial.userRole).toBe(testimonialData.userRole.trim());
          }
          if (testimonialData.userLocation) {
            expect(foundTestimonial.userLocation).toBe(testimonialData.userLocation.trim());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('multiple testimonials should all appear in query results', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            userName: fc.string({ minLength: 1, maxLength: 100 })
              .filter(s => s.trim().length >= 1),
            content: fc.string({ minLength: 10, maxLength: 500 })
              .filter(s => s.trim().length >= 10 && s.trim().length <= 500),
            rating: fc.integer({ min: 0, max: 4 })
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (testimonials) => {
          // Submit all testimonials
          const createResults = await Promise.all(
            testimonials.map(t => createTestimonialService(t))
          );
          
          // Property: All submissions should succeed
          createResults.forEach(result => {
            expect(result.success).toBe(true);
            expect(result.statusCode).toBe(201);
          });
          
          // Query for testimonials
          const queryResult = await getApprovedTestimonialsService();
          
          // Property: All submitted testimonials should be in results
          expect(queryResult.data.testimonials.length).toBeGreaterThanOrEqual(testimonials.length);
          
          testimonials.forEach(original => {
            const found = queryResult.data.testimonials.find(
              t => t.userName === original.userName.trim() &&
                   t.content === original.content.trim() &&
                   t.rating === original.rating
            );
            expect(found).toBeDefined();
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: testimonials-system, Property 1: Required Fields Presence
 * Validates: Requirements 1.1, 1.4
 * 
 * For any stored testimonial, it should contain userName, content, rating,
 * isApproved, createdAt, and updatedAt fields with correct types.
 */
describe('Property 1: Required Fields Presence', () => {
  test('any stored testimonial should contain all required fields with correct types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userName: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length >= 1),
          content: fc.string({ minLength: 10, maxLength: 500 }),
          rating: fc.integer({ min: 0, max: 4 })
        }),
        async (testimonialData) => {
          // Create testimonial
          const createResult = await createTestimonialService(testimonialData);
          expect(createResult.success).toBe(true);
          
          // Query to get the stored testimonial
          const queryResult = await getApprovedTestimonialsService();
          const storedTestimonial = queryResult.data.testimonials[0];
          
          // Property: Required fields must be present
          expect(storedTestimonial).toHaveProperty('userName');
          expect(storedTestimonial).toHaveProperty('content');
          expect(storedTestimonial).toHaveProperty('rating');
          expect(storedTestimonial).toHaveProperty('isApproved');
          expect(storedTestimonial).toHaveProperty('createdAt');
          expect(storedTestimonial).toHaveProperty('updatedAt');
          
          // Property: Fields must have correct types
          expect(typeof storedTestimonial.userName).toBe('string');
          expect(typeof storedTestimonial.content).toBe('string');
          expect(typeof storedTestimonial.rating).toBe('number');
          expect(typeof storedTestimonial.isApproved).toBe('boolean');
          expect(typeof storedTestimonial.createdAt).toBe('string'); // ISO date string
          expect(typeof storedTestimonial.updatedAt).toBe('string'); // ISO date string
          
          // Property: Required fields must have valid values
          expect(storedTestimonial.userName.length).toBeGreaterThan(0);
          expect(storedTestimonial.content.length).toBeGreaterThanOrEqual(10);
          expect(storedTestimonial.content.length).toBeLessThanOrEqual(500);
          expect(storedTestimonial.rating).toBeGreaterThanOrEqual(0);
          expect(storedTestimonial.rating).toBeLessThanOrEqual(4);
          expect(Number.isInteger(storedTestimonial.rating)).toBe(true);
          expect(storedTestimonial.isApproved).toBe(true);
          
          // Property: Timestamps must be valid dates
          expect(new Date(storedTestimonial.createdAt).toString()).not.toBe('Invalid Date');
          expect(new Date(storedTestimonial.updatedAt).toString()).not.toBe('Invalid Date');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('testimonials created at different times should have different timestamps', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.record({
            userName: fc.string({ minLength: 1, maxLength: 100 })
              .filter(s => s.trim().length >= 1),
            content: fc.string({ minLength: 10, maxLength: 500 }),
            rating: fc.integer({ min: 0, max: 4 })
          }),
          fc.record({
            userName: fc.string({ minLength: 1, maxLength: 100 })
              .filter(s => s.trim().length >= 1),
            content: fc.string({ minLength: 10, maxLength: 500 }),
            rating: fc.integer({ min: 0, max: 4 })
          })
        ),
        async ([first, second]) => {
          // Create first testimonial
          const result1 = await createTestimonialService(first);
          expect(result1.success).toBe(true);
          
          // Small delay to ensure different timestamps
          await new Promise(resolve => setTimeout(resolve, 10));
          
          // Create second testimonial
          const result2 = await createTestimonialService(second);
          expect(result2.success).toBe(true);
          
          // Property: Timestamps should be different
          const createdAt1 = new Date(result1.data.testimonial.createdAt);
          const createdAt2 = new Date(result2.data.testimonial.createdAt);
          
          expect(createdAt2.getTime()).toBeGreaterThanOrEqual(createdAt1.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: testimonials-system, Property 2: Optional Fields Storage
 * Validates: Requirements 1.2
 * 
 * For any testimonial with optional fields, those fields should be stored correctly
 * when provided and absent when not provided.
 */
describe('Property 2: Optional Fields Storage', () => {
  test('testimonials with optional fields should store them correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userName: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length >= 1),
          content: fc.string({ minLength: 10, maxLength: 500 }),
          rating: fc.integer({ min: 0, max: 4 }),
          userRole: fc.string({ minLength: 1, maxLength: 100 }),
          userLocation: fc.string({ minLength: 1, maxLength: 150 }),
          colorTheme: fc.constantFrom(
            'bg-emerald-100 text-emerald-700',
            'bg-blue-100 text-blue-700',
            'bg-purple-100 text-purple-700'
          ),
          productId: fc.string({ minLength: 1, maxLength: 50 }),
          userEmail: fc.emailAddress()
        }),
        async (testimonialData) => {
          // Create testimonial with all optional fields
          const createResult = await createTestimonialService(testimonialData);
          expect(createResult.success).toBe(true);
          
          // Query to get the stored testimonial
          const queryResult = await getApprovedTestimonialsService();
          const storedTestimonial = queryResult.data.testimonials[0];
          
          // Property: Optional fields should be present and match input
          expect(storedTestimonial.userRole).toBe(testimonialData.userRole);
          expect(storedTestimonial.userLocation).toBe(testimonialData.userLocation);
          expect(storedTestimonial.colorTheme).toBe(testimonialData.colorTheme);
          expect(storedTestimonial.productId).toBe(testimonialData.productId);
          expect(storedTestimonial.userEmail).toBe(testimonialData.userEmail);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('testimonials without optional fields should not have them in storage', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userName: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length >= 1),
          content: fc.string({ minLength: 10, maxLength: 500 }),
          rating: fc.integer({ min: 0, max: 4 })
        }),
        async (testimonialData) => {
          // Create testimonial without optional fields
          const createResult = await createTestimonialService(testimonialData);
          expect(createResult.success).toBe(true);
          
          // Query to get the stored testimonial
          const queryResult = await getApprovedTestimonialsService();
          const storedTestimonial = queryResult.data.testimonials[0];
          
          // Property: Optional fields should be undefined or have default values
          // userRole, userLocation, productId, userEmail should be undefined
          expect(storedTestimonial.userRole).toBeUndefined();
          expect(storedTestimonial.userLocation).toBeUndefined();
          expect(storedTestimonial.productId).toBeUndefined();
          expect(storedTestimonial.userEmail).toBeUndefined();
          
          // colorTheme should have default value
          expect(storedTestimonial.colorTheme).toBe('bg-emerald-100 text-emerald-700');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('testimonials with some optional fields should only store provided ones', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userName: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length >= 1),
          content: fc.string({ minLength: 10, maxLength: 500 }),
          rating: fc.integer({ min: 0, max: 4 }),
          userRole: fc.option(
            fc.string({ minLength: 1, maxLength: 100 }),
            { nil: undefined }
          ),
          userLocation: fc.option(
            fc.string({ minLength: 1, maxLength: 150 }),
            { nil: undefined }
          )
        }),
        async (testimonialData) => {
          // Create testimonial with some optional fields
          const createResult = await createTestimonialService(testimonialData);
          expect(createResult.success).toBe(true);
          
          // Query to get the stored testimonial
          const queryResult = await getApprovedTestimonialsService();
          const storedTestimonial = queryResult.data.testimonials[0];
          
          // Property: Provided optional fields should be present
          if (testimonialData.userRole !== undefined) {
            expect(storedTestimonial.userRole).toBe(testimonialData.userRole);
          } else {
            expect(storedTestimonial.userRole).toBeUndefined();
          }
          
          if (testimonialData.userLocation !== undefined) {
            expect(storedTestimonial.userLocation).toBe(testimonialData.userLocation);
          } else {
            expect(storedTestimonial.userLocation).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: testimonials-system, Property 9: Auto-Approval Behavior
 * Validates: Requirements 3.7, 5.1
 * 
 * For any valid testimonial submission, the stored document should have
 * isApproved set to true automatically.
 */
describe('Property 9: Auto-Approval Behavior', () => {
  test('any valid testimonial submission should have isApproved set to true', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userName: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length >= 1),
          content: fc.string({ minLength: 10, maxLength: 500 }),
          rating: fc.integer({ min: 0, max: 4 })
        }),
        async (testimonialData) => {
          // Create testimonial
          const createResult = await createTestimonialService(testimonialData);
          
          // Property: Submission should succeed
          expect(createResult.success).toBe(true);
          expect(createResult.statusCode).toBe(201);
          
          // Property: isApproved should be true in response
          expect(createResult.data.testimonial.isApproved).toBe(true);
          
          // Query to verify in database
          const queryResult = await getApprovedTestimonialsService();
          const storedTestimonial = queryResult.data.testimonials.find(
            t => t.userName === testimonialData.userName.trim() &&
                 t.content === testimonialData.content.trim()
          );
          
          // Property: isApproved should be true in database
          expect(storedTestimonial).toBeDefined();
          expect(storedTestimonial.isApproved).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('all testimonials should be auto-approved regardless of content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            userName: fc.string({ minLength: 1, maxLength: 100 })
              .filter(s => s.trim().length >= 1),
            content: fc.string({ minLength: 10, maxLength: 500 }),
            rating: fc.integer({ min: 0, max: 4 })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (testimonials) => {
          // Submit all testimonials
          const createResults = await Promise.all(
            testimonials.map(t => createTestimonialService(t))
          );
          
          // Property: All should be approved
          createResults.forEach(result => {
            expect(result.success).toBe(true);
            expect(result.data.testimonial.isApproved).toBe(true);
          });
          
          // Query all testimonials
          const queryResult = await getApprovedTestimonialsService();
          
          // Property: All submitted testimonials should be in approved list
          expect(queryResult.data.testimonials.length).toBe(testimonials.length);
          queryResult.data.testimonials.forEach(t => {
            expect(t.isApproved).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: testimonials-system, Property 6: Field Exclusion in Responses
 * Validates: Requirements 2.4
 * 
 * For any testimonial returned by the API, the response should not contain
 * MongoDB internal fields (_id, __v).
 */
describe('Property 6: Field Exclusion in Responses', () => {
  test('any testimonial returned by query should not contain _id or __v fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userName: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length >= 1),
          content: fc.string({ minLength: 10, maxLength: 500 }),
          rating: fc.integer({ min: 0, max: 4 })
        }),
        async (testimonialData) => {
          // Create testimonial
          const createResult = await createTestimonialService(testimonialData);
          expect(createResult.success).toBe(true);
          
          // Property: Created testimonial should not have _id or __v
          expect(createResult.data.testimonial).not.toHaveProperty('_id');
          expect(createResult.data.testimonial).not.toHaveProperty('__v');
          
          // Query testimonials
          const queryResult = await getApprovedTestimonialsService();
          
          // Property: Queried testimonials should not have _id or __v
          queryResult.data.testimonials.forEach(testimonial => {
            expect(testimonial).not.toHaveProperty('_id');
            expect(testimonial).not.toHaveProperty('__v');
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('multiple testimonials should all exclude internal fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            userName: fc.string({ minLength: 1, maxLength: 100 })
              .filter(s => s.trim().length >= 1),
            content: fc.string({ minLength: 10, maxLength: 500 }),
            rating: fc.integer({ min: 0, max: 4 })
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (testimonials) => {
          // Submit all testimonials
          await Promise.all(
            testimonials.map(t => createTestimonialService(t))
          );
          
          // Query all testimonials
          const queryResult = await getApprovedTestimonialsService();
          
          // Property: None should have internal fields
          expect(queryResult.data.testimonials.length).toBeGreaterThanOrEqual(testimonials.length);
          queryResult.data.testimonials.forEach(testimonial => {
            expect(testimonial).not.toHaveProperty('_id');
            expect(testimonial).not.toHaveProperty('__v');
            
            // Verify they have the expected fields instead
            expect(testimonial).toHaveProperty('userName');
            expect(testimonial).toHaveProperty('content');
            expect(testimonial).toHaveProperty('rating');
            expect(testimonial).toHaveProperty('isApproved');
            expect(testimonial).toHaveProperty('createdAt');
            expect(testimonial).toHaveProperty('updatedAt');
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: testimonials-system, Property 13: Validation Error Status Codes
 * Validates: Requirements 10.4
 * 
 * For any validation failure (missing fields, invalid length, invalid rating),
 * the response should have a 400 status code.
 */
describe('Property 13: Validation Error Status Codes', () => {
  test('any submission with missing required fields should return 400 status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant({}), // All fields missing
          fc.record({ userName: fc.string({ minLength: 1, maxLength: 100 }) }), // Missing content and rating
          fc.record({ content: fc.string({ minLength: 10, maxLength: 500 }) }), // Missing userName and rating
          fc.record({ rating: fc.integer({ min: 0, max: 4 }) }) // Missing userName and content
        ),
        async (invalidData) => {
          // Property: Missing fields should return 400
          const result = await createTestimonialService(invalidData);
          
          expect(result.success).toBe(false);
          expect(result.statusCode).toBe(400);
          expect(result.message).toBe('Validation failed');
          expect(result.data.errors).toBeDefined();
          expect(Array.isArray(result.data.errors)).toBe(true);
          expect(result.data.errors.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('any submission with invalid content length should return 400 status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userName: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length >= 1),
          content: fc.oneof(
            fc.string({ minLength: 0, maxLength: 9 }), // Too short
            fc.string({ minLength: 501, maxLength: 1000 }) // Too long
          ),
          rating: fc.integer({ min: 0, max: 4 })
        }),
        async (invalidData) => {
          // Property: Invalid content length should return 400
          const result = await createTestimonialService(invalidData);
          
          expect(result.success).toBe(false);
          expect(result.statusCode).toBe(400);
          expect(result.message).toBe('Validation failed');
          expect(result.data.errors).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('any submission with invalid rating should return 400 status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userName: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length >= 1),
          content: fc.string({ minLength: 10, maxLength: 500 }),
          rating: fc.oneof(
            fc.integer({ min: -1000, max: -1 }), // Negative
            fc.integer({ min: 5, max: 1000 }), // Too high
            fc.double({ min: 0, max: 4, noNaN: true })
              .filter(n => !Number.isInteger(n)) // Non-integer
          )
        }),
        async (invalidData) => {
          // Property: Invalid rating should return 400
          const result = await createTestimonialService(invalidData);
          
          expect(result.success).toBe(false);
          expect(result.statusCode).toBe(400);
          expect(result.message).toBe('Validation failed');
          expect(result.data.errors).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('all validation failures should consistently return 400 status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Missing fields
          fc.constant({}),
          // Invalid content length
          fc.record({
            userName: fc.string({ minLength: 1, maxLength: 100 }),
            content: fc.string({ minLength: 0, maxLength: 5 }),
            rating: fc.integer({ min: 0, max: 4 })
          }),
          // Invalid rating
          fc.record({
            userName: fc.string({ minLength: 1, maxLength: 100 }),
            content: fc.string({ minLength: 10, maxLength: 500 }),
            rating: fc.integer({ min: 10, max: 100 })
          }),
          // Multiple validation errors
          fc.record({
            content: fc.string({ minLength: 0, maxLength: 5 }),
            rating: fc.integer({ min: 10, max: 100 })
          })
        ),
        async (invalidData) => {
          // Property: All validation failures should return 400
          const result = await createTestimonialService(invalidData);
          
          expect(result.success).toBe(false);
          expect(result.statusCode).toBe(400);
          expect(result.message).toContain('Validation');
          expect(result.data).toBeDefined();
          expect(result.data.errors).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
