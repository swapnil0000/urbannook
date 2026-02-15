import React from 'react';
import OptimizedImage from '../../component/OptimizedImage';

const instagramPosts = [
    {
        id: 1,
        // Replace this image with screenshot of Reel 1
        image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&fit=crop", 
        likes: "2.3k",
        comments: "42",
        caption: "New Arrival: 3D Printed Magic ✨",
        link: "https://www.instagram.com/reel/DTumPdjAdNt/?igsh=MW8xdmJpamZ2bGh0ZA=="
    },
    {
        id: 2,
        image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&fit=crop",
        likes: "1.8k",
        comments: "15",
        caption: "UrbanNook Aesthetics 🌿",
        link: "https://www.instagram.com/reel/DTcCR9LgdhS/?igsh=MWF3ZnczZmhrZjl2bw=="
    },
    {
        id: 3,
        image: "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=400&fit=crop",
        likes: "3.1k",
        comments: "89",
        caption: "Illuminating spaces 💡",
        link: "https://www.instagram.com/reel/DTMezUqgbhy/?igsh=MWdmaW5lYzk3ZXJ4NA=="
    },
    {
        id: 4,
        image: "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800&fit=crop",
        likes: "1.7k",
        comments: "22",
        caption: "Crafted for you 🔑",
        link: "https://www.instagram.com/reel/DTkE46tAf0G/?igsh=dDJ4Y3J1anl1NGhu"
    },
    {
        id: 5,
        image: "https://images.unsplash.com/photo-1615873968403-89e068629265?w=400&fit=crop",
        likes: "1.9k",
        comments: "31",
        caption: "The Urban Standard 💕",
        link: "https://www.instagram.com/reel/DT5gZ80ASaS/?igsh=bXpuM3pmcHY2aW4z"
    }
];

