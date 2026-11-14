// Kept in sync with urbannook-admin/server/utils/variantSort.js (separate
// codebase, same collection — see product.model.js's dimensions/specifications
// comment) and with this file's own isVariantOutOfStock in rp.payment.controller.js.
export const isVariantOOS = (v) =>
  !!v &&
  (v.variantOutOfStock === true ||
    (v.variantQuantity != null && Number(v.variantQuantity) <= 0));

// Quantity is the source of truth for a TRACKED variant (variantQuantity !=
// null): its variantOutOfStock is auto-set to match (true at <=0, false once
// restocked) every time it's written — a paid order's decrement (below, in
// rp.payment.controller.js) now actually flips the stored flag instead of it
// only ever mattering via isVariantOOS's OR-check at read time. An UNTRACKED
// variant (null quantity) is left completely untouched — no quantity to
// derive from, variantOutOfStock stays a pure manual field there. Kept in
// sync with the admin repo's copy.
export function syncVariantOutOfStock(variants) {
  if (!Array.isArray(variants)) return variants;
  return variants.map((v) =>
    v?.variantQuantity == null ? v : { ...v, variantOutOfStock: Number(v.variantQuantity) <= 0 }
  );
}

// Stable partition: in-stock variants keep their relative order, all
// out-of-stock variants move to the end (also keeping their relative order),
// and hidden variants (isActive false: unpublished drafts and retired ones)
// go after those, so variantDetails[0] is never a hidden variant. Kept in
// sync with the admin repo's copy.
export function sortVariantsOOSLast(variants) {
  if (!Array.isArray(variants)) return variants;
  const active = variants.filter((v) => v?.isActive !== false);
  const hidden = variants.filter((v) => v?.isActive === false);
  const inStock = active.filter((v) => !isVariantOOS(v));
  const oos = active.filter(isVariantOOS);
  return [...inStock, ...oos, ...hidden];
}

// A variant the admin has not published (or has retired) is never shown to
// or sold to a customer. Only for responses sent to the browser: never use it
// on a document that is written back, or the hidden variants would be deleted.
export const isVariantVisible = (v) => !!v && v.isActive !== false;

// True when the product has variants but the admin has hidden all of them:
// such a product is not on sale at all (no visible price, nothing to buy).
export const hasNoVisibleVariants = (product) =>
  Array.isArray(product?.variantDetails) &&
  product.variantDetails.length > 0 &&
  !product.variantDetails.some(isVariantVisible);

// First variant a customer may see; used for price/image fallbacks so an
// unsorted document never prices an order from a hidden variant.
export const firstVisibleVariant = (product) =>
  (product?.variantDetails || []).find(isVariantVisible) || null;

// For lists sent to the browser: drops hidden variants and any product left
// with nothing visible.
export function visibleProductsOnly(products) {
  return (products || []).filter((p) => !hasNoVisibleVariants(p)).map(withoutHiddenVariants);
}

export function withoutHiddenVariants(product) {
  if (!product || !Array.isArray(product.variantDetails)) return product;
  return { ...product, variantDetails: product.variantDetails.filter(isVariantVisible) };
}

// The product-level `productStatus` the storefront gates listing filters and
// order-creation eligibility on ("in_stock" | "out_of_stock" |
// "discontinued") — used to be fully manual, so a variant hitting 0 via a
// paid order's atomic decrement (below, in rp.payment.controller.js) never
// flipped it, leaving a sold-out item still looking purchasable. Derives the
// correct value from real stock: out_of_stock when every active variant is
// OOS (or, for a variantless product, productQuantity <= 0), in_stock
// otherwise. Never touches "discontinued" — that's a deliberate terminal
// state set by an admin on purpose. Kept in sync with the admin repo's copy.
export function deriveProductStatus(variantDetails, productQuantity, currentStatus) {
  if (currentStatus === "discontinued") return "discontinued";
  const activeVariants = (variantDetails || []).filter((v) => v?.isActive !== false);
  // Variants exist but none is published yet (a draft product): the storefront
  // hides it anyway, so keep the current status instead of a false "out of stock".
  if ((variantDetails || []).length > 0 && activeVariants.length === 0) return currentStatus || "in_stock";
  const outOfStock = activeVariants.length > 0
    ? activeVariants.every(isVariantOOS)
    : Number(productQuantity) <= 0;
  return outOfStock ? "out_of_stock" : "in_stock";
}
