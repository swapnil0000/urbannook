import Testimonial from "../model/testimonial.model.js";
import { ValidationError } from "../utils/errors.js";

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
  try {
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
      return {
        success: false,
        statusCode: 400,
        message: "Validation failed",
        data: { errors },
      };
    }

    // Trim content for length validation
    const trimmedContent = content.trim();

    // Validate content length (after confirming it exists)
    if (trimmedContent.length < 10 || trimmedContent.length > 500) {
      return {
        success: false,
        statusCode: 400,
        message: "Validation failed",
        data: {
          errors: ["Content must be between 10 and 500 characters"],
        },
      };
    }

    // Validate rating
    if (rating < 0 || rating > 5 || !Number.isInteger(rating)) {
      return {
        success: false,
        statusCode: 400,
        message: "Validation failed",
        data: {
          errors: ["Rating must be an integer between 0 and 4"],
        },
      };
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

    const testimonial = await Testimonial.create(testimonialData);

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
  } catch (error) {
    console.error(
      "[ERROR] Create testimonial error:",
      error.message,
      error.stack,
    );

    // Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return {
        success: false,
        statusCode: 400,
        message: "Validation failed",
        data: { errors },
      };
    }

    return {
      success: false,
      statusCode: 500,
      message: `Internal Server Error - ${error.message}`,
      data: null,
    };
  }
};

export { getApprovedTestimonialsService, createTestimonialService };
