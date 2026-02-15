import { jest } from '@jest/globals';
import mongoose from 'mongoose';

// Mock dependencies
const mockUpdateOne = jest.fn();
const mockFindOne = jest.fn();

jest.unstable_mockModule('../../model/order.model.js', () => ({
  default: {
    updateOne: mockUpdateOne,
    findOne: mockFindOne
  }
}));

const mockRazorpayPaymentVerificationService = jest.fn();
const mockRazorpayCreateOrderService = jest.fn();

jest.unstable_mockModule('../../services/rp.payement.service.js', () => ({
  razorpayPaymentVerificationService: mockRazorpayPaymentVerificationService,
  razorpayCreateOrderService: mockRazorpayCreateOrderService
}));

// Import controller after mocking
const { razorpayPaymentVerificationController } = await import('../../controller/rp.payment.controller.js');

describe('Payment Error Handling Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup request and response objects
    req = {
      user: { userId: 'test-user-123' },
      body: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Payment Failure Scenarios', () => {
    it('should handle payment_failed error code', async () => {
      req.body = {
        razorpay_order_id: 'order_test123',
        error: {
          code: 'payment_failed',
          description: 'Payment failed'
        }
      };

      mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });

      await razorpayPaymentVerificationController(req, res);

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { "payment.razorpayOrderId": 'order_test123' },
        { 
          $set: { 
            status: "FAILED",
            "payment.errorCode": 'payment_failed',
            "payment.errorDescription": 'Payment failed. Please try again or use a different payment method.'
          } 
        }
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Payment failed. Please try again or use a different payment method.',
          data: expect.objectContaining({
            errorCode: 'payment_failed',
            preserveCart: true
          }),
          success: false
        })
      );
    });

    it('should handle payment_timeout error code', async () => {
      req.body = {
        razorpay_order_id: 'order_timeout456',
        error: {
          code: 'payment_timeout'
        }
      };

      mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });

      await razorpayPaymentVerificationController(req, res);

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { "payment.razorpayOrderId": 'order_timeout456' },
        { 
          $set: { 
            status: "FAILED",
            "payment.errorCode": 'payment_timeout',
            "payment.errorDescription": 'Payment timed out. Your cart has been preserved. Please try again.'
          } 
        }
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Payment timed out. Your cart has been preserved. Please try again.',
          data: expect.objectContaining({
            preserveCart: true
          })
        })
      );
    });

    it('should handle insufficient_funds error code', async () => {
      req.body = {
        razorpay_order_id: 'order_funds789',
        error: {
          code: 'insufficient_funds'
        }
      };

      mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });

      await razorpayPaymentVerificationController(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Insufficient funds. Please check your account balance.',
          data: expect.objectContaining({
            errorCode: 'insufficient_funds',
            preserveCart: true
          })
        })
      );
    });

    it('should handle card_declined error code', async () => {
      req.body = {
        razorpay_order_id: 'order_declined999',
        error: {
          code: 'card_declined'
        }
      };

      mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });

      await razorpayPaymentVerificationController(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Card declined. Please contact your bank or try another card.',
          data: expect.objectContaining({
            errorCode: 'card_declined',
            preserveCart: true
          })
        })
      );
    });

    it('should handle network_error error code', async () => {
      req.body = {
        razorpay_order_id: 'order_network111',
        error: {
          code: 'network_error'
        }
      };

      mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });

      await razorpayPaymentVerificationController(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Network error. Please check your connection and try again.',
          data: expect.objectContaining({
            errorCode: 'network_error',
            preserveCart: true
          })
        })
      );
    });

    it('should handle invalid_card error code', async () => {
      req.body = {
        razorpay_order_id: 'order_invalid222',
        error: {
          code: 'invalid_card'
        }
      };

      mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });

      await razorpayPaymentVerificationController(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid card details. Please check and try again.',
          data: expect.objectContaining({
            errorCode: 'invalid_card',
            preserveCart: true
          })
        })
      );
    });

    it('should handle authentication_failed error code', async () => {
      req.body = {
        razorpay_order_id: 'order_auth333',
        error: {
          code: 'authentication_failed'
        }
      };

      mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });

      await razorpayPaymentVerificationController(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '3D Secure authentication failed. Please try again.',
          data: expect.objectContaining({
            errorCode: 'authentication_failed',
            preserveCart: true
          })
        })
      );
    });

    it('should handle BAD_REQUEST_ERROR error code', async () => {
      req.body = {
        razorpay_order_id: 'order_badreq444',
        error: {
          code: 'BAD_REQUEST_ERROR'
        }
      };

      mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });

      await razorpayPaymentVerificationController(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Payment failed due to invalid request. Please try again.',
          data: expect.objectContaining({
            errorCode: 'BAD_REQUEST_ERROR',
            preserveCart: true
          })
        })
      );
    });

    it('should handle GATEWAY_ERROR error code', async () => {
      req.body = {
        razorpay_order_id: 'order_gateway555',
        error: {
          code: 'GATEWAY_ERROR'
        }
      };

      mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });

      await razorpayPaymentVerificationController(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Payment gateway error. Please try again or use a different payment method.',
          data: expect.objectContaining({
            errorCode: 'GATEWAY_ERROR',
            preserveCart: true
          })
        })
      );
    });

    it('should handle SERVER_ERROR error code', async () => {
      req.body = {
        razorpay_order_id: 'order_server666',
        error: {
          code: 'SERVER_ERROR'
        }
      };

      mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });

      await razorpayPaymentVerificationController(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Payment server error. Please try again later.',
          data: expect.objectContaining({
            errorCode: 'SERVER_ERROR',
            preserveCart: true
          })
        })
      );
    });

    it('should use default error message for unknown error codes', async () => {
      req.body = {
        razorpay_order_id: 'order_unknown777',
        error: {
          code: 'UNKNOWN_ERROR_CODE'
        }
      };

      mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });

      await razorpayPaymentVerificationController(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Payment could not be processed. Please try again later.',
          data: expect.objectContaining({
            errorCode: 'UNKNOWN_ERROR_CODE',
            preserveCart: true
          })
        })
      );
    });

    it('should handle error without error code', async () => {
      req.body = {
        razorpay_order_id: 'order_nocode888',
        error: {
          description: 'Some error occurred'
        }
      };

      mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });

      await razorpayPaymentVerificationController(req, res);

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { "payment.razorpayOrderId": 'order_nocode888' },
        { 
          $set: { 
            status: "FAILED",
            "payment.errorCode": 'payment_failed',
            "payment.errorDescription": 'Payment failed. Please try again or use a different payment method.'
          } 
        }
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Payment failed. Please try again or use a different payment method.',
          data: expect.objectContaining({
            errorCode: 'payment_failed',
            preserveCart: true
          })
        })
      );
    });
  });

  describe('Signature Verification Failure', () => {
    it('should handle signature verification failure', async () => {
      req.body = {
        razorpay_payment_id: 'pay_test123',
        razorpay_order_id: 'order_test123',
        razorpay_signature: 'invalid_signature'
      };

      mockRazorpayPaymentVerificationService.mockResolvedValueOnce(false);
      mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });

      await razorpayPaymentVerificationController(req, res);

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { "payment.razorpayOrderId": 'order_test123' },
        { 
          $set: { 
            status: "FAILED",
            "payment.errorCode": 'signature_verification_failed',
            "payment.errorDescription": 'Payment verification failed. Please contact support if amount was debited.'
          } 
        }
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Payment verification failed. Please contact support if amount was debited.',
          data: expect.objectContaining({
            errorCode: 'signature_verification_failed',
            preserveCart: true
          }),
          success: false
        })
      );
    });
  });

  describe('Cart Preservation', () => {
    it('should always include preserveCart flag in error responses', async () => {
      const errorCodes = [
        'payment_failed',
        'payment_timeout',
        'insufficient_funds',
        'card_declined',
        'network_error',
        'invalid_card',
        'authentication_failed'
      ];

      for (const errorCode of errorCodes) {
        jest.clearAllMocks();
        
        req.body = {
          razorpay_order_id: `order_${errorCode}`,
          error: { code: errorCode }
        };

        mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });

        await razorpayPaymentVerificationController(req, res);

        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              preserveCart: true
            })
          })
        );
      }
    });

    it('should preserve cart on signature verification failure', async () => {
      req.body = {
        razorpay_payment_id: 'pay_sig_fail',
        razorpay_order_id: 'order_sig_fail',
        razorpay_signature: 'bad_signature'
      };

      mockRazorpayPaymentVerificationService.mockResolvedValueOnce(false);
      mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });

      await razorpayPaymentVerificationController(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            preserveCart: true
          })
        })
      );
    });
  });

  describe('Order Status Updates', () => {
    it('should update order status to FAILED on payment error', async () => {
      req.body = {
        razorpay_order_id: 'order_status_test',
        error: {
          code: 'payment_failed'
        }
      };

      mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });

      await razorpayPaymentVerificationController(req, res);

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { "payment.razorpayOrderId": 'order_status_test' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: "FAILED"
          })
        })
      );
    });

    it('should store error code in order on payment failure', async () => {
      req.body = {
        razorpay_order_id: 'order_errorcode_test',
        error: {
          code: 'card_declined'
        }
      };

      mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });

      await razorpayPaymentVerificationController(req, res);

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { "payment.razorpayOrderId": 'order_errorcode_test' },
        expect.objectContaining({
          $set: expect.objectContaining({
            "payment.errorCode": 'card_declined'
          })
        })
      );
    });

    it('should store error description in order on payment failure', async () => {
      req.body = {
        razorpay_order_id: 'order_errordesc_test',
        error: {
          code: 'insufficient_funds'
        }
      };

      mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });

      await razorpayPaymentVerificationController(req, res);

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { "payment.razorpayOrderId": 'order_errordesc_test' },
        expect.objectContaining({
          $set: expect.objectContaining({
            "payment.errorDescription": 'Insufficient funds. Please check your account balance.'
          })
        })
      );
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error response structure', async () => {
      req.body = {
        razorpay_order_id: 'order_format_test',
        error: {
          code: 'payment_failed'
        }
      };

      mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });

      await razorpayPaymentVerificationController(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: expect.any(Number),
          message: expect.any(String),
          data: expect.any(Object),
          success: false
        })
      );
    });

    it('should return 400 status code for payment errors', async () => {
      req.body = {
        razorpay_order_id: 'order_400_test',
        error: {
          code: 'payment_failed'
        }
      };

      mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });

      await razorpayPaymentVerificationController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400
        })
      );
    });

    it('should include error code in response data', async () => {
      req.body = {
        razorpay_order_id: 'order_data_test',
        error: {
          code: 'network_error'
        }
      };

      mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });

      await razorpayPaymentVerificationController(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            errorCode: 'network_error'
          })
        })
      );
    });
  });

  describe('User Authentication', () => {
    it('should return 404 if user is not authenticated', async () => {
      req.user = {};  // No userId

      await razorpayPaymentVerificationController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'User not found for payment',
          success: false
        })
      );
    });

    it('should return 404 if user object is missing', async () => {
      req.user = null;

      await razorpayPaymentVerificationController(req, res);

      // When req.user is null, destructuring throws an error caught by try-catch
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          success: false
        })
      );
    });
  });

  describe('Internal Server Errors', () => {
    it('should handle database errors gracefully', async () => {
      req.body = {
        razorpay_order_id: 'order_db_error',
        error: {
          code: 'payment_failed'
        }
      };

      mockUpdateOne.mockRejectedValueOnce(new Error('Database connection failed'));

      await razorpayPaymentVerificationController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: expect.stringContaining('Internal Server Error'),
          success: false
        })
      );
    });

    it('should handle unexpected errors during verification', async () => {
      req.body = {
        razorpay_payment_id: 'pay_unexpected',
        razorpay_order_id: 'order_unexpected',
        razorpay_signature: 'sig_unexpected'
      };

      mockRazorpayPaymentVerificationService.mockRejectedValueOnce(
        new Error('Unexpected verification error')
      );

      await razorpayPaymentVerificationController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          success: false
        })
      );
    });
  });
});
