import { Router } from "express";
import { getCategories } from "../controller/category.controller.js";

const categoryRouter = Router();

categoryRouter.get("/categories", getCategories);

export default categoryRouter;
