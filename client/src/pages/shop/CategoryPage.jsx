import { useMemo, useState, useEffect, useRef, useCallback, memo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  useGetCategoriesQuery,
  useGetProductsByCategoryQuery,
} from '../../store/api/productsApi';
import SEOHead from '../../component/SEOHead';
import { trackViewItemList } from '../../utils/analytics';

const AUTO_IMAGE_INTERVAL = 3500; // carousel time

/* ─── Image carousel inside a product card ───────────────────────── */
const ImageCarousel = memo(({ images, productName }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const touchStartX = useRef(null);
  const timerRef = useRef(null);
  const containerRef = useRef(null);
  const total = images.length;

  const next = useCallback(() => setActiveIdx((i) => (i + 1) % total), [total]);
  const prev = useCallback(() => setActiveIdx((i) => (i - 1 + total) % total), [total]);

  // IntersectionObserver: only run the timer while the card is visible.
  // With 200 products on screen, this prevents ~195 redundant setIntervals.
  useEffect(() => {
    if (total <= 1) return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timerRef.current = setInterval(next, AUTO_IMAGE_INTERVAL);
        } else {
          clearInterval(timerRef.current);
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => {
      clearInterval(timerRef.current);
      observer.disconnect();
    };
  }, [next, total]);

  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current);
    if (total > 1) timerRef.current = setInterval(next, AUTO_IMAGE_INTERVAL);
  }, [next, total]);

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) { diff > 0 ? next() : prev(); resetTimer(); }
    touchStartX.current = null;
  };

  if (total === 0) {
    return (
      <div className="w-full aspect-square bg-[#edeae2] flex items-center justify-center rounded-t-2xl">
        <i className="fa-solid fa-image text-3xl text-gray-300" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-square overflow-hidden bg-[#f8f8f5] select-none rounded-t-2xl"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex h-full transition-transform duration-500 ease-in-out will-change-transform"
        style={{ width: `${total * 100}%`, transform: `translateX(-${(activeIdx / total) * 100}%)` }}
      >
        {images.map((src, i) => (
          <div key={i} className="h-full flex-shrink-0" style={{ width: `${100 / total}%` }}>
            <img
              src={src}
              alt={`${productName} ${i + 1}`}
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              className="w-full h-full object-cover mix-blend-multiply"
            />
          </div>
        ))}
      </div>

      {total > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setActiveIdx(i); resetTimer(); }}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === activeIdx ? 14 : 5,
                height: 5,
                background: i === activeIdx ? '#F5DEB3' : 'rgba(255,255,255,0.5)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
});
ImageCarousel.displayName = 'ImageCarousel';

