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
 * Returns a login code and its wa.me deep link.
 */
const whatsappLoginStart = asyncHandler(async (req, res) => {
  // The client sends the code it already holds — if that code is still live
  // it comes back unchanged, so the prefilled message already sitting in
  // WhatsApp stays valid.
  const result = await startWhatsAppLogin(req.ip, req.body?.token);
  return res
    .status(result.statusCode)
    .json(new ApiRes(result.statusCode, result.message, result.data, true));
});

/**
 * GET /api/v1/auth/whatsapp/status?token=UN-XXXXXXXXXX
 * Polled by the frontend. On VERIFIED it sets the same httpOnly cookies as
 * every other login flow.
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
 * Gupshup retries on any non-200 and disables the webhook after repeated
 * failures, so every path here answers 200 and errors are swallowed.
 */
const gupshupInboundWebhook = asyncHandler(async (req, res) => {
  if (!verifyWebhookSecret(req)) {
    // Wrong or missing secret: acknowledge, but process nothing
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
 * Reachability check only — used when saving the URL in Gupshup and for
 * manual testing.
 */
const gupshupWebhookHealth = (_req, res) => res.status(200).send("OK");

export {
  whatsappLoginStart,
  whatsappLoginStatus,
  gupshupInboundWebhook,
  gupshupWebhookHealth,
};
