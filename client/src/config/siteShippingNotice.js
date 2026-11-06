// Site-wide shipping note (every shopper, no product needed) - shown in the top ticker and, small, on checkout.
// Plain config, no DB/admin: edit the two values to change the words or the date.
// It switches itself on at SITE_SHIPPING_NOTICE_STARTS (00:00 IST on 7 Nov 2026) and off at SITE_SHIPPING_NOTICE_ENDS (00:00 IST on 12 Nov 2026), so nothing to clean up.
// Separate from config/shippingDelayNotice.js, which is tied to one product being in the cart.
export const SITE_SHIPPING_NOTICE =
  "Orders placed from 7th Nov will be shipped after 12th Nov 2026";

export const SITE_SHIPPING_NOTICE_STARTS = new Date("2026-11-07T00:00:00+05:30");
export const SITE_SHIPPING_NOTICE_ENDS = new Date("2026-11-12T00:00:00+05:30");
