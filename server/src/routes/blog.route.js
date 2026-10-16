import { Router } from "express";
import { listBlogPosts, blogPostDetails } from "../controller/blog.controller.js";

const blogRouter = Router();
blogRouter.get("/blog", listBlogPosts);
blogRouter.get("/blog/:slug", blogPostDetails);
export default blogRouter;
