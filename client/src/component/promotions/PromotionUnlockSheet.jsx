import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { addItem, claimGift } from "../../store/slices/cartSlice";
import { useAddToCartMutation } from "../../store/api/userApi";
import { useCartPromotions } from "../../hooks/useCartPromotions";
import { track, trackAddToCart, trackViewPromotion, trackSelectPromotion } from "../../utils/analytics";
import { useSiteCampaign } from "../../hooks/useSiteCampaign";
import { Garland, Diya } from "../festive/FestiveLights";

/**
 * Smart combo/upsell bottom sheet: after a successful cart add,
 * check whether the customer is one step away from an Admin-configured
 * Promotion V2 offer, and if so, surface it with real, in-stock recommended
 * products to add — generic over every offer shape (buy-more-of-same-product,
 * buy-N-from-a-category, etc.), never hardcoded to a specific promotion.
 *
 * Mounted ONCE at the app root (see App.jsx, next to WhatsAppLoginWatcher) —
 * triggers regardless of where the add happened (PDP, cart drawer, this
 * sheet's own quick-add), not tied to any one page. The server checks
 * whether the add advanced the saved condition.
 *
 * Dismissal is session-scoped (sessionStorage) per promotion id — closing
 * the sheet (backdrop/✕/Escape) means THIS promotion won't auto-reopen again
 * this session, so a customer who says "not now" isn't nagged on every
 * subsequent add. Never opens while the cart drawer is already open (reads
 * ui.showCartModal) — two competing sheets never stack.
 */

const DISMISSED_KEY = "un_promo_sheet_dismissed_v1";
const REOPEN_COOLDOWN_MS = 4000;
// Allow the cart sync and promotion request to finish after a successful add.
const PENDING_ADD_TTL_MS = 6000;

function getDismissedSet() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
function markDismissed(id) {
  if (!id) return;
  try {
    const set = getDismissedSet();
    set.add(id);
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]));
  } catch {
    /* sessionStorage unavailable — worst case the sheet can reopen; never fatal */
  }
}
function clearDismissed() {
  try {
    sessionStorage.removeItem(DISMISSED_KEY);
  } catch {
    /* sessionStorage unavailable — nothing to clear */
  }
}

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;

const RecommendationCard = ({ product, onAdd, isAdding, isBusy, isSingle }) => (
  <article className={`h-full min-w-0 shrink-0 border border-hair bg-paper p-2 ${isSingle ? "w-full flex gap-3" : "w-[calc((100vw-52px)/2.1)] min-w-[124px] max-w-[152px] sm:w-[148px] flex flex-col gap-2"}`}>
    <div className={`relative shrink-0 overflow-hidden bg-surface ${isSingle ? "h-24 w-24 sm:h-28 sm:w-28" : "aspect-square w-full"}`}>
      {product.image ? (
        <img src={product.image} alt={product.productName} className="w-full h-full object-contain" loading="lazy" />
      ) : (
        <div className="w-full h-full grid place-items-center text-faint">
          <i className="fa-solid fa-image text-lg" />
        </div>
      )}
      <button
        type="button"
        onClick={() => onAdd(product)}
        disabled={isBusy}
        aria-label={`Add ${product.productName}${product.variantName ? `, ${product.variantName}` : ""} to cart`}
        className="absolute bottom-1 right-1 grid h-7 w-7 place-items-center border-2 border-paper bg-brand text-white transition-colors hover:bg-brandHi focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-55"
      >
        {isAdding ? <i className="fa-solid fa-spinner fa-spin text-[11px]" aria-hidden="true" /> : <i className="fa-solid fa-plus text-[11px]" aria-hidden="true" />}
      </button>
    </div>
    <div className="flex min-w-0 flex-1 flex-col justify-center">
      <h4 className="truncate text-xs font-extrabold leading-snug text-ink" title={product.productName}>{product.productName}</h4>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
        {product.offerPrice != null ? (
          <>
            <span className="text-base font-black tabular-nums text-ink">{inr(product.offerPrice)}</span>
            <span className="text-[11px] text-muted line-through">{inr(product.price)}</span>
          </>
        ) : <span className="text-sm font-extrabold tabular-nums text-ink">{product.price != null ? inr(product.price) : "—"}</span>}
      </div>
    </div>
  </article>
);

