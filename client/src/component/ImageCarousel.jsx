import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Scroll-snap image carousel with three behaviours at once:
 *  - free manual scroll / swipe / drag (native, with momentum + snap)
 *  - dot indicators that reflect the current slide AND jump to any slide
 *  - autoplay that advances on a timer (pauses on hover / touch / drag)
 *
 * Two layouts:
 *  - default: one full-width framed image at a time (used by the main gallery)
 *  - peek:    smaller square cards, several visible at once, no frame/radius
 *             (used by "Look closer" and "Seen in real setups")
 */
export default function ImageCarousel({
  images = [],
  alt = '',
  interval = 3500,
  className = '',
  onImgErr,
  aspectClass = 'aspect-square',
  onItemClick,
  renderOverlay,
  peek = false,
  slideClass = 'w-[64%] sm:w-56',
}) {
  const trackRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [prevImages, setPrevImages] = useState(images);
  const count = images.length;

  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Reset to the first frame when the image set changes (e.g. variant switch).
  if (images !== prevImages) {
    setPrevImages(images);
    setIndex(0);
  }
  useEffect(() => {
    if (trackRef.current) trackRef.current.scrollLeft = 0;
  }, [images]);

  // Distance between consecutive slides (slide width + gap). Measured from the DOM
  // so it works for both full-width and peek layouts.
  const stride = () => {
    const el = trackRef.current;
    if (!el) return 1;
    const k = el.children;
    if (k.length >= 2) return Math.max(1, k[1].offsetLeft - k[0].offsetLeft);
    return el.clientWidth || 1;
  };

  const scrollToIndex = useCallback(
    (i) => {
      const el = trackRef.current;
      if (!el || count === 0) return;
      const target = ((i % count) + count) % count;
      el.scrollTo({ left: target * stride(), behavior: reduced ? 'auto' : 'smooth' });
    },
    [count, reduced]
  );

  const onScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / stride());
    setIndex((prev) => (prev === i ? prev : i));
  }, []);

  useEffect(() => {
    if (paused || reduced || count <= 1) return;
    const id = setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      const s = stride();
      const next = (Math.round(el.scrollLeft / s) + 1) % count;
      el.scrollTo({ left: next * s, behavior: 'smooth' });
    }, interval);
    return () => clearInterval(id);
  }, [paused, reduced, count, interval]);

  if (!count) return null;

  const pauseOnInteract = {
    onPointerDown: () => setPaused(true),
    onPointerUp: () => setPaused(false),
    onPointerCancel: () => setPaused(false),
    onTouchStart: () => setPaused(true),
    onTouchEnd: () => setPaused(false),
  };

  const Dots = count > 1 && (
    <div className="flex justify-center gap-2 mt-4">
      {images.map((_, i) => (
        <button
          key={i}
          onClick={() => scrollToIndex(i)}
          aria-label={`Go to image ${i + 1}`}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === index ? 'w-6 bg-brand' : 'w-2 bg-hair hover:bg-faint'
          }`}
        />
      ))}
    </div>
  );

  const Slide = (src, i, extra = '') => (
    <div key={i} className={`relative shrink-0 ${extra}`}>
      <img
        src={src}
        alt={alt}
        loading={i === 0 ? 'eager' : 'lazy'}
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover"
        onError={onImgErr}
      />
      {renderOverlay && <div className="pointer-events-none absolute inset-0 z-[5]">{renderOverlay(i)}</div>}
      {onItemClick && (
        <button type="button" onClick={() => onItemClick(i)} aria-label="View image" className="absolute inset-0" />
      )}
    </div>
  );

  // PEEK — smaller square cards, several visible, no frame/radius.
  if (peek) {
    return (
      <div className={className} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <div
          ref={trackRef}
          onScroll={onScroll}
          {...pauseOnInteract}
          className="flex gap-3 overflow-x-auto gl-hscroll snap-x snap-mandatory -mx-5 px-5 pb-1"
        >
          {images.map((src, i) => Slide(src, i, `${slideClass} ${aspectClass} overflow-hidden bg-paper/5 snap-start`))}
        </div>
        {Dots}
      </div>
    );
  }

  // DEFAULT — one full-width framed image at a time.
  return (
    <div className={className} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className={`relative rounded-[1.5rem] overflow-hidden border border-hair bg-surface ${aspectClass}`}>
        <div
          ref={trackRef}
          onScroll={onScroll}
          {...pauseOnInteract}
          className="flex h-full w-full overflow-x-auto gl-hscroll snap-x snap-mandatory"
        >
          {images.map((src, i) => Slide(src, i, 'w-full h-full snap-center'))}
        </div>

        {count > 1 && (
          <>
            <button
              onClick={() => scrollToIndex(index - 1)}
              aria-label="Previous image"
              className="hidden md:grid place-items-center absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 backdrop-blur text-ink text-xl shadow hover:bg-white transition z-10"
            >‹</button>
            <button
              onClick={() => scrollToIndex(index + 1)}
              aria-label="Next image"
              className="hidden md:grid place-items-center absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 backdrop-blur text-ink text-xl shadow hover:bg-white transition z-10"
            >›</button>
            <span className="absolute top-3 right-3 z-10 bg-ink/70 text-white text-[11px] font-bold px-2 py-1 rounded-full tabular-nums">
              {index + 1}/{count}
            </span>
          </>
        )}
      </div>
      {Dots}
    </div>
  );
}
