// One naming pattern for every combo offer, built from what the offer really
// is (its builder slots + reward + server-resolved benefit), not from the
// free-text admin title ("DHAMAKA DEAL", "COMBO OFFER" said nothing):
//   Buy 2 Kunai, get 1 FREE · Buy 2 Katanas, get a Stand FREE
//   Buy a Lamp, get ₹150 off a Pen Stand · Buy 2 Pen Stands, save ₹120
// Falls back to the admin title when the structure can't be read.

const GENERIC = new Set(['collection', 'set', 'pack', 'combo', 'series', 'kit', 'range', 'replica', 'inspired']);
export const nounOf = (name = '') => {
  const words = String(name).replace(/[–—(].*$/, '').trim().split(/\s+/).filter(Boolean);
  while (words.length > 1 && GENERIC.has(words[words.length - 1].toLowerCase())) words.pop();
  // "Display Stand" / "Pen Stand" read better as two words
  const last = words.pop() || 'item';
  const prev = words.pop();
  return prev && /^(pen|display|led)$/i.test(prev) ? `${/^led$/i.test(prev) ? "LED" : prev} ${last}` : last;
};
const cap = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
const many = (n, w) => (n > 1 ? `${n} ${/s$|kunai$/i.test(w) ? w : `${w}s`}` : `${/^([aeiou]|LED)/i.test(w) ? 'an' : 'a'} ${w}`);
const amountOf = (benefit = '') => (benefit.match(/₹\s?[\d,]+|\d+\s?%/) || [])[0]?.replace(/\s/g, '');

export const offerName = (c, nameById = new Map()) => {
  const slots = (c?.builder?.combos?.[0]?.slots || []).map((s) => (s?.options || []).map((o) => String(o.productId)));
  const benefit = String(c?.benefit || '');
  const free = /free/i.test(benefit) || c?.builder?.combos?.[0]?.reward?.kind === 'free';
  const amt = amountOf(benefit);
  if (!slots.length) return c?.title || benefit;
  const noun = (id) => cap(nounOf(nameById.get(id) || ''));
  const all = new Set(slots.flat());
  if (all.size === 1) {
    const n = noun([...all][0]);
    if (free) return `Buy ${slots.length} ${n}, get 1 FREE`.replace(`${slots.length} ${n}`, many(slots.length, n));
    return amt ? `Buy ${many(slots.length, n)}, save ${amt}` : `Buy ${many(slots.length, n)}`;
  }
  const trig = slots.slice(0, -1);
  const reward = slots[slots.length - 1];
  const tn = noun(trig[0]?.[0]);
  const rn = noun(reward[0]);
  if (!tn || !rn) return c?.title || benefit;
  const buy = `Buy ${many(trig.length, tn)}`;
  if (free) return `${buy}, get ${many(1, rn)} FREE`;
  // no amount to show: the admin title says what the reward is (never a bare "Buy X + Y")
  return amt ? `${buy}, get ${amt} off ${many(1, rn)}` : (c?.title || `${buy} + ${rn}`);
};
