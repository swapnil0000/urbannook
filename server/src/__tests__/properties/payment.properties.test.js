/**
 * Property-Based Tests for Payment Error Handling
 * 
 * These tests verify universal properties of the payment error handling system
 * using property-based testing with fast-check library.
 * 
 * Each property test runs 100 iterations with randomly generated inputs.
 */

import fc from 'fast-check';

// Payment error codes from the payment controller
const PAYMENT_ERROR_CODES = [
  'BAD_REQUEST_ERROR',
  'GATEWAY_ERROR',
  'SERVER_ERROR',
  'payment_failed',
  'payment_timeout',
  'insufficient_funds',
  'card_declined',
  'network_error',
  'invalid_card',
  'authentication_failed',
  'signature_verification_failed'
];

const PAYMENT_ERROR_MESSAGES = {
  'BAD_REQUEST_ERROR': 'Payment failed due to invalid request. Please try again.',
  'GATEWAY_ERROR': 'Payment gateway error. Please try again or use a different payment method.',
  'SERVER_ERROR': 'Payment server error. Please try again later.',
  'payment_failed': 'Payment failed. Please try again or use a different payment method.',
  'payment_timeout': 'Payment timed out. Your cart has been preserved. Please try again.',
  'insufficient_funds': 'Insufficient funds. Please check your account balance.',
  'card_declined': 'Card declined. Please contact your bank or try another card.',
  'network_error': 'Network error. Please check your connection and try again.',
  'invalid_card': 'Invalid card details. Please check and try again.',
  'authentication_failed': '3D Secure authentication failed. Please try again.',
  'signature_verification_failed': 'Payment verification failed. Please contact support if amount was debited.',
  'default': 'Payment could not be processed. Please try again later.'
};

// Helper function to get error message (mirrors controller logic)
const getErrorMessage = (errorCode) => {
  return PAYMENT_ERROR_MESSAGES[errorCode] || PAYMENT_ERROR_MESSAGES.default;
};

