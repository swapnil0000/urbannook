import express from "express";
import { authGuardService } from "../services/common.auth.service.js";
import adminAnalyticsController from "../controller/admin.analytics.controller.js";

const router = express.Router();

router.get("/admin/analytics/funnel", authGuardService("Admin"), adminAnalyticsController.getFunnel);
router.get("/admin/analytics/summary", authGuardService("Admin"), adminAnalyticsController.getSummary);
router.get("/admin/analytics/events", authGuardService("Admin"), adminAnalyticsController.getEvents);
router.get("/admin/analytics/top-products", authGuardService("Admin"), adminAnalyticsController.getTopProducts);

export default router;
