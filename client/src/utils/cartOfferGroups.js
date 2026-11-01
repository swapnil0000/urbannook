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
    // a reward line split between offers (LED + Wooden stand offers on 2 Doubles) shows under
    // each of them with its own units (offerUnits); a line owned by one offer is used once
    const shareOf = (it) => lineOf(it)?.shares?.find((sh) => sh.promotionId === promo.id);
    const rewards = cartItems
      .filter((it) => (shareOf(it) && (lineOf(it).shares.length > 1 || !used.has(keyOf(it)))) || (!used.has(keyOf(it)) && lineOf(it)?.promotionId === promo.id))
      .map((it) => (shareOf(it) && lineOf(it).shares.length > 1 ? { ...it, offerUnits: shareOf(it).units, offerUnitPrice: shareOf(it).unitPrice } : it));
    if (!rewards.length) return; // gift-only / order-level offers are shown elsewhere
    rewards.forEach((it) => used.add(keyOf(it))); // a split line still shows under its other offer (filter above)
    const trig = new Set(promo.triggerProductIds || []);
    const triggers = cartItems.filter((it) => !used.has(keyOf(it)) && trig.has(idOf(it)));
    triggers.forEach((it) => used.add(keyOf(it)));
    // A repeating offer ("a stand with EVERY katana") with several katana lines and several
    // reward lines reads as one box per katana: katana 1 -> its stand, katana 2 -> its stand.
    // Lines are paired in order; anything left over joins the last box.
    if (triggers.length > 1 && rewards.length > 1) {
      const n = Math.min(triggers.length, rewards.length);
      for (let i = 0; i < n; i += 1) {
        const last = i === n - 1;
        const t = last ? triggers.slice(i) : [triggers[i]];
        const r = last ? rewards.slice(i) : [rewards[i]];
        const savings = r.reduce((sum, it) => sum + (it.offerUnits != null ? (Number(lineOf(it)?.originalUnitPrice || 0) - it.offerUnitPrice) * it.offerUnits : Number(lineOf(it)?.savings || 0)), 0);
        groups.push({ promo, savings, triggers: t, rewards: r, part: i });
      }
      return;
    }
    groups.push({ promo, savings: Number(pricing?.savingsByPromotion?.[promo.id] || 0), triggers, rewards });
  });

  return { groups, rest: cartItems.filter((it) => !used.has(keyOf(it))) };
};
