import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  useEvaluateCartRulesQuery,
  useGetFreeShippingOfferQuery,
  useGetAllFreeShippingBannersQuery,
  useUpdateCartMutation,
} from "../../store/api/userApi";
import { removeItem } from "../../store/slices/cartSlice";
import { resolveVariantTitle } from "../../utils/variantTitle";
import FreeShippingBanner from "../FreeShippingBanner";

/**
 * Lightweight cart preview — a compact bottom sheet showing what's in the
 * cart (thumbnails, names, qty, price), the running total, and a note that
 * shipping is calculated at checkout. Deliberately NOT the full CartDrawer
 * (no quantity editing/remove here) — this is a quick glance, triggered from
 * the mini-cart bubble buttons (PDP bottom bar, global sticky mini-cart bar).
 * `onViewCart` is the escape hatch into the full drawer/checkout flow.
 *
 * No `isOpen` prop — the caller only renders this component while it should
 * be visible (`{show && <MiniCartPreview .../>}`) and owns the closing delay
 * itself (set a "closing" flag, `setTimeout` to actually stop rendering),
 * same pattern as the bottom sheet in FreeShippingBanner.jsx. That keeps the
 * entrance-only mount effect below synchronous-setState-free.
 */
const itemQty = (q) => (typeof q === "object" && q !== null ? Number(q.quantity) || 0 : Number(q) || 0);

