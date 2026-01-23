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
} from "./routes/index.js";
import cookieParser from "cookie-parser";
dotenv.config({
  path: "./.env",
});
const app = express();
const whiteListClientUrl = process.env.WHITE_LIST_CLIENT_URI.split(",");
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || whiteListClientUrl.includes(origin.trim())) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Use CORS for all normal requests
app.use(cors(corsOptions));

// Handle preflight OPTIONS requests
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
  userAddressRouter,
  userCartRouter,
  userCommunityListRouter,
);
export default app;
