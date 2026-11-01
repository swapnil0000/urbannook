// The live offers a product takes part in, for shop cards and the PDP
// (GET promotions/display/home). Every line uses the offer's own benefit text,
// as admin names it, so wording is the same everywhere; server-resolved, so
// "Save {save}" arrives as "Save ₹120". Admin order first.

import { offerName } from './offerName';

const clean = (s) => (typeof s === 'string' && s.trim() && !/[{}]/.test(s) ? s.trim() : '');

/**
 * @param {object[]} combos   home combo payload
 * @returns {Map<string, Array<{ text: string, title: string }>>} keyed by productId
 */
export const buildOfferLines = (combos = [], nameById = new Map()) => {
  const out = new Map();
  // one wording everywhere: the offer's own benefit, as admin names it
  const put = (id, _role, title, text) => {
    if (!id || !text) return;
    const list = out.get(id) || [];
    if (!list.some((x) => x.title === title)) list.push({ text, title });
    out.set(id, list);
  };

  combos.forEach((c) => {
    const benefit = clean(c?.benefit) || clean(c?.savingsLabel);
    const title = clean(c?.title) || benefit;
    const std = offerName(c, nameById);
    if (!benefit) return;
    const slots = (c?.builder?.combos?.[0]?.slots || []).map((s) => (s?.options || []).map((o) => String(o.productId)).filter(Boolean));
    if (!slots.length) return;
    const all = new Set(slots.flat());

    if (all.size === 1) { // "buy N of the same product"
      put([...all][0], 'same', title, std);
      return;
    }
    const last = slots[slots.length - 1];
    const before = new Set(slots.slice(0, -1).flat());
    const rewardIds = last.filter((id) => !before.has(id));
    const triggerIds = [...before];
    rewardIds.forEach((id) => put(id, 'reward', title, std));
    triggerIds.forEach((id) => put(id, 'trigger', title, std));
  });
  return out;
};