const MiniCartPreview = ({ onClose, onViewCart }) => {
  const { items: cartItems, totalAmount } = useSelector((state) => state.cart);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [updateCart] = useUpdateCartMutation();
  const [mounted, setMounted] = useState(false);

  // Remove a line item straight from the mini-cart, so a customer who isn't
  // interested can drop it without opening the full cart. Same dual path as
  // CartDrawer: server cart for logged-in users, local Redux cart for guests.
  const handleRemoveItem = async (item) => {
    const effectiveVariant = item.selectedVariant || "N/A";
    const hasToken = !!localStorage.getItem("authToken");
    const isLoggedIn = isAuthenticated || hasToken;
    if (isLoggedIn) {
      try {
        await updateCart({
          productId: item.mongoId || item.id,
          quantity: 1,
          action: "remove",
          variant: effectiveVariant,
        }).unwrap();
      } catch (err) {
        console.error("Failed to remove item:", err);
      }
    } else {
      dispatch(removeItem({ id: item.id || item.mongoId, selectedVariant: effectiveVariant }));
    }
  };

  // Generic, data-driven cart-promotion rules (server/src/model/cartRule.model.js)
  // — same evaluator the payment controller uses for the real order total,
  // so this preview's prices/total never disagree with what checkout charges.
  const cartRuleEvalItems = cartItems
    .map((item) => ({ productId: item.mongoId || item.id, quantity: itemQty(item.quantity) }))
    .filter((i) => i.productId && i.quantity > 0);
  const { data: cartRuleEvalData } = useEvaluateCartRulesQuery(cartRuleEvalItems, {
    skip: cartRuleEvalItems.length === 0,
  });

  // Same eligibility check used at checkout (rp.payment.controller.js): the
  // admin combo-banner offer, any active generic cart rule's free_shipping
  // effect, or the plain cart-value threshold. Previously this preview
  // always said "calculated at checkout" regardless of actual eligibility.
  const { data: offerRes } = useGetFreeShippingOfferQuery();
  const { data: bannersRes } = useGetAllFreeShippingBannersQuery();
  const getItemDiscountedPrice = (item) => {
    const productId = item.mongoId || item.id;
    const candidates = cartRuleEvalData?.data?.discounts?.[productId];
    const price = Number(item.price) || 0;
    if (!candidates?.length) return price;
    const results = candidates.map((c) =>
      c.type === "percent_off" ? price * (1 - Number(c.value) / 100) : price - Number(c.value),
    );
    // Rounded to match the server's applyBestDiscount exactly (50% off ₹299
    // is ₹149.5 mathematically — both round that to ₹150, consistently).
    // Rounding the PER-UNIT price here (before the line-total display
    // multiplies by quantity below) also fixes a second bug: rounding after
    // multiplying gave a different total for qty=2 (round(149.5×2)=299)
    // than rounding per-unit first then multiplying (150×2=300) would.
    return Math.round(Math.max(Math.min(...results), 0));
  };
  const ruleDiscountSavings = cartItems.reduce((sum, item) => {
    const rawPrice = Number(item.price) || 0;
    return sum + (rawPrice - getItemDiscountedPrice(item)) * itemQty(item.quantity);
  }, 0);
  const subtotal = (Number(totalAmount) || 0) - ruleDiscountSavings;

  const offerConfig = offerRes?.data;
  const banners = bannersRes?.data || [];
  const cartProductIds = new Set(cartItems.map((i) => i.mongoId || i.id));
  const comboEligible =
    !!offerConfig?.isActive &&
    banners.some((b) => cartProductIds.has(b.sourceProductId) && cartProductIds.has(b.recommendedProductId));
  const thresholdEligible =
    !!offerConfig?.isActive && (offerConfig?.thresholdAmount || 0) > 0 && subtotal >= offerConfig.thresholdAmount;
  const isFreeShippingEligible = comboEligible || !!cartRuleEvalData?.data?.freeShipping || thresholdEligible;

  // Cross-sell nudge: when the offer's SOURCE product (e.g. Brake Caliper Lamp)
  // is in the cart but its RECOMMENDED add-on (e.g. Pen Stand) isn't yet, show
  // that offer's FreeShippingBanner right here so the customer can add the
  // add-on without leaving the cart — or just continue to checkout. Same
  // selection the checkout page uses; gated on the offer being active, so
  // toggling it off in admin hides this too.
  const nudgeBannerProductId = (() => {
    if (!offerConfig?.isActive || banners.length === 0) return null;
    const match = banners.find(
      (b) => cartProductIds.has(b.sourceProductId) && !cartProductIds.has(b.recommendedProductId),
    );
    return match?.sourceProductId || null;
  })();

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${mounted ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`relative w-full max-w-md bg-[#FAF7F2] rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out max-h-[75vh] flex flex-col ${
          mounted ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto w-10 h-1 rounded-full bg-black/15 mt-3 mb-1 shrink-0" />

        <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-black/10 shrink-0">
          <p className="text-sm font-extrabold uppercase tracking-wide text-black">
            Your Cart ({cartItems.length})
          </p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-black/40 hover:text-black">
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {cartItems.length === 0 ? (
            <p className="text-center text-sm text-black/50 py-8">Your cart is empty</p>
          ) : (
            <div className="flex flex-col gap-3">
              {cartItems.map((item, idx) => {
                const displayName = resolveVariantTitle(item.name, item.variantTitleTemplate, item.selectedVariant);
                return (
                <div key={`${item.id || item.mongoId}-${item.selectedVariant || idx}`} className="flex items-center gap-3">
                  {/* Outer wrapper is NOT overflow-hidden so the remove badge can
                      poke out past the top-left corner; the inner div clips the
                      image to rounded corners. */}
                  <div className="relative shrink-0 w-12 h-12">
                    <div className="w-full h-full rounded-lg overflow-hidden border border-black/10 bg-white">
                      <img src={item.image || "/placeholder.jpg"} alt={displayName} className="w-full h-full object-contain" />
                    </div>
                    {/* Remove — top-left of the thumbnail. Lets the customer
                        drop a product they don't want right from the mini-cart. */}
                    <button
                      onClick={() => handleRemoveItem(item)}
                      title={`Remove ${displayName}`}
                      aria-label={`Remove ${displayName}`}
                      className="absolute -top-1.5 -left-1.5 z-10 w-5 h-5 flex items-center justify-center rounded-full bg-[#f5deb3] border border-[#e0c896] shadow-sm text-[#1c3026] hover:bg-[#E63329] hover:text-white hover:border-[#E63329] transition-colors"
                    >
                      <i className="fa-solid fa-xmark text-[9px]" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-black truncate">{displayName}</p>
                    {item.selectedVariant && item.selectedVariant !== "N/A" && (
                      <span className="inline-block mt-0.5 mb-0.5 px-2 py-0.5 rounded-full bg-[#1c3026] text-white text-[10px] font-semibold">
                        {item.selectedVariant}
                      </span>
                    )}
                    <p className="text-[10px] text-black/50">Qty {itemQty(item.quantity)}</p>
                  </div>
                  {(() => {
                    const discountedPrice = getItemDiscountedPrice(item);
                    const rawPrice = Number(item.price) || 0;
                    const hasDiscount = discountedPrice < rawPrice;
                    const percentOff = hasDiscount
                      ? Math.round(((rawPrice - discountedPrice) / rawPrice) * 100)
                      : 0;
                    return hasDiscount ? (
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-[#157a44]">₹{Math.round(discountedPrice * itemQty(item.quantity)).toLocaleString()}</p>
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-[9px] text-black/40 line-through">₹{(rawPrice * itemQty(item.quantity)).toLocaleString()}</span>
                          <span className="text-[9px] font-bold uppercase rounded-full bg-[#157a44] text-white px-1.5 py-px">
                            {percentOff}% OFF
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs font-bold text-black shrink-0">
                        ₹{(rawPrice * itemQty(item.quantity)).toLocaleString()}
                      </p>
                    );
                  })()}
                </div>
                );
              })}
            </div>
          )}

          {/* Add-on nudge — only when the offer's source product is in the cart
              but the add-on isn't. Lets the customer complete the free-shipping
              combo without leaving the cart. */}
          {nudgeBannerProductId && (
            // Scaled down slightly so the full card fits comfortably inside the
            // compact bottom sheet. transform-origin top keeps it anchored under
            // the items; the negative bottom margin reclaims the space the
            // scale leaves behind so the footer doesn't get an odd gap.
            <div className="mt-3" style={{ transform: "scale(0.9)", transformOrigin: "top center", marginBottom: "-8%" }}>
              <FreeShippingBanner
                productId={nudgeBannerProductId}
                variant="light"
                showQuantityStepper
                showProgressBar={false}
                className=""
              />
            </div>
          )}
        </div>

        <div className="px-5 pt-3 pb-5 border-t border-black/10 shrink-0">
          {/* Shipping — label left, value right, same two-column row as Total
              below it (rather than a footnote line under the total). */}
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-black/60 shrink-0">Shipping</span>
            {isFreeShippingEligible ? (
              <span className="text-xs font-extrabold text-green-600 text-right">Free</span>
            ) : (
              <span className="text-[11px] font-medium text-black/50 text-right">Calculated at checkout</span>
            )}
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wide text-black/60">Total</span>
            <span className="text-base font-extrabold text-black">₹{subtotal.toLocaleString()}</span>
          </div>

          <button
            onClick={onViewCart}
            disabled={cartItems.length === 0}
            className="w-full py-3.5 rounded-xl text-[11px] font-extrabold uppercase tracking-[0.1em] text-white bg-[#1c3026] disabled:opacity-40"
          >
            View Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default MiniCartPreview;
