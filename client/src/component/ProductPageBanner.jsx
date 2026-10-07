import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  useGetAllFreeShippingBannersQuery,
  useAddToCartMutation,
  useUpdateCartMutation,
  useEvaluateCartRulesQuery,
} from "../store/api/userApi";
import { useGetProductByIdQuery } from "../store/api/productsApi";
import { addItem, removeItem, updateQuantity, updateSelection } from "../store/slices/cartSlice";
import { useCartData } from "../hooks/useCartSync";
import { trackAddToCart, trackViewPromotion, trackSelectPromotion } from "../utils/analytics";

// Same variant-name -> colour lookup as FreeShippingBanner.jsx.
const VARIANT_COLOR_MAP = {
  rainbow: "linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)",
  "sky blue": "#87CEEB", white: "#FFFFFF", black: "#000000", red: "#FF0000",
  blue: "#0000FF", yellow: "#FFFF00", orange: "#FFA500", grey: "#808080", purple: "#800080",
};
const variantColor = (name = "") => {
  const key = name.toLowerCase();
  return VARIANT_COLOR_MAP[key] || key.replace(/\s+/g, "");
};

/**
 * Clone of FreeShippingBanner.jsx — same functions, same CSS/classes, same
 * carousel/variant-dropdown/OOS/discount-badge logic — with ONLY the
 * shipping-specific pieces removed:
 *   - the truck SVG / progress-bar animation (animateTruckTo, the whole
 *     IntersectionObserver-driven fill/smoke/truck block) — that machinery
 *     is literally about a "shipping unlock" narrative and doesn't apply to
 *     a generic "buy X, get Y" offer.
 *   - hardcoded "free shipping unlocked" / "unlock free shipping" copy —
 *     replaced by the admin's own banner.text, shown as-is, so this works
 *     for a "get it FREE" offer or any other wording an admin types.
 *   - the generic-cart-rule "closest OTHER way to unlock shipping" nudge
 *     (genericIsCloser/closestRuleProduct) — also shipping-threshold
 *     specific, doesn't apply here.
 * Everything else — carousel paging, variant dropdown, OOS handling (for
 * BOTH the recommended item AND the source product), quantity stepper,
 * real cart-rule discount badge, add/remove/increment/decrement, analytics
 * events — is the same code, same classes, just renamed.
 * FreeShippingBanner.jsx itself is completely untouched.
 */
// Pulls "Free Shipping" out of the admin-written offer line into a green
// pill so the strongest part of the offer is the first thing read.
const withFreeShippingHighlight = (text) => {
  if (!text) return text;
  const parts = String(text).split(/(free\s+shipping)/i);
  return parts.map((part, i) =>
    /^free\s+shipping$/i.test(part) ? (
      <span key={i} className="inline-flex items-center gap-1 rounded-full bg-save/10 text-save font-bold px-2 py-0.5 mx-0.5 whitespace-nowrap">
        <i className="fa-solid fa-truck-fast text-[0.85em]" />
        {part}
      </span>
    ) : (
      // drop the "—" joining the copy to the pill; the pill is the separator
      /^free\s+shipping$/i.test(parts[i + 1] || "") ? part.replace(/\s*[—–:|-]\s*$/, " ") : part
    ),
  );
};

