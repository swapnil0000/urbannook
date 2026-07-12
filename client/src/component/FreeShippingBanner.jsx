import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import confetti from "canvas-confetti";
import {
  useGetFreeShippingBannerQuery,
  useGetFreeShippingOfferQuery,
  useAddToCartMutation,
  useUpdateCartMutation,
} from "../store/api/userApi";
import { useGetProductByIdQuery } from "../store/api/productsApi";
import { addItem, removeItem, updateQuantity, updateSelection } from "../store/slices/cartSlice";
import { useCartData } from "../hooks/useCartSync";
import { trackAddToCart } from "../utils/analytics";

// Multi-burst "cannon" confetti — several bursts at different angles, speeds
// and shapes fired in quick succession, which reads as far more festive than
// a single flat confetti() call. Pure canvas-confetti (already a project
// dependency), no extra libraries needed.
const fireCelebrationConfetti = () => {
  const colors = ["#F5DEB3", "#1c3026", "#a89068", "#ffffff", "#4ade80", "#fbbf24"];
  const defaults = { origin: { y: 0.7 }, colors, shapes: ["circle", "square", "star"] };

  const fire = (particleRatio, opts) =>
    confetti({ ...defaults, ...opts, particleCount: Math.floor(200 * particleRatio) });

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
};

// Same variant-name → colour lookup used on the PDP (ProductDetailPage.jsx),
// so a "Rust Orange" variant renders as the same swatch colour everywhere.
const VARIANT_COLOR_MAP = {
  rainbow: "linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)",
  "sky blue": "#87CEEB",
  white: "#FFFFFF",
  black: "#000000",
  red: "#FF0000",
  blue: "#0000FF",
  yellow: "#FFFF00",
  orange: "#FFA500",
  grey: "#808080",
  purple: "#800080",
};
const variantColor = (name = "") => {
  const key = name.toLowerCase();
  return VARIANT_COLOR_MAP[key] || key.replace(/\s+/g, "");
};

/**
 * Cross-sell card: "add this other product, unlock free shipping." Shown on
 * the PDP (dark theme) and on checkout (light theme, when the cart hasn't
 * hit the threshold yet) — same component, same add-to-cart logic, only the
 * visual theme differs via the `variant` prop. Admin controls text/target
 * product via the FreeShippingOffer banners in the admin panel. Actual
 * free-shipping eligibility is a cart-value threshold checked at checkout —
 * this card doesn't compute or guarantee it, just points the customer at it.
 *
 * `showQuantityStepper`: checkout shows a full -/+ stepper once added (since
 * quantity there directly affects whether the cart clears the free-shipping
 * threshold) instead of just a remove button — the PDP keeps the simpler
 * single-item add/remove since that's not the point of the PDP banner.
 */
