/**
 * Centralized error handling middleware
 * Catches all errors and returns consistent error responses
 */
export const errorHandler = (err, req, res, next) => {
  // Log error with context
  console.error(`[ERROR] Request error - Method: ${req.method}, URL: ${req.url}, UserId: ${req.user?.userId || 'N/A'}, StatusCode: ${err.statusCode || 500}:`, err.message, err.stack);
  
  // Determine status code
  const statusCode = err.statusCode || 500;
  
  // Determine error message
  // In production, hide internal server error details
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Internal server error'
    : err.message;
  
  // Determine error data
  // In production, don't expose stack traces for 500 errors
  const data = process.env.NODE_ENV === 'production' && statusCode === 500
    ? null
    : err.data || err.stack;
  
  // Send consistent error response
  res.status(statusCode).json({
    statusCode,
    message,
    data,
    success: false
  });
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch promise rejections
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
