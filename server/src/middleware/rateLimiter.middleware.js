import rateLimit from "express-rate-limit";
/**
 * Rate limiter for testimonial submissions
 * Limits to 3 submissions per IP address per 60 minutes
 */
export const testimonialRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 60 minutes
  max: 3, // 3 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const resetTime = req.rateLimit?.resetTime
      ? new Date(req.rateLimit.resetTime).getTime()
      : Date.now() + 60 * 60 * 1000;
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

    res.status(429).json({
      statusCode: 429,
      message:
        "Rate limit exceeded. Too many testimonials submitted. Please try again later.",
      data: {
        retryAfter: retryAfter,
      },
      success: false,
    });
  },
});
