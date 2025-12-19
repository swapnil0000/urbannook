import express from "express";
import dotenv from "dotenv";
import { userRouter ,adminRouter} from "./routes/index.js";
import cookieParser from "cookie-parser";
dotenv.config({
  path: "./.env",
});
const app = express();
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1", userRouter, adminRouter);
export default app;
