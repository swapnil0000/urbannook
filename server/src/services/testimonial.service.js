import Testimonial from "../model/testimonial.model.js";
import { ValidationError } from "../utils/errors.js";
import ProductReview from "../model/product.specific.testimonial.model.js";
import { uploadReviewImageToS3 } from "../utils/s3.utils.js";
import User from "../model/user.model.js";
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

const createProductSpecificTestimonialService = async ({
  userId,
  productId,
  desc,
  rating,
  imageBuffer,
  imageMimeType,
  extraImageBuffers = [],
  extraImageMimeTypes = [],
}) => {
  const errors = [];
  if (!userId) errors.push("UserId is unavailable");
  if (!productId) errors.push("productId is unavailable");
  if (!desc || desc.trim().length === 0) errors.push("Review text is required");
  if (!rating || rating < 1 || rating > 5) errors.push("Rating must be between 1 and 5");

  if (errors.length > 0) {
    return { success: false, statusCode: 400, message: errors[0], data: null };
  }

  const trimmedDesc = desc.trim();
  if (trimmedDesc.length < 10 || trimmedDesc.length > 500) {
    return { success: false, statusCode: 400, message: "Review must be between 10 and 500 characters", data: null };
  }

  // Check if user already reviewed this product
  const existing = await ProductReview.findOne({ userId, productId });
  if (existing) {
    return { success: false, statusCode: 400, message: "You have already submitted a review for this product", data: null };
  }

  // Get user name
  const user = await User.findOne({ userId }).select("name").lean();
  if (!user) {
    return { success: false, statusCode: 404, message: "User not found", data: null };
  }

  // Upload image to S3 if provided
  let imageUrl = null;
  const imageUrls = [];
  if (imageBuffer && imageMimeType) {
    try {
      imageUrl = await uploadReviewImageToS3(imageBuffer, imageMimeType, userId, productId);
      imageUrls.push(imageUrl);
    } catch (err) {
      console.error("[ERROR] Review image upload failed:", err.message);
    }
  }
  // Upload extra images (up to 2 more)
  for (let i = 0; i < Math.min(extraImageBuffers.length, 2); i++) {
    try {
      const url = await uploadReviewImageToS3(extraImageBuffers[i], extraImageMimeTypes[i], userId, `${productId}-img${i + 1}`);
      imageUrls.push(url);
    } catch (err) {
      console.error("[ERROR] Extra review image upload failed:", err.message);
    }
  }

  const review = await ProductReview.create({
    productId,
    userId,
    userName: user.name,
    rating: Number(rating),
    desc: trimmedDesc,
    imageUrl,
    imageUrls,
    isApproved: false,
  });

  return {
    success: true,
    statusCode: 201,
    message: "Review submitted successfully. It will be visible after admin approval.",
    data: { reviewId: review._id },
  };
};

const getProductReviewsService = async (productId) => {
  if (!productId) {
    return { success: false, statusCode: 400, message: "productId is required", data: null };
  }

  const reviews = await ProductReview.find({ productId, isApproved: true })
    .sort({ createdAt: -1 })
    .select("-__v")
    .lean();

  // Calculate average rating
  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return {
    success: true,
    statusCode: 200,
    message: "Reviews fetched",
    data: { reviews, avgRating, totalReviews: reviews.length },
  };
};

// Admin: get all pending reviews
const getPendingReviewsService = async () => {
  const reviews = await ProductReview.find({ isApproved: false })
    .sort({ createdAt: -1 })
    .lean();
  return { success: true, statusCode: 200, message: "Pending reviews", data: reviews };
};

// Admin: approve or reject
const approveReviewService = async (reviewId, approve) => {
  if (approve) {
    await ProductReview.findByIdAndUpdate(reviewId, { isApproved: true });
  } else {
    await ProductReview.findByIdAndDelete(reviewId);
  }
  return { success: true, statusCode: 200, message: approve ? "Review approved" : "Review rejected", data: null };
};

// User: update their own review (resets isApproved to false)
const updateProductReviewService = async ({ reviewId, userId, desc, rating, imageBuffers, imageMimeTypes }) => {
  const review = await ProductReview.findById(reviewId);
  if (!review) return { success: false, statusCode: 404, message: "Review not found", data: null };
  if (review.userId !== userId) return { success: false, statusCode: 403, message: "Not authorized", data: null };

  if (desc !== undefined) {
    const trimmed = desc.trim();
    if (trimmed.length < 10 || trimmed.length > 500)
      return { success: false, statusCode: 400, message: "Review must be between 10 and 500 characters", data: null };
    review.desc = trimmed;
  }

  if (rating !== undefined) {
    const r = Number(rating);
    if (r < 1 || r > 5) return { success: false, statusCode: 400, message: "Rating must be between 1 and 5", data: null };
    review.rating = r;
  }

  // Handle up to 3 images
  if (imageBuffers && imageBuffers.length > 0) {
    const urls = [];
    for (let i = 0; i < Math.min(imageBuffers.length, 3); i++) {
      try {
        const url = await uploadReviewImageToS3(imageBuffers[i], imageMimeTypes[i], userId, review.productId + `-img${i}`);
        urls.push(url);
      } catch (err) {
        console.error("[ERROR] Review image upload failed:", err.message);
      }
    }
    if (urls.length > 0) review.imageUrls = urls;
  }

  review.isApproved = false;
  await review.save();

  return {
    success: true,
    statusCode: 200,
    message: "Review updated. It will be visible after admin approval.",
    data: { reviewId: review._id },
  };
};

export {
  getApprovedTestimonialsService,
  createTestimonialService,
  createProductSpecificTestimonialService,
  getProductReviewsService,
  getPendingReviewsService,
  approveReviewService,
  updateProductReviewService,
};
