import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { trackSelectItem } from "../utils/analytics";

const WishlistButton = lazy(() => import("./WishlistButton"));

// Shared canvas context reused across every card for text-width measurement
// — avoids allocating a new <canvas> per card in a grid of a dozen+ cards.
let measureCtx = null;
function measureTextWidth(text, font) {
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}

// Title that always renders on exactly one line: it starts at `capPx` and
// shrinks (down to `floorPx`) only by as much as the actual rendered text
// needs to fit the card's real width — no wrapping, no ellipsis, no clipped
// characters, whatever the product name's length turns out to be.
const FitTitle = ({ text, capPx, floorPx, className }) => {
  const ref = useRef(null);
  const [fontSize, setFontSize] = useState(capPx);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      const available = el.clientWidth;
      if (!available) return;
      const font = `${capPx}px Georgia, 'Times New Roman', serif`;
      const textWidth = measureTextWidth(text, font);
      if (textWidth <= available) {
        setFontSize(capPx);
      } else {
        setFontSize(Math.max(floorPx, capPx * (available / textWidth)));
      }
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, capPx, floorPx]);

  return (
    <h3
      ref={ref}
      className={`${className} whitespace-nowrap overflow-hidden`}
      style={{ fontSize: `${fontSize}px` }}
    >
      {text}
    </h3>
  );
};

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
      setIndex((i) => (i + 1) % images.length);
    }, HOLD_MS + FADE_MS);
    return () => clearInterval(id);
  }, [inView, images.length]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {images.map((src, i) => (
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
      ))}
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
                <span className="absolute top-3 left-3 z-10 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-red-500 text-white shadow">
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
              <span className="absolute top-3 left-3 z-10 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#2e443c] text-[#F5DEB3] border border-[#F5DEB3]/30 shadow">
                <i className="fa-solid fa-hourglass-half text-[9px]" /> Few left
              </span>
            );
          })()}
        </div>

        {/* Text & CTA */}
        <div className="p-4 md:p-4 flex flex-col flex-grow bg-white/90 backdrop-blur-md">
          {/* Always a single line, full title, no cutting — the font is
              measured against the card's actual rendered width and shrinks
              only as much as that specific title needs. Two FitTitle
              instances (mobile/desktop) since the breakpoints have very
              different card widths and each needs its own cap size. */}
          <div className="mb-0.5">
            <FitTitle
              text={product.productName || ""}
              capPx={15}
              floorPx={9}
              className="font-serif text-[#2e443c] leading-snug text-center block md:hidden"
            />
            <FitTitle
              text={product.productName || ""}
              capPx={20}
              floorPx={12}
              className="font-serif text-[#2e443c] leading-snug text-center hidden md:block"
            />
          </div>

          <div className="flex justify-center md:justify-between items-end pt-1 border-t border-[#F5DEB3]/10] gap-2">
            <div className="flex items-center flex-nowrap gap-1 md:gap-1.5 min-w-0">
              <span className="text-xs md:text-sm font-normal text-[#157a44] whitespace-nowrap">
                Starting at
              </span>
              <span className="text-xs md:text-sm font-normal text-[#157a44] whitespace-nowrap">
                ₹{price?.toLocaleString()}
              </span>
              {/* {mrp > price && (
                // % OFF stacked directly above the struck MRP
                <span className="flex flex-col items-start leading-none whitespace-nowrap">
                  <span className="text-[7px] md:text-[9px] font-bold text-[#157a44]">
                    {Math.round(((mrp - price) / mrp) * 100)}% OFF
                  </span>
                  <span className="text-[9px] md:text-xs text-gray-400 line-through mt-0.5">
                    ₹{mrp?.toLocaleString()}
                  </span>
                </span>
              )} */}
            </div>

            {/* {(product?.variantDetails?.length || 0) > 1 && (
              <span className="text-[9px] md:text-[10px] font-medium text-gray-500 whitespace-nowrap shrink-0 ml-auto">
                {product.variantDetails.length} variants
              </span>
            )} */}
            <div className="hidden md:flex w-12 h-12 rounded-full bg-[#F5DEB3]/10 text-gray-500 items-center justify-center group-hover:bg-[#F5DEB3] group-hover:text-[#2e443c] transition-all duration-300">
              <i className="fa-solid fa-arrow-right -rotate-45 group-hover:rotate-0 transition-transform duration-500"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