const PromotionUnlockSheet = () => {
  // Festive framing only while a campaign is live and the admin left section
  // accents on; otherwise this sheet renders exactly as before.
  const { can } = useSiteCampaign();
  const festive = can('sectionAccents');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((s) => s.auth);
  const showCartModal = useSelector((s) => s.ui.showCartModal);
  const totalQuantity = useSelector((s) => s.cart.totalQuantity);
  const cartItems = useSelector((s) => s.cart.items);
  const lastSuccessfulAdd = useSelector((s) => s.cart.lastSuccessfulAdd);
  const [pendingAdd, setPendingAdd] = useState(null);
  const [activePromoId, setActivePromoId] = useState(null);
  // Home offer cards open this same sheet for specific promotions (before anything is in the cart).
  const [externalIds, setExternalIds] = useState(null);
  // "Checkout" tapped (utils/checkoutIntent.js): look at the cart once, show
  // what's left to unlock, then continue to checkout.
  const [checkoutIntent, setCheckoutIntent] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState(false);
  const { promotions, pricing, isFetching, gifts, ready } = useCartPromotions("cart", null, pendingAdd, Boolean(pendingAdd || activePromoId || checkoutIntent), externalIds);
  const [addToCartAPI] = useAddToCartMutation();

  const [visible, setVisible] = useState(false);
  const [addingProductId, setAddingProductId] = useState(null);
  const [addError, setAddError] = useState("");
  const [justUnlocked, setJustUnlocked] = useState(false);
  const hasTrackedViewRef = useRef(false);
  const lastPromoRef = useRef(null);
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const previousAppliedRef = useRef(false);
  const celebratedIdsRef = useRef(new Set());
  const closeTimerRef = useRef(null);
  const touchStartRef = useRef(null);
  const addingRef = useRef(false);
  // Set by the product page's "Apply" on an offer: add the reward product
  // straight away when the offer recommends exactly one (no choice to make).
  const autoAddRef = useRef(false);

  useEffect(() => {
    const onOpen = (e) => {
      const ids = (e.detail?.promotionIds || []).map(String).filter(Boolean).slice(0, 4);
      if (!ids.length) return;
      autoAddRef.current = Boolean(e.detail?.autoAdd);
      clearTimeout(closeTimerRef.current);
      setExternalIds(ids);
      setActivePromoId(ids[0]);
    };
    window.addEventListener("un:open-offer-sheet", onOpen);
    const onCheckout = () => setCheckoutIntent(true);
    window.addEventListener("un:checkout-intent", onCheckout);
    window.__unOfferSheetReady = true;
    return () => {
      window.removeEventListener("un:open-offer-sheet", onOpen);
      window.removeEventListener("un:checkout-intent", onCheckout);
      window.__unOfferSheetReady = false;
    };
  }, []);

  // Never hold the shopper back: if the offers don't answer in time, go on.
  useEffect(() => {
    if (!checkoutIntent) return undefined;
    const t = setTimeout(() => { setCheckoutIntent(false); navigate("/checkout"); }, 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutIntent]);

  useEffect(() => {
    if (!checkoutIntent || !ready) return;
    setCheckoutIntent(false);
    // dismissals don't count here: checkout is the one moment we always show what's left
    const unclaimedGift = promotions.find((p) => p.applied && p.displayType === "free_gift"
      && gifts.some((g) => g.promotionId === p.id && g.status !== "claimed" && g.available));
    // `actionableForAdd` is about the item just added — at checkout nothing was, so it's not required
    // closest offer first ("1 more" before "2 more")
    const byProgress = [...promotions].sort((x, y) => (y.progress?.fraction ?? 0) - (x.progress?.fraction ?? 0));
    const target = unclaimedGift || byProgress.find((p) => ((p.qualifying && p.rewardTargetPending) || (!p.qualifying && p.progressText))
      && p.recommendedProducts?.length > 0);
    if (!target) { navigate("/checkout"); return; }
    setCheckoutMode(true);
    if (target === unclaimedGift) setJustUnlocked(true);
    setActivePromoId(target.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutIntent, ready, promotions, gifts]);

  const seenAddSequenceRef = useRef(lastSuccessfulAdd?.sequence || 0);
  const prevQtyRef = useRef(totalQuantity);
  const lastAutoOpenRef = useRef(0);
  const pendingAddTimerRef = useRef(null);
  useEffect(() => () => {
    clearTimeout(pendingAddTimerRef.current);
    clearTimeout(closeTimerRef.current);
  }, []);

  // The single best not-yet-qualifying-but-close offer — server already
  // sorts by displayRank, so the first match with a concrete next step
  // (progressText) AND real products to add (recommendedProducts) wins.
  // Anything without BOTH is either not actionable here or has no safe
  // product recommendation (see findFirstUnmetProductLeaf server-side) —
  // never guessed client-side. Dismissed promotions are excluded HERE (not
  // just in the open-guard below) — otherwise, once the top-ranked offer
  // gets dismissed/fulfilled once, it would keep winning this `.find()`
  // forever (it's still the first match in the array), permanently
  // blocking the sheet from ever suggesting a DIFFERENT, still-genuinely-
  // actionable offer for the rest of the session.
  const dismissedIds = getDismissedSet();
  const bestActionable = promotions.find(
    (p) => p.actionableForAdd && ((p.qualifying && p.rewardTargetPending) || (!p.qualifying && p.progressText))
      && p.recommendedProducts?.length > 0 && !dismissedIds.has(p.id),
  );

  // A successful add signal is produced by the cart reducer or the cart
  // mutation. Wait until the actual cart contains that added quantity, then
  // ask the server whether this add advanced a configured condition.
  useEffect(() => {
    const prevQty = prevQtyRef.current;
    prevQtyRef.current = totalQuantity;
    if (prevQty > 0 && totalQuantity === 0) {
      lastAutoOpenRef.current = 0;
      clearDismissed();
      celebratedIdsRef.current = new Set(); // an emptied cart starts the offers over
    }
  }, [totalQuantity]);

  useEffect(() => {
    if (!lastSuccessfulAdd || lastSuccessfulAdd.sequence <= seenAddSequenceRef.current) return;
    const inCart = cartItems
      .filter((item) => String(item.productId || item.mongoId || item.id) === String(lastSuccessfulAdd.productId)
        && (item.selectedVariant || "N/A") === lastSuccessfulAdd.selectedVariant)
      .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    if (inCart < lastSuccessfulAdd.previousQuantity + lastSuccessfulAdd.quantity) return;
    seenAddSequenceRef.current = lastSuccessfulAdd.sequence;
    if (activePromoId) return;
    setPendingAdd(lastSuccessfulAdd);
    clearTimeout(pendingAddTimerRef.current);
    pendingAddTimerRef.current = setTimeout(() => setPendingAdd(null), PENDING_ADD_TTL_MS);
  }, [lastSuccessfulAdd, cartItems, activePromoId]);

  // Effect #2 — reacts to the promotions data (and every other gate)
  // independently, so it re-evaluates whenever `bestActionable` itself
  // changes (e.g. the fetch finally resolves) — not just when totalQuantity
  // changes. This is what actually opens the sheet.
  useEffect(() => {
    if (!pendingAdd) return;
    if (showCartModal) return; // never fight the cart drawer
    if (activePromoId) return; // already showing one
    if (Date.now() - lastAutoOpenRef.current < REOPEN_COOLDOWN_MS) return;

    // This add just COMPLETED an offer (e.g. the 2nd katana → free stand): confirm it with the
    // "Offer unlocked" moment. It wins over suggesting the next offer, so the shopper always
    // sees that the offer was availed.
    const unlockedNow = promotions.find((p) => p.actionableForAdd && p.applied && !p.rewardTargetPending
      && p.displayType !== "free_shipping" && !celebratedIdsRef.current.has(p.id));
    // Suggestions ("add one more…") now wait for Checkout (see checkout intent
    // above) instead of interrupting every add; only a just-completed offer opens here.
    const target = unlockedNow;
    if (!target) return;

    clearTimeout(pendingAddTimerRef.current);
    // Open immediately — no artificial delay between "add" and the sheet showing up.
    setActivePromoId(target.id);
    lastAutoOpenRef.current = Date.now();
  }, [bestActionable, promotions, showCartModal, activePromoId, pendingAdd]);

  // The live, re-evaluated version of whichever promotion the sheet is
  // currently anchored to — so progress/recommendations update in place as
  // the customer adds items, instead of the sheet staying frozen on stale data.
  const livePromo = promotions.find((p) => p.id === activePromoId) || null;
  if (livePromo) lastPromoRef.current = livePromo;

  useEffect(() => {
    if (visible && activePromoId && !isFetching && (!livePromo || (!livePromo.applied && !livePromo.recommendedProducts?.length))) close(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, activePromoId, isFetching, livePromo]);

  useEffect(() => {
    if (activePromoId) {
      previousAppliedRef.current = false;
      setAddError("");
      setVisible(true);
      hasTrackedViewRef.current = false;
    } else {
      setVisible(false);
    }
  }, [activePromoId]);

  useEffect(() => {
    if (showCartModal && activePromoId) close(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCartModal, activePromoId]);

  useEffect(() => {
    if (!visible) return undefined;
    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = requestAnimationFrame(() => dialogRef.current?.querySelector("button")?.focus());
    const onKey = (e) => {
      if (e.key === "Escape") close(true);
      if (e.key !== "Tab") return;
      const focusable = [...(dialogRef.current?.querySelectorAll('button:not([disabled]), a[href]') || [])];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      cancelAnimationFrame(focusFrame);
      previousFocusRef.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!visible || !livePromo || hasTrackedViewRef.current) return;
    hasTrackedViewRef.current = true;
    trackViewPromotion({ promotionId: livePromo.id, promotionName: livePromo.title, creativeSlot: "cart_unlock_sheet" });
  }, [visible, livePromo]);

  // Celebrate only the first genuine not-applied -> applied transition while
  // this sheet is open. An initial render or identical API response cannot
  // trigger it; the backend's applied flag is the authority.
  useEffect(() => {
    if (!visible || !livePromo) return undefined;
    const wasApplied = previousAppliedRef.current;
    previousAppliedRef.current = Boolean(livePromo.applied);
    if (wasApplied || !livePromo.applied || livePromo.rewardTargetPending || celebratedIdsRef.current.has(livePromo.id)) return undefined;
    celebratedIdsRef.current.add(livePromo.id);
    markDismissed(livePromo.id);
    setJustUnlocked(true);
    track("promo_unlock_sheet_fulfilled", { promotion_id: livePromo.id, promotion_name: livePromo.title });
    let cancelled = false;
    if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      import("canvas-confetti").then(({ default: confetti }) => {
        if (cancelled) return;
        const tokenColor = (name) => `rgb(${getComputedStyle(document.documentElement).getPropertyValue(name).trim().split(/\s+/).join(",")})`;
        confetti({ particleCount: 42, spread: 48, startVelocity: 23, gravity: 1.15, ticks: 85,
          origin: { x: 0.5, y: 0.8 }, colors: [tokenColor("--gl-brand"), tokenColor("--gl-save"), tokenColor("--gl-paper")],
          disableForReducedMotion: true, zIndex: 10000 });
      }).catch(() => {});
    }
    // a free gift stays open until the shopper claims it (or closes the sheet); other offers confirm and close
    const timer = livePromo.displayType === "free_gift" ? null : setTimeout(() => close(false), 5000);
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, livePromo?.applied, livePromo?.rewardTargetPending]);

  const close = (dismiss = false) => {
    if (dismiss && activePromoId) {
      markDismissed(activePromoId);
      track("promo_unlock_sheet_dismissed", { promotion_id: activePromoId });
    }
    setVisible(false);
    setJustUnlocked(false);
    setPendingAdd(null);
    setCheckoutMode(false);
    autoAddRef.current = false;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => { setActivePromoId(null); setExternalIds(null); }, 300);
  };

  useEffect(() => {
    if (!autoAddRef.current || !visible || isFetching || !livePromo) return;
    const recs = livePromo.recommendedProducts || [];
    if (livePromo.applied || recs.length !== 1) { autoAddRef.current = false; return; }
    autoAddRef.current = false;
    handleAdd(recs[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, isFetching, livePromo]);

  const handleAdd = async (product) => {
    if (addingRef.current) return;
    addingRef.current = true;
    setAddError("");
    setAddingProductId(`${product.productId}:${product.sku || ""}`);
    trackSelectPromotion({
      promotionId: livePromo?.id, promotionName: livePromo?.title, creativeSlot: "cart_unlock_sheet",
      itemId: product.productId, itemName: product.productName, price: product.price,
    });
    try {
      const hasToken = !!localStorage.getItem("authToken");
      const isLoggedIn = isAuthenticated || hasToken;
      if (isLoggedIn) {
        await addToCartAPI({
          productId: product.productId,
          quantity: 1,
          variant: product.variantName || undefined,
          image: product.image,
        }).unwrap();
      } else {
        dispatch(
          addItem({
            id: product.productId,
            mongoId: product.productId,
            name: product.productName,
            price: product.price,
            image: product.image,
            quantity: 1,
            selectedVariant: product.variantName || "N/A",
            sku: product.sku,
          }),
        );
      }
      trackAddToCart({
        itemId: product.productId, sku: product.sku, itemName: product.productName,
        itemVariant: product.variantName, price: product.price, quantity: 1, placement: "promo_unlock_sheet",
      });
    } catch (err) {
      console.error("[PromotionUnlockSheet] add to cart failed:", err);
      setAddError(err?.data?.message || "Could not add this item. Please try again.");
    } finally {
      addingRef.current = false;
      setAddingProductId(null);
    }
  };

  if (!activePromoId) return null;
  const promo = livePromo || (lastPromoRef.current?.id === activePromoId ? lastPromoRef.current : null);
  const reward = promo?.rewardProduct;
  const appliedSavings = pricing?.savingsByPromotion?.[promo?.id] || 0;
  // Every other offer the same add put within reach (e.g. "2 wooden" AND
  // "wooden + LED" both want one more katana), capped at 3, anchored promo first.
  const stillActionable = (p) => (checkoutMode || p.actionableForAdd) && ((p.qualifying && p.rewardTargetPending) || (!p.qualifying && p.progressText))
    && p.recommendedProducts?.length > 0 && (checkoutMode || !dismissedIds.has(p.id));
  const rows = externalIds
    ? externalIds.map((id) => promotions.find((p) => p.id === id)).filter((p) => p && (p.recommendedProducts?.length || p.applied)).slice(0, 4)
    : promo
      ? [promo, ...[...promotions].sort((x, y) => (y.progress?.fraction ?? 0) - (x.progress?.fraction ?? 0)).filter((p) => p.id !== promo.id && stillActionable(p))].slice(0, 3)
      : [];

  return (
    // Phones: bottom sheet. Desktop (md+): centred dialog — a sheet pinned to
    // the bottom of a wide screen got cut off and looked out of place.
    <div className="fixed inset-0 z-[9998] flex items-end justify-start sm:justify-center md:items-center md:p-6" data-promotion-sheet>
      <div
        className={`absolute inset-0 bg-ink/60 backdrop-blur-[3px] transition-opacity duration-300 motion-reduce:transition-none ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={() => close(true)}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="promotion-sheet-title"
        aria-describedby="promotion-sheet-description"
        className={`relative flex max-h-[88dvh] min-w-0 w-[100dvw] flex-col overflow-hidden border shadow-2xl sm:w-full sm:max-w-[540px] md:max-w-[480px] md:max-h-[80vh] transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none ${
          festive && !justUnlocked ? "border-star/60 bg-ink" : festive ? "border-star/60 bg-paper" : "border-hair bg-paper"
        } ${visible ? "translate-y-0 md:opacity-100" : "translate-y-full md:translate-y-4 md:opacity-0"}`}
      >
        {festive && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[22px] overflow-hidden" aria-hidden="true">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-star/70 to-transparent" />
            <Garland arcs={4} tone={justUnlocked ? "onLight" : undefined} />
          </div>
        )}
        <div
          className={`mx-auto h-1 w-11 shrink-0 md:invisible ${festive && justUnlocked ? "mt-7 bg-ink/15" : festive ? "mt-7 bg-paper/30 sm:mt-7" : "mt-3 bg-ink/15 sm:mt-2.5"}`}
          onTouchStart={(event) => { touchStartRef.current = event.touches[0]?.clientY ?? null; }}
          onTouchEnd={(event) => {
            if (touchStartRef.current != null && event.changedTouches[0]?.clientY - touchStartRef.current > 80) close(true);
            touchStartRef.current = null;
          }}
          aria-hidden="true"
        />
        <button
          type="button"
          onClick={() => close(true)}
          aria-label="Dismiss offer"
          className={`absolute right-4 z-20 grid h-9 w-9 place-items-center border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${festive && !justUnlocked ? "top-7 border-paper/35 text-paper hover:bg-white/10" : festive ? "top-7 border-hair text-ink hover:bg-surface" : "top-4 border-hair text-ink hover:bg-surface"}`}
        >
          <i className="fa-solid fa-xmark text-sm" aria-hidden="true" />
        </button>

        {justUnlocked ? (
          // Same paper/ink/brand look as the cart's applied-offer receipt — a
          // plain confirmation, not a splash screen.
          <div className="bg-paper px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 text-ink sm:px-7" role="status" aria-live="polite">
            <div className="flex items-center gap-2 pr-10">
              <span className="grid h-6 w-6 shrink-0 place-items-center bg-save text-paper" aria-hidden="true">
                <i className={`fa-solid ${promo?.displayType === "free_gift" ? "fa-gift" : "fa-check"} text-[11px]`} />
              </span>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-save">
                {promo?.displayType === "free_gift" ? "Free gift unlocked" : "Offer applied"}
              </p>
            </div>
            <h3 id="promotion-sheet-title" className="mt-3 text-2xl font-black leading-tight tracking-tight">
              {appliedSavings > 0 ? <>You saved <span className="text-brand">{inr(appliedSavings)}</span></> : promo?.displayType === "free_gift" ? "Your free gift is ready" : "Offer applied"}
            </h3>
            <p id="promotion-sheet-description" className="mt-1 text-sm text-muted">
              {promo?.displayType === "free_gift"
                ? `${(promo.rewardLabel || "").replace(/\s*[—-]\s*free\s*$/i, "") || "Your free gift"} — claim it to add it to your order.`
                : `${promo?.rewardLabel || promo?.title} — applied to your cart.`}
            </p>
            {promo?.displayType === "free_gift" && (() => {
              // free gifts are never added automatically: the shopper claims them
              const entitlement = gifts?.find((g) => g.promotionId === promo.id);
              if (!entitlement) return null;
              return entitlement.status === "claimed" ? (
                <p className="mt-3 text-sm font-bold text-save">✓ Claimed — it is in your cart</p>
              ) : (
                <button
                  type="button"
                  onClick={() => dispatch(claimGift({ promotionId: entitlement.promotionId, productId: entitlement.productId, variantSku: entitlement.variantSku, quantity: entitlement.quantity }))}
                  disabled={!entitlement.available}
                  className="mt-4 h-12 w-full bg-ink text-sm font-bold text-paper transition-colors hover:bg-brand disabled:opacity-50"
                >
                  {entitlement.available ? "Claim Free Gift" : "Currently out of stock"}
                </button>
              );
            })()}
            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-dashed border-hair pt-4">
              <button type="button" onClick={() => close(false)} className="h-11 border border-ink text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-paper">
                Keep shopping
              </button>
              <button type="button" onClick={() => { close(false); navigate("/checkout"); }} className="h-11 bg-brand text-sm font-bold text-paper transition-colors hover:bg-brandHi">
                Checkout →
              </button>
            </div>
          </div>
        ) : (
          <div className="min-h-0 overflow-y-auto bg-paper px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4 sm:px-7">
            <div
              className={festive ? "relative -mx-5 -mt-4 mb-4 px-5 pb-9 pt-2 sm:-mx-7 sm:px-7" : ""}
              style={festive ? { background: "radial-gradient(70% 120% at 50% -10%, rgb(var(--gl-brand) / 0.28), transparent 70%), rgb(var(--gl-ink))" } : undefined}
            >
            <div className="mb-3 flex items-center gap-2 pr-10">
              <span className={`inline-flex shrink-0 items-center gap-1.5 border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-white ${festive ? "border-paper/30 bg-white/10" : "border-ink bg-ink"}`}>
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping bg-brand opacity-75 motion-reduce:hidden" />
                  <span className="relative inline-flex h-2 w-2 bg-brand" />
                </span>
                {promo?.rewardTargetPending ? "One step away" : "Almost there"}
              </span>
              {festive && (
                <span className="inline-flex shrink-0 items-center gap-1.5 border border-star/60 bg-star/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-star">
                  <span aria-hidden="true">✦</span> Festive offer
                </span>
              )}
              {/* {promo?.badge && <span className="truncate text-[11px] font-bold text-muted">{promo.badge}</span>} */}
            </div>

            <h3 id="promotion-sheet-title" className={`truncate pr-10 text-xl font-black leading-tight tracking-tight sm:text-2xl ${festive ? "text-paper" : "text-ink"}`} title={rows.length > 1 ? "Unlock your free reward" : promo?.title}>{rows.length > 1 ? "Unlock your free reward" : promo?.title}</h3>
            <p id="promotion-sheet-description" className={`mt-2 text-[13px] leading-relaxed ${festive ? "text-paper/75" : "text-muted"}`}>
              {rows.length > 1 ? "You're one step away — pick whichever suits you." : promo?.rewardTargetPending ? "Your cart qualifies. Add an eligible reward item to apply the offer." : promo?.progressText}
            </p>
            {festive && (
              <>
                <Diya className="pointer-events-none absolute bottom-2 left-4" />
                <Diya className="pointer-events-none absolute bottom-2 right-4" />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-star to-transparent" aria-hidden="true" />
              </>
            )}
            </div>
            {festive && (
              <div className="pointer-events-none relative -mt-4 mb-2 h-[22px] overflow-hidden" aria-hidden="true">
                <Garland arcs={4} tone="onLight" />
              </div>
            )}

            {/* {promo?.savingsText && (
              <div className="mt-4 flex items-center gap-3 border border-brand/25 bg-brand/5 p-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center bg-brand text-white">
                  <i className="fa-solid fa-tag text-sm" aria-hidden="true" />
                </span>
                <p className="truncate text-sm font-extrabold text-ink" title={promo.savingsText}>{promo.savingsText}</p>
              </div>
            )} */}

            {reward && rows.length < 2 && !promo?.rewardTargetPending && (
              <div className="mt-4 flex items-center gap-3 border border-hair bg-surface/60 p-2.5">
                <div className="h-14 w-14 shrink-0 overflow-hidden bg-paper">
                  {reward.image && <img src={reward.image} alt={reward.productName} className="h-full w-full object-contain" loading="lazy" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] font-extrabold uppercase tracking-wider text-brand">Your reward</p>
                  <p className="truncate text-xs font-bold text-ink" title={reward.productName}>{reward.productName}</p>
                </div>
                {reward.offerPrice != null && <div className="shrink-0 text-right"><p className="text-[10px] text-muted line-through">{inr(reward.price)}</p><p className="text-sm font-extrabold text-ink">{inr(reward.offerPrice)}</p></div>}
              </div>
            )}

            {/* One row per offer the customer is one step from — each scrolls
                sideways through its own eligible products. */}
            {rows.map((row, rowIndex) => {
              const items = row.recommendedProducts || [];
              return (
                <div key={row.id} className={rowIndex === 0 ? "mt-5" : "mt-5 border-t border-hair pt-4"}>
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-extrabold uppercase tracking-[0.13em] text-brand">
                        {rows.length > 1 ? row.title : "Complete your offer"}
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-ink">
                        {row.rewardTargetPending ? "Choose your reward item" : (rows.length > 1 ? row.progressText : "Add an eligible item")}
                      </p>
                      {(() => {
                        // an offer in the same group replaces the one already applied (never both)
                        const current = row.group && !row.applied ? promotions.find((p) => p.applied && p.id !== row.id && p.group === row.group) : null;
                        return current ? (
                          <p className="mt-0.5 text-[11.5px] font-semibold text-brand">
                            This replaces your current free {(current.rewardLabel || "reward").replace(/\s*[—-]\s*free\s*$/i, "")} — you get one, not both.
                          </p>
                        ) : null;
                      })()}
                    </div>
                    {items.length > 2 && <span className="shrink-0 text-[10px] font-semibold text-muted">Swipe <i className="fa-solid fa-arrow-right ml-1" aria-hidden="true" /></span>}
                  </div>
                  <div className={`flex gap-3 pb-1 ${items.length > 1 ? "-mx-5 snap-x snap-mandatory overflow-x-auto overscroll-x-contain px-5 scrollbar-hide sm:-mx-7 sm:px-7" : ""}`} aria-label="Eligible products">
                    {items.map((product) => (
                      <div key={`${row.id}-${product.productId}-${product.sku || ""}`} className={items.length > 1 ? "shrink-0 snap-start" : "w-full"}>
                        <RecommendationCard
                          product={product}
                          onAdd={handleAdd}
                          isAdding={addingProductId === `${product.productId}:${product.sku || ""}`}
                          isBusy={Boolean(addingProductId)}
                          isSingle={items.length === 1}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {addError && <p className="mt-3 border border-brand/20 bg-brand/5 px-3 py-2 text-xs font-semibold text-brand" role="alert">{addError}</p>}
            {checkoutMode && (
              <div className="sticky bottom-0 z-20 -mx-5 mt-4 border-t border-hair bg-paper px-5 pt-3 sm:-mx-7 sm:px-7">
                <button type="button" onClick={() => { close(false); navigate("/checkout"); }} className="h-12 w-full bg-brand text-sm font-bold text-paper transition-colors hover:bg-brandHi">
                  Continue to checkout →
                </button>
              </div>
            )}
            <p className={`mt-4 text-center text-[11px] leading-relaxed text-muted ${festive ? "px-8" : ""}`}>Offer applies after eligible items are in your cart. Final total is confirmed at checkout.</p>
          </div>
        )}
        {festive && !justUnlocked && (
          <>
            <Diya tone="onLight" className="pointer-events-none absolute bottom-3 left-3 z-20" />
            <Diya tone="onLight" className="pointer-events-none absolute bottom-3 right-3 z-20" />
          </>
        )}
      </div>
    </div>
  );
};

export default PromotionUnlockSheet;
