import { ApiRes } from "../utils/index.js";
import {
  getApprovedTestimonialsService,
  createTestimonialService,
  createProductSpecificTestimonialService,
  getProductReviewsService,
  getPendingReviewsService,
  approveReviewService,
  updateProductReviewService,
} from "../services/testimonial.service.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { ValidationError } from "../utils/errors.js";

const getTestimonials = asyncHandler(async (_, res) => {
  const result = await getApprovedTestimonialsService();
  return res.status(result.statusCode).json(new ApiRes(result.statusCode, result.message, result.data, true));
});

const submitTestimonial = asyncHandler(async (req, res) => {
  const { userName, userRole, userLocation, content, rating, colorTheme, productId, userEmail } = req.body;
  const result = await createTestimonialService({ userName, userRole, userLocation, content, rating, colorTheme, productId, userEmail });
  return res.status(result.statusCode).json(new ApiRes(result.statusCode, result.message, result.data, result.success));
});

// POST /specific/review - submit product review (auth required, multipart/form-data, up to 3 images)
const submitProductReview = asyncHandler(async (req, res) => {
  const { productId, desc, rating } = req.body;
  const { userId } = req.user;

  // Support both single file (req.file) and multiple files (req.files)
  const files = req.files?.length ? req.files : (req.file ? [req.file] : []);
  const imageBuffer = files[0]?.buffer || null;
  const imageMimeType = files[0]?.mimetype || null;

  const result = await createProductSpecificTestimonialService({
    userId,
    productId,
    desc,
    rating: Number(rating),
    imageBuffer,
    imageMimeType,
    extraImageBuffers: files.slice(1).map(f => f.buffer),
    extraImageMimeTypes: files.slice(1).map(f => f.mimetype),
  });

  return res.status(result.statusCode).json(new ApiRes(result.statusCode, result.message, result.data, result.success));
});

// PATCH /specific/review/:reviewId - user updates their own review (resets isApproved)
const updateProductReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const { desc, rating } = req.body;
  const { userId } = req.user;

  const files = req.files?.length ? req.files : (req.file ? [req.file] : []);

  const result = await updateProductReviewService({
    reviewId,
    userId,
    desc,
    rating,
    imageBuffers: files.map(f => f.buffer),
    imageMimeTypes: files.map(f => f.mimetype),
  });

  return res.status(result.statusCode).json(new ApiRes(result.statusCode, result.message, result.data, result.success));
});

// GET /specific/review?productId=xxx - get approved reviews for a product
const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.query;
  if (!productId) throw new ValidationError("productId is required");
  const result = await getProductReviewsService(productId);
  return res.status(result.statusCode).json(new ApiRes(result.statusCode, result.message, result.data, result.success));
});

// Admin: GET /admin/reviews/pending
const getPendingReviews = asyncHandler(async (req, res) => {
  const result = await getPendingReviewsService();
  return res.status(result.statusCode).json(new ApiRes(result.statusCode, result.message, result.data, result.success));
});

// Admin: PATCH /admin/reviews/:reviewId
const handleReviewApproval = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const { approve } = req.body; // true or false
  if (approve === undefined) throw new ValidationError("approve field is required");
  const result = await approveReviewService(reviewId, approve);
  return res.status(result.statusCode).json(new ApiRes(result.statusCode, result.message, result.data, result.success));
});

export {
  getTestimonials,
  submitTestimonial,
  submitProductReview,
  updateProductReview,
  getProductReviews,
  getPendingReviews,
  handleReviewApproval,
};
