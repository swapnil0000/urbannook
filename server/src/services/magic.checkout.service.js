import crypto from "crypto";
import env from "../config/envConfigSetup.js";

/**
 * Razorpay Magic Checkout (1CC) — shared, side-effect-free helpers.
 *
 * SCOPE: Magic runs for PREPAID orders only. COD stays on the existing flow
 * (2× real-shipping upfront advance), because Magic's COD advance is a
 * dashboard %/slab value and cannot be set per-order. Every serviceability
 * response therefore reports cod:false — Razorpay must never collect COD.
 */

/* ===============================================================
   FEATURE FLAGS
================================================================ */

// Master switch. Off/unset ⇒ the whole Magic path is inert and checkout
// behaves exactly as it does today.
export const isMagicCheckoutEnabled = () => env.MAGIC_CHECKOUT_ENABLED === "true";

// Guests-first rollout. Ignored unless MAGIC_CHECKOUT_ENABLED is on.
export const isMagicGuestsOnly = () => env.MAGIC_CHECKOUT_GUESTS_ONLY === "true";

/* ===============================================================
   CALLBACK AUTHENTICATION
   ---------------------------------------------------------------
   The Magic dashboard holds a SEPARATE secret per callback, each behind
   its own "Enable ... Secret Key" toggle:
     Checkout Setup → Coupon Settings → Get Promotions   → MAGIC_GET_PROMO_SECRET
     Checkout Setup → Coupon Settings → Apply Promotions → MAGIC_APPLY_PROMO_SECRET
     Shipping Setup → serviceability                     → MAGIC_SHIPPING_SECRET

   ⚠️ VERIFY AT SANDBOX: Razorpay's docs describe these as "secret keys" but do
   not pin down how they travel. Both plausible mechanisms are accepted below —
   an HMAC-SHA256 of the raw body, or the shared secret echoed in a header. The
   matched mechanism is logged; once a real sandbox request is captured, drop
   the branch that never fires and make this strict.
================================================================ */

const SECRETS = {
  getPromotions: () => env.MAGIC_GET_PROMO_SECRET,
  applyPromotion: () => env.MAGIC_APPLY_PROMO_SECRET,
  shipping: () => env.MAGIC_SHIPPING_SECRET,
};

// Headers Razorpay might carry the secret/signature in.
const SIGNATURE_HEADERS = ["x-razorpay-signature"];
const SHARED_SECRET_HEADERS = [
  "x-razorpay-secret",
  "x-secret-key",
  "x-api-key",
];

const timingSafeEqual = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Authenticate one Magic callback.
 *
 * Three mechanisms are accepted, in order of preference:
 *   1. HMAC-SHA256 of the raw body in x-razorpay-signature
 *   2. the shared secret echoed in a header
 *   3. the shared secret as a `?k=` query param on the registered URL
 *
 * (3) exists because the dashboard's secret-key toggle has proven unreliable to
 * save, while the URL field saves fine. Registering
 * `https://.../magic/promotions?k=<secret>` gives the endpoint real protection
 * with nothing but the URL. It is strictly weaker than (1) — the secret sits in
 * Razorpay's config and in our access logs — so prefer the header once the
 * dashboard cooperates.
 *
 * @param {"getPromotions"|"applyPromotion"|"shipping"} channel
 * @param {Buffer} rawBody   raw request body (routes mount a raw parser)
 * @param {object} headers   req.headers
 * @param {object} query     req.query
 * @returns {{ ok: boolean, reason?: string }}
 */
