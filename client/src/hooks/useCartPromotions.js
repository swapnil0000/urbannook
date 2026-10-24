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
  const payloadItems = buildPromotionCartItems(items);

  const { currentData, isFetching } = useGetCartPromotionsQuery(
    { items: payloadItems, subtotal: Number(totalAmount) || 0, placement, couponCode: couponCode || undefined, addedItem: addedItem || undefined, previewPromotionIds: previewPromotionIds || undefined },
    { skip: !enabled || (payloadItems.length === 0 && !previewPromotionIds?.length) },
  );

  return { promotions: currentData?.data?.promotions || [], pricing: currentData?.data?.pricing || null, isFetching };
}
