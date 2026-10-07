import { useState, useMemo, useRef, useEffect, useCallback, Fragment } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useEvaluateCartRulesQuery } from "../store/api/userApi";

// Copy shown when the admin leaves the corresponding combo text field blank.
const DEFAULT_EYEBROW = "People also buy along with this";
const DEFAULT_HEADING = "Complete the Set";
const DEFAULT_CTA = "Add Together";
const MAX_VISIBLE_SWATCHES = 3;
// Bundle is capped at 1 main + 2 companions — beyond that the row stops
// reading as "complete the set" and just becomes clutter.
const MAX_COMBO_PRODUCTS = 2;

const isVariantOOS = (v) =>
  v?.variantOutOfStock === true ||
  (v?.variantQuantity != null && Number(v.variantQuantity) <= 0);

// Same convention as ProductCard's swatch rendering: an explicit color/image
// value if the admin set one, else the variant's own image, else initials.
const swatchStyle = (variant) => {
  const type = variant?.variantSwatchType === "color" ? "color" : "image";
  const value =
    (variant?.variantSwatchValue && variant.variantSwatchValue.trim()) ||
    (type === "image" ? variant?.variantImage?.[0] : "");
  return { type, value };
};

/**
 * One product tile in the bundle row — image with variant swatches overlaid
 * on its bottom edge, then the currently selected variant's name + price
 * underneath, clickable through to that product's own page. Every tile
 * (including the main product) can pick its own variant; only companions get
 * the − remove button.
 */
