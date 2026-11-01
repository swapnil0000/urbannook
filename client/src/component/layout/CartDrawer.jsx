import { useEffect, useState, lazy, Suspense } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  useUpdateCartMutation,
  useGetFreeShippingOfferQuery,
  useGetGiftWrapOfferQuery,
  useGetCouponOffersQuery,
  useGetHomeComboOffersQuery,
} from '../../store/api/userApi';
import { updateQuantity, removeItem } from '../../store/slices/cartSlice';
import { resolveVariantTitle } from '../../utils/variantTitle';
import { trackViewCart, trackRemoveFromCart, track } from '../../utils/analytics';
import FreeShippingStrip from '../FreeShippingStrip';
import OfferProgress from '../festive/OfferProgress';
import GiftWrapOffer, { GiftWrapLineItem } from '../GiftWrapOffer';
import PromotionBannerList from '../promotions/PromotionBannerList';
import { groupCartByOffer } from '../../utils/cartOfferGroups';
import { offerName, nounOf } from '../../utils/offerName';
import { useGetProductsQuery } from '../../store/api/productsApi';
import { requestCheckout } from '../../utils/checkoutIntent';
import GiftClaimList from '../promotions/GiftClaimList';
import { CartGiftProgress } from '../offers/CartValueGift';
import { useCartPromotions } from '../../hooks/useCartPromotions';
// The old combo-banner/cart-rule discount preview (FreeShippingBanner,
// useEvaluateCartRulesQuery, useGetAllFreeShippingBannersQuery) was removed
// entirely 2026-10-09. Replaced 2026-10 by the Promotion V2 Display API -
// PromotionBannerList (applied/qualifying offers) + the global
// PromotionUnlockSheet (add-more-to-unlock, mounted at app root).

const OptimizedImage = lazy(() => import('../OptimizedImage'));

