import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import MinimalCard from "./MinimalCard";
import { trackSelectItem } from "../utils/analytics";

/**
 * PDP section — "Explore Other Variants": the OTHER variants of the SAME
 * product currently open (excludes whichever one the visitor is looking
 * at), shown with the shared MinimalCard — its own look, deliberately kept
 * separate from the /products/:id variant-list page's VariantCard, per how
 * this section was asked to be redesigned. Capped to a handful so it stays
 * a teaser, not the full list — "View all" routes to the full
 * /products/:id variant page for the rest.
 *
 * Placed after Reviews and before RecommendedProducts on the PDP: reviews
 * build trust in this product first, this offers the other looks of the
 * SAME product next, and only then does the page branch into unrelated
 * cross-sell (RecommendedProducts).
 */
const MAX_SHOWN = 6;

const OtherVariants = ({ productId, productName, variants = [], currentVariantName }) => {
  const navigate = useNavigate();
  const scrollRef = useRef(null);

  const others = variants.filter((v) => v.variantName !== currentVariantName);
  if (others.length === 0) return null;

  const shown = others.slice(0, MAX_SHOWN);
  const hasMore = others.length > shown.length;

  return (
    <section className="mt-8 sm:mt-12 md:mt-16 px-4 lg:px-12 pt-4 sm:pt-6">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-6">
        <div className="flex-1">
          <span className="text-[#F5DEB3] font-bold tracking-[0.2em] uppercase text-[16px]">
            Explore Other Variants
          </span>
          {/* <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-white mt-2">
            Explore Other Variants
          </h2> */}
        </div>
        {/* {hasMore && (
          <button
            type="button"
            onClick={() => navigate(`/products/${productId}`)}
            className="text-[#F5DEB3]/80 hover:text-[#F5DEB3] text-xs font-bold uppercase tracking-widest border-b border-[#F5DEB3]/30 hover:border-[#F5DEB3] pb-1 transition-colors shrink-0 self-start sm:self-auto"
          >
            View all {others.length} <i className="fa-solid fa-arrow-right ml-1 text-[10px]" />
          </button>
        )} */}
      </div>

      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ touchAction: "pan-x" }}
      >
        {shown.map((variant, index) => {
          const price = Number(variant?.variantPrice || 0);
          const mrp = Number(variant?.variantMrp || 0);
          const oos =
            variant?.variantOutOfStock === true ||
            (variant?.variantQuantity != null &&
              Number(variant.variantQuantity) <= 0);
          const badge = oos
            ? { label: "Out of Stock", className: "bg-red-500 text-white" }
            : null;

          return (
            <div
              key={variant._id || variant.sku || variant.variantName}
              className="snap-start shrink-0 w-[150px] sm:w-[170px] md:w-[185px]"
            >
              <MinimalCard
                image={variant?.variantImage?.[0]}
                alt={variant?.variantName || productName}
                title={variant?.variantName}
                price={price}
                mrp={mrp}
                badge={badge}
                onClick={() => {
                  trackSelectItem({
                    itemId: productId,
                    itemName: productName,
                    itemVariant: variant?.variantName,
                    price,
                    listId: "other_variants",
                    listName: `${productName} — Other Variants`,
                    index,
                  });
                  navigate(
                    `/product/${productId}/${variant?.sku || variant?.variantName}`,
                  );
                }}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default OtherVariants;