const BundleTile = ({
  product,
  variants,
  selectedVariant,
  onSelectVariant,
  fixed,
  removed,
  onToggleRemove,
}) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const triggerRef = useRef(null);
  const portalRef = useRef(null);

  const activeVariant =
    variants.find((v) => v.variantName === selectedVariant) || variants[0];
  const image = activeVariant?.variantImage?.[0] || product?.productImg;

  const goToProduct = () => {
    if (!product?.productId) return;
    navigate(
      activeVariant?.sku
        ? `/product/${product.productId}/${activeVariant.sku}`
        : `/product/${product.productId}`,
    );
  };
  const visible = variants.slice(0, MAX_VISIBLE_SWATCHES);
  const overflowCount = variants.length - (MAX_VISIBLE_SWATCHES - 1);
  const showOverflow = variants.length > MAX_VISIBLE_SWATCHES;
  // When there's overflow, the last visible slot becomes the "+N" trigger
  // instead of a swatch, keeping the row capped at MAX_VISIBLE_SWATCHES icons.
  const swatchSlots = showOverflow ? visible.slice(0, MAX_VISIBLE_SWATCHES - 1) : visible;

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e) => {
      if (
        !triggerRef.current?.contains(e.target) &&
        !portalRef.current?.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    const close = () => setMenuOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menuOpen]);

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPos({ top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 140) });
    }
    setMenuOpen(true);
  };

  return (
    <div className="flex-1 min-w-0 max-w-[140px] sm:max-w-[190px] flex flex-col items-center text-center">
      <div className="relative w-full">
        <div
          className={`w-full aspect-square rounded-xl sm:rounded-2xl bg-white border overflow-hidden transition-opacity ${
            removed ? "opacity-30 border-hair" : "border-hair"
          }`}
        >
          <img src={image} alt={product?.productName} className="w-full h-full object-cover" />

          {/* Swatches overlaid on the image's bottom edge — main product is
              fixed at whatever variant the customer already picked on the
              page, so it gets no swatches/selector here, only companions do. */}
          {!fixed && variants.length > 1 && !removed && (
            <div className="absolute bottom-1 sm:bottom-1.5 left-0 right-0 flex items-center justify-center gap-1">
              {swatchSlots.map((v) => {
                const { type, value } = swatchStyle(v);
                const isSelected = v.variantName === activeVariant?.variantName;
                return (
                  <button
                    key={v.variantName}
                    type="button"
                    title={v.variantName}
                    onClick={() => onSelectVariant(v.variantName)}
                    className={`w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full overflow-hidden border shadow flex items-center justify-center bg-white shrink-0 transition-transform hover:scale-110 ${
                      isSelected ? "border-brand" : "border-white"
                    }`}
                  >
                    {type === "color" && value ? (
                      <span
                        className="w-full h-full block"
                        style={{ background: value }}
                      />
                    ) : value ? (
                      <img
                        src={value}
                        alt={v.variantName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[6px] sm:text-[8px] font-bold uppercase text-gray-500">
                        {v.variantName?.charAt(0)}
                      </span>
                    )}
                  </button>
                );
              })}
              {showOverflow && (
                <button
                  ref={triggerRef}
                  type="button"
                  onClick={() => (menuOpen ? setMenuOpen(false) : openMenu())}
                  title="More variants"
                  className="w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full bg-ink border border-white/70 shadow flex items-center justify-center text-[6px] sm:text-[8px] font-bold text-paper shrink-0 hover:scale-110 transition-transform"
                >
                  +{overflowCount}
                </button>
              )}
            </div>
          )}
        </div>

        {!fixed && (
          <button
            type="button"
            onClick={onToggleRemove}
            aria-label={removed ? `Add ${product?.productName} back` : `Remove ${product?.productName}`}
            className={`absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-7 sm:h-7 rounded-full border flex items-center justify-center text-[11px] sm:text-[14px] font-bold transition-colors ${
              removed
                ? "bg-white text-ink border-hair"
                : "bg-ink text-white border-ink hover:bg-black"
            }`}
          >
            {removed ? "+" : "−"}
          </button>
        )}

        {/* Variant dropdown — portaled so the tile's overflow-hidden can't clip it */}
        {menuOpen &&
          menuPos &&
          createPortal(
            <div
              ref={portalRef}
              className="fixed z-[10050] rounded-lg border border-paper/25 bg-ink shadow-2xl overflow-y-auto max-h-56"
              style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
            >
              {variants.map((v) => {
                const { type, value } = swatchStyle(v);
                const isSelected = v.variantName === activeVariant?.variantName;
                return (
                  <button
                    key={v.variantName}
                    type="button"
                    onClick={() => {
                      onSelectVariant(v.variantName);
                      setMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-paper/15 text-paper"
                        : "text-white/80 hover:bg-white/5"
                    }`}
                  >
                    <span className="shrink-0 w-4 h-4 rounded-full overflow-hidden border border-white/20 bg-white flex items-center justify-center">
                      {type === "color" && value ? (
                        <span className="w-full h-full block" style={{ background: value }} />
                      ) : value ? (
                        <img src={value} alt={v.variantName} className="w-full h-full object-cover" />
                      ) : null}
                    </span>
                    <span className="truncate">{v.variantName}</span>
                  </button>
                );
              })}
            </div>,
            document.body,
          )}
      </div>

      {/* Name (2 lines max, height reserved so tiles line up), variant and
          price — clickable through to that product's page */}
      <button
        type="button"
        onClick={goToProduct}
        disabled={removed}
        title={product?.productName}
        className={`mt-2 w-full text-center transition-opacity ${
          removed ? "opacity-30 pointer-events-none" : "hover:opacity-80"
        }`}
      >
        <span className="block text-[12px] sm:text-[13px] font-semibold text-ink leading-snug line-clamp-2 min-h-[2.75em] break-words">
          {product?.productName}
        </span>
        {variants.length > 1 && activeVariant?.variantName && (
          <span className="block mt-0.5 text-[11px] sm:text-xs text-muted truncate">
            {activeVariant.variantName}
          </span>
        )}
        {Number(activeVariant?.variantPrice) > 0 && (
          <span className="block mt-1 text-[13px] sm:text-sm font-bold text-ink">
            ₹{Number(activeVariant.variantPrice).toLocaleString("en-IN")}
          </span>
        )}
      </button>
    </div>
  );
};

/**
 * Admin-driven "buy together" section, shown as a static row above the
 * reviews section (not a click-triggered popup) — a customer sees it whether
 * or not the main product is already in their cart. Everything it renders
 * comes from the product record: which companions to offer
 * (`comboProductIds`), their variants/prices, and the three copy strings.
 *
 * Every tile (main + companions) can pick its own variant via the swatches
 * overlaid on its image; companions can also be dropped with their − button.
 * Confirming adds the main product (at whatever variant is selected here)
 * plus every kept companion in one go — this section doesn't assume the main
 * product is already in the cart.
 *
 * @param {object}   mainProduct        the product this section is attached to
 * @param {string}   mainVariantName    page-level selected variant (kept in sync via onSelectMainVariant)
 * @param {function} onSelectMainVariant (variantName) => void — updates the PDP's own selection
 * @param {boolean}  mainOutOfStock     PDP's own OOS check for the selected main variant
 * @param {function} onNotifyMe         called instead of onAddBundle when the main product is OOS
 * @param {object[]} comboProducts      product.comboProductsDetails from the API
 * @param {object}   copy               { eyebrow, heading, cta } — blanks fall back
 * @param {function} onAddBundle        (selections: [{ product, variantName }]) => void — main first
 * @param {boolean}  isAdding
 */
const ComboBundleSection = ({
  mainProduct,
  mainVariantName,
  onSelectMainVariant,
  mainOutOfStock = false,
  onNotifyMe,
  comboProducts = [],
  copy = {},
  onAddBundle,
  isAdding,
}) => {
  // Unfiltered — still need something to display (image/price) even when the
  // main product is out of stock; the OOS state itself comes from the PDP's
  // own check (mainOutOfStock prop), not from filtering variants away here.
  const mainVariants = mainProduct?.variantDetails || [];

  const offerable = useMemo(
    () =>
      comboProducts
        .map((p) => ({
          product: p,
          variants: (p.variantDetails || []).filter((v) => v.isActive !== false && !isVariantOOS(v)),
        }))
        .filter((entry) => entry.variants.length > 0)
        // Defensive cap even if the admin data has more — keeps the row to
        // 1 main + MAX_COMBO_PRODUCTS companions no matter what's stored.
        .slice(0, MAX_COMBO_PRODUCTS),
    [comboProducts],
  );

  const [chosenVariants, setChosenVariants] = useState(() =>
    Object.fromEntries(offerable.map((e) => [e.product.productId, e.variants[0].variantName])),
  );
  const [removedIds, setRemovedIds] = useState(() => new Set());

  // "Added" state is derived straight from the cart, not a local flag — so
  // if the customer removes any bundle item from the cart drawer/page, this
  // button reverts to "Add Together" on its own instead of staying stuck on
  // "Added" for something that's no longer actually in the cart.
  const cartItems = useSelector((state) => state.cart.items);
  const isInCart = useCallback(
    (productId, variantName) =>
      cartItems.some(
        (i) =>
          String(i.mongoId || i.id) === String(productId) &&
          (i.selectedVariant || "N/A") === (variantName || "N/A"),
      ),
    [cartItems],
  );

  const selectCompanionVariant = useCallback(
    (productId, variantName) =>
      setChosenVariants((prev) => ({ ...prev, [productId]: variantName })),
    [],
  );

  const toggleRemoved = (productId) =>
    setRemovedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });

  const activeMainVariant =
    mainVariants.find((v) => v.variantName === mainVariantName) || mainVariants[0];
  const mainPrice = Number(activeMainVariant?.variantPrice ?? 0);

  const kept = offerable.filter((e) => !removedIds.has(e.product.productId));

  // A cart_rule offer (admin Offers page) can make one of these companions
  // free/discounted when bought together with the main product (e.g. "Buy
  // Katana Get Stand FREE") — this bundle row previously always showed full
  // price, misleadingly, since it had no idea such a rule existed. Evaluated
  // against a HYPOTHETICAL cart — current cart contents PLUS this exact
  // bundle selection — so the shown total matches what checkout will
  // actually charge if the customer confirms this. Display-only: the real
  // enforcement still happens server-side at order-creation time regardless
  // of which widget added the items.
  const cartItemsForEval = useSelector((state) => state.cart.items);
  const itemQtyForEval = (q) => (typeof q === "object" && q !== null ? q.quantity || 0 : q || 0);
  const hypotheticalItems = useMemo(() => {
    const fromCart = cartItemsForEval
      .map((item) => ({ productId: item.id || item.mongoId, quantity: itemQtyForEval(item.quantity), selectedVariant: item.selectedVariant }))
      .filter((i) => i.productId && i.quantity > 0);
    const bundleItems = [
      { productId: mainProduct?.productId, quantity: 1, selectedVariant: activeMainVariant?.variantName },
      ...kept.map((entry) => ({
        productId: entry.product.productId,
        quantity: 1,
        selectedVariant: (entry.variants.find((x) => x.variantName === chosenVariants[entry.product.productId]) || entry.variants[0])?.variantName,
      })),
    ].filter((i) => i.productId);
    return [...fromCart, ...bundleItems];
  }, [cartItemsForEval, mainProduct?.productId, activeMainVariant?.variantName, kept, chosenVariants]);
  const { data: bundleRuleEval } = useEvaluateCartRulesQuery(hypotheticalItems, { skip: hypotheticalItems.length === 0 });

  const priceOf = (entry) => {
    const name = chosenVariants[entry.product.productId];
    const v = entry.variants.find((x) => x.variantName === name) || entry.variants[0];
    const basePrice = Number(v?.variantPrice ?? 0);
    // Sibling variants of the SAME product can share ONE rule's discount
    // pool instead of each getting their own (e.g. "Exciting Offers": free
    // single stand / 50%-off double / 50%-off triple is ONE unit shared
    // across all three — see cartRule.util.js's createRuleBudgetTracker).
    // lineDiscounts is computed server-side the same way checkout actually
    // consumes the budget, so a line it marks ineligible must show full
    // price here too.
    const lineEntry = (bundleRuleEval?.lineDiscounts || []).find(
      (ld) => String(ld.productId) === String(entry.product.productId) && ld.selectedVariant === v?.variantName,
    );
    const eligible = !lineEntry || lineEntry.eligible !== false;
    const candidates = eligible
      ? (bundleRuleEval?.discounts?.[entry.product.productId] || []).filter((c) => !c.variantName || c.variantName === v?.variantName)
      : [];
    const price = candidates.length
      ? Math.round(Math.max(Math.min(...candidates.map((c) => (c.type === "percent_off" ? basePrice * (1 - c.value / 100) : basePrice - c.value))), 0))
      : basePrice;
    return { variant: v, price, basePrice, discounted: price < basePrice };
  };

  if (!mainVariants.length || !offerable.length) return null;

  const total = mainPrice + kept.reduce((sum, entry) => sum + priceOf(entry).price, 0);

  const bundleAdded =
    isInCart(mainProduct?.productId, activeMainVariant?.variantName) &&
    kept.every((entry) => isInCart(entry.product.productId, priceOf(entry).variant?.variantName));

  const eyebrow = copy.eyebrow?.trim() || DEFAULT_EYEBROW;
  const ctaLabel = copy.cta?.trim() || DEFAULT_CTA;

  const handleConfirm = () =>
    onAddBundle([
      { product: mainProduct, variantName: activeMainVariant?.variantName },
      ...kept.map((entry) => ({
        product: entry.product,
        variantName: priceOf(entry).variant?.variantName,
      })),
    ]);

  return (
    <section className="mt-5 border-t border-hair sm:mt-12 px-4 lg:px-12">
      <div className="max-w-xl mx-auto rounded-xl sm:rounded-2xl overflow-hidden">
        <div className="px-3 sm:px-5 pt-8 pb-1 text-center  border-white/[0.07]">
          <span className="text-muted font-bold tracking-[0.1em] uppercase text-[12px] sm:text-[12px]">
            {eyebrow}
          </span>
        </div>

        <div className="px-3 sm:px-5 py-2 sm:py-3">
          <div className="flex items-start justify-center gap-3 sm:gap-4">
            <BundleTile
              fixed
              product={mainProduct}
              variants={mainVariants}
              selectedVariant={activeMainVariant?.variantName}
              onSelectVariant={onSelectMainVariant}
            />
            {offerable.map((entry) => {
              const id = entry.product.productId;
              return (
                // The "+" sits as its OWN flex sibling here, not nested
                // inside a wrapper around the tile — nesting it made this
                // companion tile share its allotted width with the icon,
                // rendering smaller than the main tile (which gets its full
                // slot to itself). Every BundleTile is now a direct sibling
                // in the same row, so all of them get the identical
                // max-w-[140px] sm:max-w-[190px] and render the same size.
                <Fragment key={id}>
                  <div className="self-center shrink-0 flex justify-center">
                    <span className="text-muted text-[26px] sm:text-[30px]">
                      +
                    </span>
                  </div>
                  <BundleTile
                    product={entry.product}
                    variants={entry.variants}
                    selectedVariant={chosenVariants[id]}
                    onSelectVariant={(name) => selectCompanionVariant(id, name)}
                    removed={removedIds.has(id)}
                    onToggleRemove={() => toggleRemoved(id)}
                  />
                </Fragment>
              );
            })}
          </div>
        </div>

        <div className="px-3 sm:px-5 pt-2 pb-6 flex flex-col items-center justify-center">
          {mainOutOfStock ? (
            <button
              type="button"
              onClick={onNotifyMe}
              className="w-full sm:w-auto sm:min-w-[260px] h-12 px-6 rounded-full bg-ink text-white text-[11px] font-bold uppercase tracking-[0.12em] sm:tracking-[0.15em] hover:bg-black transition-colors flex items-center justify-center gap-2"
            >
              <i className="fa-regular fa-bell text-[10px]" />
              Notify Me
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isAdding || bundleAdded}
              className={`w-full sm:w-auto sm:min-w-[260px] h-12 rounded-full text-[12px] font-bold uppercase tracking-[0.1em] whitespace-nowrap transition-colors px-6 flex items-center justify-center gap-1.5 ${
                bundleAdded
                  ? "bg-white text-ink border border-ink"
                  : "bg-ink text-white hover:bg-black disabled:opacity-60"
              }`}
            >
              {isAdding ? (
                "Adding…"
              ) : bundleAdded ? (
                <>
                  <i className="fa-solid fa-check text-[10px]" />
                  Added
                </>
              ) : (
                <>
                  <span className="truncate">{ctaLabel}</span>
                  <span className="opacity-40">•</span>
                  <span>₹{total.toLocaleString("en-IN")}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default ComboBundleSection;