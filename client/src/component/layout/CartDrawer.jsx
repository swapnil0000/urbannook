import { useEffect, useState, lazy, Suspense } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  useUpdateCartMutation,
  useGetFreeShippingOfferQuery,
  useGetGiftWrapOfferQuery,
} from '../../store/api/userApi';
import { updateQuantity, removeItem } from '../../store/slices/cartSlice';
import { resolveVariantTitle } from '../../utils/variantTitle';
import { setShowLoginModal, setLoginCallback } from '../../store/slices/uiSlice';
import { trackViewCart, trackRemoveFromCart, track } from '../../utils/analytics';
import FreeShippingStrip from '../FreeShippingStrip';
import GiftWrapOffer, { GiftWrapLineItem } from '../GiftWrapOffer';
// The old combo-banner/cart-rule discount preview (FreeShippingBanner,
// useEvaluateCartRulesQuery, useGetAllFreeShippingBannersQuery) was removed
// entirely 2026-10-09 — this drawer now shows plain cart totals + the
// free-shipping threshold only. A Promotion V2-based discount preview and
// add-on nudge is a deliberate follow-up (data layer already exists —
// useGetCartPromotionsQuery, src/store/api/userApi.js), not an oversight.

const OptimizedImage = lazy(() => import('../OptimizedImage'));

