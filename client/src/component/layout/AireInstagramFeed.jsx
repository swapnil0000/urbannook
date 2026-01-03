import React from 'react';

const instagramPosts = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&fit=crop",
    likes: "2.3k",
    comments: "42",
    size: "lg:col-span-6 lg:row-span-2", 
    caption: "The Signature Collection ✨"
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&fit=crop",
    likes: "1.8k",
    comments: "15",
    size: "lg:col-span-3 lg:row-span-1",
    caption: "Details in motion 🚗"
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=400&fit=crop",
    likes: "3.1k",
    comments: "89",
    size: "lg:col-span-3 lg:row-span-1",
    caption: "Illuminating spaces 💡"
  },
  {
    id: 4,
    image: "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800&fit=crop",
    likes: "1.7k",
    comments: "22",
    size: "lg:col-span-3 lg:row-span-1", 
    caption: "Crafted for you 🔑"
  },
  {
    id: 5,
    image: "https://images.unsplash.com/photo-1615873968403-89e068629265?w=400&fit=crop",
    likes: "1.9k",
    comments: "31",
    size: "lg:col-span-3 lg:row-span-1",
    caption: "The Urban Standard 💕"
  }
];

const AireInstagramFeed = () => {
  return (
    <section className=" py-12 w-full flex justify-center items-center">
      
      {/* THE ISLAND: 850px Height Editorial Container */}
      <div className="w-[98%] max-w-[1700px] h-auto lg:h-[850px] bg-[#0a110e] rounded-[50px] overflow-hidden relative flex flex-col p-8 md:p-16">
        
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-900/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-black rounded-full blur-[120px] pointer-events-none"></div>

        <div className="relative z-10 h-full flex flex-col justify-between">
            
            {/* EDITORIAL HEADER */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-8">
                <div className="max-w-xl">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="h-[1px] w-10 bg-emerald-500"></span>
                        <span className="text-emerald-500 font-bold tracking-[0.3em] uppercase text-[10px]">Lifestyle Gallery</span>
                    </div>
                    <h2 className="text-5xl lg:text-7xl font-serif text-white leading-none mb-6">
                        Designed for <br/>
                        <span className="italic font-light text-emerald-200">The Modern Muse</span>
                    </h2>
                    <p className="text-gray-400 text-lg font-light max-w-md">
                        Join our community of 25,000+ enthusiasts. Tag <span className="text-white border-b border-emerald-500 pb-1">@urbannook</span> for a chance to be featured.
                    </p>
                </div>

                <a href="#" className="group relative px-8 py-4 bg-white/5 border border-white/10 rounded-full overflow-hidden transition-all duration-500 hover:border-emerald-500/50">
                    <div className="absolute inset-0 bg-emerald-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                    <div className="relative flex items-center gap-3 text-white">
                        <i className="fa-brands fa-instagram text-xl"></i>
                        <span className="text-sm font-bold tracking-widest uppercase">Follow UrbanNook</span>
                    </div>
                </a>
            </div>

            {/* DYNAMIC 12-COLUMN BENTO GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-12 grid-rows-2 gap-4 lg:gap-6 flex-1 mb-12">
                {instagramPosts.map((post) => (
                    <div
                        key={post.id}
                        className={`relative group overflow-hidden rounded-[2.5rem] bg-zinc-900 cursor-pointer ${post.size}`}
                    >
                        <img
                            src={post.image}
                            alt="Gallery item"
                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                        />

                        {/* HOVER OVERLAY: Glassmorphism */}
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-between p-8">
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 py-8 border-t border-white/10">
                {[
                    { label: "Community Followers", val: "25K+", icon: "fa-users" },
                    { label: "Curated Products", val: "500+", icon: "fa-box-open" },
                    { label: "Style Pioneers", val: "10K+", icon: "fa-crown" },
                    { label: "Authenticity Score", val: "99.9%", icon: "fa-certificate" }
                ].map((stat, i) => (
                    <div key={i} className="flex items-center gap-4 group">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:bg-emerald-500 group-hover:border-emerald-500 transition-all duration-500">
                            <i className={`fa-solid ${stat.icon} text-emerald-500 group-hover:text-white transition-colors`}></i>
                        </div>
                        <div>
                            <p className="text-2xl font-serif text-white leading-none mb-1">{stat.val}</p>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* REFINED WHATSAPP FAB: Integrated into the Island */}
        <div className="absolute bottom-10 right-10 z-50 flex flex-col items-end">
             <div className="mb-4 px-4 py-2 bg-white rounded-2xl shadow-2xl scale-0 group-hover:scale-100 origin-right transition-transform duration-300">
                 <p className="text-[10px] font-bold text-black uppercase tracking-widest">Connect with a Stylist</p>
             </div>
             <button className="w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-transform active:scale-95 group">
                <i className="fab fa-whatsapp text-3xl"></i>
             </button>
        </div>
      </div>
    </section>
  );
};

export default AireInstagramFeed;