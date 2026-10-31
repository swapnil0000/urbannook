/**
 * Customer-facing view of an order: ONE trustworthy data contract for the order
 * confirmation page, the order details page and the Order Archive list.
 *
 * Everything here is derived from facts the system already recorded — the order's
 * frozen purchase snapshot, the captured payment, the shipment records and the
 * refunds logged by support. Nothing is recomputed from today's prices, promotions
 * or shipping rates, and a milestone is only reported when the data proves it
 * happened. Where an older order lacks a field, the view says less instead of
 * guessing.
 *
 * `buildOrderView` is pure (no DB, no clock except `now`), so every payment /
 * shipment state is unit-tested with plain fixtures.
 */

const PAID_STATUSES = ["PAID", "CONFIRMED", "SHIPPED", "DELIVERED"];
// The customer tracking page. `{awb}` is replaced per shipment; the real value (including the panel's own uid)
// is configured as SHIPMOZO_TRACK_URL, so changing the link never needs a code change.
export const DEFAULT_TRACK_URL_TEMPLATE = "https://panel.shipmozo.com/track-order?uid=rkRmyxYS6lwtOsMqIZVG&awb={awb}";
const MAX_EVENTS_PER_SHIPMENT = 30;

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const rupees = (v) => Math.round(num(v) * 100) / 100;
const isNum = (v) => v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v));
const iso = (d) => {
  if (!d) return null;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
};
// Tracking text comes from a courier feed: treat it as data. Strings only, no control chars, bounded.
const cleanText = (s, max = 200) =>
  typeof s === "string" ? s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";

// Support's "Cancel Order" in the admin panel does NOT change `status` (a paid order stays PAID); it sets resolutionStatus.
// To the customer both mean the same thing: this order is cancelled.
const isCancelled = (order) => order.status === "CANCELLED" || order.resolutionStatus === "CANCELLED";

const statusTime = (order, status) => {
  const hit = (order.statusHistory || []).find((h) => h?.status === status && h.timestamp);
  return hit ? iso(hit.timestamp) : null;
};

// ── payment ────────────────────────────────────────────────────────────────

export const isOrderPaid = (order) =>
  PAID_STATUSES.includes(order.status) ||
  // PROCESSING is also what an in-flight, unconfirmed payment is called — only a recorded payment id proves money moved.
  (["PROCESSING", "CANCELLED"].includes(order.status) && !!order.payment?.razorpayPaymentId);

const buildRefunds = (order, cases) => {
  const refunds = (cases || [])
    .flatMap((c) => c.refunds || [])
    .map((r) => ({ amount: rupees(r.amount), status: String(r.status || "").toUpperCase(), at: iso(r.processedAt || r.createdAt) }));
  const done = refunds.filter((r) => r.status === "SUCCESS");
  const inFlight = refunds.filter((r) => ["PENDING", "PROCESSING"].includes(r.status));
  const failed = refunds.filter((r) => r.status === "FAILED");

  let refunded = rupees(done.reduce((s, r) => s + r.amount, 0));
  // No refund case logged, but the finance ledger (signed, refunds are negative) recorded money returned.
  if (!done.length && !inFlight.length && !failed.length && num(order.financialSummary?.totalRefunds) < 0) {
    refunded = rupees(-num(order.financialSummary.totalRefunds));
  }
  return {
    refunded,
    inProgress: rupees(inFlight.reduce((s, r) => s + r.amount, 0)),
    failed: rupees(failed.reduce((s, r) => s + r.amount, 0)),
    lastRefundAt: done.map((r) => r.at).filter(Boolean).sort().pop() || null,
  };
};

