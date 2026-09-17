import express from "express";
import rateLimit from "express-rate-limit";
import {
  whatsappLoginStart,
  whatsappLoginStatus,
  gupshupInboundWebhook,
  gupshupWebhookHealth,
} from "../controller/whatsapp.auth.controller.js";

const router = express.Router();

/* Login token banane pe limit — ek IP se token farming rokne ke liye.
   Shared IPs (office/college wifi) ka dhyan rakhte hue thoda khula. */
const whatsappStartLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many WhatsApp login attempts, please try again later",
});

/* Polling har 3s pe hoti hai aur token 5 min ka hai → ~100 hits per login.
   Limit isse upar rakhi hai warna genuine flow hi block ho jayega. */
const whatsappStatusLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 240,
  message: "Too many status checks, please try again later",
});

/* ===============================================================
   GUPSHUP INBOUND WEBHOOK
   ---------------------------------------------------------------
   Gupshup dashboard me registered callback URL. Inbound messages
   aur delivery events dono yahin aate hain.

   URL me shared secret hona zaroori hai:
     https://api.urbannook.in/api/v1/webhooks/gupshup-inbound?secret=<GUPSHUP_WEBHOOK_SECRET>
   (ya x-webhook-secret header). Iske bina handler payload ignore
   kar dega — kyunki ye endpoint login grant karta hai.
================================================================ */

router.get("/webhooks/gupshup-inbound", gupshupWebhookHealth);
router.post("/webhooks/gupshup-inbound", gupshupInboundWebhook);

/* ===============================================================
   WHATSAPP LOGIN (frontend-facing)
================================================================ */

router.post("/auth/whatsapp/start", whatsappStartLimiter, whatsappLoginStart);
router.get("/auth/whatsapp/status", whatsappStatusLimiter, whatsappLoginStatus);

export default router;
