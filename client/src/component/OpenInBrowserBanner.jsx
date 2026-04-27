import { useEffect, useState } from 'react';

const OpenInBrowserBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    const isInApp = /Instagram|FBAN|FBAV|TikTok|Line|WeChat|Snapchat/i.test(ua);
    const ios = /iPhone|iPad|iPod/i.test(ua);
    setIsIOS(ios);

    if (!isInApp) return;

    // Already dismissed this session
    if (sessionStorage.getItem('inAppBannerDismissed')) return;

    const url = window.location.href;

    // Android: auto-redirect to Chrome
    if (!ios) {
      window.location.href = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
      // Fallback: if intent didn't work after 2s, show banner
      setTimeout(() => setShowBanner(true), 2000);
      return;
    }

    // iOS: can't auto-redirect, show banner
    setShowBanner(true);
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('inAppBannerDismissed', 'true');
    setShowBanner(false);
  };

  const handleOpenAndroid = () => {
    const url = window.location.href;
    window.location.href = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
  };

  if (!showBanner) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-[#2e443c] text-white px-3 py-3 z-[9999] shadow-lg border-b border-[#a89068]/30">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-full bg-[#a89068]/20 flex items-center justify-center shrink-0">
            <i className="fa-solid fa-arrow-up-right-from-square text-[#F5DEB3] text-xs"></i>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-bold leading-tight">
              {isIOS ? 'Open in Safari' : 'Open in Chrome'}
            </p>
            <p className="text-[9px] sm:text-[10px] text-white/60 leading-tight mt-0.5">
              {isIOS
                ? 'Tap ••• below → Open in Safari'
                : 'For Google login & best experience'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isIOS && (
            <button
              onClick={handleOpenAndroid}
              className="bg-[#a89068] text-white px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-[#bfa884] transition-all"
            >
              Open
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Dismiss"
          >
            <i className="fa-solid fa-xmark text-[10px] text-white/70"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpenInBrowserBanner;
