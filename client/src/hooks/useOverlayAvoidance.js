import { useEffect, useState } from 'react';

/** Phones: the Help button floats over the bottom of the screen. Anything the shopper reads or taps
 *  there (offer tiles, coupon tickets, product / category / review cards, FAQ rows, the sign-up form, the CTAs) must never
 *  sit underneath them, so while one is in that zone the Help button fades out (body[data-clear-fab],
 *  see index.css); it returns in the gaps between sections. Cards are matched by class, the rest opt in with data-avoid-overlay. */
export const HOME_AVOID = '.un-offer-cell, .un-coupon, .rd-card, [data-avoid-overlay]';
const useOverlayAvoidance = (selector = HOME_AVOID) => {
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    const phone = window.matchMedia('(max-width: 767px)');
    let raf = 0;
    let release = 0;
    const measure = () => {
      raf = 0;
      if (!phone.matches) { clearTimeout(release); setBlocked(false); delete document.body.dataset.clearFab; return; }
      const h = window.innerHeight;
      const zoneTop = h - 210; // Help button + Add bar + bottom nav
      const hit = [...document.querySelectorAll(selector)].some((el) => { const r = el.getBoundingClientRect(); return r.bottom > zoneTop && r.top < h - 56; });
      if (hit) { clearTimeout(release); setBlocked(true); document.body.dataset.clearFab = '1'; }
      else { clearTimeout(release); release = setTimeout(() => { setBlocked(false); delete document.body.dataset.clearFab; }, 220); }
    };
    const onMove = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    window.addEventListener('scroll', onMove, { passive: true });
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove); window.removeEventListener('resize', onMove);
      cancelAnimationFrame(raf); clearTimeout(release); delete document.body.dataset.clearFab;
    };
  }, [selector]);
  return blocked;
};

export default useOverlayAvoidance;
