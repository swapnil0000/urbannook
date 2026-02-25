import React from 'react';
import OptimizedImage from '../../component/OptimizedImage';
import { instagramPosts } from '../../data/constant';


const AireInstagramFeed = () => {
   return (
  <section className="relative min-h-[70vh] lg:h-[calc(100vh-2rem)] lg:max-h-[900px] mx-2 my-2 md:mx-4 md:my-4 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden flex items-center group bg-[#1a2822]">
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

    <div className="w-full h-full bg-[#2e443c] overflow-hidden relative flex flex-col p-6 md:p-10 top-0 ">

      {/* Subtle Glows */}

      <div className="relative z-10 flex flex-col justify-between h-full gap-8">

        {/* HEADER */}
        <div className="flex flex-col justify-between gap-6">
          {/* Label */}
          <div className="flex items-center gap-3 mb-2">
            <span className="h-[1px] w-4 bg-[#F5DEB3]"></span>
            <span className="text-[#F5DEB3] font-bold tracking-[0.2em] uppercase text-[10px]">Instagram Gallery</span>
          </div>

          {/* Mobile Layout */}
          <div className="lg:hidden">
            <div className="flex flex-row items-start justify-between gap-4 mb-6">
              <h2 className="text-2xl font-serif text-white leading-[0.95]">
                Your Nook, <br />
                <span className="relative inline-block">
                  <span className="italic font-light text-[#F5DEB3] relative z-10">Reimagined</span>
                  <svg className="absolute w-full h-1 -bottom-1 left-0 text-[#F5DEB3] -z-0" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <path d="M0 5 L 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                  </svg>
                </span>
              </h2>
              
              <a href="https://www.instagram.com/urbannook.store/" target="_blank" rel="noopener noreferrer" className="group relative flex text-center h-10 px-6 bg-white rounded-full overflow-hidden items-center gap-2 transition-all duration-300 hover:scale-[1.02] shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-[#F5DEB3] to-[#F5DEB3] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                <div className="relative z-10 flex items-center gap-2">
                  <i className="fa-brands fa-instagram text-base text-emerald-900"></i>
                  <span className="text-[9px] font-black tracking-[0.2em] uppercase text-emerald-950">Follow</span>
                </div>
              </a>
            </div>

            <div className="flex items-center gap-4 bg-white/5 pr-5 pl-2 py-1.5 rounded-2xl border border-white/5 backdrop-blur-sm max-w-md">
              <div className="flex -space-x-3 shrink-0">
                {[1, 2, 3].map((_, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0a110e] relative z-0 hover:z-10 hover:scale-110 transition-transform duration-300">
                    <img
                      src={`https://randomuser.me/api/portraits/thumb/women/${40 + i}.jpg`}
                      alt={`User ${i + 1}`}
                      className="w-full h-full object-cover rounded-full shadow-lg"
                    />
                  </div>
                ))}
              </div>
              <div className="flex flex-col">
                <p className="text-white font-serif text-sm leading-tight">Join the <span className="italic text-[#F5DEB3]">Movement.</span></p>
                <p className="text-gray-400 text-[9px] font-medium leading-relaxed mt-0.5 line-clamp-2 max-w-[150px] sm:max-w-[200px]">Tag <span className="text-white border-b border-emerald-500/50 cursor-pointer">@urbannook.store</span></p>
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:flex lg:flex-row lg:justify-between lg:items-start">
            <div>
              <h2 className="text-5xl font-serif text-white leading-[0.95]">
                Your Nook, <br />
                <span className="relative inline-block">
                  <span className="italic font-light text-[#F5DEB3] relative z-10">Reimagined</span>
                  <svg className="absolute w-full h-1 -bottom-1 left-0 text-[#F5DEB3] -z-0" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <path d="M0 5 L 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                  </svg>
                </span>
              </h2>
            </div>

            <div className="flex flex-col items-end gap-4">
              <div className="flex items-center gap-4 bg-white/5 pr-5 pl-2 py-1.5 rounded-2xl border border-white/5 backdrop-blur-sm max-w-md">
                <div className="flex -space-x-3 shrink-0">
                  {[1, 2, 3].map((_, i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0a110e] relative z-0 hover:z-10 hover:scale-110 transition-transform duration-300">
                      <img
                        src={`https://randomuser.me/api/portraits/thumb/women/${40 + i}.jpg`}
                        alt={`User ${i + 1}`}
                        className="w-full h-full object-cover rounded-full shadow-lg"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex flex-col">
                  <p className="text-white font-serif text-sm leading-tight">Join the <span className="italic text-[#F5DEB3]">Movement.</span></p>
                  <p className="text-gray-400 text-[9px] font-medium leading-relaxed mt-0.5 line-clamp-2 max-w-[200px]">Tag <span className="text-white border-b border-emerald-500/50 cursor-pointer">@urbannook.store</span></p>
                </div>
              </div>

              <a href="https://www.instagram.com/urbannook.store/" target="_blank" rel="noopener noreferrer" className="group relative h-10 px-8 bg-white rounded-full overflow-hidden flex items-center gap-3 transition-all duration-300 hover:scale-[1.02]">
                <div className="absolute inset-0 bg-gradient-to-r from-[#F5DEB3] to-[#F5DEB3] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                <div className="relative z-10 flex items-center gap-2.5">
                  <i className="fa-brands fa-instagram text-base text-emerald-900"></i>
                  <span className="text-[9px] font-black tracking-[0.2em] uppercase text-emerald-950">Follow UrbanNook</span>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* CAROUSEL TRACK */}
        <div className="relative w-full overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-12 md:w-20 bg-gradient-to-r from-[#2e443c] to-transparent z-20 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-12 md:w-20 bg-gradient-to-l from-[#2e443c] to-transparent z-20 pointer-events-none"></div>

          <div className="flex gap-4 md:gap-5 animate-scroll w-max py-2">
            {[...instagramPosts, ...instagramPosts].map((post, index) => (
              <a
                key={`${post.id}-${index}`}
                href={post.link}
                target="_blank"
                rel="noopener noreferrer"
                className="relative group overflow-hidden rounded-[2rem] bg-zinc-900 w-52 md:w-72 aspect-[4/5] shrink-0 border border-white/5 block"
              >
                <img
                  src={post.image}
                  alt={post.caption}
                  className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110 "
                />
                <div className="absolute inset-0  opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4 md:p-5">
                  <p className="text-white text-sm md:text-base font-serif mb-2 line-clamp-1">"{post.caption}"</p>
                  <div className="flex justify-between items-center text-emerald-400 text-[10px] font-bold uppercase tracking-widest border-t border-white/10 pt-3">
                    <span><i className="fa-solid fa-heart mr-1"></i>{post.likes}</span>
                    <i className="fa-solid fa-arrow-right -rotate-45 text-white"></i>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* STATS BOX */}
        <div className="pt-4 md:pt-6 border-t border-white/10 w-full flex justify-start">
          <div className="bg-white/5  border border-white/5 rounded-2xl md:rounded-[2rem] p-3 md:p-5 w-full md:w-fit">
            <div className="grid grid-cols-3 md:flex md:flex-nowrap gap-3 md:gap-12">
              {[
                { label: "Community", val: "500+", icon: "fa-users" },
                { label: "Rating", val: "4.6", icon: "fa-star" },
                { label: "Authentic", val: "100%", icon: "fa-shield-halved" }
              ].map((stat, i) => (
                <div key={i} className="flex flex-col items-center md:items-start gap-1 group">
                  <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3">
                    <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-emerald-500/10 flex items-center justify-center  transition-colors">
                      <i className={`fa-solid ${stat.icon} text-[#F5DEB3] text-[9px] md:text-[10px] group-hover:text-[#F5DEB3]`}></i>
                    </div>
                    <span className="text-white font-serif text-lg md:text-2xl leading-none">{stat.val}</span>
                  </div>
                  <span className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center md:text-left md:pl-10">{stat.label}</span>
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