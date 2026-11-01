import { useEffect, useRef, useState } from 'react';

/**
 * Horizontal scroller that *shows* it scrolls: edge fades plus a tappable
 * arrow appear only on the side that has more content. On phones the category
 * pills used to look like a complete row, so nobody knew there were more.
 */
// `activeKey`: when it changes, the child marked aria-current is scrolled into
// view (the row keeps its old scroll across navigations, hiding the new pick).
const ScrollRow = ({ children, className = '', fade = 'from-surface', activeKey }) => {
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
  }, []);

  useEffect(() => {
    const el = ref.current;
    const cur = el?.querySelector('[aria-current]');
    if (!el || !cur) return;
    // only move when the pick is (partly) out of view, so a switch doesn't jolt the row
    const a = cur.offsetLeft - el.offsetLeft;
    if (a >= el.scrollLeft && a + cur.offsetWidth <= el.scrollLeft + el.clientWidth) return;
    el.scrollTo({ left: Math.max(0, a - 16), behavior: 'smooth' });
  }, [activeKey]);

  const nudge = (dir) => ref.current?.scrollBy({ left: dir * Math.round(ref.current.clientWidth * 0.7), behavior: 'smooth' });
  const arrow = 'absolute top-1/2 -translate-y-1/2 z-10 grid h-8 w-8 place-items-center rounded-full border border-hair bg-white text-ink shadow-md';

  return (
    <div className={`relative ${className}`}>
      <div ref={ref} className="overflow-x-auto gl-hscroll">
        <div className="flex items-center gap-2.5 w-max pr-10">{children}</div>
      </div>
      {edges.left && (
        <>
          <span className={`pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r ${fade} to-transparent`} aria-hidden="true" />
          <button type="button" onClick={() => nudge(-1)} aria-label="Scroll left" className={`${arrow} left-0`}>‹</button>
        </>
      )}
      {edges.right && (
        <>
          <span className={`pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l ${fade} to-transparent`} aria-hidden="true" />
          <button type="button" onClick={() => nudge(1)} aria-label="Scroll right" className={`${arrow} right-0`}>›</button>
        </>
      )}
    </div>
  );
};

export default ScrollRow;
