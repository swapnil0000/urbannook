import React from 'react';
import { useNavigate } from 'react-router-dom';

// Single Featured Product Data
const featuredProduct = {
  id: 1,
  category: "Lighting",
  slug: "neon-rotor-lamp",
  title: "Neon Rotor Lamp",
  subtitle: "Designed to stand out.",
  description: "Bold fusion of automotive design and ambient lighting. Inspired by high-performance brake rotors, designed for desks, shelves, and bedside tables, its clean geometry and vibrant illumination make it both a statement piece and a functional light source.",
  image: "/assets/featuredproduct.webp", // Ensure this path is correct
  price: 1499,
  tag: "Signature Piece",
  material: "Matte PLA+",
  printTime: "18 Hours",
  layerHeight: "0.16mm"
};

const AireFeaturedProducts = () => {
  const navigate = useNavigate();

  return (
    <section className="relative mx-2 my-2 md:mx-4 md:my-4 rounded-[2rem] md:rounded-[3rem] overflow-hidden bg-[#2e443c] shadow-2xl flex flex-col justify-center min-h-[85vh] lg:h-[calc(100vh-2rem)] lg:max-h-[1080px] border border-white/5">
    
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none select-none z-0 overflow-hidden">
        <span className="text-[8rem] md:text-[20rem] lg:text-[25rem] font-black text-white/[0.03] leading-none whitespace-nowrap">
         NEON 
        </span>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] lg:w-[800px] h-[300px] lg:h-[800px] bg-[#F5DEB3] rounded-full blur-[150px] lg:blur-[200px] opacity-10 pointer-events-none"></div>

      <div className="relative z-10 w-full h-full flex flex-col px-6 py-12 md:px-16 md:py-16">
        
        <div className="flex justify-between items-start w-full border-b border-white/10 pb-6 mb-8 mt-8 lg:mb-auto">
             <div className="flex items-center gap-3">
                <span className="w-2 h-2 bg-[#F5DEB3] rounded-full animate-pulse"></span>
                <span className="text-[#F5DEB3] font-mono text-xs tracking-[0.3em] uppercase">Limited Edition</span>
             </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center flex-1">
          
          <div className="lg:col-span-5 flex flex-col justify-center order-2 lg:order-1">
             
             {/* Tag */}
             <div className="mb-6">
                <span className="px-4 py-2 rounded-full border border-[#F5DEB3]/30 text-[#F5DEB3] text-[10px] font-bold uppercase tracking-widest bg-[#F5DEB3]/5">
                    {featuredProduct.tag}
                </span>
             </div>

             {/* Title */}
             <h2 className="text-5xl md:text-7xl lg:text-8xl font-serif text-white leading-[0.9] mb-4">
                {featuredProduct.title}
             </h2>

             {/* Subtitle */}
             <p className="text-xl md:text-2xl text-[#F5DEB3]/80 italic font-light mb-8">
                {featuredProduct.subtitle}
             </p>

             {/* Divider */}
             <div className="w-20 h-px bg-gradient-to-r from-[#F5DEB3] to-transparent mb-8"></div>

             {/* Description */}
             <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-lg mb-10">
                {featuredProduct.description}
             </p>

             {/* Actions */}
             <div className="flex flex-wrap items-center gap-6">
                <button 
                  onClick={() => navigate(`/product/${featuredProduct.category}/${featuredProduct.slug}`)}
                  className="group relative px-10 py-4 bg-white text-black rounded-full font-bold uppercase tracking-widest text-xs overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                >
                  <span className="relative z-10">View Product</span>
                  <div className="absolute inset-0 bg-[#F5DEB3] translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                </button>
                
                <div className="flex flex-col">
                    <span className="text-white text-lg font-serif">₹{featuredProduct.price.toLocaleString()}</span>
                    <span className="text-[10px] text-[#F5DEB3]/80  uppercase tracking-widest font-bold">Limited Stock</span>
                </div>
             </div>
          </div>

          {/* RIGHT: Image Showcase */}
          <div className="lg:col-span-7 relative flex items-center justify-center order-1 lg:order-2">
            
            {/* The Image Card */}
            <div className="relative w-full max-w-[350px] md:max-w-[450px] aspect-[4/5] group">
                
                {/* Glow behind image */}
                <div className="absolute inset-0 bg-[#F5DEB3]/20 rounded-[2.5rem] blur-2xl transform group-hover:scale-105 transition-transform duration-700"></div>

                {/* Main Image Container */}
                <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden border border-white/10 bg-[#121212] shadow-2xl">
                    <img 
                        src={featuredProduct.image} 
                        alt={featuredProduct.title}
                        className="w-full h-full object-cover transform transition-transform duration-[1.5s] ease-out group-hover:scale-110"
                    />
                    
                    {/* Gradient Overlay for Text readability if image is bright */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                </div>

                {/* Floating Spec Card (Glassmorphism) */}
                <div className="absolute -right-4 md:-right-10 bottom-10 bg-white/10 backdrop-blur-xl border border-white/20 p-5 rounded-2xl shadow-2xl animate-float hidden sm:block">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#F5DEB3]/20 flex items-center justify-center">
                                <i className="fa-solid fa-cube text-[#F5DEB3] text-xs"></i>
                            </div>
                            <div>
                                <p className="text-[9px] text-white/50 uppercase font-bold">Material</p>
                                <p className="text-xs text-white font-bold tracking-wide">{featuredProduct.material}</p>
                            </div>
                        </div>
                        <div className="h-px bg-white/10 w-full"></div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#F5DEB3]/20 flex items-center justify-center">
                                <i className="fa-solid fa-clock text-[#F5DEB3] text-xs"></i>
                            </div>
                            <div>
                                <p className="text-[9px] text-white/50 uppercase font-bold">Print Time</p>
                                <p className="text-xs text-white font-bold tracking-wide">{featuredProduct.printTime}</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
          </div>

        </div>

        {/* Footer: Technical Detail */}
        <div className="mt-auto pt-8 border-t border-white/10 flex justify-between items-end">
            <div className="hidden md:block text-[10px] text-gray-500 font-mono uppercase tracking-widest max-w-xs">
                Precision engineered using FDM technology. <br/> Designed for modern interiors.
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