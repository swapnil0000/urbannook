/**
 * COD → prepaid: once a COD order's advance is paid, offer the balance as a
 * Razorpay payment link with the COD fee waived. Paid in time, the order ships
 * as prepaid — no cash at the door, no COD fee, no COD return risk.
 *
 * Lifecycle of order.codConversion.status:
 *   pending   set in the same write that marks the order PAID (rp.payment.controller),
 *             so admin holds dispatch from the very first moment
 *   creating  this service claimed it and is calling Razorpay
 *   sent      link exists; admin holds the courier push until expiresAt (+ buffer)
 *   failed    Razorpay refused the link — the order stays an ordinary COD order
 *   paid      balance paid online; paymentMethod → PREPAID, COD fee taken off the total
 *   expired / cancelled   link closed unpaid — ordinary COD order
 *   refunded  paid, but the order could no longer switch (already with the courier,
 *             cancelled, amount mismatch) — the link payment was refunded at once
 *
 * Admin side: utils/codPrepaidLinkHold.js in urbannook-admin reads the same fields.
 * On by default; COD_PREPAID_LINK_ENABLED=false (Infisical) switches it off. Never
 * throws into the payment flow: a failure here leaves an ordinary COD order.
 *
 * A paid link is applied by the `payment_link.paid` webhook, and also by
 * reconcileCodPrepaidLinks (cron, every 5 minutes), which asks Razorpay directly —
 * so a missing webhook subscription or a lost delivery can never leave a paid
 * link on an order the courier then collects cash for.
 */
import env from "../config/envConfigSetup.js";
import Order from "../model/order.model.js";
// Namespace import: tests that mock this module with only the order helpers keep working.
import * as razorpay from "./rp.payement.service.js";
import { isPlaceholderEmail } from "../utils/placeholderEmail.js";
import sendAlert from "../utils/alertSystem.js";
import { sendCodPayLinkWhatsApp } from "./whatsapp.send.service.js";

export const COD_LINK_WINDOW_MINUTES = 120;
export const COD_LINK_PURPOSE = "cod_to_prepaid";

export const isCodPrepaidLinkEnabled = () => env.COD_PREPAID_LINK_ENABLED !== "false";

const rupees = (v) => Math.round(Number(v) * 100) / 100;

/** What the link charges: the COD balance minus the waived COD fee. 0 = nothing to offer. */
export const codLinkAmount = (order) => {
  if (order?.paymentMethod !== "COD" || order?.isMagicOrder || order?.isInternalTestOrder) return 0;
  const remaining = Number(order.codDetails?.remainingAmount) || 0;
  const fee = Number(order.codDetails?.codFee) || 0;
  return Math.max(0, Math.ceil(remaining - fee));
};

/** Spread into the $set that marks a COD order PAID. */
export const codLinkPendingFields = (order, now = new Date()) =>
  isCodPrepaidLinkEnabled() && codLinkAmount(order) >= 1 && !order?.codConversion?.status
    ? { codConversion: { status: "pending", requestedAt: now } }
    : {};

const contactOf = (order) => {
  const mobile = String(order.userMobile || order.senderMobile || order.guestInfo?.mobile || order.deliveryAddress?.mobileNumber || "")
    .replace(/\D/g, "")
    .slice(-10);
  const email = order.userEmail && !isPlaceholderEmail(order.userEmail) ? order.userEmail : undefined;
  const name = order.userName || order.guestInfo?.name || order.deliveryAddress?.fullName || "Customer";
  return { mobile: mobile.length === 10 ? mobile : undefined, email, name };
};

/**
 * Create the link for an order the PAID write left "pending". Called right after
 * that write; safe to call twice (the pending → creating claim runs once).
 * @returns {Promise<object|null>} the Razorpay link, or null
 */
