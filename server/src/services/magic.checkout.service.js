import crypto from "crypto";
import env from "../config/envConfigSetup.js";

/**
 * Razorpay Magic Checkout (one-click / 1CC) — shared, side-effect-free helpers.
 *
 * SCOPE DECISION (2026-07): Magic runs for PREPAID orders only. COD keeps the
 * existing flow (2× real-shipping upfront advance) untouched, because Magic's
 * partial-COD advance is a dashboard %/slab value and cannot be set dynamically
 * to "2× shipping" per order. So every serviceability response here reports
 * cod:false — Razorpay must never collect COD through Magic.
 */

// ── Feature flags ─────────────────────────────────────────────────────────────
// Master switch. When "false"/unset, the entire Magic path is inert and the
// live checkout behaves exactly as before.
export const isMagicCheckoutEnabled = () => env.MAGIC_CHECKOUT_ENABLED === "true";

// Guests-first rollout: when "true", only guest checkout uses Magic; logged-in
// users stay on the existing flow. Ignored unless MAGIC_CHECKOUT_ENABLED is on.
export const isMagicGuestsOnly = () => env.MAGIC_CHECKOUT_GUESTS_ONLY === "true";

// Secret Razorpay signs 1CC callback requests with. Defaults to the webhook
// secret; override with MAGIC_CALLBACK_SECRET only if the Magic dashboard
// configures a separate one. VERIFY against the dashboard value at activation.
const callbackSecret = () => env.MAGIC_CALLBACK_SECRET || env.RP_WEBHOOK_SECRET;

// ── Line items ──────────────────────────────────────────────────────────────
/**
 * Map internal order items → Razorpay `line_items` schema. All money in PAISE
 * (Razorpay convention). Fields per the razorpay-php order docs. `offer_price`
 * is the price actually charged; we don't model a separate strike-through, so
 * price === offer_price.
 *
 * @param {Array<{productId:string, productSnapshot:object}>} orderItems
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

// ── Serviceability response ───────────────────────────────────────────────────
/**
 * Build one entry of the Razorpay serviceability response from an internal
 * shipping rate. Fees in PAISE. COD is always disabled (prepaid-only Magic).
 *
 * @param {{id:any, zipcode:string, state?:string, country?:string}} addr  echo of the address Razorpay sent
 * @param {number} shippingRupees  shipping charge in rupees (0 when free-shipping applies)
 * @param {boolean} serviceable
 */
export const toRazorpayServiceableAddress = (addr, shippingRupees, serviceable = true) => ({
  id: addr.id,
  zipcode: addr.zipcode,
  ...(addr.state ? { state: addr.state } : {}),
  ...(addr.country ? { country: addr.country } : {}),
  serviceable,
  shipping_fee: serviceable ? Math.round((Number(shippingRupees) || 0) * 100) : 0,
  cod: false,
  cod_fee: 0,
});

// ── Callback signature ────────────────────────────────────────────────────────
/**
 * Verify the HMAC-SHA256 signature Razorpay attaches to a 1CC callback request.
 * Same scheme as the payment webhook. `rawBody` MUST be the unparsed body
 * (Buffer or string) — the route mounts a raw parser so this holds.
 * Constant-time compare to avoid signature-timing leaks.
 */
export const verifyMagicCallbackSignature = (rawBody, signature) => {
  const secret = callbackSecret();
  if (!signature || !rawBody || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(String(signature), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// ── Address capture (webhook) ─────────────────────────────────────────────────
const strip10 = (m) => {
  const d = String(m || "").replace(/\D/g, "");
  return d.length > 10 ? d.slice(-10) : d;
};

/**
 * Map a Razorpay 1CC shipping address (+ optional customer) → our order
 * `deliveryAddress` sub-doc shape. Returns null when there's nothing usable.
 * Source field names per the 1CC shipping_details schema (line1/line2/zipcode/
 * contact/city/state/landmark).
 */
export const mapMagicShippingAddress = (shippingAddress, customer = {}) => {
  if (!shippingAddress || !shippingAddress.zipcode) return null;
  const line = [shippingAddress.line1, shippingAddress.line2].filter(Boolean).join(", ");
  const full = [line, shippingAddress.landmark, shippingAddress.city, shippingAddress.state, shippingAddress.zipcode]
    .filter(Boolean)
    .join(", ");
  return {
    fullName: customer.name || shippingAddress.name || "Customer",
    mobileNumber: strip10(shippingAddress.contact || customer.contact),
    addressLine: line,
    city: shippingAddress.city || "",
    state: shippingAddress.state || "",
    pinCode: Number(String(shippingAddress.zipcode).replace(/\D/g, "")) || null,
    landmark: shippingAddress.landmark || "",
    formattedAddress: full,
    deliveryAddressFull: full,
  };
};

/**
 * Pull the Magic-collected shipping address out of a parsed webhook payload.
 * ⚠️ VERIFY the exact source path against a captured sandbox webhook — 1CC may
 * expose the address on the order entity (shipping_address / customer_details)
 * or require an orders.fetch(). We probe the known candidate locations.
 */
export const extractMagicShippingAddress = (payload) => {
  const orderEntity = payload?.payload?.order?.entity;
  const paymentEntity = payload?.payload?.payment?.entity;
  const shippingAddress =
    orderEntity?.shipping_address ||
    orderEntity?.customer_details?.shipping_address ||
    paymentEntity?.shipping_address ||
    null;
  const customer = orderEntity?.customer_details || {
    name: paymentEntity?.notes?.name,
    contact: paymentEntity?.contact,
    email: paymentEntity?.email,
  };
  return mapMagicShippingAddress(shippingAddress, customer);
};