export const verifyMagicCallback = (channel, rawBody, headers = {}, query = {}) => {
  const secret = SECRETS[channel]?.();

  // No secret configured ⇒ reject. These endpoints are public, so failing open
  // here would silently expose every active coupon code to the internet on a
  // forgotten env var — a misconfiguration that produces no error, only a log
  // line nobody reads. Failing closed is loud and safe: the worst case is that
  // coupons do not show in the modal, which never blocks a customer from paying.
  if (!secret) {
    console.error(
      `[MAGIC][auth] ${channel}: REJECTED — no secret configured. ` +
        `Set the matching env var (MAGIC_GET_PROMO_SECRET / MAGIC_APPLY_PROMO_SECRET / MAGIC_SHIPPING_SECRET) ` +
        `and register the callback URL with ?k=<secret>.`,
    );
    return { ok: false, reason: "no-secret-configured" };
  }

  // (a) HMAC-SHA256 of the raw body — same trust model as the Razorpay webhook.
  // A GET callback has no body at all, and body-parser then leaves req.body as
  // {} rather than a Buffer, which createHmac().update() would throw on.
  const bodyBytes = Buffer.isBuffer(rawBody)
    ? rawBody
    : typeof rawBody === "string"
      ? Buffer.from(rawBody)
      : Buffer.alloc(0);
  const expected = crypto
    .createHmac("sha256", secret)
    .update(bodyBytes)
    .digest("hex");

  for (const h of SIGNATURE_HEADERS) {
    const got = headers[h];
    if (got && timingSafeEqual(got, expected)) {
      return { ok: true, reason: `hmac:${h}` };
    }
  }

  // (b) Shared secret echoed back in a header.
  for (const h of [...SHARED_SECRET_HEADERS, "authorization"]) {
    const got = headers[h];
    if (!got) continue;
    const value = h === "authorization" ? String(got).replace(/^Bearer\s+/i, "") : got;
    if (timingSafeEqual(value, secret)) {
      return { ok: true, reason: `shared:${h}` };
    }
  }

  // (c) Shared secret on the URL itself.
  const urlToken = query?.k;
  if (urlToken && timingSafeEqual(urlToken, secret)) {
    return { ok: true, reason: "shared:query" };
  }

  const present = Object.keys(headers).filter(
    (h) => h.startsWith("x-razorpay") || h.startsWith("x-secret") || h === "authorization",
  );
  return {
    ok: false,
    reason: `no header or ?k= matched (saw headers: ${present.join(", ") || "none"})`,
  };
};

/* ===============================================================
   CALLBACK PAYLOAD HELPERS
================================================================ */

/**
 * Pull the Razorpay order id out of a callback payload.
 *
 * Razorpay sends `order_id: ""` and puts the real id in `razorpay_order_id`,
 * WITHOUT the `order_` prefix — e.g. `Te4maQ5e34UZ84` for the order we stored
 * as `order_Te4maQ5e34UZ84`. Reading `order_id` and matching it raw finds
 * nothing, so every request fell back to a flat shipping rate on an empty cart.
 * Both field names and both id shapes are handled here.
 *
 * @returns {string|null} the id as stored in order.payment.razorpayOrderId
 */
export const resolveRazorpayOrderId = (payload = {}) => {
  const raw = String(payload.razorpay_order_id || payload.order_id || "").trim();
  if (!raw) return null;
  return raw.startsWith("order_") ? raw : `order_${raw}`;
};

/* ===============================================================
   LINE ITEMS
================================================================ */

/**
 * Map internal order items → Razorpay `line_items`. All money in PAISE.
 * `price` is the strike-through price and `offer_price` what is actually
 * charged; we do not model a separate MRP, so the two are equal.
 */
export const buildMagicLineItems = (orderItems = []) =>
  orderItems.map((it) => {
    const snap = it.productSnapshot || {};
    const pricePaise = Math.round((Number(snap.priceAtPurchase) || 0) * 100);
    const variant =
      snap.selectedVariant && snap.selectedVariant !== "N/A"
        ? String(snap.selectedVariant)
        : undefined;

    return {
      type: "e-commerce",
      sku: String(it.productId),
      ...(variant ? { variant_id: variant } : {}),
      price: pricePaise,
      offer_price: pricePaise,
      tax_amount: 0,
      quantity: Number(snap.quantity) || 1,
      name: snap.productName || "Item",
      description:
        snap.productSubCategory || snap.productCategory || snap.productName || "",
      ...(snap.productImg ? { image_url: snap.productImg } : {}),
    };
  });

