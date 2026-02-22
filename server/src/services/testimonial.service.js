import Testimonial from "../model/testimonial.model.js";
import { ValidationError } from "../utils/errors.js";

/**
 * Get all approved testimonials sorted by creation date (newest first)
 * @returns {Object} Service response with testimonials array
 */
const getApprovedTestimonialsService = async () => {
  const testimonials = await Testimonial.find({ isApproved: true })
    .sort({ createdAt: -1 })
    .select("-_id -__v")
    .lean();

  return {
    success: true,
    statusCode: 200,
    message: "Testimonials fetched successfully",
    data: { testimonials },
  };
};

/**
 * Create a new testimonial with validation
 * @param {Object} testimonialData - Testimonial data
 * @returns {Object} Service response with created testimonial
 */
const createTestimonialService = async ({
  userName,
  userRole,
  userLocation,
  content,
  rating,
  colorTheme,
  productId,
  userEmail,
}) => {
  // Validate required fields
  const errors = [];
  
  if (!userName || userName.trim().length === 0) {
    errors.push("userName is required");
  }
  
  if (!content || content.trim().length === 0) {
    errors.push("content is required");
  }
  
  if (rating === undefined || rating === null) {
    errors.push("rating is required");
  }
  
  if (errors.length > 0) {
    throw new ValidationError("Validation failed", { errors });
  }

  // Trim content for length validation
  const trimmedContent = content.trim();

  // Validate content length (after confirming it exists)
  if (trimmedContent.length < 10 || trimmedContent.length > 500) {
    throw new ValidationError("Content must be between 10 and 500 characters");
  }

  // Validate rating
  if (rating < 0 || rating > 4 || !Number.isInteger(rating)) {
    throw new ValidationError("Rating must be an integer between 0 and 4");
  }

  // Create testimonial with isApproved: true (auto-approval)
  const testimonialData = {
    userName: userName.trim(),
    content: trimmedContent,
    rating,
    isApproved: true,
  };

  // Add optional fields if provided
  if (userRole) testimonialData.userRole = userRole;
  if (userLocation) testimonialData.userLocation = userLocation;
  if (colorTheme) testimonialData.colorTheme = colorTheme;
  if (productId) testimonialData.productId = productId;
  if (userEmail) testimonialData.userEmail = userEmail;

  let testimonial;
  try {
    testimonial = await Testimonial.create(testimonialData);
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      throw new ValidationError("Validation failed", { errors });
    }
    throw error;
  }

  // Convert to plain object and remove MongoDB internal fields
  const testimonialObj = testimonial.toObject();
  delete testimonialObj._id;
  delete testimonialObj.__v;

  return {
    success: true,
    statusCode: 201,
    message: "Testimonial submitted successfully",
    data: { testimonial: testimonialObj },
  };
};

export { getApprovedTestimonialsService, createTestimonialService };
