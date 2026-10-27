import { useSelector } from "react-redux";
import { useGetGiftWrapOfferQuery } from "../store/api/userApi";

/**
 * One gift wrap per ELIGIBLE UNIT in the cart (admin opt-in per product — see
 * AddProductForm/EditProductForm's "Allow gift wrap" checkbox): sums quantity
 * across every eligible line, so 2x the same eligible product is 2 gift wraps.
 * A line counts if it carries the product's flag or the gift-wrap offer lists
 * its product (most add-to-cart buttons don't pass the flag). The server
 * re-derives the same count authoritatively at checkout — see
 * rp.payment.controller.js — this is just the matching display count.
 */
export function useGiftWrapQuantity() {
  const { data } = useGetGiftWrapOfferQuery();
  const ids = data?.data?.eligibleProductIds;
  return useSelector((state) =>
    state.cart.items.reduce(
      (sum, i) => (i.giftWrapEligible || ids?.includes(String(i.mongoId || i.id)) ? sum + (Number(i.quantity) || 0) : sum),
      0,
    ),
  );
}
