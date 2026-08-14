import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  // INDEPENDENCE_OFFER,
  isOfferLive,
  offerAmountLabel,
  offerConditionLabel,
} from '../../config/independenceOffer';

const BASE_HEADLINES = [
  { text: "Free Shipping on orders above ₹1700" },
  { text: "Ready to ship within 48 hrs" },
  { text: "Cash on Delivery available" },
];

const NewsTicker = () => {
  const [isPaused, setIsPaused] = useState(false);

  // The campaign headline leads the loop while the offer is live and drops out
  // of it by itself once the window closes — no dated copy left stranded here.
  const headlines = useMemo(() => {
    if (!isOfferLive()) return BASE_HEADLINES;
    return [
      {
        text: `Independence Day: ${offerAmountLabel()} off ${offerConditionLabel()} — code ${INDEPENDENCE_OFFER.code}`,
        highlight: true,
      },
      ...BASE_HEADLINES,
    ];
  }, []);

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
                {headline.highlight && (
                  // Tricolour pip — reads as the campaign at a glance without
                  // fighting the ticker's green for attention.
                  <span
                    className="mr-2 inline-flex h-2.5 w-2.5 shrink-0 overflow-hidden rounded-full ring-1 ring-black/10"
                    aria-hidden="true"
                  >
                    <span className="flex-1 bg-[#FF9933]" />
                    <span className="flex-1 bg-white" />
                    <span className="flex-1 bg-[#138808]" />
                  </span>
                )}
                <span
                  className={`text-[9px] sm:text-xs font-bold tracking-[0.15em] uppercase font-extrabold ${
                    headline.highlight ? 'text-[#9A3412]' : 'text-emerald-700'
                  }`}
                >
                  {headline.text}
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

