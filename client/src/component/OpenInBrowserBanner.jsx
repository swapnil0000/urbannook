import { useEffect, useState } from 'react';

const OpenInBrowserBanner = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    // Detect Instagram, Facebook, TikTok, and other in-app browsers
    const isInAppBrowser = /Instagram|FBAN|FBAV|TikTok|Line|WeChat/.test(ua);
    setShowBanner(isInAppBrowser);
  }, []);

  const handleOpenInBrowser = () => {
    const url = window.location.href;
    
    // iOS - Open in Safari
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      window.location.href = `safari-${url}`;
    }
    // Android - Open in Chrome
    else if (/Android/.test(navigator.userAgent)) {
      const chromeUrl = `intent://${url.replace(/https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
      window.location.href = chromeUrl;
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-[#a89068] text-white p-3 z-[9999] flex items-center justify-between gap-3 shadow-lg">
      <div className="flex items-center gap-2 flex-1">
        <i className="fa-solid fa-arrow-up-right-from-square text-sm"></i>
        <span className="text-xs sm:text-sm font-bold">
          Open in browser for better experience & Google login
        </span>
      </div>
      <button
        onClick={handleOpenInBrowser}
        className="bg-[#2e443c] text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#1a2822] transition-all shrink-0 whitespace-nowrap"
      >
        Open
      </button>
    </div>
  );
};

export default OpenInBrowserBanner;
