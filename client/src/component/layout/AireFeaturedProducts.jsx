import React, { useState, useEffect } from 'react';

const featuredCollections = [
  {
    id: 1,
    category: "Lighting",
    title: "The Voronoi Glow",
    subtitle: "3D Printed Table Lamp",
    description: "Inspired by natural cellular structures. This biodegradable PLA lamp casts a warm, intricate web of shadows, transforming any room into a cozy sanctuary.",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2000&auto=format&fit=crop", 
    price: "₹2,499",
    tag: "Best Seller",
    color: "from-orange-400/20 to-amber-500/20"
  },
  {
    id: 2,
    category: "Decor",
    title: "Geometric Vase",
    subtitle: "Spiral Layer Series",
    description: "Precision-printed with 0.2mm layer height. The translucent finish catches the morning sun and evening lamps alike, glowing from within.",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2000&auto=format&fit=crop", 
    price: "₹1,299",
    tag: "Eco-Friendly",
    color: "from-yellow-400/20 to-orange-500/20"
  },
  {
    id: 3,
    category: "Organization",
    title: "Hexagon Hive",
    subtitle: "Modular Wall Light",
    description: "Customize your ambiance. These magnetic hexagonal tiles can be arranged in any pattern and emit a soft, warm 2700K light.",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2000&auto=format&fit=crop", 
    price: "₹3,999",
    tag: "New Arrival",
    color: "from-amber-300/20 to-red-400/20"
  }
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

  useEffect(() => {
    const timer = setInterval(nextSlide, 6000);
    return () => clearInterval(timer);
  }, []);

  const current = featuredCollections[currentIndex];

  return (
    <section className="relative h-[calc(100vh-2rem)] min-h-[700px] max-h-[900px] mx-4 my-4 rounded-[2.5rem] overflow-hidden bg-[#2e443c] shadow-2xl flex flex-col justify-center border border-white/5">
      
      {/* Warm Ambient Glow Background */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br ${current.color} rounded-full blur-[120px] transition-all duration-1000 opacity-40 pointer-events-none`}></div>

      <div className="relative z-10 w-full px-6 md:px-16 flex flex-col h-full py-8 md:py-12">
        <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
        
          {/* --- CENTERED HEADER SECTION --- */}
          <div className="flex flex-col items-center text-center shrink-0 border-b border-white/10 pb-8 mb-6 relative">
            
            {/* Title Block */}
            <div className="flex flex-col items-center mb-6">
               <div className="flex items-center gap-3 mb-3 bg-white/5 px-4 py-1 rounded-full border border-white/5">
                 <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></span>
                 <span className="text-orange-100/80 font-bold tracking-[0.2em] uppercase text-[10px]">
                   Fresh from the Printer
                 </span>
               </div>
               <h2 className="text-4xl md:text-5xl font-serif text-white">
                 Featured <span className="italic text-orange-200 font-light">Creations</span>
               </h2>
            </div>
            
            {/* Controls & PROMINENT CTA */}
            <div className="flex flex-wrap justify-center items-center gap-4">
               {/* Previous Button */}
               <button onClick={prevSlide} className="w-10 h-10 rounded-full border border-white/20 text-white flex items-center justify-center hover:bg-white hover:text-[#2e443c] transition-all active:scale-95">
                 <i className="fa-solid fa-angle-left"></i>
               </button>

               {/* IMPORTANT VIEW ALL CTA */}
               <a 
                 href="/products" 
                 className="group relative px-8 py-3 bg-white/10 border border-white/20 rounded-full text-white text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-[#2e443c] transition-all duration-300 shadow-lg hover:shadow-orange-100/20 flex items-center gap-3"
               >
                  <span>View Full Catalog</span>
                  <i className="fa-solid fa-arrow-right-long group-hover:translate-x-1 transition-transform"></i>
               </a>

               {/* Next Button */}
               <button onClick={nextSlide} className="w-10 h-10 rounded-full border border-white/20 text-white flex items-center justify-center hover:bg-white hover:text-[#2e443c] transition-all active:scale-95">
                 <i className="fa-solid fa-angle-right"></i>
               </button>
            </div>
          </div>

          {/* --- MAIN SLIDER CONTENT --- */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center flex-1 min-h-0">
            
            {/* Left Column: Text Content */}
            <div className="lg:col-span-5 flex flex-col justify-center order-2 lg:order-1 relative">
               <div key={current.id} className="animate-fadeUp text-center lg:text-left">
                  
                  {/* Category Tag */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-400/10 border border-orange-400/20 w-fit mb-6 mx-auto lg:mx-0">
                    <i className="fa-solid fa-cube text-orange-300 text-xs"></i>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-orange-100">{current.category}</span>
                  </div>
                  
                  <h3 className="text-4xl lg:text-6xl font-serif text-white leading-[1.1] mb-2">
                    {current.title}
                  </h3>
                  <p className="text-xl font-light italic text-orange-200/60 mb-6">
                    {current.subtitle}
                  </p>
                  
                  <div className="h-px w-20 bg-gradient-to-r from-orange-400 to-transparent mb-6 mx-auto lg:mx-0"></div>

                  <p className="text-sm lg:text-base text-gray-300 leading-relaxed max-w-md mb-8 mx-auto lg:mx-0">
                    {current.description}
                  </p>

                  <div className="flex items-center justify-center lg:justify-start gap-4">
                      <button className="bg-orange-100 text-[#2e443c] px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-white transition-all shadow-lg hover:shadow-orange-100/20 active:scale-95">
                        Shop Now • {current.price}
                      </button>
                      <button className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-all" title="Add to Wishlist">
                         <i className="fa-regular fa-heart"></i>
                      </button>
                  </div>
               </div>
            </div>

            {/* Right Column: Image Display */}
            <div className="lg:col-span-7 h-[350px] lg:h-full lg:max-h-none relative order-1 lg:order-2 group">
              <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10">
                 
                 {/* Image */}
                 <img 
                   src={current.image} 
                   alt={current.title}
                   className={`w-full h-full object-cover transition-all duration-1000 ${isAnimating ? 'scale-110 opacity-80' : 'scale-100 opacity-100'}`}
                 />

                 {/* Warm Overlay Vignette */}
                 <div className="absolute inset-0 bg-gradient-to-t from-[#2e443c] via-transparent to-transparent opacity-60"></div>
                 
                 {/* Floating Tag */}
                 <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg z-20 animate-float">
                    <span className="text-xs font-bold text-[#2e443c] uppercase tracking-wide">
                      {current.tag}
                    </span>
                 </div>

                 {/* Interactive "Hotspot" */}
                 <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10 z-20 group/hotspot cursor-pointer">
                    <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 hover:bg-black/60 transition-colors">
                       <div className="w-8 h-8 rounded-full bg-orange-400/20 flex items-center justify-center">
                          <i className="fa-solid fa-layer-group text-orange-300 text-xs"></i>
                       </div>
                       <div>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">Material</p>
                          <p className="text-xs text-white font-medium">PLA+ / Biodegradable</p>
                       </div>
                    </div>
                 </div>

              </div>
            </div>

          </div>
          
          {/* Bottom Progress Bar */}
          <div className="mt-8 flex items-center gap-4 shrink-0 justify-center lg:justify-start">
              <span className="text-[10px] font-bold text-white/40">01</span>
              <div className="w-full md:w-64 h-[2px] bg-white/10 rounded-full overflow-hidden">
                 <div 
                   className="h-full bg-orange-400 transition-all duration-500 ease-out"
                   style={{ width: `${((currentIndex + 1) / featuredCollections.length) * 100}%` }}
                 ></div>
              </div>
              <span className="text-[10px] font-bold text-white/40">0{featuredCollections.length}</span>
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