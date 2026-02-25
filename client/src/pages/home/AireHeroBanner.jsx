import React from 'react';
import { useNavigate } from 'react-router-dom';

const AireHeroBanner = () => {
  const navigate = useNavigate();

  const handleShopCollection = () => {
    navigate('/products'); 
  };

  return (
    <section className="relative min-h-[97vh] lg:h-[calc(100vh-2rem)] lg:max-h-[900px] mx-2 my-2 md:mx-4 md:my-4 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl flex items-center group bg-[#1a2822]">
      
      {/* --- BACKGROUND IMAGE LAYER --- */}
      <div className="absolute inset-0 z-0">
        <img
          src="/assets/hero2.webp"
          onError={(e) => {
            e.target.onerror = null;
            // Fallback
            e.target.src = "https://images.unsplash.com/photo-1513519247388-193ad5130246?q=80&w=2500";
          }}
          alt="Hero Background"
          className="w-full h-full object-cover opacity-80 lg:opacity-70 transition-transform duration-[20s] ease-in-out group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-[#2E443C]/20 via-[#2E443C]/60 to-[#1a2822] lg:bg-gradient-to-r lg:from-[#2E443C] lg:via-[#2E443C]/40 lg:to-transparent"></div>
      </div>

      <div className="relative z-10 w-full px-6 md:px-12 lg:px-20 py-12">
        <div className="w-full max-w-7xl mx-auto">
          <div cla-ssName="max-w-3xl space-y-4 flex flex-col items-center sm:items-start text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 shadow-sm w-fit">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F5DEB3] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F5DEB3]"></span>
              </span>
              <span className="text-[10px] font-bold tracking-widest uppercase text-stone-200">Limited Collection</span>
            </div>

            {/* Heading */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl xl:text-7xl font-serif text-white drop-shadow-lg mb-5 leading-tight">
              Make Every <br />
              Corner <span className="italic font-light text-[#F5DEB3]">Count</span>
            </h1>

            {/* Paragraph */}
            <p className="fade-in-up animate-delay-200 text-md md:text-xl text-stone-200 font-light italic max-w-lg mt-4">
              Turn a house into your 
              <span className="font-serif italic text-[#F5DEB3] text-md md:text-2xl ml-1 underline decoration-[#F5DEB3]/50 decoration-2 underline-offset-4">
                Urban Nook.
              </span>
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-4 max-w-lg  w-50 sm:w-auto pt-4">
              <button 
                onClick={handleShopCollection} 
                className="w-full sm:w-auto bg-white text-[#2e443c] px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-stone-200 hover:scale-105 hover:shadow-lg transition-all duration-300"
              >
                Shop Collection
              </button>

              {/* <button className="w-full sm:w-auto px-8 py-3 rounded-full font-bold text-white border border-white/30 hover:bg-white/10 hover:scale-105 transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-widest backdrop-blur-sm">
                <span className="w-6 h-6 rounded-full border border-white flex items-center justify-center">
                  <i className="fa-solid fa-play text-[8px] ml-0.5"></i>
                </span>
                Watch Film
              </button> */}
            </div>

            {/* --- STATS SECTION --- */}
            <div className="pt-8 flex flex-wrap items-center justify-center sm:justify-start gap-y-6 gap-x-8 md:gap-x-6 w-90 border-t border-white/10 mt-6">

              {/* 1. Logistics */}
              <div className="text-center sm:text-left">
                {/* Fixed Typo: Affortable -> Affordable */}
                <p className="text-2xl font-serif italic text-white">Affordable</p>
                <p className="text-[10px] text-[#F5DEB3] uppercase tracking-widest font-bold mt-1">Pricing</p>
              </div>

              <div className="hidden sm:block w-px h-10 bg-white/20"></div>

              {/* 2. Policy */}
              <div className="text-center sm:text-left">
                <p className="text-2xl font-serif italic text-white">7-Day</p>
                <p className="text-[10px] text-[#F5DEB3] uppercase tracking-widest font-bold mt-1">Easy Returns</p>
              </div>

              <div className="hidden sm:block w-px h-10 bg-white/20"></div>

              {/* 3. Product Quality */}
              <div className="text-center sm:text-left">
                <p className="text-2xl font-serif italic text-white">100%</p>
                <p className="text-[10px] text-[#F5DEB3] uppercase tracking-widest font-bold mt-1">Quality Checked</p>
              </div>

              <div className="hidden sm:block w-px h-10 bg-white/20"></div>

              {/* 4. Support */}
              <div className="text-center sm:text-left">
                <p className="text-2xl font-serif italic text-white">24/7</p>
                <p className="text-[10px] text-[#F5DEB3] uppercase tracking-widest font-bold mt-1">Support</p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default AireHeroBanner;