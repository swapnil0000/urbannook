// Single source of truth for "is this variant out of stock" on the
// storefront client — was previously copy-pasted with identical logic into
// 5 separate components. Mirrors the server's rule exactly (see the
// storefront server's utils/variantSort.js and rp.payment.controller.js):
// a manual flag, OR a tracked quantity (non-null) that's reached 0.
// variantOutOfStock is now auto-synced to quantity server-side on every
// write for TRACKED variants (see the admin/server variantSort.js's
// syncVariantOutOfStock), so this OR is mostly a defensive no-op for those —
// it's still load-bearing for UNTRACKED variants, where the flag is the
// only signal that exists.
export const isVariantOutOfStock = (variant) =>
  !!variant &&
  (variant.variantOutOfStock === true ||
    (variant.variantQuantity != null && Number(variant.variantQuantity) <= 0));

// A product reads as fully out of stock when every one of its ACTIVE
// variants is out of stock (a product with zero variants is never "all
// OOS" by this check — that's what productStatus is for).
export const allActiveVariantsOOS = (product) => {
  const active = (product?.variantDetails || []).filter((v) => v.isActive !== false);
  return active.length > 0 && active.every(isVariantOutOfStock);
};
