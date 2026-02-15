import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for testimonial submissions
 * Limits to 3 submissions per IP address per 60 minutes
 */
export const testimonialRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 60 minutes
  max: 3, // 3 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Use default key generator which properly handles IPv6
  // No need to specify keyGenerator - defaults to req.ip with IPv6 support
  handler: (req, res) => {
    // Calculate retry time in seconds
    const retryAfter = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
    
    // Return custom error response matching ApiError format
    res.status(429).json({
      statusCode: 429,
      message: 'Rate limit exceeded. Too many testimonials submitted. Please try again later.',
      data: {
        retryAfter: retryAfter
      },
      success: false
    });
  }
});
