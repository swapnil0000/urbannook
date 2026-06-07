import { useState, useMemo, useEffect, lazy, Suspense, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGetProductsQuery, useGetCategoriesQuery } from '../../store/api/productsApi';
import SEOHead from '../../component/SEOHead';
import { trackViewItemList } from '../../utils/analytics';

const WishlistButton = lazy(() => import('../../component/WishlistButton'));

const AllProductsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sortRef = useRef(null);

  const [sortBy, setSortBy] = useState('featured');
  const [showSortModal, setShowSortModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || '');
  const [activeSubCategory, setActiveSubCategory] = useState(searchParams.get('subCategory') || '');

  // Fetch categories from API
  const { data: categoriesResponse } = useGetCategoriesQuery();
  const categoryMap = categoriesResponse?.data || {};
  const mainCategories = Object.keys(categoryMap).sort();
  const subCategories = activeCategory ? (categoryMap[activeCategory] || []) : [];

  // Reset sub-category when main category changes
  useEffect(() => {
    setActiveSubCategory('');
  }, [activeCategory]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Close sort dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setShowSortModal(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { data: productsResponse, isLoading, error } = useGetProductsQuery({
    page: 1,
    limit: 50,
    category: activeCategory || undefined,
    subCategory: activeSubCategory || undefined,
    sortBy: sortBy === 'featured' ? undefined : sortBy,
  });

  const products = productsResponse?.data?.products || productsResponse?.data?.listofPublishedProducts || [];

  const displayProducts = useMemo(() => {
    let sorted = products.map(p => ({
      ...p,
      effectivePrice: p.variantDetails?.[0]?.variantPrice || 0,
    }));
    if (sortBy === 'price-low') sorted.sort((a, b) => a.effectivePrice - b.effectivePrice);
    if (sortBy === 'price-high') sorted.sort((a, b) => b.effectivePrice - a.effectivePrice);
    return sorted;
  }, [products, sortBy]);

  console.log(displayProducts,"displayProductsdisplayProductsdisplayProducts")

  useEffect(() => {
    if (displayProducts.length > 0) {
      trackViewItemList({
        listName: activeCategory || 'All Products',
        listId: activeCategory ? `cat_${activeCategory}` : 'all_products',
        items: displayProducts.map((product, index) => ({
          itemId: product.productId,
          itemName: product.productName,
          price: product.variantDetails?.[0]?.variantPrice || 0,
          itemVariant: product.variantDetails?.[0]?.variantName || '',
          index,
        })),
      });
    }
  }, [displayProducts, activeCategory]);

  const sortLabels = {
    featured: 'Featured',
    'price-low': 'Price: Low → High',
    'price-high': 'Price: High → Low',
  };

  return (
    <div className="min-h-screen bg-[#2e443c] relative font-sans selection:bg-[#F5DEB3] selection:text-[#2e443c] pb-16">
      <SEOHead
        title="Shop All Products"
        description="Browse UrbanNook's full collection of premium keychains, car accessories & anime merchandise. Fast pan-India delivery."
        url="/products"
      />

      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F5DEB3]/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* ── Hero ── */}
      <section className="pt-[5rem] pb-6 md:pt-[7rem] md:pb-4 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif text-white leading-[0.9] mb-2">
            {activeCategory ? (
              <>
                <span className="italic font-light text-[#F5DEB3]">{activeCategory}</span>
              </>
            ) : (
              <>
                Curated{' '}
                <span className="italic font-light text-[#F5DEB3]">Collection.</span>
              </>
            )}
          </h1>
          <p className="text-sm md:text-base text-green-50/60 font-light mt-2">
            {activeSubCategory
              ? `${activeSubCategory} — ${activeCategory}`
              : activeCategory
                ? `All ${activeCategory} products`
                : 'Explore our full range of premium products'}
          </p>
        </div>
      </section>

      {/* ── Filters Bar ── */}
      <section className="sticky top-[5.5rem] md:top-[5rem] z-30 px-4 md:px-6 pb-3">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[#1c3026]/80 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3 overflow-x-auto no-scrollbar">

            {/* All tab */}
            <button
              onClick={() => { setActiveCategory(''); setActiveSubCategory(''); }}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                !activeCategory
                  ? 'bg-[#F5DEB3] text-[#1c3026]'
                  : 'text-white/60 hover:text-white border border-white/10 hover:border-white/30'
              }`}
            >
              All
            </button>

            {/* Main category tabs */}
            {mainCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat === activeCategory ? '' : cat)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeCategory === cat
                    ? 'bg-[#F5DEB3] text-[#1c3026]'
                    : 'text-white/60 hover:text-white border border-white/10 hover:border-white/30'
                }`}
              >
                {cat}
              </button>
            ))}

            {/* Sort dropdown */}
            <div className="ml-auto shrink-0 relative" ref={sortRef}>
              <button
                onClick={() => setShowSortModal(v => !v)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold text-white/70 hover:text-white border border-white/10 hover:border-white/30 transition-all whitespace-nowrap"
              >
                <i className="fa-solid fa-arrow-up-wide-short text-[10px]"></i>
                {sortLabels[sortBy]}
                <i className={`fa-solid fa-chevron-down text-[9px] transition-transform ${showSortModal ? 'rotate-180' : ''}`}></i>
              </button>
              {showSortModal && (
                <div className="absolute right-0 top-9 bg-[#1c3026] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 w-44">
                  {Object.entries(sortLabels).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => { setSortBy(val); setShowSortModal(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                        sortBy === val
                          ? 'text-[#F5DEB3] font-bold bg-white/5'
                          : 'text-white/60 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
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

      {/* ── Product Grid ── */}
      <section className="px-4 md:px-6 pt-4 relative z-10">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center py-32">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#F5DEB3]"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-32 bg-black/10 rounded-[2rem] border border-white/5 backdrop-blur-sm">
              <i className="fa-solid fa-triangle-exclamation text-4xl text-[#F5DEB3]/50 mb-4"></i>
              <h2 className="text-2xl font-serif text-white mb-2">Unable to load products</h2>
              <p className="text-green-50/60 mb-6 font-light">Please check your connection and try again</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-[#F5DEB3] text-[#2e443c] px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-white transition-colors"
              >
                Retry
              </button>
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 bg-black/10 rounded-[2rem] border border-white/5 backdrop-blur-sm">
              <i className="fa-solid fa-box-open text-4xl text-[#F5DEB3]/50 mb-4"></i>
              <h2 className="text-2xl font-serif text-white mb-2">
                {activeCategory ? `No ${activeCategory} products found` : 'The collection is updating'}
              </h2>
              {activeCategory && (
                <button
                  onClick={() => { setActiveCategory(''); setActiveSubCategory(''); }}
                  className="mt-4 text-[#F5DEB3]/60 hover:text-[#F5DEB3] text-sm underline underline-offset-4 transition-colors"
                >
                  View all products
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="text-white/30 text-xs uppercase tracking-widest mb-4 font-bold">
                {displayProducts.length} {displayProducts.length === 1 ? 'product' : 'products'}
                {activeCategory && ` in ${activeCategory}`}
                {activeSubCategory && ` › ${activeSubCategory}`}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                
                {displayProducts.map((product) => (
                  
                  
                  <div
                    key={product.productId}
                    className="group relative rounded-[2rem] overflow-hidden bg-black/20 border border-white/5 shadow-lg hover:shadow-2xl hover:border-[#F5DEB3]/30 transition-all duration-500 flex flex-col"
                  >
                    <div className="absolute top-4 right-4 z-20">
                      <Suspense fallback={<div className="w-8 h-8 bg-white/20 rounded-full animate-pulse"></div>}>
                        <WishlistButton productId={product.productId} />
                      </Suspense>
                    </div>

                    <div
                      className="flex flex-col max-h-[520px] cursor-pointer"
                      onClick={() => navigate(`/product/${product.productId}`)}
                    >
                      <div className="relative w-full aspect-square bg-[#f8f8f5] overflow-hidden">
                        <img
                          src={
                            product?.variantDetails?.find(v => v.variantImage?.length > 0)?.variantImage?.[0] ||
                            product?.productImg ||
                            product?.secondaryImages?.[0] ||
                            "/placeholder.jpg"
                          }
                          alt={product.productName}
                          className="w-full h-full object-cover mix-blend-multiply transition-transform duration-[1.5s] group-hover:scale-110"
                        />
                      </div>

                      <div className="p-4 flex flex-col flex-grow justify-between bg-[#f5f7f8]">
                        <div className="mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a89068] block opacity-80">
                            {product.productSubCategory || product.productCategory}
                          </span>
                          <h3 className="font-serif text-xl md:text-2xl text-gray-500 leading-snug line-clamp-2">
                            {product.productName}
                          </h3>
                        </div>

                        <div className="flex justify-between items-end pt-2 border-t border-[#F5DEB3]/10 mt-auto">
                          <div className="flex flex-col">
                            {(() => {
                              const variants = product?.variantDetails?.map(v => v.variantName) || product?.color || [];
                              if (variants.length === 0) return null;

                              const CSS_COLORS = new Set([
                                'red','blue','green','white','black','yellow','orange','purple',
                                'pink','brown','grey','gray','silver','gold','navy','teal',
                                'skyblue','violet','indigo','rainbow','maroon','coral','cyan',
                                'beige','olive','lime','aqua','magenta','turquoise',
                              ]);
                              const isColor = (name) => {
                                const key = name.replace(/\s+/g, '').toLowerCase();
                                return CSS_COLORS.has(key);
                              };

                              const allColors = variants.every(isColor);

                              return (
                                <div className="mb-3">
                                  <span className="text-[10px] uppercase tracking-widest text-gray-500 mb-1.5 block">Variants</span>
                                  <div className="flex flex-wrap gap-1.5 items-center">
                                    {variants.slice(0, 5).map((v, idx) =>
                                      isColor(v) ? (
                                        <div
                                          key={idx}
                                          title={v}
                                          className="w-4 h-4 rounded-full border border-[#d1d5db] shadow-sm shrink-0"
                                          style={
                                            v.toLowerCase() === 'rainbow'
                                              ? { background: 'linear-gradient(to right,red,orange,yellow,green,blue,indigo,violet)' }
                                              : { backgroundColor: v.replace(/\s+/g, '').toLowerCase() }
                                          }
                                        />
                                      ) : (
                                        <span
                                          key={idx}
                                          className="text-[10px] font-semibold text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full whitespace-nowrap"
                                        >
                                          {v}
                                        </span>
                                      )
                                    )}
                                    {variants.length > 5 && (
                                      <span className="text-[10px] text-gray-500 ml-1">+{variants.length - 5}</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                            <span className="text-[10px] uppercase tracking-widest text-gray-500 mb-1 block">Pricing</span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-lg md:text-xl font-semibold text-[#a89068]">
                                ₹{product.effectivePrice?.toLocaleString()}
                              </span>
                              <span className="text-xs text-gray-400 line-through">
                                ₹{Math.round(product.effectivePrice * 1.18).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <div className="w-12 h-12 rounded-full bg-[#F5DEB3]/10 text-gray-500 flex items-center justify-center group-hover:bg-[#F5DEB3] group-hover:text-[#2e443c] transition-all duration-300">
                            <i className="fa-solid fa-arrow-right -rotate-45 group-hover:rotate-0 transition-transform duration-500"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default AllProductsPage;
