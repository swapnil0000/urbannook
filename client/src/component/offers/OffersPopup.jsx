import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGetHomeComboOffersQuery, useGetFreeShippingOfferQuery } from '../../store/api/userApi';
import { isSuppressedPath } from '../../config/siteOffer';
import { recordOfferInterest } from '../../utils/offerInterest';
import { track, trackViewPromotion, trackSelectPromotion } from '../../utils/analytics';
import MysteryGiftArt from './MysteryGiftArt';

// Offer photos come in every shape (square, 4:5, 3:4) and on every backdrop (grey, white,
// dark studio). A square frame fits most of them exactly; anything narrower sits whole in
// the middle with a blurred copy of itself filling the sides, so there is never a
// mismatched bar of page colour beside it.
const OfferPhoto = ({ src, eager }) => (src ? (
  <>
    <img src={src} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-2xl" />
    <img src={src} alt="" loading={eager ? 'eager' : 'lazy'} className="relative h-full w-full object-contain" />
  </>
) : <div className="h-full w-full bg-surface" />);

/**
 * Live offers, one slide each — a carousel popup so shoppers actually SEE the
 * promotions before they browse away. Centered dialog on desktop, a sheet that
 * slides up from the bottom on mobile (swipe left/right between offers).
 *
 * Data: GET /promotions/display/home (the same admin-controlled cards as the
 * homepage offer section — a promotion shows here only if its "home" placement
 * is ticked on the Promotions page). On a product page, that product's offers
 * come first. Opens once per browser session, never on checkout/payment pages,
 * and waits while the free-shipping popup is due so two dialogs never stack.
 */

const CREATIVE_SLOT = 'offers_popup';
const OPEN_DELAY_MS = 4000;
const ROTATE_MS = 5000;
const SESSION_KEY = 'un_offers_popup_seen_v1';
const FS_SEEN_KEY = 'un_free_shipping_popup_v1'; // FreeShippingPopup's own "seen" flag

let memorySeen = false;
const seenThisSession = () => {
  try { if (sessionStorage.getItem(SESSION_KEY)) return true; } catch { /* storage unavailable */ }
  return memorySeen;
};
const markSeen = () => {
  memorySeen = true;
  try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* memory copy above is the fallback */ }
};
const freeShippingPopupDone = () => {
  try { return !!localStorage.getItem(FS_SEEN_KEY); } catch { return true; }
};

const STYLES = `
  @keyframes unOpFade { from { opacity: 0 } to { opacity: 1 } }
  @keyframes unOpPop  { from { opacity: 0; transform: translateY(12px) scale(.96) } to { opacity: 1; transform: none } }
  @keyframes unOpUp   { from { transform: translateY(100%) } to { transform: none } }
  .un-op-backdrop { animation: unOpFade .3s ease-out both }
  .un-op-sheet    { animation: unOpUp .42s cubic-bezier(.16,1,.3,1) both; max-height: 88vh; max-height: 88dvh }
  @media (min-width: 768px) { .un-op-sheet { animation-name: unOpPop } }
  .un-op-track    { transition: transform .45s cubic-bezier(.16,1,.3,1) }
  @media (prefers-reduced-motion: reduce) {
    .un-op-backdrop, .un-op-sheet { animation: unOpFade .01s linear both }
    .un-op-track { transition: none }
  }
`;

