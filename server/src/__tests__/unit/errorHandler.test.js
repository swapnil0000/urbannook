import { jest } from '@jest/globals';
import { errorHandler, asyncHandler } from '../../middleware/errorHandler.middleware.js';
import {
  ValidationError,
  AuthenticationError,
  NotFoundError,
  BadRequestError,
} from '../../utils/errors.js';

describe('Error Handler Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      url: '/test',
      user: { userId: 'test-user' },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('errorHandler', () => {
    it('should handle ValidationError with 400 status', () => {
      const error = new ValidationError('Validation failed', { field: 'email' });
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Validation failed',
          success: false,
        })
      );
    });

    it('should handle AuthenticationError with 401 status', () => {
      const error = new AuthenticationError('Invalid token');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'Invalid token',
          success: false,
        })
      );
    });

    it('should handle NotFoundError with 404 status', () => {
      const error = new NotFoundError('User');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'User not found',
          success: false,
        })
      );
    });

    it('should handle generic errors with 500 status', () => {
      const error = new Error('Something went wrong');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          success: false,
        })
      );
    });

    it('should hide error details in production for 500 errors', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const error = new Error('Internal error');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Internal server error',
          data: null,
        })
      );
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should expose error details in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Internal error');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Internal error',
        })
      );
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should return consistent error response structure', () => {
      const error = new BadRequestError('Bad request');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      const response = mockRes.json.mock.calls[0][0];
      expect(response).toHaveProperty('statusCode');
      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('success');
      expect(response.success).toBe(false);
    });
  });

  describe('asyncHandler', () => {
    it('should call the wrapped function', async () => {
      const mockFn = jest.fn().mockResolvedValue(undefined);
      const wrappedFn = asyncHandler(mockFn);
      
      await wrappedFn(mockReq, mockRes, mockNext);
      
      expect(mockFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    });

    it('should catch errors and pass to next', async () => {
      const error = new Error('Test error');
      const mockFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = asyncHandler(mockFn);
      
      await wrappedFn(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle async function errors', async () => {
      const error = new Error('Async error');
      const mockFn = jest.fn().mockImplementation(async () => {
        throw error;
      });
      const wrappedFn = asyncHandler(mockFn);
      
      await wrappedFn(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should pass through successful responses', async () => {
      const mockFn = jest.fn().mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });
      const wrappedFn = asyncHandler(mockFn);
      
      await wrappedFn(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
