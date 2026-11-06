// Groups cart lines under the offer they belong to, so the cart can say
// "because you added these → you get this, saving ₹X" instead of only showing
// a lower price. Inputs are the live promotion display (POST
// promotions/display/cart): `promotions[].applied`, `promotions[].triggerProductIds`,
// `pricing.lines[].promotionId` (the discounted reward line) and
// `pricing.savingsByPromotion`. Gift-only offers (no reward line in the cart)
// stay with GiftClaimList and are not grouped here.

const keyOf = (item) => `${item.mongoId || item.productId || item.id}::${item.selectedVariant || 'N/A'}`;
const idOf = (item) => String(item.mongoId || item.productId || item.id);

/**
 * @returns {{ groups: Array<{ promo, savings, triggers: object[], rewards: object[] }>, rest: object[] }}
 * Every cart item ends up in exactly one place (its first matching group, else `rest`).
 */
export const groupCartByOffer = (cartItems = [], promotions = [], pricing = null) => {
  const lines = pricing?.lines || [];
  const lineOf = (item) => lines.find((l) => l.productId === idOf(item) && (l.selectedVariant || 'N/A') === (item.selectedVariant || 'N/A'));
  const used = new Set();
  const groups = [];

  promotions.filter((p) => p.applied).forEach((promo) => {
    const rewards = cartItems.filter((it) => !used.has(keyOf(it)) && lineOf(it)?.promotionId === promo.id);
    if (!rewards.length) return; // gift-only / order-level offers are shown elsewhere
    rewards.forEach((it) => used.add(keyOf(it)));
    const trig = new Set(promo.triggerProductIds || []);
    const triggers = cartItems.filter((it) => !used.has(keyOf(it)) && trig.has(idOf(it)));
    triggers.forEach((it) => used.add(keyOf(it)));
    groups.push({ promo, savings: Number(pricing?.savingsByPromotion?.[promo.id] || 0), triggers, rewards });
  });

  return { groups, rest: cartItems.filter((it) => !used.has(keyOf(it))) };
};
