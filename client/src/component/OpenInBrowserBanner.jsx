import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const OpenInBrowserBanner = () => {
  const [showBanner, setShowBanner] = useState(false);

  const headlines = [
    "🚚 50₹ SHIPPING ALL OVER INDIA TILL 20th MARCH",
    "🌿 WAITLIST MEMBERS: USE CODE WLUSER FOR EXCLUSIVE DISCOUNT",
  ];

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const isInAppBrowser = /Instagram|FBAN|FBAV|TikTok|Line|WeChat/.test(ua);
    setShowBanner(isInAppBrowser);
  }, []);

  if (!showBanner) return null;

  return (
    <Link 
      to="/products"
      className="fixed top-0 left-0 right-0 bg-[#a89068] text-white z-[9999] shadow-lg overflow-hidden block h-9 sm:h-10"
    >
      <style>{`
        @keyframes marquee-banner {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-banner {
          animation: marquee-banner 25s linear infinite;
        }
      `}</style>

      <div className="relative flex items-center h-full">
        <div className="flex whitespace-nowrap animate-marquee-banner">
          {[...headlines, ...headlines, ...headlines].map((headline, index) => (
            <div key={index} className="flex items-center px-8">
              <span className="text-[10px] sm:text-xs font-bold tracking-[0.1em] uppercase">
                {headline}
              </span>
              <span className="ml-8 text-white/30">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                </svg>
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Subtle close hint or indicator if needed, but here we just make it a link */}
      <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#a89068] to-transparent z-10 pointer-events-none"></div>
      <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[#a89068] to-transparent z-10 pointer-events-none"></div>
    </Link>
  );
};

export default OpenInBrowserBanner;

