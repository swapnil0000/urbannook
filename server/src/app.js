import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import {
  userRouter,
  adminRouter,
  productRouter,
  commonRouter,
  userWaitListRouter,
  userAddressRouter,
  userCartRouter,
  userCommunityListRouter,
  userWishListRouter,
  nfcRouter,
  couponCodeRouter,
  testimonialRouter,
  contactRouter,
} from "./routes/index.js";
import cookieParser from "cookie-parser";
import healthRouter from "./routes/health.route.js";
import { corsOptions, logCorsConfig } from "./config/cors.config.js";
import { errorHandler } from "./middleware/errorHandler.middleware.js";

dotenv.config({
  path: "./.env",
});

const app = express();
app.set("trust proxy", 1);

logCorsConfig();

/* Health Route */
app.use("/health", healthRouter);
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

/*Explicity for webhook because it requires rp webhook requires raw not json */
app.use("/api/v1", (req, res, next) => {
  if (req.originalUrl === "/api/v1/rp/webhook") {
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  "/api/v1",
  userRouter,
  adminRouter,
  productRouter,
  commonRouter,
  userWaitListRouter,
  userWishListRouter,
  userAddressRouter,
  userCartRouter,
  userCommunityListRouter,
  nfcRouter,
  couponCodeRouter,
  testimonialRouter,
  contactRouter,
);

app.use(errorHandler);

export default app;
