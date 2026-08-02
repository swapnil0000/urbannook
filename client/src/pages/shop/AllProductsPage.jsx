import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetProductsQuery } from '../../store/api/productsApi';
import SEOHead from '../../component/SEOHead';
import { trackViewItemList, trackSelectItem } from '../../utils/analytics';

const PlaceholderImage = lazy(() => import('../../component/PlaceholderImage'));
const WishlistButton = lazy(() => import('../../component/WishlistButton'));

const AllProductsPage = () => {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState('featured');
  const [showSortModal, setShowSortModal] = useState(false);
  
  const { data: productsResponse, isLoading, error } = useGetProductsQuery({
    page: 1,
    limit: 12,
    sortBy: sortBy === 'featured' ? undefined : sortBy
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Extract products from response
  const products = productsResponse?.data?.products || productsResponse?.data?.listofPublishedProducts || [];

  const displayProducts = useMemo(() => {
    let sorted = products.map(p => {
      const firstVariantPrice = p.variantDetails?.[0]?.variantPrice || 0;
      return {
        ...p,
        effectivePrice: firstVariantPrice,
      };
    });

    if (sortBy === 'price-low') sorted.sort((a, b) => a.effectivePrice - b.effectivePrice);
    if (sortBy === 'price-high') sorted.sort((a, b) => b.effectivePrice - a.effectivePrice);
    return sorted;
  }, [products, sortBy]);

  useEffect(() => {
    if (displayProducts.length > 0) {
      trackViewItemList({
        listName: 'All Products',
        listId: 'all_products',
        items: displayProducts.map((product, index) => ({
          itemId: product.productId,
          itemName: product.productName,
          price: product.variantDetails?.[0]?.variantPrice || 0,
          itemVariant: product.variantDetails?.[0]?.variantName || '',
          index,
        })),
      });
    }
  }, [displayProducts]);

  if (error) {
    console.error("API Error:", error);
  }

  return (
    <div className="min-h-screen bg-[#2e443c] relative font-sans selection:bg-[#F5DEB3] selection:text-[#2e443c] pb-10">
      <SEOHead
        title="Shop All Products"
        description="Browse UrbanNook's full collection of premium 3D printed home decor, lighting & lifestyle products. Modern designs, fast pan-India delivery."
        url="/products"
      />

      {/* --- Ambient Background Glow --- */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F5DEB3]/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Hero Section */}
      <section className="pt-[5rem] pb-8 md:pt-[7rem] md:pb-5 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
          
          {/* LEFT SIDE: Heading & Description */}
          <div >
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif text-white leading-[0.9] mb-2">
              Curated{' '}
              <span className="italic font-light text-[#F5DEB3]">Atmospheres.</span>
            </h1>
            <p className="text-sm md:text-base text-green-50/70 font-light leading-relaxed max-w-md">
              Explore our exclusive collection designed for modern indoor environments.
            </p>
          </div>
        </div>
      </section>

      {/* Product Grid */}
      <section className="pb-24 px-4 md:px-6 relative z-10">
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
                Retry Connection
              </button>
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 bg-black/10 rounded-[2rem] border border-white/5 backdrop-blur-sm">
              <i className="fa-solid fa-box-open text-4xl text-[#F5DEB3]/50 mb-4"></i>
              <h2 className="text-2xl font-serif text-white mb-2">The collection is updating</h2>
              <p className="text-green-50/60 font-light">Check back later for new arrivals.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {displayProducts?.map((product, index) => (
                <div
                  key={product.productId}
                  className="group relative rounded-[2rem] overflow-hidden bg-black/20 border border-white/5 shadow-lg hover:shadow-2xl hover:border-[#F5DEB3]/30 transition-all duration-500 flex flex-col"
                >
                  {/* Wishlist Button (Floating Top Right) */}
                  <div className="absolute top-4 right-4 z-20">
                    <Suspense fallback={<div className="w-8 h-8 bg-white/20 rounded-full animate-pulse"></div>}>
                      <WishlistButton productId={product.productId} />
                    </Suspense>
                  </div>

                  {/* Clickable Card Area */}
                  <div
                    className="flex flex-col max-h-[520px] cursor-pointer"
                    onClick={() => {
                      trackSelectItem({
                        itemId: product.productId,
                        itemName: product.productName,
                        itemVariant: product.variantDetails?.[0]?.variantName,
                        price: product.effectivePrice,
                        listId: 'all_products',
                        listName: 'All Products',
                        index,
                      });
                      const firstVariant = product.variantDetails?.[0];
                      navigate(firstVariant?.sku ? `/product/${product.productId}/${firstVariant.sku}` : `/product/${product.productId}`);
                    }}
                  >
                    
                    <div className="relative w-full aspect-square bg-[#f8f8f5] overflow-hidden">
                      {(() => {
                        const thumbnail = (product?.variantDetails && product.variantDetails[0]?.variantImage?.[0]) || "/placeholder.jpg";
                        return (
                          <img
                            src={thumbnail}
                            alt={product.productName}
                            className="w-full h-full object-cover mix-blend-multiply transition-transform duration-[1.5s] group-hover:scale-110"
                          />
                        );
                      })()}
                      {/* Out-of-stock overlay — product is OOS if admin set the status
                          or every active variant is out of stock. Card still shows
                          (product stays published). */}
                      {(() => {
                        const LOW_STOCK_THRESHOLD = 5;
                        const active = (product?.variantDetails || []).filter((v) => v.isActive !== false);
                        const allVariantsOOS = active.length > 0 && active.every(
                          (v) => v.variantOutOfStock === true || (v.variantQuantity != null && Number(v.variantQuantity) <= 0),
                        );
                        // Out of stock takes priority over the low-stock nudge.
                        if (product?.productStatus === "out_of_stock" || allVariantsOOS) {
                          return (
                            <span className="absolute top-3 left-3 z-10 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-red-500 text-white shadow">
                              Out of Stock
                            </span>
                          );
                        }
                        // Low-stock urgency — based on total tracked units across
                        // in-stock variants. Only shows when stock is actually tracked.
                        const tracked = active.filter(
                          (v) => v.variantQuantity != null && !v.variantOutOfStock && Number(v.variantQuantity) > 0,
                        );
                        if (tracked.length === 0) return null;
                        const totalLeft = tracked.reduce((s, v) => s + Number(v.variantQuantity || 0), 0);
                        if (totalLeft > LOW_STOCK_THRESHOLD) return null;
                        return totalLeft === 1 ? (
                          <span className="absolute top-3 left-3 z-10 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#F5DEB3] text-[#1c3026] shadow animate-pulse">
                            <i className="fa-solid fa-bolt text-[9px]" /> Only 1 left
                          </span>
                        ) : (
                          <span className="absolute top-3 left-3 z-10 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#2e443c] text-[#F5DEB3] border border-[#F5DEB3]/30 shadow">
                            <i className="fa-solid fa-hourglass-half text-[9px]" /> Few left
                          </span>
                        );
                      })()}
                    </div>

                    {/* 2. TEXT & CTA SECTION */}
                    <div className="p-4 md:p-4 flex flex-col flex-grow justify-between bg-[#f5f7f8] to-transparent backdrop-blur-md">
                      
                      <div className="mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a89068] block opacity-80">
                          {product.productCategory}
                        </span>
                        <h3 className="font-serif text-xl md:text-2xl text-gray-500  leading-snug line-clamp-2">
                          {product.productName}
                        </h3>
                      </div>
                      
                      <div className="flex justify-between items-end pt-2 border-t border-[#F5DEB3]/10] mt-auto">
                        <div className="flex flex-col">
                          
                          {/* --- Available Variants Section --- */}
                          {(() => {
                            const variantDetails = product?.variantDetails || [];
                            if (variantDetails.length === 0) return null;

                            return (
                              <div className="mb-3">
                                <span className="text-[10px] uppercase tracking-widest text-gray-500 mb-1.5 block">
                                  Available Variants
                                </span>
                                <div className="flex flex-wrap gap-1.5 items-center">
                                  {/* Sirf pehle 5 variants dikhayenge */}
                                  {variantDetails.slice(0, 5).map((detail, idx) => {
                                    const variantName = detail.variantName;
                                    // Admin picks the swatch explicitly per variant
                                    // (image URL, falling back to the variant's own
                                    // photo — or a flat CSS colour) — same source of
                                    // truth as the PDP's variant selector, instead of
                                    // guessing a CSS colour from the name (which
                                    // rendered blank for anything that wasn't a
                                    // literal colour word, e.g. every anime character).
                                    const swatchType = detail.variantSwatchType === "color" ? "color" : "image";
                                    const swatchValue =
                                      (detail.variantSwatchValue && detail.variantSwatchValue.trim()) ||
                                      (swatchType === "image" ? detail.variantImage?.[0] : "");
                                    const goToVariant = (e) => {
                                      e.stopPropagation();
                                      navigate(`/product/${product.productId}/${detail.sku || variantName}`);
                                    };
                                    const oos = detail.variantOutOfStock === true || (detail.variantQuantity != null && Number(detail.variantQuantity) <= 0);
                                    return (
                                      <div
                                        key={detail._id || idx}
                                        title={oos ? `${variantName} — out of stock` : variantName}
                                        onClick={goToVariant}
                                        className={`w-4 h-4 rounded-full overflow-hidden border border-[#d1d5db] shadow-sm transition-transform hover:scale-110 cursor-pointer flex items-center justify-center bg-white ${oos ? "opacity-40 grayscale" : ""}`}
                                      >
                                        {swatchType === "color" && swatchValue ? (
                                          <span className="w-full h-full block" style={{ background: swatchValue }} />
                                        ) : swatchValue ? (
                                          <img src={swatchValue} alt={variantName} className="w-full h-full object-cover" />
                                        ) : (
                                          <span className="text-[7px] font-bold uppercase text-gray-400">
                                            {variantName?.charAt(0)}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}

                                  {/* 5 se zyada hone par +X dikhayenge */}
                                  {variantDetails.length > 5 && (
                                    <span className="text-[10px] font-medium text-gray-500 ml-1">
                                      +{variantDetails.length - 5}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          <span className="text-[10px] uppercase tracking-widest text-gray-500 mb-1 block">
                            Pricing
                          </span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg md:text-xl font-semibold text-[#a89068]">
                              ₹{product.effectivePrice?.toLocaleString()}
                            </span>
                            {/* No struck "compare-at" price here — it used to be a
                                fake 18%-markup/25%-markdown formula, not real admin
                                data. The listing card only ever shows the base
                                (first) variant's actual price now; the PDP is where
                                a real per-variant MRP discount, when set, shows up. */}
                          </div>
                           
                        </div>
                        
                        {/* Interactive Arrow CTA */}
                        <div className="w-12 h-12 rounded-full bg-[#F5DEB3]/10 text-gray-500  flex items-center justify-center group-hover:bg-[#F5DEB3] group-hover:text-[#2e443c] transition-all duration-300">
                          <i className="fa-solid fa-arrow-right -rotate-45 group-hover:rotate-0 transition-transform duration-500"></i>
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

export default AllProductsPage;