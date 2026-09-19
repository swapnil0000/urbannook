import express from "express";
import rateLimit from "express-rate-limit";
import whatsappInboxController from "../controller/whatsapp.inbox.controller.js";
import { authGuardService } from "../services/common.auth.service.js";
import {
  whatsappLoginStart,
  whatsappLoginStatus,
  gupshupInboundWebhook,
  gupshupWebhookHealth,
} from "../controller/whatsapp.auth.controller.js";

const router = express.Router();

/* Limits code generation so a single IP cannot farm codes.
   Deliberately generous: Indian mobile carriers put many subscribers behind
   one CGNAT address, so a tight per-IP cap locks out genuine users. The code
   itself is the security boundary — 30^10 random, single use, 5 minute life —
   so this limit only needs to stop bulk abuse. */
const whatsappStartLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: "Too many WhatsApp login attempts, please try again later",
});

/* Polling runs every 3s and a code lives 5 min → ~100 hits per login, so
   the ceiling sits well above that or the genuine flow gets blocked. */
const whatsappStatusLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 240,
  message: "Too many status checks, please try again later",
});

/* ===============================================================
   GUPSHUP INBOUND WEBHOOK
   ---------------------------------------------------------------
   The callback URL registered in the Gupshup dashboard. Inbound
   messages and delivery events both arrive here.

   The URL must carry the shared secret:
     https://api.urbannook.in/api/v1/webhooks/gupshup-inbound/<GUPSHUP_WEBHOOK_SECRET>
   A ?secret= query param or an x-webhook-secret header work too.
   Without it the handler ignores the payload, because this endpoint
   grants a login session.
================================================================ */

router.get("/webhooks/gupshup-inbound", gupshupWebhookHealth);
router.post("/webhooks/gupshup-inbound", gupshupInboundWebhook);

// Secret in the path — for providers that drop the query string from a
// configured callback URL
router.post("/webhooks/gupshup-inbound/:secret", gupshupInboundWebhook);

/* ===============================================================
   WHATSAPP LOGIN (frontend-facing)
   ---------------------------------------------------------------
   These responses must never be cached. The status changes every few
   seconds, and the API sits behind Cloudflare, which caches GET
   responses without this header — the browser then keeps receiving the
   first "PENDING" forever and the login never completes.
================================================================ */

const noStore = (_req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.set("Pragma", "no-cache");
  next();
};

router.post("/auth/whatsapp/start", whatsappStartLimiter, noStore, whatsappLoginStart);
router.get("/auth/whatsapp/status", whatsappStatusLimiter, noStore, whatsappLoginStatus);

/* ===============================================================
   ADMIN INBOX
   ---------------------------------------------------------------
   An API number cannot be opened in the WhatsApp app, so these
   endpoints are the only way to read what customers send us.
================================================================ */

router.get(
  "/admin/whatsapp/messages",
  authGuardService("Admin"),
  whatsappInboxController.listMessages,
);
router.patch(
  "/admin/whatsapp/messages/:id/handled",
  authGuardService("Admin"),
  whatsappInboxController.markHandled,
);

export default router;
