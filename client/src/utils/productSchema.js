// Shipping and return facts for product structured data (Google rich results /
// Merchant listings). Keep them equal to what the site promises:
//   - delivery: HomePage FAQ "dispatches within ~48 hours and reaches you in
//     2–7 days depending on your pincode"
//   - returns: pages/legal/Return.jsx + PDP FAQ — no returns for change of mind;
//     damaged, defective or wrong items reported within 3 days (unboxing video)
//     are replaced free (a replacement guarantee, see RETURN_POLICY).
// If any of these change, change them here too.
const SITE = 'https://www.urbannook.in';

const HANDLING_DAYS = [0, 2];
const TRANSIT_DAYS = [2, 7];

const days = ([minValue, maxValue]) => ({ '@type': 'QuantitativeValue', minValue, maxValue, unitCode: 'DAY' });

/**
 * OfferShippingDetails for one offer, or null. Only emitted when delivery is
 * free for this price (cart-value free-shipping offer active and the price
 * reaches it): below that the courier rate depends on the pincode, and a
 * guessed rate in search results would be wrong.
 */
export function shippingDetails(price, freeShipping) {
  const threshold = Number(freeShipping?.thresholdAmount) || 0;
  if (!freeShipping?.isActive || threshold <= 0 || Number(price) < threshold) return null;
  return {
    '@type': 'OfferShippingDetails',
    shippingRate: { '@type': 'MonetaryAmount', value: 0, currency: 'INR' },
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IN' },
    deliveryTime: { '@type': 'ShippingDeliveryTime', handlingTime: days(HANDLING_DAYS), transitTime: days(TRANSIT_DAYS) },
  };
}

/**
 * Returns: not accepted for change of mind, colour or preference. Damaged,
 * defective or wrong items are replaced free when reported within 3 days —
 * that is a replacement guarantee, not a return window, so Google is told
 * "returns not permitted" (showing "3-day free returns" in search would promise
 * something the store doesn't offer). Same policy as the Organization in
 * index.html (Google recommends the business-wide policy there).
 */
export const RETURN_POLICY = {
  '@type': 'MerchantReturnPolicy',
  '@id': `${SITE}/return-policy#policy`,
  applicableCountry: 'IN',
  returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
  merchantReturnLink: `${SITE}/return-policy`,
};
