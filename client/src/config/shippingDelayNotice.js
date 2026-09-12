// One-off operational notice — NOT a promo/offer, so it deliberately doesn't
// live in the Offer collection or admin panel. Just a plain config: edit the
// three values below directly to change the message, which product it's
// tied to, or when it auto-expires.
//
// Shown only while BOTH are true:
//   - SHIPPING_DELAY_PRODUCT_ID is in the customer's cart
//   - now is before SHIPPING_DELAY_EXPIRES_AT
// See hooks/useShippingDelayNotice.js for the actual check.

// Brake Caliper Lamp
export const SHIPPING_DELAY_PRODUCT_ID = "019da690-729b-7428-8ae1-0273f030d2a8";

export const SHIPPING_DELAY_MESSAGE =
  "Due to high order volume, Brake Caliper Lamp will ship after 31st August";

// End of day, 31 Aug 2026, IST — change this one line to move/extend the notice.
export const SHIPPING_DELAY_EXPIRES_AT = new Date("2026-08-31T23:59:59+05:30");
