import express from "express";
import metaCapiController from "../controller/meta.capi.controller.js";

const router = express.Router();

// Browser-side pixel event relay → server sends same event to Meta CAPI
router.post("/meta/capi-event", metaCapiController.relayCapiEvent);

export default router;
