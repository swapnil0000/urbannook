import crypto from "crypto";
import { v7 as uuid7 } from "uuid";
import WhatsAppLoginToken from "../model/whatsappLoginToken.model.js";
import User from "../model/user.model.js";
import env from "../config/envConfigSetup.js";
import {
  ValidationError,
  AuthenticationError,
  InternalServerError,
} from "../utils/errors.js";

/* Login codes expire in 5 minutes — same window as the email OTP flow */
const TOKEN_TTL_SECONDS = 5 * 60;

/* Crockford-style alphabet: 0/O and 1/I/L are dropped because the user may
   have to read or retype this code inside WhatsApp */
const TOKEN_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const TOKEN_LENGTH = 10;
const TOKEN_PREFIX = "UN-";

/* Shape of a login code — used to find it inside an inbound message */
const TOKEN_REGEX = new RegExp(
  `${TOKEN_PREFIX}[${TOKEN_ALPHABET}]{${TOKEN_LENGTH}}`,
);

/**
 * Generates a cryptographically random login code.
 * 30^10 ≈ 5.9e14 combinations, so brute force is impractical inside the
 * 5 minute window (which is also rate limited).
 */
const generateTokenString = () => {
  const bytes = crypto.randomBytes(TOKEN_LENGTH);
  let out = "";
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    out += TOKEN_ALPHABET[bytes[i] % TOKEN_ALPHABET.length];
  }
  return `${TOKEN_PREFIX}${out}`;
};

/**
 * Normalizes an Indian mobile number down to 10 digits.
 *
 * Gupshup sends `from` with the country code (919876543210), while existing
 * users are stored as 10 digits. Without normalizing, findOne never matches
 * and the same person ends up with a duplicate account.
 *
 * @param {string|number} raw
 * @returns {number|null} 10 digit number, or null when not a valid mobile
 */
const normalizeIndianMobile = (raw) => {
  if (raw === null || raw === undefined) return null;

  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;

  let local = digits;
  if (local.length === 12 && local.startsWith("91")) local = local.slice(2);
  else if (local.length === 11 && local.startsWith("0")) local = local.slice(1);

  // Indian mobile: 10 digits, starting 6-9
  if (!/^[6-9]\d{9}$/.test(local)) return null;

  return Number(local);
};

/** Keeps full numbers out of the logs — 98XXXXXX10 */
const maskMobile = (mobile) => {
  const s = String(mobile ?? "");
  if (s.length < 4) return "****";
  return `${s.slice(0, 2)}${"X".repeat(s.length - 4)}${s.slice(-2)}`;
};

/**
 * Verifies the shared secret on an inbound Gupshup webhook.
 *
 * This endpoint grants a login session, so leaving it open would let anyone
 * POST a forged payload and get a session for any phone number.
 *
 * The secret is accepted from three places, in this order:
 *   1. URL path   — /webhooks/gupshup-inbound/<secret>
 *   2. Query      — ?secret=<secret>
 *   3. Header     — x-webhook-secret
 *
 * The path variant exists because some providers drop the query string from
 * a configured callback URL; the path is never stripped.
 *
 * @returns {boolean}
 */
const verifyWebhookSecret = (req) => {
  const expected = env.GUPSHUP_WEBHOOK_SECRET;

  if (!expected) {
    console.error(
      "[WHATSAPP AUTH] GUPSHUP_WEBHOOK_SECRET is not set — ignoring inbound payload",
    );
    return false;
  }

  const sources = [
    ["path", req.params?.secret],
    ["query", req.query?.secret],
    ["header", req.headers?.["x-webhook-secret"]],
  ];
  const found = sources.find(([, value]) => value);

  if (!found) {
    // "No secret arrived" and "wrong secret arrived" are different problems,
    // so they get different messages
    console.warn(
      "[WHATSAPP AUTH] No secret on request (path, query and header all empty) — check the callback URL",
    );
    return false;
  }

  const [source, provided] = found;

  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));

  // timingSafeEqual requires equal lengths — a length mismatch is a fail
  if (a.length !== b.length) {
    console.warn(
      `[WHATSAPP AUTH] Secret has the wrong length (${a.length} chars via ${source}, expected ${b.length}) — value was not copied in full`,
    );
    return false;
  }

  if (!crypto.timingSafeEqual(a, b)) {
    console.warn(
      `[WHATSAPP AUTH] Secret length matches but the value differs (via ${source}) — possibly another environment's secret`,
    );
    return false;
  }

  return true;
};

/**
 * Pulls the sender phone and message text out of an inbound payload.
 *
 * Two formats are supported because the Gupshup dashboard has a
 * "Payload Format" toggle:
 *   - Meta format (v3): entry[].changes[].value.messages[]
 *   - Gupshup native:   { type:"message", payload:{ sender, payload:{text} } }
 *
 * Delivery and read receipts (value.statuses) arrive on the same webhook
 * and are ignored here.
 *
 * @returns {{ phone: string, text: string }|null}
 */
