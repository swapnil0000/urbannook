import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { userRouter, adminRouter, productRouter } from "./routes/index.js";
import cookieParser from "cookie-parser";
dotenv.config({
  path: "./.env",
});
const app = express();
const whiteListClientUrl = process.env.WHITE_LIST_CLIENT_URI.split(",");
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || whiteListClientUrl.includes(origin.trim())) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1", userRouter, adminRouter, productRouter);
export default app;
