import React, { useState, useEffect } from 'react';

const featuredCollections = [
  {
    id: 1,
    category: "Everyday Carry",
    title: "Premium Keychain Series",
    description: "Elevate your daily essentials with our handcrafted leather and metal keychains. Designed for durability and aesthetic pleasure.",
    image: "https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=2000&auto=format&fit=crop",
    stats: "12+ Designs",
    trending: ["Leather Loop", "Tactical Clip", "Minimalist Ring"],
    color: "from-orange-400 to-red-500"
  },
  {
    id: 2,
    category: "Automotive",
    title: "Luxury Car Interior",
    description: "Transform your commute into a first-class experience. Our organizers and decor bring order and style to your vehicle.",
    image: "https://images.unsplash.com/photo-1592853625601-bb9d23da12fc?q=80&w=2000&auto=format&fit=crop",
    stats: "New Arrival",
    trending: ["Seat Organizer", "Phone Mount", "Trash Bin"],
    color: "from-blue-400 to-indigo-500"
  },
  {
    id: 3,
    category: "Workspace",
    title: "Modern Desk Setup",
    description: "Find your focus with our curated desk lamps and organizers. Create a space that inspires creativity and productivity.",
    image: "https://images.unsplash.com/photo-1497215842964-222b4bef97ed?q=80&w=2000&auto=format&fit=crop",
    stats: "Best Seller",
    trending: ["Nordic Lamp", "Cable Management", "Desk Mat"],
    color: "from-emerald-400 to-teal-500"
  }
];

const AireFeaturedProducts = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const nextSlide = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev + 1) % featuredCollections.length);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const prevSlide = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev - 1 + featuredCollections.length) % featuredCollections.length);
    setTimeout(() => setIsAnimating(false), 500);
  };

  // Auto-play
  useEffect(() => {
    const timer = setInterval(nextSlide, 6000);
    return () => clearInterval(timer);
  }, []);

  const currentProduct = featuredCollections[currentIndex];

  return (
    // Main Container: Fixed Height constraints to keep it "Hero" like
    <section className="relative h-[calc(100vh-2rem)] min-h-[600px] max-h-[900px] mx-4 my-4 rounded-[2.5rem] overflow-hidden bg-[#2e443c] shadow-2xl flex flex-col justify-center">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className={`absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br ${currentProduct.color} opacity-10 rounded-full blur-[120px] transition-colors duration-1000`}></div>
      </div>

      <div className="relative z-10 w-full px-6 md:px-16 flex flex-col h-full py-8 md:py-12">
        <div className="max-w-7xl mx-auto w-full flex flex-col h-full justify-between">
        
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-end mb-4 border-b border-white/10 pb-4 shrink-0">
            <div>
              <span className="text-emerald-400 font-bold tracking-widest uppercase text-xs mb-1 block">
                Curated Collections
              </span>
              <h2 className="text-3xl md:text-4xl font-serif text-white">
                Featured <span className="italic text-gray-400">Essentials</span>
              </h2>
            </div>
            
            {/* Controls */}
            <div className="flex gap-3 mt-4 md:mt-0">
              <button onClick={prevSlide} className="w-10 h-10 rounded-full border border-white/20 text-white flex items-center justify-center hover:bg-white hover:text-black transition-all">
                <i className="fa-solid fa-arrow-left text-sm"></i>
              </button>
              <button onClick={nextSlide} className="w-10 h-10 rounded-full border border-white/20 text-white flex items-center justify-center hover:bg-white hover:text-black transition-all">
                <i className="fa-solid fa-arrow-right text-sm"></i>
              </button>
            </div>
          </div>

          {/* Main Content Area - Expands to fill available space */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center flex-1 min-h-0">
            
            {/* Left Column: Text Info */}
            <div className="lg:col-span-5 h-full flex flex-col justify-center order-2 lg:order-1 overflow-y-auto lg:overflow-visible">
               <div key={currentProduct.id} className="animate-fadeIn space-y-4">
                  <div className="flex items-center gap-2">
                     <span className="text-xs font-bold text-black bg-white px-2 py-1 rounded">
                       0{currentIndex + 1}
                     </span>
                     <span className="text-xs text-gray-400 uppercase tracking-widest">
                       {currentProduct.category}
                     </span>
                  </div>
                  
                  <h3 className="text-3xl lg:text-5xl font-light text-white leading-[1.1]">
                    {currentProduct.title}
                  </h3>
                  
                  <p className="text-sm lg:text-base text-gray-300 leading-relaxed max-w-md">
                    {currentProduct.description}
                  </p>

                  {/* Trending Box */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm max-w-sm">
                      <p className="text-xs text-emerald-400 font-bold uppercase mb-2">Trending in this collection</p>
                      <ul className="space-y-2">
                          {currentProduct.trending.map((item, i) => (
                              <li key={i} className="flex items-center justify-between text-gray-300 text-xs border-b border-white/5 pb-1 last:border-0 last:pb-0">
                                  <span>{item}</span>
                                  <i className="fa-solid fa-chevron-right text-[8px] opacity-50"></i>
                              </li>
                          ))}
                      </ul>
                  </div>

                  <div className="pt-2">
                      <button className="bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-gray-200 transition-all flex items-center gap-2 text-sm group">
                        Explore Collection
                        <i className="fa-solid fa-arrow-right-long group-hover:translate-x-1 transition-transform"></i>
                      </button>
                  </div>
               </div>
            </div>

            {/* Right Column: Image - Adapts height automatically */}
            <div className="lg:col-span-7 h-[300px] lg:h-full max-h-[500px] relative order-1 lg:order-2 group w-full">
              <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl h-full w-full">
                 <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-all duration-500 z-10"></div>
                 <img 
                   src={currentProduct.image} 
                   alt={currentProduct.title}
                   className={`w-full h-full object-cover transition-all duration-700 ease-out transform ${isAnimating ? 'scale-110 blur-sm' : 'scale-100 blur-0'}`}
                 />
              </div>

              {/* Badges */}
              <div className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur text-black px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                  {currentProduct.stats}
              </div>
               <div className="absolute bottom-4 left-4 z-20">
                  <button className="w-10 h-10 bg-black/50 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-emerald-500 transition-colors">
                      <i className="fa-solid fa-plus text-sm"></i>
                  </button>
               </div>
            </div>

          </div>
          
          {/* Progress Bar - Pushed to bottom */}
          <div className="mt-4 flex items-center justify-center gap-2 shrink-0">
              {featuredCollections.map((_, idx) => (
                  <div 
                      key={idx} 
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-1 rounded-full cursor-pointer transition-all duration-500 ${
                          idx === currentIndex ? 'w-10 bg-emerald-400' : 'w-4 bg-gray-700 hover:bg-gray-500'
                      }`}
                  ></div>
              ))}
          </div>

        </div>
      </div>

      {/* WhatsApp Button */}
      <div className="absolute bottom-8 right-8 z-50">
        <button className="w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#1da851] hover:scale-110 transition-all duration-300">
          <i className="fab fa-whatsapp text-2xl"></i>
        </button>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </section>
  );
};

export default AireFeaturedProducts;