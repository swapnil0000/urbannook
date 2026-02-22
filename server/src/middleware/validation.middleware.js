import { ApiError } from "../utils/index.js";

export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message.replace(/"/g, ""), // Remove quotes from error messages
      }));

      return res
        .status(400)
        .json(new ApiError(400, "Validation failed", errors, false));
    }

    // Replace req.body with validated and sanitized value
    req.body = value;
    next();
  };
};

/**
 * Sanitize string input to prevent injection attacks
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
export const sanitizeInput = (input) => {
  if (typeof input === "string") {
    return input
      .trim()
      .replace(/[<>]/g, "") // Remove potential HTML tags
      .substring(0, 1000); // Limit length to prevent DoS
  }
  return input;
};

/**
 * Middleware to sanitize all string fields in request body
 */
export const sanitizeRequestBody = (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === "string") {
        req.body[key] = sanitizeInput(req.body[key]);
      }
    });
  }
  next();
};