const buildPayment = (order, cases) => {
  const total = rupees(order.amount);
  const paid = isOrderPaid(order);
  const cancelled = isCancelled(order);
  const method = order.paymentMethod === "COD" ? (num(order.codDetails?.partialAmountPaid) > 0 ? "PARTIAL_COD" : "COD") : "PREPAID";
  const advance = rupees(order.codDetails?.partialAmountPaid);

  let amountPaid = 0;
  if (paid) amountPaid = method === "PREPAID" ? total : Math.min(advance, total);

  let amountDue;
  if (cancelled) amountDue = 0;
  else if (method === "PREPAID") amountDue = paid ? 0 : total;
  else if (!paid) amountDue = total;
  else {
    const recorded = isNum(order.codDetails?.remainingAmount) ? rupees(order.codDetails.remainingAmount) : null;
    const identity = Math.max(0, rupees(total - amountPaid));
    // The recorded balance is what the courier was told to collect; it must agree with total − advance.
    // (A stored 0 is the schema default for "never set", so it can't override a balance the arithmetic says is owed.)
    amountDue = recorded !== null && recorded > 0 ? recorded : identity;
  }

  const refund = buildRefunds(order, cases);
  const netPaid = Math.max(0, rupees(amountPaid - refund.refunded));

  let state;
  if (!paid) state = order.status === "FAILED" ? "FAILED" : cancelled ? "CANCELLED" : "PENDING";
  else if (refund.refunded > 0) state = refund.refunded >= amountPaid - 0.5 ? "REFUNDED" : "PARTIALLY_REFUNDED";
  else if (refund.inProgress > 0) state = "REFUND_PROCESSING";
  else if (cancelled) state = "CANCELLED";
  else if (method === "PREPAID") state = "PAID";
  else if (amountPaid > 0) state = "ADVANCE_PAID";
  else state = "COD_DUE";

  const LABELS = {
    PAID: "Payment successful",
    ADVANCE_PAID: "Advance paid",
    COD_DUE: "Cash on delivery",
    PENDING: "Payment pending",
    FAILED: "Payment failed",
    CANCELLED: "Order cancelled",
    REFUND_PROCESSING: "Refund in progress",
    REFUNDED: "Refunded",
    PARTIALLY_REFUNDED: "Partially refunded",
  };

  const payId = order.payment?.razorpayPaymentId;
  return {
    state,
    label: LABELS[state],
    method,
    methodLabel: method === "PREPAID" ? "Paid online" : method === "PARTIAL_COD" ? "Cash on delivery with advance" : "Cash on delivery",
    orderTotal: total,
    amountPaid,
    amountDue,
    // Only the advance is online for COD; the balance is collected by the courier. Nothing records that collection.
    balanceOnDelivery: method === "PREPAID" ? 0 : amountDue,
    advanceRequired: method === "PARTIAL_COD" ? advance : 0,
    refundedAmount: refund.refunded,
    refundInProgressAmount: refund.inProgress,
    refundFailedAmount: refund.failed,
    netPaid,
    paidAt: paid ? statusTime(order, "PAID") : null,
    // The gateway's payment id is a reference (it cannot move money); it is what support and the bank statement quote.
    paymentRef: payId ? String(payId) : null,
    paymentMethodName: method === "PREPAID" ? "Razorpay" : method === "PARTIAL_COD" ? "Razorpay advance + cash on delivery" : "Cash on delivery",
  };
};

// ── items & pricing ────────────────────────────────────────────────────────

const buildItems = (order) =>
  (order.items || []).map((it, index) => {
    const s = it.productSnapshot || {};
    const quantity = Math.max(1, num(s.quantity) || 1);
    const unitPaid = rupees(s.priceAtPurchase);
    const isFreeGift = s.lineType === "FREE_GIFT" || s.isPromotionalGift === true;
    const original = isNum(s.originalUnitPrice) && num(s.originalUnitPrice) > 0 ? rupees(s.originalUnitPrice) : null;
    return {
      index,
      productId: it.productId,
      name: cleanText(s.productName, 160) || "Product",
      variantTitleTemplate: s.variantTitleTemplate || "",
      variant: s.selectedVariant && s.selectedVariant !== "N/A" ? cleanText(s.selectedVariant, 120) : null,
      variantSku: s.variantSku || null,
      image: s.productImg || null,
      quantity,
      unitPaid,
      // A free gift is shown by its worth (giftValue), not as a discounted purchase.
      unitOriginal: !isFreeGift && original && original > unitPaid ? original : null,
      lineTotal: rupees(unitPaid * quantity),
      lineSavings: !isFreeGift && original && original > unitPaid ? rupees((original - unitPaid) * quantity) : 0,
      isFreeGift,
      // The list price of a free gift is only known when the order recorded it — never guessed.
      giftValue: isFreeGift && original ? rupees(original * quantity) : null,
    };
  });

