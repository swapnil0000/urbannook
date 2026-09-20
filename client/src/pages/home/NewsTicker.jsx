import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useShippingDelayNotice } from '../../hooks/useShippingDelayNotice';

/**
 * Site-wide announcement bar — editorial "2040" styling (ink band, mono
 * labels, red asterisk separators) carrying the operational headlines from
 * main: the conditional shipping-delay notice plus the evergreen ones.
 */
const NewsTicker = () => {
  const [isPaused, setIsPaused] = useState(false);
  const shippingDelayMessage = useShippingDelayNotice();

  const headlines = [
    ...(shippingDelayMessage ? [shippingDelayMessage] : []),
    'Ready to ship within 48 hrs',
    'Cash on Delivery available',
    'Pan-India delivery',
    'Made in India 🇮🇳',
  ];

  return (
    <Link to="/products" className="block relative overflow-hidden group" aria-label="Shop all products">
      <div className="bg-ink text-paper overflow-hidden relative py-2 sm:py-2.5 transition-colors hover:bg-black">
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-ticker { animation: marquee 26s linear infinite; }
          @media (prefers-reduced-motion: reduce) {
            .animate-ticker { animation: none; }
          }
        `}</style>

        <div
          className="relative flex items-center"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div
            className={`flex whitespace-nowrap animate-ticker ${
              isPaused ? '[animation-play-state:paused]' : ''
            }`}
          >
            {/* Duplicated so the loop is seamless */}
            {[...headlines, ...headlines].map((headline, index) => (
              <div key={index} className="flex items-center px-6 sm:px-8">
                <span className="gl-lbl text-[9px] sm:text-[10px] tracking-[0.18em] text-paper">
                  {headline}
                </span>
                <span className="ml-6 sm:ml-8 text-brand text-xs leading-none">✳</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gradient overlays for a smooth entry/exit against the ink band */}
        <div className="absolute inset-y-0 left-0 w-12 sm:w-16 bg-gradient-to-r from-ink to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-12 sm:w-16 bg-gradient-to-l from-ink to-transparent z-10 pointer-events-none" />
      </div>
    </Link>
  );
};

export default NewsTicker;
