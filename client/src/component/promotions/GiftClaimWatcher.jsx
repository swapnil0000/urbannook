import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { pruneGiftClaims, claimGift, giftClaimKey } from '../../store/slices/cartSlice';
import { useCartPromotions } from '../../hooks/useCartPromotions';
import { useUI } from '../../hooks/useRedux';

/**
 * Mounted once at the app root (renders nothing). After EVERY cart change the cart pricing is
 * re-evaluated on the server (the claims travel with the request); if a claimed free gift is no
 * longer valid the server says so, and this drops exactly that claim and tells the shopper —
 * a gift is never kept (or turned into a charge) silently.
 */
const GiftClaimWatcher = () => {
  const dispatch = useDispatch();
  const { showNotification } = useUI();
  const items = useSelector((s) => s.cart.items);
  const claimed = useSelector((s) => s.cart.claimedGifts);
  const { invalidGiftClaims, gifts, isFetching } = useCartPromotions('cart');

  // an emptied cart has nothing to claim against
  useEffect(() => {
    if (!items?.length && claimed.length) dispatch(pruneGiftClaims(claimed.map(giftClaimKey)));
  }, [items?.length, claimed, dispatch]);

  // the cart shrank (e.g. 4 lamps → 2): a claim for more units than are still entitled is lowered to
  // what is valid, so a later re-growth can never silently re-claim the old, larger amount
  useEffect(() => {
    if (isFetching) return;
    for (const g of gifts) {
      const stored = claimed.find((c) => giftClaimKey(c) === `${g.promotionId}:${g.productId}:${g.variantSku || ''}`);
      if (stored && g.claimedQuantity > 0 && stored.quantity > g.claimedQuantity) {
        dispatch(claimGift({ ...stored, quantity: g.claimedQuantity }));
      }
    }
  }, [gifts, claimed, isFetching, dispatch]);

  useEffect(() => {
    if (isFetching || !invalidGiftClaims.length) return;
    dispatch(pruneGiftClaims(invalidGiftClaims.map((c) => c.key)));
    const names = [...new Set(invalidGiftClaims.map((c) => c.promotionName).filter(Boolean))];
    showNotification(
      `Your free gift${names.length ? ` from "${names.join('", "')}"` : ''} was removed because your cart no longer qualifies. You can claim it again when it does.`,
      'info',
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invalidGiftClaims, isFetching]);

  return null;
};

export default GiftClaimWatcher;
