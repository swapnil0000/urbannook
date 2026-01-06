import React, { useState, useEffect } from 'react';

const featuredCollections = [
  {
    id: 1,
    category: "Lighting",
    title: "The Voronoi Glow",
    subtitle: "3D Printed Table Lamp",
    description: "Inspired by natural cellular structures. This biodegradable PLA lamp casts a warm, intricate web of shadows, transforming any room into a cozy sanctuary.",
    image: "/assets/featuredproduct.png", 
    price: "₹2,499",
    tag: "Best Seller",
    color: "from-orange-400/20 to-amber-500/20"
  },
  // Add other items here...
];

const AireFeaturedProducts = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const nextSlide = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev + 1) % featuredCollections.length);
    setTimeout(() => setIsAnimating(false), 700);
  };

  const prevSlide = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev - 1 + featuredCollections.length) % featuredCollections.length);
    setTimeout(() => setIsAnimating(false), 700);
  };

  // Auto-play
  useEffect(() => {
    const timer = setInterval(nextSlide, 6000);
    return () => clearInterval(timer);
  }, []);

  const current = featuredCollections[currentIndex];

  return (
    // CHANGED: 
    // Mobile: h-auto py-6 (Let height grow naturally, tight padding)
    // Desktop: h-[calc(100vh-2rem)] (Poster look)
    <section className="relative mx-2 my-2 md:mx-4 md:my-4 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden bg-[#2e443c] shadow-2xl flex flex-col border border-white/5
      h-auto min-h-[600px] lg:h-[calc(100vh-2rem)] lg:max-h-[900px]">
      
      {/* Warm Ambient Glow Background */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[800px] h-[300px] md:h-[800px] bg-gradient-to-br ${current.color} rounded-full blur-[80px] md:blur-[120px] transition-all duration-1000 opacity-40 pointer-events-none`}></div>

      {/* CHANGED: Reduced padding for mobile (px-5 py-6) vs desktop (px-16 py-12) */}
      <div className="relative z-10 w-full px-5 py-6 md:px-12 lg:px-16 lg:py-12 flex flex-col h-full">
        <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
        
          {/* --- HEADER SECTION --- */}
          {/* CHANGED: Tighter margins and smaller text on mobile */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end shrink-0 border-b border-white/10 pb-4 md:pb-6 mb-4 md:mb-0">
            <div>
              <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                 <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-orange-400 rounded-full animate-pulse"></span>
                 <span className="text-orange-200/80 font-bold tracking-[0.2em] uppercase text-[8px] md:text-[10px]">
                   Fresh from the Printer
                 </span>
              </div>
              <h2 className="text-2xl md:text-4xl font-serif text-white leading-tight">
                Featured <span className="italic text-orange-200 font-light">Creations</span>
              </h2>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-3 md:gap-6 mt-4 md:mt-0 w-full md:w-auto justify-between md:justify-end">
              <a href="/products" className="group relative px-5 py-2.5 md:px-8 md:py-3 bg-white/10 border border-white/20 rounded-full text-white text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-[#2e443c] transition-all duration-300 flex items-center gap-2 md:gap-3">
                  <span>View Catalog</span>
                  <i className="fa-solid fa-arrow-right-long group-hover:translate-x-1 transition-transform"></i>
               </a>
               
               <div className="flex gap-2">
                 <button onClick={prevSlide} className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-white/20 text-white flex items-center justify-center hover:bg-white hover:text-[#2e443c] transition-all">
                   <i className="fa-solid fa-angle-left text-xs md:text-base"></i>
                 </button>
                 <button onClick={nextSlide} className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-white/20 text-white flex items-center justify-center hover:bg-white hover:text-[#2e443c] transition-all">
                   <i className="fa-solid fa-angle-right text-xs md:text-base"></i>
                 </button>
               </div>
            </div>
          </div>

          {/* --- MAIN CONTENT AREA (Grid) --- */}
          {/* CHANGED: Reduced gap from 12 to 6 on mobile. my-4 instead of my-8 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-16 items-center flex-1 my-4 lg:my-auto">
            
            {/* Right Column: Image Display (Shown FIRST on Mobile) */}
            <div className="lg:col-span-7 w-full relative order-1 lg:order-2 flex items-center justify-center lg:justify-end">
              
              {/* CHANGED: Smaller max-width on mobile (max-w-[280px]) to prevent taking up whole screen height */}
              <div className="relative w-full max-w-[280px] md:max-w-md aspect-[4/5] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 bg-black/20 group">
                 
                 <img 
                   src={current.image} 
                   alt={current.title}
                   className={`w-full h-full object-cover object-center transition-all duration-1000 ${isAnimating ? 'scale-110 opacity-80' : 'scale-100 opacity-100'}`}
                 />

                 <div className="absolute inset-0 bg-gradient-to-t from-[#2e443c]/80 via-transparent to-transparent opacity-60"></div>
                 
                 <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 md:px-4 md:py-2 rounded-lg md:rounded-xl shadow-lg z-20">
                    <span className="text-[10px] md:text-xs font-bold text-[#2e443c] uppercase tracking-wide">
                      {current.tag}
                    </span>
                 </div>

                 {/* Hotspot (Hidden on very small screens if needed, or kept small) */}
                 <div className="absolute bottom-4 left-4 md:bottom-10 md:left-10 z-20 group/hotspot cursor-pointer">
                    <div className="flex items-center gap-2 md:gap-3 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                       <div className="w-6 h-6 rounded-full bg-orange-400/20 flex items-center justify-center">
                          <i className="fa-solid fa-layer-group text-orange-300 text-[10px]"></i>
                       </div>
                       <div className="hidden sm:block">
                          <p className="text-[8px] text-gray-400 uppercase font-bold">Material</p>
                          <p className="text-[10px] text-white font-medium">PLA+</p>
                       </div>
                    </div>
                 </div>
              </div>
            </div>

            {/* Left Column: Text Content (Shown SECOND on Mobile) */}
            <div className="lg:col-span-5 flex flex-col justify-center order-2 lg:order-1 relative  lg:text-left items-center lg:items-start">
               <div key={current.id} className="animate-fadeUp w-full">
                  
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 w-fit mb-3 md:mb-6 mx-auto lg:mx-0">
                    <i className="fa-solid fa-cube text-orange-300 text-[10px] md:text-xs"></i>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/90">{current.category}</span>
                  </div>
                  
                  <h3 className="text-3xl md:text-5xl lg:text-6xl font-serif text-white leading-[1.1] mb-2">
                    {current.title}
                  </h3>
                  <p className="text-base md:text-xl font-light italic text-orange-200/60 mb-4 md:mb-6">
                    {current.subtitle}
                  </p>
                  
                  {/* CHANGED: Centered separator on mobile */}
                  <div className="h-px w-16 md:w-20 bg-gradient-to-r from-transparent via-orange-400 to-transparent lg:from-orange-400 lg:to-transparent mb-4 md:mb-6 mx-auto lg:mx-0"></div>

                  <p className="text-sm text-gray-300 leading-relaxed max-w-md mb-6 md:mb-8 mx-auto lg:mx-0">
                    {current.description}
                  </p>

                  <div className="flex flex-wrap justify-center lg:justify-start  gap-3 md:gap-4">
                      <button className="bg-orange-100 text-[#2e443c] px-6 py-3 md:px-8 md:py-4 rounded-full font-bold uppercase tracking-widest text-[10px] md:text-xs hover:bg-white transition-all shadow-lg active:scale-95">
                        Shop • {current.price}
                      </button>
                      <button className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-all">
                         <i className="fa-regular fa-heart"></i>
                      </button>
                  </div>
               </div>
            </div>

          </div>
          
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeUp {
          animation: fadeUp 0.6s ease-out forwards;
        }
      `}</style>
    </section>
  );
};

export default AireFeaturedProducts;