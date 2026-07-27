import env from "./envConfigSetup.js";

/**
 * WebAuthn / passkey Relying Party (RP) configuration.
 *
 * - rpID:  the registrable domain the passkey is bound to (NO scheme/port).
 *          dev = "localhost"; prod = "urbannook.in".
 * - rpName: human-readable name shown in the OS passkey prompt.
 * - expectedOrigin: the exact origin(s) the CLIENT page is served from
 *          (scheme + host + port). Passkeys are bound to the page origin,
 *          not the API origin.
 *
 * Set these in production .env:
 *   RP_ID=urbannook.in
 *   RP_NAME=UrbanNook
 *   RP_ORIGIN=https://urbannook.in,https://www.urbannook.in
 */
export const rpID = env.RP_ID || "localhost";
export const rpName = env.RP_NAME || "UrbanNook";
export const expectedOrigin = (
  env.RP_ORIGIN || "http://localhost:3000,http://localhost:5173"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