export const offerCodPrepaidLink = async (order, now = new Date()) => {
  try {
    if (order?.codConversion?.status !== "pending") return null;
    const claimed = await Order.findOneAndUpdate(
      { _id: order._id, "codConversion.status": "pending" },
      { $set: { "codConversion.status": "creating" } },
      { new: true },
    ).lean();
    if (!claimed) return null;

    const amount = codLinkAmount(claimed);
    const fee = Number(claimed.codDetails?.codFee) || 0;
    const expiresAt = new Date(now.getTime() + COD_LINK_WINDOW_MINUTES * 60 * 1000);
    const { mobile, email, name } = contactOf(claimed);
    try {
      const link = await razorpay.razorpayCreatePaymentLinkService({
        amount: amount * 100,
        currency: "INR",
        accept_partial: false,
        expire_by: Math.floor(expiresAt.getTime() / 1000),
        reference_id: `${claimed.orderId}-cod`.slice(0, 40),
        description: fee > 0
          ? `Urban Nook order: pay ₹${amount} now and skip the ₹${fee} COD fee`
          : `Urban Nook order: pay ₹${amount} now instead of cash on delivery`,
        customer: { name, ...(mobile ? { contact: `+91${mobile}` } : {}), ...(email ? { email } : {}) },
        notify: { sms: !!mobile, email: !!email },
        reminder_enable: false,
        notes: { orderId: claimed.orderId, purpose: COD_LINK_PURPOSE },
      });
      await Order.updateOne(
        { _id: claimed._id, "codConversion.status": "creating" },
        {
          $set: {
            "codConversion.status": "sent",
            "codConversion.linkId": link.id,
            "codConversion.shortUrl": link.short_url,
            "codConversion.amount": amount,
            "codConversion.feeWaived": fee,
            "codConversion.expiresAt": expiresAt,
          },
        },
      );
      console.log(`[COD-LINK] ${claimed.orderId} | link ${link.id} ₹${amount} (fee ₹${fee} waived) until ${expiresAt.toISOString()}`);
      // WhatsApp too, once its template is approved (GUPSHUP_TEMPLATE_COD_PAY_LINK); never blocks.
      if (mobile) {
        const sent = await sendCodPayLinkWhatsApp({ mobileNumber: mobile, name, amount, feeWaived: fee, url: link.short_url }).catch(() => false);
        await Order.updateOne({ _id: claimed._id }, { $set: { "codConversion.whatsappSent": !!sent } });
      }
      return link;
    } catch (err) {
      const reason = String(err?.error?.description || err?.message || err).slice(0, 300);
      await Order.updateOne(
        { _id: claimed._id, "codConversion.status": "creating" },
        { $set: { "codConversion.status": "failed", "codConversion.error": reason } },
      );
      console.error(`[COD-LINK] ${claimed.orderId} | link not created, stays COD: ${reason}`);
      return null;
    }
  } catch (err) {
    console.error(`[COD-LINK] offer failed for ${order?.orderId}: ${err.message}`);
    return null;
  }
};

const refundLinkPayment = async (order, payment, why) => {
  try {
    const refund = await razorpay.razorpayRefundPaymentService(payment.id, { notes: { orderId: order.orderId, reason: why } });
    await Order.updateOne(
      { _id: order._id },
      { $set: { "codConversion.status": "refunded", "codConversion.paymentId": payment.id, "codConversion.refundId": refund?.id || null, "codConversion.error": why } },
    );
    console.warn(`[COD-LINK] ${order.orderId} | link paid but order cannot switch (${why}); refunded ${payment.id}`);
    return { refunded: true, why };
  } catch (err) {
    const reason = String(err?.error?.description || err?.message || err).slice(0, 300);
    await Order.updateOne(
      { _id: order._id },
      { $set: { "codConversion.status": "refund_failed", "codConversion.paymentId": payment.id, "codConversion.error": `${why}; refund failed: ${reason}` } },
    );
    await sendAlert(`COD link paid for order ${order.orderId} (payment ${payment.id}) but the order could not switch to prepaid (${why}) and the automatic refund FAILED: ${reason}. Refund it from the Razorpay dashboard.`).catch(() => {});
    return { refunded: false, why };
  }
};