const buildPricing = (order, items, payment) => {
  const total = rupees(order.amount);
  const paidLines = items.filter((i) => !i.isFreeGift);
  const itemsNet = rupees(paidLines.reduce((s, i) => s + i.lineTotal, 0));

  // Original (pre-offer) merchandise value: the order's own snapshot, else per-line list prices when EVERY line has one.
  let merchandiseOriginal = null;
  if (num(order.promotionGrossProductSubtotal) > 0 && num(order.promotionGrossProductSubtotal) >= itemsNet) {
    merchandiseOriginal = rupees(order.promotionGrossProductSubtotal);
  } else if (paidLines.length && paidLines.every((i) => i.unitOriginal !== null || i.lineSavings === 0)) {
    const sum = rupees(paidLines.reduce((s, i) => s + (i.unitOriginal ?? i.unitPaid) * i.quantity, 0));
    if (sum > itemsNet) merchandiseOriginal = sum;
  }
  const productSavings = merchandiseOriginal ? rupees(merchandiseOriginal - itemsNet) : 0;

  const couponApplied = order.coupon?.isApplied && num(order.coupon.discountAmount) > 0;
  const couponDiscount = couponApplied ? rupees(order.coupon.discountAmount) : 0;
  const giftWrapAmount = order.giftWrap?.selected ? rupees(num(order.giftWrap.price) * Math.max(1, num(order.giftWrap.quantity) || 1)) : 0;

  const snapshotShipping = isNum(order.items?.[0]?.productSnapshot?.shipping) ? rupees(order.items[0].productSnapshot.shipping) : null;
  const recordedShipping = isNum(order.shippingInfo?.amount) ? rupees(order.shippingInfo.amount) : null;
  const residualFor = (ship) => rupees(total - (itemsNet + giftWrapAmount + ship - couponDiscount));

  // Which figure is what the customer was charged for delivery? The one that makes the receipt add up.
  // (Magic orders store Razorpay's fee on shippingInfo; every other order stores the charged amount on the lines.)
  const preferred = order.isMagicOrder ? [recordedShipping, snapshotShipping] : [snapshotShipping, recordedShipping];
  const candidates = preferred.filter((v) => v !== null);
  let shippingCharged = candidates.length ? candidates[0] : 0;
  if (candidates.length > 1 && Math.abs(residualFor(candidates[0])) > 1 && Math.abs(residualFor(candidates[1])) <= 1) shippingCharged = candidates[1];

  const residual = residualFor(shippingCharged);
  const freeShippingRecorded =
    order.freeShippingUnlocked === true || (order.appliedPromotions || []).some((p) => (p.rewardTypes || []).includes("free_shipping"));
  const shippingOriginal = shippingCharged === 0 && freeShippingRecorded && num(order.shippingInfo?.amount) > 0 ? rupees(order.shippingInfo.amount) : null;

  // A shortfall the components don't explain is a discount we were not told the source of (offer on the whole order);
  // a surplus is an unattributed charge. Either way it is shown as one honest line, never invented detail.
  const orderPromoNames = (order.appliedPromotions || []).map((p) => cleanText(p.name, 80)).filter(Boolean);
  const unexplainedDiscount = residual < -1 ? rupees(-residual) : 0;
  const unexplainedCharge = residual > 1 ? residual : 0;

  const lines = [];
  if (merchandiseOriginal && productSavings > 0) {
    lines.push({ key: "items", label: "Items", amount: merchandiseOriginal, kind: "charge" });
    lines.push({ key: "offer", label: "Offer discount", amount: -productSavings, kind: "discount", detail: orderPromoNames.join(", ") || null });
  } else {
    lines.push({ key: "items", label: "Items", amount: itemsNet, kind: "charge" });
  }
  if (unexplainedDiscount > 0) {
    lines.push({
      key: "orderOffer",
      label: orderPromoNames.length ? "Offer discount" : "Other discount",
      amount: -unexplainedDiscount,
      kind: "discount",
      detail: orderPromoNames.join(", ") || null,
    });
  }
  if (couponDiscount > 0) lines.push({ key: "coupon", label: "Coupon", amount: -couponDiscount, kind: "discount", detail: order.coupon.couponCodeName || null });
  if (giftWrapAmount > 0) lines.push({ key: "giftWrap", label: order.giftWrap?.title || "Gift wrap", amount: giftWrapAmount, kind: "charge" });
  lines.push({ key: "shipping", label: "Delivery", amount: shippingCharged, kind: "charge", original: shippingOriginal, free: shippingCharged === 0 });
  if (unexplainedCharge > 0) lines.push({ key: "adjustment", label: "Other charges", amount: unexplainedCharge, kind: "charge" });

  const freeGiftValue = rupees(items.filter((i) => i.isFreeGift).reduce((s, i) => s + (i.giftValue || 0), 0));
  const totalSavings = rupees(productSavings + couponDiscount + unexplainedDiscount + (shippingOriginal || 0) + freeGiftValue);

  return {
    lines,
    itemsSubtotal: itemsNet,
    merchandiseOriginal,
    productSavings,
    couponCode: couponApplied ? order.coupon.couponCodeName || null : null,
    couponDiscount,
    shippingCharged,
    shippingOriginal,
    giftWrapAmount,
    freeGiftValue,
    totalSavings: totalSavings > 0 ? totalSavings : null,
    total,
    // Order amount is authoritative; the lines above add up to it by construction (adjustment lines absorb any gap).
    reconciles: Math.abs(residual) <= 1,
  };
};

