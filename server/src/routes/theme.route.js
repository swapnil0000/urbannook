import { Router } from "express";
import { getThemeConfigController } from "../controller/theme.controller.js";

const themeRouter = Router();
themeRouter.get("/theme", getThemeConfigController);

export default themeRouter;
