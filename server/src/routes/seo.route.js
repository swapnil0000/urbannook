import { Router } from "express";
import { getSeoData } from "../controller/seo.controller.js";

const seoRouter = Router();
seoRouter.get("/seo", getSeoData);
export default seoRouter;
