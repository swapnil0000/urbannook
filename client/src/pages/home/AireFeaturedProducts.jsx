import { useNavigate } from 'react-router-dom';
import WishlistButton from '../../component/WishlistButton';
import { useGetFeaturedProductsQuery } from '../../store/api/productsApi';
import OptimizedImage from '../../component/OptimizedImage';

const AireFeaturedProducts = () => {
  const navigate = useNavigate();
  
  // Fetch featured products from API (limit to 1 for hero section)
  const { data: featuredResponse, isLoading, error } = useGetFeaturedProductsQuery({ limit: 1 });
  
  // Extract the first featured product
    const featuredProduct = featuredResponse?.data?.listofPublishedProducts?.[0];


  // Loading state
  if (isLoading) {
    return (
      <section className="relative mx-2 my-2 md:mx-4 md:my-4 rounded-[2rem] md:rounded-[3rem] overflow-hidden bg-[#2e443c] shadow-2xl flex items-center justify-center min-h-[85vh] lg:h-[calc(100vh-2rem)] lg:max-h-[1080px] border border-white/5">
        <div className="w-16 h-16 border border-[#F5DEB3] rounded-full animate-spin border-t-transparent"></div>
      </section>
    );
  }

  // Error or no product state
  if (error || !featuredProduct) {
    return null; // Don't show the section if no featured product
  }

  return (
    <section className="relative mx-2 my-2 md:mx-4 md:my-4 rounded-[2rem] md:rounded-[3rem] overflow-hidden bg-[#2e443c] shadow-2xl flex flex-col justify-center min-h-[85vh] lg:h-[calc(100vh-2rem)] lg:max-h-[1080px] border border-white/5">
    
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none select-none z-0 overflow-hidden">
        <span className="text-[8rem] md:text-[20rem] lg:text-[25rem] font-black text-white/[0.03] leading-none whitespace-nowrap">
         FEATURED 
        </span>
      </div>
      <div className="relative z-10 w-full h-full flex flex-col px-6 py-0 md:px-10 md:py-10">
        
        <div className="flex justify-between items-start w-full border-b border-white/10 pb-6 mb-8 mt-8 lg:mb-auto">
             <div className="flex items-center gap-3">
                <span className="w-2 h-2 bg-[#F5DEB3] rounded-full animate-pulse"></span>
                <span className="text-[#F5DEB3] font-mono text-xs tracking-[0.3em] uppercase">Featured Product</span>
             </div>
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12 w-full">
          
          {/* LEFT: Product Details */}
          <div className="flex flex-col justify-center order-2 lg:order-1 w-full lg:w-[45%] lg:max-w-2xl">
             
             {/* Tag */}
             <div className="mb-4 md:mb-6">
                <span className="px-4 py-2 rounded-full border border-[#F5DEB3]/30 text-[#F5DEB3] text-[10px] font-bold uppercase tracking-widest bg-[#F5DEB3]/5">
                    {featuredProduct.productCategory || 'Signature Piece'}
                </span>
             </div>

             {/* Title */}
             <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-serif text-white leading-[0.9] mb-3 md:mb-4">
                {featuredProduct.productName}
             </h2>

             {/* Subtitle */}
             <p className="text-base md:text-lg lg:text-xl text-[#F5DEB3]/80 italic font-light mb-6 md:mb-8">
                {featuredProduct.productSubDes || "Designed to stand out."}
             </p>

             {/* Divider */}
             <div className="w-20 h-px bg-gradient-to-r from-[#F5DEB3] to-transparent mb-6 md:mb-8"></div>

             {/* Description */}
             {/* <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-lg mb-10">
                {featuredProduct.productDes}
             </p> */}

             {/* Actions */}
             <div className="flex flex-wrap items-center gap-4 md:gap-6">
                <button 
                  onClick={() => navigate(`/product/${featuredProduct.productId}`)}
                  className="group relative px-8 md:px-10 py-3 md:py-4 bg-white text-black rounded-full font-bold uppercase tracking-widest text-xs overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                >
                  <span className="relative z-10">View Product</span>
                  <div className="absolute inset-0 bg-[#F5DEB3] translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                </button>
                
                <div className="flex flex-col">
                    <span className="text-white text-lg md:text-xl font-serif">₹{featuredProduct.sellingPrice?.toLocaleString()}</span>
                    <span className="text-[10px] text-[#F5DEB3]/80 uppercase tracking-widest font-bold">
                      {featuredProduct.productStatus === 'in_stock' ? 'In Stock' : 'Limited Stock'}
                    </span>
                </div>
             </div>
          </div>

          {/* RIGHT: Image Showcase */}
          <div className="relative flex items-center justify-center order-1 lg:order-2 w-full lg:w-[45%]">
            
            {/* The Image Card */}
            <div className="relative w-full max-w-[350px] md:max-w-[450px]  group">
                
                {/* Glow behind image */}
                <div className="absolute inset-0 bg-[#F5DEB3]/20 rounded-[2.5rem] blur-2xl transform group-hover:scale-105 transition-transform duration-700"></div>

                {/* Main Image Container */}
                <div className="relative rounded-[2.5rem] overflow-hidden border border-white/10 bg-[#121212] shadow-2xl">
                    <OptimizedImage 
                        src={featuredProduct.productImg} 
                        alt={featuredProduct.productName}
                        className="w-full h-full object-cover transform transition-transform duration-[1.5s] ease-out group-hover:scale-110"
                        loading="eager"
                    />
                    
                    {/* Gradient Overlay for Text readability if image is bright */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                </div>

                {/* Wishlist Button */}
                <div className="absolute top-6 right-6 z-20">
                    <WishlistButton 
                        productId={featuredProduct.productId} 
                        className="bg-black/40 hover:bg-red-500 backdrop-blur-md" 
                        size="lg"
                    />
                </div>

                {/* Floating Spec Card (Glassmorphism) - Show dimensions if available */}
                {/* {featuredProduct.dimensions && (
                  <div className="absolute -right-4 md:-right-10 bottom-10 bg-white/10 backdrop-blur-xl border border-white/20 p-5 rounded-2xl shadow-2xl animate-float hidden sm:block">
                      <div className="space-y-4">
                          <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#F5DEB3]/20 flex items-center justify-center">
                                  <i className="fa-solid fa-cube text-[#F5DEB3] text-xs"></i>
                              </div>
                              <div>
                                  <p className="text-[9px] text-white/50 uppercase font-bold">Dimensions</p>
                                  <p className="text-xs text-white font-bold tracking-wide">
                                    {featuredProduct.dimensions.length} × {featuredProduct.dimensions.breadth} × {featuredProduct.dimensions.height} cm
                                  </p>
                              </div>
                          </div>
                          <div className="h-px bg-white/10 w-full"></div>
                          <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#F5DEB3]/20 flex items-center justify-center">
                                  <i className="fa-solid fa-tag text-[#F5DEB3] text-xs"></i>
                              </div>
                              <div>
                                  <p className="text-[9px] text-white/50 uppercase font-bold">Category</p>
                                  <p className="text-xs text-white font-bold tracking-wide">{featuredProduct.productCategory}</p>
                              </div>
                          </div>
                      </div>
                  </div>
                )} */}

            </div>
          </div>

        </div>

        {/* Footer: Technical Detail */}
        <div className="mt-auto pt-8 border-t border-white/10 flex justify-between items-end">
            <div className="hidden md:block text-[10px] text-gray-500 font-mono uppercase tracking-widest max-w-xs">
                Precision crafted for modern interiors. <br/> {featuredProduct.productSubCategory || 'Premium Quality'}
            </div>
        </div>

      </div>

      {/* Custom Keyframe for Floating Animation */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
};

export default AireFeaturedProducts;
