import { ApiRes } from "../utils/index.js";
import Category from "../model/category.model.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true })
    .sort({ displayOrder: 1, createdAt: 1 })
    .select("-__v -updatedAt");

  return res
    .status(200)
    .json(new ApiRes(200, "OK", categories, true));
});
