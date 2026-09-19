import { useNavigate } from "react-router-dom";
import { trackSelectItem } from "../utils/analytics";
import FitTitle from "./FitTitle";

/**
 * Shared variant-level card — one product's single variant (own title,
 * image, price). Used on the /products/:id variant-list page. Tapping it
 * goes to the existing /product/:productId/:sku PDP route.
 */
const VariantCard = ({ productId, productName, variant, index, listId = "product_variants", listName }) => {
  const navigate = useNavigate();

  const price = Number(variant?.variantPrice || 0);
  const mrp = Number(variant?.variantMrp || 0);
  const thumbnail = variant?.variantImage?.[0] || "/placeholder.jpg";
  const oos =
    variant?.variantOutOfStock === true ||
    (variant?.variantQuantity != null && Number(variant.variantQuantity) <= 0);

  const goToVariant = () => {
    trackSelectItem({
      itemId: productId,
      itemName: productName,
      itemVariant: variant?.variantName,
      price,
      listId,
      listName: listName || `${productName} — Variants`,
      index,
    });
    navigate(`/product/${productId}/${variant?.sku || variant?.variantName}`);
  };

  return (
    <div
      onClick={goToVariant}
      className="gl-pcard group relative rounded-none overflow-hidden bg-white border border-hair flex flex-col h-full cursor-pointer"
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
      </div>

      <div className="p-3.5 flex flex-col flex-grow bg-white border-t border-hair">
        {/* Always exactly one line, whatever the variant name's length —
            shrinks to fit instead of wrapping to 2 lines, so a row of
            these cards never ends up with mismatched heights. */}
        <div className="h-5 md:h-6 flex items-center w-full mb-1">
          <FitTitle
            text={variant?.variantName || ""}
            capPx={16}
            floorPx={10}
            className="font-archivo font-bold text-ink leading-snug text-left w-full block md:hidden"
          />
          <FitTitle
            text={variant?.variantName || ""}
            capPx={18}
            floorPx={12}
            className="font-archivo font-bold text-ink leading-snug text-left w-full hidden md:block"
          />
        </div>

        <div className="flex justify-between items-end pt-2 border-t border-hair mt-auto">
          <div className="flex items-center flex-nowrap gap-1 md:gap-1.5 min-w-0">
            <span className="text-base md:text-xl font-extrabold text-ink whitespace-nowrap">
              ₹{price?.toLocaleString()}
            </span>
            {mrp > price && (
              <span className="flex flex-col items-start leading-none whitespace-nowrap">
                <span className="gl-lbl text-[8px] md:text-[9px] text-save">
                  {Math.round(((mrp - price) / mrp) * 100)}% OFF
                </span>
                <span className="text-[9px] md:text-xs text-faint line-through mt-0.5">
                  ₹{mrp?.toLocaleString()}
                </span>
              </span>
            )}
          </div>

          <div className="hidden md:flex w-11 h-11 rounded-full border border-hair text-muted items-center justify-center group-hover:bg-ink group-hover:text-paper group-hover:border-ink transition-colors">
            <i className="fa-solid fa-arrow-right -rotate-45 group-hover:rotate-0 transition-transform duration-500"></i>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VariantCard;
