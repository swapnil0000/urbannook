import { useMemo, useState, useRef, useCallback, memo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGetCategoriesQuery, useGetProductsQuery, useSearchProductsQuery } from '../../store/api/productsApi';
import SEOHead from '../../component/SEOHead';

/* ─── Static product card (no auto-carousel for performance) ─────── */
const SlimCard = memo(({ product, onClick }) => {
  const img = product.variantDetails?.[0]?.variantImage?.[0] || product.productImg || null;
  const price = product.variantDetails?.[0]?.variantPrice;

  return (
    <div
      className="flex-shrink-0 w-[155px] sm:w-[185px] md:w-[205px] rounded-2xl overflow-hidden cursor-pointer
                 bg-white/5 border border-[#a89068]/40 hover:border-[#F5DEB3] hover:shadow-xl
                 transition-all duration-300 group"
      onClick={onClick}
    >
      <div className="w-full aspect-square bg-[#f8f8f5] overflow-hidden rounded-t-2xl">
        {img ? (
          <img
            src={img}
            alt={product.productName}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <i className="fa-solid fa-image text-3xl text-gray-300" />
          </div>
        )}
      </div>
      <div className="px-3 py-2.5 bg-[#faf9f6] rounded-b-2xl">
        <p className="text-sm font-serif text-[#2e443c] leading-snug line-clamp-2 group-hover:text-[#4a6b5d] transition-colors duration-300">
          {product.productName}
        </p>
        {price > 0 && (
          <p className="text-xs text-[#2e443c]/60 mt-1 font-mono">₹{price.toLocaleString()}</p>
        )}
      </div>
    </div>
  );
});
SlimCard.displayName = 'SlimCard';

/* ─── Horizontal scroll row ──────────────────────────────────────── */
const SlimRow = memo(({ products, onProductClick }) => {
  const rowRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeDot, setActiveDot] = useState(0);
  const SCROLL_STEP = 221;

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

  const scrollBy = (dir) => rowRef.current?.scrollBy({ left: dir * SCROLL_STEP, behavior: 'smooth' });
  const numDots = Math.max(1, Math.ceil(products.length / 3));

  return (
    <div className="relative">
      {canScrollLeft && (
        <button
          onClick={() => scrollBy(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-20 w-9 h-9 rounded-full
                     bg-[#2e443c] border border-white/15 flex items-center justify-center shadow-lg
                     hover:bg-[#F5DEB3] hover:border-[#F5DEB3] hover:text-[#2e443c] text-white
                     transition-all duration-300"
          aria-label="Scroll left"
        >
          <i className="fa-solid fa-chevron-left text-xs" />
        </button>
      )}

      <div
        ref={rowRef}
        className="flex gap-4 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {products.map((product) => (
          <SlimCard
            key={product.productId}
            product={product}
            onClick={() => onProductClick(product.productId)}
          />
        ))}
      </div>

      {canScrollRight && (
        <button
          onClick={() => scrollBy(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-20 w-9 h-9 rounded-full
                     bg-[#2e443c] border border-white/15 flex items-center justify-center shadow-lg
                     hover:bg-[#F5DEB3] hover:border-[#F5DEB3] hover:text-[#2e443c] text-white
                     transition-all duration-300"
          aria-label="Scroll right"
        >
          <i className="fa-solid fa-chevron-right text-xs" />
        </button>
      )}

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
SlimRow.displayName = 'SlimRow';

/* ─── Main page ──────────────────────────────────────────────────── */
const AllProductsPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef(null);
  const searchRef = useRef(null);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handler, { passive: true });
    return () => window.removeEventListener('resize', handler);
  }, []);

  const [activeCategory, setActiveCategory] = useState('');
  const [activeSubCategory, setActiveSubCategory] = useState('');

  const handleSearchChange = useCallback((e) => {
    const val = e.target.value;
    setSearchQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(val.trim()), 350);
  }, []);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const shouldSearch = debouncedQuery.length >= 2;
  const { data: searchData, isFetching: searchFetching } = useSearchProductsQuery(
    { search: debouncedQuery, limit: 8 },
    { skip: !shouldSearch }
  );
  const searchResults = useMemo(
    () => searchData?.data?.listofPublishedProducts || [],
    [searchData]
  );
  const showDropdown = searchFocused && searchQuery.length >= 2;

  const { data: catData } = useGetCategoriesQuery(undefined, {
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });
  const categories = useMemo(() => catData?.data || [], [catData]);

  const subCategories = useMemo(() => {
    if (!activeCategory) return [];
    const cat = categories.find(c => c.name === activeCategory || c.slug === activeCategory);
    return (cat?.subcategories || []).map(s => s.name);
  }, [activeCategory, categories]);

  const { data: productsData, isLoading } = useGetProductsQuery(
    { page: 1, limit: 300 },
    { refetchOnMountOrArgChange: false, refetchOnFocus: false, refetchOnReconnect: false }
  );

  const allProducts = useMemo(
    () => productsData?.data?.listofPublishedProducts || productsData?.data?.products || [],
    [productsData]
  );

  const categoryGroups = useMemo(() => {
    if (!allProducts.length) return [];

    const map = new Map();
    for (const p of allProducts) {
      const key = p.categorySlug || p.productCategory?.toLowerCase().replace(/\s+/g, '-') || '__other__';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    }

    const groups = [];

    for (const cat of categories) {
      const prods = map.get(cat.slug);
      if (!prods?.length) continue;

      // Build subcategory position index for sorting
      const subcatNameOrder = new Map((cat.subcategories || []).map((s, i) => [s.name, i]));
      const subcatSlugOrder = new Map((cat.subcategories || []).map((s, i) => [s.slug, i]));

      // Sort all products by subcategory order (desktop) — same base for both views
      const sorted = [...prods].sort((a, b) => {
        const ai = subcatNameOrder.get(a.productSubCategory) ?? subcatSlugOrder.get(a.subCategorySlug) ?? 999;
        const bi = subcatNameOrder.get(b.productSubCategory) ?? subcatSlugOrder.get(b.subCategorySlug) ?? 999;
        return ai - bi;
      });

      let displayProducts;
      if (isMobile) {
        // One product per subcategory, max 3 cards — no scroll needed
        const seenSub = new Set();
        displayProducts = [];
        for (const p of sorted) {
          const subKey = p.productSubCategory || p.subCategorySlug || '__none__';
          if (!seenSub.has(subKey)) {
            seenSub.add(subKey);
            displayProducts.push(p);
            if (displayProducts.length === 3) break;
          }
        }
      } else {
        displayProducts = sorted;
      }

      groups.push({ cat, products: displayProducts });
      map.delete(cat.slug);
    }

    // Orphaned products (category not in categories list)
    for (const [key, prods] of map.entries()) {
      if (prods.length) {
        const name = prods[0].productCategory || key;
        groups.push({ cat: { name, slug: key, _id: key }, products: prods });
      }
    }

    return groups;
  }, [allProducts, categories, isMobile]);

  return (
    <div className="min-h-screen bg-[#2e443c] relative font-sans pb-20">
      <SEOHead
        title="Shop All — UrbanNook"
        description="Browse UrbanNook's full collection of premium lifestyle products, organized by category."
        url="/products"
      />

      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F5DEB3]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-0 w-[300px] h-[300px] bg-[#F5DEB3]/3 rounded-full blur-[100px] pointer-events-none" />

      {/* Page header */}
      <section className="pt-[5rem] pb-8 md:pt-[7rem] md:pb-8 px-5 md:px-8 relative z-20">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 mb-5">
            <Link to="/" className="hover:text-[#F5DEB3] transition-colors">Home</Link>
            <span>/</span>
            <span className="text-[#F5DEB3]/70">Shop All</span>
          </nav>

          <div className="flex items-center gap-3 mb-2">
            <span className="w-2 h-2 bg-[#F5DEB3] rounded-full animate-pulse" />
            <span className="text-[#F5DEB3] font-mono text-xs tracking-[0.3em] uppercase">
              {allProducts.length > 0 ? `${allProducts.length} Products` : 'All Collections'}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-white leading-[0.95] mb-6">
            Shop All
          </h1>

          {/* Search bar */}
          <div className="relative max-w-xl" ref={searchRef}>
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/10 border border-white/15 focus-within:bg-white/15 focus-within:border-[#F5DEB3]/40 transition-all">
              <i className="fa-solid fa-magnifying-glass text-white/40 text-sm shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                placeholder="Search products…"
                autoComplete="off"
                className="flex-1 bg-transparent text-white placeholder-white/30 text-sm focus:outline-none"
              />
              {searchFetching && (
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin shrink-0" />
              )}
              {searchQuery && !searchFetching && (
                <button onClick={() => { setSearchQuery(''); setDebouncedQuery(''); }} className="shrink-0">
                  <i className="fa-solid fa-xmark text-white/40 hover:text-white/70 text-sm transition-colors" />
                </button>
              )}
            </div>

            {/* Dropdown results */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 max-h-80 overflow-y-auto">
                {searchFetching && (
                  <div className="px-4 py-3 text-sm text-gray-400">Searching…</div>
                )}
                {!searchFetching && searchResults.length === 0 && (
                  <div className="px-4 py-3 text-sm text-gray-400">No results for "{debouncedQuery}"</div>
                )}
                {!searchFetching && searchResults.map((p) => {
                  const img = p.variantDetails?.[0]?.variantImage?.[0] || p.productImg || null;
                  const price = p.variantDetails?.[0]?.variantPrice;
                  return (
                    <button
                      key={p.productId}
                      onMouseDown={() => navigate(`/shop?product=${p.productId}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                        {img ? (
                          <img src={img} alt={p.productName} className="w-full h-full object-cover mix-blend-multiply" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <i className="fa-solid fa-image text-xs text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.productName}</p>
                        <p className="text-xs text-gray-400 truncate">{p.productCategory}</p>
                      </div>
                      {price > 0 && <span className="text-sm font-semibold text-[#a89068] shrink-0">₹{price.toLocaleString()}</span>}
                      <i className="fa-solid fa-arrow-right text-[10px] text-gray-300 shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sub-category pills — shown only when a category is active */}
          {activeCategory && subCategories.length > 0 && (
            <div className="flex items-center gap-2 mt-2 overflow-x-auto no-scrollbar px-1">
              <button
                onClick={() => setActiveSubCategory('')}
                className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  !activeSubCategory
                    ? 'bg-white/20 text-white'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                All {activeCategory}
              </button>
              {subCategories.map((sub) => (
                <button
                  key={sub}
                  onClick={() => setActiveSubCategory(sub === activeSubCategory ? '' : sub)}
                  className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap ${
                    activeSubCategory === sub
                      ? 'bg-white/20 text-white'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Category rows */}
      <section className="px-5 md:px-8 relative z-10">
        <div className="max-w-7xl mx-auto space-y-14">

          {isLoading && (
            <div className="flex justify-center py-32">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#F5DEB3]" />
            </div>
          )}

          {!isLoading && categoryGroups.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 bg-black/10 rounded-[2rem] border border-white/5">
              <i className="fa-solid fa-box-open text-4xl text-[#F5DEB3]/40 mb-4" />
              <h2 className="text-xl font-serif text-white mb-2">No products yet</h2>
              <p className="text-white/40 text-sm">This collection is being curated.</p>
            </div>
          )}

          {!isLoading && categoryGroups.map(({ cat, products }) => (
            <div key={cat.slug || cat._id}>
              {/* Category heading */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-1 h-6 bg-[#F5DEB3] rounded-full flex-shrink-0" />
                <Link
                  to={`/shop?category=${cat.slug}`}
                  className="text-xl md:text-2xl font-serif text-white hover:text-[#F5DEB3] transition-colors"
                >
                  {cat.name}
                </Link>
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/30">
                  {products.length} item{products.length !== 1 ? 's' : ''}
                </span>
                <div className="flex-1 h-px bg-white/8" />
                <Link
                  to={`/shop?category=${cat.slug}`}
                  className="text-[10px] font-mono uppercase tracking-widest text-[#F5DEB3]/60
                             hover:text-[#F5DEB3] transition-colors flex items-center gap-1 shrink-0"
                >
                  View All <i className="fa-solid fa-arrow-right text-[9px]" />
                </Link>
              </div>

              <SlimRow products={products} onProductClick={(id) => navigate(`/shop?product=${id}`)} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AllProductsPage;
