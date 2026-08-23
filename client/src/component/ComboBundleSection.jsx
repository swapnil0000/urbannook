import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

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
  const price = Number(activeVariant?.variantPrice ?? 0);

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
    <div className="flex-1 min-w-0 max-w-[76px] sm:max-w-[110px] flex flex-col items-center text-center">
      <div className="relative w-full">
        <div
          className={`w-full aspect-square rounded-lg sm:rounded-xl bg-white/5 border overflow-hidden transition-opacity ${
            removed ? "opacity-30 border-white/5" : "border-white/10"
          }`}
        >
          <img src={image} alt={product?.productName} className="w-full h-full object-cover" />

          {/* Swatches overlaid on the image's bottom edge — main product is
              fixed at whatever variant the customer already picked on the
              page, so it gets no swatches/selector here, only companions do. */}
          {!fixed && variants.length > 1 && !removed && (
            <div className="absolute bottom-0.5 sm:bottom-1 left-0 right-0 flex items-center justify-center gap-0.5">
              {swatchSlots.map((v) => {
                const { type, value } = swatchStyle(v);
                const isSelected = v.variantName === activeVariant?.variantName;
                return (
                  <button
                    key={v.variantName}
                    type="button"
                    title={v.variantName}
                    onClick={() => onSelectVariant(v.variantName)}
                    className={`w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full overflow-hidden border shadow flex items-center justify-center bg-white shrink-0 transition-transform hover:scale-110 ${
                      isSelected ? "border-[#F5DEB3]" : "border-white/70"
                    }`}
                  >
                    {type === "color" && value ? (
                      <span className="w-full h-full block" style={{ background: value }} />
                    ) : value ? (
                      <img src={value} alt={v.variantName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[5px] sm:text-[6px] font-bold uppercase text-gray-500">
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
                  className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-[#1c3026] border border-white/70 shadow flex items-center justify-center text-[5px] sm:text-[6px] font-bold text-[#F5DEB3] shrink-0 hover:scale-110 transition-transform"
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
            className={`absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full border flex items-center justify-center text-[9px] sm:text-[11px] font-bold transition-colors ${
              removed
                ? "bg-[#F5DEB3] text-[#1c3026] border-[#F5DEB3]"
                : "bg-[#1c3026] text-white/70 border-white/25 hover:border-white/50 hover:text-white"
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
              className="fixed z-[10050] rounded-lg border border-[#F5DEB3]/25 bg-[#1c3026] shadow-2xl overflow-y-auto max-h-56"
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
                        ? "bg-[#F5DEB3]/15 text-[#F5DEB3]"
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

      {/* Variant name + price, clickable through to that product's page */}
      <button
        type="button"
        onClick={goToProduct}
        disabled={removed}
        className={`mt-1 w-full text-center transition-opacity ${
          removed ? "opacity-30 pointer-events-none" : "hover:opacity-80"
        }`}
      >
        <span className="block text-[8px] sm:text-[9px] text-white/45 truncate">
          {activeVariant?.variantName}
        </span>
        <span className="block text-[10px] sm:text-xs font-bold text-[#F5DEB3] tabular-nums">
          ₹{price.toLocaleString()}
        </span>
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

  if (!mainVariants.length || !offerable.length) return null;

  const activeMainVariant =
    mainVariants.find((v) => v.variantName === mainVariantName) || mainVariants[0];
  const mainPrice = Number(activeMainVariant?.variantPrice ?? 0);

  const priceOf = (entry) => {
    const name = chosenVariants[entry.product.productId];
    const v = entry.variants.find((x) => x.variantName === name) || entry.variants[0];
    return { variant: v, price: Number(v?.variantPrice ?? 0) };
  };

  const kept = offerable.filter((e) => !removedIds.has(e.product.productId));
  const total = mainPrice + kept.reduce((sum, entry) => sum + priceOf(entry).price, 0);

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
    <section className="mt-5 border-t border-[#F5DEB3]/15  sm:mt-12 px-4 lg:px-12">
      <div className="max-w-md mx-auto rounded-xl sm:rounded-2xl overflow-hidden">
        <div className="px-3 sm:px-5 pt-8 pb-1 text-center  border-white/[0.07]">
          <span className="text-[#F5DEB3]/70 font-bold tracking-[0.1em] uppercase text-[12px] sm:text-[12px]">
            {eyebrow}
          </span>
        </div>

        <div className="px-3 sm:px-5 py-2 sm:py-3">
          <div className="flex items-start justify-center gap-1 sm:gap-1.5">
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
                <div
                  key={id}
                  className="flex items-start gap-1 sm:gap-1.5 flex-1 min-w-0 max-w-[90px] sm:max-w-[128px]"
                >
                  <div className="w-2.5 sm:w-3.5 shrink-0 flex justify-center pt-[calc(50%-1.5rem)]">
                    <span className="text-[#F5DEB3] text-[19px] sm:text-[19px]">
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
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-3 sm:px-5 pb-3 sm:pb-4 pt-0.5 flex flex-col items-center justify-center">
          {/* x + y = z formula, then the Total value on its own line below it. */}
          <div className="text-center mb-2 sm:mb-2.5">
            <p className="flex items-center justify-center flex-wrap gap-x-1 text-[10px] sm:text-[11px] text-white/45 tabular-nums">
              <span>₹{mainPrice.toLocaleString()}</span>
              {kept.map((entry) => (
                <span key={entry.product.productId}>
                  {" + ₹"}
                  {priceOf(entry).price.toLocaleString()}
                </span>
              ))}
              <span>{" = "}₹{total.toLocaleString()}</span>
            </p>
            <p className="mt-0.5 text-white font-bold text-sm sm:text-base tabular-nums">
              Total: ₹{total.toLocaleString()}
            </p>
          </div>

          {mainOutOfStock ? (
            <button
              type="button"
              onClick={onNotifyMe}
              className="w-full h-9 sm:h-10 rounded-full bg-[#F5DEB3] text-[#1c3026] text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.12em] sm:tracking-[0.15em] hover:bg-white transition-colors flex items-center justify-center gap-2"
            >
              <i className="fa-regular fa-bell text-[10px]" />
              Notify Me
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isAdding}
              className="w-fit h-12 sm:h-12 rounded-full bg-[#F5DEB3] text-[#1c3026] text-[11px] sm:text-[11px] font-bold uppercase tracking-[0.12em] sm:tracking-[0.15em] hover:bg-white transition-colors disabled:opacity-50 px-5"
            >
              {isAdding ? "Adding…" : ctaLabel}
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default ComboBundleSection;