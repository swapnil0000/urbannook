/**
 * WhatsApp login gives us a verified phone number but no email, while
 * user.model.js requires one. So those accounts get a placeholder address on
 * a domain that intentionally has no mail server.
 *
 * Nothing may ever be sent to it. A bounce to a non-existent domain costs us
 * sending reputation, and at volume it gets the real transactional mail
 * (order confirmations, receipts) filtered or blocked.
 */

export const PLACEHOLDER_EMAIL_DOMAIN = "wa.urbannook.in";

/** Builds the placeholder address for a phone-only account. */
export const buildPlaceholderEmail = (mobileNumber) =>
  `${mobileNumber}@${PLACEHOLDER_EMAIL_DOMAIN}`;

/** True when this address is a placeholder and must never receive mail. */
export const isPlaceholderEmail = (email) =>
  typeof email === "string" &&
  email.toLowerCase().trim().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);