// Sum of offer_price × quantity across line items, in PAISE.
export const lineItemsTotalPaise = (lineItems = []) =>
  lineItems.reduce(
    (sum, li) => sum + (Number(li.offer_price) || 0) * (Number(li.quantity) || 1),
    0,
  );

/* ===============================================================
   DISCOUNTING THE LINE ITEMS
================================================================ */

/**
 * Bring `line_items` down so they add up to exactly what we intend to charge.
 *
 * WHY NOT `promotions`: Razorpay's order API accepts a `promotions` array and
 * its own SDK types it, so a cart coupon was first sent that way — amount
 * discounted, line items at full price, promotion explaining the gap. Razorpay
 * ACCEPTED the order, kept our amount, and silently dropped the promotion:
 *
 *   sent  → amount ₹1,  line_items_total ₹3697, promotion ₹3696
 *   kept  → amount ₹1,  line_items_total ₹3697, promotions []
 *
 * The Magic modal builds its cart from the line items, so it billed ₹3697 and
 * the discount vanished. The only number Razorpay reliably respects is the one
 * on the items themselves — so the discount goes there.
 *
 * `price` stays at the full amount and only `offer_price` moves, which is what
 * makes the modal show the original struck through.
 *
 * Money is in PAISE and every price must be a whole number of them, so the
 * proportional split leaves a few paise unallocated; those are handed out one
 * at a time to the items that can absorb them (an item of quantity n costs n
 * paise to raise by one). Whatever cannot be placed — only possible when every
 * quantity is above 1 — stays as a sub-rupee shortfall, and the caller charges
 * the total that came back rather than the one it asked for, so the two can
 * never disagree.
 *
 * @param {object[]} lineItems  as built by buildMagicLineItems
 * @param {number} targetPaise  what the customer should pay for the items
 * @returns {{lineItems: object[], total: number}} `total` is authoritative
 */
export const discountMagicLineItems = (lineItems = [], targetPaise = 0) => {
  const currentTotal = lineItemsTotalPaise(lineItems);
  const target = Math.round(Number(targetPaise) || 0);

  // Nothing to do: no discount, or a target at/above full price (never scale up
  // — that would charge more than the items are worth).
  if (!lineItems.length || currentTotal <= 0 || target >= currentTotal) {
    return { lineItems, total: currentTotal };
  }

  if (target <= 0) {
    // A free order cannot be paid for; the caller should not have got here.
    return { lineItems, total: currentTotal };
  }

  const qtyOf = (li) => Math.max(1, Number(li.quantity) || 1);

  const scaled = lineItems.map((li) => {
    const unit = Math.floor(((Number(li.offer_price) || 0) * target) / currentTotal);
    return { ...li, offer_price: Math.max(0, unit) };
  });

  // Hand out the rounding remainder. Cheapest-to-raise first (an item of
  // quantity 1 absorbs a single paisa), so the shortfall closes completely
  // whenever any item has quantity 1 — which is the ordinary case.
  const order = scaled
    .map((li, i) => ({ i, qty: qtyOf(li) }))
    .sort((a, b) => a.qty - b.qty);

  let short = target - scaled.reduce((sum, li) => sum + li.offer_price * qtyOf(li), 0);
  let placed = true;
  while (short > 0 && placed) {
    placed = false;
    for (const { i, qty } of order) {
      if (qty > short) continue;
      // Never price an item above its own strike-through price.
      if (scaled[i].offer_price + 1 > (Number(scaled[i].price) || Infinity)) continue;
      scaled[i].offer_price += 1;
      short -= qty;
      placed = true;
      if (short <= 0) break;
    }
  }

  const total = scaled.reduce((sum, li) => sum + li.offer_price * qtyOf(li), 0);
  return { lineItems: scaled, total };
};

/* ===============================================================
   SERVICEABILITY RESPONSE
================================================================ */