/* ─── Minimal product card ───────────────────────────────────────── */
const ProductCard = memo(({ product, onClick }) => {
  const images = useMemo(() => {
    const imgs = [];
    for (const v of product.variantDetails || []) {
      for (const img of v.variantImage || []) {
        if (img && !imgs.includes(img)) imgs.push(img);
      }
    }
    return imgs;
  }, [product.variantDetails]);

  return (
    <div
      className="group flex-shrink-0 w-[160px] sm:w-[190px] md:w-[210px] rounded-2xl overflow-hidden
                 cursor-pointer bg-white/5 border border-[#a89068]/40
                 hover:border-[#F5DEB3] hover:shadow-xl transition-all duration-400"
      onClick={onClick}
    >
      <ImageCarousel images={images} productName={product.productName} />
      <div className="px-3 bg-[#faf9f6] rounded-b-2xl h-[52px] flex items-center">
        <p className="text-sm font-serif text-[#2e443c] leading-snug line-clamp-2
                      group-hover:text-[#4a6b5d] transition-colors duration-300">
          {product.productName}
        </p>
      </div>
    </div>
  );
});
ProductCard.displayName = 'ProductCard';

/* ─── Horizontal scroll row per sub-category ────────────────────── */
const ProductRow = memo(({ products, onProductClick }) => {
  const rowRef = useRef(null);
  const [activeDot, setActiveDot] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // ~210px card + 16px gap
  const SCROLL_STEP = 226;

  const updateState = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
    const maxScroll = scrollWidth - clientWidth;
    const numDots = Math.max(1, Math.ceil(products.length / 3));
    setActiveDot(maxScroll > 0 ? Math.round((scrollLeft / maxScroll) * (numDots - 1)) : 0);
  }, [products.length]);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateState, { passive: true });
    updateState();
    return () => el.removeEventListener('scroll', updateState);
  }, [updateState]);

  const scrollBy = (dir) => {
    rowRef.current?.scrollBy({ left: dir * SCROLL_STEP, behavior: 'smooth' });
  };

  const numDots = Math.max(1, Math.ceil(products.length / 3));

  return (
    <div className="relative">
      {/* Left arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scrollBy(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-20
                     w-9 h-9 rounded-full bg-[#2e443c] border border-white/15
                     flex items-center justify-center shadow-lg
                     hover:bg-[#F5DEB3] hover:border-[#F5DEB3] hover:text-[#2e443c]
                     text-white transition-all duration-300"
          aria-label="Scroll left"
        >
          <i className="fa-solid fa-chevron-left text-xs" />
        </button>
      )}

      {/* Scroll container */}
      <div
        ref={rowRef}
        className="flex gap-4 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {products.map((product) => (
          <ProductCard
            key={product.productId}
            product={product}
            onClick={() => onProductClick(product.productId)}
          />
        ))}
      </div>

      {/* Right arrow */}
      {canScrollRight && (
        <button
          onClick={() => scrollBy(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-20
                     w-9 h-9 rounded-full bg-[#2e443c] border border-white/15
                     flex items-center justify-center shadow-lg
                     hover:bg-[#F5DEB3] hover:border-[#F5DEB3] hover:text-[#2e443c]
                     text-white transition-all duration-300"
          aria-label="Scroll right"
        >
          <i className="fa-solid fa-chevron-right text-xs" />
        </button>
      )}

      {/* Position dots — shown below the row */}
      {numDots > 1 && (
        <div className="flex items-center justify-center gap-[6px] mt-3">
          {Array.from({ length: numDots }).map((_, i) => (
            <span
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === activeDot ? 18 : 6,
                height: 6,
                background:
                  i === activeDot
                    ? '#F5DEB3'
                    : i === activeDot + 1
                    ? 'rgba(245,222,179,0.3)'
                    : 'rgba(245,222,179,0.15)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
});
ProductRow.displayName = 'ProductRow';

/* ─── Main page ──────────────────────────────────────────────────── */
const CategoryPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categorySlug = searchParams.get('category');
  const subCategorySlug = searchParams.get('subcategory');

  useEffect(() => { window.scrollTo(0, 0); }, [categorySlug]);

  const { data: catData, isLoading: catsLoading } = useGetCategoriesQuery(undefined, {
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });

  const category = useMemo(() => {
    const all = catData?.data || [];
    return all.find((c) => c.slug === categorySlug) || null;
  }, [catData, categorySlug]);

  const subCategory = useMemo(() => {
    if (!subCategorySlug || !category) return null;
    return category.subcategories?.find((s) => s.slug === subCategorySlug) || null;
  }, [category, subCategorySlug]);

  const productsQueryArgs = useMemo(() => {
    const args = { category: categorySlug, limit: 200 };
    if (subCategorySlug) args.subCategory = subCategorySlug;
    return args;
  }, [categorySlug, subCategorySlug]);

  const { data: productsData, isLoading: productsLoading } = useGetProductsByCategoryQuery(
    productsQueryArgs,
    {
      skip: !categorySlug,
      refetchOnMountOrArgChange: false,
      refetchOnFocus: false,
      refetchOnReconnect: false,
    }
  );

  const allProducts = useMemo(
    () => productsData?.data?.listofPublishedProducts || productsData?.data?.products || [],
    [productsData]
  );

  const groups = useMemo(() => {
    const map = new Map();
    for (const p of allProducts) {
      const key = p.productSubCategory || '__none__';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    }
    const ordered = [];
    for (const sub of category?.subcategories || []) {
      if (map.has(sub.name)) {
        ordered.push({ heading: sub.name, products: map.get(sub.name) });
        map.delete(sub.name);
      }
    }
    for (const [key, products] of map.entries()) {
      ordered.push({ heading: key === '__none__' ? null : key, products });
    }
    return ordered;
  }, [allProducts, category]);

  useEffect(() => {
    if (allProducts.length > 0) {
      trackViewItemList({
        listName: category?.name || categorySlug,
        listId: `shop_${categorySlug}`,
        items: allProducts.map((p, i) => ({
          itemId: p.productId,
          itemName: p.productName,
          price: p.variantDetails?.[0]?.variantPrice || 0,
          index: i,
        })),
      });
    }
  }, [allProducts]);

  const isLoading = catsLoading || productsLoading;

  return (
    <div className="min-h-screen bg-[#2e443c] relative font-sans pb-20">
      <SEOHead
        title={`${subCategorySlug ? (subCategory?.name || subCategorySlug) : (category?.name || categorySlug)} — UrbanNook`}
        description={`Shop ${subCategorySlug ? (subCategory?.name || subCategorySlug) : (category?.name || categorySlug)} on UrbanNook.`}
        url={subCategorySlug ? `/shop?category=${categorySlug}&subcategory=${subCategorySlug}` : `/shop?category=${categorySlug}`}
      />

      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F5DEB3]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/2 left-0 w-[300px] h-[300px] bg-[#F5DEB3]/3 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <section className="pt-[5rem] pb-6 md:pt-[7rem] md:pb-8 px-5 md:px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 mb-5 flex-wrap">
            <Link to="/" className="hover:text-[#F5DEB3] transition-colors">Home</Link>
            <span>/</span>
            {subCategorySlug ? (
              <>
                <Link to={`/shop?category=${categorySlug}`} className="hover:text-[#F5DEB3] transition-colors">
                  {category?.name || categorySlug}
                </Link>
                <span>/</span>
                <span className="text-[#F5DEB3]/70">{subCategory?.name || subCategorySlug}</span>
              </>
            ) : (
              <span className="text-[#F5DEB3]/70">{category?.name || categorySlug}</span>
            )}
          </nav>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-white leading-[0.95] mb-6">
            {subCategorySlug ? (subCategory?.name || subCategorySlug) : (category?.name || categorySlug)}
          </h1>

        </div>
      </section>

      {/* Sub-category rows */}
      <section className="px-5 md:px-8 relative z-10">
        <div className="max-w-7xl mx-auto space-y-12">

          {allProducts.length === 0 && (
            <p className="text-white/40 text-sm py-10 text-center">No products</p>
          )}

          {groups.map(({ heading, products }) => (
            <div key={heading || 'other'}>
              {/* Sub-category heading */}
              {heading && (
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-1 h-6 bg-[#F5DEB3] rounded-full flex-shrink-0" />
                  <h2 className="text-xl md:text-2xl font-serif text-white">{heading}</h2>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/30">
                    {products.length} item{products.length !== 1 ? 's' : ''}
                  </span>
                  <div className="flex-1 h-px bg-white/8" />
                </div>
              )}

              {/* Horizontal scroll row */}
              <ProductRow
                products={products}
                onProductClick={(id) => navigate(`/shop?product=${id}`)}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default CategoryPage;
