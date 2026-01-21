import { Router } from "express";
import userCommunityController from "../controller/user.community.controller.js";
const userCommunityListRouter = Router();
userCommunityListRouter.route("/join/community").post(userCommunityController);
export default userCommunityListRouter;
