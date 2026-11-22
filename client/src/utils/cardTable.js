// Inverse of the server's packCards (server/src/utils/cardTable.util.js): `cardIdx: [n]` + `cardTable` back into
// `cards: [...]`. A response without a `cardTable` (old server, or no ?dedupe) is returned untouched.
export const unpackCards = (data) => {
  const table = data?.cardTable;
  if (!Array.isArray(table)) return data;
  const walk = (node) => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== 'object') return node;
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === 'cardIdx' && Array.isArray(v)) out.cards = v.map((i) => table[i]);
      else if (k !== 'cardTable') out[k] = walk(v);
    }
    return out;
  };
  return walk(data);
};