const extractInboundText = (body) => {
  if (!body || typeof body !== "object") return null;

  // --- Meta format (v3) ---
  const value = body.entry?.[0]?.changes?.[0]?.value;
  if (value) {
    if (Array.isArray(value.statuses) && !value.messages) return null;

    const message = value.messages?.[0];
    if (message?.type === "text" && message.text?.body) {
      return {
        phone: String(message.from ?? ""),
        text: String(message.text.body),
      };
    }
    return null;
  }

  // --- Gupshup native format ---
  if (body.type === "message" && body.payload?.type === "text") {
    const p = body.payload;
    const phone = p.sender?.phone ?? p.source ?? body.payload?.source ?? "";
    const text = p.payload?.text ?? "";
    if (text) return { phone: String(phone), text: String(text) };
  }

  return null;
};

/**
 * Describes a payload's shape in one line — key names and type fields only,
 * never a phone number or message text.
 *
 * Logged when no text could be extracted. Without it there is no way to tell
 * a delivery-status event apart from a payload format the parser does not
 * recognise yet.
 */
const describePayloadShape = (body) => {
  if (!body || typeof body !== "object") return `type=${typeof body}`;

  const parts = [`keys=[${Object.keys(body).join(",")}]`];

  if (body.type) parts.push(`body.type=${body.type}`);
  if (body.payload?.type) parts.push(`payload.type=${body.payload.type}`);

  const value = body.entry?.[0]?.changes?.[0]?.value;
  if (value) {
    parts.push(`value.keys=[${Object.keys(value).join(",")}]`);
    if (value.messages?.[0]?.type) {
      parts.push(`message.type=${value.messages[0].type}`);
    }
    if (Array.isArray(value.statuses)) {
      parts.push(`statuses=${value.statuses.length}`);
    }
  }

  return parts.join(" ");
};

/** Wraps a code into the response shape, along with its wa.me deep link. */
const buildLoginResponse = (token, businessNumber, expiresInSeconds) => {
  const waNumber = String(businessNumber).replace(/\D/g, "");

  // A bare code gives the customer no idea what they are about to send, and
  // many people edit or delete it. The parser finds the code anywhere in the
  // text, so the surrounding sentence costs nothing.
  const prefilledText = `Log me in to UrbanNook. Code: ${token}`;

  return {
    statusCode: 200,
    message: "WhatsApp login token generated",
    data: {
      token,
      // The user only has to press send — the text is prefilled
      waLink: `https://wa.me/${waNumber}?text=${encodeURIComponent(prefilledText)}`,
      expiresInSeconds,
    },
    success: true,
  };
};

/**
 * Returns a login code — the caller's existing one if it is still pending,
 * otherwise a fresh one.
 */
const startWhatsAppLogin = async (requestIp = null, existingToken = null) => {
  const businessNumber = env.GUPSHUP_WHATSAPP_NUMBER;
  if (!businessNumber) {
    throw new InternalServerError(
      "GUPSHUP_WHATSAPP_NUMBER is not configured",
    );
  }

  // Reuse a live pending code instead of minting a new one on every click.
  //
  // Minting a new code each time fails badly: the old prefilled message is
  // still sitting in WhatsApp, the user sends that one, the server verifies
  // it, and the browser keeps waiting on a code that will never arrive.
  // Handing back the same code keeps those older messages valid.
  if (existingToken && typeof existingToken === "string") {
    const reusable = await WhatsAppLoginToken.findOne({
      token: existingToken.trim().toUpperCase(),
      status: "PENDING",
      expiresAt: { $gt: new Date() },
    });

    if (reusable) {
      return buildLoginResponse(
        reusable.token,
        businessNumber,
        Math.max(
          Math.floor((reusable.expiresAt.getTime() - Date.now()) / 1000),
          1,
        ),
      );
    }
  }

  const token = generateTokenString();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000);

  await WhatsAppLoginToken.create({
    token,
    status: "PENDING",
    requestIp,
    expiresAt,
  });

  return buildLoginResponse(token, businessNumber, TOKEN_TTL_SECONDS);
};

/**
 * Handles an inbound WhatsApp message: match the code, treat the phone as
 * verified, find or create the user, and mark the code VERIFIED.
 *
 * Never throws — the webhook must answer 200 in every case.
 * @returns {{ handled: boolean, reason?: string }}
 */
