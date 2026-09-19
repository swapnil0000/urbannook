import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import MinimalCard from "./MinimalCard";
import { trackSelectItem } from "../utils/analytics";

/**
 * Horizontal, arrow-scrollable row of recommended products for the PDP.
 * Uses the shared MinimalCard (name + price only) — deliberately its own
 * look, separate from the shop grid's ProductCard, per how this section was
 * asked to be redesigned. Renders nothing when there are no (published)
 * recommendations — the section is admin-curated only, no fallback.
 *
 * @param {object[]} products  full product docs (from product.recommendedProductsDetails)
 * @param {string}   title
 */
const RecommendedProducts = ({ products = [], title = "You May Also Like" }) => {
  const scrollRef = useRef(null);
  const navigate = useNavigate();

  if (!products?.length) return null;

  const scrollBy = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    // Scroll by roughly one card + gap so each tap advances one item.
    const amount = Math.max(240, Math.round(el.clientWidth * 0.8));
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  return (
    <section className="mt-8 sm:mt-12 md:mt-16 px-4 lg:px-12 pt-4 sm:pt-6">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-6">
        <div className="flex-1">
          <p className="gl-lbl text-brand mb-2">Handpicked for you</p>
          <h2 className="font-archivo text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">{title}</h2>
        </div>
        {/* Arrow controls — shown on both web and mobile */}
        {/* <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Scroll left"
            className="gl-press w-10 h-10 rounded-full flex items-center justify-center border border-hair text-ink hover:bg-ink hover:text-paper hover:border-ink transition-colors"
          >
            <i className="fa-solid fa-arrow-left text-sm" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Scroll right"
            className="gl-press w-10 h-10 rounded-full flex items-center justify-center border border-hair text-ink hover:bg-ink hover:text-paper hover:border-ink transition-colors"
          >
            <i className="fa-solid fa-arrow-right text-sm" />
          </button>
        </div> */}
      </div>

      {/* Scroller — native horizontal scroll/swipe + snap; scrollbar hidden */}
      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ touchAction: "pan-x" }}
      >
        {products.map((product, index) => {
          const firstVariant = product?.variantDetails?.[0];
          const price = Number(product?.effectivePrice ?? firstVariant?.variantPrice ?? 0);
          const active = (product?.variantDetails || []).filter((v) => v.isActive !== false);
          const oos =
            product?.productStatus === "out_of_stock" ||
            (active.length > 0 &&
              active.every(
                (v) =>
                  v.variantOutOfStock === true ||
                  (v.variantQuantity != null && Number(v.variantQuantity) <= 0),
              ));
          const badge = oos
            ? { label: "Out of Stock", className: "bg-ink text-white" }
            : null;

          return (
            <div
              key={product.productId}
              className="snap-start shrink-0 w-[150px] sm:w-[170px] md:w-[185px]"
            >
              <MinimalCard
                image={firstVariant?.variantImage?.[0]}
                alt={product.productName}
                title={product.productName}
                price={price}
                pricePrefix="Starting at"
                badge={badge}
                onClick={() => {
                  trackSelectItem({
                    itemId: product.productId,
                    itemName: product.productName,
                    itemVariant: firstVariant?.variantName,
                    price,
                    listId: "recommended",
                    listName: "Recommended Products",
                    index,
                  });
                  navigate(`/products/${product.productId}`);
                }}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default RecommendedProducts;
