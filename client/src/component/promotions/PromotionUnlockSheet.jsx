import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { addItem, claimGift, removeItem, updateQuantity } from "../../store/slices/cartSlice";
import { useAddToCartMutation, useUpdateCartMutation } from "../../store/api/userApi";
import { OfferRewardPicks, canGetOneMore } from "./AppliedOfferSummary";
import { groupCartByOffer } from "../../utils/cartOfferGroups";
import { useCartPromotions } from "../../hooks/useCartPromotions";
import { track, trackAddToCart, trackViewPromotion, trackSelectPromotion } from "../../utils/analytics";
import { useSiteCampaign } from "../../hooks/useSiteCampaign";
import { Garland } from "../festive/FestiveLights";
import GiftClaimList from "./GiftClaimList";
import { nounOf } from "../../utils/offerName";
import { useGetProductsQuery } from "../../store/api/productsApi";

/**
 * Smart combo/upsell bottom sheet: after a successful cart add,
 * check whether the customer is one step away from an Admin-configured
 * Promotion V2 offer, and if so, surface it with real, in-stock recommended
 * products to add - generic over every offer shape (buy-more-of-same-product,
 * buy-N-from-a-category, etc.), never hardcoded to a specific promotion.
 *
 * Mounted ONCE at the app root (see App.jsx, next to WhatsAppLoginWatcher) -
 * triggers regardless of where the add happened (PDP, cart drawer, this
 * sheet's own quick-add), not tied to any one page. The server checks
 * whether the add advanced the saved condition.
 *
 * Dismissal is session-scoped (sessionStorage) per promotion id - closing
 * the sheet (backdrop/✕/Escape) means THIS promotion won't auto-reopen again
 * this session, so a customer who says "not now" isn't nagged on every
 * subsequent add. Never opens while the cart drawer is already open (reads
 * ui.showCartModal) - two competing sheets never stack.
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
    /* sessionStorage unavailable - worst case the sheet can reopen; never fatal */
  }
}
function clearDismissed() {
  try {
    sessionStorage.removeItem(DISMISSED_KEY);
  } catch {
    /* sessionStorage unavailable - nothing to clear */
  }
}

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;

// What this pick costs under the offer: "FREE" / "50% OFF" (null when it is not discounted)
const offerBadge = (product) => {
  const price = Number(product.price);
  const offer = product.offerPrice == null ? null : Number(product.offerPrice);
  if (offer == null || !(price > 0) || offer >= price) return null;
  return offer === 0 ? "FREE" : `${Math.round((1 - offer / price) * 100)}% OFF`;
};