// ── shipments & timeline ───────────────────────────────────────────────────

const STAGE = {
  PUSHED: "preparing",
  ASSIGNED: "preparing",
  PICKUP_SCHEDULED: "preparing",
  IN_TRANSIT: "in_transit",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  RTO_INITIATED: "rto",
  RTO_DELIVERED: "rto",
  EXCEPTION: "exception",
};
const STAGE_RANK = { preparing: 0, shipped: 1, in_transit: 1, out_for_delivery: 2, delivered: 3 };

const STAGE_COPY = {
  preparing: { label: "Being prepared", message: "A courier is assigned. Tracking updates will appear once it is picked up." },
  in_transit: { label: "In transit", message: "Your parcel is on its way." },
  out_for_delivery: { label: "Out for delivery", message: "Your parcel is out for delivery today." },
  delivered: { label: "Delivered", message: "Your parcel was delivered." },
  exception: { label: "Delivery needs attention", message: "The courier couldn't complete delivery. They will try again, or contact you — keep your phone reachable." },
  rto: { label: "Returning to us", message: "This parcel couldn't be delivered and is on its way back to us. Contact support to arrange a re-delivery." },
  shipped: { label: "Shipped", message: "Your parcel has been handed to the courier." },
};

/** Tracking link for one AWB, or null. Only an https template is ever used, and the AWB is encoded into it. */
export const buildTrackUrl = (template, awb) => {
  const t = typeof template === "string" && /^https:\/\//i.test(template) && template.includes("{awb}") ? template : DEFAULT_TRACK_URL_TEMPLATE;
  return awb ? t.split("{awb}").join(encodeURIComponent(awb)) : null;
};

