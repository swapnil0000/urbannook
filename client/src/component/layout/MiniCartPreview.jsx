import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  useGetFreeShippingOfferQuery,
  useUpdateCartMutation,
} from "../../store/api/userApi";
import { removeItem } from "../../store/slices/cartSlice";
import { resolveVariantTitle } from "../../utils/variantTitle";
import FreeShippingStrip from '../FreeShippingStrip';
// The old combo-banner/cart-rule discount preview (FreeShippingBanner,
// useEvaluateCartRulesQuery, useGetAllFreeShippingBannersQuery) was removed
// entirely 2026-10-09 — this preview now shows plain cart totals + the
// free-shipping threshold only. A Promotion V2-based discount preview and
// add-on nudge is a deliberate follow-up (data layer already exists —
// useGetCartPromotionsQuery, src/store/api/userApi.js), not an oversight.

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

  // Plain cart total — no discount preview here for now (see the file-header
  // note: the old cart-rule-based discount/banner preview was removed
  // entirely, a Promotion V2-based replacement is a deliberate follow-up).
  const subtotal = Number(totalAmount) || 0;

  const { data: offerRes } = useGetFreeShippingOfferQuery();
  const offerConfig = offerRes?.data;
  const thresholdEligible =
    !!offerConfig?.isActive && (offerConfig?.thresholdAmount || 0) > 0 && subtotal >= offerConfig.thresholdAmount;
  const isFreeShippingEligible = thresholdEligible;

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
              {/* Free-shipping threshold nudge — hidden unless admin's promotion is on */}
              <FreeShippingStrip cartTotal={subtotal} variant="compact" />
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
                      className="absolute -top-1.5 -left-1.5 z-10 w-5 h-5 flex items-center justify-center rounded-full bg-paper border border-hair shadow-sm text-ink hover:bg-brand hover:text-white hover:border-brand transition-colors"
                    >
                      <i className="fa-solid fa-xmark text-[9px]" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-black truncate">{displayName}</p>
                    {item.selectedVariant && item.selectedVariant !== "N/A" && (
                      <span className="inline-block mt-0.5 mb-0.5 px-2 py-0.5 rounded-full bg-ink text-white text-[10px] font-semibold">
                        {item.selectedVariant}
                      </span>
                    )}
                    <p className="text-[10px] text-black/50">Qty {itemQty(item.quantity)}</p>
                  </div>
                  {(() => {
                    // Plain price for now — see file-header note on the
                    // removed discount preview.
                    const rawPrice = Number(item.price) || 0;
                    const qty = itemQty(item.quantity);
                    const rawLineTotal = rawPrice * qty;
                    return (
                      <p className="text-xs font-bold text-black shrink-0">
                        ₹{rawLineTotal.toLocaleString()}
                      </p>
                    );
                  })()}
                </div>
                );
              })}
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
            className="w-full py-3.5 rounded-xl text-[11px] font-extrabold uppercase tracking-[0.1em] text-white bg-ink disabled:opacity-40"
          >
            View Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default MiniCartPreview;
