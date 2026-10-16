// Same normal form the admin panel saves SEO pages under
// (urbannook-admin/server/utils/seoPath.js) — keep the two identical.
export function normalizeSeoPath(input = "") {
  let p = String(input).trim();
  p = p.replace(/^https?:\/\/[^/]+/i, "");
  p = p.split("#")[0].split("?")[0];
  try { p = decodeURI(p); } catch { /* keep as-is */ }
  if (!p.startsWith("/")) p = `/${p}`;
  p = p.replace(/\/{2,}/g, "/");
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p.toLowerCase();
}
