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

/* Login token 5 minute me expire — OTP jitna hi window */
const TOKEN_TTL_SECONDS = 5 * 60;

/* Crockford-style alphabet: 0/O aur 1/I/L jaise confusing chars nikaal diye
   kyunki user ko ye token WhatsApp me type/paste karna hota hai */
const TOKEN_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const TOKEN_LENGTH = 10;
const TOKEN_PREFIX = "UN-";

/* Token ka shape — inbound message me isi se match karte hain */
const TOKEN_REGEX = new RegExp(
  `${TOKEN_PREFIX}[${TOKEN_ALPHABET}]{${TOKEN_LENGTH}}`,
);

/**
 * Cryptographically random login token banata hai.
 * 30^10 ≈ 5.9e14 combinations — 5 min window me brute-force practical nahi.
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
 * Indian mobile number ko 10-digit pe normalize karta hai.
 *
 * Gupshup `from` country code ke saath deta hai (919876543210), jabki
 * existing users ka mobileNumber 10-digit hai. Bina normalize kiye
 * findOne match nahi karega aur same banda ka duplicate account ban jayega.
 *
 * @param {string|number} raw
 * @returns {number|null} 10-digit number, ya null agar valid nahi
 */
const normalizeIndianMobile = (raw) => {
  if (raw === null || raw === undefined) return null;

  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;

  let local = digits;
  if (local.length === 12 && local.startsWith("91")) local = local.slice(2);
  else if (local.length === 11 && local.startsWith("0")) local = local.slice(1);

  // Indian mobile: 10 digits, 6-9 se shuru
  if (!/^[6-9]\d{9}$/.test(local)) return null;

  return Number(local);
};

/** Logs me pura number na jaye — 98XXXXXX10 */
const maskMobile = (mobile) => {
  const s = String(mobile ?? "");
  if (s.length < 4) return "****";
  return `${s.slice(0, 2)}${"X".repeat(s.length - 4)}${s.slice(-2)}`;
};

/**
 * Gupshup webhook ka shared secret verify karta hai.
 *
 * Ye endpoint login grant karta hai, isliye open chhodna matlab koi bhi
 * banda forged payload POST karke kisi bhi number ka session bana lega.
 * Secret query param (?secret=) ya x-webhook-secret header, dono chalte hain.
 *
 * @returns {boolean}
 */
const verifyWebhookSecret = (req) => {
  const expected = env.GUPSHUP_WEBHOOK_SECRET;

  if (!expected) {
    console.error(
      "[WHATSAPP AUTH] GUPSHUP_WEBHOOK_SECRET set nahi hai — inbound payload process nahi kiya ja raha",
    );
    return false;
  }

  const provided =
    req.query?.secret || req.headers?.["x-webhook-secret"] || "";

  if (!provided) return false;

  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));

  // timingSafeEqual same length maangta hai — length mismatch = fail
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

/**
 * Inbound payload se sender phone + text nikalta hai.
 *
 * Do format support karte hain kyunki Gupshup dashboard ka
 * "Payload Format" toggle badal sakta hai:
 *   - Meta format (v3): entry[].changes[].value.messages[]
 *   - Gupshup native:   { type:"message", payload:{ sender, payload:{text} } }
 *
 * Delivery/read status events (value.statuses, type:"message-event") ko
 * yahan ignore kar dete hain — wo bhi isi webhook pe aate hain.
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
 * Naya login token banata hai aur wa.me deep link return karta hai.
 */
const startWhatsAppLogin = async (requestIp = null) => {
  const businessNumber = env.GUPSHUP_WHATSAPP_NUMBER;
  if (!businessNumber) {
    throw new InternalServerError(
      "GUPSHUP_WHATSAPP_NUMBER .env me configure nahi hai",
    );
  }

  const token = generateTokenString();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000);

  await WhatsAppLoginToken.create({
    token,
    status: "PENDING",
    requestIp,
    expiresAt,
  });

  const waNumber = String(businessNumber).replace(/\D/g, "");

  return {
    statusCode: 200,
    message: "WhatsApp login token generated",
    data: {
      token,
      // User ko bas send dabana hai — text pehle se bhara aata hai
      waLink: `https://wa.me/${waNumber}?text=${encodeURIComponent(token)}`,
      expiresInSeconds: TOKEN_TTL_SECONDS,
    },
    success: true,
  };
};

/**
 * Inbound WhatsApp message handle karta hai: token match karo, phone
 * verify maano, user find/create karo, token ko VERIFIED mark karo.
 *
 * Ye kabhi throw nahi karta — webhook ko har haal me 200 chahiye.
 * @returns {{ handled: boolean, reason?: string }}
 */
const handleInboundMessage = async (body) => {
  const inbound = extractInboundText(body);
  if (!inbound) return { handled: false, reason: "NOT_A_TEXT_MESSAGE" };

  const match = inbound.text.toUpperCase().match(TOKEN_REGEX);
  if (!match) return { handled: false, reason: "NO_TOKEN_IN_TEXT" };

  const token = match[0];
  const mobileNumber = normalizeIndianMobile(inbound.phone);
  if (!mobileNumber) {
    console.warn("[WHATSAPP AUTH] Sender number normalize nahi hua");
    return { handled: false, reason: "INVALID_SENDER" };
  }

  // PENDING + non-expired hi accept — replay/reuse band
  const loginToken = await WhatsAppLoginToken.findOne({
    token,
    status: "PENDING",
    expiresAt: { $gt: new Date() },
  });

  if (!loginToken) {
    console.warn(
      `[WHATSAPP AUTH] Unknown/expired token from ${maskMobile(mobileNumber)}`,
    );
    return { handled: false, reason: "TOKEN_NOT_FOUND" };
  }

  const user = await findOrCreateWhatsAppUser(mobileNumber);

  loginToken.status = "VERIFIED";
  loginToken.mobileNumber = mobileNumber;
  loginToken.userId = user.userId;
  await loginToken.save();

  console.log(
    `[WHATSAPP AUTH] Verified ${maskMobile(mobileNumber)} -> userId ${user.userId}`,
  );

  return { handled: true };
};

/**
 * Phone se user dhoondta hai, warna naya banata hai.
 *
 * WhatsApp se aaye user ke paas email nahi hota, par user.model.js me
 * email/name/userId teeno required hain — isliye placeholder email
 * generate karte hain (@wa.urbannook.in, ek non-routable internal domain)
 * aur userId wahi uuid7() jo Google login use karta hai, taki auth guard
 * ka User.findOne({ userId }) normally kaam kare.
 */
const findOrCreateWhatsAppUser = async (mobileNumber) => {
  let user = await User.findOne({ mobileNumber });

  if (user) {
    // Phone WhatsApp se verify ho chuka hai — purana unverified account
    // ab verified maana ja sakta hai
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
 * Frontend polling: token ka status batata hai.
 *
 * VERIFIED mile to token wahin delete kar dete hain (one-time use) aur
 * fresh access/refresh tokens mint karte hain. Cookies controller set
 * karta hai — baaki login flows ki tarah.
 */
const checkWhatsAppLoginStatus = async (token) => {
  if (!token || typeof token !== "string") {
    throw new ValidationError("Token is required");
  }

  const normalized = token.trim().toUpperCase();

  // VERIFIED ho to atomically nikaal lo — do parallel poll dono ko
  // session na de dein
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
  handleInboundMessage,
  checkWhatsAppLoginStatus,
  verifyWebhookSecret,
  normalizeIndianMobile,
  extractInboundText,
};
