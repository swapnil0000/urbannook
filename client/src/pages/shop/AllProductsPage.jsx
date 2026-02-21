import { useState, useMemo, useEffect } from 'react';
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
    <div className="min-h-screen bg-[#2e443c] relative font-sans selection:bg-[#F5DEB3] selection:text-[#2e443c] pb-10">

      {/* --- Ambient Background Glow --- */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F5DEB3]/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Hero Section */}
      <section className="pt-32 pb-8 md:pt-34 md:pb-5 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
          
          {/* LEFT SIDE: Heading & Description */}
          <div className="max-w-2xl">
            {/* <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 mb-4 md:mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F5DEB3] animate-pulse"></span>
              <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5DEB3]">
                Flagship Series
              </span>
            </div> */}
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
              {displayProducts?.map((product) => (
                <div
                  key={product.productId}
                  className="group relative rounded-[2rem] overflow-hidden bg-black/20 border border-white/5 shadow-lg hover:shadow-2xl hover:border-[#F5DEB3]/30 transition-all duration-500 flex flex-col"
                >
                  {/* Wishlist Button (Floating Top Right) */}
                  <div className="absolute top-4 right-4 z-20">
                     <WishlistButton productId={product.productId} />
                  </div>

                  {/* Clickable Card Area */}
                  <div 
                    className="flex flex-col max-h-[520px] cursor-pointer"
                    onClick={() => navigate(`/product/${product.productId}`)}
                  >
                    
                    <div className="relative w-full aspect-square bg-[#f8f8f5] overflow-hidden">
                      {product.productImg ? (
                        <img 
                          src={product.productImg} 
                          alt={product.productName} 
                          className="w-full h-full object-cover mix-blend-multiply transition-transform duration-[1.5s] group-hover:scale-110" 
                          
                        />
                      ) : null}
                   
                    </div>

                    {/* 2. TEXT & CTA SECTION */}
                    <div className="p-4 md:p-4 flex flex-col flex-grow justify-between bg-gradient-to-b from-white/5 to-transparent backdrop-blur-md">
                      
                      <div className="mb-6">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F5DEB3] mb-2 block opacity-80">
                          {product.productCategory}
                        </span>
                        <h3 className="font-serif text-xl md:text-2xl text-white leading-snug line-clamp-2">
                          {product.productName}
                        </h3>
                      </div>
                      
                      <div className="flex justify-between items-end pt-4 border-t border-white/10 mt-auto">
                        <div className="flex flex-col">
                           <span className="text-[10px] uppercase tracking-widest text-green-50/50 mb-1">Investment</span>
                           <span className="text-lg md:text-xl font-bold text-white">
                             ₹{product.sellingPrice?.toLocaleString()}
                           </span>
                        </div>
                        
                        {/* Interactive Arrow CTA */}
                        <div className="w-12 h-12 rounded-full bg-[#F5DEB3]/10 text-[#F5DEB3] flex items-center justify-center group-hover:bg-[#F5DEB3] group-hover:text-[#2e443c] transition-all duration-300">
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