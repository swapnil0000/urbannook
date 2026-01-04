import React from 'react';

const AireHeroBanner = () => {
  return (
    <section className="relative min-h-[100svh] lg:h-[calc(100vh-2rem)] lg:max-h-[900px] mx-2 my-2 md:mx-4 md:my-4 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden bg-[#e8e6e1] shadow-2xl flex flex-col">
      
      {/* Background Decorative Gradient Blobs */}
      <div className="absolute top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-orange-200/30 rounded-full blur-[80px] md:blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-gray-300/40 rounded-full blur-[80px] md:blur-[100px] translate-y-1/2 -translate-x-1/2"></div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full flex-1 flex items-center px-4 md:px-16 py-12 md:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full max-w-7xl mx-auto">
          
          {/* Top Content (Visual) - Order 1 on Mobile */}
          <div className="relative flex items-center justify-center lg:justify-end order-1 lg:order-2 mt-8 lg:mt-0">
            {/* Decorative Circle Behind */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] lg:w-[120%] lg:h-[80%] border border-gray-400/20 rounded-full rotate-12 -z-0"></div>
            
            {/* Main Large Image */}
            <div className="relative w-[260px] sm:w-[320px] md:w-[420px] aspect-[3/4] rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl rotate-[-2deg] hover:rotate-0 transition-transform duration-500 ease-out z-10">
              <img 
                src="https://images.unsplash.com/photo-1616401776146-2495d4d38382?q=80&w=800&auto=format&fit=crop" 
                alt="Urban Interior" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
              <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 text-white">
                <p className="font-serif text-xl md:text-2xl italic">The Urban Series</p>
                <p className="text-[10px] md:text-sm opacity-80 uppercase tracking-widest">Limited Edition</p>
              </div>
            </div>

            {/* Floating Card 1 (Top Left) */}
            <div className="absolute top-[5%] -left-2 sm:left-0 md:-left-8 bg-white/90 backdrop-blur-md p-3 md:p-4 rounded-xl md:rounded-2xl shadow-xl z-20 animate-[float_6s_ease-in-out_infinite]">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden bg-gray-100">
                  <img src="https://images.unsplash.com/photo-1622434641406-a158123450f9?w=150&fit=crop" alt="Watch" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-[10px] md:text-sm font-bold text-gray-800">Smart Key</p>
                  <p className="text-[10px] md:text-xs text-green-600 font-bold">$24.00</p>
                </div>
              </div>
            </div>

            {/* Floating Card 2 (Bottom Right) */}
            <div className="absolute bottom-[10%] -right-2 md:right-8 bg-white/90 backdrop-blur-md p-4 md:p-5 rounded-xl md:rounded-2xl shadow-xl z-20 animate-[float_5s_ease-in-out_infinite_reverse]">
               <div className="flex flex-col gap-1 md:gap-2">
                 <div className="flex items-center justify-between gap-4">
                    <span className="text-[8px] md:text-xs font-black text-gray-400 uppercase tracking-tighter">Best Seller</span>
                    <i className="fa-solid fa-star text-yellow-500 text-[8px] md:text-xs"></i>
                 </div>
                 <p className="text-sm md:text-lg font-serif italic text-gray-900">Leather Folio</p>
                 <button className="text-[10px] bg-black text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full w-full mt-1 font-bold uppercase tracking-widest">View</button>
               </div>
            </div>
          </div>

          {/* Bottom Content (Text) - Order 2 on Mobile */}
          <div className="space-y-6 md:space-y-8 flex flex-col justify-center lg:pr-12 order-2 lg:order-1 text-center lg:text-left items-center lg:items-start">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-white/40 w-fit">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-[10px] font-black tracking-widest uppercase text-gray-600">New Collection 2024</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-serif text-gray-900 leading-[1.1]">
              Elevate Your <br />
              <span className="italic font-light text-gray-600">Everyday Carry</span>
            </h1>
            
            <p className="text-sm md:text-lg text-gray-600 leading-relaxed max-w-lg">
              Discover the intersection of utility and style. From artisan keychains to premium car accessories, redefine what you carry.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto pt-2">
              <button className="w-full sm:w-auto bg-gray-900 text-white px-10 py-4 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-black hover:scale-105 hover:shadow-xl transition-all duration-300">
                Shop Collection
              </button>
              <button className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-gray-800 border border-gray-300 hover:bg-white/50 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest">
                <i className="fa-solid fa-play text-[8px] border border-gray-800 rounded-full p-1.5"></i>
                Watch Film
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="pt-8 flex items-center justify-center lg:justify-start gap-8 border-t border-gray-300/50 w-full lg:w-fit mt-4">
                <div>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900">25k+</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Happy Users</p>
                </div>
                <div className="w-px h-8 bg-gray-300/50"></div>
                <div>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900">4.9</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Rating</p>
                </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default AireHeroBanner;