const buildShipments = (order, records, now, trackUrlTemplate) => {
  const nowMs = now.getTime();
  const forward = (records || [])
    .filter((r) => r && r.shipmentDirection !== "RETURN" && !r.isCancelled && r.shipmentStatus !== "CANCELLED")
    // parcel order is stable (slot, then creation) — a re-pushed shipment keeps its place
    .sort((a, b) => num(a.cloneSeq) - num(b.cloneSeq) || (new Date(a.createdAt).getTime() || 0) - (new Date(b.createdAt).getTime() || 0));

  const fromRecord = (r) => {
    let stage = STAGE[r.shipmentStatus] || "preparing";
    const events = (r.trackingHistory || [])
      .map((e) => ({ status: cleanText(e.scanStatus, 120), location: cleanText(e.scanLocation, 120), at: iso(e.scanDateTime), remarks: cleanText(e.remarks) }))
      .filter((e) => e.status || e.remarks)
      .sort((a, b) => (b.at || "").localeCompare(a.at || ""))
      .slice(0, MAX_EVENTS_PER_SHIPMENT);
    const lastEvent = events[0] || null;
    const expected = iso(r.expectedDeliveryDate);
    const delayed = !["delivered", "rto"].includes(stage) && !!expected && new Date(expected).getTime() < nowMs - 24 * 3600 * 1000;
    const copy = STAGE_COPY[stage];
    // An exception's own words (e.g. "Customer not available") are the useful part — shown as data, never as markup.
    const detail = stage === "exception" && lastEvent ? lastEvent.remarks || lastEvent.status : null;
    // The shipment's own AWB is the source of truth; the order's synced tracking number only fills a gap for a single parcel.
    const awbRaw = r.awbNumber || (forward.length === 1 ? order.trackingInfo?.trackingNumber : null);
    const awb = awbRaw ? cleanText(String(awbRaw), 60) : null;
    const dispatchedAt = iso(r.dispatchConfirmedAt) || (STAGE_RANK[stage] >= 1 ? events[events.length - 1]?.at || null : null);
    return {
      id: String(r._id || `${r.sourceOrderId}-${r.cloneSeq || 0}`),
      stage,
      label: copy.label,
      message: delayed ? "This parcel is taking longer than expected. The courier is working on it." : copy.message,
      detail,
      isDelayed: delayed,
      awb,
      courier: r.courierCompany ? cleanText(r.courierCompany, 80) : null,
      service: r.courierService ? cleanText(r.courierService, 80) : null,
      expectedDelivery: expected,
      lastUpdate: iso(r.lastTrackedAt) || lastEvent?.at || null,
      dispatchedAt,
      outForDeliveryAt: STAGE_RANK[stage] >= 2 ? events.find((e) => /out for delivery/i.test(e.status))?.at || null : null,
      deliveredAt: stage === "delivered" ? events.find((e) => /delivered/i.test(e.status))?.at || iso(r.lastTrackedAt) : null,
      trackUrl: buildTrackUrl(trackUrlTemplate, awb),
      events,
      itemIndexes: Array.isArray(r.itemIndexes) && r.itemIndexes.length ? r.itemIndexes : null,
    };
  };

  if (forward.length) return forward.map(fromRecord);

  // Orders from before shipment records (or shipped by hand): the order's own tracking info, if any.
  const t = order.trackingInfo || {};
  if (t.trackingNumber && ["SHIPPED", "DELIVERED"].includes(order.status)) {
    const delivered = order.status === "DELIVERED";
    const stage = delivered ? "delivered" : "shipped";
    const expected = iso(t.estimatedDelivery);
    return [
      {
        id: "order-tracking",
        stage,
        label: STAGE_COPY[stage].label,
        message: STAGE_COPY[stage].message,
        detail: null,
        isDelayed: !delivered && !!expected && new Date(expected).getTime() < nowMs - 24 * 3600 * 1000,
        awb: cleanText(t.trackingNumber, 60),
        courier: t.carrier ? cleanText(t.carrier, 80) : null,
        service: null,
        expectedDelivery: expected,
        lastUpdate: iso(t.updatedAt),
        dispatchedAt: statusTime(order, "SHIPPED"),
        outForDeliveryAt: null,
        deliveredAt: delivered ? statusTime(order, "DELIVERED") : null,
        trackUrl: buildTrackUrl(trackUrlTemplate, cleanText(String(t.trackingNumber), 60)),
        events: [],
        itemIndexes: null,
      },
    ];
  }
  return [];
};

// One line of copy + a tone for the page header.
const buildStage = (order, payment, shipments) => {
  if (isCancelled(order)) return { code: "CANCELLED", label: "Cancelled", headline: "This order was cancelled", message: payment.refundedAmount > 0 || payment.refundInProgressAmount > 0 ? "Your refund details are below." : "It will not be delivered.", tone: "danger" };
  if (payment.state === "FAILED") return { code: "PAYMENT_FAILED", label: "Payment failed", headline: "Your payment didn't go through", message: "No order was placed. If any amount was debited, your bank reverses it automatically.", tone: "danger" };
  if (payment.state === "PENDING") return { code: "PAYMENT_PENDING", label: "Payment pending", headline: "We're confirming your payment", message: "This page updates once your bank confirms. Please don't pay again.", tone: "warning" };

  const active = shipments;
  if (active.some((s) => s.stage === "rto")) return { code: "RTO", label: "Returning to us", headline: "Your parcel is returning to us", message: STAGE_COPY.rto.message, tone: "danger" };
  if (active.some((s) => s.stage === "exception")) return { code: "EXCEPTION", label: "Needs attention", headline: "Delivery needs your attention", message: STAGE_COPY.exception.message, tone: "warning" };

  const delivered = active.length > 0 && active.every((s) => s.stage === "delivered");
  if (delivered || (order.status === "DELIVERED" && !active.length)) return { code: "DELIVERED", label: "Delivered", headline: "Your order was delivered", message: payment.method !== "PREPAID" && payment.balanceOnDelivery > 0 ? "The balance was payable to the courier on delivery." : "We hope you love it.", tone: "success" };
  if (active.length > 1 && active.some((s) => s.stage === "delivered")) return { code: "PARTIALLY_DELIVERED", label: "Partly delivered", headline: "Part of your order was delivered", message: "The rest is still on its way — see each parcel below.", tone: "info" };
  if (active.some((s) => s.stage === "out_for_delivery")) return { code: "OUT_FOR_DELIVERY", label: "Out for delivery", headline: "Your order is out for delivery", message: STAGE_COPY.out_for_delivery.message, tone: "info" };
  if (active.some((s) => s.stage === "in_transit" || s.stage === "shipped")) return { code: "IN_TRANSIT", label: "On its way", headline: "Your order is on its way", message: "Track it below.", tone: "info" };

  const cod = payment.method !== "PREPAID";
  return {
    code: "CONFIRMED",
    label: "Confirmed",
    headline: "Your order is confirmed",
    message: cod
      ? "We're getting it ready. Tracking appears here once it's dispatched."
      : "Payment received. We're getting it ready — tracking appears here once it's dispatched.",
    tone: "success",
  };
};

