import React, { useState } from 'react';

const NewsTicker = () => {
  const [isPaused, setIsPaused] = useState(false);

  const headlines = [
    "🎉 New Collection Launch - 50% OFF on all keychains!",
    "🚚 Free shipping on orders above ₹999 - Limited time offer",
    "⭐ 10,000+ Happy customers and counting!",
    "🎁 Special discount for first-time buyers - Use code WELCOME20",
    "🔥 Trending now: Minimalist desk accessories collection"
  ];

  return (
    <div className="bg-gradient-to-r from-primary via-accent to-cyan-400 text-white  overflow-hidden relative shadow-lg">
      <div className="flex items-center">
        {/* <div className="bg-white/25 backdrop-blur-sm px-6 py-3 rounded-r-full flex items-center gap-3 flex-shrink-0 border border-white/30 shadow-lg">
          <i className="fa-solid fa-bullhorn text-xl animate-pulse"></i>
          <span className="font-bold text-base">BREAKING NEWS</span>
        </div> */}
        
        <div 
          className="flex-1 overflow-hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div 
            className={`flex gap-8 whitespace-nowrap ${
              isPaused ? '' : 'animate-marquee'
            }`}
          >
            {headlines.concat(headlines).map((headline, index) => (
              <span 
                key={index}
                className="text-base font-semibold flex items-center gap-3 px-6"
              >
                {headline}
                <span className="text-white/70 text-xl">•</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsTicker;