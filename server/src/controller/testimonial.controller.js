import { ApiRes, ApiError } from "../utlis/index.js";
import {
  getApprovedTestimonialsService,
  createTestimonialService,
} from "../services/testimonial.service.js";

/**
 * Get all approved testimonials
 * GET /api/v1/testimonials
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTestimonials = async (req, res) => {
  try {
    const result = await getApprovedTestimonialsService();

    if (!result.success) {
      return res
        .status(result.statusCode)
        .json(
          new ApiError(
            result.statusCode,
            result.message,
            result.data,
            false
          )
        );
    }

    return res
      .status(result.statusCode)
      .json(
        new ApiRes(
          result.statusCode,
          result.message,
          result.data,
          true
        )
      );
  } catch (error) {
    console.error("[ERROR] Get testimonials controller error:", error.message, error.stack);
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          `Internal Server Error - ${error.message}`,
          null,
          false
        )
      );
  }
};

/**
 * Submit a new testimonial
 * POST /api/v1/testimonials
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const submitTestimonial = async (req, res) => {
  try {
    const {
      userName,
      userRole,
      userLocation,
      content,
      rating,
      colorTheme,
      productId,
      userEmail,
    } = req.body;

    const result = await createTestimonialService({
      userName,
      userRole,
      userLocation,
      content,
      rating,
      colorTheme,
      productId,
      userEmail,
    });

    if (!result.success) {
      return res
        .status(result.statusCode)
        .json(
          new ApiError(
            result.statusCode,
            result.message,
            result.data,
            false
          )
        );
    }

    return res
      .status(result.statusCode)
      .json(
        new ApiRes(
          result.statusCode,
          result.message,
          result.data,
          true
        )
      );
  } catch (error) {
    console.error("[ERROR] Submit testimonial controller error:", error.message, error.stack);
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          `Internal Server Error - ${error.message}`,
          null,
          false
        )
      );
  }
};

export { getTestimonials, submitTestimonial };
