import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  useGetCategoriesQuery,
  useGetProductsByCategoryQuery,
} from '../../store/api/productsApi';
import SEOHead from '../../component/SEOHead';
import { trackViewItemList } from '../../utils/analytics';

const WishlistButton = lazy(() => import('../../component/WishlistButton'));

const SubCategoryProductsPage = () => {
  const navigate = useNavigate();
  const { categorySlug, subCategorySlug } = useParams();
  const [sortBy, setSortBy] = useState('featured');
  const [showSortModal, setShowSortModal] = useState(false);
  const isAll = subCategorySlug === 'all';

  useEffect(() => { window.scrollTo(0, 0); }, [categorySlug, subCategorySlug]);

  // Resolve slugs → names via categories API
  const { data: catData } = useGetCategoriesQuery(undefined, {
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });

  const { categoryName, subCategoryName } = useMemo(() => {
    const all = catData?.data || [];
    const cat = all.find((c) => c.slug === categorySlug);
    if (!cat) return { categoryName: null, subCategoryName: null };
    const sub = isAll
      ? null
      : cat.subcategories.find((s) => s.slug === subCategorySlug);
    return {
      categoryName: cat.name,
      subCategoryName: sub?.name || null,
    };
  }, [catData, categorySlug, subCategorySlug, isAll]);

  // Pass slugs directly — shared key between Category and Product collections.
  // categoryName / subCategoryName are still used below for display only.
  const { data, isLoading, error } = useGetProductsByCategoryQuery(
    {
      category: categorySlug,
      subCategory: isAll ? undefined : subCategorySlug,
      limit: 200,
    },
    {
      skip: !categorySlug,
      refetchOnMountOrArgChange: false,
      refetchOnFocus: false,
      refetchOnReconnect: false,
    }
  );

  const displayProducts = useMemo(() => {
    const raw = data?.data?.listofPublishedProducts || data?.data?.products || [];
    return raw
      .map((p) => ({ ...p, effectivePrice: p.variantDetails?.[0]?.variantPrice || 0 }))
      .sort((a, b) => {
        if (sortBy === 'price-low') return a.effectivePrice - b.effectivePrice;
        if (sortBy === 'price-high') return b.effectivePrice - a.effectivePrice;
        return 0;
      });
  }, [data, sortBy]);

  useEffect(() => {
    if (displayProducts.length > 0) {
      trackViewItemList({
        listName: `${categoryName} — ${subCategoryName || 'All'}`,
        listId: `shop_${categorySlug}_${subCategorySlug}`,
        items: displayProducts.map((p, index) => ({
          itemId: p.productId,
          itemName: p.productName,
          price: p.variantDetails?.[0]?.variantPrice || 0,
          itemVariant: p.variantDetails?.[0]?.variantName || '',
          index,
        })),
      });
    }
  }, [displayProducts]);

  const pageTitle = isAll
    ? `All ${categoryName || ''}`
    : (subCategoryName || subCategorySlug);

  const sortOptions = [
    { key: 'featured', label: 'Featured' },
    { key: 'price-low', label: 'Price: Low to High' },
    { key: 'price-high', label: 'Price: High to Low' },
  ];

  return (
    <div className="min-h-screen bg-[#2e443c] relative font-sans pb-16 selection:bg-[#F5DEB3] selection:text-[#2e443c]">
      <SEOHead
        title={`${pageTitle} — UrbanNook`}
        description={`Shop ${pageTitle} on UrbanNook. Premium 3D printed designs with fast pan-India delivery.`}
        url={`/shop/${categorySlug}/${subCategorySlug}`}
      />

      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F5DEB3]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Hero */}
      <section className="pt-[5rem] pb-8 md:pt-[7rem] md:pb-5 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6">

          <div>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 mb-4 flex-wrap">
              <Link to="/" className="hover:text-[#F5DEB3] transition-colors">Home</Link>
              <span>/</span>
              <Link to={`/shop/${categorySlug}`} className="hover:text-[#F5DEB3] transition-colors">
                {categoryName || categorySlug}
              </Link>
              <span>/</span>
              <span className="text-[#F5DEB3]/70">{pageTitle}</span>
            </nav>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif text-white leading-[0.9] mb-2">
              {pageTitle.split(' ').slice(0, -1).join(' ')}{' '}
              <span className="italic font-light text-[#F5DEB3]">
                {pageTitle.split(' ').slice(-1)[0]}.
              </span>
            </h1>

            {!isLoading && (
              <p className="text-sm text-white/50 font-light">
                {displayProducts.length} item{displayProducts.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => setShowSortModal((v) => !v)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10
                         bg-white/5 text-white/70 text-xs uppercase tracking-widest font-semibold
                         hover:border-[#F5DEB3]/40 hover:text-white transition-all duration-300"
            >
              <i className="fa-solid fa-sort text-[#F5DEB3]/70" />
              {sortOptions.find((o) => o.key === sortBy)?.label}
            </button>

            {showSortModal && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSortModal(false)} />
                <div className="absolute right-0 top-full mt-2 bg-[#1a2e27] border border-white/10
                                rounded-2xl overflow-hidden shadow-2xl z-50 min-w-[180px]">
                  {sortOptions.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => { setSortBy(opt.key); setShowSortModal(false); }}
                      className={`w-full text-left px-5 py-3 text-xs uppercase tracking-widest transition-colors
                        ${sortBy === opt.key
                          ? 'text-[#F5DEB3] bg-white/5'
                          : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Product Grid */}
      <section className="pb-24 px-4 md:px-6 relative z-10">
        <div className="max-w-7xl mx-auto">

          {isLoading ? (
            <div className="flex justify-center py-32">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#F5DEB3]" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-32 bg-black/10 rounded-[2rem] border border-white/5">
              <i className="fa-solid fa-triangle-exclamation text-4xl text-[#F5DEB3]/50 mb-4" />
              <h2 className="text-2xl font-serif text-white mb-2">Unable to load products</h2>
              <button onClick={() => window.location.reload()}
                className="bg-[#F5DEB3] text-[#2e443c] px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs mt-4">
                Retry
              </button>
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 bg-black/10 rounded-[2rem] border border-white/5">
              <i className="fa-solid fa-box-open text-4xl text-[#F5DEB3]/50 mb-4" />
              <h2 className="text-2xl font-serif text-white mb-2">No products found</h2>
              <p className="text-white/50 font-light mb-6">This collection is being curated. Check back soon.</p>
              <button
                onClick={() => navigate(`/shop/${categorySlug}`)}
                className="bg-[#F5DEB3] text-[#2e443c] px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs"
              >
                Back to {categoryName || categorySlug}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {displayProducts.map((product) => (
                <div
                  key={product.productId}
                  className="group relative rounded-[2rem] overflow-hidden bg-black/20 border border-white/5
                             shadow-lg hover:shadow-2xl hover:border-[#F5DEB3]/30 transition-all duration-500 flex flex-col"
                >
                  <div className="absolute top-4 right-4 z-20">
                    <Suspense fallback={<div className="w-8 h-8 bg-white/20 rounded-full animate-pulse" />}>
                      <WishlistButton productId={product.productId} />
                    </Suspense>
                  </div>

                  <div className="flex flex-col max-h-[520px] cursor-pointer"
                    onClick={() => navigate(`/product/${product.productId}`)}>

                    <div className="relative w-full aspect-square bg-[#f8f8f5] overflow-hidden">
                      <img
                        src={product.variantDetails?.[0]?.variantImage?.[0] || '/placeholder.jpg'}
                        alt={product.productName}
                        className="w-full h-full object-cover mix-blend-multiply
                                   transition-transform duration-[1.5s] group-hover:scale-110"
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
                            const variants = product.variantDetails?.length > 0
                              ? product.variantDetails.map((v) => v.variantName)
                              : product.color || [];
                            if (variants.length === 0) return null;
                            return (
                              <div className="mb-3">
                                <span className="text-[10px] uppercase tracking-widest text-gray-500 mb-1.5 block">
                                  Available Variants
                                </span>
                                <div className="flex flex-wrap gap-1.5 items-center">
                                  {variants.slice(0, 5).map((v, idx) => (
                                    <div key={idx} title={v}
                                      className="w-4 h-4 rounded-full border border-gray-300 shadow-sm hover:scale-110 transition-transform"
                                      style={
                                        v.toLowerCase() === 'rainbow'
                                          ? { background: 'linear-gradient(to right,red,orange,yellow,green,blue,indigo,violet)' }
                                          : { backgroundColor: v.replace(/\s+/g, '').toLowerCase() }
                                      }
                                    />
                                  ))}
                                  {variants.length > 5 && (
                                    <span className="text-[10px] font-medium text-gray-500 ml-1">
                                      +{variants.length - 5}
                                    </span>
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
                              ₹{(product.effectivePrice * 1.18).toFixed(0)}
                            </span>
                          </div>
                        </div>

                        <div className="w-12 h-12 rounded-full bg-[#F5DEB3]/10 text-gray-500 flex items-center justify-center
                                        group-hover:bg-[#F5DEB3] group-hover:text-[#2e443c] transition-all duration-300">
                          <i className="fa-solid fa-arrow-right -rotate-45 group-hover:rotate-0 transition-transform duration-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default SubCategoryProductsPage;
