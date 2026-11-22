// GET /promotions/display/home?dedupe=1: each distinct product card is sent once in `cardTable`, and every
// `cards: [...]` becomes `cardIdx: [n, ...]`. The storefront undoes it (client/src/utils/cardTable.js). Opt-in: without
// the parameter the payload is unchanged (mobile app, older builds).
export const packCards = (data) => {
  const table = [];
  const seen = new Map();
  const intern = (card) => {
    const key = JSON.stringify(card);
    if (!seen.has(key)) { seen.set(key, table.length); table.push(card); }
    return seen.get(key);
  };
  const walk = (node) => {
    if (Array.isArray(node)) return node.map(walk);
    // ObjectIds, Dates etc. are not plain objects: leave them for JSON.stringify to serialise as before.
    if (!node || typeof node !== "object" || Object.getPrototypeOf(node) !== Object.prototype) return node;
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === "cards" && Array.isArray(v) && v.every((c) => c && typeof c === "object" && !Array.isArray(c))) out.cardIdx = v.map(intern);
      else out[k] = walk(v);
    }
    return out;
  };
  const packed = walk(data);
  return { ...packed, cardTable: table };
};

// GET /promotions/display/home?lite=1: without the variant lists only the combo-builder sheet needs (each option's
// `cards`, a combo's `options`); the sheet asks for ?dedupe=1 when it opens.
export const stripSheetData = (data) => ({
  ...data,
  combos: (data.combos || []).map(({ options, ...c }) => ({
    ...c,
    builder: c.builder && {
      ...c.builder,
      combos: (c.builder.combos || []).map((bc) => ({
        ...bc,
        slots: (bc.slots || []).map((sl) => ({ ...sl, options: (sl.options || []).map(({ cards, ...o }) => o) })),
      })),
    },
  })),
});
