import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import cookieOptions, { refreshCookieOptions } from "../config/config.js";
import { ApiRes } from "../utils/index.js";
import {
  startWhatsAppLogin,
  handleInboundMessage,
  checkWhatsAppLoginStatus,
  verifyWebhookSecret,
} from "../services/whatsapp.auth.service.js";

/**
 * POST /api/v1/auth/whatsapp/start
 * Login token + wa.me deep link deta hai.
 */
const whatsappLoginStart = asyncHandler(async (req, res) => {
  // Client apna maujooda token bhejta hai — zinda ho to wahi wapas milega,
  // taaki WhatsApp me pada purana prefilled message bekaar na ho jaye
  const result = await startWhatsAppLogin(req.ip, req.body?.token);
  return res
    .status(result.statusCode)
    .json(new ApiRes(result.statusCode, result.message, result.data, true));
});

/**
 * GET /api/v1/auth/whatsapp/status?token=UN-XXXXXXXXXX
 * Frontend isi ko poll karta hai. VERIFIED pe cookies set hoti hain —
 * wahi httpOnly cookies jo baaki login flows set karte hain.
 */
const whatsappLoginStatus = asyncHandler(async (req, res) => {
  const result = await checkWhatsAppLoginStatus(req.query?.token);

  if (result.data.status !== "VERIFIED") {
    return res
      .status(200)
      .json(new ApiRes(200, result.message, result.data, true));
  }

  const { userAccessToken, userRefreshToken, user, status } = result.data;

  return res
    .status(200)
    .cookie("userAccessToken", userAccessToken, cookieOptions)
    .cookie("userRefreshToken", userRefreshToken, refreshCookieOptions)
    .json(
      new ApiRes(
        200,
        result.message,
        { status, ...user, userAccessToken },
        true,
      ),
    );
});

/**
 * POST /api/v1/webhooks/gupshup-inbound
 *
 * Gupshup non-200 pe retry karta hai aur baar-baar fail hone pe webhook
 * disable kar deta hai — isliye har path pe 200 hi jaata hai, error bhi
 * andar hi swallow hota hai.
 */
const gupshupInboundWebhook = asyncHandler(async (req, res) => {
  if (!verifyWebhookSecret(req)) {
    // Galat/missing secret: acknowledge karo par kuch process mat karo
    console.warn("[WHATSAPP AUTH] Webhook secret mismatch — payload ignored");
    return res.status(200).send("EVENT_RECEIVED");
  }

  try {
    await handleInboundMessage(req.body);
  } catch (error) {
    console.error("[WHATSAPP AUTH] Inbound handling failed:", error.message);
  }

  return res.status(200).send("EVENT_RECEIVED");
});

/**
 * GET /api/v1/webhooks/gupshup-inbound
 * Sirf reachability check — Gupshup URL save karte waqt aur manual test me.
 */
const gupshupWebhookHealth = (_req, res) => res.status(200).send("OK");

export {
  whatsappLoginStart,
  whatsappLoginStatus,
  gupshupInboundWebhook,
  gupshupWebhookHealth,
};
