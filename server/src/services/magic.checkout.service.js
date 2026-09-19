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
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody || Buffer.alloc(0))
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
export const toRazorpayServiceableAddress = (addr, shippingRupees, serviceable = true) => {
  const shippingFeePaise = Math.round(Math.max(Number(shippingRupees) || 0, 0) * 100);

  const method = {
    id: addr?.id ?? "standard",
    serviceable: !!serviceable,
    shipping_fee: serviceable ? shippingFeePaise : 0,
    cod: false, // Magic is prepaid-only here — never let Razorpay take COD
    cod_fee: 0,
  };

  return {
    id: addr?.id ?? "standard",
    zipcode: addr?.zipcode,
    ...(addr?.state ? { state: addr.state } : {}),
    ...(addr?.country ? { country: addr.country } : {}),
    ...method,
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
