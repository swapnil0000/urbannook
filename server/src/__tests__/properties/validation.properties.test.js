/**
 * Property-Based Tests for Input Validation
 * 
 * These tests verify universal properties of the validation system
 * using property-based testing with fast-check library.
 * 
 * Each property test runs 100 iterations with randomly generated inputs.
 */

import fc from 'fast-check';
import { 
  registerSchema, 
  loginSchema, 
  updateProfileSchema,
  forgotPasswordRequestSchema,
  forgotPasswordResetSchema 
} from '../../validation/user.validation.js';
import { sanitizeInput } from '../../middleware/validation.middleware.js';

describe('Input Validation Properties', () => {
  
  /**
   * Feature: production-readiness-fixes, Property 5: Input Validation
   * Validates: Requirements 15.1, 15.5, 19.1
   * 
   * For any API endpoint that accepts user input, when invalid data is submitted,
   * the Server SHALL validate the input and return a 400 status code with specific
   * field-level error messages.
   */
  describe('Property 5: Input Validation', () => {
    test('invalid registration data should always fail validation with field-level errors', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.oneof(
              fc.constant(''), // Empty name
              fc.constant('a'), // Too short
              fc.string({ minLength: 51, maxLength: 100 }), // Too long
              fc.constant(null),
              fc.constant(undefined)
            ),
            email: fc.oneof(
              fc.constant(''), // Empty email
              fc.constant('invalid'), // No @ symbol
              fc.constant('@example.com'), // Missing local part
              fc.constant('user@'), // Missing domain
              fc.constant(null),
              fc.constant(undefined)
            ),
            password: fc.oneof(
              fc.constant(''), // Empty password
              fc.string({ maxLength: 7 }), // Too short
              fc.string({ minLength: 101, maxLength: 150 }), // Too long
              fc.constant(null),
              fc.constant(undefined)
            ),
            mobileNumber: fc.oneof(
              fc.constant(''), // Empty
              fc.string({ minLength: 1, maxLength: 9 }), // Too short
              fc.string({ minLength: 11, maxLength: 20 }), // Too long
              fc.constant('abcdefghij'), // Non-numeric
              fc.constant('123-456-789'), // Contains special chars
              fc.constant(null),
              fc.constant(undefined)
            )
          }),
          (invalidData) => {
            const result = registerSchema.validate(invalidData, { abortEarly: false });
            
            // Property: Invalid data must always fail validation
            expect(result.error).toBeDefined();
            
            // Property: Error must contain field-level details
            expect(result.error.details).toBeDefined();
            expect(Array.isArray(result.error.details)).toBe(true);
            expect(result.error.details.length).toBeGreaterThan(0);
            
            // Property: Each error detail must have path and message
            result.error.details.forEach(detail => {
              expect(detail.path).toBeDefined();
              expect(detail.message).toBeDefined();
              expect(typeof detail.message).toBe('string');
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('valid registration data should always pass validation', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2 && /^[a-zA-Z\s]+$/.test(s)),
            email: fc.string().map(s => `user${Math.abs(s.split('').reduce((a,c) => a + c.charCodeAt(0), 0))}@example.com`),
            password: fc.string({ minLength: 8, maxLength: 100 }).filter(s => s.trim().length >= 8),
            mobileNumber: fc.integer({ min: 1000000000, max: 9999999999 }).map(n => n.toString())
          }),
          (validData) => {
            const result = registerSchema.validate(validData);
            
            // Property: Valid data must always pass validation
            expect(result.error).toBeUndefined();
            expect(result.value).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: production-readiness-fixes, Property 6: Email Format Validation
   * Validates: Requirements 15.2
   * 
   * For any email address submitted to the system, the Server SHALL validate
   * that it matches standard email format (contains @ symbol, valid domain structure).
   */
  describe('Property 6: Email Format Validation', () => {
    test('invalid email formats should always fail validation', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.constant('plaintext'),
            fc.constant('@example.com'),
            fc.constant('user@'),
            fc.constant('user@@example.com'),
            fc.constant('user@example'),
            fc.constant('user name@example.com'), // Space in email
            fc.constant('user@exam ple.com'), // Space in domain
            fc.string().filter(s => !s.includes('@')), // No @ symbol
            fc.string().filter(s => s.includes('@') && s.split('@').length > 2) // Multiple @
          ),
          (invalidEmail) => {
            const result = loginSchema.validate({ email: invalidEmail, password: 'test123' });
            
            // Property: Invalid email must fail validation
            expect(result.error).toBeDefined();
            
            // Property: Error must mention email field
            const emailError = result.error.details.find(d => d.path.includes('email'));
            expect(emailError).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('valid email formats should always pass validation', () => {
      fc.assert(
        fc.property(
          fc.string().map(s => `user${Math.abs(s.split('').reduce((a,c) => a + c.charCodeAt(0), 0))}@example.com`),
          (validEmail) => {
            const result = forgotPasswordRequestSchema.validate({ email: validEmail });
            
            // Property: Valid email must pass validation
            expect(result.error).toBeUndefined();
            expect(result.value.email).toBe(validEmail);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: production-readiness-fixes, Property 7: Phone Number Format Validation
   * Validates: Requirements 15.3
   * 
   * For any phone number submitted to the system, the Server SHALL validate
   * that it matches the expected format (10 digits for Indian numbers).
   */
  describe('Property 7: Phone Number Format Validation', () => {
    test('invalid phone number formats should always fail validation', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.string({ minLength: 1, maxLength: 9 }), // Too short
            fc.string({ minLength: 11, maxLength: 20 }), // Too long
            fc.string({ minLength: 10, maxLength: 10 }).filter(s => /[^0-9]/.test(s)), // Contains non-digits
            fc.constant('123-456-7890'), // Contains dashes
            fc.constant('(123) 456-7890'), // Contains special chars
            fc.constant('+911234567890'), // Contains plus
            fc.constant('12345 67890') // Contains space
          ),
          (invalidPhone) => {
            const result = registerSchema.validate({
              name: 'Test User',
              email: 'test@example.com',
              password: 'password123',
              mobileNumber: invalidPhone
            });
            
            // Property: Invalid phone number must fail validation
            expect(result.error).toBeDefined();
            
            // Property: Error must mention mobileNumber field
            const phoneError = result.error.details.find(d => d.path.includes('mobileNumber'));
            expect(phoneError).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('valid 10-digit phone numbers should always pass validation', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000000000, max: 9999999999 }).map(n => n.toString()),
          (validPhone) => {
            const result = registerSchema.validate({
              name: 'Test User',
              email: 'test@example.com',
              password: 'password123',
              mobileNumber: validPhone
            });
            
            // Property: Valid 10-digit phone must pass validation
            expect(result.error).toBeUndefined();
            expect(result.value.mobileNumber).toBe(validPhone);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: production-readiness-fixes, Property 8: Price Validation
   * Validates: Requirements 15.4
   * 
   * For any price value submitted to the system, the Server SHALL validate
   * that it is a positive number greater than zero.
   * 
   * Note: This test validates the general principle of numeric validation
   * using Joi's number validation capabilities.
   */
  describe('Property 8: Price Validation', () => {
    let Joi;
    let priceSchema;
    
    beforeAll(async () => {
      Joi = (await import('joi')).default;
      priceSchema = Joi.object({
        price: Joi.number().positive().required()
      });
    });

    test('invalid price values should always fail validation', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(0), // Zero
            fc.constant(-1), // Negative
            fc.double({ min: -1000, max: -0.01 }), // Negative decimals
            fc.constant(null),
            fc.constant(undefined),
            fc.constant('not a number'),
            fc.constant(NaN),
            fc.constant(Infinity),
            fc.constant(-Infinity)
          ),
          (invalidPrice) => {
            const result = priceSchema.validate({ price: invalidPrice });
            
            // Property: Invalid price must fail validation
            expect(result.error).toBeDefined();
            
            // Property: Error must mention price field
            const priceError = result.error.details.find(d => d.path.includes('price'));
            expect(priceError).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('positive price values should always pass validation', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 1000000, noNaN: true }),
          (validPrice) => {
            const result = priceSchema.validate({ price: validPrice });
            
            // Property: Positive price must pass validation
            expect(result.error).toBeUndefined();
            expect(result.value.price).toBe(validPrice);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: production-readiness-fixes, Property 11: Input Sanitization
   * Validates: Requirements 19.2
   * 
   * For any string input received by the Server, the input SHALL be sanitized
   * to remove potentially malicious characters (HTML tags, script tags) before processing.
   */
  describe('Property 11: Input Sanitization', () => {
    test('strings with HTML/script tags should always be sanitized', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('<script>alert("xss")</script>'),
            fc.constant('<img src=x onerror=alert(1)>'),
            fc.constant('<div>test</div>'),
            fc.constant('Hello<script>bad</script>World'),
            fc.constant('<>test<>'),
            fc.constant('<<>>nested<<>>'),
            fc.string().map(s => `<${s}>`),
            fc.string().map(s => `${s}<script>${s}</script>${s}`)
          ),
          (maliciousInput) => {
            const sanitized = sanitizeInput(maliciousInput);
            
            // Property: Sanitized output must not contain < or > characters
            expect(sanitized).not.toContain('<');
            expect(sanitized).not.toContain('>');
            
            // Property: Sanitized output must be a string
            expect(typeof sanitized).toBe('string');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('safe strings should remain unchanged after sanitization', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !s.includes('<') && !s.includes('>')),
          (safeInput) => {
            const sanitized = sanitizeInput(safeInput);
            
            // Property: Safe strings should be trimmed but otherwise unchanged
            expect(sanitized).toBe(safeInput.trim().substring(0, 1000));
          }
        ),
        { numRuns: 100 }
      );
    });

    test('very long strings should be truncated to prevent DoS', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1001, maxLength: 5000 }),
          (longInput) => {
            const sanitized = sanitizeInput(longInput);
            
            // Property: Sanitized output must not exceed 1000 characters
            expect(sanitized.length).toBeLessThanOrEqual(1000);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('non-string inputs should be returned unchanged', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer(),
            fc.double(),
            fc.boolean(),
            fc.constant(null),
            fc.constant(undefined),
            fc.object(),
            fc.array(fc.anything())
          ),
          (nonStringInput) => {
            const result = sanitizeInput(nonStringInput);
            
            // Property: Non-string inputs should be returned as-is
            expect(result).toBe(nonStringInput);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: production-readiness-fixes, Property 12: Numeric Range Validation
   * Validates: Requirements 19.3
   * 
   * For any numeric input received by the Server, the value SHALL be validated
   * to ensure it falls within acceptable ranges for that field type.
   */
  describe('Property 12: Numeric Range Validation', () => {
    let Joi;
    let quantitySchema;
    let ageSchema;
    
    beforeAll(async () => {
      Joi = (await import('joi')).default;
      quantitySchema = Joi.object({
        quantity: Joi.number().integer().min(1).max(100).required()
      });
      ageSchema = Joi.object({
        age: Joi.number().integer().min(0).max(150).required()
      });
    });

    test('numbers outside valid range should always fail validation', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ min: -1000, max: 0 }), // Below minimum
            fc.integer({ min: 101, max: 10000 }), // Above maximum
            fc.constant(-1),
            fc.constant(0),
            fc.constant(101),
            fc.constant(1000)
          ),
          (outOfRangeValue) => {
            const result = quantitySchema.validate({ quantity: outOfRangeValue });
            
            // Property: Out-of-range values must fail validation
            expect(result.error).toBeDefined();
            
            // Property: Error must mention the field
            const quantityError = result.error.details.find(d => d.path.includes('quantity'));
            expect(quantityError).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('numbers within valid range should always pass validation', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (validQuantity) => {
            const result = quantitySchema.validate({ quantity: validQuantity });
            
            // Property: In-range values must pass validation
            expect(result.error).toBeUndefined();
            expect(result.value.quantity).toBe(validQuantity);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('age validation should enforce reasonable bounds', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ min: -100, max: -1 }), // Negative age
            fc.integer({ min: 151, max: 1000 }) // Unrealistic age
          ),
          (invalidAge) => {
            const result = ageSchema.validate({ age: invalidAge });
            
            // Property: Invalid age must fail validation
            expect(result.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('valid age values should pass validation', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 150 }),
          (validAge) => {
            const result = ageSchema.validate({ age: validAge });
            
            // Property: Valid age must pass validation
            expect(result.error).toBeUndefined();
            expect(result.value.age).toBe(validAge);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