const productIdFromPath = (path) => (path.match(/^\/products?\/([^/?#]+)/) || [])[1] || null;

const OffersPopup = memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data } = useGetHomeComboOffersQuery();
  const { data: fsData } = useGetFreeShippingOfferQuery();
  const fsDue = !!fsData?.data?.isActive && Number(fsData?.data?.thresholdAmount) > 0 && !freeShippingPopupDone();

  const pagePid = productIdFromPath(location.pathname);
  const offers = useMemo(() => {
    const list = (data?.data?.combos || []).filter((c) => c?.id && (c.title || c.benefit));
    if (!pagePid) return list;
    // this product's own offers first
    const mine = (c) => c.primaryProductId === pagePid || (c.items || []).some((it) => it?.productId === pagePid);
    return [...list.filter(mine), ...list.filter((c) => !mine(c))];
  }, [data, pagePid]);

  const [isOpen, setIsOpen] = useState(false);
  const [seen, setSeen] = useState(seenThisSession);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const dialogRef = useRef(null);
  const touchX = useRef(null);
  const tracked = useRef(new Set());

  const canShow = offers.length > 0 && !isSuppressedPath(location.pathname) && !fsDue;
  const n = offers.length;
  const idx = n ? i % n : 0;

  useEffect(() => {
    if (!canShow || seen) return undefined;
    const t = setTimeout(() => setIsOpen(true), OPEN_DELAY_MS);
    return () => clearTimeout(t);
  }, [canShow, seen]);

  const isVisible = isOpen && canShow;

  // auto-advance; a touch or hover pauses it
  useEffect(() => {
    if (!isVisible || paused || n <= 1) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % n), ROTATE_MS);
    return () => clearInterval(t);
  }, [isVisible, paused, n]);

  // one view_promotion per offer actually shown
  useEffect(() => {
    const o = isVisible && offers[idx];
    if (!o || tracked.current.has(o.id)) return;
    tracked.current.add(o.id);
    trackViewPromotion({ promotionId: o.id, promotionName: o.title, creativeSlot: CREATIVE_SLOT });
  }, [isVisible, idx, offers]);

  const close = useCallback((reason) => {
    setIsOpen(false);
    markSeen();
    setSeen(true);
    if (reason) track('promo_popup_dismissed', { promotion_id: 'OFFERS_POPUP', promotion_name: 'Offers Popup', dismiss_method: reason });
  }, []);

  /* scroll lock + Escape / arrow keys while open */
  useEffect(() => {
    if (!isVisible) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') close('escape');
      if (e.key === 'ArrowRight') setI((x) => (x + 1) % n);
      if (e.key === 'ArrowLeft') setI((x) => (x - 1 + n) % n);
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [isVisible, close, n]);

  if (!isVisible) return null;

  const go = (d) => { setPaused(true); setI((x) => (x + d + n) % n); };
  const grab = (o) => {
    trackSelectPromotion({ promotionId: o.id, promotionName: o.title, creativeSlot: CREATIVE_SLOT });
    close(null);
    if (o.ctaAction === 'link' && o.ctaUrl) {
      if (/^https:\/\//i.test(o.ctaUrl)) window.location.assign(o.ctaUrl); else navigate(o.ctaUrl);
      return;
    }
    if (!o.primaryProductId) return;
    recordOfferInterest(o.id, o.primaryProductId);
    if (o.primaryProductId !== pagePid) navigate(`/products/${o.primaryProductId}`);
  };

  return (
    <>
      <style>{STYLES}</style>
      <div className="fixed inset-0 z-[10000] flex items-end justify-center md:items-center md:p-4">
        <div className="un-op-backdrop absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => close('backdrop')} aria-hidden="true" />

        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-roledescription="carousel"
          aria-labelledby="un-op-title"
          tabIndex={-1}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={(e) => { setPaused(true); touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - (touchX.current ?? 0);
            if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
            touchX.current = null;
          }}
          className="un-op-sheet relative flex w-full flex-col overflow-hidden rounded-t-[1.75rem] border border-paper/15 bg-ink text-paper shadow-[0_24px_70px_rgba(0,0,0,0.55)] outline-none md:max-w-[420px] md:rounded-[1.75rem]"
        >
          <div className="h-1 w-full bg-gradient-to-r from-brand via-[#F5DEB3] to-brand" aria-hidden="true" />
          {/* mobile grab handle */}
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-paper/25 md:hidden" aria-hidden="true" />

          <button type="button" onClick={() => close('close_button')} aria-label="Close offers"
            className="absolute right-2 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full text-paper/60 transition-colors hover:bg-white/10 hover:text-paper">
            <i className="fa-solid fa-xmark text-base" />
          </button>

          <div className="px-5 pt-3 text-center">
            <p id="un-op-title" className="text-[9px] font-bold uppercase tracking-[0.24em] text-paper/60">
              {n === 1 ? 'Live offer' : `${n} live offers`} · Diwali at Urban Nook
            </p>
          </div>

          <div className="overflow-hidden" aria-live="polite">
            <div className="un-op-track flex" style={{ transform: `translateX(-${idx * 100}%)` }}>
              {offers.map((o, k) => (
                <div key={o.id} className="w-full shrink-0 px-5 pb-2 pt-3" aria-hidden={k !== idx} role="group" aria-label={`Offer ${k + 1} of ${n}`}>
                  <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-2xl bg-paper">
                    {/* a mystery gift shows the wrapped box (or the admin's own reward image) — never the katana that unlocks it */}
                    {o.mysteryGift && !o.rewardImage
                      ? <MysteryGiftArt />
                      : <OfferPhoto src={(o.mysteryGift && o.rewardImage) || o.bannerImage || o.productImage} eager={k === idx} />}
                    {o.rewardImage && !o.mysteryGift && o.rewardImage !== o.productImage && (
                      <span className="absolute bottom-2 right-2 grid h-16 w-16 place-items-center overflow-hidden rounded-xl border-2 border-paper bg-paper shadow-lg">
                        <img src={o.rewardImage} alt="" loading="lazy" className="h-full w-full object-contain mix-blend-multiply" />
                      </span>
                    )}
                    {(o.badgeLabel || o.benefit) && (
                      <span className="absolute left-2 top-2 rounded-md bg-brand px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white">
                        {o.badgeLabel || o.benefit}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 text-center font-serif text-[20px] font-bold leading-tight text-[#F5DEB3]">{o.title}</h3>
                  {o.benefit && o.benefit !== o.title && <p className="mt-1 text-center text-[13px] text-paper/80">{o.benefit}</p>}
                  {o.subtitle && <p className="mt-1 text-center text-[12px] text-paper/55">{o.subtitle}</p>}
                </div>
              ))}
            </div>
          </div>

          {n > 1 && (
            <div className="flex items-center justify-center gap-3 pb-1">
              <button type="button" onClick={() => go(-1)} aria-label="Previous offer" className="grid h-8 w-8 place-items-center rounded-full border border-white/20 text-paper/70 hover:text-paper">
                <i className="fa-solid fa-chevron-left text-[10px]" />
              </button>
              <div className="flex items-center gap-1.5">
                {offers.map((o, k) => (
                  <button key={o.id} type="button" onClick={() => { setPaused(true); setI(k); }} aria-label={`Show offer ${k + 1}`}
                    className={`h-1.5 rounded-full transition-all ${k === idx ? 'w-6 bg-brand' : 'w-1.5 bg-white/30'}`} />
                ))}
              </div>
              <button type="button" onClick={() => go(1)} aria-label="Next offer" className="grid h-8 w-8 place-items-center rounded-full border border-white/20 text-paper/70 hover:text-paper">
                <i className="fa-solid fa-chevron-right text-[10px]" />
              </button>
            </div>
          )}

          <div className="px-5 pb-5 pt-2" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
            <button type="button" onClick={() => grab(offers[idx])}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand text-xs font-bold uppercase tracking-[0.15em] text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all hover:bg-brandHi active:scale-[0.99]">
              {offers[idx]?.primaryProductId === pagePid ? 'Got it' : 'Get this offer'}
            </button>
            <p className="mt-2 text-center text-[11px] text-white/45">Applied automatically in your cart, no code needed.</p>
          </div>
        </div>
      </div>
    </>
  );
});
OffersPopup.displayName = 'OffersPopup';

export default OffersPopup;