const buildTimeline = (order, payment, shipments, stage) => {
  if (["CANCELLED", "PAYMENT_FAILED", "RTO", "EXCEPTION"].includes(stage.code)) return null;
  const paid = isOrderPaid(order);
  const rank = shipments.length ? Math.max(...shipments.map((s) => STAGE_RANK[s.stage] ?? 0)) : -1;
  const allDelivered = shipments.length > 0 && shipments.every((s) => s.stage === "delivered") || (order.status === "DELIVERED" && !shipments.length);
  const dispatched = shipments.filter((s) => (STAGE_RANK[s.stage] ?? 0) >= 1).map((s) => s.dispatchedAt).filter(Boolean).sort();
  const ofd = shipments.map((s) => s.outForDeliveryAt).filter(Boolean).sort();
  const deliveredAts = shipments.map((s) => s.deliveredAt).filter(Boolean).sort();

  const shippedDone = rank >= 1 || ["SHIPPED", "DELIVERED"].includes(order.status);
  const steps = [
    { key: "placed", label: "Order placed", short: "Placed", at: iso(order.createdAt), done: true },
    { key: "confirmed", label: payment.method === "PREPAID" ? "Payment confirmed" : "Order confirmed", short: payment.method === "PREPAID" ? "Payment" : "Confirmed", at: paid ? statusTime(order, "PAID") : null, done: paid },
    // No timestamp is ever recorded for packing — "Preparing" is the honest name for the wait between confirmation and dispatch.
    { key: "preparing", label: "Preparing", short: "Preparing", at: null, done: shippedDone },
    { key: "shipped", label: "Shipped", short: "Shipped", at: dispatched[0] || statusTime(order, "SHIPPED"), done: shippedDone },
  ];
  // Only shown while it can still happen, or when the courier actually reported it — never claimed after the fact.
  if (!allDelivered || ofd.length) steps.push({ key: "out_for_delivery", label: "Out for delivery", short: "Out for delivery", mobileHidden: true, at: ofd[0] || null, done: rank >= 2 || allDelivered });
  steps.push({ key: "delivered", label: "Delivered", short: "Delivered", at: allDelivered ? deliveredAts[deliveredAts.length - 1] || statusTime(order, "DELIVERED") : null, done: allDelivered });

  const firstOpen = steps.findIndex((s) => !s.done);
  return steps.map((s, i) => ({ ...s, state: s.done ? "done" : i === firstOpen ? "current" : "upcoming" }));
};

// ── address, invoice, resolutions ──────────────────────────────────────────

const buildDelivery = (order) => {
  const a = order.deliveryAddress || {};
  const line1 = [a.flatOrFloorNumber, a.addressLine || a.deliveryAddressFull || a.formattedAddress].filter(Boolean).join(", ");
  return {
    name: cleanText(a.fullName || order.userName, 120) || null,
    phone: a.mobileNumber || order.receiverMobile || order.senderMobile || null,
    altPhone: order.senderMobile && order.senderMobile !== (a.mobileNumber || order.receiverMobile) ? order.senderMobile : null,
    email: order.isGuestOrder ? order.guestInfo?.email || order.userEmail || null : order.userEmail || null,
    addressLine: cleanText(line1, 300) || null,
    landmark: cleanText(a.landmark, 120) || null,
    city: a.city || null,
    state: a.state || null,
    pinCode: a.pinCode ? String(a.pinCode) : null,
    serviceName: order.shippingInfo?.serviceName || null,
    // Magic Checkout orders get their address from Razorpay after payment.
    addressPending: !(a.pinCode || line1),
  };
};

