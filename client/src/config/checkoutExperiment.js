import config from "./env";
import { getAnonymousId } from "../utils/analytics";

// Magic (Express) vs the standard checkout. Magic prepaid orders were failing
// ~72% of the time (306 failed vs 115 paid in 30 days), while the standard
// Razorpay modal took the COD advance 83% of the time. Half the shoppers keep
// Express; the other half go through Contact → Address → Review and pay in the
// standard modal. Every order records its arm (server/src/utils/checkoutExperiment.js),
// so the two halves' paid orders can be compared directly.
//
// To end the trial: magicShare 1 keeps Magic for everyone, 0 turns it off.
export const CHECKOUT_EXPERIMENT = { name: "magic_vs_standard_2026_11", magicShare: 0.5 };

// FNV-1a: the same browser always lands in the same half, across visits and
// login/logout (the anonymous id survives both).
const bucket = (id) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h / 2 ** 32;
};

/** "magic" | "standard", or null when Magic is off in this build (no trial to run). */
export const getCheckoutArm = () => {
  if (!config.features.enableMagicCheckout) return null;
  const id = getAnonymousId();
  // No storage → no stable id; keep today's behaviour rather than flip-flopping per visit.
  if (!id) return "magic";
  return bucket(id) < CHECKOUT_EXPERIMENT.magicShare ? "magic" : "standard";
};
