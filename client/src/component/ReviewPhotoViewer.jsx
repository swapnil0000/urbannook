import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Stars from './pdp/Stars';

const SWIPE_PX = 50;

/** Full-screen photo viewer. With `meta[idx]` ({ name, rating, text, date }) it shows that photo's review beside / under it.
 *  Esc closes, arrows (and a swipe) move, focus goes to the close button and returns on close, page scroll is locked. */
const ReviewPhotoViewer = ({ list, meta, idx, onIdx, onClose, label = 'Photo viewer' }) => {
  const closeRef = useRef(null);
  const downX = useRef(null);
  const go = (d) => { const n = idx + d; if (n >= 0 && n < list.length) onIdx(n); };
  const m = meta?.[idx];

  useEffect(() => {
    const prev = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => { document.body.style.overflow = overflow; prev?.focus?.(); };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const onUp = (e) => {
    if (downX.current == null) return;
    const dx = e.clientX - downX.current;
    downX.current = null;
    if (Math.abs(dx) > SWIPE_PX) go(dx < 0 ? 1 : -1);
  };

  return createPortal(
    <div className="pdp-lb" role="dialog" aria-modal="true" aria-label={label} onClick={onClose}>
      <div className="pdp-lb-body" onClick={(e) => e.stopPropagation()}>
        <img src={list[idx]} alt="" className="pdp-lb-img" draggable="false" onPointerDown={(e) => { downX.current = e.clientX; }} onPointerUp={onUp} onPointerCancel={() => { downX.current = null; }} />
        {m && (
          <div className="pdp-lb-cap">
            <b>{m.name}</b>
            <Stars n={m.rating} className="text-sm" />
            {m.date && <time>{m.date}</time>}
            {m.text && <p>{m.text}</p>}
          </div>
        )}
      </div>
      <button ref={closeRef} type="button" className="pdp-lb-x" aria-label="Close photo viewer" onClick={onClose}>×</button>
      {list.length > 1 && (
        <>
          <button type="button" className="pdp-lb-nav pdp-lb-prev" aria-label="Previous photo" disabled={idx === 0} onClick={(e) => { e.stopPropagation(); go(-1); }}>‹</button>
          <button type="button" className="pdp-lb-nav pdp-lb-next" aria-label="Next photo" disabled={idx === list.length - 1} onClick={(e) => { e.stopPropagation(); go(1); }}>›</button>
        </>
      )}
    </div>,
    document.body,
  );
};

export default ReviewPhotoViewer;
