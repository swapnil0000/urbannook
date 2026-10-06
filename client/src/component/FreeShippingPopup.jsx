import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGetFreeShippingOfferQuery } from '../store/api/userApi';
import { isSuppressedPath } from '../config/siteOffer';
import { track, trackViewPromotion, trackSelectPromotion } from '../utils/analytics';

/**
 * Site-wide "FREE shipping on orders above ₹X" announcement popup.
 *
 * Replaces the retired ₹100-off SiteOfferPopup and keeps its look (dark sheet,
 * brand accent bar, gold headline). Nothing to claim — free shipping applies
 * on its own at checkout — so there is no lead form, just a CTA.
 *
 * The threshold and on/off switch come from the admin's free_shipping
 * Promotion (GET /free-shipping-offer); while that is off this renders nothing.
 * Shows once per browser, never on checkout/payment pages.
 */

const PROMO_ID = 'FREE_SHIPPING';
const PROMO_NAME = 'Free Shipping Popup';
const CREATIVE_SLOT = 'site_wide_popup';
const OPEN_DELAY_MS = 2500;
const STORAGE_KEY = 'un_free_shipping_popup_v1';

let memorySeen = false;
const hasSeen = () => {
  try {
    if (localStorage.getItem(STORAGE_KEY)) return true;
  } catch {
    /* storage unavailable — fall back to memory */
  }
  return memorySeen;
};
const markSeen = () => {
  memorySeen = true;
  try {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  } catch {
    /* memory copy above is the fallback */
  }
};

const POPUP_STYLES = `
  @keyframes unFsFade { from { opacity: 0 } to { opacity: 1 } }
  @keyframes unFsPop {
    from { opacity: 0; transform: translateY(12px) scale(.96) }
    to   { opacity: 1; transform: translateY(0) scale(1) }
  }
  @keyframes unFsDrive {
    0%, 100% { transform: translateX(-4px) }
    50%      { transform: translateX(4px) }
  }
  .un-fs-backdrop { animation: unFsFade .3s ease-out both }
  .un-fs-sheet    { animation: unFsPop .42s cubic-bezier(.16,1,.3,1) both; max-height: 90vh; max-height: 90dvh }
  .un-fs-truck    { animation: unFsDrive 1.6s ease-in-out infinite }
  .un-fs-gradient {
    background: linear-gradient(96deg, #F5DEB3 0%, #FFF6E0 38%, #D9B87C 72%, #F5DEB3 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  @media (prefers-reduced-motion: reduce) {
    .un-fs-backdrop, .un-fs-sheet { animation: unFsFade .01s linear both }
    .un-fs-truck { animation: none }
  }
`;

const FreeShippingPopup = memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data } = useGetFreeShippingOfferQuery();
  const config = data?.data;
  const threshold = Number(config?.thresholdAmount) || 0;

  const [isOpen, setIsOpen] = useState(false);
  const [seen, setSeen] = useState(hasSeen);
  const dialogRef = useRef(null);
  const hasTrackedView = useRef(false);

  const canShow = !!config?.isActive && threshold > 0 && !isSuppressedPath(location.pathname);

  useEffect(() => {
    if (!canShow || seen) return undefined;
    const timer = setTimeout(() => setIsOpen(true), OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [canShow, seen]);

  useEffect(() => {
    if (!isOpen || hasTrackedView.current) return;
    hasTrackedView.current = true;
    trackViewPromotion({ promotionId: PROMO_ID, promotionName: PROMO_NAME, creativeSlot: CREATIVE_SLOT });
  }, [isOpen]);

  const close = useCallback((reason) => {
    setIsOpen(false);
    markSeen();
    setSeen(true);
    if (reason) {
      track('promo_popup_dismissed', { promotion_id: PROMO_ID, promotion_name: PROMO_NAME, dismiss_method: reason });
    }
  }, []);

  const handleShop = () => {
    trackSelectPromotion({ promotionId: PROMO_ID, promotionName: PROMO_NAME, creativeSlot: CREATIVE_SLOT });
    close(null);
    // Already browsing products — just get out of the way.
    if (!/^\/(products?|product)\b/.test(location.pathname)) navigate('/products');
  };

  // Navigating to checkout while open hides it; the scroll lock follows.
  const isVisible = isOpen && canShow;

  /* scroll lock + Escape while open */
  useEffect(() => {
    if (!isVisible) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') close('escape');
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isVisible, close]);

  if (!isVisible) return null;

  const thresholdLabel = `₹${threshold.toLocaleString('en-IN')}`;

  return (
    <>
      <style>{POPUP_STYLES}</style>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <div
          className="un-fs-backdrop absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={() => close('backdrop')}
          aria-hidden="true"
        />

        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="un-fs-title"
          tabIndex={-1}
          className="un-fs-sheet relative flex w-full max-w-[360px] flex-col overflow-hidden rounded-[1.75rem] border border-paper/15 bg-ink shadow-[0_24px_70px_rgba(0,0,0,0.55)] outline-none"
        >
          <div className="h-1 w-full bg-gradient-to-r from-brand via-[#F5DEB3] to-brand" aria-hidden="true" />

          <button
            type="button"
            onClick={() => close('close_button')}
            className="absolute right-2 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full text-paper/60 transition-colors hover:bg-white/10 hover:text-paper"
            aria-label="Close offer"
          >
            <i className="fa-solid fa-xmark text-base" />
          </button>

          <div className="overflow-y-auto px-5 pb-4 pt-3 text-center sm:px-6">
            <div className="mx-auto mb-3 flex max-w-[78%] items-center justify-center gap-2.5">
              <span className="h-px w-6 bg-paper/25" />
              <span className="text-[9px] font-bold uppercase tracking-[0.24em] text-paper/60">
                Welcome to Urban Nook
              </span>
              <span className="h-px w-6 bg-paper/25" />
            </div>

            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-brand/15 ring-1 ring-brand/40">
              <i className="un-fs-truck fa-solid fa-truck-fast text-base text-[#F5DEB3]" aria-hidden="true" />
            </div>

            <h2 id="un-fs-title" className="font-serif text-[16px] leading-tight text-white/90">
              Delivered to your door, on us
            </h2>
            <p className="un-fs-gradient mt-1.5 whitespace-nowrap font-serif text-[30px] font-bold leading-none tracking-tight">
              FREE SHIPPING
            </p>
            <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-paper/15 bg-white/5 px-3 py-1 text-[12px] font-medium tracking-wide text-paper/85">
              <i className="fa-solid fa-bag-shopping text-[9px] text-paper/50" />
              on orders above {thresholdLabel}
            </p>

            <div className="my-3.5 flex items-center gap-2" aria-hidden="true">
              <span className="h-1.5 w-1.5 rounded-full bg-paper/30" />
              <div className="flex-1 border-t border-dashed border-paper/20" />
              <span className="h-1.5 w-1.5 rounded-full bg-paper/30" />
            </div>

            <p className="mb-3 text-[12px] text-white/55">
              No code needed — it applies automatically at checkout.
            </p>

            <button
              type="button"
              onClick={handleShop}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand text-xs font-bold uppercase tracking-[0.15em] text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all hover:bg-brandHi active:scale-[0.99]"
            >
              Start shopping
            </button>
            <button
              type="button"
              onClick={() => close('maybe_later')}
              className="mt-1 w-full py-1 text-[11px] text-white/40 underline-offset-4 transition-colors hover:text-white/70 hover:underline"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </>
  );
});
FreeShippingPopup.displayName = 'FreeShippingPopup';

export default FreeShippingPopup;