/** `payment_link.paid` webhook. Idempotent: a redelivery finds the order already switched. */
export const applyCodLinkPaid = async ({ link, payment }) => {
  if (link?.notes?.purpose !== COD_LINK_PURPOSE) return { ignored: "not_ours" };
  const order = await Order.findOne({ "codConversion.linkId": link.id }).lean();
  if (!order) {
    console.warn(`[COD-LINK] payment_link.paid for unknown link ${link.id}`);
    return { ignored: "no_order" };
  }
  if (["paid", "refunded", "refund_failed"].includes(order.codConversion.status)) return { already: order.codConversion.status };

  const expected = Number(order.codConversion.amount) * 100;
  if (Number(payment?.amount) !== expected) return refundLinkPayment(order, payment, `amount ${payment?.amount} ≠ expected ${expected} paise`);

  const now = new Date();
  const fee = Number(order.codConversion.feeWaived) || 0;
  const converted = await Order.findOneAndUpdate(
    // Not yet with the courier as COD, still a live paid COD order, still this link.
    { _id: order._id, status: "PAID", paymentMethod: "COD", "codConversion.linkId": link.id, isPushedToShipmozo: { $ne: true } },
    {
      $set: {
        paymentMethod: "PREPAID",
        amount: rupees(order.amount - fee),
        "codDetails.remainingAmount": 0,
        "codDetails.codFee": 0,
        "codConversion.status": "paid",
        "codConversion.paymentId": payment.id,
        "codConversion.paidAt": now,
      },
      $push: {
        statusHistory: {
          status: "PAID",
          timestamp: now,
          note: `Balance ₹${order.codConversion.amount} paid online (${payment.id}); ₹${fee} COD fee waived. Ship as prepaid.`,
        },
      },
    },
    { new: true },
  );
  if (converted) {
    console.log(`[COD-LINK] ${order.orderId} | converted to prepaid by ${payment.id}`);
    return { converted: true };
  }
  // The webhook and the reconcile cron can apply the same payment at the same
  // moment: if the other one just converted it, this is not a conflict to refund.
  const now2 = await Order.findById(order._id).select("codConversion").lean();
  if (now2?.codConversion?.status === "paid" && now2.codConversion.paymentId === payment.id) return { already: "paid" };
  return refundLinkPayment(order, payment, "order already with the courier, cancelled or changed");
};

/** `payment_link.expired` / `payment_link.cancelled`: the order stays COD. */
export const markCodLinkClosed = async ({ link, status }) => {
  if (link?.notes?.purpose !== COD_LINK_PURPOSE) return;
  await Order.updateOne({ "codConversion.linkId": link.id, "codConversion.status": "sent" }, { $set: { "codConversion.status": status } });
};

/**
 * Cron safety net (cron/codPrepaidLink.reconcile.js). For every order whose link
 * is still open as far as we know, ask Razorpay: paid → apply it exactly as the
 * webhook would; expired / cancelled → close it. Also finishes links whose
 * creation was interrupted (a restart between the PAID write and the Razorpay
 * call). Admin holds the courier until expiry + 10 min, so a link paid in time is
 * always applied before the order can ship.
 */
export const reconcileCodPrepaidLinks = async (now = new Date()) => {
  const summary = { checked: 0, converted: 0, closed: 0, retried: 0, failed: 0 };

  const stalePending = await Order.find({
    "codConversion.status": "pending",
    "codConversion.requestedAt": { $lt: new Date(now.getTime() - 2 * 60 * 1000) },
  }).limit(20).lean();
  for (const order of stalePending) {
    if (await offerCodPrepaidLink(order, now)) summary.retried++;
  }
  // "creating" for 10+ minutes: the Razorpay call never came back. Admin stops
  // holding at the same point, so the order goes as ordinary COD.
  const stuck = await Order.updateMany(
    { "codConversion.status": "creating", "codConversion.requestedAt": { $lt: new Date(now.getTime() - 10 * 60 * 1000) } },
    { $set: { "codConversion.status": "failed", "codConversion.error": "link creation did not finish" } },
  );
  summary.failed += stuck.modifiedCount || 0;

  const open = await Order.find({ "codConversion.status": "sent", "codConversion.linkId": { $exists: true } })
    .select("codConversion")
    .limit(100)
    .lean();
  for (const order of open) {
    summary.checked++;
    try {
      const link = await razorpay.razorpayFetchPaymentLinkService(order.codConversion.linkId);
      if (link?.status === "paid") {
        const p = (link.payments || []).find((x) => x.status === "captured") || (link.payments || [])[0];
        if (!p) continue;
        const result = await applyCodLinkPaid({ link, payment: { id: p.payment_id, amount: p.amount } });
        if (result.converted) summary.converted++;
      } else if (link?.status === "expired" || link?.status === "cancelled") {
        await markCodLinkClosed({ link, status: link.status });
        summary.closed++;
      }
    } catch (err) {
      console.error(`[COD-LINK] reconcile ${order.codConversion.linkId}: ${err?.error?.description || err.message}`);
    }
  }
  return summary;
};
