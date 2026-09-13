import { useEffect, useState, lazy, Suspense } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  useUpdateCartMutation,
  useEvaluateCartRulesQuery,
  useGetFreeShippingOfferQuery,
  useGetAllFreeShippingBannersQuery,
  useGetGiftWrapOfferQuery,
} from '../../store/api/userApi';
import { updateQuantity, removeItem } from '../../store/slices/cartSlice';
import { resolveVariantTitle } from '../../utils/variantTitle';
import { setShowLoginModal, setLoginCallback } from '../../store/slices/uiSlice';
import { trackViewCart, trackRemoveFromCart, track } from '../../utils/analytics';
import FreeShippingBanner from '../FreeShippingBanner';
import GiftWrapOffer, { GiftWrapLineItem } from '../GiftWrapOffer';

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

  // Generic, data-driven cart-promotion rules (server/src/model/cartRule.model.js)
  // — same evaluator the payment controller uses for the real order total.
  // Needed here so the drawer's own price display doesn't disagree with
  // checkout/the actual charge (previously it never checked this at all,
  // so a discounted item like Pen Stand at 2+ Lamps still showed ₹299 here).
  const cartRuleEvalItems = cartItems
    .map((item) => ({
      productId: item.mongoId || item.id,
      quantity: typeof item.quantity === 'object' ? Number(item.quantity?.quantity || 0) : Number(item.quantity || 0),
      selectedVariant: item.selectedVariant,
    }))
    .filter((i) => i.productId && i.quantity > 0);
  const { data: cartRuleEvalData } = useEvaluateCartRulesQuery(cartRuleEvalItems, {
    skip: cartRuleEvalItems.length === 0,
  });
  // "Buy N more of this same product, get a lower unit price" — reuses the
  // SAME FreeShippingBanner card as the cross-sell combo nudges below
  // (merged into one carousel via __quantityNudge, see nudgeSlides) rather
  // than a separate component or a second stacked card. Stays a candidate
  // until enough of the product (any variant) is in the cart —
  // findQuantityDiscountNudges only returns an entry while remaining > 0.
  const quantityNudges = cartRuleEvalData?.data?.quantityNudges || [];

  // Free-shipping eligibility for the "Shipping" line below — mirrors the
  // same OR logic used at checkout/payment (rp.payment.controller.js): the
  // admin combo-banner offer, any active generic cart rule's free_shipping
  // effect, or the plain cart-value threshold. Previously this drawer never
  // showed shipping status at all, so the customer only found out at checkout.
  const { data: offerRes } = useGetFreeShippingOfferQuery();
  const { data: bannersRes } = useGetAllFreeShippingBannersQuery();
  const getItemDiscountedPrice = (item) => {
    const productId = item.mongoId || item.id;
    // A candidate may be tagged with `variantName` (offer scoped to one
    // variant) — untagged candidates apply to every variant, unchanged from
    // before this field existed. See cartRule.util.js getDiscountCandidatesForItem.
    const candidates = (cartRuleEvalData?.data?.discounts?.[productId] || []).filter(
      (c) => !c.variantName || c.variantName === item.selectedVariant,
    );
    const price = Number(item.price) || 0;
    if (!candidates?.length) return price;
    const results = candidates.map((c) =>
      c.type === 'percent_off' ? price * (1 - Number(c.value) / 100) : price - Number(c.value),
    );
    // Rounded to match the server's applyBestDiscount exactly (50% off ₹299
    // is ₹149.5 mathematically — both round that to ₹150, consistently).
    return Math.round(Math.max(Math.min(...results), 0));
  };

  // Map a cart line item → analytics item shape
  const toTrackItem = (item) => ({
    itemId: item.productId || item.id || item.mongoId,
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

  // totalAmount (Redux) doesn't know about cart-rule discounts — subtract
  // the same savings the line-item prices above already reflect, so the
  // drawer's own subtotal/total never disagrees with what checkout charges.
  const ruleDiscountSavings = cartItems.reduce((sum, item) => {
    const rawPrice = Number(item.price) || 0;
    const discounted = getItemDiscountedPrice(item);
    const qty = typeof item.quantity === 'object' ? Number(item.quantity?.quantity || 0) : Number(item.quantity || 0);
    return sum + (rawPrice - discounted) * qty;
  }, 0);
  // Gift wrap adds to what's actually charged at checkout — same price the
  // GiftWrapLineItem row above shows, so this can never disagree with it.
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

  const subtotal = totalAmount - ruleDiscountSavings + giftWrapAmount;

  // Same three-path eligibility used at checkout: admin combo banner (source
  // + recommended product both in cart), any active generic cart rule whose
  // effects include free_shipping, or the plain cart-value threshold.
  // Combo banners are independent of the offer doc's own `isActive` — that
  // flag is only the cart-VALUE-threshold on/off switch, not a master kill
  // switch for banners (each banner has its own isActive; server-side
  // getAllActiveBanners already only returns those).
  const offerConfig = offerRes?.data;
  const banners = bannersRes?.data || [];
  // .split(":")[0] guards against a composite "productId:variant" id (some
  // guest-cart paths use that key format) — matches the same parsing used
  // for this exact check on checkout, so the two can never disagree about
  // which products are "in the cart" for combo purposes.
  const cartProductIds = new Set(cartItems.map((i) => i.mongoId || i.id?.split(":")[0]));
  // Which selectedVariant name(s) of a product are actually in the cart —
  // lets a banner scoped to one variant (sourceVariantName/recommendedVariantName,
  // see freeShippingOffer.util.js) require that exact variant, not just the
  // product. A banner with no variant name behaves exactly as before.
  const cartVariantsByProduct = new Map();
  cartItems.forEach((i) => {
    const pid = i.mongoId || i.id?.split(":")[0];
    if (!pid) return;
    if (!cartVariantsByProduct.has(pid)) cartVariantsByProduct.set(pid, new Set());
    if (i.selectedVariant) cartVariantsByProduct.get(pid).add(i.selectedVariant);
  });
  const hasProductVariant = (productId, variantName) => {
    if (!cartProductIds.has(productId)) return false;
    if (!variantName) return true;
    return (cartVariantsByProduct.get(productId) || new Set()).has(variantName);
  };
  const comboEligible = banners.some(
    (b) => hasProductVariant(b.sourceProductId, b.sourceVariantName) && hasProductVariant(b.recommendedProductId, b.recommendedVariantName),
  );
  const thresholdEligible =
    !!offerConfig?.isActive && (offerConfig?.thresholdAmount || 0) > 0 && subtotal >= offerConfig.thresholdAmount;
  const isFreeShippingEligible = comboEligible || !!cartRuleEvalData?.data?.freeShipping || thresholdEligible;

  // Cross-sell nudge: every banner whose SOURCE product (and its required
  // variant, if any) is in the cart but its RECOMMENDED add-on isn't — one
  // persistent card, arrows page through all of them (see bannersOverride on
  // FreeShippingBanner) instead of a new card mounting/unmounting each time
  // the cart's nudge-worthy combo changes. Each banner's own isActive is the
  // only gate — not the parent offer doc's threshold toggle (see comment above).
  const nudgeBanners = banners.filter(
    (b) => hasProductVariant(b.sourceProductId, b.sourceVariantName) && !hasProductVariant(b.recommendedProductId, b.recommendedVariantName),
  );

  // Combo cross-sell nudges AND same-product quantity-discount nudges are
  // paged through in ONE shared carousel card (not two stacked cards) — a
  // quantity nudge is tagged with __quantityNudge so FreeShippingBanner can
  // tell the two slide kinds apart (see its `quantityNudge` derivation).
  const nudgeSlides = [
    ...nudgeBanners,
    ...quantityNudges.map((q) => ({
      sourceProductId: q.productId,
      recommendedProductId: q.productId,
      __quantityNudge: q,
    })),
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end">
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
        className={`absolute inset-0 bg-[#0a110e]/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className={`relative w-full max-w-[420px] bg-white h-full shadow-2xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >

        {/* --- HEADER --- */}
        <div className="px-6 pt-5 pb-3 border-b border-gray-100 bg-white z-10 shrink-0">
          <div className="flex items-start justify-between gap-4">
            {/* Title + COD + Item Count */}
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-serif text-[#0a110e] tracking-tight leading-none whitespace-nowrap">Your Nook</h2>
                <div className="flex items-center gap-1.5 bg-amber-100 rounded-full px-3 py-1.5 shrink-0">
                  <i className="fa-solid fa-hand-holding-dollar text-amber-600 text-xs" />
                  <p className="text-[8px] font-bold text-amber-800 uppercase tracking-widest whitespace-nowrap">COD Available</p>
                </div>
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">
                {cartItems.length} {cartItems.length === 1 ? 'ITEM' : 'ITEMS'}
              </p>
            </div>
            {/* Close Button */}
            <button
              onClick={onClose}
              className="group w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-[#0a110e] transition-all duration-300 shrink-0"
            >
              <i className="fa-solid fa-xmark text-sm group-hover:rotate-90 transition-transform duration-300"></i>
            </button>
          </div>
        </div>

        {/* --- SCROLLABLE CONTENT --- */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 scrollbar-hide">

          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-80">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-2 border border-dashed border-gray-200">
                <i className="fa-solid fa-bag-shopping text-3xl text-gray-300"></i>
              </div>
              <div>
                <h3 className="text-xl font-serif text-[#0a110e] mb-2">Your Bag is Empty</h3>
                <p className="text-sm text-gray-500 max-w-[220px] mx-auto leading-relaxed">
                  Looks like you haven't discovered your perfect piece yet.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  navigate('/products');
                }}
                className="px-8 py-3.5 bg-[#0a110e] text-white text-xs font-bold uppercase tracking-[0.15em] rounded-full hover:bg-[#1a2b24] transition-all duration-300"
              >
                Start Exploring
              </button>
            </div>
          ) : (
            <>
              {/* Items List */}
              <div className="space-y-3 sm:space-y-6">
                {cartItems.map((item) => {
                  // Mongoose bug safe extraction
                  const itemQty = typeof item.quantity === 'object' ? Number(item.quantity?.quantity || 0) : Number(item.quantity || 0);
                  const itemId = item.mongoId || item.productId || item.id;
                  const displayName = resolveVariantTitle(item.name, item.variantTitleTemplate, item.selectedVariant);

                  return (
                    <div key={`${itemId}-${item.selectedVariant || 'N/A'}`} className="flex items-stretch gap-3 sm:gap-4 group relative pb-3 sm:pb-6 border-b border-gray-50 last:border-0 last:pb-0">

                      {/* Image */}
                      <div className="w-[74px] h-[74px] sm:w-[85px] sm:h-[85px] bg-gray-50 rounded-xl sm:rounded-2xl overflow-hidden shrink-0 relative border border-gray-100 flex items-center justify-center">
                        <Suspense fallback={<div className="w-full h-full bg-gray-100 animate-pulse"></div>}>
                          <OptimizedImage
                            src={item.image || '/placeholder.jpg'}
                            alt={displayName}
                            className="w-full h-full object-cover mix-blend-multiply"
                            loading="lazy"
                          />
                        </Suspense>
                      </div>

                      {/* Details */}
                      <div className="flex-1 flex flex-col min-w-0">
                        <div>
                          {/* Name & Price — same row, top-aligned, matching the
                              Comet reference (name left, price right, no
                              separate delete button up here anymore). */}
                          <div className="flex justify-between items-start gap-2 sm:gap-3">
                            <h4 className="text-sm sm:text-base font-bold uppercase tracking-tight text-[#0a110e] leading-snug hover:text-emerald-700 transition-colors cursor-pointer">
                              {displayName}
                            </h4>

                            {/* Price — shows the rule-discounted price (if any
                                active cart rule discounts this item) instead of
                                always the raw price, so this never disagrees
                                with what checkout will actually charge. */}
                            {(() => {
                              const discountedPrice = getItemDiscountedPrice(item);
                              const rawPrice = Number(item.price) || 0;
                              const hasDiscount = discountedPrice < rawPrice;
                              const percentOff = hasDiscount
                                ? Math.round(((rawPrice - discountedPrice) / rawPrice) * 100)
                                : 0;
                              return hasDiscount ? (
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-bold text-[#157a44]">₹{Math.round(discountedPrice).toLocaleString()}</p>
                                  <div className="flex items-center justify-end gap-1">
                                    <span className="text-[10px] text-gray-400 line-through">₹{rawPrice.toLocaleString()}</span>
                                    <span className="text-[9px] font-bold uppercase rounded-full bg-[#157a44] text-white px-1.5 py-px">
                                      {percentOff}% OFF
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm font-bold text-[#0a110e] shrink-0">₹{rawPrice.toLocaleString()}</p>
                              );
                            })()}
                          </div>

                          {/* Subtitle — category + variant on one plain muted
                              line ("X lows | Size: 10" style), not a colored
                              pill, matching the Comet reference. */}
                          {(() => {
                            const itemVariant = item.selectedVariant && item.selectedVariant !== 'N/A' ? item.selectedVariant : null;
                            const parts = [item.category, itemVariant].filter(Boolean);
                            if (parts.length === 0) return null;
                            return (
                              <p className="text-xs text-gray-400 mt-0.5 sm:mt-1">
                                {parts.join(' | ')}
                              </p>
                            );
                          })()}
                        </div>

                        {/* Trash + qty + "+" — ONE pill, bottom-right. At qty 1
                            the left icon is trash (tap removes the item); at
                            qty 2+ it becomes a minus (tap just decrements) —
                            one control, two behaviors, matching the reference. */}
                        <div className="flex justify-end mt-auto pt-1.5 sm:pt-2">
                          <div className="flex items-center gap-3 sm:gap-4 bg-white border border-gray-200 rounded-full h-7 sm:h-8 px-2.5 sm:px-3 shadow-sm">
                            <button
                              onClick={() =>
                                itemQty <= 1
                                  ? handleRemoveItem(itemId, item.selectedVariant, item.mongoId)
                                  : handleQuantityChange(itemId, item.selectedVariant, itemQty - 1, item.mongoId, itemQty, item.image)
                              }
                              className="w-4 h-full flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                              title={itemQty <= 1 ? 'Remove item' : 'Decrease quantity'}
                            >
                              {itemQty <= 1 ? (
                                <i className="fa-regular fa-trash-can text-[10px] sm:text-[11px]"></i>
                              ) : (
                                <i className="fa-solid fa-minus text-[9px] sm:text-[10px]"></i>
                              )}
                            </button>
                            <span className="text-xs font-bold text-[#0a110e] min-w-[12px] text-center">
                              {itemQty}
                            </span>
                            <button
                              onClick={() => handleQuantityChange(itemId, item.selectedVariant, itemQty + 1, item.mongoId, itemQty, item.image)}
                              className="w-4 h-full flex items-center justify-center text-gray-400 hover:text-[#0a110e] transition-colors"
                            >
                              <i className="fa-solid fa-plus text-[9px] sm:text-[10px]"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <GiftWrapLineItem />
              </div>

              {/* Add-on nudge — one persistent card covering BOTH cross-sell
                  combos (add a different product) and quantity-discount
                  nudges (add more of a product already in the cart); arrows
                  page through all of them together instead of stacking a
                  separate card per nudge type. */}
              {nudgeSlides.length > 0 && (
                <FreeShippingBanner
                  bannersOverride={nudgeSlides}
                  variant="light"
                  showQuantityStepper
                  showProgressBar={false}
                  className="mt-3 sm:mt-6"
                />
              )}
            </>
          )}
        </div>

        {/* --- FOOTER (CHECKOUT) --- */}
        {cartItems?.length > 0 && (
          <div className="px-6 py-2 sm:py-6 bg-white border-t border-gray-100 z-10 shrink-0">
            {/* Gift wrap — renders nothing unless the admin's turned the
                seasonal offer on (Admin → Offers → Gift Wrap). */}
            <div className="border-b border-gray-100">
              <GiftWrapOffer />
            </div>

            <div className="space-y-1 sm:space-y-2 mb-6 sm:mb-6">
                <div className="flex justify-between items-center">
                    <span className="text-base font-serif text-[#0a110e]">Subtotal</span>
                    <span className="text-xl font-bold text-[#0a110e]">₹{(Number(subtotal) || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center gap-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    <span className="shrink-0">Shipping</span>
                    {isFreeShippingEligible ? (
                      <span className="font-extrabold text-green-600 text-right">Free</span>
                    ) : (
                      <span className="font-medium normal-case tracking-normal text-gray-500 text-right">Calculated at checkout</span>
                    )}
                </div>
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
                className="relative z-0 w-full py-4 bg-[#0a110e] text-white rounded-2xl font-bold uppercase tracking-[0.15em] text-[10px] hover:bg-[#1a2b24] transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 px-6"
              >
                  <span>Proceed to Checkout</span>
                  <i className="fa-solid fa-arrow-right-long"></i>
              </button>
            </div>
            <div className="mt-1 flex justify-center items-center gap-1.5 text-[9px] text-gray-400 uppercase tracking-widest font-bold">
                {/* <i className="fa-solid fa-lock"></i>
                <span>Secure Checkout</span> */}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CartDrawer;