const FreeShippingBanner = ({ productId, variant = "dark", showQuantityStepper = false }) => {
  const isLight = variant === "light";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const cartItems = useSelector((state) => state.cart.items);
  const { refetch: refetchCart } = useCartData();
  const [addToCartAPI, { isLoading: isAdding }] = useAddToCartMutation();
  const [updateCart, { isLoading: isUpdatingQty }] = useUpdateCartMutation();

  const itemQty = (q) => (typeof q === "object" && q !== null ? q.quantity || 0 : q || 0);

  const [selectedVariant, setSelectedVariant] = useState(null);
  const [userPickedVariant, setUserPickedVariant] = useState(false);

  // Keeps the progress bar mounted (and the CTA showing a transitional
  // "unlocking" state) for a beat after the cart actually updates, so the
  // fill animation + confetti + button swap play as a sequence instead of
  // the bar just vanishing the instant `alreadyEligible`/`added` flip true.
  const [justAdded, setJustAdded] = useState(false);

  const { data: bannerRes } = useGetFreeShippingBannerQuery(productId, { skip: !productId });
  const banner = bannerRes?.data;

  // Free shipping is a product-COMBO rule (source + recommended both in cart),
  // so this bar tracks combo completion, NOT a rupee total. We only need to
  // know the offer is active to decide whether to render it at all; the actual
  // "unlocked" state is derived below from whether the recommended add-on is
  // in the cart (`added`).
  const { data: offerRes } = useGetFreeShippingOfferQuery();
  const offerConfig = offerRes?.data;
  const offerActive = !!offerConfig?.isActive;

  const { data: recommendedRes } = useGetProductByIdQuery(banner?.recommendedProductId, {
    skip: !banner?.recommendedProductId,
  });
  const recommendedProduct = recommendedRes?.data;
  const variants = recommendedProduct?.variantDetails || [];

  // Source of truth for "added" is the actual cart, read fresh on every
  // render — NOT a local flag. A local "I just added this" boolean resets
  // to false the instant this component unmounts (e.g. navigating to
  // checkout and back), which made the banner forget it had already been
  // added and revert to the plain "Add to Cart" state even though the item
  // was still sitting in the cart the whole time. Deriving straight from
  // cartItems means it's always correct, on mount or otherwise, and reverts
  // automatically if the item's removed from elsewhere (e.g. the cart page).
  const cartMatch = useMemo(() => {
    if (!recommendedProduct) return null;
    return cartItems.find((item) => {
      return (
        String(item.id) === String(recommendedProduct.productId) ||
        String(item.mongoId) === String(recommendedProduct.productId)
      );
    });
  }, [cartItems, recommendedProduct]);
  const added = !!cartMatch;
  const addedVariant = cartMatch?.selectedVariant || null;

  // Combo progress for the bar: this banner exists to nudge adding the
  // recommended add-on that completes the free-shipping combo. Before it's
  // added the bar sits partway (the customer is on/buying the source product,
  // so they're halfway there); once the recommended item is in the cart the
  // combo is complete and the bar fills to 100%.
  const comboUnlocked = added;
  const progressPct = comboUnlocked ? 100 : 55;

  useEffect(() => {
    if (variants.length > 0 && !selectedVariant) setSelectedVariant(variants[0].variantName);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only seed once when variants first load
  }, [recommendedProduct?.productId]);

  // Keep the displayed image/price in sync with whatever variant is actually
  // in the cart once added (could differ from the last-cycled auto-slide
  // value, or from a variant changed elsewhere).
  useEffect(() => {
    if (addedVariant) setSelectedVariant(addedVariant);
  }, [addedVariant]);

  // Auto-cycle through variants so a multi-variant recommendation doesn't go
  // unnoticed as a static list — stops the moment the customer picks one
  // themselves, or once they've added to cart.
  useEffect(() => {
    if (variants.length <= 1 || userPickedVariant || added) return;
    const interval = setInterval(() => {
      setSelectedVariant((prev) => {
        const idx = variants.findIndex((v) => v.variantName === prev);
        const next = variants[(idx + 1) % variants.length];
        return next.variantName;
      });
    }, 1600);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- variants.length/productId are the stable identity here
  }, [variants.length, recommendedProduct?.productId, userPickedVariant, added]);

  if (!banner || !recommendedProduct) return null;

  const activeVariant =
    variants.find((v) => v.variantName === selectedVariant) || variants[0];
  const goToProduct = () => {
    const sku = activeVariant?.sku;
    navigate(sku ? `/product/${recommendedProduct.productId}/${sku}` : `/product/${recommendedProduct.productId}`);
  };
  const displayImage = activeVariant?.variantImage?.[0] || recommendedProduct.productImg || "https://urbannook.in/assets/logo.webp";
  const displayPrice = activeVariant?.variantPrice ?? 0;

  // Same "highest-priced variant as reference MRP" convention already used
  // on the PDP (ProductDetailPage.jsx) — not a fabricated discount, just the
  // existing inter-variant comparison reused here for the strikethrough tag.
  const maxVariantPrice = Math.max(...variants.map((v) => v.variantPrice || 0), 0);
  const discountPercent =
    maxVariantPrice > displayPrice ? Math.round(((maxVariantPrice - displayPrice) / maxVariantPrice) * 100) : 0;

  const hasToken = !!localStorage.getItem("authToken");
  const isLoggedIn = isAuthenticated || hasToken;

  const handleAddToCart = async () => {
    const effectiveVariant = activeVariant?.variantName || "Standard Variant";

    if (isLoggedIn) {
      try {
        await addToCartAPI({
          productId: recommendedProduct.productId,
          quantity: 1,
          variant: effectiveVariant,
          image: displayImage,
        }).unwrap();
        dispatch(updateSelection({ productId: recommendedProduct.productId, quantity: 1, variant: effectiveVariant }));
        await refetchCart().unwrap();
      } catch {
        return; // swallow — this card is a nudge, not the primary add-to-cart flow
      }
    } else {
      dispatch(
        addItem({
          id: recommendedProduct.productId,
          mongoId: recommendedProduct.productId,
          name: recommendedProduct.productName,
          price: displayPrice,
          image: displayImage,
          quantity: 1,
          selectedVariant: effectiveVariant,
        }),
      );
    }

    trackAddToCart({
      itemId: recommendedProduct.productId,
      itemName: recommendedProduct.productName,
      itemVariant: effectiveVariant,
      price: displayPrice,
      quantity: 1,
    });

    // Sequence the celebration: let the bar's width transition play out,
    // then pop the confetti, then swap the CTA to "Unlocked" — instead of
    // the bar instantly vanishing and the button instantly flipping the
    // moment the underlying cart data changes.
    setJustAdded(true);
    setTimeout(fireCelebrationConfetti, 900);
    setTimeout(() => setJustAdded(false), 1200);
    // No local "added" flag to set — cartItems updates (dispatch above, or
    // refetchCart) and cartMatch/added derive from that automatically.
  };

  const handleRemove = async () => {
    if (isLoggedIn) {
      try {
        await updateCart({
          productId: recommendedProduct.productId,
          quantity: 1,
          action: "remove",
          variant: addedVariant || undefined,
          image: displayImage,
        }).unwrap();
        await refetchCart();
      } catch {
        return;
      }
    } else {
      dispatch(removeItem({ id: recommendedProduct.productId, selectedVariant: addedVariant || "N/A" }));
    }
  };

  const handleIncrement = async () => {
    const newQty = itemQty(cartMatch?.quantity) + 1;
    if (isLoggedIn) {
      try {
        await updateCart({
          productId: recommendedProduct.productId,
          quantity: 1,
          action: "add",
          variant: addedVariant || undefined,
          image: displayImage,
        }).unwrap();
        await refetchCart();
      } catch {
        return;
      }
    } else {
      dispatch(updateQuantity({ id: recommendedProduct.productId, quantity: newQty, selectedVariant: addedVariant || "N/A" }));
    }
  };

  const handleDecrement = async () => {
    const currentQty = itemQty(cartMatch?.quantity) || 1;
    if (currentQty <= 1) {
      await handleRemove();
      return;
    }
    if (isLoggedIn) {
      try {
        await updateCart({
          productId: recommendedProduct.productId,
          quantity: 1,
          action: "sub",
          variant: addedVariant || undefined,
          image: displayImage,
        }).unwrap();
        await refetchCart();
      } catch {
        return;
      }
    } else {
      dispatch(updateQuantity({ id: recommendedProduct.productId, quantity: currentQty - 1, selectedVariant: addedVariant || "N/A" }));
    }
  };

  // Fixed black/cream/red design regardless of PDP vs checkout context — the
  // card carries its own background/border so it reads the same everywhere
  // it's dropped in. `isLight`/`variant` prop is kept for the outer spacing
  // only, nothing else depends on it visually anymore.
  return (
    <div className={`rounded-2xl overflow-hidden border border-black/10 bg-[#FAF7F2] shadow-sm ${isLight ? "mt-4" : "mt-4"}`}>
      {/* Ribbon header */}
      <div className="flex items-center justify-between gap-3 bg-[#2e443c] px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <i className="fa-solid fa-truck-fast text-sm text-[#E63329] shrink-0" />
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#EFEAE0] truncate">
            {banner.text}
          </p>
        </div>
        <span className="hidden sm:block shrink-0 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/40">
          Add-on deal
        </span>
      </div>

      {/* Combo progress — free shipping unlocks when the recommended add-on is
          in the cart alongside the source product. The bar fills to 100% and
          the copy flips to "unlocked" once added; we KEEP it mounted and full
          rather than collapsing it away, so the celebratory end-state stays
          frozen on screen instead of disappearing. */}
      {offerActive && (
        <div>
          <div className="overflow-hidden">
            <div className="px-4 pt-3.5 pb-1">
              <div
                className="rounded-xl px-3.5 py-3"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.93 0.09 152) 0%, oklch(0.90 0.11 150) 60%, oklch(0.92 0.10 148) 100%)",
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.05em]" style={{ color: "oklch(0.47 0.10 165)" }}>
                    {comboUnlocked
                      ? "Free shipping unlocked on this order"
                      : `Add ${recommendedProduct.productName} to unlock free shipping`}
                  </span>
                </div>
                <style>{`
                  @keyframes fsbShimmer { 0% { transform: translateX(-120%); } 100% { transform: translateX(220%); } }
                  @keyframes fsbPulse { 0%, 100% { opacity: .55; transform: translateY(-50%) scale(1); } 50% { opacity: 1; transform: translateY(-50%) scale(1.35); } }
                `}</style>
                <div className="h-2.5 rounded-full overflow-hidden relative" style={{ background: "oklch(0.99 0 0 / 0.5)" }}>
                  <div
                    className="h-full rounded-full relative overflow-hidden"
                    style={{
                      width: `${progressPct}%`,
                      background: "linear-gradient(90deg, oklch(0.55 0.14 155), oklch(0.47 0.10 165))",
                      transition: "width 900ms cubic-bezier(.2,.8,.2,1)",
                    }}
                  >
                    {/* Continuously moving shine sweep — keeps the bar feeling
                        "alive" even when the width isn't currently changing. */}
                    <span
                      className="absolute inset-y-0 w-1/3"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.55), transparent)",
                        animation: "fsbShimmer 2.2s ease-in-out infinite",
                      }}
                    />
                    {/* Glowing dot at the leading edge, like a comet head, so the
                        fill point reads as an active, moving position. */}
                    {progressPct > 2 && (
                      <span
                        className="absolute top-1/2 right-0 w-2.5 h-2.5 rounded-full"
                        style={{
                          background: "oklch(0.99 0 0)",
                          boxShadow: "0 0 8px 2px oklch(0.55 0.14 155 / 0.9)",
                          animation: "fsbPulse 1.4s ease-in-out infinite",
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product card body */}
      <div className="p-4 flex gap-4">
        <button
          onClick={goToProduct}
          title={`View ${recommendedProduct.productName}`}
          className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-[#D8D2C5] bg-white"
        >
          {discountPercent > 0 && (
            <span className="absolute top-1.5 left-1.5 z-10 bg-[#E63329] text-white text-[10px] font-bold uppercase px-1.5 py-0.5">
              −{discountPercent}%
            </span>
          )}
          <img
            src={displayImage}
            alt={recommendedProduct.productName}
            className="w-full h-full object-cover transition-all duration-500"
            loading="lazy"
          />
        </button>

        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <button
            onClick={goToProduct}
            title={`View ${recommendedProduct.productName}`}
            className="block w-full text-sm font-extrabold uppercase tracking-tight truncate text-left text-black hover:underline"
          >
            {recommendedProduct.productName}
          </button>

          <div className="flex items-baseline gap-2 mt-1 flex-wrap">
            <span className="text-lg font-bold tabular-nums text-[#E63329]">
              ₹{displayPrice.toLocaleString()}
            </span>
            {discountPercent > 0 && (
              <>
                <span className="text-xs text-gray-400 line-through tabular-nums">
                  ₹{maxVariantPrice.toLocaleString()}
                </span>
                <span className="text-[10px] font-bold uppercase bg-black text-white px-1.5 py-0.5">
                  Save ₹{(maxVariantPrice - displayPrice).toLocaleString()}
                </span>
              </>
            )}
          </div>

          {/* Variant swatches. Before adding: auto-cycles until the customer
              picks one. After adding: the row STAYS visible (doesn't collapse)
              and simply shows the chosen colour that's now in the cart —
              swatch picking is disabled at that point since the cart line is
              already committed to `addedVariant`. */}
          {variants.length > 1 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500 mt-2.5">
                {added ? "In cart" : "Colour"} — <span className="text-black">{selectedVariant}</span>
              </p>
              <div className="flex items-center gap-1 mt-1.5 flex-nowrap overflow-x-auto">
                {variants.map((v) => {
                  const isActive = v.variantName === selectedVariant;
                  return (
                    <button
                      key={v.variantName}
                      onClick={() => {
                        if (added) return; // cart line already committed to the chosen variant
                        setSelectedVariant(v.variantName);
                        setUserPickedVariant(true);
                      }}
                      title={v.variantName}
                      className={`shrink-0 rounded-full border-1 transition-all duration-300 ${
                        isActive ? "w-5 h-5 border-[#E63329]" : "w-4 h-4 border-[#D8D2C5] opacity-70"
                      } ${added ? "cursor-default" : ""}`}
                      style={{ background: variantColor(v.variantName) }}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-4">
        {added && justAdded ? (
          // Transitional state: cart is already updated but we're holding
          // the celebratory sequence (bar fill → confetti) before revealing
          // the final "Unlocked" button, so the swap doesn't happen instantly.
          <div className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2.5 text-sm font-extrabold uppercase tracking-wide bg-black/5 text-black/70 border-2 border-black/10 animate-pulse">
            <i className="fa-solid fa-truck-fast" /> Unlocking free shipping…
          </div>
        ) : added ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 py-3.5 rounded-xl text-[11px] font-extrabold uppercase tracking-[0.1em] text-center bg-black/5 text-black border border-black/15">
              <i className="fa-solid fa-circle-check mr-1.5 text-[#E63329]" /> Free Shipping Unlocked!
            </div>

            {showQuantityStepper ? (
              <div className="shrink-0 flex items-center gap-3 rounded-xl border border-[#D8D2C5] px-3 h-[52px] bg-white">
                <button
                  onClick={handleDecrement}
                  disabled={isUpdatingQty}
                  title="Decrease quantity"
                  className="disabled:opacity-50 text-gray-500 hover:text-[#E63329]"
                >
                  <i className="fa-solid fa-minus text-[10px]" />
                </button>
                <span className="text-xs font-bold w-3 text-center text-black">
                  {itemQty(cartMatch?.quantity) || 1}
                </span>
                <button
                  onClick={handleIncrement}
                  disabled={isUpdatingQty}
                  title="Increase quantity"
                  className="disabled:opacity-50 text-gray-500 hover:text-black"
                >
                  <i className="fa-solid fa-plus text-[10px]" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleRemove}
                disabled={isUpdatingQty}
                title="Remove from cart"
                className="shrink-0 w-[52px] h-[52px] rounded-xl flex items-center justify-center border border-[#D8D2C5] bg-white text-gray-400 hover:text-[#E63329] transition-colors disabled:opacity-50"
              >
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={handleAddToCart}
            disabled={isAdding}
            className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2.5 text-sm font-extrabold uppercase tracking-wide transition-colors disabled:opacity-50 bg-[#F5F1E6] text-black border-2 border-black hover:bg-white"
          >
            {isAdding ? (
              "Adding…"
            ) : (
              <>
                Add &amp; Ship Free
                {/* <span className="text-[11px] font-bold px-2 py-1 bg-black/10">
                  +₹{displayPrice.toLocaleString()}
                </span> */}
                <span className="text-base leading-none">→</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default FreeShippingBanner;
