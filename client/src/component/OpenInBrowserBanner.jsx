import { useEffect, useState } from 'react';

const OpenInBrowserBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const isInAppBrowser = /Instagram|FBAN|FBAV|TikTok|Line|WeChat/.test(ua);
    const ios = /iPhone|iPad|iPod/.test(ua);
    setIsIOS(ios);
    setShowBanner(isInAppBrowser);
  }, []);

  const handleOpenInBrowser = () => {
    const url = window.location.href;

    if (isIOS) {
      // Try x-safari- scheme — works on Instagram/TikTok in-app browsers on iOS
      // Falls back to copying the link if the redirect is blocked
      const safariUrl = `x-safari-${url}`;
      window.location.href = safariUrl;

      // If we're still here after 1.5s, the redirect was blocked — copy as fallback
      setTimeout(() => {
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
          });
        }
      }, 3500);
    } else {
      // Android — intent URL opens Chrome
      const chromeUrl = `intent://${url.replace(/https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
      window.location.href = chromeUrl;
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-[#a89068] text-white p-3 z-[9999] flex items-center justify-between gap-3 shadow-lg">
      <div className="flex items-center gap-2 flex-1">
        <i className="fa-solid fa-arrow-up-right-from-square text-sm shrink-0"></i>
        <span className="text-xs sm:text-sm font-bold">
          {isIOS
            ? copied
              ? 'Link copied! Paste in Safari to open.'
              : 'For best experience, open in Safari'
            : 'Open in browser for better experience & Google login'}
        </span>
      </div>
      <button
        onClick={handleOpenInBrowser}
        className="bg-[#2e443c] text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#1a2822] transition-all shrink-0 whitespace-nowrap"
      >
        {isIOS ? (copied ? 'Copied!' : 'Copy Link') : 'Open'}
      </button>
    </div>
  );
};

export default OpenInBrowserBanner;
