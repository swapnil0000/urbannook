import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useGetCategoriesQuery, useGetProductsQuery } from '../../store/api/productsApi';

// ─── Image Carousel ───────────────────────────────────────────────────────────
const ImageCarousel = ({ images }) => {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);
  const startX = useRef(null);
  const valid = useMemo(() => images.filter(Boolean), [images]);

  const go = useCallback((next) => {
    setIdx(next);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setIdx(i => (i + 1) % valid.length), 2000);
  }, [valid.length]);

  useEffect(() => {
    if (valid.length <= 1) return;
    timerRef.current = setInterval(() => setIdx(i => (i + 1) % valid.length), 2000);
    return () => clearInterval(timerRef.current);
  }, [valid.length]);

  if (!valid.length) {
    return (
      <div className="w-full h-full bg-stone-100 flex items-center justify-center">
        <i className="fa-regular fa-image text-2xl text-stone-300"></i>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      onTouchStart={e => { startX.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        const diff = startX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 30) go((idx + (diff > 0 ? 1 : -1) + valid.length) % valid.length);
      }}
    >
      <img src={valid[idx]} alt="" className="w-full h-full object-cover" loading="lazy" />
      {valid.length > 1 && (
        <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1 pointer-events-none">
          {valid.map((_, i) => (
            <span key={i} className={`rounded-full transition-all duration-300 ${i === idx ? 'w-3 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Product Card ─────────────────────────────────────────────────────────────
const ProductCard = ({ product, onClick }) => {
  const images = useMemo(() => {
    const raw = product.variantDetails?.flatMap(v => v.variantImage || []) || [];
    if (product.productImg) raw.unshift(product.productImg);
    const seen = new Set();
    return raw.filter(u => u && !seen.has(u) && seen.add(u));
  }, [product]);

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-36 sm:w-44 text-left group"
    >
      <div className="w-full aspect-square rounded-2xl overflow-hidden bg-stone-100 shadow-sm group-hover:shadow-md transition-shadow duration-300">
        <ImageCarousel images={images} />
      </div>
      <p className="mt-2 text-xs sm:text-sm font-semibold text-[#2e443c] line-clamp-2 leading-snug px-0.5">
        {product.productName}
      </p>
    </button>
  );
};

// ─── Horizontal Product Row ───────────────────────────────────────────────────
const ProductRow = ({ products, onProductClick }) => {
  const rowRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const sync = () => {
    const el = rowRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  useEffect(() => { setTimeout(sync, 100); }, [products]);

  const scroll = (dir) => {
    rowRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' });
    setTimeout(sync, 350);
  };

  return (
    <div className="relative">
      {canLeft && (
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 top-[40%] -translate-y-1/2 -translate-x-3 z-10 w-7 h-7 bg-white/95 rounded-full shadow-md flex items-center justify-center text-[#2e443c] hover:bg-white transition-colors"
        >
          <i className="fa-solid fa-chevron-left text-xs"></i>
        </button>
      )}
      <div ref={rowRef} onScroll={sync} className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
        {products.map(p => (
          <ProductCard
            key={p._id?.$oid || p._id || p.productId}
            product={p}
            onClick={() => onProductClick(p)}
          />
        ))}
      </div>
      {canRight && (
        <button
          onClick={() => scroll(1)}
          className="absolute right-0 top-[40%] -translate-y-1/2 translate-x-3 z-10 w-7 h-7 bg-white/95 rounded-full shadow-md flex items-center justify-center text-[#2e443c] hover:bg-white transition-colors"
        >
          <i className="fa-solid fa-chevron-right text-xs"></i>
        </button>
      )}
    </div>
  );
};

// ─── Category Grid (default /shop view) ──────────────────────────────────────
const CategoryGrid = ({ categories, onCategoryClick }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
    {categories.map(cat => (
      <button
        key={cat.slug}
        onClick={() => onCategoryClick(cat)}
        className="group text-left rounded-2xl overflow-hidden border border-stone-100 hover:border-[#a89068]/50 shadow-sm hover:shadow-lg transition-all duration-300 bg-white"
      >
        <div className="w-full aspect-square overflow-hidden bg-stone-50">
          {cat.image ? (
            <img
              src={cat.image}
              alt={cat.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-emerald-50">
              <i className="fa-solid fa-tag text-3xl text-emerald-200"></i>
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="font-bold text-sm text-[#2e443c] group-hover:text-emerald-700 transition-colors">
            {cat.name}
          </p>
          {cat.subcategories?.length > 0 && (
            <p className="text-[10px] text-stone-400 mt-0.5 uppercase tracking-wide">
              {cat.subcategories.map(s => s.name).join(' · ')}
            </p>
          )}
        </div>
      </button>
    ))}
  </div>
);

// ─── Main Shop Page ───────────────────────────────────────────────────────────
const ShopPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const categorySlug = searchParams.get('category') || '';
  const subcategorySlug = searchParams.get('subcategory') || '';
  const [search, setSearch] = useState('');

  const { data: categoriesData, isLoading: catsLoading } = useGetCategoriesQuery(undefined, {
    refetchOnMountOrArgChange: false,
  });
  const categories = categoriesData?.data || [];

  const activeCategory = categories.find(c => c.slug === categorySlug) || null;
  const activeSubcategory = activeCategory?.subcategories?.find(s => s.slug === subcategorySlug) || null;

  const { data: productsData, isLoading: prodsLoading } = useGetProductsQuery(
    { category: activeCategory?.name, limit: 200 },
    { skip: !activeCategory }
  );

  const allProducts = useMemo(
    () => productsData?.data?.products || productsData?.data?.listofPublishedProducts || [],
    [productsData]
  );

  useEffect(() => { window.scrollTo(0, 0); }, [categorySlug]);

  // Client-side filter: subcategory + search
  const filteredProducts = useMemo(() => {
    let p = allProducts;
    if (activeSubcategory) p = p.filter(prod => prod.productSubCategory === activeSubcategory.name);
    if (search.trim()) {
      const q = search.toLowerCase();
      p = p.filter(prod =>
        prod.productName?.toLowerCase().includes(q) ||
        prod.productSubCategory?.toLowerCase().includes(q) ||
        prod.productDes?.toLowerCase().includes(q)
      );
    }
    return p;
  }, [allProducts, activeSubcategory, search]);

  // Group by subcategory
  const groupedBySub = useMemo(() => {
    const g = {};
    filteredProducts.forEach(p => {
      const key = p.productSubCategory || '__none__';
      if (!g[key]) g[key] = [];
      g[key].push(p);
    });
    return g;
  }, [filteredProducts]);

  // Ordered subcategory section keys
  const orderedSubKeys = useMemo(() => {
    const defOrder = activeCategory?.subcategories?.map(s => s.name) || [];
    const keys = Object.keys(groupedBySub);
    return [
      ...defOrder.filter(n => keys.includes(n)),
      ...keys.filter(k => !defOrder.includes(k) && k !== '__none__'),
      ...(groupedBySub['__none__'] ? ['__none__'] : []),
    ];
  }, [activeCategory, groupedBySub]);

  const handleProductClick = p => navigate(`/product/${p.productId || p._id?.$oid || p._id}`);

  const handleCategoryClick = cat => {
    setSearchParams({ category: cat.slug });
    setSearch('');
  };

  const handleSubcategoryClick = sub => {
    if (subcategorySlug === sub.slug) {
      setSearchParams({ category: categorySlug });
    } else {
      setSearchParams({ category: categorySlug, subcategory: sub.slug });
    }
    setSearch('');
  };

  return (
    <div className="min-h-screen bg-[#f7f3ec] pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">

        {/* ── Breadcrumb + Title ─────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          {activeCategory && (
            <button
              onClick={() => { setSearchParams({}); setSearch(''); }}
              className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center text-[#2e443c] hover:bg-emerald-50 transition-colors shadow-sm shrink-0"
            >
              <i className="fa-solid fa-arrow-left text-sm"></i>
            </button>
          )}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-stone-400 font-medium mb-0.5">
              <button onClick={() => { setSearchParams({}); setSearch(''); }} className="hover:text-[#2e443c] transition-colors">
                Shop
              </button>
              {activeCategory && (
                <>
                  <i className="fa-solid fa-chevron-right text-[8px]"></i>
                  <button onClick={() => setSearchParams({ category: categorySlug })} className="hover:text-[#2e443c] transition-colors">
                    {activeCategory.name}
                  </button>
                </>
              )}
              {activeSubcategory && (
                <>
                  <i className="fa-solid fa-chevron-right text-[8px]"></i>
                  <span className="text-[#2e443c] font-semibold">{activeSubcategory.name}</span>
                </>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#2e443c]">
              {activeSubcategory ? activeSubcategory.name : activeCategory ? activeCategory.name : 'Shop'}
            </h1>
          </div>
        </div>

        {/* ── No category → Category Grid ───────────────────── */}
        {!activeCategory && (
          <>
            <p className="text-sm text-stone-500 mb-6">Browse our collections</p>
            {catsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-2xl bg-stone-200 animate-pulse" style={{ aspectRatio: '1' }} />
                ))}
              </div>
            ) : (
              <CategoryGrid categories={categories} onCategoryClick={handleCategoryClick} />
            )}
          </>
        )}

        {/* ── Category selected → Products ──────────────────── */}
        {activeCategory && (
          <>
            {/* Search */}
            <div className="relative mb-4">
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm pointer-events-none"></i>
              <input
                type="text"
                placeholder={`Search in ${activeCategory.name}…`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-stone-200 rounded-full shadow-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 text-[#2e443c] placeholder:text-stone-300"
              />
            </div>

            {/* Subcategory Pills */}
            {activeCategory.subcategories?.length > 0 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-6">
                <button
                  onClick={() => setSearchParams({ category: categorySlug })}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                    !subcategorySlug
                      ? 'bg-[#2e443c] text-white border-[#2e443c] shadow-sm'
                      : 'bg-white text-[#2e443c] border-stone-200 hover:border-emerald-300'
                  }`}
                >
                  All
                </button>
                {activeCategory.subcategories.map(sub => (
                  <button
                    key={sub.slug}
                    onClick={() => handleSubcategoryClick(sub)}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                      subcategorySlug === sub.slug
                        ? 'bg-[#2e443c] text-white border-[#2e443c] shadow-sm'
                        : 'bg-white text-[#2e443c] border-stone-200 hover:border-emerald-300'
                    }`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            )}

            {/* Loading skeleton */}
            {prodsLoading && (
              <div className="flex flex-col gap-10">
                {[1, 2].map(i => (
                  <div key={i}>
                    <div className="h-4 w-28 bg-stone-200 rounded-full animate-pulse mb-4"></div>
                    <div className="flex gap-3">
                      {[1, 2, 3].map(j => (
                        <div key={j} className="flex-shrink-0 w-36 aspect-square rounded-2xl bg-stone-200 animate-pulse"></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Products */}
            {!prodsLoading && (
              filteredProducts.length === 0 ? (
                <div className="text-center py-20">
                  <i className="fa-solid fa-box-open text-4xl text-stone-200 mb-4 block"></i>
                  <p className="text-stone-400 text-sm font-medium">No products found</p>
                  {search && (
                    <button onClick={() => setSearch('')} className="mt-3 text-xs text-emerald-600 hover:underline">
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-10">
                  {orderedSubKeys.map(subKey => {
                    const subProducts = groupedBySub[subKey];
                    const subObj = activeCategory.subcategories?.find(s => s.name === subKey);
                    if (!subProducts?.length) return null;
                    return (
                      <section key={subKey}>
                        {subKey !== '__none__' && (
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-1 h-5 rounded-full bg-[#a89068] shrink-0"></div>
                            <h2 className="text-sm sm:text-base font-bold text-[#2e443c]">{subKey}</h2>
                            <span className="text-xs text-stone-400">({subProducts.length})</span>
                            {subObj && subcategorySlug !== subObj.slug && (
                              <button
                                onClick={() => handleSubcategoryClick(subObj)}
                                className="ml-auto text-[10px] text-emerald-700 font-semibold uppercase tracking-wide hover:underline"
                              >
                                View all →
                              </button>
                            )}
                          </div>
                        )}
                        <ProductRow products={subProducts} onProductClick={handleProductClick} />
                      </section>
                    );
                  })}
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ShopPage;