const ProductPageBanner = ({
  productId,
  showQuantityStepper = false,
  className = "mt-4",
  bannersOverride,
  surface = "unknown",
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const cartItems = useSelector((state) => state.cart.items);
  const { refetch: refetchCart } = useCartData();
  const [addToCartAPI, { isLoading: isAdding }] = useAddToCartMutation();
  const [updateCart, { isLoading: isUpdatingQty }] = useUpdateCartMutation();

  const itemQty = (q) => (typeof q === "object" && q !== null ? q.quantity || 0 : q || 0);

  const [selectedVariant, setSelectedVariant] = useState(null);
  const [variantMenuOpen, setVariantMenuOpen] = useState(false);
  const variantMenuRef = useRef(null);
  const variantMenuPortalRef = useRef(null);
  const [variantMenuPos, setVariantMenuPos] = useState(null);
  const [addLoading, setAddLoading] = useState(false);

  // Every active banner for this product — now entirely Promotion-derived
  // (see freeShippingOffer.util.js's getCartRuleDerivedBanners), both
  // free_shipping-effect combos AND percent_off/flat_off "free gift"-style
  // ones. There is no longer a separate hand-typed admin-banner source to
  // disambiguate from (that `offers`-backed path was removed), so the old
  // `b._id && !b.ruleId` filter — which used to exclude auto-derived
  // banners so they wouldn't double up with FreeShippingBanner's own
  // narrative — now excludes EVERYTHING, since every banner is `ruleId`-
  // tagged. Removed; every Promotion-derived banner for this product shows.
  const { data: allBannersRes } = useGetAllFreeShippingBannersQuery();
  const banners = useMemo(() => {
    const list = bannersOverride
      ? bannersOverride
      : !productId
        ? []
        : (allBannersRes?.data || []).filter((b) => String(b.sourceProductId) === String(productId));
    // Multiple rewards targeting the SAME recommended product at different
    // variants (e.g. Single FREE / Double 50% off / Triple 50% off) each
    // produce their own banner — rendered as separate carousel slides, each
    // LOCKED to its own variant (the dropdown below is disabled whenever
    // banner.recommendedVariantName is set), so a customer landing on the
    // "Single" slide could never switch to see Double/Triple pricing, and
    // which slide showed first was arbitrary. Deduped to ONE slide per
    // recommended product, with the variant lock cleared — the discount
    // price shown already resolves per-variant live from `ruleEval`
    // (see ruleDiscountedPrice below) regardless of which specific banner
    // object this came from, so clearing the lock is enough to make the
    // dropdown pick any variant and see its correct price/offer.
    // FIXED: merging used to keep only the FIRST reward's text/subtitle/
    // image/ctaLabel as a fixed property of the merged banner — so
    // switching the dropdown from Single to Double changed the PRICE
    // (already variant-aware via ruleEval) but not the copy, which stayed
    // stuck on whichever reward was first ("FREE Single-Layer Stand..."
    // showing even once Double/Triple was selected). Now keeps a
    // `variantOffers` map keyed by variantSku, so the copy can be looked
    // up for whichever variant is actually selected — see
    // activeVariantOffer below, computed once `activeVariant` is known.
    const seen = new Map();
    for (const b of list) {
      const key = String(b.recommendedProductId);
      if (!seen.has(key)) {
        seen.set(key, { ...b, recommendedVariantSku: undefined, recommendedVariantName: undefined, variantOffers: {} });
      }
      // Keyed by NAME, not sku — resolveBannerVariantNames (server,
      // freeShippingOffer.util.js) strips recommendedVariantSku and
      // replaces it with recommendedVariantName before this ever reaches
      // the client, so keying by sku here always collapsed to "__default__"
      // for every variant-scoped reward — all 3 (Single/Double/Triple)
      // silently overwrote the same slot, last-one-in-the-list wins. That
      // was the actual bug: price was already variant-correct (separate
      // code path, keyed by variant NAME via `selectedVariant`), only the
      // text lookup used the wrong, now-nonexistent key.
      const merged = seen.get(key);
      merged.variantOffers[b.recommendedVariantName || "__default__"] = {
        text: b.text, subtitle: b.subtitle, ctaLabel: b.ctaLabel, image: b.image,
      };
    }
    return [...seen.values()];
  }, [bannersOverride, allBannersRes, productId]);
  const bannersKey = useMemo(
    () => banners.map((b) => `${b.sourceProductId}:${b.recommendedProductId}`).join(","),
    [banners],
  );
  const [bannerIndex, setBannerIndex] = useState(0);
  useEffect(() => { setBannerIndex(0); }, [bannersKey]);
  const safeBannerIndex = banners.length > 0 ? Math.min(bannerIndex, banners.length - 1) : 0;
  const banner = banners[safeBannerIndex] || null;
  const showBannerArrows = banners.length > 1;
  const goToNextBanner = () => setBannerIndex((i) => (i + 1) % banners.length);

  const { data: recommendedRes, isFetching: isFetchingRecommended } = useGetProductByIdQuery(
    banner?.recommendedProductId,
    { skip: !banner?.recommendedProductId },
  );
  const recommendedProduct = recommendedRes?.data;
  const variants = recommendedProduct?.variantDetails || [];

  // Skip forward past a slide whose product has since been deleted/archived
  // — same logic as FreeShippingBanner.jsx.
  const triedSkipRef = useRef(new Set());
  useEffect(() => { triedSkipRef.current = new Set(); }, [bannersKey]);
  useEffect(() => {
    if (!banner?.recommendedProductId) return;
    if (isFetchingRecommended || recommendedProduct) return;
    if (banners.length <= 1) return;
    if (triedSkipRef.current.has(safeBannerIndex)) return;
    triedSkipRef.current.add(safeBannerIndex);
    if (triedSkipRef.current.size >= banners.length) return;
    setBannerIndex((safeBannerIndex + 1) % banners.length);
  }, [banner?.recommendedProductId, isFetchingRecommended, recommendedProduct, banners.length, safeBannerIndex]);

  // Source product — needed for the "add source to unlock" copy AND (per
  // explicit requirement) to gate the whole offer when the source itself is
  // out of stock: no point letting someone add a "free with purchase" item
  // for a product they can't actually buy right now.
  const { data: sourceRes } = useGetProductByIdQuery(banner?.sourceProductId, { skip: !banner?.sourceProductId });
  const sourceProduct = sourceRes?.data;
  const isVariantOOS = (v) =>
    !!v && (v.variantOutOfStock === true || (v.variantQuantity != null && Number(v.variantQuantity) <= 0));
  const sourceActiveVariants = (sourceProduct?.variantDetails || []).filter((v) => v.isActive !== false);
  const sourceOOS = sourceProduct
    ? sourceProduct.productStatus === "out_of_stock" ||
      (sourceActiveVariants.length > 0 && sourceActiveVariants.every(isVariantOOS))
    : false;

  const bannerRuleId = banner?.ruleId;
  const bannerDocId = banner?._id;
  // Used only as the analytics fallback name below (offerMeta) — the actual
  // CUSTOMER-FACING text is activeVariantOffer.text, resolved further down
  // once activeVariant is known, so it updates when the dropdown changes.
  const bannerText = banner?.text;
  const bannerSourceId = banner?.sourceProductId;
  const bannerRecommendedId = banner?.recommendedProductId;

  const offerMeta = useMemo(() => {
    if (!bannerRecommendedId) return null;
    return {
      offerId: String(bannerRuleId || bannerDocId || `${bannerSourceId}:${bannerRecommendedId}`),
      offerType: "product_page_banner",
      offerSource: "admin_banner",
      offerName: bannerText || "Product page offer",
    };
  }, [bannerRuleId, bannerDocId, bannerText, bannerSourceId, bannerRecommendedId]);

  const seenOffersRef = useRef(new Set());
  useEffect(() => {
    if (!offerMeta?.offerId || !recommendedProduct) return;
    const key = `${offerMeta.offerId}:${recommendedProduct.productId}:${surface}`;
    if (seenOffersRef.current.has(key)) return;
    seenOffersRef.current.add(key);
    trackViewPromotion({
      promotionId: offerMeta.offerId, promotionName: offerMeta.offerName, creativeSlot: surface,
      itemId: recommendedProduct.productId, itemName: recommendedProduct.productName,
      price: Number(recommendedProduct.variantDetails?.[0]?.variantPrice ?? 0), ...offerMeta,
    });
  }, [offerMeta, recommendedProduct, surface]);

  // Matches against the DROPDOWN'S current selection (selectedVariant), not
  // banner.recommendedVariantName — now that one banner card covers every
  // variant (see the dedup above), the banner itself no longer pins a
  // single variant, so "is this already in the cart" must track whichever
  // variant the customer actually has the dropdown set to right now.
  const cartMatch = useMemo(() => {
    if (!recommendedProduct) return null;
    return cartItems.find((item) => {
      const idMatches = String(item.id) === String(recommendedProduct.productId) || String(item.mongoId) === String(recommendedProduct.productId);
      if (!idMatches) return false;
      if (selectedVariant) return item.selectedVariant === selectedVariant;
      return true;
    });
  }, [cartItems, recommendedProduct, selectedVariant]);
  const added = !!cartMatch;
  const addedVariant = cartMatch?.selectedVariant || null;

  const sourceInCart = useMemo(() => {
    const sourceId = banner?.sourceProductId;
    if (!sourceId) return false;
    return cartItems.some((item) => {
      const idMatches = String(item.id) === String(sourceId) || String(item.mongoId) === String(sourceId);
      if (!idMatches) return false;
      if (banner?.sourceVariantName) return item.selectedVariant === banner.sourceVariantName;
      return true;
    });
  }, [cartItems, banner?.sourceProductId, banner?.sourceVariantName]);

  const comboUnlocked = added && sourceInCart;

  // Real cart_rule discount on the recommended product (if any) — same
  // engine FreeShippingBanner uses, just without the "closest OTHER rule"
  // nudge-finding (that part is shipping-threshold specific).
  const cartItemsKey = useMemo(
    () => cartItems.map((item) => `${item.id || item.mongoId}:${itemQty(item.quantity)}`).sort().join(","),
    [cartItems],
  );
  const [debouncedCartItems, setDebouncedCartItems] = useState(cartItems);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCartItems(cartItems), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed off the serialized key
  }, [cartItemsKey]);
  // Evaluated against a HYPOTHETICAL cart — current cart PLUS this banner's
  // source product and the currently-selected recommended variant — not
  // just the actual current cart. Without this, the price shown here stayed
  // at full price until AFTER the customer actually clicked "Add to Cart"
  // (since the underlying cart_rule only matches once both products are
  // really in the cart), which looked like the offer wasn't real. Since the
  // button now adds both in one click anyway, showing the resulting price
  // up front is the honest preview of what that click will actually do.
  const ruleEvalItems = useMemo(() => {
    const fromCart = debouncedCartItems
      .map((item) => ({ productId: item.id || item.mongoId, quantity: itemQty(item.quantity), selectedVariant: item.selectedVariant }))
      .filter((i) => i.productId && i.quantity > 0);
    if (!banner) return fromCart;
    const hypothetical = [
      ...(sourceInCart || !banner.sourceProductId
        ? []
        : [{ productId: banner.sourceProductId, quantity: 1, selectedVariant: banner.sourceVariantName || sourceProduct?.variantDetails?.[0]?.variantName }]),
      ...(added || !banner.recommendedProductId
        ? []
        : [{ productId: banner.recommendedProductId, quantity: 1, selectedVariant: selectedVariant || banner.recommendedVariantName }]),
    ];
    return [...fromCart, ...hypothetical];
  }, [debouncedCartItems, banner, sourceInCart, added, selectedVariant, sourceProduct]);
  const { data: ruleEvalRes } = useEvaluateCartRulesQuery(ruleEvalItems, { skip: ruleEvalItems.length === 0 });
  const ruleEval = ruleEvalItems.length > 0 ? ruleEvalRes?.data : undefined;

  useEffect(() => {
    if (variants.length > 0) {
      const required = banner?.recommendedVariantName ? variants.find((v) => v.variantName === banner.recommendedVariantName) : null;
      const purple = variants.find((v) => v.variantName?.toLowerCase().includes("purple"));
      setSelectedVariant((required || purple || variants[0]).variantName);
    } else {
      setSelectedVariant(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately re-seeds on every product change
  }, [recommendedProduct?.productId, banner?.recommendedVariantName]);

  useEffect(() => {
    if (addedVariant) {
      setSelectedVariant(addedVariant);
      setVariantMenuOpen(false);
    }
  }, [addedVariant]);

  // Timestamp of the most recent open — every closer below (outside-click,
  // scroll, resize) ignores anything firing within OPEN_GUARD_MS of that
  // moment. A plain "attach the listener a tick later" (requestAnimationFrame)
  // turned out not to be enough on touch devices: the tap that opens the
  // menu can still deliver its mousedown/touchstart/scroll to a listener
  // attached on the very next frame, because touch event sequences (and the
  // layout shift from the portal mounting) don't reliably land before that
  // frame. A short time window is a harder guarantee than "next frame" and
  // fixes the "first tap opens-then-immediately-closes, needs a second tap"
  // bug regardless of which exact event was the culprit.
  const openedAtRef = useRef(0);
  useEffect(() => {
    if (variantMenuOpen) openedAtRef.current = Date.now();
  }, [variantMenuOpen]);
  const OPEN_GUARD_MS = 300;

  useEffect(() => {
    if (!variantMenuOpen) return;
    const handleClickOutside = (e) => {
      if (Date.now() - openedAtRef.current < OPEN_GUARD_MS) return;
      const insideTrigger = variantMenuRef.current?.contains(e.target);
      const insidePortal = variantMenuPortalRef.current?.contains(e.target);
      if (!insideTrigger && !insidePortal) setVariantMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [variantMenuOpen]);

  // Keep the portal menu anchored to its trigger. It used to CLOSE on any
  // scroll/resize event anywhere on the page (capture phase), which also
  // caught unrelated scrolls (gallery carousels, mobile URL-bar resize) and
  // made the menu vanish right after opening. Re-positioning instead is
  // harmless; outside-click/touch above still handles dismissal.
  useEffect(() => {
    if (!variantMenuOpen) return;
    const place = () => {
      const rect = variantMenuRef.current?.getBoundingClientRect();
      if (rect) setVariantMenuPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [variantMenuOpen]);

  // NOTE: the early "nothing to show yet" return is deliberately AFTER all
  // hooks below (including the auto-add effect) — React's rules of hooks
  // forbid a conditional return between hook calls, so every value here
  // that reads recommendedProduct uses `?.` to stay safe while it's still
  // null/loading, and the actual bail-out happens right before the JSX
  // return further down.
  const activeVariant = variants.find((v) => v.variantName === selectedVariant) || variants[0];
  // The copy (text/subtitle/ctaLabel/image) for whichever variant is
  // CURRENTLY selected — falls back to the variant-agnostic "__default__"
  // entry (set for banners with no variant-scoped reward, e.g. a plain
  // free_shipping combo), then to the banner's own first-seen values as a
  // last resort. See the `variantOffers` map built in the banners useMemo
  // above — this is what makes the text actually change when Single ->
  // Double is picked, instead of staying stuck on whichever reward merged
  // first.
  const activeVariantOffer =
    banner?.variantOffers?.[activeVariant?.variantName] ||
    banner?.variantOffers?.["__default__"] ||
    { text: banner?.text, subtitle: banner?.subtitle, ctaLabel: banner?.ctaLabel, image: banner?.image };
  const goToProduct = () => {
    const sku = activeVariant?.sku;
    navigate(sku ? `/product/${recommendedProduct?.productId}/${sku}` : `/product/${recommendedProduct?.productId}`);
  };
  // An admin-set custom banner image (set on the reward in the Promotions
  // editor) takes priority over the recommended product's own photo — lets
  // a banner show a lifestyle/combo graphic instead of a plain product shot.
  const displayImage = activeVariantOffer.image || activeVariant?.variantImage?.[0] || recommendedProduct?.productImg || "https://urbannook.in/assets/logo.webp";
  const displayPrice = activeVariant?.variantPrice ?? 0;
  const isActiveVariantOOS = isVariantOOS(activeVariant);
  const addDisabled = isActiveVariantOOS || sourceOOS;

  const maxVariantPrice = Math.max(...variants.map((v) => v.variantPrice || 0), 0);
  const discountPercent = maxVariantPrice > displayPrice ? Math.round(((maxVariantPrice - displayPrice) / maxVariantPrice) * 100) : 0;

  const ruleDiscountCandidates = (ruleEval?.discounts?.[recommendedProduct?.productId] || []).filter(
    (c) => !c.variantName || c.variantName === activeVariant?.variantName,
  );
  const ruleDiscountedPrice = ruleDiscountCandidates?.length
    ? Math.round(Math.max(Math.min(...ruleDiscountCandidates.map((c) => (c.type === "percent_off" ? displayPrice * (1 - c.value / 100) : displayPrice - c.value))), 0))
    : null;
  // A sibling variant of this same product may already hold the ONE shared
  // discount a rule like "Exciting Offers" grants (free single stand / 50%
  // off double / 50% off triple — one unit total, not one per variant; see
  // cartRule.util.js's createRuleBudgetTracker). lineDiscounts is computed
  // server-side over the real cart in order, so it reflects exactly what
  // checkout would actually charge — if this variant's own line comes back
  // ineligible, the discount shown here would never survive to payment.
  const lineDiscountEntry = (ruleEval?.lineDiscounts || []).find(
    (ld) => String(ld.productId) === String(recommendedProduct?.productId) && ld.selectedVariant === activeVariant?.variantName,
  );
  const offerClaimedBySibling = ruleDiscountCandidates.length > 0 && !!lineDiscountEntry && !lineDiscountEntry.eligible;
  const hasRuleDiscount = ruleDiscountedPrice !== null && ruleDiscountedPrice < displayPrice && !offerClaimedBySibling;

  const hasToken = !!localStorage.getItem("authToken");
  const isLoggedIn = isAuthenticated || hasToken;

  // Adds the SOURCE product (the one this banner is attached to, e.g. the
  // LED Katana itself) — needed because this button is meant to add the
  // WHOLE offer in one click, not just the recommended add-on. Uses
  // banner.sourceVariantName when the combo is scoped to one specific
  // variant (only that exact variant actually satisfies the underlying
  // cart_rule at checkout), otherwise the source product's first variant.
  const addSourceToCart = async () => {
    if (!sourceProduct?.productId || sourceInCart) return;
    const sourceVariant = banner?.sourceVariantName
      ? sourceProduct.variantDetails?.find((v) => v.variantName === banner.sourceVariantName) || sourceProduct.variantDetails?.[0]
      : sourceProduct.variantDetails?.[0];
    const variantName = sourceVariant?.variantName || "Standard Variant";
    const sourceImage = sourceVariant?.variantImage?.[0] || sourceProduct.productImg || displayImage;
    const sourcePrice = sourceVariant?.variantPrice ?? 0;

    if (isLoggedIn) {
      await addToCartAPI({ productId: sourceProduct.productId, quantity: 1, variant: variantName, image: sourceImage }).unwrap();
      dispatch(updateSelection({ productId: sourceProduct.productId, quantity: 1, variant: variantName }));
    } else {
      dispatch(addItem({
        id: sourceProduct.productId, mongoId: sourceProduct.productId, name: sourceProduct.productName,
        price: sourcePrice, image: sourceImage, quantity: 1, selectedVariant: variantName,
        giftWrapEligible: !!sourceProduct.giftWrapEligible,
      }));
    }

    trackAddToCart({
      itemId: sourceProduct.productId, itemName: sourceProduct.productName, itemVariant: variantName,
      price: sourcePrice, quantity: 1, placement: `${surface}_product_page_banner_source`, ...offerMeta,
    });
  };

  // Adds ONLY the recommended add-on (source assumed already in the cart).
  const addRecommendedToCart = async (effectiveVariant) => {
    if (isLoggedIn) {
      await addToCartAPI({ productId: recommendedProduct.productId, quantity: 1, variant: effectiveVariant, image: displayImage }).unwrap();
      dispatch(updateSelection({ productId: recommendedProduct.productId, quantity: 1, variant: effectiveVariant }));
    } else {
      dispatch(addItem({
        id: recommendedProduct.productId, mongoId: recommendedProduct.productId, name: recommendedProduct.productName,
        price: displayPrice, image: displayImage, quantity: 1, selectedVariant: effectiveVariant,
        giftWrapEligible: !!recommendedProduct.giftWrapEligible,
      }));
    }
    trackAddToCart({
      itemId: recommendedProduct.productId, itemName: recommendedProduct.productName, itemVariant: effectiveVariant,
      price: displayPrice, quantity: 1, placement: `${surface}_product_page_banner`, ...offerMeta,
    });
  };

  // Adds BOTH the source product and the recommended add-on in one click —
  // this banner exists to promise "buy this, get that", so a single tap
  // should actually deliver the whole offer, not just half of it (per
  // explicit requirement — differs from FreeShippingBanner's own button,
  // which deliberately only adds the recommended item since the source is
  // assumed to already be on its own PDP with its own Add to Cart button).
  const handleAddToCart = async () => {
    if (addDisabled) return;
    const effectiveVariant = activeVariant?.variantName || "Standard Variant";

    if (offerMeta?.offerId) {
      trackSelectPromotion({
        promotionId: offerMeta.offerId, promotionName: offerMeta.offerName, creativeSlot: surface,
        ctaText: banner?.ctaLabel || "Add to Cart", itemId: recommendedProduct?.productId,
        itemName: recommendedProduct?.productName, price: displayPrice, ...offerMeta,
      });
    }

    setAddLoading(true);

    if (isLoggedIn) {
      try {
        await addSourceToCart();
        await addRecommendedToCart(effectiveVariant);
        await refetchCart().unwrap();
        setAddLoading(false);
      } catch {
        setAddLoading(false);
        await refetchCart().unwrap().catch(() => {}); // reconcile — source add may have partially succeeded
        return;
      }
    } else {
      await addSourceToCart();
      await addRecommendedToCart(effectiveVariant);
      setAddLoading(false);
    }
  };

  const handleRemove = async () => {
    if (isLoggedIn) {
      try {
        await updateCart({ productId: recommendedProduct.productId, quantity: 1, action: "remove", variant: addedVariant || undefined, image: displayImage }).unwrap();
        await refetchCart();
      } catch { return; }
    } else {
      dispatch(removeItem({ id: recommendedProduct.productId, selectedVariant: addedVariant || "N/A" }));
    }
  };

  const handleIncrement = async () => {
    const newQty = itemQty(cartMatch?.quantity) + 1;
    if (isLoggedIn) {
      try {
        await updateCart({ productId: recommendedProduct.productId, quantity: 1, action: "add", variant: addedVariant || undefined, image: displayImage }).unwrap();
        await refetchCart();
      } catch { return; }
    } else {
      dispatch(updateQuantity({ id: recommendedProduct.productId, quantity: newQty, selectedVariant: addedVariant || "N/A" }));
    }
  };

  const handleDecrement = async () => {
    const currentQty = itemQty(cartMatch?.quantity) || 1;
    if (currentQty <= 1) { await handleRemove(); return; }
    if (isLoggedIn) {
      try {
        await updateCart({ productId: recommendedProduct.productId, quantity: 1, action: "sub", variant: addedVariant || undefined, image: displayImage }).unwrap();
        await refetchCart();
      } catch { return; }
    } else {
      dispatch(updateQuantity({ id: recommendedProduct.productId, quantity: currentQty - 1, selectedVariant: addedVariant || "N/A" }));
    }
  };

  // A reward whose evaluated price is exactly ₹0 (e.g. "100% off single
  // stand") used to be auto-added to the cart the moment its source product
  // (e.g. the Katana) was present — no click required. That had no check for
  // whether the customer had already picked a DIFFERENT variant of the same
  // product through another route (e.g. manually adding the 50%-off double
  // stand): both lines could land in the cart from one Katana, each getting
  // its own independent reward, since every reward on a promotion gets its
  // own full cap rather than sharing one across the group. A real order hit
  // this exact case (double stand manually added, single stand silently
  // auto-added for free on top). Requiring a manual click for every reward —
  // free or partial — closes that gap at the one place it's cheap to fix:
  // now the customer has to consciously choose which single stand variant
  // they want, same as the 50%-off ones always required.
  const isFreeViaRule = hasRuleDiscount && ruleDiscountedPrice === 0;

  if (!banner || !recommendedProduct) return null;

  return (
    <div className={`relative isolate rounded-3xl overflow-hidden border border-hair bg-white shadow-sm ${className}`}>

      {/* Quiet tinted strip — the page already has a red Buy Now, so this
          card stays secondary instead of competing with a solid red ribbon. */}
      <div className="relative z-10 bg-brand/[0.06] border-b border-brand/10 px-4 py-2 flex items-center justify-center gap-1.5">
        <i className="fa-solid fa-gift text-[10px] text-brand" />
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">Special Offer</span>
        {showBannerArrows && (
          <span className="absolute right-3 text-[10px] font-semibold text-brand/70 tabular-nums">
            {safeBannerIndex + 1} / {banners.length}
          </span>
        )}
      </div>

      <div className="px-4 pt-3 text-center">
        {comboUnlocked ? (
          <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-ink">{withFreeShippingHighlight(activeVariantOffer.text)}</span>
        ) : added && !sourceInCart ? (
          <p className="text-[10px] font-semibold text-ink/80">
            Add {sourceProduct?.productName || "this product"} to your cart to unlock{" "}
            <span className="font-bold text-brand">this offer</span>
          </p>
        ) : (
          <p className="font-semibold text-ink text-[12px] sm:text-[13px] leading-relaxed">
            {withFreeShippingHighlight(activeVariantOffer.text)}
          </p>
        )}
        {activeVariantOffer.subtitle && (
          <p className="text-[10px] text-ink/70 mt-0.5">{activeVariantOffer.subtitle}</p>
        )}
      </div>

      <div className="px-4 pt-3 flex gap-4">
        <button onClick={goToProduct} title={`View ${recommendedProduct.productName}`} className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-hair bg-white">
          {discountPercent > 0 && (
            <span className="absolute top-1.5 left-1.5 z-10 rounded bg-white/95 text-brand text-[10px] font-bold px-1.5 py-0.5 shadow-sm">−{discountPercent}%</span>
          )}
          <img src={displayImage} alt={recommendedProduct.productName} className="w-full h-full object-cover transition-all duration-500" loading="lazy" />
        </button>

        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <button onClick={goToProduct} title={`View ${recommendedProduct.productName}`} className="block w-full text-sm font-bold leading-snug line-clamp-2 text-left text-ink hover:underline">
            {recommendedProduct.productName}
          </button>

          {variants.length > 1 && (
            <div className="flex items-center gap-8 mt-1">
              <label className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">{added ? "In cart" : "Variants"}</label>
              <div ref={variantMenuRef} className="relative flex-1 min-w-0 max-w-[96px]">
                <button
                  type="button"
                  onClick={() => !added && !banner?.recommendedVariantName && setVariantMenuOpen((v) => !v)}
                  disabled={added || !!banner?.recommendedVariantName}
                  className="w-full flex items-center justify-between gap-1 rounded-lg border border-black/15 bg-white px-2.5 py-1 text-xs font-bold text-black disabled:opacity-60 disabled:cursor-default focus:outline-none focus:ring-1 focus:ring-save focus:border-save"
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="shrink-0 w-2.5 h-2.5 rounded-full border border-black/15" style={{ background: variantColor(selectedVariant || "") }} />
                    <span className="truncate">{selectedVariant}</span>
                  </span>
                  <i className={`fa-solid fa-chevron-down text-[9px] text-black/40 shrink-0 transition-transform duration-200 ${variantMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {variantMenuOpen && variantMenuPos && createPortal(
                  <>
                    <style>{`
                      .ppb-variant-scroll { scrollbar-width: thin; scrollbar-color: #157a44 #e7ded0; }
                      .ppb-variant-scroll::-webkit-scrollbar { width: 8px; }
                      .ppb-variant-scroll::-webkit-scrollbar-track { background: #e7ded0; border-radius: 999px; }
                      .ppb-variant-scroll::-webkit-scrollbar-thumb { background: #157a44; border-radius: 999px; }
                    `}</style>
                    <div ref={variantMenuPortalRef} className="ppb-variant-scroll fixed z-[10050] rounded-lg border border-save/30 bg-[#FAF7F0] shadow-lg overflow-y-scroll max-h-48" style={{ top: variantMenuPos.top, left: variantMenuPos.left, width: variantMenuPos.width }}>
                      {variants.map((v) => {
                        const isSelected = v.variantName === selectedVariant;
                        return (
                          <button
                            key={v.variantName}
                            type="button"
                            onClick={() => { setSelectedVariant(v.variantName); setVariantMenuOpen(false); }}
                            className={`w-full flex items-center gap-1.5 text-left px-2.5 py-1.5 text-xs font-bold transition-colors ${isSelected ? "bg-[#d6f2dd] text-save" : "text-ink hover:bg-[#d6f2dd] hover:text-save"}`}
                          >
                            <span className="shrink-0 w-2.5 h-2.5 rounded-full border border-black/15" style={{ background: variantColor(v.variantName) }} />
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
              const lineQty = added ? itemQty(cartMatch?.quantity) || 1 : 1;
              const lineDisplayPrice = displayPrice * lineQty;

              if (hasRuleDiscount) {
                // Cap scales with how many times the rule's trigger
                // condition is met — server-computed (cartRule.util.js's
                // ruleRepeatCount), read from the candidate, never
                // re-derived here. Matches rp.payment.controller.js exactly,
                // so this preview never disagrees with what checkout charges.
                const discountCap = Math.max(1, ...ruleDiscountCandidates.map((c) => c.cap ?? 1));
                const discountedUnits = Math.min(lineQty, discountCap);
                const fullPriceUnits = lineQty - discountedUnits;
                const lineDiscounted = Math.round(ruleDiscountedPrice) * discountedUnits + displayPrice * fullPriceUnits;
                const rulePercent = Math.round(((lineDisplayPrice - lineDiscounted) / lineDisplayPrice) * 100);
                return (
                  <>
                    <span className="text-lg font-bold tabular-nums text-ink">₹{lineDiscounted.toLocaleString()}</span>
                    <span className="text-xs text-gray-400 line-through tabular-nums">₹{lineDisplayPrice.toLocaleString()}</span>
                    <span className="text-[11px] font-semibold text-save">{rulePercent}% off</span>
                  </>
                );
              }
              if (discountPercent > 0) {
                const lineMax = maxVariantPrice * lineQty;
                return (
                  <>
                    <span className="text-lg font-bold tabular-nums text-ink">₹{lineDisplayPrice.toLocaleString()}</span>
                    <span className="text-xs text-gray-400 line-through tabular-nums">₹{lineMax.toLocaleString()}</span>
                    <span className="text-[11px] font-semibold text-save">Save ₹{(lineMax - lineDisplayPrice).toLocaleString()}</span>
                  </>
                );
              }
              return (
                <span className="text-lg font-bold tabular-nums text-ink">₹{lineDisplayPrice.toLocaleString()}</span>
              );
            })()}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 pt-3 flex items-stretch gap-2">
        <div className="flex-1 min-w-0">
        {addLoading ? (
          <button disabled className="relative w-full h-11 rounded-full overflow-hidden flex items-center justify-center gap-2.5 text-[12px] font-extrabold uppercase tracking-wide bg-paper text-ink cursor-wait">
            <style>{`@keyframes ppbLoadSweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
            <span aria-hidden="true" className="absolute inset-y-0 w-1/2" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent)", animation: "ppbLoadSweep 1.1s linear infinite" }} />
            <span className="relative z-10 flex items-center gap-2.5">
              <i className="fa-solid fa-spinner fa-spin text-xs" /> Adding…
            </span>
          </button>
        ) : added ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-11 flex items-center justify-center rounded-full text-[11px] font-extrabold uppercase tracking-[0.1em] text-center bg-paper text-ink border border-[#ffce64]">
              <i className="fa-solid fa-circle-check mr-1.5 text-brand" /> Added to Cart
            </div>
            {showQuantityStepper ? (
              <div className="shrink-0 flex items-center gap-3 rounded-xl border border-hair px-3 h-11 bg-white">
                <button onClick={handleDecrement} disabled={isUpdatingQty} title="Decrease quantity" className="disabled:opacity-50 text-gray-500 hover:text-brand">
                  <i className="fa-solid fa-minus text-[10px]" />
                </button>
                <span className="text-xs font-bold w-3 text-center text-black">{itemQty(cartMatch?.quantity) || 1}</span>
                <button onClick={handleIncrement} disabled={isUpdatingQty} title="Increase quantity" className="disabled:opacity-50 text-gray-500 hover:text-black">
                  <i className="fa-solid fa-plus text-[10px]" />
                </button>
              </div>
            ) : (
              <div className="shrink-0 flex items-center gap-3 rounded-full border border-[#ffce64] px-3 h-11 bg-paper">
                <button onClick={handleDecrement} disabled={isUpdatingQty} title="Decrease quantity" className="disabled:opacity-50 text-ink/60 hover:text-brand">
                  <i className="fa-solid fa-minus text-[10px]" />
                </button>
                <span className="text-xs font-bold w-3 text-center text-ink">{itemQty(cartMatch?.quantity) || 1}</span>
                <button onClick={handleIncrement} disabled={isUpdatingQty} title="Increase quantity" className="disabled:opacity-50 text-ink/60 hover:text-ink">
                  <i className="fa-solid fa-plus text-[10px]" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={handleAddToCart}
            disabled={isAdding || addDisabled}
            className="w-full h-11 rounded-full flex items-center justify-center gap-2 text-[12px] font-bold uppercase tracking-wide border-[1.5px] border-brand text-brand bg-white hover:bg-brand/[0.06] active:scale-[0.98] transition disabled:opacity-50"
          >
            <span className="flex items-center justify-center gap-2">
              {sourceOOS || isActiveVariantOOS ? (
                "Out of Stock"
              ) : isAdding ? (
                "Adding…"
              ) : isFreeViaRule ? (
                <>
                  <i className="fa-solid fa-gift" /> Add — FREE
                  <span className="text-base leading-none">→</span>
                </>
              ) : hasRuleDiscount ? (
                <>
                  Add for ₹{Math.round(ruleDiscountedPrice).toLocaleString()}
                  <span className="text-base leading-none">→</span>
                </>
              ) : (
                <>
                  {activeVariantOffer.ctaLabel || "Add to Cart"}
                  <span className="text-base leading-none">→</span>
                </>
              )}
            </span>
          </button>
        )}
        </div>
        {showBannerArrows && (
          <button
            type="button"
            onClick={goToNextBanner}
            aria-label="Next offer"
            className="shrink-0 h-11 px-4 rounded-full border border-hair bg-white text-ink text-[12px] font-bold flex items-center gap-1.5 hover:border-ink transition-colors"
          >
            Next offer <i className="fa-solid fa-chevron-right text-[10px]" />
          </button>
        )}
      </div>
      <div className="px-4 -mt-2 pb-3 empty:hidden">
        {offerClaimedBySibling && (
          <p className="mt-2 text-[11px] text-center text-gray-500">
            <i className="fa-solid fa-circle-info mr-1" />
            Only one offer is applicable per order — you've already used it on another variant.
          </p>
        )}
      </div>
    </div>
  );
};

export default ProductPageBanner;
