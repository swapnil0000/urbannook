import { useMemo, useState, useEffect, useRef, useCallback, memo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  useGetCategoriesQuery,
  useGetProductsByCategoryQuery,
} from '../../store/api/productsApi';
import SEOHead from '../../component/SEOHead';
import { trackViewItemList } from '../../utils/analytics';

const AUTO_IMAGE_INTERVAL = 2000;

/* ─── Image carousel inside a product card ───────────────────────── */
const ImageCarousel = memo(({ images, productName }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const touchStartX = useRef(null);
  const timerRef = useRef(null);
  const total = images.length;

  const next = useCallback(() => setActiveIdx((i) => (i + 1) % total), [total]);
  const prev = useCallback(() => setActiveIdx((i) => (i - 1 + total) % total), [total]);

  useEffect(() => {
    if (total <= 1) return;
    timerRef.current = setInterval(next, AUTO_IMAGE_INTERVAL);
    return () => clearInterval(timerRef.current);
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
                 cursor-pointer bg-white/5 border border-white/8
                 hover:border-[#F5DEB3]/35 hover:shadow-xl transition-all duration-400"
      onClick={onClick}
    >
      <ImageCarousel images={images} productName={product.productName} />
      <div className="px-3 py-2.5">
        <p className="text-sm font-serif text-white/90 leading-snug line-clamp-2
                      group-hover:text-[#F5DEB3] transition-colors duration-300">
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
  const { categorySlug } = useParams();
  const [searchQuery, setSearchQuery] = useState('');

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

  const { data: productsData, isLoading: productsLoading } = useGetProductsByCategoryQuery(
    { category: category?.name, limit: 200 },
    {
      skip: !category?.name,
      refetchOnMountOrArgChange: false,
      refetchOnFocus: false,
      refetchOnReconnect: false,
    }
  );

  const allProducts = useMemo(
    () => productsData?.data?.listofPublishedProducts || productsData?.data?.products || [],
    [productsData]
  );

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return allProducts;
    const q = searchQuery.toLowerCase();
    return allProducts.filter(
      (p) =>
        p.productName?.toLowerCase().includes(q) ||
        p.productSubCategory?.toLowerCase().includes(q) ||
        p.productDes?.toLowerCase().includes(q)
    );
  }, [allProducts, searchQuery]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const p of filteredProducts) {
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
  }, [filteredProducts, category]);

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
        title={`${category?.name || categorySlug} — UrbanNook`}
        description={`Shop ${category?.name || categorySlug} on UrbanNook.`}
        url={`/shop/${categorySlug}`}
      />

      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F5DEB3]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/2 left-0 w-[300px] h-[300px] bg-[#F5DEB3]/3 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <section className="pt-[5rem] pb-6 md:pt-[7rem] md:pb-8 px-5 md:px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 mb-5 flex-wrap">
            <Link to="/" className="hover:text-[#F5DEB3] transition-colors">Home</Link>
            <span>/</span>
            <span className="text-[#F5DEB3]/70">{category?.name || categorySlug}</span>
          </nav>

          <div className="flex items-center gap-3 mb-2">
            <span className="w-2 h-2 bg-[#F5DEB3] rounded-full animate-pulse" />
            <span className="text-[#F5DEB3] font-mono text-xs tracking-[0.3em] uppercase">
              {allProducts.length > 0 ? `${allProducts.length} Products` : 'Collection'}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-white leading-[0.95] mb-6">
            {category?.name || categorySlug}
          </h1>

          {/* Search */}
          <div className="relative max-w-xl">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <i className="fa-solid fa-magnifying-glass text-white/30 text-sm" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search in ${category?.name || 'this category'}…`}
              className="w-full pl-11 pr-10 py-3.5 rounded-2xl
                         bg-white/8 border border-white/10 text-white placeholder-white/30
                         text-sm font-light focus:outline-none focus:border-[#F5DEB3]/40
                         focus:bg-white/12 transition-all duration-300"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-4 flex items-center text-white/30 hover:text-white/60 transition-colors"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            )}
          </div>

          {searchQuery && (
            <p className="mt-3 text-xs text-white/40 font-mono">
              {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''} for &ldquo;{searchQuery}&rdquo;
            </p>
          )}
        </div>
      </section>

      {/* Sub-category rows */}
      <section className="px-5 md:px-8 relative z-10">
        <div className="max-w-7xl mx-auto space-y-12">

          {isLoading && (
            <div className="flex justify-center py-32">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#F5DEB3]" />
            </div>
          )}

          {!isLoading && filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 bg-black/10 rounded-[2rem] border border-white/5">
              <i className="fa-solid fa-box-open text-4xl text-[#F5DEB3]/40 mb-4" />
              <h2 className="text-xl font-serif text-white mb-2">
                {searchQuery ? 'No results found' : 'No products yet'}
              </h2>
              <p className="text-white/40 text-sm">
                {searchQuery ? 'Try a different search term' : 'This collection is being curated.'}
              </p>
            </div>
          )}

          {!isLoading && groups.map(({ heading, products }) => (
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
                onProductClick={(id) => navigate(`/product/${id}`)}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default CategoryPage;
