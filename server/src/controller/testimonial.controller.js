import { ApiRes } from "../utils/index.js";
import {
  getApprovedTestimonialsService,
  createTestimonialService,
} from "../services/testimonial.service.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";

const getTestimonials = asyncHandler(async (_, res) => {
  const result = await getApprovedTestimonialsService();

  return res
    .status(result.statusCode)
    .json(new ApiRes(result.statusCode, result.message, result.data, true));
});

const submitTestimonial = asyncHandler(async (req, res) => {
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

  return res
    .status(result.statusCode)
    .json(new ApiRes(result.statusCode, result.message, result.data, true));
});

export { getTestimonials, submitTestimonial };