const CartDrawer = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [mounted, setMounted] = useState(false);

  const { items: cartItems, totalAmount, giftWrap: giftWrapSelected } = useSelector((state) => state.cart);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { data: giftWrapOfferRes } = useGetGiftWrapOfferQuery();

  // Replays the ticket's one-time shimmer sweep each time the drawer opens
  // (not on every re-render while it's already open) by remounting the
  // shimmer div via `key`.
  const [shimmerKey, setShimmerKey] = useState(0);
  useEffect(() => {
    if (isOpen) setShimmerKey((k) => k + 1);
  }, [isOpen]);

  const [updateCart] = useUpdateCartMutation();

  // Free-shipping eligibility for the "Shipping" line below — threshold-only
  // for now (see file-header note on the removed discount/banner preview).
  const { data: offerRes } = useGetFreeShippingOfferQuery();

  // Map a cart line item → analytics item shape
  const toTrackItem = (item) => ({
    itemId: item.productId || item.id || item.mongoId,
    sku: item.sku,
    itemName: item.name,
    itemVariant: item.selectedVariant,
    price: Number(item.price) || 0,
    quantity: typeof item.quantity === 'object' ? Number(item.quantity?.quantity || 0) : Number(item.quantity || 0),
  });

  // Handle animation mounting
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
    else {
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Fire view_cart when the drawer opens with items in it
  useEffect(() => {
    if (isOpen && cartItems.length > 0) {
      trackViewCart({ value: Number(totalAmount) || 0, items: cartItems.map(toTrackItem) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleQuantityChange = async (productId, selectedVariant, newQuantity, mongoId, currentQty, image) => {
    const effectiveVariant = selectedVariant || 'N/A';
    if (newQuantity <= 0) {
      handleRemoveItem(productId, effectiveVariant, mongoId);
      return;
    }

    track('quantity_changed', {
      item_id: productId,
      old_quantity: currentQty,
      new_quantity: newQuantity,
      placement: 'cart_drawer',
    });

    const hasToken = !!localStorage.getItem('authToken');
    const isLoggedIn = isAuthenticated || hasToken;

    if (isLoggedIn) {
      try {
        const action = newQuantity > currentQty ? 'add' : 'sub';
        await updateCart({ productId: mongoId || productId, quantity: 1, action, variant: effectiveVariant, image }).unwrap();
      } catch (error) {
        console.error('Failed to update cart:', error);
      }
    } else {
      dispatch(updateQuantity({ id: productId, quantity: newQuantity, selectedVariant: effectiveVariant }));
    }
  };

  const handleRemoveItem = async (productId, selectedVariant, mongoId) => {
    const effectiveVariant = selectedVariant || 'N/A';

    const removed = cartItems.find(
      (i) => (i.mongoId || i.productId || i.id) === (mongoId || productId) &&
             (i.selectedVariant || 'N/A') === effectiveVariant
    );
    if (removed) trackRemoveFromCart(toTrackItem(removed));

    const hasToken = !!localStorage.getItem('authToken');
    const isLoggedIn = isAuthenticated || hasToken;

    if (isLoggedIn) {
      try {
        await updateCart({ productId: mongoId || productId, quantity: 1, action: 'remove', variant: effectiveVariant }).unwrap();
      } catch (error) {
        console.error('Failed to remove item:', error);
      }
    } else {
      dispatch(removeItem({ id: productId, selectedVariant: effectiveVariant }));
    }
  };

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  if (!mounted && !isOpen) return null;

  // Plain totals for now — see file-header note on the removed discount
  // preview. Gift wrap still adds to what's actually charged at checkout —
  // same price the GiftWrapLineItem row above shows.
  const giftWrapOffer = giftWrapOfferRes?.data;
  // Qty auto-scales with total ELIGIBLE UNITS in the cart — 2x the same
  // eligible product is 2 gift wraps, not 1 — same rule the server applies
  // at checkout.
  const giftWrapEligibleCount = cartItems.reduce((sum, i) => {
    if (!i.giftWrapEligible) return sum;
    const qty = typeof i.quantity === 'object' ? Number(i.quantity?.quantity || 0) : Number(i.quantity || 0);
    return sum + qty;
  }, 0);
  const giftWrapAmount =
    giftWrapSelected && giftWrapOffer?.isActive
      ? (Number(giftWrapOffer.price) || 0) * giftWrapEligibleCount
      : 0;

  const subtotal = totalAmount + giftWrapAmount;

  const offerConfig = offerRes?.data;
  const thresholdEligible =
    !!offerConfig?.isActive && (offerConfig?.thresholdAmount || 0) > 0 && subtotal >= offerConfig.thresholdAmount;
  const isFreeShippingEligible = thresholdEligible;

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end font-inter text-ink">

      <style>{`
        .un-cart-ticket-shimmer {
          animation: ppc-shimmer 1.1s ease-out 1 forwards;
        }
        @keyframes un-coupon-star-float {
          0% { transform: translateY(3px) scale(0.4) rotate(0deg); opacity: 0; }
          25% { opacity: 1; }
          100% { transform: translateY(-14px) scale(1) rotate(30deg); opacity: 0; }
        }
        .un-coupon-star {
          position: absolute;
          pointer-events: none;
          animation: un-coupon-star-float 2.4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .un-cart-ticket-shimmer { animation: none; opacity: 0; }
          .un-coupon-star { animation: none; opacity: 0; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-ink/50 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className={`relative w-full max-w-[430px] bg-paper h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >

        {/* --- HEADER --- */}
        <div className="px-5 py-3 border-b border-hair flex items-center justify-between shrink-0">
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-xl font-extrabold tracking-tight">Your Cart</h2>
            <span className="gl-lbl text-brand text-[11px]">{cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close cart"
            className="w-9 h-9 rounded-full border border-hair grid place-items-center text-muted hover:border-ink hover:text-ink transition-colors"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* --- SCROLLABLE CONTENT --- */}
        <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-hide">

          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-5">
              <div className="w-20 h-20 rounded-full bg-brand/10 grid place-items-center">
                <i className="fa-solid fa-bag-shopping text-2xl text-brand" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold mb-1">Your cart is empty</h3>
                <p className="text-sm text-muted max-w-[240px] mx-auto leading-relaxed">Add a piece you love — it'll show up here.</p>
              </div>
              <button
                onClick={() => { onClose(); navigate('/products'); }}
                className="gl-press bg-brand text-white text-sm font-bold px-7 py-3 rounded-xl hover:bg-brandHi transition-colors"
              >
                Start shopping
              </button>
            </div>
          ) : (
            <>
              {/* Free-shipping threshold nudge — hidden unless admin's promotion is on */}
              <FreeShippingStrip cartTotal={subtotal} variant="compact" className="mb-3" />
              <div className="divide-y divide-hair">
                {cartItems.map((item) => {
                  const itemQty = typeof item.quantity === 'object' ? Number(item.quantity?.quantity || 0) : Number(item.quantity || 0);
                  const itemId = item.mongoId || item.productId || item.id;
                  const variant = item.selectedVariant && item.selectedVariant !== 'N/A' ? item.selectedVariant : null;
                  const displayName = resolveVariantTitle(item.name, item.variantTitleTemplate, item.selectedVariant);
                  const rawPrice = Number(item.price) || 0;
                  const rawLineTotal = rawPrice * itemQty;

                  return (
                    <div key={`${itemId}-${item.selectedVariant || 'N/A'}`} className="flex gap-3 py-3 first:pt-0">

                      {/* Image */}
                      <button
                        onClick={() => { onClose(); navigate(`/product/${item.productId || itemId}`); }}
                        className="w-16 h-16 rounded-lg overflow-hidden border border-hair bg-surface shrink-0"
                        aria-label={`View ${displayName}`}
                      >
                        <Suspense fallback={<div className="w-full h-full bg-hair animate-pulse" />}>
                          <OptimizedImage
                            src={item.image || '/placeholder.jpg'}
                            alt={displayName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </Suspense>
                      </button>

                      {/* Details */}
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-bold leading-snug line-clamp-2 pr-1 hover:text-brand transition-colors cursor-pointer"
                            onClick={() => { onClose(); navigate(`/product/${item.productId || itemId}`); }}>
                            {displayName}
                          </h4>
                          <button
                            onClick={() => handleRemoveItem(itemId, item.selectedVariant, item.mongoId)}
                            aria-label="Remove item"
                            className="shrink-0 -mt-0.5 -mr-1 p-1 text-faint hover:text-brand transition-colors"
                            title="Remove"
                          >
                            <i className="fa-regular fa-trash-can text-xs" />
                          </button>
                        </div>

                        {(() => {
                          const parts = [item.category, variant].filter(Boolean);
                          return parts.length ? (
                            <p className="text-[10px] text-muted mt-0.5 font-semibold uppercase tracking-wide truncate">{parts.join(' | ')}</p>
                          ) : null;
                        })()}

                        <div className="mt-auto pt-1.5 flex items-center justify-between">
                          {/* Quantity */}
                          <div className="flex items-center border border-hair rounded-full h-7">
                            <button
                              onClick={() => handleQuantityChange(itemId, item.selectedVariant, Math.max(0, itemQty - 1), item.mongoId, itemQty, item.image)}
                              className="w-7 h-full grid place-items-center text-muted hover:text-brand transition-colors"
                              aria-label="Decrease quantity"
                            >
                              <i className="fa-solid fa-minus text-[10px]" />
                            </button>
                            <span className="min-w-[20px] text-center text-xs font-bold tabular-nums">{itemQty}</span>
                            <button
                              onClick={() => handleQuantityChange(itemId, item.selectedVariant, itemQty + 1, item.mongoId, itemQty, item.image)}
                              className="w-7 h-full grid place-items-center text-muted hover:text-brand transition-colors"
                              aria-label="Increase quantity"
                            >
                              <i className="fa-solid fa-plus text-[10px]" />
                            </button>
                          </div>

                          {/* Plain price for now — see file-header note on the removed discount preview */}
                          <p className="text-sm font-extrabold">₹{rawLineTotal.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <GiftWrapLineItem />
              </div>
            </>
          )}
        </div>

        {/* --- FOOTER (CHECKOUT) --- */}
        {cartItems?.length > 0 && (
          <div className="px-5 pt-3 pb-4 border-t border-hair shrink-0 shadow-[0_-8px_20px_-14px_rgba(0,0,0,0.25)]">
            {/* Gift wrap — renders nothing unless the admin's turned the
                seasonal offer on (Admin -> Offers -> Gift Wrap). */}
            <div className="border-b border-hair mb-3 empty:hidden">
              <GiftWrapOffer />
            </div>

            {/* Subtotal / shipping / total folded into one block: the total
                is what matters, the breakdown sits on one line under it. */}
            <div className="flex items-end justify-between gap-3 mb-4">
              <div className="min-w-0">
                <p className="text-sm font-bold">Total</p>
                <p className="text-[11px] text-muted mt-0.5">
                  Subtotal ₹{(Number(subtotal) || 0).toLocaleString('en-IN')}
                  <span className="mx-1.5 text-faint">·</span>
                  Shipping{' '}
                  {isFreeShippingEligible ? (
                    <span className="font-bold text-save">Free</span>
                  ) : (
                    <span>at checkout</span>
                  )}
                </p>
              </div>
              <span className="text-xl font-extrabold tabular-nums">₹{(Number(subtotal) || 0).toLocaleString('en-IN')}</span>
            </div>

            {/* Static "Avail Coupons at Checkout" badge sitting on the
                button's shoulder — solid, fully opaque, on TOP of the button.
                Always shown, unconditionally — not tied to any real coupon
                count. */}
            <div className="relative">
              <div className="absolute left-4 -top-3 z-10 overflow-visible rounded-lg bg-gradient-to-br from-[#e6322a] via-[#d30505] to-[#7a0000] px-3 py-1.5 border border-[#ffffff33]" style={{ boxShadow: '0 4px 12px rgba(211,5,5,0.45), 0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.35)' }}>
                <span className="un-coupon-star" style={{ top: '-9px', right: '10px', fontSize: '10px', color: '#ffd23f' }} aria-hidden="true">
                  <i className="fa-solid fa-star" />
                </span>
                <span className="un-coupon-star" style={{ top: '-4px', right: '-2px', fontSize: '9px', color: '#ff9ecb', animationDelay: '0.8s' }} aria-hidden="true">
                  <i className="fa-solid fa-star" />
                </span>
                <span className="un-coupon-star" style={{ top: '-10px', right: '-6px', fontSize: '10px', color: '#ffd23f', animationDelay: '1.5s' }} aria-hidden="true">
                  <i className="fa-solid fa-star" />
                </span>
                <div className="relative z-[1] overflow-hidden rounded-lg">
                  <span className="relative z-[1] flex items-center">
                    <span className="text-[8px] font-bold text-white uppercase tracking-wide whitespace-nowrap">
                      Avail Coupons at Checkout
                    </span>
                  </span>
                  <span
                    key={shimmerKey}
                    className="un-cart-ticket-shimmer pointer-events-none absolute inset-0 z-0"
                    style={{ background: 'linear-gradient(100deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0) 70%)' }}
                  />
                </div>
              </div>
              <button
                onClick={handleCheckout}
                className="gl-press relative z-0 w-full h-12 bg-ink text-white rounded-xl font-bold uppercase tracking-[0.15em] text-[10px] hover:bg-brandHi transition-colors flex items-center justify-center gap-2 px-6"
              >
                  <span>Proceed to Checkout</span>
                  <i className="fa-solid fa-arrow-right-long"></i>
              </button>
            </div>
            {/* Trust line — secure checkout + partial COD on one row */}
            <div className="mt-2.5 flex flex-wrap justify-center items-center gap-x-3 gap-y-1 text-[10px] text-muted font-semibold">
              <span className="flex items-center gap-1 uppercase tracking-wider text-faint font-bold">
                <i className="fa-solid fa-lock" /> Secure Checkout
              </span>
              <span className="text-faint">·</span>
              <span className="flex items-center gap-1">
                <i className="fa-solid fa-hand-holding-dollar text-brand" />
                Partial COD — small advance, rest at your door
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CartDrawer;
