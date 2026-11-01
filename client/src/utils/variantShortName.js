// Short design labels: drop words EVERY variant shares (wherever they sit), so
// "Zoro Enma Wooden Katana (White) / Rengoku Wooden Katana" read as
// "Zoro Enma (White) / Rengoku". Falls back to the full name if nothing is left.
export const shortVariantNames = (names = []) => {
  if (names.length < 2) return names;
  const words = names.map((n) => String(n || '').trim().split(/\s+/));
  const shared = new Set(words[0].map((w) => w.toLowerCase()).filter((w) => words.every((ws) => ws.some((x) => x.toLowerCase() === w))));
  return words.map((ws, i) => ws.filter((w) => !shared.has(w.toLowerCase())).join(' ').replace(/^[–—\-:,]+|[–—\-:,]+$/g, '').trim() || names[i]);
};
