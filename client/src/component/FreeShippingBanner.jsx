import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { fireCelebrationConfetti } from "../utils/celebration";
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

// Confetti comes from the shared worker-backed pipeline in
// src/utils/celebration.js — see that file for why it must never be a plain
// main-thread confetti() call (it was hanging buttons on low-end phones).

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
const FreeShippingBanner = ({
  productId,
  showQuantityStepper = false,
  className = "mt-4",
  // When false, the truck/progress "track" section is not rendered — used in
  // the mini-cart and side-cart, which want just the product details + CTA,
  // not the full progress animation. PDP/checkout leave it on (default).
  showProgressBar = true,
}) => {
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
  // The dropdown popup itself is portaled to document.body (see below) so it
  // can't be clipped by this card's own overflow-hidden rounded corners —
  // that also means it's no longer a DOM descendant of variantMenuRef, so
  // the click-outside check needs its own ref to recognise clicks inside it.
  const variantMenuPortalRef = useRef(null);
  const [variantMenuPos, setVariantMenuPos] = useState(null);

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
  // Flip to true to bring back the "add the source product" bottom sheet that
  // used to pop after adding the add-on without the source in cart. Disabled
  // per request — the banner's inline top-copy line covers that case now.
  const SOURCE_PROMPT_ENABLED = false;
  const [showSourcePrompt, setShowSourcePrompt] = useState(false);
  const [sourcePromptMounted, setSourcePromptMounted] = useState(false);
  const [sourceAdding, setSourceAdding] = useState(false);

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
  // RTK Query keeps serving the LAST successful result once a query is
  // skipped — it doesn't clear `data` just because the cart emptied out.
  // Without this guard, removing the last rule-eligible item left the
  // "closest rule" nudge text and progress bar frozen at whatever they were
  // before, instead of resetting to the plain default state.
  const ruleEval = ruleEvalItems.length > 0 ? ruleEvalRes?.data : undefined;

  // NOTE: confetti is fired from exactly ONE place — handleAddToCart, on this
  // banner's own CTA click. There is deliberately no state-derived "a discount
  // became active" confetti effect here. A previous version had one, and it
  // misfired constantly: its `useRef` guard resets to false on every mount, and
  // the rules engine reports a discount for its target product whenever the
  // rule matches — even if that product isn't in the cart. So simply MOUNTING
  // the banner with 2 Lamps already in the cart (landing on the PDP, opening
  // checkout, or — most visibly — removing the Pen Stand on checkout, which is
  // what makes this banner appear in the first place) looked like a fresh
  // "unlock" and fired confetti. Celebration must stay tied to the click, not
  // to derived cart state.

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

  // Drives the progress bar's smooth fade/collapse-out — true only once the
  // truck has actually FINISHED settling (anim.moving false) AND we're
  // unlocked, not the instant freeShippingUnlocked flips true (which happens
  // the moment cart data updates, well before the truck has visually
  // finished animating to 100%). This keeps the bar on screen for its full
  // fill animation — and in sync with confetti, which is also gated on the
  // fill actually completing — instead of yanking it away mid-animation.
  const barHidden = freeShippingUnlocked && !anim.moving;

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

  // Closes the custom variant dropdown when clicking anywhere outside it —
  // checks both the trigger button AND the portaled popup, since the popup
  // is no longer a DOM descendant of the trigger once portaled.
  useEffect(() => {
    if (!variantMenuOpen) return;
    const handleClickOutside = (e) => {
      const insideTrigger = variantMenuRef.current?.contains(e.target);
      const insidePortal = variantMenuPortalRef.current?.contains(e.target);
      if (!insideTrigger && !insidePortal) {
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

  // Recomputes the portaled dropdown's position from the trigger button's
  // actual on-screen location every time it opens (fixed positioning, so no
  // continuous tracking needed) — and closes it on scroll/resize rather than
  // trying to keep repositioning it live, since it's a short-lived popup.
  useEffect(() => {
    if (!variantMenuOpen) return;
    const rect = variantMenuRef.current?.getBoundingClientRect();
    if (rect) {
      setVariantMenuPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    // Close when the PAGE scrolls (the popup is fixed-positioned, so it would
    // otherwise detach from its trigger) — but NOT when the scroll came from
    // inside the popup's own scrollable option list, which is a capture-phase
    // scroll event too and was closing the menu the moment you scrolled it.
    const handleScroll = (e) => {
      if (variantMenuPortalRef.current?.contains(e.target)) return;
      setVariantMenuOpen(false);
    };
    const close = () => setVariantMenuOpen(false);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [variantMenuOpen]);

  // Hide the whole card when the admin has switched the offer off
  // (offerConfig.isActive === false). Previously this only checked that a
  // banner existed, so a disabled offer still rendered the cross-sell card on
  // the PDP — only its progress bar hid. Gating on offerActive too makes the
  // admin toggle fully remove it everywhere, consistent with checkout/cart.
  if (!banner || !recommendedProduct || !offerActive) return null;
  // eslint-disable-next-line no-console -- TEMP debug, remove after checkout discount bug is diagnosed
  console.log("[FSB debug top]", {
    productIdProp: productId,
    banner,
    recommendedProductId: banner?.recommendedProductId,
    recommendedProduct,
    ruleEvalItems,
    ruleEval,
  });
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

    if (willCompleteCombo) {
      // OPTIMISTIC celebration, driven by the CLICK — not by the server.
      // Previously the fill only started once the add-to-cart POST *and* the
      // follow-up cart refetch had both returned (the bar is derived from
      // Redux cart state), so on a slow connection the button sat frozen on
      // "Adding…" for seconds and the confetti landed long after, detached
      // from the bar. The visual reward now runs on a fixed ~900ms timeline
      // no matter how slow the network is; the real cart sync continues
      // underneath and simply reconciles when it lands (progressPct is
      // already 100 by then, so `lastTargetRef` below stops the effect from
      // re-animating the same fill a second time).
      lastTargetRef.current = 1;
      onFillCompleteRef.current = () => {
        // Small beat after the fill visually lands, so the confetti reads as
        // a reaction to the truck arriving rather than firing on the same frame.
        setTimeout(fireCelebrationConfetti, 120);
      };
      animateTruckTo(1, 900);
    }

    // Tracks the real network state only — the button stays in its animated
    // "Adding…" state (spinner, not a frozen label) until the cart genuinely
    // reflects the item, then swaps to the unlocked badge.
    setAddLoading(true);

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
        setAddLoading(false);
      } catch {
        // Add failed — roll the optimistic fill back to whatever the cart
        // actually justifies, and make sure no queued confetti fires.
        setAddLoading(false);
        if (willCompleteCombo) {
          onFillCompleteRef.current = null;
          lastTargetRef.current = progressPct / 100;
          animateTruckTo(progressPct / 100, 500);
        }
        return; // swallow — this card is a nudge, not the primary add-to-cart flow
      }
    } else {
      // Guest cart is purely local — no network, so this is already instant.
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
      setAddLoading(false);
    }

    trackAddToCart({
      itemId: recommendedProduct.productId,
      itemName: recommendedProduct.productName,
      itemVariant: effectiveVariant,
      price: displayPrice,
      quantity: 1,
    });

    // Pop-up removed per request: when the add-on is in the cart but the
    // source product isn't, we no longer open a bottom sheet. The banner's own
    // top copy line already tells the customer to add {source} to unlock the
    // offer (see the `added && !sourceInCart` branch in the render below), so
    // that single inline message covers this case without a modal.
    // if (!willCompleteCombo) {
    //   setShowSourcePrompt(true);
    // }
    // No local "added" flag to set — cartItems updates (dispatch above, or
    // refetchCart) and cartMatch/added/progressPct derive from that
    // automatically, which is what drives the bar animation above.
  };

  // The bottom sheet's "Add" button — adds the SOURCE product (the one this
  // banner is attached to, e.g. the Brake Caliper Lamp) straight to the cart.
  // It used to only navigate to that product's page, which meant the button
  // labelled "Add" never actually added anything. Uses the source product's
  // first variant, since the sheet has no variant picker of its own.
  const handleAddSourceToCart = async () => {
    if (!sourceProduct?.productId || sourceAdding) return;
    const sourceVariant = sourceProduct.variantDetails?.[0];
    const variantName = sourceVariant?.variantName || "Standard Variant";
    const sourceImage =
      sourceVariant?.variantImage?.[0] || sourceProduct.productImg || displayImage;
    const sourcePrice = sourceVariant?.variantPrice ?? 0;

    setSourceAdding(true);
    if (isLoggedIn) {
      try {
        await addToCartAPI({
          productId: sourceProduct.productId,
          quantity: 1,
          variant: variantName,
          image: sourceImage,
        }).unwrap();
        dispatch(updateSelection({ productId: sourceProduct.productId, quantity: 1, variant: variantName }));
        await refetchCart().unwrap();
      } catch {
        setSourceAdding(false);
        return; // leave the sheet open so they can retry
      }
    } else {
      dispatch(
        addItem({
          id: sourceProduct.productId,
          mongoId: sourceProduct.productId,
          name: sourceProduct.productName,
          price: sourcePrice,
          image: sourceImage,
          quantity: 1,
          selectedVariant: variantName,
        }),
      );
    }

    trackAddToCart({
      itemId: sourceProduct.productId,
      itemName: sourceProduct.productName,
      itemVariant: variantName,
      price: sourcePrice,
      quantity: 1,
    });

    setSourceAdding(false);
    closeSourcePrompt();
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
        className={`rounded-3xl overflow-hidden border border-red-400 bg-[#FBF5E8] shadow-sm ${className}`}
      >
        {/* Top offer ribbon — high-contrast strip so this reads as "a deal"
          before anything else on the card is even read. Separate from the
          green progress panel below so it stays legible/unmissable
          regardless of combo state. bg-[#FAF7F2] */}
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
                {/* whitespace-nowrap keeps the whole sentence on ONE line;
                    the clamp() font-size shrinks it on very small screens
                    (e.g. iPhone SE) so it fits without wrapping, and caps at
                    11px on normal widths. */}
                <p
                  className="font-semibold tracking-[0.01em] text-[#1c3026] whitespace-nowrap"
                  style={{ fontSize: "clamp(8px, 3vw, 11px)" }}
                >
                  Add {recommendedProduct.productName} &amp; unlock{" "}
                  <span className="font-bold uppercase text-[#E63329]">
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
              <div className="flex items-center gap-8 mt-1">
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

                  {variantMenuOpen &&
                    variantMenuPos &&
                    createPortal(
                      <>
                        {/* Solid, always-visible scrollbar (not the thin,
                            auto-hiding native one) — scoped to this dropdown
                            only via its own class so it doesn't leak into
                            any other scroll container on the page. */}
                        <style>{`
                          .fsb-variant-scroll { scrollbar-width: thin; scrollbar-color: #157a44 #e7ded0; }
                          .fsb-variant-scroll::-webkit-scrollbar { width: 8px; }
                          .fsb-variant-scroll::-webkit-scrollbar-track { background: #e7ded0; border-radius: 999px; }
                          .fsb-variant-scroll::-webkit-scrollbar-thumb { background: #157a44; border-radius: 999px; }
                        `}</style>
                        <div
                          ref={variantMenuPortalRef}
                          className="fsb-variant-scroll fixed z-[10050] rounded-lg border border-[#157a44]/30 bg-[#FAF7F0] shadow-lg overflow-y-scroll max-h-48"
                          style={{ top: variantMenuPos.top, left: variantMenuPos.left, width: variantMenuPos.width }}
                        >
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
                      </>,
                      document.body,
                    )}
                </div>
              </div>
            )}

            <div className="flex items-baseline gap-2 mt-1.5 flex-wrap">
              {(() => {
                // Line-total, not just unit price — once the item is in the
                // cart, this scales with whatever quantity is set via the
                // stepper below, instead of always showing the ₹1-unit price
                // next to a "2" the customer has to do the multiplication for.
                const lineQty = added ? itemQty(cartMatch?.quantity) || 1 : 1;
                const lineDisplayPrice = displayPrice * lineQty;

                if (hasRuleDiscount) {
                  // A REAL cart rule discount is active on this exact product
                  // (e.g. "2+ Lamps => 50% off Pen Stand") — always takes
                  // priority over both the variant markdown and the cosmetic
                  // badge below; a real reward is never hidden behind a fake one.
                  const lineDiscounted =
                    Math.round(ruleDiscountedPrice) * lineQty;
                  // Derived from the actual prices rather than read off the
                  // rule, so a flat_off rule (₹X off) shows a correct % too.
                  const rulePercent = Math.round(
                    ((lineDisplayPrice - lineDiscounted) / lineDisplayPrice) * 100,
                  );
                  return (
                    <>
                      <span className="text-lg font-bold tabular-nums text-[#E63329]">
                        ₹{lineDiscounted.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-400 line-through tabular-nums">
                        ₹{lineDisplayPrice.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-bold uppercase rounded-full bg-[#157a44] text-white px-1.5 py-0.5">
                        {rulePercent}% OFF
                      </span>
                    </>
                  );
                }

                if (discountPercent > 0) {
                  // A genuine price difference between this product's own
                  // variants (not a cart rule), quantity-scaled. Leads with the
                  // % (the headline the eye catches) and keeps the rupee saving
                  // as the supporting detail.
                  const lineMax = maxVariantPrice * lineQty;
                  return (
                    <>
                      <span className="text-lg font-bold tabular-nums text-[#E63329]">
                        ₹{lineDisplayPrice.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-400 line-through tabular-nums">
                        ₹{lineMax.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-bold uppercase bg-black text-white px-1.5 py-0.5">
                        {discountPercent}% OFF · Save ₹{(lineMax - lineDisplayPrice).toLocaleString()}
                      </span>
                    </>
                  );
                }

                // No real discount of any kind — a purely cosmetic "feels
                // like a deal" strikethrough, frontend-only, not tied to any
                // actual pricing rule. Computed generically as 25% off the
                // real price (so it's never a hardcoded number — for a ₹299
                // item this lands on ₹399, matching the example exactly, but
                // it scales correctly for any other product/price too).
                // Deliberately replaced entirely by either branch above the
                // moment a real discount exists — never shown alongside one.
                const fakeMrpLine = Math.round(displayPrice / 0.75) * lineQty;
                return (
                  <>
                    <span className="text-lg font-bold tabular-nums text-[#E63329]">
                      ₹{lineDisplayPrice.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-400 line-through tabular-nums">
                      ₹{fakeMrpLine.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold uppercase bg-black text-white px-1.5 py-0.5">
                      25% OFF
                    </span>
                  </>
                );
              })()}
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
          drive-in whenever this scrolls into view.

          Fades/collapses away once barHidden (truck settled AND unlocked) —
          at that point the heading text above AND the "Free Shipping
          Unlocked!" pill below already say the same thing, so keeping a
          fully-filled bar on screen too just repeats the same message a
          third time. Stays mounted the whole time (never conditionally
          unmounted) so the IntersectionObserver/truck-animation logic is
          never disrupted by a hide/show cycle — only its own opacity/height
          transition, eased smoothly both ways, changes. Un-hides the same
          way if the item's later removed. */}
        {offerActive && showProgressBar && (
          <div
            className="px-4 overflow-hidden"
            style={{
              transition:
                "opacity 450ms ease-in-out, max-height 450ms ease-in-out, margin-top 450ms ease-in-out",
              opacity: barHidden ? 0 : 1,
              maxHeight: barHidden ? 0 : 60,
              marginTop: barHidden ? 0 : undefined,
              pointerEvents: barHidden ? "none" : "auto",
            }}
          >
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
        {/* pt-0 when the truck bar above it is visible (tight gap to it, per
            your earlier request). Keyed on barHidden (not freeShippingUnlocked
            directly) so this padding only opens up in sync with the bar
            actually finishing its fade/collapse above — not a beat earlier,
            which would otherwise make the CTA jump down while the bar is
            still visibly mid-transition above it. Also transitioned, so the
            gap opens smoothly rather than snapping. */}
        <div
          className="px-4 pb-4"
          style={{
            // Gap above the CTA when there's no visible progress bar directly
            // above it — either the bar has collapsed (barHidden) OR it's not
            // rendered at all (showProgressBar false, e.g. mini-cart/cart).
            paddingTop: barHidden || !showProgressBar ? 12 : 0,
            transition: "padding-top 450ms ease-in-out",
          }}
        >
          {addLoading ? (
            // Tracks the real network round-trip (add + cart refetch). It must
            // keep MOVING the whole time — a spinner plus a sweeping shimmer —
            // because on a slow connection this can sit here for seconds, and a
            // static label reads as a hung/broken button. The truck fill and
            // confetti above are deliberately NOT gated on this; they run on
            // their own fixed ~900ms timeline from the click.
            <button
              disabled
              className="relative w-full py-3.5 rounded-full overflow-hidden flex items-center justify-center gap-2.5 text-sm font-extrabold uppercase tracking-wide bg-[#f5deb3] text-[#1c3026] cursor-wait"
            >
              <style>{`@keyframes fsbLoadSweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
              <span
                aria-hidden="true"
                className="absolute inset-y-0 w-1/2"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent)",
                  animation: "fsbLoadSweep 1.1s linear infinite",
                }}
              />
              <span className="relative z-10 flex items-center gap-2.5">
                <i className="fa-solid fa-spinner fa-spin text-xs" />
                Adding…
              </span>
            </button>
          ) : added ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-[50px] flex items-center justify-center rounded-full text-[11px] font-extrabold uppercase tracking-[0.1em] text-center bg-[#f5deb3] text-[#1c3026] border border-[#ffce64]">
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
                // Quantity stepper here too (was a remove-only X) — decrementing
                // to 1 and pressing minus again still removes the line, via the
                // existing handleDecrement → handleRemove fallback below.
                <div className="shrink-0 flex items-center gap-3 rounded-full border border-[#ffce64] px-3 h-[50px] bg-[#f5deb3]">
                  <button
                    onClick={handleDecrement}
                    disabled={isUpdatingQty}
                    title="Decrease quantity"
                    className="disabled:opacity-50 text-[#1c3026]/60 hover:text-[#E63329]"
                  >
                    <i className="fa-solid fa-minus text-[10px]" />
                  </button>
                  <span className="text-xs font-bold w-3 text-center text-[#1c3026]">
                    {itemQty(cartMatch?.quantity) || 1}
                  </span>
                  <button
                    onClick={handleIncrement}
                    disabled={isUpdatingQty}
                    title="Increase quantity"
                    className="disabled:opacity-50 text-[#1c3026]/60 hover:text-[#1c3026]"
                  >
                    <i className="fa-solid fa-plus text-[10px]" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={isAdding}
              // Press state instead of the old hover-fill sweep: touch devices
              // have no hover, so on mobile that green fill simply never
              // appeared and the tap had no visual feedback at all. `active:`
              // fires on touch AND on mouse-down, so the press reads the same
              // everywhere — instant dark-brown fill, no transition delay.
              className="w-full py-3.5 rounded-full flex items-center justify-center gap-2.5 text-sm font-medium uppercase tracking-wide disabled:opacity-50 bg-[#f5deb3] text-[#1c3026] active:bg-[#4a2f1b] active:text-[#f5deb3] active:scale-[0.98] transition-[background-color,color,transform] duration-100"
            >
              <span className="flex items-center justify-center gap-2.5">
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

      {/* "You still need the source product" bottom sheet — DISABLED per
        request (the `false &&` guard keeps it out of the render but preserves
        the whole block for easy restore; flip it back to just `showSourcePrompt`
        to re-enable). Replaced by the inline top-copy line in the banner that
        already nudges "Add {source} to unlock free shipping" for this exact
        case (the `added && !sourceInCart` branch above). */}
      {SOURCE_PROMPT_ENABLED && showSourcePrompt &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-end justify-center">
          <div
            className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${sourcePromptMounted ? "opacity-100" : "opacity-0"}`}
            onClick={closeSourcePrompt}
          />
          <div
            className={`relative w-full max-w-md bg-[#FAF7F2] rounded-t-3xl px-5 pt-5 shadow-2xl transition-transform duration-300 ease-out ${
              sourcePromptMounted ? "translate-y-0" : "translate-y-full"
            }`}
            style={{ paddingBottom: "max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))" }}
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
                disabled={sourceAdding}
                className="flex-1 py-3 rounded-xl text-[11px] font-extrabold uppercase tracking-[0.1em] text-black/60 border border-black/15 disabled:opacity-50"
              >
                Maybe Later
              </button>
              <button
                onClick={handleAddSourceToCart}
                disabled={sourceAdding}
                className="flex-1 py-3 rounded-xl text-[11px] font-extrabold uppercase tracking-[0.1em] text-white bg-[#1c3026] active:bg-[#4a2f1b] disabled:opacity-70 transition-colors duration-100"
              >
                {sourceAdding ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin mr-1.5" />
                    Adding…
                  </>
                ) : (
                  "Add"
                )}
              </button>
            </div>
          </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default FreeShippingBanner;
