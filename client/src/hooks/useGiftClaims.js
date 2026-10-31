import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { claimGift, unclaimGift, giftClaimKey } from '../store/slices/cartSlice';
import { useCartPromotions } from './useCartPromotions';

/**
 * Explicit free-gift claiming for the cart / checkout UI (read side + actions).
 * Everything shown comes from the server's evaluation of the CURRENT cart, so what is
 * claimable, claimed or unavailable can never drift from what the order will contain.
 */
export function useGiftClaims() {
  const dispatch = useDispatch();
  const { gifts, isFetching } = useCartPromotions('cart');
  const claimedGifts = useSelector((s) => s.cart.claimedGifts);

  // `variantSku` is only passed for a "pick your variant" gift; choosing another variant replaces the earlier choice
  const claim = useCallback((g, variantSku) => {
    const sku = variantSku ?? g.variantSku;
    if (g.choice) {
      claimedGifts
        .filter((c) => String(c.promotionId) === String(g.promotionId) && c.productId === g.productId && (c.variantSku || '') !== (sku || ''))
        .forEach((c) => dispatch(unclaimGift(giftClaimKey(c))));
    }
    dispatch(claimGift({ promotionId: g.promotionId, productId: g.productId, variantSku: sku, quantity: g.quantity }));
  }, [dispatch, claimedGifts]);
  const unclaim = useCallback((g) => dispatch(unclaimGift(`${g.promotionId}:${g.productId}:${g.variantSku || ''}`)), [dispatch]);

  return {
    // eligible but not (fully) claimed yet
    claimable: gifts.filter((g) => g.status !== 'claimed'),
    // claimed and still valid (these become ₹0 FREE GIFT lines on the order)
    claimed: gifts.filter((g) => g.claimedQuantity > 0),
    claimedCount: claimedGifts.length,
    isFetching,
    claim,
    unclaim,
  };
}
