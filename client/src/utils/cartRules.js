/**
 * Client-side mirror of server/src/utils/cartRule.util.js.
 *
 * This MUST stay in lockstep with the server: the server computes what the
 * customer is actually charged, and these functions compute what we show them.
 * Any drift between the two is a customer seeing one price and being billed
 * another. All four cart surfaces (banner, checkout, cart drawer, mini-cart)
 * go through here so there is exactly one implementation to keep in sync.
 */

/** Quantity can arrive as a number or a `{ quantity }` object depending on source. */
export const itemQty = (q) =>
  typeof q === "object" && q !== null ? Number(q.quantity) || 0 : Number(q) || 0;

/**
 * Discounted price of ONE unit under the best candidate for the customer.
 * Rounded exactly as the server rounds (50% off ₹299 → ₹150, not ₹149.5).
 */
export const bestUnitPrice = (unitPrice, candidates = []) => {
  const price = Number(unitPrice) || 0;
  if (!candidates?.length || price <= 0) return price;
  const results = candidates.map((c) =>
    c.type === "percent_off"
      ? price * (1 - Number(c.value) / 100)
      : c.type === "flat_off"
        ? price - Number(c.value)
        : price,
  );
  return Math.round(Math.max(Math.min(...results), 0));
};

/**
 * Total rupees knocked off a cart LINE (one product × quantity).
 *
 * Capped to the winning candidate's `maxDiscountedQuantity` (default 1): "2+
 * Lamps => 50% off Pen Stand" discounts ONE Pen Stand — a second is full price.
 * So 2 × ₹299 Pen Stands = ₹598 − ₹149 = ₹449, not ₹300.
 */
export const computeLineDiscount = (unitPrice, quantity, candidates = []) => {
  const price = Number(unitPrice) || 0;
  const qty = itemQty(quantity);
  if (!candidates?.length || price <= 0 || qty <= 0) return 0;

  // Pick the winner by resulting unit price, then honour THAT rule's cap.
  let best = null;
  let bestPrice = Infinity;
  for (const c of candidates) {
    const unit = bestUnitPrice(price, [c]);
    if (unit < bestPrice) {
      bestPrice = unit;
      best = c;
    }
  }
  if (!best || bestPrice >= price) return 0;

  const discountedUnits = Math.min(qty, Math.max(Number(best.maxDiscountedQuantity) || 1, 1));
  return (price - bestPrice) * discountedUnits;
};

/** What a line actually costs: (unit price × qty) − rule discount. */
export const computeLineTotal = (unitPrice, quantity, candidates = []) =>
  (Number(unitPrice) || 0) * itemQty(quantity) - computeLineDiscount(unitPrice, quantity, candidates);

/**
 * Total saved across the whole cart. `cartItems` are Redux cart items;
 * `discounts` is the `discounts` map from the evaluate-cart-rules response.
 */
export const computeCartSavings = (cartItems = [], discounts) =>
  cartItems.reduce((sum, item) => {
    const productId = item.mongoId || item.id;
    const candidates = discounts?.[productId];
    return sum + computeLineDiscount(item.price, item.quantity, candidates);
  }, 0);
