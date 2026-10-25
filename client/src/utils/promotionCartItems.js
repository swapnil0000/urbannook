// Shared cart-item → Promotion Display API item shape, used by every
// surface that calls useGetCartPromotionsQuery/useGetCheckoutPromotionsQuery
// (the global unlock-sheet watcher, CartDrawer, MiniCartPreview, Checkout)
// so they all build IDENTICAL args for the same cart state — RTK Query only
// dedupes concurrent requests when args are structurally equal, so drifting
// this logic per-caller would silently multiply network calls.
export const buildPromotionCartItems = (cartItems) =>
  (cartItems || [])
    .map((item) => ({
      productId: item.productId || item.mongoId || item.id,
      quantity: typeof item.quantity === "object" ? Number(item.quantity?.quantity || 0) : Number(item.quantity || 0),
      selectedVariant: item.selectedVariant && item.selectedVariant !== "N/A" ? item.selectedVariant : undefined,
    }))
    .filter((i) => i.productId && i.quantity > 0);
