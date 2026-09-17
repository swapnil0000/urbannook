import Event from "../model/event.model.js";
import { storeAuthoritativeEvent } from "./event.service.js";

/**
 * Server-side `purchase` event.
 *
 * WHY THIS EXISTS
 * The browser fires `purchase` from the Razorpay success handler, but that hit
 * is lost whenever an ad-blocker eats the request, the customer closes the tab
 * on the confirmation redirect, or the payment is confirmed later by webhook
 * (FAILED → PAID recovery) with no browser in the loop at all. Admin revenue
 * was therefore always an undercount of real orders. The Razorpay webhook is
 * the one place that learns about every captured payment, so it writes the
 * authoritative row here.
 *
 * NOT DOUBLE COUNTED: both writers key on `purchase:<orderId>` and the unique
 * sparse index on Event.dedupeKey collapses them into one row. The browser
 * only $setOnInsert-s; this writer $set-s and therefore wins.
 */

/**
 * The webhook has no browser context, so it cannot know which channel brought
 * this customer in. Recover it from the events that device already sent — the
 * first-touch `attribution` block (utm_*, gclid, channel) is stamped on every
 * one of them by the client. Without this, every server-written purchase would
 * land in the `unknown` channel bucket and Google-organic revenue would read as
 * zero in the channels report.
 *
 * Looks up by device id first (works for guests, who are the bulk of traffic),
 * then falls back to the account id.
 */
async function recoverAttribution({ anonymousId, userId }) {
  const or = [];
  if (anonymousId) or.push({ anonymousId });
  if (userId) or.push({ userId });
  if (!or.length) return {};

  const prior = await Event.findOne(
    { $or: or, "attribution.channel": { $exists: true } },
    "attribution",
  )
    .sort({ createdAt: 1 }) // earliest = the true first touch for this device
    .lean();

  return prior?.attribution || {};
}

/** Map an order's line items → the same GA4 item shape the client sends. */
function toItems(order) {
  return (order.items || []).map((i) => {
    const snap = i.productSnapshot || {};
    const item = {
      item_id: i.productId,
      item_name: snap.productName,
      price: snap.priceAtPurchase,
      quantity: snap.quantity,
    };
    if (snap.selectedVariant && snap.selectedVariant !== "N/A") {
      item.item_variant = snap.selectedVariant;
    }
    if (snap.productCategory) item.item_category = snap.productCategory;
    if (snap.productSubCategory) item.item_category2 = snap.productSubCategory;
    return item;
  });
}

/**
 * Record the authoritative purchase for a PAID order.
 * Never throws — analytics must not be able to fail a payment webhook.
 *
 * @param {object} order   the Order document, already marked PAID
 * @param {object} [opts]
 * @param {string} [opts.recoveredFrom]  set when this was a late FAILED→PAID
 *                                       recovery, so those can be told apart
 *                                       from normal captures in reporting
 */
export async function recordServerPurchase(order, opts = {}) {
  try {
    if (!order?.orderId) return;

    const anonymousId = order.metaTracking?.anonymousId || null;
    const attribution = await recoverAttribution({
      anonymousId,
      userId: order.userId,
    });

    await storeAuthoritativeEvent({
      dedupeKey: `purchase:${order.orderId}`,
      eventName: "purchase",
      userId: order.userId || null,
      // Keeps the purchase on the same device timeline as that visitor's
      // view_item / add_to_cart events, so funnels join end to end.
      anonymousId: anonymousId || `order_${order.orderId}`,
      sessionId: null,
      properties: {
        transaction_id: order.payment?.razorpayPaymentId || order.orderId,
        order_id: order.orderId,
        value: order.amount,
        currency: "INR",
        shipping: order.shippingInfo?.amount || 0,
        tax: 0,
        payment_method: order.paymentMethod || null,
        is_guest: !!order.isGuestOrder,
        ...(order.coupon?.isApplied
          ? {
              coupon: order.coupon.couponCodeName,
              discount: order.coupon.discountAmount || 0,
            }
          : {}),
        ...(opts.recoveredFrom ? { recovered_from: opts.recoveredFrom } : {}),
        source: "server_webhook",
        items: toItems(order),
      },
      attribution,
      url: null,
      path: null,
      referrer: null,
      ip: order.metaTracking?.clientIp || null,
      userAgent: order.metaTracking?.clientUserAgent || null,
      eventTime: new Date(),
    });

    console.log(
      `[Analytics] server purchase recorded order=${order.orderId} value=${order.amount} channel=${attribution.channel || "unknown"}`,
    );
  } catch (err) {
    // Swallow: a failed analytics write must never break payment processing.
    console.warn("[Analytics] server purchase record failed:", err.message);
  }
}

export default { recordServerPurchase };
