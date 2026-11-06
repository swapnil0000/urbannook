import { useEffect, useRef, useState } from 'react';
import { STATEMENT as C } from '../../content/homeRedesign';

const onImgErr = (e) => { e.currentTarget.src = '/assets/logo.webp'; };
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const SWIPE_PX = 40;

/** Fanned photo stack: every card is the same 4:5 frame; the centre card sits flat and forward, neighbours step
 *  sideways, tilt and drop a little. Sizes and spacing come from CSS (.rd-cover-*), so a resize never re-renders it.
 *  Auto-advances (off for reduced-motion), pauses on hover / focus; swipe, click a card or use the dots to move. */
const CoverflowCarousel = ({ images }) => {
  const N = images.length;
  const [active, setActive] = useState(Math.min(2, Math.max(N - 1, 0)));
  const [paused, setPaused] = useState(false);
  const downX = useRef(null);

  useEffect(() => {
    if (N <= 1 || paused || reduceMotion()) return undefined;
    const id = setInterval(() => setActive((a) => (a + 1) % N), 4200);
    return () => clearInterval(id);
  }, [N, paused]);

  const step = (d) => setActive((a) => (a + d + N) % N);
  const fill = (t, i) => t.replace('{i}', String(i).padStart(2, '0'));
  const onUp = (e) => {
    if (downX.current == null) return;
    const dx = e.clientX - downX.current;
    downX.current = null;
    if (Math.abs(dx) > SWIPE_PX) step(dx < 0 ? 1 : -1);
  };

  return (
    <div className="rd-cover" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="rd-cover-stage" onPointerDown={(e) => { downX.current = e.clientX; }} onPointerUp={onUp} onPointerCancel={() => { downX.current = null; }}>
        {images.map((src, i) => {
          let offset = i - active;
          if (offset < -Math.floor(N / 2)) offset += N;
          if (offset > Math.floor(N / 2)) offset -= N;
          const abs = Math.abs(offset);
          return (
            <button
              type="button"
              key={src + i}
              tabIndex={abs === 0 ? 0 : -1}
              onClick={() => setActive(i)}
              aria-label={fill(C.goTo, i + 1)}
              aria-current={abs === 0}
              className="rd-cover-card"
              style={{ '--o': offset, '--a': abs, zIndex: 10 - abs, ...(abs > 2 && { opacity: 0 }), pointerEvents: abs > 2 ? 'none' : 'auto' }}
            >
              <img src={src} alt="" loading="lazy" draggable="false" className="w-full h-full object-cover pointer-events-none" onError={onImgErr} />
            </button>
          );
        })}
      </div>
      {N > 1 && (
        <div className="rd-cover-controls">
          <div className="rd-cover-dots" role="group" aria-label="Photos">
            {images.slice(0, 12).map((_, i) => (
              <button key={i} type="button" onClick={() => setActive(i)} aria-label={fill(C.goTo, i + 1)} aria-current={i === active} className="rd-cover-dot" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CoverflowCarousel;
