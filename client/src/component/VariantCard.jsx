import { Link } from "react-router-dom";
import { trackSelectItem } from "../utils/analytics";
import { isVariantOutOfStock } from "../utils/variantStock";
import StockStatus from "./StockStatus";

/**
 * Shared variant-level card - one product's single variant (own title,
 * image, price). Used on the /products/:id variant-list page. Tapping it
 * goes to the existing /product/:productId/:sku PDP route. It is a real
 * <a href> (not a click handler) so search engines can follow it from the
 * pre-rendered HTML to the product page.
 */
const VariantCard = ({ productId, productName, variant, index, listId = "product_variants", listName, offerBadge = null, demand = null }) => {
  const price = Number(variant?.variantPrice || 0);
  const mrp = Number(variant?.variantMrp || 0);
  const thumbnail = variant?.variantImage?.[0] || "/placeholder.jpg";
  const oos = isVariantOutOfStock(variant);

  const href = `/product/${productId}/${encodeURIComponent(variant?.sku || variant?.variantName)}`;

  const trackClick = () => {
    trackSelectItem({
      itemId: productId,
      itemName: productName,
      itemVariant: variant?.variantName,
      price,
      listId,
      listName: listName || `${productName} - Variants`,
      index,
    });
  };

  return (
    <Link
      to={href}
      onClick={trackClick}
      className={`gl-pcard group relative rounded-none overflow-hidden bg-white border flex flex-col h-full cursor-pointer border-hair`}
    >
      <div className="relative w-full aspect-square bg-surface overflow-hidden">
        <img
          src={thumbnail}
          alt={variant?.variantName || productName}
          className="gl-img w-full h-full object-cover mix-blend-multiply"
        />
        {oos && (
          <span className="absolute top-3 left-3 z-10 gl-lbl text-[8px] px-2 py-0.5 rounded-none bg-ink text-white">
            Out of Stock
          </span>
        )}
        {/* Product's best live offer as a small corner chip - the full wording
            is in the offer strip above the grid (ProductVariantsPage). */}
        {(demand || (offerBadge && !oos)) && (
          <span className="absolute top-2 left-2 z-10 flex flex-col items-start gap-1">
            {demand && <span className="rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-ink shadow-md md:text-[11px]">{demand}</span>}
            {offerBadge && !oos && <span title={offerBadge.label} className="rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-saleDeep shadow-md md:text-[11px]">Offer available</span>}
          </span>
        )}
        {/* % off as a pill on the photo - the first thing the eye lands on */}
        {mrp > price && !oos && (
          <span className="absolute bottom-2 left-2 z-10 rounded-full bg-sale px-2 py-0.5 text-[10.5px] font-extrabold text-white shadow-sm md:text-[11.5px]">
            {Math.round(((mrp - price) / mrp) * 100)}% OFF
          </span>
        )}
      </div>

      <div className={`p-3 md:p-3.5 flex flex-col flex-grow border-t bg-white border-hair`}>
        {/* Two lines max, ellipsis after; min-h reserves both lines so a
            row of these cards never ends up with mismatched heights. */}
        <h3 title={variant?.variantName || ""} className="font-archivo font-bold text-ink leading-snug text-left w-full text-[13px] md:text-[15px] line-clamp-2 min-h-[2.75em] break-words mb-1">
          {variant?.variantName || ""}
        </h3>

        <div className="flex justify-between items-end pt-2 border-t border-hair mt-auto">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="text-[15px] md:text-[17px] font-extrabold text-ink whitespace-nowrap">
                ₹{price?.toLocaleString()}
              </span>
              {mrp > price && (
                <span className="text-[11px] md:text-xs text-faint line-through whitespace-nowrap">
                  ₹{mrp?.toLocaleString()}
                </span>
              )}
            </div>
            {/* real stock: "Only 2 left" from the variant's tracked quantity */}
            <StockStatus outOfStock={oos} left={variant?.variantQuantity} className="mt-1" />
          </div>

          <div className="hidden md:flex w-9 h-9 shrink-0 rounded-full border border-hair text-muted items-center justify-center group-hover:bg-ink group-hover:text-paper group-hover:border-ink transition-colors">
            <i className="fa-solid fa-arrow-right text-xs -rotate-45 group-hover:rotate-0 transition-transform duration-500"></i>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default VariantCard;
