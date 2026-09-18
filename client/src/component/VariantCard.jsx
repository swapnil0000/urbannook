import { useNavigate } from "react-router-dom";
import { trackSelectItem } from "../utils/analytics";

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
      className="group relative rounded-[1.6rem] overflow-hidden bg-black/20 border border-white/5 shadow-lg hover:shadow-2xl hover:border-[#F5DEB3]/30 transition-all duration-500 flex flex-col h-full cursor-pointer"
    >
      <div className="relative w-full aspect-square bg-[#f8f8f5] overflow-hidden">
        <img
          src={thumbnail}
          alt={variant?.variantName || productName}
          className="w-full h-full object-cover mix-blend-multiply transition-transform duration-[1.5s] group-hover:scale-110"
        />
        {oos && (
          <span className="absolute top-3 left-3 z-10 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-red-500 text-white shadow">
            Out of Stock
          </span>
        )}
      </div>

      <div className="p-4 md:p-4 flex flex-col flex-grow bg-[#f5f7f8]">
        <h3 className="font-serif text-gray-500 text-base md:text-lg leading-snug line-clamp-2 mb-2">
          {variant?.variantName}
        </h3>

        <div className="flex justify-between items-end pt-2 border-t border-[#F5DEB3]/10 mt-auto">
          <div className="flex items-center flex-nowrap gap-1 md:gap-1.5 min-w-0">
            <span className="text-base md:text-xl font-bold text-[#a89068] whitespace-nowrap">
              ₹{price?.toLocaleString()}
            </span>
            {mrp > price && (
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

          <div className="hidden md:flex w-12 h-12 rounded-full bg-[#F5DEB3]/10 text-gray-500 items-center justify-center group-hover:bg-[#F5DEB3] group-hover:text-[#2e443c] transition-all duration-300">
            <i className="fa-solid fa-arrow-right -rotate-45 group-hover:rotate-0 transition-transform duration-500"></i>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VariantCard;
