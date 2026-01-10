import React from 'react';

const AireHeroBanner = () => {
  return (
    <section className="relative min-h-[97vh] lg:h-[calc(100vh-2rem)] lg:max-h-[900px] mx-2 my-2 md:mx-4 md:my-4 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl flex items-center group">

      {/* --- BACKGROUND IMAGE LAYER --- */}
      <div className="absolute inset-0 z-0">
        <img
          src="/assets/hero.png"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "https://images.unsplash.com/photo-1631679706909-1844bbd07221?q=80&w=2500&auto=format&fit=crop";
          }}
          alt="Hero Background"
          className="w-full h-full object-cover transition-transform duration-[20s] ease-in-out group-hover:scale-105"
        />

        {/* --- DARK GRADIENT OVERLAY --- */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent sm:via-black/20"></div>
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      {/* --- CONTENT LAYER --- */}
      <div className="relative z-10 w-full px-6 md:px-12 lg:px-20 py-12">
        <div className="w-full max-w-7xl mx-auto">

          {/* LEFT SIDE CONTENT CONTAINER */}
          <div className="max-w-3xl space-y-4 flex flex-col items-center sm:items-start text-center sm:text-left">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-sm w-fit">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-bold tracking-widest uppercase text-white">New Collection </span>
            </div>

            {/* Heading */}
            <h1 className="text-4xl sm:text-4xl md:text-7xl xl:text-7xl font-serif text-white  drop-shadow-lg mb-5">
              Make Every <br />
              Corner <span className="italic font-light text-stone-300">Count.</span>
            </h1>

            {/* Paragraph */}
            <p className="fade-in-up animate-delay-200 text-md md:text-xl text-stone-200 font-light italic max-w-lg mt-4">
              Turn a house into your <span className="font-serif italic text-emerald-400 text-md md:text-2xl  ml-1 underline decoration-emerald-400 decoration-2 underline-offset-4">Urban Nook.</span>
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto pt-4">
              <button className="w-full sm:w-auto bg-white text-stone-900 px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-stone-200 hover:scale-105 hover:shadow-lg transition-all duration-300">
                Shop Collection
              </button>

              <button className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-white border border-white/30 hover:bg-white/10 transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-widest backdrop-blur-sm">
                <span className="w-6 h-6 rounded-full border border-white flex items-center justify-center">
                  <i className="fa-solid fa-play text-[8px] ml-0.5"></i>
                </span>
                Watch Film
              </button>
            </div>

            {/* --- UPDATED STATS SECTION --- */}
            {/* Added flex-wrap for responsiveness and adjusted gap */}
            <div className="pt-8 flex flex-wrap items-center justify-center sm:justify-start gap-y-6 gap-x-8 md:gap-x-12 w-full border-t border-white/10 mt-6">

              {/* 1. Logistics */}
              <div className="text-center sm:text-left">
                <p className="text-3xl font-serif italic text-white">Pan-India</p>
                <p className="text-[10px] text-stone-300 uppercase tracking-widest font-bold mt-1">Free Shipping</p>
              </div>

              <div className="hidden sm:block w-px h-10 bg-white/20"></div>

              {/* 2. Policy */}
              <div className="text-center sm:text-left">
                <p className="text-3xl font-serif italic text-white">7-Day</p>
                <p className="text-[10px] text-stone-300 uppercase tracking-widest font-bold mt-1">Easy Returns</p>
              </div>

              <div className="hidden sm:block w-px h-10 bg-white/20"></div>

              {/* 3. Product Quality */}
              <div className="text-center sm:text-left">
                <p className="text-3xl font-serif italic text-white">100%</p>
                <p className="text-[10px] text-stone-300 uppercase tracking-widest font-bold mt-1">Quality Checked</p>
              </div>

              <div className="hidden sm:block w-px h-10 bg-white/20"></div>

              {/* 4. Support */}
              <div className="text-center sm:text-left">
                <p className="text-3xl font-serif italic text-white">24/7</p>
                <p className="text-[10px] text-stone-300 uppercase tracking-widest font-bold mt-1">Support</p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default AireHeroBanner;