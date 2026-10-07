/**
 * GA4 Measurement Protocol — server-side fallback `purchase`.
 *
 * WHY THIS EXISTS
 * The browser gtag `purchase` (CheckoutPage → trackPurchase) is what GA4 and,
 * through the GA4 import, Google Ads count. It is lost whenever an ad-blocker
 * eats gtag, the customer closes the tab before the Razorpay handler runs, or
 * the payment is only confirmed later by webhook (FAILED → PAID recovery).
 * This sends the same purchase from the Razorpay webhook so those sales still
 * reach GA4 / Google Ads.
 *
 * NOT DOUBLE COUNTED: `transaction_id` is the Razorpay order id — the exact
 * value the browser sends — and GA4 dedupes purchases on transaction_id. The
 * client/session ids captured at checkout (order.metaTracking.gaClientId /
 * gaSessionId) put this hit on the same GA4 user and session, which is also
 * what keeps the Google Ads click attribution.
 *
 * Config: GA4_MEASUREMENT_ID (defaults to the site stream) and GA4_API_SECRET
 * (GA4 → Admin → Data streams → web stream → Measurement Protocol API secrets).
 * Without GA4_API_SECRET this is a no-op.
 */

import axios from "axios";
import env from "../config/envConfigSetup.js";
import { toItems } from "./purchaseEvent.service.js";

const MP_URL = "https://www.google-analytics.com/mp/collect";
const DEFAULT_MEASUREMENT_ID = "G-B7NGCFCRFG";

/**
 * Send the purchase for a PAID order. Never throws — analytics must not be
 * able to fail a payment webhook.
 */
export async function sendGa4ServerPurchase(order) {
  try {
    const apiSecret = env.GA4_API_SECRET;
    const measurementId = env.GA4_MEASUREMENT_ID || DEFAULT_MEASUREMENT_ID;
    if (!apiSecret) {
      console.warn(`[GA4 MP] GA4_API_SECRET not set — skipping purchase order=${order?.orderId}`);
      return;
    }
    if (!order?.orderId) return;

    const tracking = order.metaTracking || {};
    // No browser client id means gtag never ran for this buyer (blocked), so
    // there is no browser hit to collide with — a synthetic id is safe.
    const clientId = tracking.gaClientId || `${Date.now()}.${order.orderId}`;
    const sessionId = Number(tracking.gaSessionId);

    const params = {
      transaction_id: order.payment?.razorpayOrderId || order.orderId,
      value: order.amount,
      currency: "INR",
      shipping: order.shippingInfo?.amount || 0,
      tax: 0,
      items: toItems(order),
      engagement_time_msec: 1,
      ...(Number.isFinite(sessionId) && sessionId > 0 ? { session_id: sessionId } : {}),
      ...(order.coupon?.isApplied ? { coupon: order.coupon.couponCodeName } : {}),
    };

    const body = {
      client_id: clientId,
      ...(order.userId ? { user_id: String(order.userId) } : {}),
      events: [{ name: "purchase", params }],
    };

    await axios.post(MP_URL, body, {
      params: { measurement_id: measurementId, api_secret: apiSecret },
      timeout: 5000,
    });

    console.log(
      `[GA4 MP] purchase sent order=${order.orderId} txn=${params.transaction_id} value=${order.amount} browserIds=${!!tracking.gaClientId}`,
    );
  } catch (err) {
    console.warn("[GA4 MP] purchase send failed:", err.message);
  }
}

export default { sendGa4ServerPurchase };
