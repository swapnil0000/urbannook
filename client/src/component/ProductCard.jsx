import { lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { trackSelectItem } from "../utils/analytics";

const WishlistButton = lazy(() => import("./WishlistButton"));

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
  const mrp = Number(product?.effectiveMrp ?? firstVariant?.variantMrp ?? 0);
  const thumbnail = firstVariant?.variantImage?.[0] || "/placeholder.jpg";

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
    navigate(firstVariant?.sku ? `/product/${product.productId}/${firstVariant.sku}` : `/product/${product.productId}`);
  };

  return (
    <div className="group relative rounded-[1.6rem] overflow-hidden bg-black/20 border border-white/5 shadow-lg hover:shadow-2xl hover:border-[#F5DEB3]/30 transition-all duration-500 flex flex-col h-full">
      {/* Wishlist Button (Floating Top Right) */}
      <div className="absolute top-4 right-4 z-20">
        <Suspense fallback={<div className="w-8 h-8 bg-white/20 rounded-full animate-pulse"></div>}>
          <WishlistButton productId={product.productId} />
        </Suspense>
      </div>

      {/* Clickable Card Area */}
      <div className="flex flex-col flex-grow cursor-pointer" onClick={goToProduct}>
        <div className="relative w-full aspect-square bg-[#f8f8f5] overflow-hidden">
          <img
            src={thumbnail}
            alt={product.productName}
            className="w-full h-full object-cover mix-blend-multiply transition-transform duration-[1.5s] group-hover:scale-110"
          />
          {/* Nook's Special Featured Banner — 3D ribbon top-left corner */}
          {/* {product?.featured === true && (
            <div className="absolute top-0 left-0 z-20 w-32 h-32 overflow-hidden">
              <div
                className="absolute top-0 left-0 w-40 h-16 bg-gradient-to-b from-[#dc2626] to-[#b91c1c] flex items-center justify-center font-black text-white text-lg tracking-wider shadow-2xl"
                style={{
                  transform: 'rotate(-45deg) translateY(-50%) translateX(-25%)',
                  transformOrigin: 'top left',
                  textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                  boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2), 0 8px 16px rgba(0,0,0,0.4)',
                }}
              >
                Nook's Special
              </div>
              <div
                className="absolute top-0 left-0 w-40 h-16 bg-gradient-to-b from-[#d4a574] to-[#a68860]"
                style={{
                  transform: 'rotate(-45deg) translateY(-50%) translateX(-25%)',
                  transformOrigin: 'top left',
                  opacity: 0.3,
                  width: '6px',
                  left: '155px',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                }}
              />
            </div>
          )} */}

          {/* Out-of-stock / low-stock badge */}
          {(() => {
            const LOW_STOCK_THRESHOLD = 5;
            const active = (product?.variantDetails || []).filter((v) => v.isActive !== false);
            const allVariantsOOS = active.length > 0 && active.every(
              (v) => v.variantOutOfStock === true || (v.variantQuantity != null && Number(v.variantQuantity) <= 0),
            );
            if (product?.productStatus === "out_of_stock" || allVariantsOOS) {
              return (
                <span className="absolute top-3 left-3 z-10 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-red-500 text-white shadow">
                  Out of Stock
                </span>
              );
            }
            const tracked = active.filter(
              (v) => v.variantQuantity != null && !v.variantOutOfStock && Number(v.variantQuantity) > 0,
            );
            if (tracked.length === 0) return null;
            const totalLeft = tracked.reduce((s, v) => s + Number(v.variantQuantity || 0), 0);
            if (totalLeft > LOW_STOCK_THRESHOLD) return null;
            return totalLeft === 1 ? (
              <span className="absolute top-3 left-3 z-10 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#F5DEB3] text-[#1c3026] shadow animate-pulse">
                <i className="fa-solid fa-bolt text-[9px]" /> Only 1 left
              </span>
            ) : (
              <span className="absolute top-3 left-3 z-10 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#2e443c] text-[#F5DEB3] border border-[#F5DEB3]/30 shadow">
                <i className="fa-solid fa-hourglass-half text-[9px]" /> Few left
              </span>
            );
          })()}

        </div>

        {/* Text & CTA */}
        <div className="p-4 md:p-4 flex flex-col flex-grow bg-[#f5f7f8] to-transparent backdrop-blur-md">
          {/* Titles likely to wrap to 2 lines use a smaller font so the block
              stays compact; short titles reserve only ~1 line of height —
              previously EVERY card reserved 2-line height even when the name
              fit on one line, leaving an empty gap above the divider. */}
          {(() => {
            const isLongTitle = (product.productName || "").length > 18;
            return (
              <div className="mb-2">
                <h3
                  className={`font-serif text-gray-500 leading-snug line-clamp-2 ${
                    isLongTitle
                      ? "text-sm md:text-lg min-h-[2.4em] md:min-h-[2.6em]"
                      : "text-base md:text-xl min-h-[1.3em] md:min-h-[1.4em]"
                  }`}
                >
                  {product.productName}
                </h3>
              </div>
            );
          })()}

          <div className="flex justify-between items-end pt-2 border-t border-[#F5DEB3]/10] gap-2">
            {/* Price + MRP on left — flex-nowrap keeps this on ONE line */}
            <div className="flex items-center flex-nowrap gap-1 md:gap-1.5 min-w-0">
              <span className="text-base md:text-xl font-bold text-[#a89068] whitespace-nowrap">
                ₹{price?.toLocaleString()}
              </span>
              {mrp > price && (
                // % OFF stacked directly above the struck MRP
                <span className="flex flex-col items-start leading-none whitespace-nowrap">
                  <span className="text-[7px] md:text-[9px] font-bold text-[#157a44]">
                    {Math.round(((mrp - price) / mrp) * 100)}% OFF
                  </span>
                  <span className="text-[9px] md:text-xs text-gray-400 line-through mt-0.5">
                    ₹{mrp?.toLocaleString()}
                  </span>
                </span>
              )}
            </div>

            {/* Variants on far right — max 2 then +X */}
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              {(() => {
                const variantDetails = product?.variantDetails || [];
                if (variantDetails.length === 0) return null;
                return (
                  <>
                    {variantDetails.slice(0, 2).map((detail, idx) => {
                      const variantName = detail.variantName;
                      const swatchType = detail.variantSwatchType === "color" ? "color" : "image";
                      const swatchValue =
                        (detail.variantSwatchValue && detail.variantSwatchValue.trim()) ||
                        (swatchType === "image" ? detail.variantImage?.[0] : "");
                      const goToVariant = (e) => {
                        e.stopPropagation();
                        navigate(`/product/${product.productId}/${detail.sku || variantName}`);
                      };
                      const oos = detail.variantOutOfStock === true || (detail.variantQuantity != null && Number(detail.variantQuantity) <= 0);
                      return (
                        <span
                          key={detail._id || idx}
                          title={oos ? `${variantName} — out of stock` : variantName}
                          onClick={goToVariant}
                          className={`w-3 h-3 rounded-full overflow-hidden border border-[#d1d5db] shadow-sm transition-transform hover:scale-110 cursor-pointer flex items-center justify-center bg-white shrink-0 ${oos ? "opacity-40 grayscale" : ""}`}
                        >
                          {swatchType === "color" && swatchValue ? (
                            <span className="w-full h-full block" style={{ background: swatchValue }} />
                          ) : swatchValue ? (
                            <img src={swatchValue} alt={variantName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[6px] font-bold uppercase text-gray-400">
                              {variantName?.charAt(0)}
                            </span>
                          )}
                        </span>
                      );
                    })}
                    {variantDetails.length > 2 && (
                      <span className="text-[9px] md:text-[10px] font-medium text-gray-500 whitespace-nowrap">
                        +{variantDetails.length - 2}
                      </span>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Arrow CTA — desktop only */}
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