const handleInboundMessage = async (body) => {
  const inbound = extractInboundText(body);
  if (!inbound) {
    console.warn(
      `[WHATSAPP AUTH] No text in payload — ${describePayloadShape(body)}`,
    );
    return { handled: false, reason: "NOT_A_TEXT_MESSAGE" };
  }

  const match = inbound.text.toUpperCase().match(TOKEN_REGEX);
  if (!match) {
    // Text arrived but held no code. The length tells us whether the message
    // was empty or the user wrote something of their own.
    console.warn(
      `[WHATSAPP AUTH] No login code in message (text length=${inbound.text.length})`,
    );
    return { handled: false, reason: "NO_TOKEN_IN_TEXT" };
  }

  const token = match[0];
  const mobileNumber = normalizeIndianMobile(inbound.phone);
  if (!mobileNumber) {
    console.warn("[WHATSAPP AUTH] Could not normalize the sender number");
    return { handled: false, reason: "INVALID_SENDER" };
  }

  // Only PENDING and unexpired codes are accepted, which blocks replays
  const loginToken = await WhatsAppLoginToken.findOne({
    token,
    status: "PENDING",
    expiresAt: { $gt: new Date() },
  });

  if (!loginToken) {
    console.warn(
      `[WHATSAPP AUTH] Unknown or expired code ${token} from ${maskMobile(mobileNumber)}`,
    );
    return { handled: false, reason: "TOKEN_NOT_FOUND" };
  }

  const user = await findOrCreateWhatsAppUser(mobileNumber);

  loginToken.status = "VERIFIED";
  loginToken.mobileNumber = mobileNumber;
  loginToken.userId = user.userId;
  await loginToken.save();

  // The code is logged because it is single use and already consumed by now.
  // Without it there is no way to tell whether the code the browser is
  // waiting on is the one that actually arrived.
  console.log(
    `[WHATSAPP AUTH] Verified ${token} from ${maskMobile(mobileNumber)} -> userId ${user.userId}`,
  );

  return { handled: true };
};

/**
 * Finds the user by phone, creating one when there is no match.
 *
 * A WhatsApp-only user has no email, but user.model.js requires userId, name
 * and email. So a placeholder email is generated on @wa.urbannook.in (a
 * non-routable internal domain), and userId uses the same uuid7() as Google
 * login so the auth guard's User.findOne({ userId }) keeps working.
 */
const findOrCreateWhatsAppUser = async (mobileNumber) => {
  let user = await User.findOne({ mobileNumber });

  if (user) {
    // WhatsApp has proven the number, so an older unverified account can be
    // treated as verified
    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }
    return user;
  }

  user = await User.create({
    userId: uuid7(),
    name: `User ${String(mobileNumber).slice(-4)}`,
    email: `${mobileNumber}@wa.urbannook.in`,
    password: null,
    mobileNumber,
    isVerified: true,
    role: "USER",
  });

  return user;
};

/**
 * Reports a code's status to the polling frontend.
 *
 * A VERIFIED code is deleted as it is read (single use) and fresh access and
 * refresh tokens are minted. The controller sets the cookies, exactly as the
 * other login flows do.
 */
const checkWhatsAppLoginStatus = async (token) => {
  if (!token || typeof token !== "string") {
    throw new ValidationError("Token is required");
  }

  const normalized = token.trim().toUpperCase();

  // Take a VERIFIED code atomically so two parallel polls cannot both be
  // handed a session
  const verified = await WhatsAppLoginToken.findOneAndDelete({
    token: normalized,
    status: "VERIFIED",
    expiresAt: { $gt: new Date() },
  });

  if (verified) {
    const user = await User.findOne({ userId: verified.userId });
    if (!user) {
      throw new AuthenticationError("User not found for verified login token");
    }

    const userAccessToken = user.genAccessToken();
    const userRefreshToken = user.genRefreshToken();

    user.userRefreshToken = userRefreshToken;
    await user.save();

    return {
      statusCode: 200,
      message: "WhatsApp login successful",
      data: {
        status: "VERIFIED",
        userAccessToken,
        userRefreshToken,
        user: {
          userId: user.userId,
          name: user.name,
          email: user.email,
          mobileNumber: user.mobileNumber,
          role: user.role,
        },
      },
      success: true,
    };
  }

  const pending = await WhatsAppLoginToken.findOne({
    token: normalized,
    status: "PENDING",
    expiresAt: { $gt: new Date() },
  }).lean();

  return {
    statusCode: 200,
    message: pending ? "Waiting for WhatsApp message" : "Login token expired",
    data: { status: pending ? "PENDING" : "EXPIRED" },
    success: true,
  };
};

export {
  startWhatsAppLogin,
  describePayloadShape,
  handleInboundMessage,
  checkWhatsAppLoginStatus,
  verifyWebhookSecret,
  normalizeIndianMobile,
  extractInboundText,
};
