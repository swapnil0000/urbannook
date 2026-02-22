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

// Test endpoint to trigger 500 error WITHOUT authentication (public)
healthRouter.get("/test-alert-public", (req, res, next) => {
  console.log('[TEST] Triggering PUBLIC 500 error (no auth)...');
  next(new InternalServerError("Test 500 error - PUBLIC endpoint (no authentication)"));
});

// Test endpoint to trigger 500 error WITH authentication (protected)
healthRouter.get("/test-alert-protected", authGuardService("USER"), (req, res, next) => {
  console.log('[TEST] Triggering PROTECTED 500 error (with auth)...');
  console.log('[TEST] User details:', req.user);
  next(new InternalServerError("Test 500 error - PROTECTED endpoint (authenticated user)"));
});

export default healthRouter;
