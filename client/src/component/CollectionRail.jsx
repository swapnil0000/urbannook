import { useEffect, useRef, useState } from 'react';

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const Chevron = ({ flip }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" style={flip ? { transform: 'scaleX(-1)' } : undefined}><path d="M2 7h10M8 3l4 4-4 4" /></svg>
);

/**
 * Horizontal product row in the homepage's grid rhythm (.rd-rail in index.css: 4 across on desktop, 3 on a tablet,
 * a swipeable 62% card with the next one peeking on a phone). Native CSS scroll-snap; from 640px up square prev/next
 * buttons appear only on the side that has more. No library.
 */
const CollectionRail = ({ children, label }) => {
  const ref = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    return () => { el.removeEventListener('scroll', update); ro?.disconnect(); };
  }, [children]);

  const go = (dir) => ref.current?.scrollBy({ left: dir * Math.round(ref.current.clientWidth * 0.9), behavior: reduced() ? 'auto' : 'smooth' });

  return (
    <div className="rd-railwrap" role="region" aria-roledescription="carousel" aria-label={label}>
      <div
        ref={ref}
        tabIndex={0}
        className="rd-rail"
        onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } }}
      >
        {children}
      </div>
      {edges.left && <button type="button" onClick={() => go(-1)} aria-label={`${label}: previous`} className="rd-railnav rd-railnav-l"><Chevron flip /></button>}
      {edges.right && <button type="button" onClick={() => go(1)} aria-label={`${label}: next`} className="rd-railnav rd-railnav-r"><Chevron /></button>}
    </div>
  );
};

export default CollectionRail;
