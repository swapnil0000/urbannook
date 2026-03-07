import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const AireHeroBanner = memo(() => {
  const navigate = useNavigate();

  const handleShopCollection = useCallback(() => {
    navigate('/products'); 
  }, [navigate]);

  return (
    <section className="relative min-h-[97vh] lg:h-[calc(100vh-2rem)] lg:max-h-[900px] mx-2 my-2 md:mx-4 md:my-4 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl flex items-center group bg-brand-dark">
      
      {/* --- BACKGROUND IMAGE LAYER --- */}
      <div className="absolute inset-0 z-0">
        <img
          src="/assets/hero2.webp"
          alt="Hero Background"
          fetchPriority="high"
          loading="eager"
          onError={(e) => {
            e.target.onerror = null;
            // Fallback
            e.target.src = "https://images.unsplash.com/photo-1513519247388-193ad5130246?q=80&w=2500";
          }}
          className="w-full h-full object-cover opacity-80 lg:opacity-70 transition-transform duration-[20s] ease-in-out group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-brand-secondary/20 via-brand-secondary/60 to-brand-dark lg:bg-gradient-to-r lg:from-brand-secondary lg:via-brand-secondary/40 lg:to-transparent"></div>
      </div>

      <div className="relative z-10 w-full px-6 md:px-12 lg:px-20 py-12">
        <div className="w-full max-w-7xl mx-auto">
          <div className="max-w-3xl space-y-4 flex flex-col items-center sm:items-start text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-overlay-light backdrop-blur-md border border-border-subtle shadow-sm w-fit">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-tertiary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-tertiary"></span>
              </span>
              <span className="text-[10px] font-bold tracking-widest uppercase text-stone-200">Limited Collection</span>
            </div>

            {/* Heading */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl xl:text-7xl font-serif text-text-inverse drop-shadow-lg mb-5 leading-tight">
              Make Every <br />
              Corner <span className="italic font-light text-brand-tertiary">Count</span>
            </h1>

            {/* Paragraph */}
            <p className="fade-in-up animate-delay-200 text-md md:text-xl text-stone-200 font-light italic max-w-lg mt-4">
              Turn a house into your 
              <span className="font-serif italic text-brand-tertiary text-md md:text-2xl ml-1 underline decoration-brand-tertiary/50 decoration-2 underline-offset-4">
                Urban Nook.
              </span>
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-4 max-w-lg  w-50 sm:w-auto pt-4">
              <button 
                onClick={handleShopCollection} 
                className="w-full sm:w-auto bg-surface-primary text-brand-secondary px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-bg-secondary hover:scale-105 hover:shadow-lg transition-all duration-300"
              >
                Shop Collection
              </button>
            </div>

            {/* --- STATS SECTION --- */}
            <div className="pt-8 flex flex-wrap items-center justify-center sm:justify-start gap-y-6 gap-x-8 md:gap-x-6 w-90 border-t border-border-subtle mt-6">

              <div className="text-center sm:text-left">
                <p className="text-2xl font-serif italic text-text-inverse">Affordable</p>
                <p className="text-[10px] text-brand-tertiary uppercase tracking-widest font-bold mt-1">Pricing</p>
              </div>

              <div className="hidden sm:block w-px h-10 bg-border-subtle"></div>

              {/* 2. Policy */}
              <div className="text-center sm:text-left">
                <p className="text-2xl font-serif italic text-text-inverse">7-Day</p>
                <p className="text-[10px] text-brand-tertiary uppercase tracking-widest font-bold mt-1">Easy Returns</p>
              </div>

              <div className="hidden sm:block w-px h-10 bg-border-subtle"></div>

              {/* 3. Product Quality */}
              <div className="text-center sm:text-left">
                <p className="text-2xl font-serif italic text-text-inverse">100%</p>
                <p className="text-[10px] text-brand-tertiary uppercase tracking-widest font-bold mt-1">Quality Checked</p>
              </div>

              <div className="hidden sm:block w-px h-10 bg-border-subtle"></div>

              {/* 4. Support */}
              <div className="text-center sm:text-left">
                <p className="text-2xl font-serif italic text-text-inverse">24/7</p>
                <p className="text-[10px] text-brand-tertiary uppercase tracking-widest font-bold mt-1">Support</p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
});

export default AireHeroBanner;