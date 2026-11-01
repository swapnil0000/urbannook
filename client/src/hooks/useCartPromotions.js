import { useSelector } from "react-redux";
import { useGetCartPromotionsQuery } from "../store/api/userApi";
import { buildPromotionCartItems } from "../utils/promotionCartItems";

/**
 * Shared Promotion V2 cart-display fetch — the one place everything reads
 * from (PromotionBannerList, the global unlock-sheet watcher) so they share
 * ONE RTK Query subscription instead of each firing its own POST
 * /promotions/display/cart. Renders nothing itself; callers decide what to
 * do with `promotions` (an empty array when no relevant/active offer
 * exists — never a placeholder/blank-section state).
 *
 * @param {'cart'|'mini_cart'} placement
 * @param {string|null} couponCode — pass the currently-applied coupon so a
 *   coupon-gated promotion's `qualifying`/`applied` reflects reality.
 */
export function useCartPromotions(placement = "cart", couponCode = null, addedItem = null, enabled = true, previewPromotionIds = null) {
  const items = useSelector((state) => state.cart.items);
  const totalAmount = useSelector((state) => state.cart.totalAmount);
  // claimed free gifts travel with every pricing call, so eligibility is re-evaluated server-side on each cart change
  const claimedGifts = useSelector((state) => state.cart.claimedGifts);
  const payloadItems = buildPromotionCartItems(items);

  const skip = !enabled || (payloadItems.length === 0 && !previewPromotionIds?.length);
  const { currentData, data, isFetching } = useGetCartPromotionsQuery(
    { items: payloadItems, subtotal: Number(totalAmount) || 0, placement, couponCode: couponCode || undefined, addedItem: addedItem || undefined, previewPromotionIds: previewPromotionIds || undefined, claimedGifts },
    { skip },
  );

  // While a changed cart is re-priced, keep showing the last answer (data) instead of
  // an empty list: popups and banners no longer blink away on every +/- click.
  // `ready` below still waits for the answer for THIS cart.
  const shown = currentData || (skip ? null : data);
  return {
    promotions: shown?.data?.promotions || [],
    pricing: shown?.data?.pricing || null,
    // explicit free-gift claiming: what the cart could claim / has claimed, and claims the server rejected
    gifts: shown?.data?.gifts || [],
    invalidGiftClaims: shown?.data?.invalidGiftClaims || [],
    isFetching,
    // true once the answer for the current cart is in (or there is nothing to ask)
    ready: (skip && enabled) || (Boolean(currentData) && !isFetching),
  };
}
