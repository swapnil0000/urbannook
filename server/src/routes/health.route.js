import express from "express";
import mongoose from "mongoose";
import { InternalServerError } from "../utils/errors.js";
import { authGuardService } from "../services/common.auth.service.js";

const healthRouter = express.Router();

healthRouter.get("/", (_, res) => {
  return res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: Date.now(),
    checks: {
      database:
        mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    },
  });
});


export default healthRouter;
