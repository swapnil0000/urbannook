import express from "express";
import { metaProductFeed, googleProductFeed } from "../controller/catalog.controller.js";

const router = express.Router();

/**
 * Public Meta Commerce catalog feed (CSV).
 * Point Meta's scheduled Data Feed at: <API_BASE>/catalog/meta-feed.csv
 */
router.get("/catalog/meta-feed.csv", metaProductFeed);

/**
 * Public Google Merchant Center feed (TSV).
 * Merchant Center → Data sources → "Enter a link to your file": <API_BASE>/catalog/google-feed.tsv
 */
router.get("/catalog/google-feed.tsv", googleProductFeed);

export default router;
