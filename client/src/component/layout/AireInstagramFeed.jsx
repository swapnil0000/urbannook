import React, { useEffect, useRef } from 'react';

const instagramPosts = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&fit=crop",
    likes: "2.3k",
    comments: "42",
    caption: "The Signature Collection ✨"
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&fit=crop",
    likes: "1.8k",
    comments: "15",
    caption: "Details in motion 🚗"
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=400&fit=crop",
    likes: "3.1k",
    comments: "89",
    caption: "Illuminating spaces 💡"
  },
  {
    id: 4,
    image: "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800&fit=crop",
    likes: "1.7k",
    comments: "22",
    caption: "Crafted for you 🔑"
  },
  {
    id: 5,
    image: "https://images.unsplash.com/photo-1615873968403-89e068629265?w=400&fit=crop",
    likes: "1.9k",
    comments: "31",
    caption: "The Urban Standard 💕"
  },
  {
    id: 6,
    image: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400&fit=crop",
    likes: "4.2k",
    comments: "56",
    caption: "Modern Living 🌿"
  }
];

const AireInstagramFeed = () => {
  const scrollRef = useRef(null);

  // Auto-scroll logic for Mobile Carousel
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const interval = setInterval(() => {
        if(scrollContainer.scrollLeft + scrollContainer.clientWidth >= scrollContainer.scrollWidth) {
            scrollContainer.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
            scrollContainer.scrollBy({ left: 300, behavior: 'smooth' });
        }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-12 w-full flex justify-center items-center">
      
      {/* THE ISLAND: Editorial Container */}
      <div className="w-[98%] max-w-[1700px] bg-[#0a110e] rounded-[30px] md:rounded-[50px] overflow-hidden relative flex flex-col p-6 md:p-16">
        
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-emerald-900/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-black rounded-full blur-[120px] pointer-events-none"></div>

        <div className="relative z-10 h-full flex flex-col justify-between">
            
            {/* EDITORIAL HEADER */}
            <div className="flex flex-col lg:flex-row justify-between items-start mb-8 md:mb-12 gap-6 md:gap-8">
                <div className="max-w-xl lg:self-end">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="h-[1px] w-10 bg-emerald-500"></span>
                        <span className="text-emerald-500 font-bold tracking-[0.3em] uppercase text-[10px]">Lifestyle Gallery</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl lg:text-7xl font-serif text-white leading-none mb-4 md:mb-6">
                        Designed for <br/>
                        <span className="italic font-light text-emerald-200">The Modern Muse</span>
                    </h2>
                    
                </div>

                {/* RIGHT SIDE: Button & New Decorative Stamp */}
                <div className="flex flex-col lg:flex-col items-end lg:items-start gap-8 lg:gap-12">
                    
                    <a href="#" className="hidden md:flex group relative px-8 py-4 bg-white/5 border border-white/10 rounded-full overflow-hidden transition-all duration-500 hover:border-emerald-500/50">
                        <div className="absolute inset-0 bg-emerald-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                        <div className="relative flex items-center gap-3 text-white">
                            <i className="fa-brands fa-instagram text-xl"></i>
                            <span className="text-sm font-bold tracking-widest uppercase">Follow UrbanNook</span>
                        </div>
                    </a>

                    <p className="text-gray-400 text-sm md:text-lg font-light max-w-md leading-relaxed">
                        Join our community of 25,000+ enthusiasts. Tag <span className="text-white border-b border-emerald-500 pb-1">@urbannook</span> for a chance to be featured.
                    </p>

                    {/* --- NEW: Top Right Decorative "Stamp" --- */}
                   

                </div>
            </div>

            {/* --- MOBILE CAROUSEL (Visible < lg) --- */}
            <div 
              ref={scrollRef}
              className="lg:hidden flex overflow-x-auto gap-4 mb-8 snap-x snap-mandatory scrollbar-hide py-4"
              style={{ scrollBehavior: 'smooth' }}
            >
               {instagramPosts.map((post) => (
                 <div key={post.id} className="snap-center shrink-0 w-[85vw] sm:w-[60vw] relative group rounded-[2rem] overflow-hidden bg-zinc-900 border border-white/10">
                    {/* Uniform Height Container */}
                    <div className="aspect-square w-full relative">
                        <img
                            src={post.image}
                            alt="Gallery item"
                            className="w-full h-full object-cover"
                        />
                        {/* Always visible overlay on mobile for context */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-white font-serif text-xl mb-2">"{post.caption}"</p>
                                    <div className="flex items-center gap-4 text-emerald-400 text-xs font-bold uppercase tracking-widest">
                                        <span><i className="fa-solid fa-heart mr-1"></i> {post.likes}</span>
                                        <span><i className="fa-solid fa-comment mr-1"></i> {post.comments}</span>
                                    </div>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center">
                                    <i className="fa-solid fa-arrow-right -rotate-45"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>
               ))}
            </div>

            {/* --- DESKTOP GRID (Visible >= lg) --- */}
            {/* STRICT UNIFORM GRID: 12 Cols, Gap 6 */}
            <div className="hidden lg:grid grid-cols-12 gap-6 flex-1 mb-12">
                {instagramPosts.map((post) => (
                    <div
                        key={post.id}
                        // CHANGED: col-span-4 forces 3 items per row. aspect-square forces equal height.
                        className="relative group overflow-hidden rounded-[2.5rem] bg-zinc-900 cursor-pointer col-span-4 aspect-square"
                    >
                        <img
                            src={post.image}
                            alt="Gallery item"
                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                        />

                        {/* HOVER OVERLAY: Glassmorphism */}
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-between p-5">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-4 text-white">
                                    <div className="flex items-center gap-1.5">
                                        <i className="fa-solid fa-heart text-emerald-400 text-sm"></i>
                                        <span className="text-sm font-bold">{post.likes}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <i className="fa-solid fa-comment text-white/60 text-sm"></i>
                                        <span className="text-sm font-bold">{post.comments}</span>
                                    </div>
                                </div>
                                <i className="fa-brands fa-instagram text-white/50 text-2xl"></i>
                            </div>

                            <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                <p className="text-white text-lg font-serif mb-4">"{post.caption}"</p>
                                <button className="px-6 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-emerald-500 hover:text-white transition-colors">
                                    Shop the look
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* INTEGRATED STATS BAR */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 py-8 border-t border-white/10">
                {[
                    { label: "Community Followers", val: "25K+", icon: "fa-users" },
                    { label: "Curated Products", val: "500+", icon: "fa-box-open" },
                    { label: "Style Pioneers", val: "10K+", icon: "fa-crown" },
                    { label: "Authenticity Score", val: "99.9%", icon: "fa-certificate" }
                ].map((stat, i) => (
                    <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 group">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:bg-emerald-500 group-hover:border-emerald-500 transition-all duration-500 shrink-0">
                            <i className={`fa-solid ${stat.icon} text-emerald-500 group-hover:text-white transition-colors text-sm sm:text-base`}></i>
                        </div>
                        <div>
                            <p className="text-xl sm:text-2xl font-serif text-white leading-none mb-1">{stat.val}</p>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </section>
  );
};

export default AireInstagramFeed;