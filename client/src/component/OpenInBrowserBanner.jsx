import { useEffect, useState } from 'react';
import { isInAppBrowser, isAndroid, escapeToExternalBrowser } from '../utils/browserEnv';

const DISMISS_KEY = 'iab_banner_dismissed';

/**
 * Nudge shown ONLY inside in-app browsers (Instagram/Facebook/TikTok/etc), where
 * Google login, passkeys and autofill don't work. On Android we offer a one-tap
 * "Open in Chrome" (intent redirect); on iOS — which can't be force-redirected —
 * we show instructions to use the browser's menu. Dismissible for the session.
 *
 * Sits in normal document flow above <NewHeader/> so it pushes content down and
 * scrolls away naturally (no overlap with the sticky header).
 */
const OpenInBrowserBanner = () => {
  const [show, setShow] = useState(false);
  const [android, setAndroid] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try { dismissed = !!sessionStorage.getItem(DISMISS_KEY); } catch { /* ignore */ }
    if (!dismissed && isInAppBrowser()) {
      setShow(true);
      setAndroid(isAndroid());
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    setShow(false);
  };

  return (
    <div className="relative z-[60] bg-ink text-paper font-inter border-b border-white/10">
      <div className="max-w-6xl mx-auto flex items-center gap-3 px-4 py-2.5">
        <span className="shrink-0 grid place-items-center w-7 h-7 rounded-full bg-brand text-white">
          <i className="fa-solid fa-arrow-up-right-from-square text-[11px]" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="gl-lbl text-[10px] text-brand leading-none mb-0.5">Better experience</p>
          <p className="text-[12px] leading-tight text-paper/90 truncate">
            {android
              ? 'Login & faster checkout work best in Chrome.'
              : 'Tap the browser menu (top-right), then "Open in browser".'}
          </p>
        </div>
        {android && (
          <button
            onClick={() => escapeToExternalBrowser({ force: true })}
            className="shrink-0 gl-press gl-lbl text-[10px] bg-paper text-ink px-3 py-2 hover:bg-white transition-colors"
          >
            Open in Chrome &rarr;
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 w-7 h-7 grid place-items-center text-paper/60 hover:text-paper transition-colors"
        >
          <i className="fa-solid fa-xmark text-sm" />
        </button>
      </div>
    </div>
  );
};

export default OpenInBrowserBanner;