const AireInstagramFeed = () => {
    return (
        <section className="w-full flex justify-center items-center py-5">
            <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); } 
        }
        .animate-scroll {
          animation: scroll 40s linear infinite;
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>

            <div className="h-[98vh] w-[98%] max-w-[1650px] bg-[#0a110e] rounded-[40px] overflow-hidden relative flex flex-col p-8 md:p-14 shadow-2xl border border-white/5">

                {/* Subtle Glows */}
                <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-emerald-900/20 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-black rounded-full blur-[100px] pointer-events-none"></div>

                <div className="relative z-10 flex flex-col justify-between h-full gap-8">

                    {/* HEADER */}
                    <div className="flex flex-col lg:flex-row justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="h-[1px] w-8 bg-[#F5DEB3]"></span>
                                <span className="text-[#F5DEB3] font-bold tracking-[0.2em] uppercase text-[10px]">Instagram Gallery</span>
                            </div>
                            <h2 className="text-3xl md:text-5xl font-serif text-white leading-[0.95]">
                                Your Nook, <br />
                                <span className="relative inline-block">
                                    <span className="italic font-light text-[#F5DEB3] relative z-10">Reimagined</span>
                                    <svg className="absolute w-full h-1 -bottom-1 left-0 text-[#F5DEB3] -z-0" viewBox="0 0 100 10" preserveAspectRatio="none">
                                        <path d="M0 5 L 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                                    </svg>
                                </span>
                            </h2>
                        </div>

                        <div className="flex flex-col items-start lg:items-end gap-4">
                            {/* Community Pill */}
                            <div className="flex items-center gap-4 bg-white/5 pr-5 pl-2 py-1.5 rounded-2xl border border-white/5 backdrop-blur-sm max-w-md">
                                <div className="flex -space-x-3 shrink-0">
                                    {[1, 2, 3].map((_, i) => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0a110e] relative z-0 hover:z-10 hover:scale-110 transition-transform duration-300">
                                            <OptimizedImage
                                              src={`https://randomuser.me/api/portraits/thumb/women/${40 + i}.jpg`}
                                              alt={`User ${i + 1}`}
                                              className="w-full h-full object-cover rounded-full shadow-lg"
                                              loading="lazy"
                                            />
                                        </div>
                                    ))}
                                    <div className="w-8 h-8 rounded-full border-2 border-[#0a110e] bg-emerald-600 flex items-center justify-center text-[9px] text-white font-bold relative z-10 shadow-lg">25k+</div>
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-white font-serif text-sm leading-tight">Join the <span className="italic text-[#F5DEB3]">Movement.</span></p>
                                    <p className="text-gray-400 text-[9px] font-medium leading-relaxed mt-0.5 line-clamp-2 max-w-[200px]">Tag <span className="text-white border-b border-emerald-500/50 cursor-pointer hover:text-emerald-400 transition-colors">@urbannook.store</span> to showcase your setup.</p>
                                </div>
                            </div>

                            <a href="https://www.instagram.com/urbannook.store/" target="_blank" rel="noopener noreferrer" className="group relative h-10 px-8 bg-white rounded-full overflow-hidden flex items-center gap-3 shadow-lg shadow-white/5 transition-all duration-300 hover:shadow-emerald-500/40 hover:scale-[1.02]">
                                <div className="absolute inset-0 bg-gradient-to-r from-[#F5DEB3] to-[#F5DEB3] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                                <div className="relative z-10 flex items-center gap-2.5">
                                    <i className="fa-brands fa-instagram text-base text-emerald-900 group-hover:text-emerald-950 transition-colors duration-300"></i>
                                    <span className="text-[9px] font-black tracking-[0.2em] uppercase text-emerald-950 group-hover:text-emerald-950 transition-colors duration-300">Follow UrbanNook</span>
                                </div>
                            </a>
                        </div>
                    </div>

                    {/* CAROUSEL */}
                    <div className="relative w-full overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#0a110e] to-transparent z-20 pointer-events-none"></div>
                        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#0a110e] to-transparent z-20 pointer-events-none"></div>

                        <div className="flex gap-5 animate-scroll w-max py-2">
                            {/* Duplicate array for seamless scroll */}
                            {[...instagramPosts, ...instagramPosts].map((post, index) => (
                                <a
                                    key={`${post.id}-${index}`}
                                    href={post.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="relative group overflow-hidden rounded-[2rem] bg-zinc-900 cursor-pointer w-60 md:w-72 aspect-[4/5] shrink-0 border border-white/5 block"
                                >
                                    <img
                                        src={post.image}
                                        alt={post.caption}
                                        className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110 grayscale group-hover:grayscale-0"
                                    />
                                    {/* Overlay on Hover */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-5">
                                        <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                            <p className="text-white text-base font-serif mb-2 line-clamp-1">"{post.caption}"</p>
                                            <div className="flex justify-between items-center text-emerald-400 text-[10px] font-bold uppercase tracking-widest border-t border-white/10 pt-3">
                                                <div className="flex gap-3">
                                                    <span><i className="fa-solid fa-heart mr-1"></i>{post.likes}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[8px] text-white">Watch on Insta</span>
                                                    <i className="fa-solid fa-arrow-right -rotate-45 text-white"></i>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* STATS BOX */}
                    <div className="pt-6 border-t border-white/10 w-full flex justify-start">
                        <div className="bg-white/5 backdrop-blur-md border border-white/5 rounded-[2rem] p-5 pr-8 w-fit max-w-full">
                            <div className="flex flex-wrap md:flex-nowrap gap-6 md:gap-12">
                                {[
                                    { label: "Community", val: "25K+", icon: "fa-users" },
                                    { label: "Products", val: "500+", icon: "fa-box-open" },
                                    { label: "Rating", val: "4.9", icon: "fa-star" },
                                    { label: "Authentic", val: "100%", icon: "fa-shield-halved" }
                                ].map((stat, i) => (
                                    <div key={i} className="flex flex-col items-start gap-1 group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500 transition-colors duration-300">
                                                <i className={`fa-solid ${stat.icon} text-emerald-500 text-[10px] group-hover:text-white transition-colors`}></i>
                                            </div>
                                            <span className="text-white font-serif text-2xl leading-none">{stat.val}</span>
                                        </div>
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-10">{stat.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default AireInstagramFeed;