const REPLACEMENT_COPY = {
  REQUESTED: "In progress", APPROVED: "In progress", AWAITING_RETURN: "In progress", RETURN_RECEIVED: "In progress",
  READY_TO_SHIP: "In progress", SHIPPED: "Shipped", DELIVERED: "Completed", FAILED: "Closed", CANCELLED: "Closed",
};
const buildResolutions = (cases) =>
  (cases || [])
    .filter((c) => ["REPLACEMENT", "EXCHANGE"].includes(c.caseType))
    .map((c) => ({
      type: c.caseType === "EXCHANGE" ? "Exchange" : "Replacement",
      status: c.caseType === "REPLACEMENT" ? REPLACEMENT_COPY[c.replacements?.[0]?.status] || "In progress" : ["RESOLVED", "CLOSED"].includes(c.status) ? "Completed" : "In progress",
      at: iso(c.createdAt),
    }));

// ── public ─────────────────────────────────────────────────────────────────

/**
 * @param {object} p
 * @param {object} p.order            lean Order document
 * @param {object[]} [p.shipments]    lean ShipmentRecord documents for this order
 * @param {object[]} [p.cases]        lean ResolutionCase documents for this order
 * @param {Date} [p.now]
 * @param {string} [p.trackUrlTemplate]  customer tracking link with an {awb} placeholder (SHIPMOZO_TRACK_URL)
 */
export const buildOrderView = ({ order, shipments: records = [], cases = [], now = new Date(), trackUrlTemplate }) => {
  const payment = buildPayment(order, cases);
  const items = buildItems(order);
  const pricing = buildPricing(order, items, payment);
  const shipments = buildShipments(order, records, now, trackUrlTemplate);
  const stage = buildStage(order, payment, shipments);
  const timeline = buildTimeline(order, payment, shipments, stage);
  const invoiceReady = isOrderPaid(order) && !isCancelled(order) && !!order.invoiceData?.isGenerated && !!order.invoiceData?.s3FileKey;

  return {
    orderId: order.orderId,
    razorpayOrderId: order.payment?.razorpayOrderId || null,
    placedAt: iso(order.createdAt),
    isGuestOrder: !!order.isGuestOrder,
    status: order.status,
    stage,
    payment,
    items,
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
    pricing,
    shipments: shipments.map((s) => ({
      ...s,
      // Items are attached only where the parcel-to-item mapping was recorded.
      items: s.itemIndexes ? s.itemIndexes.map((i) => items[i]).filter(Boolean).map((i) => ({ name: i.name, variant: i.variant, quantity: i.quantity, image: i.image })) : null,
    })),
    timeline,
    delivery: buildDelivery(order),
    cancelledAt: isCancelled(order) ? iso(order.cancelledAt) : null,
    resolutions: buildResolutions(cases),
    invoice: { available: invoiceReady },
    actions: {
      track: shipments.some((s) => !!s.trackUrl),
      // The latest AWB's tracking page for the main "Track Order" button (the first parcel that has one).
      trackUrl: shipments.find((s) => !!s.trackUrl)?.trackUrl || null,
      trackAwb: shipments.find((s) => !!s.awb)?.awb || null,
      invoice: invoiceReady,
    },
  };
};

/** Lightweight row for the Order Archive — no tracking history, no address. */
export const buildOrderSummary = (view) => ({
  orderId: view.orderId,
  placedAt: view.placedAt,
  status: view.status,
  stage: { code: view.stage.code, label: view.stage.label, tone: view.stage.tone },
  payment: {
    state: view.payment.state,
    label: view.payment.label,
    orderTotal: view.payment.orderTotal,
    amountPaid: view.payment.amountPaid,
    amountDue: view.payment.amountDue,
    refundedAmount: view.payment.refundedAmount,
    method: view.payment.method,
  },
  itemCount: view.itemCount,
  preview: view.items.slice(0, 4).map((i) => ({ name: i.name, image: i.image, quantity: i.quantity, isFreeGift: i.isFreeGift })),
  extraItems: Math.max(0, view.items.length - 4),
  shipmentCount: view.shipments.length,
  canTrack: view.actions.track,
});
