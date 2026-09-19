import { lazy, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { trackSelectItem } from "../utils/analytics";
import FitTitle from "./FitTitle";

const WishlistButton = lazy(() => import("./WishlistButton"));

// Auto-cycles through a product's own variant photos as a hold-then-crossfade
// slideshow — each photo sits still, then slowly dissolves into the next
// (never slides/scrolls). Cycles forward through the list and wraps from the
// last image back to the first via the same fade, so there's never a
// direction to "reverse". Paused via IntersectionObserver whenever the card
// is off-screen, and skipped entirely under prefers-reduced-motion, so idle
// or motion-sensitive viewers cost nothing.
const HOLD_MS = 2600; // fully-visible pause on each image
const FADE_MS = 1500; // crossfade duration into the next image

// Read once at module load, not on every render — this can't change
// mid-session in any way that matters for a decorative auto-cycle.
const REDUCE_MOTION =
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const VariantSlider = ({ images, alt }) => {
  const containerRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [index, setIndex] = useState(0);
  // Which slide indices are allowed to actually mount an <img> (and so
  // request their file). A grid can show a dozen-plus of these cards at
  // once, each with several variant photos — loading every photo of every
  // card the moment it scrolls into view would multiply into a genuinely
  // large burst of requests. Only the currently-shown photo plus the next
  // one (so the crossfade never has to wait) are ever mounted; the rest
  // stay unmounted until the auto-cycle actually reaches them.
  const [loadedIndices, setLoadedIndices] = useState(() => new Set([0, 1 % images.length]));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.15,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || REDUCE_MOTION || images.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % images.length;
        setLoadedIndices((prev) => {
          const after = (next + 1) % images.length;
          if (prev.has(next) && prev.has(after)) return prev;
          const merged = new Set(prev);
          merged.add(next);
          merged.add(after);
          return merged;
        });
        return next;
      });
    }, HOLD_MS + FADE_MS);
    return () => clearInterval(id);
  }, [inView, images.length]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {images.map((src, i) =>
        loadedIndices.has(i) ? (
          <img
            key={src}
            src={src}
            alt={alt}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover mix-blend-multiply ease-in-out"
            style={{
              opacity: i === index ? 1 : 0,
              transitionProperty: "opacity",
              transitionDuration: `${FADE_MS}ms`,
            }}
          />
        ) : null,
      )}
    </div>
  );
};

/**
 * Shared storefront product card — used by the All Products grid AND the PDP
 * "recommended products" scroller, so both stay visually identical. Price and
 * MRP are read from the FIRST variant (variantPrice / variantMrp) — the same
 * real-data logic everywhere, no fake markup. Width is controlled by the
 * parent (grid cell or fixed-width scroller item); the card fills it.
 */