const CartDrawer = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [mounted, setMounted] = useState(false);
  // `shown` flips one frame AFTER mount, so the panel first paints off-screen
  // and then slides in. Driving the classes from isOpen directly mounted it
  // already at translate-x-0, so it popped in with no transition.
  const [shown, setShown] = useState(false);
  // Public coupons (same cached list as the sale bar / offers page) - drives the coupon badge.
  const { data: couponOffersRes } = useGetCouponOffersQuery('guest');
  const { data: homeCombosRes } = useGetHomeComboOffersQuery();
  const { data: cartProdRes } = useGetProductsQuery({ page: 1, limit: 24 });
  const cartNames = new Map((cartProdRes?.data?.listofPublishedProducts || cartProdRes?.data?.products || []).map((x) => [String(x.productId), x.productName]));
  const hasLiveCoupons = (couponOffersRes?.data || []).length > 0;

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

  // Free-shipping eligibility for the "Shipping" line below - threshold-only
  // for now (see file-header note on the removed discount/banner preview).
  const { data: offerRes } = useGetFreeShippingOfferQuery();

  // Promotion V2 - applied/qualifying offers shown as banners below; shares
  // its subscription with the app-root PromotionUnlockSheet (same
  // placement="cart" args), so opening the drawer never fires a second
  // promotion evaluation.
  const { promotions: cartPromotions, pricing: promotionPricing } = useCartPromotions('cart');

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
      let raf2;
      const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => setShown(true)); });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
        document.body.style.overflow = '';
      };
    }
    else {
      setShown(false);
      const timer = setTimeout(() => setMounted(false), 350);
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

    const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('authToken'); // no localStorage during SSR
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

    const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('authToken'); // no localStorage during SSR
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
    requestCheckout(navigate);
  };

  if (!mounted && !isOpen) return null;

  // Promotion V2 returns a server-calculated product discount preview. Gift
  // wrap still adds the Admin-configured amount charged at checkout.
  const giftWrapOffer = giftWrapOfferRes?.data;
  // Qty auto-scales with total ELIGIBLE UNITS in the cart - 2x the same
  // eligible product is 2 gift wraps, not 1 - same rule the server applies
  // at checkout.
  const giftWrapIds = giftWrapOffer?.eligibleProductIds;
  const giftWrapEligibleCount = cartItems.reduce((sum, i) => {
    if (!i.giftWrapEligible && !giftWrapIds?.includes(String(i.mongoId || i.id))) return sum;
    const qty = typeof i.quantity === 'object' ? Number(i.quantity?.quantity || 0) : Number(i.quantity || 0);
    return sum + qty;
  }, 0);
  const giftWrapAmount =
    giftWrapSelected && giftWrapOffer?.isActive
      ? (Number(giftWrapOffer.price) || 0) * giftWrapEligibleCount
      : 0;

  const promotionSavings = Number(promotionPricing?.savings) || 0;
  const subtotal = (promotionPricing?.discountedSubtotal ?? totalAmount) + giftWrapAmount;

  // Free shipping is a single admin-configured field - cart subtotal vs a ₹
  // threshold, nothing product-specific - so a plain comparison is the
  // correct (and only) eligibility check.
  const offerConfig = offerRes?.data;
  const isFreeShippingEligible =
    !!offerConfig?.isActive && (offerConfig?.thresholdAmount || 0) > 0 && subtotal >= offerConfig.thresholdAmount;

  // One cart line (used inside offer groups and in the plain list).
  const renderItem = (item) => {
                  const itemQty = typeof item.quantity === 'object' ? Number(item.quantity?.quantity || 0) : Number(item.quantity || 0);
                  const itemId = item.mongoId || item.productId || item.id;
                  const variant = item.selectedVariant && item.selectedVariant !== 'N/A' ? item.selectedVariant : null;
                  const displayName = resolveVariantTitle(item.name, item.variantTitleTemplate, item.selectedVariant);
                  const rawPrice = Number(item.price) || 0;
                  const rawLineTotal = rawPrice * itemQty;
                  const fullLine = promotionPricing?.lines?.find((line) =>
                    line.productId === String(itemId) &&
                    (line.selectedVariant || 'N/A') === (item.selectedVariant || 'N/A'));
                  // a line split between two offers (LED + Wooden on 2 Doubles): each offer box shows
                  // only its own units, so the saving is never counted twice
                  const shared = item.offerUnits != null && fullLine;
                  const priceLine = shared
                    ? { ...fullLine, originalLineTotal: fullLine.originalUnitPrice * item.offerUnits, lineTotal: item.offerUnitPrice * item.offerUnits,
                        savings: (fullLine.originalUnitPrice - item.offerUnitPrice) * item.offerUnits, discountedUnits: item.offerUnits }
                    : fullLine;

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

                          <div className="text-right">
                            {priceLine?.savings > 0 && <p className="text-[11px] text-muted line-through">₹{priceLine.originalLineTotal.toLocaleString('en-IN')}</p>}
                            <p className={`text-sm font-extrabold ${priceLine?.savings > 0 ? 'text-brand' : ''}`}>
                              ₹{(priceLine?.lineTotal ?? rawLineTotal).toLocaleString('en-IN')}
                            </p>
                            {priceLine?.savings > 0 && <p className="text-[10px] font-bold text-save">Save ₹{priceLine.savings.toLocaleString('en-IN')}</p>}
                          </div>
                        </div>
                        {/* more of this reward than the offer covers (e.g. a katana was removed but its
                            stand stayed): say plainly which units are at full price and how to fix it */}
                        {shared && (
                          <p className="mt-1 text-[11px] font-semibold text-muted">{item.offerUnits} of {itemQty} on this offer - the other{itemQty - item.offerUnits > 1 ? 's are' : ' is'} under your other offer</p>
                        )}
                        {!shared && priceLine?.discountedUnits > 0 && priceLine.discountedUnits < itemQty && (() => {
                          const extra = itemQty - priceLine.discountedUnits;
                          const promo = cartPromotions.find((pr) => pr.id === priceLine.promotionId);
                          const trigIds = new Set((promo?.triggerProductIds || []).map(String));
                          const trig = cartItems.find((ci) => trigIds.has(String(ci.mongoId || ci.productId || ci.id)));
                          const katana = trig ? nounOf(trig.name) : 'item';
                          const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
                          return (
                            <p className="mt-1.5 rounded-md bg-brand/[0.06] px-2 py-1 text-[11px] font-semibold leading-snug text-ink">
                              {priceLine.discountedUnits} at offer price {inr(priceLine.discountedUnitPrice)}, {extra} at full price {inr(priceLine.originalUnitPrice)}.
                              <span className="block font-normal text-muted">Each {katana} gets one stand. Add another {katana} to get {extra > 1 ? 'these' : 'this one'} at offer price too.</span>
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                  );
  };

  // Standard offer names (utils/offerName) - matched to the home combo by id.
  const offerTitle = (promo) => {
    // pick-your-reward offers keep their own clear title ("...with every Wooden Katana")
    if (promo.rewardOptions?.length) return promo.title;
    const c = (homeCombosRes?.data?.combos || []).find((x) => x.id === promo.id);
    // the cart's own reward label fills in a combo with no benefit text (e.g. "50% OFF")
    return c ? offerName({ ...c, benefit: c.benefit || promo.rewardLabel || '' }, cartNames) : promo.title;
  };
  const offerGroups = groupCartByOffer(cartItems, cartPromotions, promotionPricing);
  // Applied offers now live in their groups above; the banner list keeps the
  // ones still in progress ("add 1 more…"), so nothing is shown twice.
  // ...except an applied offer that still has a reward to pick (2 katanas, 1 stand): its
  // "pick one more" row stays, so the next stand can be added for the next katana.
  const pendingPromotions = cartPromotions.filter((pr) => pr.rewardTargetPending || !offerGroups.groups.some((g) => g.promo.id === pr.id));

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
        className={`absolute inset-0 bg-ink/50 backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none ${shown ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className={`relative w-full max-w-[430px] bg-paper h-full shadow-2xl flex flex-col transform transition-transform duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none will-change-transform ${
          shown ? 'translate-x-0' : 'translate-x-full'
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
        <div className="un-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4">

          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-5">
              <div className="w-20 h-20 rounded-full bg-brand/10 grid place-items-center">
                <i className="fa-solid fa-bag-shopping text-2xl text-brand" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold mb-1">Your cart is empty</h3>
                <p className="text-sm text-muted max-w-[240px] mx-auto leading-relaxed">Add a piece you love - it'll show up here.</p>
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
              {/* Free-shipping threshold nudge - hidden unless admin's promotion is on */}
              <OfferProgress location="cart" className="mb-3" fallback={<FreeShippingStrip cartTotal={subtotal} variant="compact" className="mb-3" />} />
              {/* Other active Promotion V2 offers - renders nothing when none apply */}
              <CartGiftProgress promotions={cartPromotions} className="mb-3" />
              <PromotionBannerList promotions={pendingPromotions} pricing={promotionPricing} className="mb-3" />
              {/* free gifts: claim card, then a FREE GIFT line once claimed - never added automatically */}
              <GiftClaimList className="mb-3" />
              <div className="divide-y divide-hair">
                {/* Offers grouped with what unlocked them: "because you added → you get" */}
                {offerGroups.groups.map(({ promo, savings, triggers, rewards, part = 0 }) => (
                  <section key={`${promo.id}-${part}`} className="mb-3 overflow-hidden rounded-xl border border-ink/15 bg-white shadow-sm" aria-label={`Offer: ${promo.title}`}>
                    {/* theme colours: ink header, red check + accent */}
                    {/* one line: label + standard offer name (wraps, never truncated) */}
                    <header className="flex items-start gap-2 bg-ink px-3 py-2 text-paper">
                      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand text-[9px] font-bold text-white" aria-hidden="true">✓</span>
                      <p className="min-w-0 flex-1 text-[12.5px] leading-snug"><span className="font-semibold text-paper/70">Offer applied · </span><span className="font-extrabold">{offerTitle(promo)}</span></p>
                    </header>
                    {/* the saving on its own strip, so it reads as the payoff */}
                    {savings > 0 && (
                      <p className="flex items-center gap-2 border-b border-brand/15 bg-brand/[0.07] px-3 py-1.5 text-[12px] font-bold text-brand">
                        You saved ₹{savings.toLocaleString('en-IN')} with this offer
                      </p>
                    )}
                    <div className="px-3">
                      {triggers.length > 0 && (
                        <>
                          <p className="pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted">Because you added</p>
                          <div className="divide-y divide-hair">{triggers.map(renderItem)}</div>
                        </>
                      )}
                      <p className="pt-2 text-[10px] font-bold uppercase tracking-wide text-brand">You get</p>
                      <div className="divide-y divide-hair">{rewards.map(renderItem)}</div>
                    </div>
                  </section>
                ))}
                {offerGroups.groups.length > 0 && offerGroups.rest.length > 0 && <p className="pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Also in your cart</p>}
                {offerGroups.rest.map(renderItem)}
                <GiftWrapLineItem />
              </div>
            </>
          )}
        </div>

        {/* --- FOOTER (CHECKOUT) --- */}
        {cartItems?.length > 0 && (
          <div className="px-4 pt-2.5 pb-3 sm:px-5 sm:pt-3 sm:pb-4 border-t border-hair shrink-0 shadow-[0_-8px_20px_-14px_rgba(0,0,0,0.25)]">
            {/* Gift wrap - renders nothing unless the admin's turned the
                seasonal offer on (Admin -> Offers -> Gift Wrap). */}
            <div className="border-b border-hair mb-2 sm:mb-3 empty:hidden">
              <GiftWrapOffer />
            </div>

            {/* Subtotal / shipping / total folded into one block: the total
                is what matters, the breakdown sits on one line under it. */}
            {/* Total, its amount right under it, then the breakdown */}
            <div className="mb-3 sm:mb-4">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Total</p>
              <div className="mt-0.5 flex items-baseline justify-between gap-3">
                <span className="text-2xl font-extrabold tabular-nums text-ink">₹{(Number(subtotal) || 0).toLocaleString('en-IN')}</span>
                {promotionSavings > 0 && <span className="rounded-full bg-save/10 px-2.5 py-1 text-[12px] font-extrabold text-save">You save ₹{promotionSavings.toLocaleString('en-IN')}</span>}
              </div>
              <div className="mt-1.5 space-y-0.5 text-[12px] text-muted">
                <p className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">₹{(Number(subtotal) || 0).toLocaleString('en-IN')}</span></p>
                {promotionSavings > 0 && <p className="flex justify-between"><span>Original price</span><span className="tabular-nums line-through">₹{((promotionPricing?.subtotal ?? totalAmount) + giftWrapAmount).toLocaleString('en-IN')}</span></p>}
                <p className="flex justify-between"><span>Shipping</span>{isFreeShippingEligible ? <span className="font-bold text-save">Free</span> : <span>Calculated at checkout</span>}</p>
              </div>
            </div>

            {/* "Avail Coupons at Checkout" badge on the button's shoulder -
                only while at least one public coupon is live (same rule as
                checkout's coupon entry: no coupon, no promise of one). */}
            <div className="relative">
              {hasLiveCoupons && <div className="absolute left-4 -top-3 z-10 overflow-visible rounded-lg bg-gradient-to-br from-[#e6322a] via-[#d30505] to-[#7a0000] px-3 py-1.5 border border-[#ffffff33]" style={{ boxShadow: '0 4px 12px rgba(211,5,5,0.45), 0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.35)' }}>
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
              </div>}
              <button
                onClick={handleCheckout}
                className="gl-press relative z-0 w-full h-12 bg-ink text-white rounded-xl font-bold uppercase tracking-[0.15em] text-[10px] hover:bg-brandHi transition-colors flex items-center justify-center gap-2 px-6"
              >
                  <span>Proceed to Checkout</span>
                  <i className="fa-solid fa-arrow-right-long"></i>
              </button>
            </div>
            {/* Trust line - secure checkout + partial COD on one row */}
            <div className="mt-2.5 flex flex-wrap justify-center items-center gap-x-3 gap-y-1 text-[10px] text-muted font-semibold">
              <span className="flex items-center gap-1 uppercase tracking-wider text-faint font-bold">
                <i className="fa-solid fa-lock" /> Secure Checkout
              </span>
              <span className="text-faint">·</span>
              <span className="flex items-center gap-1">
                <i className="fa-solid fa-hand-holding-dollar text-brand" />
                <span className="sm:hidden">Partial COD available</span>
                <span className="hidden sm:inline">Partial COD - small advance, rest at your door</span>
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CartDrawer;