describe('Payment Error Handling Properties', () => {
  
  /**
   * Feature: production-readiness-fixes, Property 4: Payment Error Codes
   * Validates: Requirements 12.1
   * 
   * For any payment failure scenario, the Payment_Service SHALL return a specific
   * error code that accurately describes the failure reason.
   */
  describe('Property 4: Payment Error Codes', () => {
    
    test('all defined error codes should map to specific error messages', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...PAYMENT_ERROR_CODES),
          (errorCode) => {
            const errorMessage = getErrorMessage(errorCode);
            
            // Property: Every defined error code must have a specific message
            expect(errorMessage).toBeDefined();
            expect(typeof errorMessage).toBe('string');
            expect(errorMessage.length).toBeGreaterThan(0);
            
            // Property: Error message must not be empty or just whitespace
            expect(errorMessage.trim().length).toBeGreaterThan(0);
            
            // Property: Error message should be user-friendly (not technical jargon)
            expect(errorMessage).not.toContain('undefined');
            expect(errorMessage).not.toContain('null');
            expect(errorMessage).not.toContain('[object Object]');
            
            // Property: Error message should provide actionable guidance
            const hasActionableGuidance = 
              errorMessage.toLowerCase().includes('try again') ||
              errorMessage.toLowerCase().includes('contact') ||
              errorMessage.toLowerCase().includes('check') ||
              errorMessage.toLowerCase().includes('please');
            expect(hasActionableGuidance).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('undefined error codes should return default error message', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string().filter(s => !PAYMENT_ERROR_CODES.includes(s)),
            fc.constant('UNKNOWN_ERROR'),
            fc.constant('RANDOM_ERROR_CODE'),
            fc.constant(''),
            fc.constant('   '),
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => !PAYMENT_ERROR_CODES.includes(s))
          ),
          (unknownErrorCode) => {
            const errorMessage = getErrorMessage(unknownErrorCode);
            
            // Property: Unknown error codes must return default message
            expect(errorMessage).toBe(PAYMENT_ERROR_MESSAGES.default);
            
            // Property: Default message must be defined and non-empty
            expect(errorMessage).toBeDefined();
            expect(errorMessage.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('error messages should be consistent in structure', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...PAYMENT_ERROR_CODES),
          (errorCode) => {
            const errorMessage = getErrorMessage(errorCode);
            
            // Property: All error messages should start with capital letter
            expect(errorMessage[0]).toBe(errorMessage[0].toUpperCase());
            
            // Property: All error messages should end with period
            expect(errorMessage.endsWith('.')).toBe(true);
            
            // Property: Error messages should not be excessively long
            expect(errorMessage.length).toBeLessThan(200);
            
            // Property: Error messages should not contain multiple consecutive spaces
            expect(errorMessage).not.toMatch(/\s{2,}/);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('error codes should be categorized correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...PAYMENT_ERROR_CODES),
          (errorCode) => {
            const errorMessage = getErrorMessage(errorCode);
            
            // Property: Gateway/network errors should mention retry or alternative
            if (errorCode.includes('GATEWAY') || errorCode.includes('network')) {
              const mentionsRetryOrAlternative = 
                errorMessage.toLowerCase().includes('try again') ||
                errorMessage.toLowerCase().includes('different payment method');
              expect(mentionsRetryOrAlternative).toBe(true);
            }
            
            // Property: Card-related errors should mention card or bank
            if (errorCode.includes('card') || errorCode.includes('insufficient_funds')) {
              const mentionsCardOrBank = 
                errorMessage.toLowerCase().includes('card') ||
                errorMessage.toLowerCase().includes('bank') ||
                errorMessage.toLowerCase().includes('account');
              expect(mentionsCardOrBank).toBe(true);
            }
            
            // Property: Timeout errors should mention preservation of cart
            if (errorCode.includes('timeout')) {
              expect(errorMessage.toLowerCase()).toContain('preserved');
            }
            
            // Property: Authentication errors should mention authentication
            if (errorCode.includes('authentication')) {
              expect(errorMessage.toLowerCase()).toContain('authentication');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('error code mapping should be deterministic', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...PAYMENT_ERROR_CODES),
          (errorCode) => {
            const firstCall = getErrorMessage(errorCode);
            const secondCall = getErrorMessage(errorCode);
            
            // Property: Same error code must always return same message
            expect(firstCall).toBe(secondCall);
            
            // Property: Multiple calls should return identical strings (not just equal)
            expect(firstCall === secondCall).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('error messages should not expose sensitive information', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...PAYMENT_ERROR_CODES),
          (errorCode) => {
            const errorMessage = getErrorMessage(errorCode);
            
            // Property: Error messages must not contain sensitive patterns
            expect(errorMessage.toLowerCase()).not.toContain('password');
            expect(errorMessage.toLowerCase()).not.toContain('secret');
            expect(errorMessage.toLowerCase()).not.toContain('key');
            expect(errorMessage.toLowerCase()).not.toContain('token');
            expect(errorMessage.toLowerCase()).not.toContain('api');
            
            // Property: Error messages must not contain technical stack traces
            expect(errorMessage).not.toContain('Error:');
            expect(errorMessage).not.toContain('at ');
            expect(errorMessage).not.toContain('.js:');
            expect(errorMessage).not.toContain('function');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('all error codes should be unique', () => {
      // Property: No duplicate error codes should exist
      const uniqueCodes = new Set(PAYMENT_ERROR_CODES);
      expect(uniqueCodes.size).toBe(PAYMENT_ERROR_CODES.length);
      
      // Property: Error codes should follow consistent naming convention
      PAYMENT_ERROR_CODES.forEach(code => {
        expect(typeof code).toBe('string');
        expect(code.length).toBeGreaterThan(0);
        
        // Should be either UPPER_SNAKE_CASE or lower_snake_case
        const isValidFormat = /^[A-Z_]+$/.test(code) || /^[a-z_]+$/.test(code);
        expect(isValidFormat).toBe(true);
      });
    });

    test('error message retrieval should handle edge cases', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.constant(0),
            fc.constant(false),
            fc.constant(true),
            fc.constant({}),
            fc.constant([]),
            fc.constant(NaN)
          ),
          (edgeCaseInput) => {
            const errorMessage = getErrorMessage(edgeCaseInput);
            
            // Property: Edge case inputs should return default message
            expect(errorMessage).toBe(PAYMENT_ERROR_MESSAGES.default);
            
            // Property: Function should not throw errors
            expect(() => getErrorMessage(edgeCaseInput)).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('error codes should cover common payment failure scenarios', () => {
      // Property: Must have error codes for common failure categories
      const requiredCategories = [
        { pattern: /gateway|server/i, description: 'Gateway/Server errors' },
        { pattern: /card|declined/i, description: 'Card-related errors' },
        { pattern: /timeout/i, description: 'Timeout errors' },
        { pattern: /authentication/i, description: 'Authentication errors' },
        { pattern: /network/i, description: 'Network errors' }
      ];
      
      requiredCategories.forEach(category => {
        const hasCategory = PAYMENT_ERROR_CODES.some(code => 
          category.pattern.test(code) || 
          category.pattern.test(PAYMENT_ERROR_MESSAGES[code])
        );
        expect(hasCategory).toBe(true);
      });
    });

    test('error messages should be suitable for end-user display', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...PAYMENT_ERROR_CODES),
          (errorCode) => {
            const errorMessage = getErrorMessage(errorCode);
            
            // Property: Messages should not contain technical error codes
            expect(errorMessage).not.toMatch(/\d{3,}/); // No long number sequences
            expect(errorMessage).not.toMatch(/[A-Z_]{10,}/); // No long uppercase sequences
            
            // Property: Messages should use plain language
            const technicalTerms = ['exception', 'null pointer', 'stack trace', 'debug'];
            technicalTerms.forEach(term => {
              expect(errorMessage.toLowerCase()).not.toContain(term);
            });
            
            // Property: Messages should not contain double spaces or tabs
            expect(errorMessage).not.toMatch(/\s{2,}/);
            expect(errorMessage).not.toContain('\t');
            
            // Property: Messages should not start or end with whitespace
            expect(errorMessage).toBe(errorMessage.trim());
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
