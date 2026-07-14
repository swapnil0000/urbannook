import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import confetti from "canvas-confetti";
import {
  useGetFreeShippingBannerQuery,
  useGetFreeShippingOfferQuery,
  useAddToCartMutation,
  useUpdateCartMutation,
  useEvaluateCartRulesQuery,
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
// Used for the small colour circle next to each option in the variant
// dropdown below — anything not in the map falls back to the name itself
// with spaces stripped (works for plain CSS colour words like "gold").
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

// Progress-bar geometry. The truck travels across (laneWidth - TRUCK_W) so its
// right edge lands flush with the lane end at 100% instead of overhanging, and
// GOAL_W reserves a gutter on the right that the truck never enters — which is
// what keeps it from colliding with the destination marker on narrow cards.
const TRUCK_W = 46;
const GOAL_W = 32;
const SMOKE_LIFE = 950;

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
const FreeShippingBanner = ({ productId, showQuantityStepper = false, className = "mt-4" }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const cartItems = useSelector((state) => state.cart.items);
  const cartTotalAmount = useSelector((state) => state.cart.totalAmount);
  const { refetch: refetchCart } = useCartData();
  const [addToCartAPI, { isLoading: isAdding }] = useAddToCartMutation();
  const [updateCart, { isLoading: isUpdatingQty }] = useUpdateCartMutation();

  const itemQty = (q) => (typeof q === "object" && q !== null ? q.quantity || 0 : q || 0);

  const [selectedVariant, setSelectedVariant] = useState(null);

  // Custom variant dropdown state — replaces a native <select>, which looks
  // inconsistent/unthemed on mobile (each OS renders its own native picker
  // UI that CSS can't meaningfully touch). This is a plain button + an
  // absolutely-positioned list, fully on-brand everywhere, closed by
  // clicking its own toggle again, picking an option, or clicking outside.
  const [variantMenuOpen, setVariantMenuOpen] = useState(false);
  const variantMenuRef = useRef(null);

  // The slider IS the loader for the add-to-cart click: button shows
  // "Adding…" (disabled, no other visual change) from click until the truck
  // bar's fill animation actually reaches its target — only then does the
  // CTA swap to the unlocked/added state and confetti fire. `onFillCompleteRef`
  // is a one-shot callback the animateTruckTo loop below calls the instant a
  // fill finishes; handleAddToCart populates it only when this click will
  // complete the combo, so the scroll-into-view entrance replay (which never
  // touches this ref) is completely unaffected.
  const [addLoading, setAddLoading] = useState(false);
  const onFillCompleteRef = useRef(null);

  // Bottom sheet shown right after adding the recommended add-on IF that
  // leaves the cart with only the add-on and not the source product — tells
  // the customer, in a dedicated moment, that they still need the source
  // product for the offer to actually apply. Replaces cramming that message
  // into the CTA button's label.
  const [showSourcePrompt, setShowSourcePrompt] = useState(false);
  const [sourcePromptMounted, setSourcePromptMounted] = useState(false);

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

  // Needed for the "you added the add-on but not the main product" copy
  // state below. RTK Query dedupes/caches by id, so on the PDP (where this
  // is almost always the same product the page itself already fetched) this
  // doesn't cost an extra request.
  const { data: sourceRes } = useGetProductByIdQuery(banner?.sourceProductId, {
    skip: !banner?.sourceProductId,
  });
  const sourceProduct = sourceRes?.data;

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

  // The backend (server/src/utils/freeShippingOffer.util.js) only grants free
  // shipping when BOTH banner.sourceProductId AND recommendedProductId are in
  // the cart — this mirrors that check. Previously this only looked at the
  // recommended add-on, so viewing the source product's page (without ever
  // adding the source product itself) and adding just the add-on showed
  // "unlocked" even though checkout would still charge shipping.
  const sourceInCart = useMemo(() => {
    const sourceId = banner?.sourceProductId;
    if (!sourceId) return false;
    return cartItems.some(
      (item) => String(item.id) === String(sourceId) || String(item.mongoId) === String(sourceId),
    );
  }, [cartItems, banner?.sourceProductId]);

  // Combo progress for the bar: this banner exists to nudge adding the
  // recommended add-on that completes the free-shipping combo. Real
  // "unlocked" requires the source product in the cart too, not just the
  // add-on — see `sourceInCart` above.
  const comboUnlocked = added && sourceInCart;

  // Price-weighted progress: the truck's position is (value of the combo
  // products already in the cart) ÷ (combined value of both). Neither in
  // cart → 0%, one alone → its own share of the total (e.g. a ₹299 add-on
  // against a ₹1599+₹299 combo parks at ~16%), both → 100%. Uses each
  // product's FIRST variant price as a stable reference so switching the
  // dropdown selection here doesn't shift the bar's total — only actually
  // adding/removing from the cart does.
  const sourceRefPrice = sourceProduct?.variantDetails?.[0]?.variantPrice || 0;
  const recommendedRefPrice = variants?.[0]?.variantPrice || 0;
  const comboTotal = sourceRefPrice + recommendedRefPrice;
  const cartValueTowardCombo = (sourceInCart ? sourceRefPrice : 0) + (added ? recommendedRefPrice : 0);
  const comboProgressPct =
    comboTotal > 0 ? Math.round((cartValueTowardCombo / comboTotal) * 100) : comboUnlocked ? 100 : 0;

  // --- Generic, data-driven cart-promotion rules (server/src/model/cartRule.model.js)
  // — e.g. "2+ Lamps => free shipping" or "2+ Lamps => 50% off Pen Stand",
  // fully additive to the admin-configured combo banner above (neither
  // replaces the other; either unlocking free shipping is enough, mirroring
  // the backend's OR logic in rp.payment.controller.js exactly). Debounced
  // ~400ms after cart contents settle so rapid +/- clicks don't fire a
  // request per click.
  const cartItemsKey = useMemo(
    () =>
      cartItems
        .map((item) => `${item.id || item.mongoId}:${itemQty(item.quantity)}`)
        .sort()
        .join(","),
    [cartItems],
  );
  const [debouncedCartItems, setDebouncedCartItems] = useState(cartItems);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCartItems(cartItems), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed off the serialized key so identical content (re-render without a real cart change) doesn't reset the debounce timer
  }, [cartItemsKey]);

  const ruleEvalItems = useMemo(
    () =>
      debouncedCartItems
        .map((item) => ({ productId: item.id || item.mongoId, quantity: itemQty(item.quantity) }))
        .filter((i) => i.productId && i.quantity > 0),
    [debouncedCartItems],
  );
  const { data: ruleEvalRes } = useEvaluateCartRulesQuery(ruleEvalItems, { skip: ruleEvalItems.length === 0 });
  const ruleEval = ruleEvalRes?.data;

  // The primary product still blocking the closest generic rule (if any) —
  // fetched only when actually needed, for its display name in the nudge copy.
  const closestRuleBlockingProductId = ruleEval?.closestUnmatchedRule?.conditions?.find((c) => c.remaining > 0)
    ?.productId;
  const { data: closestRuleProductRes } = useGetProductByIdQuery(closestRuleBlockingProductId, {
    skip: !closestRuleBlockingProductId,
  });
  const closestRuleProduct = closestRuleProductRes?.data;

  const genericFreeShipping = !!ruleEval?.freeShipping;
  const genericProgressPct = ruleEval?.closestUnmatchedRule
    ? Math.round(ruleEval.closestUnmatchedRule.progress * 100)
    : 0;

  // Plain cart-value threshold — whole cart, any products count (matches the
  // server's direct subtotal >= thresholdAmount comparison in
  // rp.payment.controller.js). Deliberately NOT part of the rules engine —
  // a simple, separate check.
  const thresholdAmount = offerConfig?.thresholdAmount || 0;
  const thresholdEligible = offerActive && thresholdAmount > 0 && cartTotalAmount >= thresholdAmount;
  const thresholdProgressPct =
    thresholdAmount > 0 ? Math.round(Math.min((Number(cartTotalAmount) || 0) / thresholdAmount, 1) * 100) : 0;

  // Overall unlock/progress = whichever path (old combo, a generic rule, or
  // the plain cart-value threshold) is unlocked or closer — "show progress
  // toward the closest matching rule."
  const genericIsCloser =
    !comboUnlocked && genericProgressPct > comboProgressPct && genericProgressPct >= thresholdProgressPct;
  const progressPct =
    comboUnlocked || genericFreeShipping || thresholdEligible
      ? 100
      : Math.max(comboProgressPct, genericProgressPct, thresholdProgressPct);
  // Used for DISPLAY only (top copy, "unlocked" CTA label) — the click-driven
  // loader/confetti in handleAddToCart deliberately still gates on the old
  // sourceInCart-based combo alone, not this, so it can't repeat the
  // multi-path confetti double-fire bug found earlier this session.
  const freeShippingUnlocked = comboUnlocked || genericFreeShipping || thresholdEligible;

  // --- Scroll-triggered truck animation for the progress bar. Every time the
  // bar scrolls into view it replays 0 → current threshold (truck driving in,
  // spinning wheels + trailing smoke); if the target changes while already in
  // view (item added/removed), it eases from wherever it currently sits to
  // the new target instead of restarting from zero.
  const observerInstanceRef = useRef(null);
  const rafRef = useRef(null);
  const smokeIdRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const truckFracRef = useRef(0);
  const puffsRef = useRef([]);
  const lastTargetRef = useRef(null);
  const wasInViewRef = useRef(false);
  const [isInView, setIsInView] = useState(false);

  // ONE state object updated once per frame. Splitting the truck transform and
  // the smoke list across two setState calls made React render twice per frame,
  // which is what made the motion stutter — the fill/truck/puffs could also
  // land a frame apart from each other. Single update keeps them in lockstep.
  const [anim, setAnim] = useState({ frac: 0, bob: 0, moving: false, puffs: [] });

  const animateTruckTo = (toFrac, duration) => {
    cancelAnimationFrame(rafRef.current);
    const fromFrac = truckFracRef.current;
    const t0 = performance.now();
    lastSpawnRef.current = 0;
    let fillDone = false;

    const tick = (now) => {
      const elapsed = now - t0;
      const k = Math.min(elapsed / duration, 1);
      const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const frac = fromFrac + (toFrac - fromFrac) * eased;
      const moving = k < 1;
      const bob = moving ? Math.sin(now / 90) * 1.2 : 0;

      // Fire exactly once, the instant the FILL itself finishes (not waiting
      // for the trailing smoke to fade) — this is what lets a click-to-add
      // gate the CTA button on the bar actually reaching its target instead
      // of a fixed timeout. Only ever set by handleAddToCart for a real
      // combo-completing add, so this is a no-op the rest of the time.
      if (!moving && !fillDone) {
        fillDone = true;
        const onComplete = onFillCompleteRef.current;
        onFillCompleteRef.current = null;
        onComplete?.();
      }

      truckFracRef.current = frac;

      // Spawn a puff at the truck's rear every ~70ms while it's driving, then
      // age out anything past its life. Held in a ref so the rAF loop owns the
      // list and we don't need a functional setState to read it.
      let puffs = puffsRef.current;
      if (moving && now - lastSpawnRef.current > 70) {
        lastSpawnRef.current = now;
        puffs = puffs.concat({ id: ++smokeIdRef.current, frac, born: now });
      }
      puffs = puffs.filter((p) => now - p.born < SMOKE_LIFE);
      puffsRef.current = puffs;

      setAnim({ frac, bob, moving, puffs });

      // Keep ticking while moving OR while smoke is still fading, so the last
      // puffs finish their fade instead of freezing mid-air.
      if (moving || puffs.length > 0) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  // Callback ref instead of a plain useRef + effect: this fires exactly when
  // the track DOM node mounts/unmounts, so it can't miss the mount the way an
  // effect keyed on `offerActive` did (offerActive/banner/recommendedProduct
  // are independent async queries that can resolve in any order — an effect
  // dependency can flip true and "use up" its one re-run before the DOM
  // this component conditionally renders actually exists yet).
  const setTrackRef = useCallback((node) => {
    if (observerInstanceRef.current) {
      observerInstanceRef.current.disconnect();
      observerInstanceRef.current = null;
    }
    if (node && typeof IntersectionObserver !== "undefined") {
      const observer = new IntersectionObserver(([entry]) => setIsInView(entry.isIntersecting), { threshold: 0.25 });
      observer.observe(node);
      observerInstanceRef.current = observer;
    }
  }, []);

  useEffect(() => {
    const target = progressPct / 100;
    const justEntered = isInView && !wasInViewRef.current;
    wasInViewRef.current = isInView;

    if (!isInView) return;

    if (justEntered) {
      // Replays the full 0 → threshold drive-in every time the bar re-enters
      // the viewport (scrolling away and back retriggers it).
      lastTargetRef.current = target;
      animateTruckTo(target, 1800);
      return;
    }

    if (lastTargetRef.current !== target) {
      // Target changed while already on screen (e.g. add-on added/removed) —
      // ease from the current position instead of restarting from zero.
      lastTargetRef.current = target;
      animateTruckTo(target, 900);
    }
  }, [isInView, progressPct]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // Seed the initial selection once variants load — prefers a "purple"
  // variant if the product has one, otherwise falls back to the first
  // variant. No auto-cycling: the selection just sits still until the
  // customer changes it via the dropdown below.
  useEffect(() => {
    if (variants.length > 0 && !selectedVariant) {
      const purple = variants.find((v) => v.variantName?.toLowerCase().includes("purple"));
      setSelectedVariant((purple || variants[0]).variantName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only seed once when variants first load
  }, [recommendedProduct?.productId]);

  // Keep the displayed image/price in sync with whatever variant is actually
  // in the cart once added (could differ from what's selected in the
  // dropdown, or from a variant changed elsewhere).
  useEffect(() => {
    if (addedVariant) {
      setSelectedVariant(addedVariant);
      setVariantMenuOpen(false);
    }
  }, [addedVariant]);

  // Mount-then-animate so the sheet slides up from off-screen rather than
  // just appearing; the reverse (closeSourcePrompt) unmounts after the same
  // transition duration so it slides back down instead of vanishing.
  useEffect(() => {
    if (!showSourcePrompt) return;
    const id = requestAnimationFrame(() => setSourcePromptMounted(true));
    return () => cancelAnimationFrame(id);
  }, [showSourcePrompt]);

  const closeSourcePrompt = () => {
    setSourcePromptMounted(false);
    setTimeout(() => setShowSourcePrompt(false), 300);
  };

  // Closes the custom variant dropdown when clicking anywhere outside it.
  useEffect(() => {
    if (!variantMenuOpen) return;
    const handleClickOutside = (e) => {
      if (variantMenuRef.current && !variantMenuRef.current.contains(e.target)) {
        setVariantMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [variantMenuOpen]);

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

  // A generic cart rule (e.g. "2+ Lamps => 50% off Pen Stand") may ALSO
  // discount this exact recommended product — mirrors the server's
  // applyBestDiscount EXACTLY, including the Math.round (best price for the
  // customer wins if more than one rule matches, rounded to the nearest
  // rupee) — so what's shown here can never drift from what checkout
  // actually charges (e.g. 50% off ₹299 is ₹149.5 mathematically, but both
  // this and the server round that to ₹150, consistently, everywhere).
  const ruleDiscountCandidates = ruleEval?.discounts?.[recommendedProduct.productId];
  const ruleDiscountedPrice = ruleDiscountCandidates?.length
    ? Math.round(
        Math.max(
          Math.min(
            ...ruleDiscountCandidates.map((c) =>
              c.type === "percent_off" ? displayPrice * (1 - c.value / 100) : displayPrice - c.value,
            ),
          ),
          0,
        ),
      )
    : null;
  const hasRuleDiscount = ruleDiscountedPrice !== null && ruleDiscountedPrice < displayPrice;

  const hasToken = !!localStorage.getItem("authToken");
  const isLoggedIn = isAuthenticated || hasToken;

  const handleAddToCart = async () => {
    const effectiveVariant = activeVariant?.variantName || "Standard Variant";
    // Captured BEFORE the cart updates — this is what decides whether this
    // specific click completes the combo, independent of the add itself.
    const willCompleteCombo = sourceInCart;

    let safetyTimer = null;
    if (willCompleteCombo) {
      // Button shows "Adding…"/disabled starting now. The scroll-triggered
      // effect further down will notice progressPct flip to 100 once the
      // cart updates below and animate the bar to it; onFillCompleteRef is
      // what that animation calls the moment it truly finishes.
      setAddLoading(true);
      // Safety net: if the bar is somehow never in view to animate (so the
      // fill-driving effect never runs), don't leave the button stuck on
      // "Adding…" forever.
      safetyTimer = setTimeout(() => setAddLoading(false), 3000);
      onFillCompleteRef.current = () => {
        clearTimeout(safetyTimer);
        setAddLoading(false);
        fireCelebrationConfetti();
      };
    }

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
        if (willCompleteCombo) {
          clearTimeout(safetyTimer);
          onFillCompleteRef.current = null;
          setAddLoading(false);
        }
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

    if (!willCompleteCombo) {
      // This add just left the cart with ONLY the add-on and not the source
      // product — free shipping isn't actually active. Say so in a dedicated
      // moment (bottom sheet) rather than folding it into the CTA label.
      setShowSourcePrompt(true);
    }
    // No local "added" flag to set — cartItems updates (dispatch above, or
    // refetchCart) and cartMatch/added/progressPct derive from that
    // automatically, which is what drives the bar animation above.
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
  // it's dropped in. `className` lets callers override outer spacing (e.g.
  // dropping the top margin when placed side-by-side in a desktop grid)
  // without affecting the other call sites' default stacked spacing.
  return (
    <>
      <div
        className={`rounded-3xl overflow-hidden border border-red-400  bg-[#FAF7F2] shadow-sm ${className}`}
      >
        {/* Top offer ribbon — high-contrast strip so this reads as "a deal"
          before anything else on the card is even read. Separate from the
          green progress panel below so it stays legible/unmissable
          regardless of combo state. */}
        <div className="relative z-10 overflow-hidden bg-[#E63329] px-4 py-3 flex items-center justify-center gap-2">
          <style>{`@keyframes fsbRibbonShine { 0% { transform: translateX(-120%); } 100% { transform: translateX(320%); } }`}</style>
          <i className="fa-solid fa-bolt text-[10px] text-[#F5DEB3]" />
          <span className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-white">
            Exclusive Combo Offer
          </span>
          <span
            className="absolute inset-y-0 w-1/4"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
              animation: "fsbRibbonShine 3.2s ease-in-out infinite",
            }}
          />
        </div>
        {/* Ribbon header */}
        {/* <div className="flex items-center justify-between gap-3 bg-[#2e443c] px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <i className="fa-solid fa-truck-fast text-sm text-[#E63329] shrink-0" />
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#EFEAE0] truncate">
            {banner.text}
          </p>
        </div>
        <span className="hidden sm:block shrink-0 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/40">
          Add-on deal
        </span>
      </div> */}

        {/* Combo copy — plain text on the card's own cream background, no
          separate colored panel. Stays fixed near the top; the actual
          progress bar lives further down, right above the CTA (see below). */}
        {offerActive && (
          <div className="px-4 pt-3 text-center">
            {freeShippingUnlocked ? (
              <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#1c3026]">
                Free shipping unlocked on this order
              </span>
            ) : added && !sourceInCart ? (
              // Recommended add-on is in the cart, but the source product (the
              // one this banner is actually attached to) isn't — so the combo
              // isn't real yet. Tell them exactly what's missing instead of
              // implying it's already done.
              <>
                {/* <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#1c3026]">
                  One more step!
                </p> */}
                <p className="text-[10px] font-semibold text-[#1c3026]/80">
                  Add {sourceProduct?.productName || "this product"} to your
                  cart to unlock{" "}
                  <span className="font-bold text-[#E63329]">
                    free shipping
                  </span>
                </p>
              </>
            ) : genericIsCloser && closestRuleProduct ? (
              // A generic cart rule (e.g. "2+ Lamps") is currently closer to
              // completing than the admin-configured combo above — nudge
              // toward THAT instead, since it's genuinely nearer.
              <p className="text-[10px] font-semibold text-[#1c3026]/80">
                Add{" "}
                {ruleEval.closestUnmatchedRule.conditions.find(
                  (c) => c.remaining > 0,
                )?.remaining || 1}{" "}
                more {closestRuleProduct.productName} to unlock{" "}
                <span className="font-bold text-[#E63329]">free shipping</span>
              </p>
            ) : (
              <>
                {/* <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#1c3026]">
                You're almost there!
              </p> */}
                {/* One level lighter than the other headline states
                    (font-bold → font-semibold) — same font-size, just less
                    heavy, so this fits on one line on mobile without
                    shrinking the text. */}
                <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#1c3026]">
                  Add {recommendedProduct.productName} & unlock{" "}
                  <span className="font-bold text-[#E63329]">
                    free shipping
                  </span>
                </p>

                {/* <p className="text-[11px] font-semibold text-[#1c3026]/80">
                  Add {recommendedProduct.productName} & unlock free shipping
                </p> */}
              </>
            )}
          </div>
        )}

        {/* Product card body */}
        <div className="px-4 pt-3 flex gap-4">
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

            {/* Custom variant dropdown — label + button on one line, fully
                on-brand (cream/green) everywhere, unlike a native <select>
                whose open popup is rendered by the OS/browser and can't be
                meaningfully styled, especially on mobile. Whatever's picked
                here is exactly what handleAddToCart sends to the cart (via
                `activeVariant`, derived from `selectedVariant`). Disabled
                once already in cart since that line is committed to
                `addedVariant`. */}
            {variants.length > 1 && (
              <div className="flex items-center gap-2 mt-1">
                <label className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                  {added ? "In cart" : "Variants"}
                </label>
                <div
                  ref={variantMenuRef}
                  className="relative flex-1 min-w-0 max-w-[96px]"
                >
                  <button
                    type="button"
                    onClick={() => !added && setVariantMenuOpen((v) => !v)}
                    disabled={added}
                    className="w-full flex items-center justify-between gap-1 rounded-lg border border-black/15 bg-white px-2.5 py-1 text-xs font-bold text-black disabled:opacity-60 disabled:cursor-default focus:outline-none focus:ring-1 focus:ring-[#157a44] focus:border-[#157a44]"
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="shrink-0 w-2.5 h-2.5 rounded-full border border-black/15"
                        style={{
                          background: variantColor(selectedVariant || ""),
                        }}
                      />
                      <span className="truncate">{selectedVariant}</span>
                    </span>
                    <i
                      className={`fa-solid fa-chevron-down text-[9px] text-black/40 shrink-0 transition-transform duration-200 ${
                        variantMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {variantMenuOpen && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-lg border border-[#157a44]/30 bg-[#FAF7F0] shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                      {variants.map((v) => {
                        const isSelected = v.variantName === selectedVariant;
                        return (
                          <button
                            key={v.variantName}
                            type="button"
                            onClick={() => {
                              setSelectedVariant(v.variantName);
                              setVariantMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-1.5 text-left px-2.5 py-1.5 text-xs font-bold transition-colors ${
                              isSelected
                                ? "bg-[#d6f2dd] text-[#157a44]"
                                : "text-[#1c3026] hover:bg-[#d6f2dd] hover:text-[#157a44]"
                            }`}
                          >
                            <span
                              className="shrink-0 w-2.5 h-2.5 rounded-full border border-black/15"
                              style={{
                                background: variantColor(v.variantName),
                              }}
                            />
                            <span className="truncate">{v.variantName}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-baseline gap-2 mt-1.5 flex-wrap">
              {hasRuleDiscount ? (
                // A generic cart rule just unlocked a discount on THIS exact
                // product (e.g. "2+ Lamps => 50% off Pen Stand") — takes
                // priority over the plain variant-markdown display below,
                // since it's a live reward, not just a baseline price.
                <>
                  <span className="text-lg font-bold tabular-nums text-[#E63329]">
                    ₹{Math.round(ruleDiscountedPrice).toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-400 line-through tabular-nums">
                    ₹{displayPrice.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-bold uppercase rounded-full bg-[#157a44] text-white px-1.5 py-0.5">
                    🎉 Discount Unlocked!
                  </span>
                </>
              ) : (
                <>
                  <span className="text-lg font-bold tabular-nums text-[#E63329]">
                    ₹{displayPrice.toLocaleString()}
                  </span>
                  {discountPercent > 0 && (
                    <>
                      <span className="text-xs text-gray-400 line-through tabular-nums">
                        ₹{maxVariantPrice.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-bold uppercase bg-black text-white px-1.5 py-0.5">
                        Save ₹
                        {(maxVariantPrice - displayPrice).toLocaleString()}
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Combo progress bar — plain (no colored panel), sits directly above
          and touching the CTA button below it. Truck-driven fill, a direct
          port of the "Free Shipping Bar" Claude Design prototype
          (track/fill/truck/smoke geometry and timings kept 1:1 with that
          file), driven by requestAnimationFrame rather than a CSS width
          transition so the fill/truck/exhaust stay locked to the same frame.
          `setTrackRef` is the IntersectionObserver target that (re)starts the
          drive-in whenever this scrolls into view. */}
        {offerActive && (
          <div className="px-4">
            <style>{`
            @keyframes fsbShine { 0% { transform: translateX(-120%); } 100% { transform: translateX(320%); } }
            @keyframes fsbWheel { to { transform: rotate(360deg); } }
            @keyframes fsbPop { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.12); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
          `}</style>
            <div ref={setTrackRef} className="relative" style={{ height: 38 }}>
              {/* The "lane": everything (track, fill, truck, smoke) is
                positioned inside this, and it stops short of the right edge
                by GOAL_W so the destination marker always has its own space —
                the truck can never collide with it. */}
              <div
                className="absolute left-0 bottom-0"
                style={{ right: GOAL_W, top: 0 }}
              >
                {/* Track */}
                <div
                  className="absolute left-0 right-0"
                  style={{
                    bottom: 6,
                    height: 14,
                    borderRadius: 999,
                    background: "#e3f6e7",
                    boxShadow: "inset 0 2px 5px rgba(21,122,68,0.18)",
                  }}
                >
                  {/* Fill — green gradient + drop shadow, with a shine sweep. */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${anim.frac * 100}%`,
                      minWidth: 14,
                      borderRadius: 999,
                      background:
                        "linear-gradient(90deg, #157a44 0%, #2fb463 100%)",
                      boxShadow: "0 2px 6px -2px rgba(21,122,68,0.5)",
                    }}
                  >
                    <div
                      className="absolute inset-0 overflow-hidden"
                      style={{ borderRadius: 999 }}
                    >
                      <div
                        className="absolute top-0 bottom-0"
                        style={{
                          width: "40%",
                          background:
                            "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
                          animation: "fsbShine 2.4s linear infinite",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Exhaust smoke — puffs grow, rise, drift back, fade out.
                  Anchored to the truck's rear via the same travel calc. */}
                {anim.puffs.map((p) => {
                  const t = Math.min(
                    Math.max(performance.now() - p.born, 0) / SMOKE_LIFE,
                    1,
                  );
                  const size = 7 + t * 18;
                  return (
                    <div
                      key={p.id}
                      className="absolute rounded-full pointer-events-none"
                      style={{
                        left: `calc(${p.frac} * (100% - ${TRUCK_W}px) + ${10 - t * 20}px)`,
                        bottom: 14 + t * 20,
                        width: size,
                        height: size,
                        marginLeft: -(size / 2),
                        marginBottom: -(size / 2),
                        background:
                          "radial-gradient(circle at 40% 40%, rgba(255,255,255,0.95), rgba(200,220,206,0.6) 55%, rgba(180,205,188,0) 72%)",
                        filter: "blur(1px)",
                        opacity: (1 - t) * 0.4,
                        zIndex: 2,
                      }}
                    />
                  );
                })}

                {/* Truck. Travels across (laneWidth - TRUCK_W) so at 100% its
                  right edge lands flush at the lane's end rather than hanging
                  outside it. */}
                <div
                  style={{
                    position: "absolute",
                    left: `calc(${anim.frac} * (100% - ${TRUCK_W}px))`,
                    bottom: 2 + anim.bob,
                    width: TRUCK_W,
                    willChange: "left",
                    zIndex: 3,
                  }}
                >
                  <svg
                    width={TRUCK_W}
                    height="36"
                    viewBox="0 0 80 56"
                    fill="none"
                    style={{ display: "block", overflow: "visible" }}
                  >
                    {/* ground shadow */}
                    <ellipse
                      cx="40"
                      cy="53"
                      rx="30"
                      ry="3.4"
                      fill="rgba(21,122,68,0.22)"
                    />
                    {/* cargo box */}
                    <rect
                      x="2"
                      y="7"
                      width="44"
                      height="30"
                      rx="6"
                      fill="#ffffff"
                      stroke="#157a44"
                      strokeWidth="2.4"
                    />
                    <rect
                      x="9"
                      y="14"
                      width="6"
                      height="16"
                      rx="2"
                      fill="#d6f2dd"
                    />
                    <rect
                      x="20"
                      y="14"
                      width="6"
                      height="16"
                      rx="2"
                      fill="#d6f2dd"
                    />
                    <rect
                      x="31"
                      y="14"
                      width="6"
                      height="16"
                      rx="2"
                      fill="#d6f2dd"
                    />
                    {/* cab */}
                    <path
                      d="M46 14 h13 a5 5 0 0 1 4 2.2 L69 26 a4 4 0 0 1 0.8 2.4 V37 H46 Z"
                      fill="#2fb463"
                      stroke="#157a44"
                      strokeWidth="2.4"
                      strokeLinejoin="round"
                    />
                    <rect
                      x="50"
                      y="18"
                      width="12"
                      height="8.5"
                      rx="2.5"
                      fill="#dff7e6"
                      stroke="#157a44"
                      strokeWidth="1.8"
                    />
                    <circle cx="67.5" cy="33.5" r="1.8" fill="#ffd34d" />
                    {/* wheels — spokes make the rotation actually readable */}
                    <g
                      style={{
                        transformBox: "fill-box",
                        transformOrigin: "center",
                        animation: anim.moving
                          ? "fsbWheel 0.55s linear infinite"
                          : "none",
                      }}
                    >
                      <circle cx="18" cy="40" r="8.4" fill="#1f2a24" />
                      <circle cx="18" cy="40" r="3.3" fill="#cfeed7" />
                      <rect
                        x="17"
                        y="32"
                        width="2"
                        height="16"
                        rx="1"
                        fill="#4c5a52"
                      />
                      <rect
                        x="10"
                        y="39"
                        width="16"
                        height="2"
                        rx="1"
                        fill="#4c5a52"
                      />
                    </g>
                    <g
                      style={{
                        transformBox: "fill-box",
                        transformOrigin: "center",
                        animation: anim.moving
                          ? "fsbWheel 0.55s linear infinite"
                          : "none",
                      }}
                    >
                      <circle cx="55" cy="40" r="8.4" fill="#1f2a24" />
                      <circle cx="55" cy="40" r="3.3" fill="#cfeed7" />
                      <rect
                        x="54"
                        y="32"
                        width="2"
                        height="16"
                        rx="1"
                        fill="#4c5a52"
                      />
                      <rect
                        x="47"
                        y="39"
                        width="16"
                        height="2"
                        rx="1"
                        fill="#4c5a52"
                      />
                    </g>
                  </svg>
                </div>
              </div>

              {/* Destination reward — sits in the reserved GOAL_W gutter at the
                far right, outside the truck's travel lane, and pops with a
                bounce the moment the combo unlocks. */}
              <div
                key={freeShippingUnlocked ? "unlocked" : "locked"}
                className="absolute flex items-center justify-center"
                style={{
                  right: 0,
                  bottom: 1,
                  width: 26,
                  height: 26,
                  borderRadius: 9,
                  background: "#fff",
                  boxShadow: "0 6px 14px -6px rgba(21,122,68,0.5)",
                  border: `2px solid ${freeShippingUnlocked ? "#2fb463" : "#bfe6cb"}`,
                  animation: freeShippingUnlocked
                    ? "fsbPop 0.45s cubic-bezier(0.34,1.56,0.64,1) both"
                    : "none",
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2 3 6.5v11L12 22l9-4.5v-11L12 2Z"
                    fill="#eafaee"
                    stroke="#157a44"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3 6.5 12 11l9-4.5M12 11v11"
                    stroke="#157a44"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M7.5 4.25 16.5 8.75"
                    stroke="#157a44"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="px-4 pt-0 pb-4">
          {addLoading ? (
            // The slider above IS the loader for this: cart is already updated
            // (`added` is already true underneath) but we hold this exact same
            // button — just disabled, label swapped to "Adding…" — until the
            // bar's fill animation actually reaches 100%, instead of a
            // different frozen-looking block or a fixed timeout. The queued
            // callback pushed in handleAddToCart is what flips addLoading
            // back off, at the moment the bar visually finishes.
            <button
              disabled
              className="w-full py-3.5 rounded-full flex items-center justify-center gap-2.5 text-sm font-extrabold uppercase tracking-wide bg-[#f5deb3] text-black opacity-70"
            >
              Adding…
            </button>
          ) : added ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 py-3.5 rounded-full text-[11px] font-extrabold uppercase tracking-[0.1em] text-center bg-[#f5deb3] text-[#1c3026] border border-black/15">
                {freeShippingUnlocked ? (
                  <>
                    <i className="fa-solid fa-circle-check mr-1.5 text-[#E63329]" />{" "}
                    Free Shipping Unlocked!
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-circle-check mr-1.5 text-[#E63329]" />{" "}
                    Added to Cart
                  </>
                )}
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
              className="group relative w-full py-3.5 rounded-full overflow-hidden flex items-center justify-center gap-2.5 text-sm font-medium uppercase tracking-wide disabled:opacity-50 bg-[#f5deb3]"
            >
              {/* Green fill that flows in from the left on hover — the label
                sits above it (z-10) and flips to cream as it sweeps past.
                (Label color is set via group-hover on the span itself below,
                not a hover: class on the button — a child's own explicit
                text color always wins over a parent's hover:text utility,
                so setting it on the button alone silently does nothing.) */}
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-[#1c3026] -translate-x-full transition-transform duration-500 ease-out group-hover:translate-x-0"
              />
              <span className="relative z-10 flex items-center justify-center gap-2.5 text-[#1c3026] transition-colors duration-500 group-hover:text-[#f5deb3]">
                {isAdding ? (
                  "Adding…"
                ) : hasRuleDiscount ? (
                  // A rule discount is active on this exact product (e.g. "2+
                  // Lamps => 50% off Pen Stand") — the real incentive right
                  // now is the price, not shipping, so the label should say
                  // so instead of the generic "Add & Ship Free".
                  <>
                    Add for ₹{Math.round(ruleDiscountedPrice).toLocaleString()}
                    <span className="text-base leading-none">→</span>
                  </>
                ) : (
                  <>
                    Add &amp; Ship Free
                    <span className="text-base leading-none">→</span>
                  </>
                )}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* "You still need the source product" bottom sheet — shown after adding
        the recommended add-on when that leaves the cart with ONLY the add-on
        (source product not in cart), so free shipping isn't actually active
        yet. Slides up from the bottom, backdrop-dismissible, with a single
        clear action: go add the source product (its own page, so the
        customer picks their own variant rather than one being guessed here). */}
      {showSourcePrompt && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          <div
            className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${sourcePromptMounted ? "opacity-100" : "opacity-0"}`}
            onClick={closeSourcePrompt}
          />
          <div
            className={`relative w-full max-w-md bg-[#FAF7F2] rounded-t-3xl px-5 pt-5 pb-6 shadow-2xl transition-transform duration-300 ease-out ${
              sourcePromptMounted ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <div className="mx-auto w-10 h-1 rounded-full bg-black/15 mb-4" />

            <div className="flex items-start gap-3">
              <div className="shrink-0 w-11 h-11 rounded-full bg-[#E63329]/10 flex items-center justify-center">
                <i className="fa-solid fa-truck-fast text-[#E63329] text-sm" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold uppercase tracking-wide text-black">
                  Almost there
                </p>
                <p className="text-[13px] text-black/70 mt-1 leading-snug">
                  {recommendedProduct.productName} is in your cart, but free
                  shipping needs{" "}
                  <span className="font-bold text-black">
                    {sourceProduct?.productName || "the main product"}
                  </span>{" "}
                  in there too.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 mt-5">
              <button
                onClick={closeSourcePrompt}
                className="flex-1 py-3 rounded-xl text-[11px] font-extrabold uppercase tracking-[0.1em] text-black/60 border border-black/15"
              >
                Maybe Later
              </button>
              <button
                onClick={() => {
                  closeSourcePrompt();
                  if (sourceProduct?.productId)
                    navigate(`/product/${sourceProduct.productId}`);
                }}
                className="flex-1 py-3 rounded-xl text-[11px] font-extrabold uppercase tracking-[0.1em] text-white bg-[#1c3026]"
              >
                Add{" "}
                {sourceProduct?.productName
                  ? sourceProduct.productName.split(" ")[0]
                  : "Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FreeShippingBanner;
