import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { claimGift, unclaimGift } from '../store/slices/cartSlice';
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

  const claim = useCallback((g) => dispatch(claimGift({ promotionId: g.promotionId, productId: g.productId, variantSku: g.variantSku, quantity: g.quantity })), [dispatch]);
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
