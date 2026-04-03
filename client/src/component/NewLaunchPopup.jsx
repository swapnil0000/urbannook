import { useState, memo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const NewLaunchPopup = memo(() => {
  const [isVisible, setIsVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Only show once per session
    if (sessionStorage.getItem('launchPopupShown')) return;

    const timer = setTimeout(() => {
      setIsVisible(true);
      sessionStorage.setItem('launchPopupShown', 'true');
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = useCallback(() => setIsVisible(false), []);

  if (!isVisible) return null;

  const handleNavigate = () => {
    navigate('/products');
    setIsVisible(false);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText('WLUSER');
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-backdrop"
        onClick={handleClose}
      ></div>

      <div className="relative w-[85%] max-w-[340px] md:max-w-lg md:w-full bg-[#2e443c] rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] group animate-popup border border-white/10">
        <button 
          onClick={handleClose}
          className="absolute top-3 right-3 md:top-4 md:right-4 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all z-20"
          aria-label="Close popup"
        >
          <i className="fa-solid fa-xmark text-base md:text-lg"></i>
        </button>

        <div className="p-6 md:p-12 flex flex-col items-center text-center">

          {/* Badge */}
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <span className="h-[1px] w-4 md:w-6 bg-[#F5DEB3]"></span>
            <span className="text-[#F5DEB3] font-bold tracking-[0.2em] md:tracking-[0.3em] uppercase text-[8px] md:text-[10px]">Launch Offer</span>
            <span className="h-[1px] w-4 md:w-6 bg-[#F5DEB3]"></span>
          </div>

          {/* Urgency banner */}
          <div className="bg-red-500/20 border border-red-400/30 rounded-lg px-3 py-1.5 md:px-4 md:py-2 mb-4 md:mb-6 flex items-center gap-2">
            <span className="text-red-400 text-[9px] md:text-xs font-bold uppercase tracking-wider animate-pulse">⏰ Launch offer ending soon</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-serif text-white leading-tight mb-3 md:mb-4">
            Welcome to <span className="italic text-[#F5DEB3]">UrbanNook</span>
          </h2>


          <div className="flex flex-col gap-3 md:gap-4 mb-5 md:mb-8 w-full max-w-sm">
            <p className="text-white/80 text-[10px] md:text-sm font-light leading-relaxed">
              <span className="mr-1.5 md:mr-2 text-sm md:text-base">🚚</span> 
              <span className="font-medium text-white">FLAT ₹149 SHIPPING</span> ACROSS INDIA
            </p>
            
            <p className="text-white/80 text-[10px] md:text-sm font-light leading-relaxed flex items-center justify-center flex-wrap gap-1">
              <span className="mr-1 md:mr-2 text-sm md:text-base">�</span>
              NEW CUSTOMER CODE: 
              <button 
                onClick={handleCopyCode}
                title="Click to copy code"
                className={`font-bold px-2 py-0.5 rounded tracking-widest ml-1 text-[9px] md:text-xs transition-all duration-300 transform active:scale-95 ${
                  isCopied 
                    ? 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]' 
                    : 'bg-[#F5DEB3] text-[#2e443c] hover:bg-white hover:shadow-[0_0_10px_rgba(245,222,179,0.5)] cursor-pointer'
                }`}
              >
                {isCopied ? 'COPIED! ✓' : 'WLUSER'}
              </button>
            </p>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-white/5 p-1 mb-4 md:mb-6 w-full">
             <button 
                onClick={handleNavigate}
                className="px-5 py-2.5 md:px-6 md:py-3 bg-[#a89068] text-white rounded-lg font-bold uppercase tracking-widest text-[9px] md:text-[10px] transition-all hover:scale-105 hover:bg-[#bfa884] w-full"
             >
               Shop Now — Offer Ending Soon
             </button>
          </div>
          
          <p className="text-[#F5DEB3]/50 text-[7px] md:text-[8px] uppercase tracking-[0.15em] md:tracking-[0.2em]">
            First order exclusive • UrbanNook Signature
          </p>
        </div>

        <div className="absolute inset-0 -translate-x-full group-hover:animate-[shine_2s_ease-in-out_infinite] pointer-events-none bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg]"></div>
      </div>

      <style jsx>{`
        @keyframes shine {
          100% { transform: translateX(200%); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUpZoom {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-backdrop {
          animation: fadeIn 0.4s ease-out forwards;
        }
        .animate-popup {
          animation: slideUpZoom 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
});

export default NewLaunchPopup;