const ProductCard = ({ product, index = 0, listId = "all_products", listName = "All Products" }) => {
  const navigate = useNavigate();

  const firstVariant = product?.variantDetails?.[0];
  const price = Number(product?.effectivePrice ?? firstVariant?.variantPrice ?? 0);
  const thumbnail = firstVariant?.variantImage?.[0] || "/placeholder.jpg";
  // Distinct variant photos, deduped — a size/color variant that reuses the
  // same image as another shouldn't create a pointless jump-cut in the loop.
  // Memoized on the underlying variant data so this isn't rebuilt (a fresh
  // array + a fresh Set) on every render of a card sitting in a grid.
  const productVariantDetails = product?.variantDetails;
  const variantImages = useMemo(
    () => [...new Set((productVariantDetails || []).map((v) => v.variantImage?.[0]).filter(Boolean))],
    [productVariantDetails],
  );

  const goToProduct = () => {
    trackSelectItem({
      itemId: product.productId,
      itemName: product.productName,
      itemVariant: firstVariant?.variantName,
      price,
      listId,
      listName,
      index,
    });
    navigate(`/products/${product.productId}`);
  };

  return (
    <div className="group relative rounded-[1.2rem] overflow-hidden bg-black/20 border border-white/5 shadow-lg hover:shadow-2xl hover:border-[#F5DEB3]/30 transition-all duration-500 flex flex-col h-full">
      {/* Wishlist Button (Floating Top Right) */}
      {/* <div className="absolute top-4 right-4 z-20">
        <Suspense
          fallback={
            <div className="w-8 h-8 bg-white/20 rounded-full animate-pulse"></div>
          }
        >
          <WishlistButton productId={product.productId} />
        </Suspense>
      </div> */}

      {/* Clickable Card Area */}
      <div
        className="flex flex-col flex-grow cursor-pointer"
        onClick={goToProduct}
      >
        <div className="relative w-full aspect-square bg-[#f8f8f5] overflow-hidden">
          {variantImages.length > 1 ? (
            <VariantSlider images={variantImages} alt={product.productName} />
          ) : (
            <img
              src={thumbnail}
              alt={product.productName}
              className="w-full h-full object-cover mix-blend-multiply transition-transform duration-[1.5s] group-hover:scale-110"
            />
          )}

          {/* Nook's Special: Fixed Ribbon + Positioned Text */}
          {product?.featured === true && (
            <>
              {/* Red Ribbon (fixed position) */}
              <div
                className="absolute z-20 pointer-events-none"
                style={{
                  top: "-10px",
                  left: "-50px",
                  width: "200px",
                  height: "80px",
                  overflow: "visible",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    width: "160px",
                    height: "18px",
                    background:
                      "linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #991B1B 100%)",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
                    transform: "rotate(-45deg)",
                    top: "8px",
                    left: "50%",
                    marginLeft: "-80px",
                  }}
                />
              </div>

              {/* Text Box (diagonally positioned) tweak these to change positions strictly dont change these  */}
              <div
                className="absolute z-20 pointer-events-none"
                style={{
                  top: "16px",
                  left: "-20px",
                  right: "auto",
                  bottom: "auto",
                  width: "100px",
                  height: "22px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: "rotate(-45deg)",
                }}
              >
                <span
                  style={{
                    color: "white",
                    fontSize: "8px",
                    fontWeight: "bold",
                    letterSpacing: "0.1px",
                    textAlign: "center",
                    lineHeight: "1.2",
                    whiteSpace: "nowrap",
                  }}
                >
                  Nook&apos;s Special
                </span>
              </div>
            </>
          )}

          {/* Out-of-stock / low-stock badge */}
          {(() => {
            const LOW_STOCK_THRESHOLD = 5;
            const active = (product?.variantDetails || []).filter(
              (v) => v.isActive !== false,
            );
            const allVariantsOOS =
              active.length > 0 &&
              active.every(
                (v) =>
                  v.variantOutOfStock === true ||
                  (v.variantQuantity != null && Number(v.variantQuantity) <= 0),
              );
            if (product?.productStatus === "out_of_stock" || allVariantsOOS) {
              return (
                <span className="absolute top-3 left-3 z-10 text-[7px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-500 text-white shadow">
                  Out of Stock
                </span>
              );
            }
            const tracked = active.filter(
              (v) =>
                v.variantQuantity != null &&
                !v.variantOutOfStock &&
                Number(v.variantQuantity) > 0,
            );
            if (tracked.length === 0) return null;
            const totalLeft = tracked.reduce(
              (s, v) => s + Number(v.variantQuantity || 0),
              0,
            );
            if (totalLeft > LOW_STOCK_THRESHOLD) return null;
            if (totalLeft === 1) return null;
            return (
              <span className="absolute top-3 left-3 z-10 flex items-center gap-1 text-[7px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#2e443c] text-[#F5DEB3] border border-[#F5DEB3]/30 shadow">
                <i className="fa-solid fa-hourglass-half text-[6px]" /> Few left
              </span>
            );
          })()}
        </div>

        {/* Minimal footer — name, then price, nothing else. A fixed-height
            title (FitTitle: always exactly one line, whatever the name's
            length) keeps every card in a row the same height, so a row
            never looks uneven. */}
        <div className="p-4 flex flex-col items-center gap-1 bg-white/90 backdrop-blur-md">
          {/* Fixed-height wrapper, sized to the CAP font size regardless of
              how much this particular title had to shrink — otherwise a
              long name (smaller font) leaves a shorter title block than a
              short name (full font), and the row/card ends up uneven. */}
          <div className="h-5 md:h-6 flex items-center justify-center w-full">
            <FitTitle
              text={product.productName || ""}
              capPx={15}
              floorPx={9}
              className="font-serif text-[#2e443c] leading-snug text-center block md:hidden w-full"
            />
            <FitTitle
              text={product.productName || ""}
              capPx={18}
              floorPx={12}
              className="font-serif text-[#2e443c] leading-snug text-center hidden md:block w-full"
            />
          </div>
          <span className="text-xs md:text-sm font-medium text-[#157a44]">
            Starting at ₹{price?.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