/**
 * One entry of the serviceability response.
 *
 * Razorpay has shipped two shapes of this contract: a flat one, and a newer one
 * nesting a `shipping_methods` array. Both are emitted — the flat fields sit on
 * the object and are mirrored inside `shipping_methods`, so whichever Razorpay
 * reads, it finds. Once the sandbox confirms which, drop the other.
 *
 * @param {{id?:any, zipcode:string, state?:string, country?:string}} addr  echo of what Razorpay sent
 * @param {number} shippingRupees  shipping charge in RUPEES (0 when free shipping applies)
 * @param {boolean} serviceable
 */
export const toRazorpayServiceableAddress = (
  addr,
  shippingRupees,
  serviceable = true,
  { estimatedDays } = {},
) => {
  const shippingFeePaise = Math.round(Math.max(Number(shippingRupees) || 0, 0) * 100);
  const isServiceable = !!serviceable;

  /* The shipping METHOD id is not the address id — they are separate things.
     Echoing the address id here breaks a brand-new address, where Razorpay
     sends id 0: the method comes back as id "0" with an empty name, Razorpay
     cannot resolve it, and saving the address fails with a 404. A saved address
     carries a real id, which is why only new addresses broke. We offer exactly
     one method, so it gets one constant id, and a name Razorpay can display. */
  const method = {
    id: "standard",
    name: "Standard Delivery",
    // Real courier ETA when the rate call gave us one; the generic line is only
    // for the flat-rate fallback, where we genuinely do not know.
    description: estimatedDays ? `Delivery in ${estimatedDays}` : "24-48 hours",
    serviceable: isServiceable,
    shipping_fee: isServiceable ? shippingFeePaise : 0,
    cod: false, // Magic is prepaid-only here — never let Razorpay take COD
    cod_fee: 0,
  };

  // Flat fields are the older serviceability shape, `shipping_methods` the
  // newer one; both are emitted so whichever Razorpay reads, it finds. The flat
  // `id` stays the ADDRESS id it sent us, so the echo still lines up.
  // Razorpay sends the region as `state_code` (e.g. "UP"); echo back whichever
  // of the two it actually gave us rather than dropping it.
  return {
    id: addr?.id ?? "standard",
    zipcode: addr?.zipcode,
    ...(addr?.state ? { state: addr.state } : {}),
    ...(addr?.state_code ? { state_code: addr.state_code } : {}),
    ...(addr?.country ? { country: addr.country } : {}),
    serviceable: isServiceable,
    shipping_fee: isServiceable ? shippingFeePaise : 0,
    cod: false,
    cod_fee: 0,
    shipping_methods: [method],
  };
};

/* ===============================================================
   ADDRESS MAPPING (Magic → our order)
================================================================ */

const digitsOnly = (v) => String(v ?? "").replace(/\D/g, "");

// Razorpay sends contacts as +91XXXXXXXXXX; our schema validates exactly 10 digits.
export const stripCountryCode = (mobile) => {
  const d = digitsOnly(mobile);
  if (d.length === 12 && d.startsWith("91")) return d.slice(2);
  if (d.length === 11 && d.startsWith("0")) return d.slice(1);
  return d.slice(-10);
};

/**
 * Map Razorpay `customer_details` (available on the order once Magic has
 * collected the address) onto our `order.deliveryAddress` shape.
 *
 * @param {object} customerDetails  order.customer_details from the Fetch Order API
 * @returns {object|null}
 */
export const toOrderDeliveryAddress = (customerDetails) => {
  const a = customerDetails?.shipping_address || customerDetails?.billing_address;
  if (!a) return null;

  const line = [a.line1, a.line2].filter(Boolean).join(", ");
  const full = [line, a.landmark, a.city, a.state, a.zipcode]
    .filter(Boolean)
    .join(", ");

  return {
    addressId: null,
    fullName: a.name || customerDetails?.name || "",
    mobileNumber: stripCountryCode(a.contact || customerDetails?.contact),
    addressLine: line,
    city: a.city || "",
    state: a.state || "",
    formattedAddress: full,
    deliveryAddressFull: full, // canonical string ShipMozo/couriers consume
    landmark: a.landmark || "",
    flatOrFloorNumber: "",
    pinCode: Number(digitsOnly(a.zipcode)) || undefined,
  };
};
