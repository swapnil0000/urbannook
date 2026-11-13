import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Product gallery: one stable main image that only changes when the customer asks.
 * - NO auto-advance (the old carousel moved every 3.5 s while people were judging the product).
 * - swipe / scroll-snap on touch, arrow buttons + counter on desktop, a vertical thumbnail rail on desktop and dots on a phone.
 * - Left / Right arrow keys move between photos when the image has focus; Enter / Space on a photo opens the lightbox.
 * Remount it (key) when the image set changes (variant switch) so it starts on photo 1.
 */
export default function ProductGallery({ images = [], alt, onImgErr, onOpen }) {
  const trackRef = useRef(null);
  const raf = useRef(0);
  const [index, setIndex] = useState(0);
  const count = images.length;
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const altOf = (i) => (typeof alt === 'function' ? alt(i) : alt || '');

  const goTo = useCallback((i) => {
    const el = trackRef.current;
    if (!el || !count) return;
    const next = Math.min(count - 1, Math.max(0, i));
    setIndex(next);
    el.scrollTo({ left: next * el.clientWidth, behavior: reduced ? 'auto' : 'smooth' });
  }, [count, reduced]);

  const onScroll = useCallback(() => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const el = trackRef.current;
      if (!el || !el.clientWidth) return;
      const i = Math.round(el.scrollLeft / el.clientWidth);
      setIndex((prev) => (prev === i ? prev : i));
    });
  }, []);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  if (!count) return null;
  const onKey = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1); }
  };

  return (
    <div className="pdp-gallery">
      {count > 1 && (
        <ul className="pdp-thumbs" aria-label="Product photos">
          {images.map((src, i) => (
            <li key={`${src}-${i}`}>
              <button type="button" onClick={() => goTo(i)} aria-label={`Show photo ${i + 1} of ${count}`} aria-current={i === index ? 'true' : undefined} className="pdp-thumb">
                <img src={src} alt="" loading="lazy" decoding="async" draggable="false" onError={onImgErr} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="pdp-stage">
        <div ref={trackRef} className="pdp-track" onScroll={onScroll} onKeyDown={onKey} tabIndex={count > 1 ? 0 : undefined} role="group" aria-roledescription="carousel" aria-label="Product photos">
          {images.map((src, i) => (
            <div key={`${src}-${i}`} className="pdp-slide" aria-roledescription="slide" aria-label={`${i + 1} of ${count}`}>
              <img
                src={src}
                alt={altOf(i)}
                loading={i === 0 ? 'eager' : 'lazy'}
                fetchPriority={i === 0 ? 'high' : undefined}
                decoding={i === 0 ? 'sync' : 'async'}
                draggable="false"
                onError={onImgErr}
              />
              {onOpen && <button type="button" className="pdp-zoom" onClick={() => onOpen(i)} aria-label={`Enlarge photo ${i + 1}`} />}
            </div>
          ))}
        </div>
        {count > 1 && (
          <>
            <button type="button" className="pdp-arrow pdp-arrow--prev" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Previous photo">‹</button>
            <button type="button" className="pdp-arrow pdp-arrow--next" onClick={() => goTo(index + 1)} disabled={index === count - 1} aria-label="Next photo">›</button>
            <span className="pdp-count font-mono" aria-hidden="true">{index + 1} / {count}</span>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="pdp-dots" aria-hidden="true">
          {images.map((_, i) => <span key={i} className={i === index ? 'is-on' : ''} />)}
        </div>
      )}
    </div>
  );
}
