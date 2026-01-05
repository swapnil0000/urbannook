import { Router } from "express";
import userWaitListController from "../controller/user.waitlist.controller.js";
const userWaitListRouter = Router();
userWaitListRouter.route("/join/waitlist").post(userWaitListController);
export default userWaitListRouter;
