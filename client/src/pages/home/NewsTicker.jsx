import { useState } from 'react';
import { Link } from 'react-router-dom';

const NewsTicker = () => {
  const [isPaused, setIsPaused] = useState(false);

  const headlines = [
    "🚚 FAST PAN INDIA SHIPPING AVAILABLE",
    "🌿 WAITLIST MEMBERS: USE CODE WLUSER FOR EXCLUSIVE DISCOUNT",
  ];

  return (
    <Link to="/products" className="block relative overflow-hidden group">
      {/* News Ticker Scroll - Matching Header Style */}
      <div className="bg-emerald-50/50 border-b border-emerald-200/40 overflow-hidden relative py-2.5 sm:py-3 transition-colors hover:bg-emerald-100/50">
        {/* Custom Marquee Keyframes */}
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-ticker {
            animation: marquee 20s linear infinite;
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
                className="flex items-center px-6 sm:px-8"
              >
                <span className={`text-[9px] sm:text-xs font-bold tracking-[0.15em] uppercase text-emerald-700 font-extrabold`}>
                  {headline}
                </span>
                {/* Separator Icon */}
                <span className="ml-6 sm:ml-8 text-emerald-300/50">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                  </svg>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Gradient Overlays for smooth entry/exit */}
        <div className="absolute inset-y-0 left-0 w-16 sm:w-20 bg-gradient-to-r from-emerald-50/50 to-transparent z-10 pointer-events-none"></div>
        <div className="absolute inset-y-0 right-0 w-16 sm:w-20 bg-gradient-to-l from-emerald-50/50 to-transparent z-10 pointer-events-none"></div>
      </div>
    </Link>
  );
};

export default NewsTicker;

