import express from "express";
import { metaProductFeed } from "../controller/catalog.controller.js";

const router = express.Router();

/**
 * Public Meta Commerce catalog feed (CSV).
 * Point Meta's scheduled Data Feed at: <API_BASE>/catalog/meta-feed.csv
 */
router.get("/catalog/meta-feed.csv", metaProductFeed);

export default router;
