import { useEffect, useRef, useState } from 'react';
import { STATEMENT as C } from '../../content/homeRedesign';

const onImgErr = (e) => { e.currentTarget.src = '/assets/logo.webp'; };
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** 3D curved coverflow: centre card flat and forward, neighbours angled and dimmed. Auto-advances (off for
 *  reduced-motion), pauses on hover / focus, click a card or use the arrows / dots to move. */
const CoverflowCarousel = ({ images }) => {
  const N = images.length;
  const [active, setActive] = useState(Math.min(2, Math.max(N - 1, 0)));
  const [paused, setPaused] = useState(false);
  const stageRef = useRef(null);
  const [stageW, setStageW] = useState(360);

  useEffect(() => {
    const measure = () => { if (stageRef.current) setStageW(stageRef.current.offsetWidth); };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  useEffect(() => {
    if (N <= 1 || paused || reduceMotion()) return undefined;
    const id = setInterval(() => setActive((a) => (a + 1) % N), 3600);
    return () => clearInterval(id);
  }, [N, paused]);

  const cardW = Math.min(stageW * 0.58, 400);
  const cardH = cardW * 0.8;
  const shift = Math.min(stageW * 0.34, 230);
  const step = (d) => setActive((a) => (a + d + N) % N);
  const fill = (t, i) => t.replace('{i}', String(i).padStart(2, '0')).replace('{n}', String(N).padStart(2, '0'));

  return (
    <div className="rd-cover" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div ref={stageRef} className="relative w-full flex items-center justify-center select-none" style={{ perspective: '1500px', height: cardH + 24 }}>
        <div className="relative" style={{ transformStyle: 'preserve-3d', width: cardW, height: cardH }}>
          {images.map((src, i) => {
            let offset = i - active;
            if (offset < -Math.floor(N / 2)) offset += N;
            if (offset > Math.floor(N / 2)) offset -= N;
            const abs = Math.abs(offset);
            return (
              <div
                key={src + i}
                onClick={() => setActive(i)}
                aria-hidden={abs !== 0}
                className="rd-cover-card absolute inset-0 overflow-hidden bg-ink cursor-pointer"
                style={{
                  transform: `translateX(${offset * shift}px) translateZ(${-abs * 140}px) rotateY(${-offset * 15}deg) scale(${abs === 0 ? 1.04 : 1 - abs * 0.1})`,
                  opacity: abs === 0 ? 1 : abs === 1 ? 0.78 : 0.38,
                  filter: abs === 0 ? 'none' : 'blur(1px) brightness(0.85)',
                  zIndex: 10 - abs,
                  display: abs <= 2 ? 'block' : 'none',
                }}
              >
                <img src={src} alt="" loading="lazy" className="w-full h-full object-cover pointer-events-none" onError={onImgErr} />
              </div>
            );
          })}
        </div>
      </div>
      {N > 1 && (
        <div className="rd-cover-controls">
          <span className="rd-cover-count font-mono uppercase" aria-live="off">{fill(C.counter, active + 1)}</span>
          <div className="rd-cover-dots" role="group" aria-label="Photos">
            {images.slice(0, 12).map((_, i) => (
              <button key={i} type="button" onClick={() => setActive(i)} aria-label={fill(C.goTo, i + 1)} aria-current={i === active} className="rd-cover-dot" />
            ))}
          </div>
          <span className="rd-cover-arrows">
            <button type="button" onClick={() => step(-1)} aria-label={C.prev} className="rd-cover-arrow">←</button>
            <button type="button" onClick={() => step(1)} aria-label={C.next} className="rd-cover-arrow">→</button>
          </span>
        </div>
      )}
    </div>
  );
};

export default CoverflowCarousel;
