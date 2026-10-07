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
  priority = false, // first slide is the page's LCP image → fetchpriority=high
}) {
  const trackRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [prevImages, setPrevImages] = useState(images);
  const count = images.length;
  // Seamless loop: the slides are rendered twice. Scrolling only ever moves
  // forward into the second copy, and once it settles there we jump back by
  // one copy's width with no animation — the two positions look identical,
  // so the wrap is invisible (the old version smooth-scrolled back to 0,
  // rewinding through every slide in a fast blur).
  const loop = count > 1;
  const slides = loop ? [...images, ...images] : images;

  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Reset to the first frame when the image set changes (e.g. variant switch).
  if (images !== prevImages) {
    setPrevImages(images);
    setIndex(0);
  }
  // Distance between consecutive slides (slide width + gap). Measured from the DOM
  // so it works for both full-width and peek layouts. Cached and refreshed by a
  // ResizeObserver so scroll handlers never force a synchronous layout (reflow).
  const strideRef = useRef(0);
  const measure = () => {
    const el = trackRef.current;
    if (!el) return 1;
    const k = el.children;
    strideRef.current = k.length >= 2 ? Math.max(1, k[1].offsetLeft - k[0].offsetLeft) : el.clientWidth || 1;
    return strideRef.current;
  };
  const stride = () => strideRef.current || measure();

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    strideRef.current = 0;
    // Only write scrollLeft when needed — an unconditional write on mount invalidated
    // layout right before the first measurement.
    if (el.scrollLeft !== 0) el.scrollLeft = 0;
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => { strideRef.current = 0; });
    ro.observe(el);
    return () => ro.disconnect();
  }, [images]);

  // Once scrolling settles inside the second copy, jump back one copy width.
  // Never while a finger/mouse is down — the slide would jump under it.
  const holdingRef = useRef(false);
  const normalize = useCallback(() => {
    const el = trackRef.current;
    if (!el || !loop || holdingRef.current) return;
    const span = count * stride();
    if (el.scrollLeft >= span - 2) el.scrollLeft -= span;
  }, [count, loop]);

  // `i` is a real index; index - 1 / index + 1 from the arrows may step off
  // either end, which in loop mode means "keep going", never "rewind".
  const scrollToIndex = useCallback(
    (i) => {
      const el = trackRef.current;
      if (!el || count === 0) return;
      normalize();
      const s = stride();
      let cur = Math.round(el.scrollLeft / s);
      // Back from the first slide: hop to its twin in the second copy so
      // "previous" is one short step.
      if (loop && i < 0) {
        el.scrollLeft += count * s;
        cur += count;
      }
      const real = ((i % count) + count) % count;
      const base = cur - (cur % count);
      // Forward past the last slide: continue into the next copy.
      const target = loop && i >= count ? base + count + real : base + real;
      el.scrollTo({ left: target * s, behavior: reduced ? 'auto' : 'smooth' });
    },
    [count, reduced, loop, normalize]
  );

  const settleRef = useRef(0);
  useEffect(() => {
    const el = trackRef.current;
    if (!el || !loop) return;
    const onEnd = () => normalize();
    el.addEventListener('scrollend', onEnd);
    return () => { el.removeEventListener('scrollend', onEnd); clearTimeout(settleRef.current); };
  }, [normalize, loop]);

  // rAF-throttled: at most one layout read per frame while scrolling.
  const rafRef = useRef(0);
  const onScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const el = trackRef.current;
      if (!el) return;
      const i = Math.round(el.scrollLeft / stride()) % count;
      setIndex((prev) => (prev === i ? prev : i));
      // Fallback for browsers without `scrollend` (older Safari).
      clearTimeout(settleRef.current);
      settleRef.current = setTimeout(normalize, 160);
    });
  }, [count, normalize]);
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  useEffect(() => {
    if (paused || reduced || count <= 1) return;
    const id = setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      const s = stride();
      // Always step forward; normalize() folds the second copy back afterwards.
      // If a wide peek layout still hits the hard end, fold back first.
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) el.scrollLeft -= count * s;
      el.scrollTo({ left: Math.round(el.scrollLeft / s) * s + s, behavior: 'smooth' });
    }, interval);
    return () => clearInterval(id);
  }, [paused, reduced, count, interval]);

  if (!count) return null;

  const hold = (on) => {
    holdingRef.current = on;
    setPaused(on);
  };
  const pauseOnInteract = {
    onPointerDown: () => hold(true),
    onPointerUp: () => hold(false),
    onPointerCancel: () => hold(false),
    onTouchStart: () => hold(true),
    onTouchEnd: () => hold(false),
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

  const Slide = (src, k, extra = '') => {
    const i = k % count; // real index; k >= count is the loop copy
    return (
    <div key={k} className={`relative shrink-0 ${extra}`} aria-hidden={k >= count || undefined}>
      <img
        src={src}
        alt={alt}
        loading={k === 0 && !peek ? 'eager' : 'lazy'}
        fetchPriority={priority && k === 0 ? 'high' : undefined}
        decoding={k === 0 && !peek ? 'sync' : 'async'}
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover"
        onError={onImgErr}
      />
      {renderOverlay && <div className="pointer-events-none absolute inset-0 z-[5]">{renderOverlay(i)}</div>}
      {onItemClick && (
        <button type="button" onClick={() => onItemClick(i)} aria-label="View image" tabIndex={k >= count ? -1 : undefined} className="absolute inset-0" />
      )}
    </div>
    );
  };

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
          {slides.map((src, k) => Slide(src, k, `${slideClass} ${aspectClass} overflow-hidden bg-paper/5 snap-start`))}
        </div>
        {Dots}
      </div>
    );
  }

  // DEFAULT — one full-width framed image at a time.
  return (
    <div className={className} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className={`relative  overflow-hidden border border-hair bg-surface ${aspectClass}`}>
        <div
          ref={trackRef}
          onScroll={onScroll}
          {...pauseOnInteract}
          className="flex h-full w-full overflow-x-auto gl-hscroll snap-x snap-mandatory"
        >
          {slides.map((src, k) => Slide(src, k, 'w-full h-full snap-center'))}
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
