import { v7 as uuidv7 } from "uuid";
import LoyaltyConfig from "../model/loyaltyConfig.model.js";
import LoyaltyLedger, { CREDIT_TYPES } from "../model/loyaltyLedger.model.js";
import { ValidationError } from "../utils/errors.js";

// Used whenever no LoyaltyConfig doc exists yet (unseeded env) — isEnabled:false
// means every call below is a safe no-op until an admin turns it on.
const DEFAULT_CONFIG = {
  isEnabled: false,
  earnPercent: 2,
  earnDelayHours: 24,
  maxRedeemPercentOfCart: 20,
  pointToRupeeRatio: 1,
  referralPointsReferrer: 50,
  referralPointsReferee: 50,
  pointsExpiryDays: null,
};

let cachedConfig = null;
let cachedAt = 0;
const CONFIG_TTL_MS = 60_000; // short TTL — admin config edits shouldn't need a redeploy to take effect

export async function getLoyaltyConfig({ forceRefresh = false } = {}) {
  if (!forceRefresh && cachedConfig && Date.now() - cachedAt < CONFIG_TTL_MS) {
    return cachedConfig;
  }
  const doc = await LoyaltyConfig.findOne().lean();
  cachedConfig = doc ? { ...DEFAULT_CONFIG, ...doc } : DEFAULT_CONFIG;
  cachedAt = Date.now();
  return cachedConfig;
}

// A user's balance is never stored — always the running total of their ledger.
export async function getUserBalance(userId) {
  if (!userId) return 0;
  const last = await LoyaltyLedger.findOne({ userId }).sort({ createdAt: -1 }).lean();
  return last?.balanceAfter ?? 0;
}

// min(balance, cartValue * maxRedeemPercentOfCart%) — the ceiling that stops
// a user from ever zeroing out a cart with points alone.
export function computeRedeemCap(balance, cartValue, config) {
  const cap = Math.floor((cartValue * config.maxRedeemPercentOfCart) / 100);
  return Math.max(0, Math.min(balance, cap));
}

// Validates a checkout's requested point redemption against the live balance
// and cap, and prices the resulting discount. Returns zeros (no-op) when the
// feature is disabled or nothing was requested — safe to call unconditionally.
export async function validateAndPriceRedeem({ userId, cartValue, requestedPoints }) {
  const config = await getLoyaltyConfig();
  const balanceBeforeOrder = await getUserBalance(userId);

  if (!config.isEnabled || !requestedPoints) {
    return { pointsRedeemed: 0, discountFromPoints: 0, balanceBeforeOrder, config };
  }

  const maxRedeemable = computeRedeemCap(balanceBeforeOrder, cartValue, config);
  const pointsRedeemed = Math.max(0, Math.floor(requestedPoints));
  if (pointsRedeemed > maxRedeemable) {
    throw new ValidationError(
      `You can redeem at most ${maxRedeemable} points on this order (balance ${balanceBeforeOrder}, cap ${config.maxRedeemPercentOfCart}% of cart value).`,
    );
  }

  const discountFromPoints = pointsRedeemed * config.pointToRupeeRatio;
  return { pointsRedeemed, discountFromPoints, balanceBeforeOrder, config };
}

// Append-only ledger write — the ONLY way a balance ever changes. `points` is
// signed (positive = credit, negative = debit). Idempotent for the four
// CREDIT_TYPES via a `${orderId}:${type}` dedupeKey (unique+sparse index) —
// a duplicate call (retried webhook, re-run cron sweep) is a silent no-op,
// never a double-credit. REVERSAL / ADMIN_ADJUST are not deduped — an order
// can legitimately need more than one.
//
// Known limitation: balanceAfter is computed by reading the user's latest
// ledger row, not inside a transaction. Two concurrent writes for the same
// user (rare — checkout is per-order, cron sweeps are per-order too) could
// read the same "previous balance" and produce an inconsistent balanceAfter
// snapshot. The running total itself stays correct (each row's `points` is
// still summed correctly by getUserBalance), only a stale balanceAfter
// display value would be possible. Acceptable for now — matches the rest of
// this codebase's non-transactional style; revisit with a session/transaction
// if concurrent redemption ever becomes a real pattern (e.g. multi-tab checkout).
export async function writeLedgerEntry({
  userId,
  orderId = null,
  orderType = "WEBSITE",
  type,
  points,
  reason = "",
  createdBy = "system",
  reversesLedgerId = null,
}) {
  const dedupeKey = orderId && CREDIT_TYPES.includes(type) ? `${orderId}:${type}` : null;
  const prevBalance = await getUserBalance(userId);
  const balanceAfter = prevBalance + points;

  try {
    return await LoyaltyLedger.create({
      ledgerId: uuidv7(),
      userId,
      orderId,
      orderType,
      type,
      points,
      balanceAfter,
      reversesLedgerId,
      reason,
      createdBy,
      dedupeKey,
    });
  } catch (err) {
    if (err?.code === 11000) return null; // already written — idempotent no-op
    throw err;
  }
}
