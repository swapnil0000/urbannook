import { Router } from "express";
import { listCategories, categoryDetails } from "../controller/category.controller.js";

const categoryRouter = Router();
categoryRouter.get("/categories", listCategories);
categoryRouter.get("/category/:slug", categoryDetails);
categoryRouter.get("/category/:slug/:subSlug", categoryDetails);
export default categoryRouter;
