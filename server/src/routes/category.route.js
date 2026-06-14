import { Router } from "express";
import {
  getCategories,
  getCategoryBySlug,
} from "../controller/category.controller.js";

const categoryRouter = Router();

categoryRouter.get("/categories", getCategories);
categoryRouter.get("/categories/:slug", getCategoryBySlug);

export default categoryRouter;
