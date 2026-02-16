import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PlaceholderImage from '../../component/PlaceholderImage';
import WishlistButton from '../../component/WishlistButton';
import { useGetProductsQuery } from '../../store/api/productsApi';

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


  console.log(productsResponse,"productsResponseproductsResponse")

  // Extract products from response
  const products = productsResponse?.data?.listOfProducts?.listOfProducts || [];

  const displayProducts = useMemo(() => {
    let sorted = [...products];
    if (sortBy === 'price-low') sorted.sort((a, b) => a.sellingPrice - b.sellingPrice);
    if (sortBy === 'price-high') sorted.sort((a, b) => b.sellingPrice - a.sellingPrice);
    return sorted;
  }, [products, sortBy]);

  if (error) {
    console.error("API Error:", error);
  }

  return (
    <div className="min-h-screen bg-[#2e443c] relative font-sans selection:bg-emerald-500 selection:text-white pb-10">

      {/* Hero Section */}
      <section className="pt-20 pb-4 md:pt-32 md:pb-16 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
          
          {/* LEFT SIDE: Heading & Description */}
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 mb-3 md:mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.25em] text-white">
                Flagship Series
              </span>
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif text-white leading-[0.9] mb-3">
              Curated <br/>
              <span className="italic font-light text-[#F5DEB3]">Atmospheres.</span>
            </h1>
            <p className="text-xs md:text-base text-gray-300 font-light leading-relaxed max-w-md opacity-80">
              Explore our exclusive collection designed for modern indoor environments.
            </p>
          </div>

          {/* RIGHT SIDE: Desktop-Only Control Panel */}
          <div className="hidden md:flex flex-col items-end gap-6 pb-2">
            {/* <div className="flex bg-white/5 backdrop-blur-xl p-1.5 rounded-full border border-white/10 shadow-2xl">
              {[
                { label: 'Featured', value: 'featured' },
                { label: 'Price ↓', value: 'price-low' },
                { label: 'Price ↑', value: 'price-high' }
              ].map((option) => (
                <button 
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className={`px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                    sortBy === option.value
                    ? 'bg-white text-[#2e443c] shadow-lg' 
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div> */}
          </div>
        </div>
      </section>

      {/* Product Grid */}
      <section className="pb-24 px-4 md:px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <h2 className="text-2xl font-serif text-white mb-4">Unable to load products</h2>
              <p className="text-gray-300 mb-6">Please check your connection and try again</p>
              <button 
                onClick={() => window.location.reload()} 
                className="bg-emerald-500 text-white px-6 py-3 rounded-lg hover:bg-emerald-600 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <h2 className="text-2xl font-serif text-white mb-4">No products found</h2>
              <p className="text-gray-300">Check back later for new arrivals</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-10">
              {displayProducts?.map((product) => (
                <div
                  key={product.productId}
                  className="group relative cursor-pointer rounded-[2rem] overflow-hidden bg-[#f5f5f0] shadow-xl h-[380px] md:h-[380px] w-full border border-white/5"
                  onClick={() => navigate(`/product/${product.productId}`)}
                >
                  <div className="absolute inset-0 z-0 bg-stone-200">
                      {product.productImg ? (
                        <img 
                          src={product.productImg} 
                          alt={product.productName} 
                          className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" 
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <PlaceholderImage 
                        className="w-full h-full absolute inset-0" 
                        style={{ display: product.productImg ? 'none' : 'flex' }}
                      />
                      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 transition-opacity duration-500"></div>
                  </div>

                  <WishlistButton productId={product.productId} className="absolute top-4 right-4 z-10" />

                  <div className="absolute bottom-6 left-6 right-6 z-10">
                      <div className="flex flex-col gap-3">
                          <div className="text-white">
                              <h3 className="font-serif text-xl md:text-3xl leading-tight mb-1">{product.productName}</h3>
                              <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-300">
                                {product.productCategory}
                              </span>
                          </div>
                          <div className="flex justify-between items-center">
                              <div className="bg-white text-[#2e443c] px-4 py-2 md:px-6 md:py-3 rounded-full font-bold shadow-xl flex items-center gap-2 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                  <span className="text-xs md:text-sm">₹{product.sellingPrice?.toLocaleString()}</span>
                                  <i className="fa-solid fa-arrow-right -rotate-45 group-hover:rotate-0 transition-transform text-[10px]"></i>
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

      {/* Mobile Sticky Bottom Bar */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-[400px]">
        <div className="bg-black/80 backdrop-blur-2xl border border-white/10 rounded-full flex items-center justify-between p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
           <button 
             onClick={() => setShowSortModal(true)}
             className="flex-1 flex items-center justify-center gap-2 py-3 text-white border-r border-white/10"
           >
              <i className="fa-solid fa-arrow-up-wide-short text-[10px] text-emerald-400"></i>
              <span className="text-[10px] font-bold uppercase tracking-widest">Sort</span>
           </button>
           <button className="flex-1 flex items-center justify-center gap-2 py-3 text-white">
              <i className="fa-solid fa-filter text-[10px] text-emerald-400"></i>
              <span className="text-[10px] font-bold uppercase tracking-widest">Filter</span>
           </button>
        </div>
      </div>

      {/* Mobile Sort Modal */}
      {showSortModal && (
        <div className="fixed inset-0 z-[60] flex items-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSortModal(false)}></div>
            <div className="relative w-full bg-[#1a2c26] rounded-t-[2.5rem] p-8 pb-12 border-t border-white/10 animate-slide-up">
                <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8"></div>
                <h4 className="text-white font-serif text-2xl mb-6">Sort Collection</h4>
                <div className="flex flex-col gap-4">
                    {[
                        { label: 'Featured', value: 'featured' },
                        { label: 'Price: Low to High', value: 'price-low' },
                        { label: 'Price: High to Low', value: 'price-high' }
                    ].map((opt) => (
                        <button 
                            key={opt.value}
                            onClick={() => { setSortBy(opt.value); setShowSortModal(false); }}
                            className={`w-full text-left py-4 px-6 rounded-2xl border transition-all ${
                              sortBy === opt.value 
                                ? 'bg-emerald-500 border-emerald-500 text-white' 
                                : 'bg-white/5 border-white/5 text-white/60'
                            }`}
                        >
                            <span className="text-xs font-bold uppercase tracking-widest">{opt.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default AllProductsPage;