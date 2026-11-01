// Short swatch labels: drop the words every variant shares at the start/end,
// so "Single / Double / Triple Katana Sword Display Stand" read as
// "Single / Double / Triple". Falls back to the full name when nothing is left.
export const shortVariantNames = (names = []) => {
  const split = names.map((n) => String(n || '').trim().split(/\s+/));
  if (split.length < 2) return names;
  const minLen = Math.min(...split.map((w) => w.length));
  let pre = 0;
  while (pre < minLen - 1 && split.every((w) => w[pre].toLowerCase() === split[0][pre].toLowerCase())) pre++;
  let suf = 0;
  while (suf < minLen - pre - 1 && split.every((w) => w[w.length - 1 - suf].toLowerCase() === split[0][split[0].length - 1 - suf].toLowerCase())) suf++;
  return split.map((w, i) => w.slice(pre, w.length - suf).join(' ').replace(/^[–—\-:,]+|[–—\-:,]+$/g, '').trim() || names[i]);
};
