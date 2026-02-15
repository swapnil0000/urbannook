import React, { useState } from 'react';

const NewsTicker = () => {
  const [isPaused, setIsPaused] = useState(false);

  const headlines = [
    "✨ FREE SHIPPING ON ALL ORDERS ABOVE ₹300",
    "🏮 NEW DROP: 3D PRINTED AESTHETIC LAMPS - SHOP NOW",
    "🔑 HANDCRAFTED KEYCHAINS: ELEVATE YOUR EVERYDAY CARRY",
    "🌿 JOIN THE INNER CIRCLE FOR 10% OFF YOUR FIRST ORDER",
    "🎨 LIMITED EDITION ART PRINTS: REIMAGINE YOUR NOOK",
    "⭐ TRUSTED BY 10,000+ AESTHETIC ENTHUSIASTS"
  ];

  return (
    <div className="bg-[#1c3026] border-b border-white/5 overflow-hidden relative py-2.5">
      
      {/* Custom Marquee Keyframes (In case not in tailwind.config) */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: marquee 35s linear infinite;
        }
      `}</style>

      <div 
        className="relative flex items-center"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* The Ticker Content */}
        <div 
          className={`flex whitespace-nowrap animate-ticker ${
            isPaused ? '[animation-play-state:paused]' : ''
          }`}
        >
          {/* Duplicating array for seamless loop */}
          {[...headlines, ...headlines].map((headline, index) => (
            <div 
              key={index}
              className="flex items-center px-10"
            >
              <span className="text-[#F5DEB3] text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase">
                {headline}
              </span>
              {/* Premium Separator Icon */}
              <span className="ml-10 text-white/20">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                </svg>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Subtle Gradient Overlays for smooth entry/exit */}
      <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#1c3026] to-transparent z-10 pointer-events-none"></div>
      <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#1c3026] to-transparent z-10 pointer-events-none"></div>
    </div>
  );
};

export default NewsTicker;