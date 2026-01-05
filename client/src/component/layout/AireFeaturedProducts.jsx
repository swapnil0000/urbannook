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
    // CHANGED: Switched height to be responsive. 
    // Mobile: h-auto min-h-[850px] (Grows with content, prevents overlap)
    // Desktop: lg:h-[calc(100vh-2rem)] (Locks to screen size for aesthetic)
    <section className="relative mx-2 my-2 md:mx-4 md:my-4 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden bg-[#2e443c] shadow-2xl flex flex-col border border-white/5
      h-auto min-h-[780px] lg:h-[calc(100vh-2rem)] lg:max-h-[900px]">
      
      {/* Warm Ambient Glow Background */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] md:w-[800px] h-[600px] md:h-[800px] bg-gradient-to-br ${current.color} rounded-full blur-[100px] md:blur-[120px] transition-all duration-1000 opacity-40 pointer-events-none`}></div>

      <div className="relative z-10 w-full px-6 md:px-12 lg:px-16 flex flex-col h-full py-10 md:py-12">
        <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
        
          {/* --- HEADER SECTION --- */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end shrink-0 border-b border-white/10 pb-6 mb-4 md:mb-0">
            <div>
              <div className="flex items-center gap-3 mb-2">
                 <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></span>
                 <span className="text-orange-200/80 font-bold tracking-[0.2em] uppercase text-[10px]">
                   Fresh from the Printer
                 </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-serif text-white leading-tight">
                Featured <span className="italic text-orange-200 font-light">Creations</span>
              </h2>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-4 md:gap-6 mt-6 md:mt-0 w-full md:w-auto justify-between md:justify-end">
              <a href="/products" className="group relative px-6 md:px-8 py-3 bg-white/10 border border-white/20 rounded-full text-white text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-[#2e443c] transition-all duration-300 shadow-lg hover:shadow-orange-100/20 flex items-center gap-3">
                  <span>View Full Catalog</span>
                  <i className="fa-solid fa-arrow-right-long group-hover:translate-x-1 transition-transform"></i>
               </a>
               
               <div className="flex gap-2">
                 <button onClick={prevSlide} className="w-10 h-10 rounded-full border border-white/20 text-white flex items-center justify-center hover:bg-white hover:text-[#2e443c] transition-all">
                   <i className="fa-solid fa-angle-left"></i>
                 </button>
                 <button onClick={nextSlide} className="w-10 h-10 rounded-full border border-white/20 text-white flex items-center justify-center hover:bg-white hover:text-[#2e443c] transition-all">
                   <i className="fa-solid fa-angle-right"></i>
                 </button>
               </div>
            </div>
          </div>

          {/* --- MAIN CONTENT AREA (Grid) --- */}
          {/* CHANGED: Added my-auto to vertically center this block between header/footer on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center flex-1 my-8 lg:my-auto">
            
            {/* Left Column: Text Content */}
            <div className="lg:col-span-5 flex flex-col justify-center order-2 lg:order-1 relative">
               <div key={current.id} className="animate-fadeUp">
                  
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 w-fit mb-4 md:mb-6">
                    <i className="fa-solid fa-cube text-orange-300 text-xs"></i>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/90">{current.category}</span>
                  </div>
                  
                  <h3 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white leading-[1.1] mb-2">
                    {current.title}
                  </h3>
                  <p className="text-lg md:text-xl font-light italic text-orange-200/60 mb-6">
                    {current.subtitle}
                  </p>
                  
                  <div className="h-px w-20 bg-gradient-to-r from-orange-400 to-transparent mb-6"></div>

                  <p className="text-sm md:text-base text-gray-300 leading-relaxed max-w-md mb-8">
                    {current.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4">
                      <button className="bg-orange-100 text-[#2e443c] px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-white transition-all shadow-lg hover:shadow-orange-100/20 active:scale-95">
                        Shop Now • {current.price}
                      </button>
                      <button className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-all">
                         <i className="fa-regular fa-heart"></i>
                      </button>
                  </div>
               </div>
            </div>

            {/* Right Column: Image Display */}
            {/* CHANGED: justify-center for all screens, added padding support */}
            <div className="lg:col-span-7 w-full relative order-1 lg:order-2 flex items-center justify-center lg:justify-end">
              
              {/* CHANGED: max-w-md for specific size control, preventing it from touching edges */}
              <div className="relative w-full max-w-[340px] md:max-w-md aspect-[4/5] rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 bg-black/20 group">
                 
                 <img 
                   src={current.image} 
                   alt={current.title}
                   className={`w-full h-full object-cover object-center transition-all duration-1000 ${isAnimating ? 'scale-110 opacity-80' : 'scale-100 opacity-100'}`}
                 />

                 {/* Warm Overlay */}
                 <div className="absolute inset-0 bg-gradient-to-t from-[#2e443c]/80 via-transparent to-transparent opacity-60"></div>
                 
                 {/* Floating Tag */}
                 <div className="absolute top-4 right-4 md:top-6 md:right-6 bg-white/90 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 rounded-xl shadow-lg z-20 animate-float">
                    <span className="text-[10px] md:text-xs font-bold text-[#2e443c] uppercase tracking-wide">
                      {current.tag}
                    </span>
                 </div>

                 {/* Hotspot */}
                 <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10 z-20 group/hotspot cursor-pointer">
                    <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-white/10 hover:bg-black/60 transition-colors">
                       <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-orange-400/20 flex items-center justify-center">
                          <i className="fa-solid fa-layer-group text-orange-300 text-[10px] md:text-xs"></i>
                       </div>
                       <div>
                          <p className="text-[8px] md:text-[10px] text-gray-400 uppercase font-bold">Material</p>
                          <p className="text-[10px] md:text-xs text-white font-medium">PLA+ / Biodegradable</p>
                       </div>
                    </div>
                 </div>

              </div>
            </div>

          </div>
          
          {/* --- BOTTOM PROGRESS BAR --- */}
          {/* <div className="flex items-center gap-4 shrink-0 mt-auto pt-4 md:pt-0">
              <span className="text-[10px] font-bold text-white/40">01</span>
              <div className="flex-1 h-[2px] bg-white/10 rounded-full overflow-hidden">
                 <div 
                   className="h-full bg-orange-400 transition-all duration-500 ease-out"
                   style={{ width: `${((currentIndex + 1) / featuredCollections.length) * 100}%` }}
                 ></div>
              </div>
              <span className="text-[10px] font-bold text-white/40">0{featuredCollections.length}</span>
          </div> */}

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
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
};

export default AireFeaturedProducts;