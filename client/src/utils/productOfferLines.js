// One short, live offer line per product for shop cards, worded for that
// product's role in the offer (built from GET promotions/display/home):
//   · reward product (the discounted/free last slot): "Get it FREE with 2 Katanas",
//     "₹150 Off with a Lamp"
//   · trigger product (what unlocks it):             "Buy & get Single or Double Stand FREE"
//   · same product in every slot (buy N of it):      "Buy 2: Save ₹249"
// Benefit text is the server-resolved `benefit` ("Save {save}" → "Save ₹120").
// A product can qualify for several offers: all are kept, admin order first.

const clean = (s) => (typeof s === 'string' && s.trim() && !/[{}]/.test(s) ? s.trim() : '');

// "Anime Wooden Katana" → "Katana", "Brake Caliper Lamp" → "Lamp" (same idea as the server's nounOf)
const GENERIC = new Set(['collection', 'set', 'pack', 'combo', 'series', 'kit', 'range', 'replica']);
const nounOf = (name = '') => {
  const words = String(name).replace(/[–—-].*$/, '').trim().split(/\s+/).filter(Boolean);
  while (words.length > 1 && GENERIC.has(words[words.length - 1].toLowerCase())) words.pop();
  return words.pop() || 'item';
};
const plural = (n, w) => (n > 1 ? `${n} ${/s$/i.test(w) ? w : `${w}s`}` : /^[aeiou]/i.test(w) ? `an ${w}` : `a ${w}`);

/**
 * @param {object[]} combos   home combo payload
 * @param {Map<string,string>} nameById productId → productName (for "with 2 Katanas")
 * @returns {Map<string, Array<{ text: string, title: string }>>} keyed by productId
 */
export const buildOfferLines = (combos = [], nameById = new Map()) => {
  const out = new Map();
  const put = (id, text, title) => {
    if (!id || !text) return;
    const list = out.get(id) || [];
    if (!list.some((x) => x.title === title)) list.push({ text, title });
    out.set(id, list);
  };

  combos.forEach((c) => {
    const benefit = clean(c?.benefit) || clean(c?.savingsLabel);
    const title = clean(c?.title) || benefit;
    if (!benefit) return;
    const slots = (c?.builder?.combos?.[0]?.slots || []).map((s) => (s?.options || []).map((o) => String(o.productId)).filter(Boolean));
    if (!slots.length) return;
    const all = new Set(slots.flat());

    if (all.size === 1) { // "buy N of the same product"
      put([...all][0], `Buy ${slots.length}: ${benefit}`, title);
      return;
    }
    const last = slots[slots.length - 1];
    const before = new Set(slots.slice(0, -1).flat());
    const rewardIds = last.filter((id) => !before.has(id));
    const triggerIds = [...before];
    if (rewardIds.length) {
      const trigNoun = nounOf(nameById.get(triggerIds[0]) || '');
      const withWhat = plural(slots.length - 1, trigNoun);
      const text = /free/i.test(benefit) ? `Get it FREE with ${withWhat}` : `${benefit.replace(/\s+on\s+.+$/i, '')} with ${withWhat}`;
      rewardIds.forEach((id) => put(id, text, title));
    }
    triggerIds.forEach((id) => put(id, `Buy & get ${benefit}`, title));
  });
  return out;
};
