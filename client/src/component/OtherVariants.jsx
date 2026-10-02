import { useNavigate } from "react-router-dom";
import UnProductCard from "./UnProductCard";

/**
 * PDP section — "Explore other variants": the OTHER variants of the SAME
 * product currently open (excludes whichever one the visitor is looking at).
 *
 * Uses the very same card and grid as the "You may also like" row directly
 * below it, so the two read as one system — identical card size, spacing and
 * heading treatment, with only the contents differing. Each variant is handed
 * to the card shaped like a one-variant product, with an explicit href so the
 * card opens that variant's own page rather than the product's variant list.
 *
 * Placed after Reviews and before the cross-sell: reviews build trust in this
 * product first, this offers the other looks of the SAME product next, and
 * only then does the page branch into unrelated products.
 */
const MAX_SHOWN = 8;

const OtherVariants = ({ productId, productName, variants = [], currentVariantName }) => {
  const navigate = useNavigate();

  const others = variants.filter((v) => v.variantName !== currentVariantName);
  if (others.length === 0) return null;

  const shown = others.slice(0, MAX_SHOWN);
  const hasMore = others.length > shown.length;

  return (
    <div className="mt-16">
      <div className="flex items-end justify-between mb-6">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Explore other variants</h2>
        {hasMore && (
          <button
            onClick={() => navigate(`/products/${productId}`)}
            className="text-sm font-bold underline underline-offset-4 decoration-2 hover:text-brand"
          >
            View all {others.length} →
          </button>
        )}
      </div>

      {/* Single scrollable row (matches the old site's layout) instead of a
          multi-row grid — the card design itself is unchanged. */}
      <div
        className="flex gap-4 md:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ touchAction: "pan-x" }}
      >
        {shown.map((variant, index) => {
          const oos =
            variant?.variantOutOfStock === true ||
            (variant?.variantQuantity != null && Number(variant.variantQuantity) <= 0);

          /* Shaped like a product so the shared card can read it unchanged:
             one variant in variantDetails is all it needs for image, price
             and struck MRP. */
          const asProduct = {
            productId,
            productName: variant?.variantName || productName,
            productCategory: "Variant",
            variantDetails: [variant],
          };

          return (
            <div
              key={variant._id || variant.sku || variant.variantName || index}
              className="snap-start shrink-0 w-[160px] sm:w-[190px] md:w-[220px]"
            >
              <UnProductCard
                p={asProduct}
                index={index}
                listId="other_variants"
                listName={`${productName} — Other Variants`}
                href={`/product/${productId}/${variant?.sku || variant?.variantName}`}
                badge={oos ? "Out of stock" : null}
                showWishlist={false}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OtherVariants;
