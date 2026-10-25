import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useGetHomeComboOffersQuery } from '../../store/api/userApi';
import { useCartPromotions } from '../../hooks/useCartPromotions';
import {
  getOfferInterests, forgetOfferInterest, dismissOfferReminder,
  isOfferReminderDismissed, clearOfferReminderDismissals,
} from '../../utils/offerInterest';
import ComboBuilderSheet from '../ComboBuilderSheet';

/**
 * On the checkout page: if the shopper opened an offer earlier, added at least
 * one of its products, that offer is still live, and the cart does not satisfy
 * it yet, offer the combo sheet in
 * "reminder" mode — it fills in what is already in the cart and asks only for
 * what is missing. "No thanks" closes it for the rest of the session and
 * checkout continues untouched; nothing here blocks or changes payment.
 */
const OfferCheckoutReminder = () => {
  const cartItems = useSelector((s) => s.cart.items);
  const { data } = useGetHomeComboOffersQuery();
  const combos = data?.data?.combos;
  const [open, setOpen] = useState(false);
  const decided = useRef(false);

  // a finished order empties the cart: start the next checkout attempt fresh
  useEffect(() => { if (!cartItems?.length) clearOfferReminderDismissals(); }, [cartItems?.length]);

  // the offer the shopper looked at: still live (present in the home offers) and not dismissed
  const target = useMemo(() => {
    if (!combos) return null;
    for (const interest of getOfferInterests()) {
      const combo = combos.find((c) => String(c.id) === String(interest.promotionId));
      if (!combo) { forgetOfferInterest(interest.promotionId); continue; } // ended / no longer valid
      if (isOfferReminderDismissed(combo.id) || !combo.builder?.combos?.length) continue;
      // only someone who actually added a product of this offer (not just looked at it)
      const offerProducts = new Set(combo.builder.combos.flatMap((c) => c.slots.flatMap((sl) => sl.options.map((o) => String(o.productId)))));
      const hasOne = (cartItems || []).some((i) => offerProducts.has(String(i.productId || i.mongoId || i.id)));
      if (hasOne) return combo;
    }
    return null;
  }, [combos, cartItems]);

  // an offer can be unlocked through any of its combinations (wooden / LED / mixed ...)
  const familyIds = useMemo(() => (target ? [...new Set([String(target.id), ...(target.relatedPromotionIds || []), ...target.builder.combos.map((c) => c.promotionId)].map(String))] : null), [target]);
  const { promotions, isFetching } = useCartPromotions('cart', null, null, Boolean(target) && cartItems?.length > 0, familyIds);
  const family = familyIds ? promotions.filter((p) => familyIds.includes(p.id)) : [];
  const entry = family.length ? family : null;

  useEffect(() => {
    if (decided.current || !target || isFetching || !cartItems?.length) return;
    if (!entry) return; // not evaluated (offer no longer applicable)
    decided.current = true; // decide once per checkout visit
    if (!entry.some((e) => e.progress?.complete)) setOpen(true);
  }, [target, entry, isFetching, cartItems?.length]);

  if (!open || !target) return null;
  return (
    <ComboBuilderSheet
      combo={target}
      mode="reminder"
      cartItems={cartItems}
      onClose={() => setOpen(false)}
      onDismiss={() => { dismissOfferReminder(target.id); setOpen(false); }}
    />
  );
};

export default OfferCheckoutReminder;
