import { Router } from "express";
import userCommunityController from "../controller/user.community.controller.js";
const userCommunityListRouter = Router();
userCommunityListRouter.post("/join/community", userCommunityController);
export default userCommunityListRouter;
