import { useEffect, useRef } from 'react';
import { RAIL as C } from '../../content/homeRedesign';

/** Phones only (CSS): a hairline under a swipe rail whose ink thumb shows how much is visible and where you are, plus a
 *  "Swipe →" cue that goes away after the first scroll. It reads the sibling `.rd-grid` just before it; no state, so
 *  scrolling never re-renders anything. */
const RailProgress = () => {
  const ref = useRef(null);
  useEffect(() => {
    const me = ref.current;
    const rail = me?.previousElementSibling;
    if (!rail) return undefined;
    const sync = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      me.style.setProperty('--w', max > 1 ? String(Math.min(1, rail.clientWidth / rail.scrollWidth)) : '1');
      me.style.setProperty('--p', max > 1 ? String(Math.min(1, Math.max(0, rail.scrollLeft / max))) : '0');
      me.dataset.moved = rail.scrollLeft > 8 ? '1' : '0';
      me.dataset.scrollable = max > 1 ? '1' : '0';
    };
    sync();
    rail.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sync) : null;
    ro?.observe(rail);
    return () => { rail.removeEventListener('scroll', sync); window.removeEventListener('resize', sync); ro?.disconnect(); };
  }, []);
  return (
    <div ref={ref} className="rd-rail-progress" aria-hidden="true">
      <span className="rd-rail-track"><span className="rd-rail-thumb" /></span>
      <span className="rd-rail-cue font-mono uppercase">{C.swipe} →</span>
    </div>
  );
};

export default RailProgress;
