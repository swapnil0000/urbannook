/**
 * Corner chip for a product's best offer (variant cards): `chip` is a short
 * "Free gift" / "Offer", never the bare "50% OFF" badge — the reward is often
 * on another product (a stand with a katana), and "50% OFF" on the katana card
 * would read as a discount on the katana. `label` is the full reward wording
 * (tooltip); the offer strip above the grid spells every offer out.
 */
export const bestOfferBadge = (promotions) => {
  const p = (promotions || []).filter((x) => x.fullyFunctional !== false).sort((a, b) => (a.displayRank ?? 99) - (b.displayRank ?? 99))[0];
  if (!p) return null;
  const gift = p.displayType === 'free_gift';
  return { label: p.rewardLabel || p.title || 'Offer available', chip: gift ? 'Free gift' : 'Offer', gift };
};

// Cart-value threshold of a site-wide offer ("orders above ₹1,999"), from the
// progress the server builds: a single "amount" step. null for anything else.
export const cartValueTarget = (p) => {
  const steps = p.progress?.steps || [];
  return steps.length === 1 && steps[0].kind === 'amount' ? Number(steps[0].need) || 0 : null;
};
