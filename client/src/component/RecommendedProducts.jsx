import { useRef } from "react";
import ProductCard from "./ProductCard";

/**
 * Horizontal, arrow-scrollable row of recommended products for the PDP. Uses
 * the shared ProductCard so it looks identical to the All Products grid.
 * Renders nothing when there are no (published) recommendations — the section
 * is admin-curated only, no fallback.
 *
 * @param {object[]} products  full product docs (from product.recommendedProductsDetails)
 * @param {string}   title
 */
const RecommendedProducts = ({ products = [], title = "You May Also Like" }) => {
  const scrollRef = useRef(null);

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
          <span className="text-[#F5DEB3] font-bold tracking-[0.2em] uppercase text-[16px]">
            Handpicked for you
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-white mt-2">{title}</h2>
        </div>
        {/* Arrow controls — shown on both web and mobile */}
        {/* <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Scroll left"
            className="w-10 h-10 rounded-full flex items-center justify-center bg-[#F5DEB3]/10 text-[#F5DEB3] border border-[#F5DEB3]/25 hover:bg-[#F5DEB3] hover:text-[#1c3026] active:scale-95 transition-all"
          >
            <i className="fa-solid fa-arrow-left text-sm" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Scroll right"
            className="w-10 h-10 rounded-full flex items-center justify-center bg-[#F5DEB3]/10 text-[#F5DEB3] border border-[#F5DEB3]/25 hover:bg-[#F5DEB3] hover:text-[#1c3026] active:scale-95 transition-all"
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
        {products.map((product, index) => (
          <div
            key={product.productId}
            className="snap-start shrink-0 w-[150px] sm:w-[170px] md:w-[185px]"
          >
            <ProductCard
              product={product}
              index={index}
              listId="recommended"
              listName="Recommended Products"
            />
          </div>
        ))}
      </div>
    </section>
  );
};

export default RecommendedProducts;