// `fill`: the card takes its grid cell (3 options shown side by side, no swiping)
const RecommendationCard = ({ product, onAdd, onSub, isAdding, isBusy, isSingle, fill = false, inCart = 0 }) => (
  <article className={`h-full min-w-0 shrink-0 border border-hair bg-paper p-2 ${isSingle ? "w-full flex gap-3" : fill ? "w-full flex flex-col gap-2" : "w-[calc((100vw-52px)/2.1)] min-w-[124px] max-w-[152px] sm:w-[148px] flex flex-col gap-2"}`}>
    <div className={`relative shrink-0 overflow-hidden bg-surface ${isSingle ? "h-24 w-24 sm:h-28 sm:w-28" : "aspect-square w-full"}`}>
      {offerBadge(product) && (
        <span className="absolute left-1 top-1 z-10 bg-brand px-1.5 py-0.5 text-[9.5px] font-extrabold leading-none text-white">{offerBadge(product)}</span>
      )}
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
      {/* the variant tells the options apart (Single / Double / Triple stand all share one product name) */}
      <h4 className="line-clamp-2 text-xs font-extrabold leading-snug text-ink" title={product.variantName || product.productName}>{product.variantName || product.productName}</h4>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
        {product.offerPrice != null ? (
          <>
            <span className="text-base font-black tabular-nums text-ink">{inr(product.offerPrice)}</span>
            <span className="text-[11px] text-muted line-through">{inr(product.price)}</span>
          </>
        ) : <span className="text-sm font-extrabold tabular-nums text-ink">{product.price != null ? inr(product.price) : "-"}</span>}
      </div>
      {/* the + gives feedback: how many of this exact option are already in the cart */}
      {inCart > 0 && (
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex h-7 items-center rounded-full border border-hair bg-white" aria-live="polite">
            <button type="button" onClick={() => onSub?.(product)} disabled={isBusy} aria-label={`Remove one ${product.variantName || product.productName}`} className="grid h-full w-7 place-items-center text-muted transition-colors hover:text-brand disabled:opacity-55">
              <i className="fa-solid fa-minus text-[10px]" aria-hidden="true" />
            </button>
            <span className="min-w-[18px] text-center text-xs font-bold tabular-nums text-ink">{inCart}</span>
            <button type="button" onClick={() => onAdd(product)} disabled={isBusy} aria-label={`Add one more ${product.variantName || product.productName}`} className="grid h-full w-7 place-items-center text-muted transition-colors hover:text-brand disabled:opacity-55">
              <i className="fa-solid fa-plus text-[10px]" aria-hidden="true" />
            </button>
          </div>
          <span className="text-[10.5px] font-bold text-save">in cart</span>
        </div>
      )}
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
  // units of one product option already in the cart (shown on its card after +)
  const inCartQty = (product) => cartItems
    .filter((i) => String(i.productId || i.mongoId || i.id) === String(product.productId)
      && (!product.variantName || i.selectedVariant === product.variantName))
    .reduce((n, i) => n + (Number(i.quantity) || 0), 0);
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
  const [updateCartAPI] = useUpdateCartMutation();

  const [visible, setVisible] = useState(false);
  const [addingProductId, setAddingProductId] = useState(null);
  const [addError, setAddError] = useState("");
  // offer id whose step 1 (add the trigger item) was just done from the 2-step card
  const [stepTwoFor, setStepTwoFor] = useState(null);
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
  // cached catalogue (same args as header) for the "add 1 more" step of repeating offers
  const { data: catalog } = useGetProductsQuery({ page: 1, limit: 24 });
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
    // checkout page: "get one more stand" opens this offer's 2-step card directly
    const onSteps = (e) => {
      const id = String(e.detail?.promotionId || "");
      if (!id) return;
      clearTimeout(closeTimerRef.current);
      setCheckoutMode(true);
      setJustUnlocked(false);
      setActivePromoId(id);
    };
    window.addEventListener("un:open-offer-steps", onSteps);
    window.__unOfferSheetReady = true;
    return () => {
      window.removeEventListener("un:open-offer-sheet", onOpen);
      window.removeEventListener("un:checkout-intent", onCheckout);
      window.removeEventListener("un:open-offer-steps", onSteps);
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

  // after step 1, bring step 2 (the reward pick) into view as soon as the server shows it
  const stepScrolledRef = useRef(null);
  useEffect(() => {
    if (!stepTwoFor) return;
    const el = dialogRef.current?.querySelector("[data-step-two], [data-step-done]");
    const key = el ? `${stepTwoFor}:${el.hasAttribute("data-step-done") ? "done" : "two"}` : null;
    if (el && stepScrolledRef.current !== key) {
      stepScrolledRef.current = key;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  useEffect(() => {
    if (!checkoutIntent || !ready) return;
    setCheckoutIntent(false);
    // dismissals don't count here: checkout is the one moment we always show what's left
    // an unclaimed free gift also opens this sheet at checkout (claimed below, with the offers)
    const unclaimedGift = promotions.find((p) => p.applied && p.displayType === "free_gift"
      && gifts.some((g) => g.promotionId === p.id && g.status !== "claimed" && g.available));
    // `actionableForAdd` is about the item just added - at checkout nothing was, so it's not required
    // closest offer first ("1 more" before "2 more")
    const byProgress = [...promotions].sort((x, y) => (y.progress?.fraction ?? 0) - (x.progress?.fraction ?? 0));
    const offerTarget = byProgress.find((p) => ((p.qualifying && p.rewardTargetPending) || (!p.qualifying && p.progressText))
      && p.recommendedProducts?.length > 0);
    // offers first; a gift alone is enough to show the sheet (it lists every row + the gift claim)
    // an applied pick-your-reward offer (stand) also opens it: see the pick, switch it,
    // and the next step ("add another katana") before paying
    const appliedPick = promotions.find((p) => p.applied && p.displayType !== "free_gift" && p.rewardOptions?.length > 0);
    const target = offerTarget || unclaimedGift || appliedPick;
    if (!target) { navigate("/checkout"); return; }
    setCheckoutMode(true);
    setJustUnlocked(false); // replace any 'applied' view with the full offer list
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

  // The single best not-yet-qualifying-but-close offer - server already
  // sorts by displayRank, so the first match with a concrete next step
  // (progressText) AND real products to add (recommendedProducts) wins.
  // Anything without BOTH is either not actionable here or has no safe
  // product recommendation (see findFirstUnmetProductLeaf server-side) -
  // never guessed client-side. Dismissed promotions are excluded HERE (not
  // just in the open-guard below) - otherwise, once the top-ranked offer
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

  // Effect #2 - reacts to the promotions data (and every other gate)
  // independently, so it re-evaluates whenever `bestActionable` itself
  // changes (e.g. the fetch finally resolves) - not just when totalQuantity
  // changes. This is what actually opens the sheet.
  useEffect(() => {
    if (!pendingAdd) return;
    if (isFetching) return; // decide on the answer for the cart WITH the new item, never the previous one
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
    // This add earned a reward the shopper still has to pick (wooden katana -> choose a stand at
    // 50% OFF): show those options right away, like the cart drawer does, not just "applied".
    const canPick = (p) => p.qualifying && p.rewardTargetPending && p.recommendedProducts?.some((c) => c.offerPrice != null);
    // also an offer this add did NOT touch whose reward was just taken by a better one
    // (Wooden + stand, then LED: the stand goes free to LED, Wooden needs a new pick).
    // Not filtered by "dismissed": that offer was celebrated (and so marked) when its stand was first claimed.
    const pickNow = promotions.find((p) => p.actionableForAdd && canPick(p) && !dismissedIds.has(p.id))
      || promotions.find((p) => !p.actionableForAdd && !p.applied && canPick(p));
    const target = pickNow || unlockedNow;
    if (!target) return;
    // show it with the full list (applied offers + picks + checkout), not a lone row
    if (pickNow && !pickNow.actionableForAdd) { setCheckoutMode(true); setJustUnlocked(false); }

    clearTimeout(pendingAddTimerRef.current);
    // Open immediately - no artificial delay between "add" and the sheet showing up.
    setActivePromoId(target.id);
    lastAutoOpenRef.current = Date.now();
  }, [bestActionable, promotions, showCartModal, activePromoId, pendingAdd, isFetching]);

  // The live, re-evaluated version of whichever promotion the sheet is
  // currently anchored to - so progress/recommendations update in place as
  // the customer adds items, instead of the sheet staying frozen on stale data.
  const livePromo = promotions.find((p) => p.id === activePromoId) || null;
  if (livePromo) lastPromoRef.current = livePromo;

  useEffect(() => {
    if (!visible || !activePromoId || isFetching) return;
    const empty = !livePromo || (!livePromo.applied && !livePromo.recommendedProducts?.length);
    if (!empty) return;
    // at checkout, move to the next offer that still has something to add (e.g. the stand
    // after a katana was added) instead of closing the list under the shopper
    if (checkoutMode) {
      const next = promotions.find((p) => p.id !== activePromoId && p.displayType !== "free_gift" && stillActionable(p));
      if (next) { setActivePromoId(next.id); return; }
      return; // nothing left: stay open, the shopper continues with the checkout button
    }
    close(false);
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
    // at checkout we show the offer list (rewards + gift), never the 'applied' celebration
    if (checkoutMode || wasApplied || !livePromo.applied || livePromo.rewardTargetPending || celebratedIdsRef.current.has(livePromo.id)) return undefined;
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
    // never auto-close while the shopper is going through offers at checkout
    const timer = livePromo.displayType === "free_gift" || checkoutMode ? null : setTimeout(() => close(false), 5000);
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
    setStepTwoFor(null); // the 2-step journey starts fresh next time
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

  // "-" on a card: one unit of that exact option out of the cart
  const handleSub = async (product) => {
    if (addingRef.current) return;
    const line = cartItems.find((i) => String(i.productId || i.mongoId || i.id) === String(product.productId)
      && (!product.variantName || i.selectedVariant === product.variantName));
    if (!line) return;
    addingRef.current = true;
    setAddError("");
    setAddingProductId(`${product.productId}:${product.sku || ""}`);
    const qty = Number(line.quantity) || 0;
    const variant = line.selectedVariant || "N/A";
    try {
      if (isAuthenticated || !!localStorage.getItem("authToken")) {
        await updateCartAPI({ productId: product.productId, quantity: 1, action: qty > 1 ? "sub" : "remove", variant, image: line.image }).unwrap();
      } else if (qty > 1) {
        dispatch(updateQuantity({ id: line.id || product.productId, quantity: qty - 1, selectedVariant: variant }));
      } else {
        dispatch(removeItem({ id: line.id || product.productId, selectedVariant: variant }));
      }
    } catch (err) {
      setAddError(err?.data?.message || "Could not update the cart. Please try again.");
    } finally {
      addingRef.current = false;
      setAddingProductId(null);
    }
  };

  const handleAdd = async (product, stepFor = null) => {
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
      if (stepFor) { stepScrolledRef.current = null; setStepTwoFor(stepFor); }
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
  // free gifts are claimed right in the cart and at checkout (GiftClaimList), no popup
  if (promo?.displayType === 'free_gift' && !checkoutMode) return null;
  const reward = promo?.rewardProduct;
  const appliedSavings = pricing?.savingsByPromotion?.[promo?.id] || 0;
  // Every other offer the same add put within reach (e.g. "2 wooden" AND
  // "wooden + LED" both want one more katana), capped at 3, anchored promo first.
  const stillActionable = (p) => (checkoutMode || p.actionableForAdd) && ((p.qualifying && p.rewardTargetPending) || (!p.qualifying && p.progressText))
    && p.recommendedProducts?.length > 0 && (checkoutMode || !dismissedIds.has(p.id));
  const rowsAll = externalIds
    ? externalIds.map((id) => promotions.find((p) => p.id === id)).filter((p) => p && (p.recommendedProducts?.length || p.applied)).slice(0, 4)
    : promo
      // server order (displayRank) stays fixed while the shopper adds/removes items: no jumping cards
      // tiers by their fixed target (Buy 1 → Buy 2 → Buy 3); stable while the cart changes
      ? [promo, ...promotions.filter((p) => p.id !== promo.id && stillActionable(p)).sort((x, y) => (x.progress?.target ?? 0) - (y.progress?.target ?? 0))].slice(0, 3)
      : [];
  // the free gift has its own claim card; never list it again as an offer row
  // never show a row with nothing to add (an offer that is already complete)
  const rows = rowsAll.filter((p) => p.displayType !== "free_gift" && p.recommendedProducts?.length > 0);

  return (
    // Phones: bottom sheet. Desktop (md+): centred dialog - a sheet pinned to
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
          className={`mx-auto h-1 w-11 shrink-0 md:invisible ${festive && justUnlocked ? "mt-4 bg-ink/15" : festive ? "mt-4 bg-paper/30 sm:mt-4" : "mt-3 bg-ink/15 sm:mt-2.5"}`}
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
          className={`absolute right-4 z-40 grid h-9 w-9 place-items-center border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${festive && !justUnlocked ? "top-5 border-paper/35 text-paper hover:bg-white/10" : festive ? "top-5 border-hair text-ink hover:bg-surface" : "top-4 border-hair text-ink hover:bg-surface"}`}
        >
          <i className="fa-solid fa-xmark text-sm" aria-hidden="true" />
        </button>

        {justUnlocked ? (
          // Same paper/ink/brand look as the cart's applied-offer receipt - a
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
                ? `${(promo.rewardLabel || "").replace(/\s*[\u2014-]\s*free\s*$/i, "") || "Your free gift"} - claim it to add it to your order.`
                : `${promo?.title || promo?.rewardLabel} - applied to your cart.`}
            </p>
            {promo?.displayType === "free_gift" && (() => {
              // free gifts are never added automatically: the shopper claims them
              const entitlement = gifts?.find((g) => g.promotionId === promo.id);
              if (!entitlement) return null;
              return entitlement.status === "claimed" ? (
                <p className="mt-3 text-sm font-bold text-save">✓ Claimed - it is in your cart</p>
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
              <button type="button" onClick={() => { close(false); setTimeout(() => setCheckoutIntent(true), 300); }} className="h-11 bg-brand text-sm font-bold text-paper transition-colors hover:bg-brandHi">
                Checkout →
              </button>
            </div>
          </div>
        ) : (
          <div className="un-scroll min-h-0 overflow-y-auto bg-paper px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4 sm:px-7">
            <div
              className={`sticky -top-4 z-30 -mx-5 -mt-4 mb-3 px-5 pb-4 pt-1 sm:-mx-7 sm:px-7 ${festive ? "" : "bg-paper border-b border-hair"}`}
              style={festive ? { background: "radial-gradient(70% 120% at 50% -10%, rgb(var(--gl-brand) / 0.28), transparent 70%), rgb(var(--gl-ink))" } : undefined}
            >

            <h3 id="promotion-sheet-title" className={`line-clamp-2 pr-10 text-xl font-black leading-tight tracking-tight sm:text-2xl ${festive ? "text-paper" : "text-ink"}`} title={checkoutMode || rows.length > 1 ? "Your offers" : promo?.title}>{checkoutMode || rows.length > 1 ? "Your offers" : promo?.title}</h3>
            {festive && (
              <>
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

            {/* One row per offer the customer is one step from - each scrolls
                sideways through its own eligible products. */}
            {/* at checkout: free gift first (people missed it at the bottom), then the offers */}
            {checkoutMode && (
              <div className="mt-4 empty:hidden">
                <GiftClaimList />
              </div>
            )}
            {checkoutMode && promotions.some((p) => p.applied && p.displayType !== "free_gift" && p.displayType !== "free_shipping") && (
              <div className="mt-4 rounded-xl border border-ink/15 bg-white px-3 py-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Applied now</p>
                {promotions.filter((p) => p.applied && p.displayType !== "free_gift" && p.displayType !== "free_shipping").map((p) => (
                  <div key={p.id} className="mt-1 flex items-start gap-2 text-[13px] font-bold text-ink">
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand text-[9px] text-white" aria-hidden="true">✓</span>
                    <div className="min-w-0 flex-1">{p.title}
                      {/* the stand picked for this offer, switchable (Single -> Double) */}
                      <div className="font-normal"><OfferRewardPicks promo={p} rewards={groupCartByOffer(cartItems, promotions, pricing).groups.filter((g) => g.promo.id === p.id).flatMap((g) => g.rewards)} pricing={pricing} /></div>
                    </div>
                  </div>
                ))}
                {/* offers in the same group that this cart also qualifies for, but that the
                    applied one replaced (you get one per group) - shown so a switch is visible */}
                {promotions.filter((x) => !x.applied && x.qualifying && x.group && promotions.some((p) => p.applied && p.group === x.group && p.id !== x.id)).map((x) => (
                  <p key={x.id} className="mt-1 flex items-start gap-2 text-[12.5px] text-muted">
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border border-hair text-[9px]" aria-hidden="true">↑</span>
                    <span><span className="font-semibold text-ink/70">{x.title}</span><br /><span className="text-[11.5px]">Also unlocked. You get one stand offer per order, the best one is applied. Reduce the quantity in your cart to switch back.</span></span>
                  </p>
                ))}
              </div>
            )}
            {checkoutMode && rows.length > 0 && <p className="mt-5 font-archivo text-[15px] font-extrabold text-ink">More offers</p>}
            {rows.map((row, rowIndex) => {
              // reward picks: only discounted options (a tier-gated Triple comes without a price)
              const items = (row.recommendedProducts || []).filter((c) => !(row.qualifying && row.rewardTargetPending) || c.offerPrice != null);
              return (
                <div key={row.id} data-offer-row data-step-two={stepTwoFor === row.id && row.rewardTargetPending ? "" : undefined} className={`overflow-hidden rounded-xl border bg-white p-3 shadow-sm ${stepTwoFor === row.id && row.rewardTargetPending ? "border-brand" : "border-hair"} ${rowIndex === 0 ? "mt-3" : "mt-4"}`}>
                  {stepTwoFor === row.id && row.rewardTargetPending && (
                    <p className="mb-2 flex items-center gap-2 text-[12px] font-bold text-ink">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink text-[11px] text-paper" aria-hidden="true">✓</span>
                      Step 1 done. Step 2: pick your stand below
                    </p>
                  )}
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-[10px] font-extrabold uppercase tracking-[0.13em] text-brand">
                        {row.title || "Complete your offer"}
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-ink">
                        {row.rewardTargetPending ? (row.applied && row.rewardsLeft ? "Pick one more reward" : "Choose your reward item") : (rows.length > 1 ? row.progressText : "Add an eligible item")}
                      </p>
                      {row.rewardTargetPending && !row.applied && promotions.some((p) => p.applied && p.id !== row.id && p.rewardOptions?.length) && (
                        // its stand went to the better deal (e.g. FREE with the LED offer); this offer still gives one
                        <p className="mt-0.5 text-[11.5px] text-muted">Your stand now counts for "{promotions.find((p) => p.applied && p.id !== row.id && p.rewardOptions?.length)?.title}" (the better deal). This offer still gives you one - pick it below.</p>
                      )}
                      {(() => {
                        // an offer in the same group replaces the one already applied (never both)
                        const current = row.group && !row.applied ? promotions.find((p) => p.applied && p.id !== row.id && p.group === row.group) : null;
                        return current ? (
                          <p className="mt-0.5 text-[11.5px] font-medium text-muted">
                            Upgrades your current offer (you keep one).
                          </p>
                        ) : null;
                      })()}
                    </div>
                    {items.length > 3 && (
                      // our own scroll control instead of the browser's scrollbar
                      <span className="flex shrink-0 items-center gap-1.5">
                        {[-1, 1].map((d) => (
                          <button key={d} type="button" aria-label={d < 0 ? 'Scroll left' : 'Scroll right'}
                            onClick={(e) => { const row = e.currentTarget.closest('[data-offer-row]')?.querySelector('[aria-label="Eligible products"]'); row?.scrollBy({ left: d * row.clientWidth * 0.7, behavior: 'smooth' }); }}
                            className="grid h-7 w-7 place-items-center rounded-full border border-hair bg-white text-ink shadow-sm hover:border-ink">
                            <i className={`fa-solid fa-chevron-${d < 0 ? 'left' : 'right'} text-[10px]`} aria-hidden="true" />
                          </button>
                        ))}
                      </span>
                    )}
                  </div>
                  {/* up to 3 options sit side by side (Single / Double / Triple stand all visible, none hidden off-screen) */}
                  <div className={`pb-1 ${items.length === 1 ? "flex" : items.length <= 3 ? `grid gap-2 ${items.length === 2 ? "grid-cols-2" : "grid-cols-3"}` : "flex gap-3 snap-x snap-mandatory overflow-x-auto overscroll-x-contain px-1 scrollbar-hide"}`} aria-label="Eligible products">
                    {items.map((product) => (
                      <div key={`${row.id}-${product.productId}-${product.sku || ""}`} className={items.length > 3 ? "shrink-0 snap-start" : "w-full min-w-0"}>
                        <RecommendationCard
                          inCart={inCartQty(product)}
                          onSub={handleSub}
                          product={product}
                          onAdd={handleAdd}
                          isAdding={addingProductId === `${product.productId}:${product.sku || ""}`}
                          isBusy={Boolean(addingProductId)}
                          isSingle={items.length === 1}
                          fill={items.length > 1 && items.length <= 3}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {/* "Add 1 more → 1 more FREE" for repeating offers (one reward per trigger item):
                the server sends the offer once, so the next step is built from its trigger
                products (triggerProductIds) and the cached catalogue */}
            {checkoutMode && promotions.filter((p) => p.applied && p.displayType !== "free_gift").map((row) => {
              const ids = row.triggerProductIds || [];
              // a reward still waiting to be picked comes first; step 1 of the next one only after that
              if (!ids.length || !(row.qualifying || row.applied) || row.rewardTargetPending) return null;
              // only stand-type offers that can still repeat (never free shipping, never past the cap)
              if (!canGetOneMore(row, cartItems) && stepTwoFor !== row.id) return null;
              // both steps just done: confirm it and offer the way forward, never loop back to step 1
              if (stepTwoFor === row.id) {
                return (
                  <div key={`done-${row.id}`} data-offer-row data-step-done className="mt-4 rounded-xl border border-brand bg-white p-3 shadow-sm">
                    <p className="flex items-center gap-2 text-sm font-bold text-ink">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-[11px] text-white" aria-hidden="true">✓</span>
                      Both steps done - your stand offer is applied
                    </p>
                    <p className="mt-1 text-[12px] text-muted">{row.title}</p>
                    
                  </div>
                );
              }
              // the admin already has a next tier for this group ("Buy 2 …") - that card is shown instead
              // tiered offers ("Buy 1/2/3") give ONE reward; "add 1 more" would be false once the top
              // tier is reached. Only a lone repeating offer (no tiers in its group) gets this card.
              if (row.group && promotions.some((p) => p.id !== row.id && p.group === row.group)) return null;
              const cards = (catalog?.data?.listofPublishedProducts || []).filter((x) => ids.includes(x.productId))
                .flatMap((x) => (x.variantDetails || []).filter((v) => v.isActive !== false && !(v.variantOutOfStock || (v.variantQuantity != null && v.variantQuantity <= 0)))
                  .map((v) => ({ productId: x.productId, productName: x.productName, variantName: v.variantName, sku: v.sku, price: Number(v.variantPrice || 0), mrp: Number(v.variantMrp || 0), image: v.variantImage?.[0] })))
                .slice(0, 12);
              if (!cards.length) return null;
              return (
                <div key={`more-${row.id}`} data-offer-row className="mt-4 overflow-hidden rounded-xl border border-hair bg-white p-3 shadow-sm">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-brand">{row.title}</p>
                  <p className="mt-0.5 text-sm font-bold text-ink">Get one more {(row.rewardLabel || "reward").split(",")[0].replace(/\s+per\s+\w+$/i, "").trim()} in 2 steps</p>
                  {/* step 1 is live here; step 2 (the reward pick) opens as soon as the item is in the cart */}
                  <ol className="mt-2 space-y-1.5 text-[12px]">
                    <li className="flex items-center gap-2 font-bold text-ink">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-[11px] text-paper">1</span>
                      Add another {nounOf(cards[0].productName)} below
                    </li>
                    <li className="flex items-center gap-2 text-muted">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-hair text-[11px]">2</span>
                      Then pick your {(row.rewardLabel || "reward").split(",")[0].replace(/\s+per\s+\w+$/i, "").trim()} - it opens right after
                    </li>
                  </ol>
                  <div className="mt-3 flex gap-3 snap-x snap-mandatory overflow-x-auto overscroll-x-contain px-1 pb-1 scrollbar-hide" aria-label="Eligible products">
                    {cards.map((product) => (
                      <div key={`${row.id}-${product.sku}`} className="shrink-0 snap-start">
                        <RecommendationCard product={product} inCart={inCartQty(product)} onSub={handleSub} onAdd={(prod) => handleAdd(prod, row.id)} isAdding={addingProductId === `${product.productId}:${product.sku || ""}`} isBusy={Boolean(addingProductId)} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {addError && <p className="mt-3 border border-brand/20 bg-brand/5 px-3 py-2 text-xs font-semibold text-brand" role="alert">{addError}</p>}
            <p className={`mt-4 text-center text-[11px] leading-relaxed text-muted`}>Offer applies after eligible items are in your cart. Final total is confirmed at checkout.</p>
          </div>
        )}
        {/* checkout lives OUTSIDE the scrolling list (footer of the sheet), so it never covers products */}
        {checkoutMode && !justUnlocked && (
          <div className="shrink-0 border-t border-hair bg-paper px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-7">
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <button type="button" onClick={() => { close(false); navigate("/offers"); }} className="h-12 rounded-xl border border-ink/20 bg-white px-4 text-sm font-bold text-ink transition-colors hover:border-ink">
                Explore offers
              </button>
              <button type="button" onClick={() => { close(false); navigate("/checkout"); }} className="h-12 w-full rounded-xl bg-brand text-sm font-bold text-paper transition-colors hover:bg-brandHi">
                Continue to checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromotionUnlockSheet;
