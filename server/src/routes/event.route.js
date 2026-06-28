import express from "express";
import eventController from "../controller/event.controller.js";

const router = express.Router();

/**
 * Public, high-volume, fire-and-forget event ingestion.
 * Accepts a single event or a batch: { events: [ {...}, {...} ] }.
 */
router.post("/events/track", eventController.track);

export default router;
