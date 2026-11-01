import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Homepage hero banner, driven by Admin → Operations Hub → Hero banner.
 *
 * Image-first: each slide is a finished creative (headline, offer and button are
 * in the picture). One slide = a plain static banner, no scripting. Two or more =
 * a native CSS scroll-snap slider (swipe on touch, arrows on desktop) with
 * optional autoplay. The parent keeps its built-in hero when there are no slides.
 *
 * Speed: the box is sized with aspect-ratio (4:5 mobile, 12:5 from 768px) so
 * nothing shifts; the first image is eager + fetchpriority=high (it is the LCP),
 * the rest lazy. Autoplay runs only while the banner is on screen, the tab is
 * visible, nothing is hovered/focused and motion isn't reduced. Scroll position
 * is read through IntersectionObserver, never a scroll listener.
 */

const CSS = `
.hb { position: relative; width: 100%; max-width: 2000px; margin: 0 auto; background: var(--gl-ink, #141414); }
.hb-track { display: flex; overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; overscroll-behavior-x: contain; scrollbar-width: none; }
.hb-track::-webkit-scrollbar { display: none; }
.hb-track:focus-visible { outline: 3px solid #fff; outline-offset: -3px; }
/* The box is the PICTURE'S OWN shape (--rm mobile, --rd desktop, from the admin upload): nothing is cropped and nothing shifts.
   Very tall artwork is capped to the screen; the pictures then sit centred and the sides take the artwork's own edge colours. */
.hb-slide, .hb-single { position: relative; width: 100%; overflow: hidden; aspect-ratio: var(--rm, 4 / 5); max-height: 85svh; background: var(--bgm, rgb(var(--gl-ink))); }
.hb-slide { flex: 0 0 100%; scroll-snap-align: start; }
@media (min-width: 768px) { .hb-slide, .hb-single { aspect-ratio: var(--rd, 12 / 5); max-height: min(720px, 85vh); background: var(--bgd, rgb(var(--gl-ink))); } }
/* the picture's edges melt into the space around it (same colours), so no seam shows: top/bottom on phones, sides on desktop */
.hb-fade-m .hb-img { -webkit-mask-image: linear-gradient(to bottom, transparent, #000 4%, #000 96%, transparent); mask-image: linear-gradient(to bottom, transparent, #000 4%, #000 96%, transparent); }
@media (min-width: 768px) {
  .hb-fade-m .hb-img { -webkit-mask-image: none; mask-image: none; }
  .hb-fade-d .hb-img { -webkit-mask-image: linear-gradient(to right, transparent, #000 5%, #000 95%, transparent); mask-image: linear-gradient(to right, transparent, #000 5%, #000 95%, transparent); }
}
.hb-slide picture, .hb-single picture { display: block; width: 100%; height: 100%; }
.hb-img { position: relative; z-index: 1; display: block; width: 100%; height: 100%; object-fit: contain; }
/* Shown behind the picture until it has loaded (or if it never does): brand name on a soft shimmer, so a slow connection never looks like an empty black box. */
.hb-ph { position: absolute; inset: 0; display: grid; place-items: center; overflow: hidden; background: var(--gl-ink, #141414); color: rgba(239,234,224,.85); font-family: Archivo, Inter, sans-serif; font-weight: 800; letter-spacing: .14em; font-size: clamp(18px, 4vw, 40px); }
.hb-ph::after { content: ''; position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,.08) 50%, transparent 70%); transform: translateX(-100%); animation: hb-shimmer 1.6s infinite; }
@keyframes hb-shimmer { to { transform: translateX(100%); } }
@media (prefers-reduced-motion: reduce) { .hb-ph::after { animation: none; } }
.hb-link { display: block; width: 100%; height: 100%; }
.hb-link:focus-visible { outline: 3px solid #fff; outline-offset: -6px; }
.hb-btn { position: absolute; display: grid; place-items: center; width: 44px; height: 44px; border: 0; border-radius: 0; background: rgba(20,20,20,.62); color: #fff; cursor: pointer; }
.hb-btn:hover { background: rgba(20,20,20,.85); }
.hb-btn:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
.hb-arrow { top: 50%; transform: translateY(-50%); display: none; }
.hb-prev { left: 12px; } .hb-next { right: 12px; }
@media (min-width: 768px) { .hb-arrow { display: grid; } }
.hb-note { position: absolute; z-index: 2; left: 10px; bottom: 5px; max-width: 60%; color: #fff; font: 500 9px/1.2 Inter, system-ui, sans-serif; text-shadow: 0 0 3px rgba(0,0,0,.65), 0 0 1px rgba(0,0,0,.8); pointer-events: none; }
@media (min-width: 768px) { .hb-note { left: 14px; bottom: 7px; font-size: 10px; } }
@media (prefers-reduced-motion: reduce) { `;

const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

// Per-slide box: its own shape for mobile / desktop, plus the artwork's edge colours (top → bottom) for any space beside it.
const grad = (c) => (c ? `linear-gradient(to bottom, ${c[0]}, ${c[1]})` : undefined);
const boxStyle = (s) => ({
  '--rm': s.mr || undefined,
  '--rd': s.dr || undefined,
  '--bgm': grad(s.mbg || s.bg), // phones: the mobile picture's own colours (old slides: the desktop ones)
  '--bgd': grad(s.bg),
});
const fadeClass = (s) => `${s.bg ? ' hb-fade-d' : ''}${s.mbg ? ' hb-fade-m' : ''}`;

const reduceMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** One <picture>: mobile image by default, desktop image from 768px. Falls back to the other file if one 404s. */
const SlidePicture = ({ slide, first, onDead }) => {
  const [src, setSrc] = useState({ m: slide.mobile, d: slide.desktop });
  const [loaded, setLoaded] = useState(false);
  // the empty-pixel placeholder src also fires load: only a real picture counts
  const real = (el) => !!el && el.complete && el.naturalWidth > 1 && !!el.currentSrc && !el.currentSrc.startsWith('data:');
  const fail = () => {
    // the mobile file broke → reuse the desktop one; if that is gone too, this slide is dead
    if (src.m !== slide.desktop) setSrc((s) => ({ ...s, m: slide.desktop }));
    else onDead(slide.id);
  };
  return (
    <>
    {!loaded && <div className="hb-ph" aria-hidden="true">URBANNOOK.IN</div>}
    <picture>
      {/* Both ranges are explicit <source>s and the <img> src is an empty pixel: React sets an <img>'s src
          BEFORE it is inside the <picture>, so a real src here made desktop also download the mobile file. */}
      <source media="(max-width: 767px)" srcSet={`${src.m} 1080w`} sizes="100vw" />
      <source media="(min-width: 768px)" srcSet={`${src.d} 1920w`} sizes="100vw" />
      <img
        className="hb-img"
        src={BLANK}
        width="1080"
        height="1350"
        alt={slide.alt}
        loading={first ? 'eager' : 'lazy'}
        fetchPriority={first ? 'high' : undefined}
        decoding={first ? 'sync' : 'async'}
        draggable={false}
        ref={(el) => { if (real(el)) setLoaded(true); }}
        onLoad={(e) => { if (real(e.currentTarget)) setLoaded(true); }}
        onError={fail}
      />
    </picture>
    </>
  );
};

/** Tiny white fine print over the bottom-left of a slide (admin: "Fine print on the banner"). */
const Note = ({ text }) => (text ? <span className="hb-note">{text}</span> : null);

const SlideLink = ({ link, label, tabbable, children }) => {
  if (!link) return children;
  const common = { className: 'hb-link', 'aria-label': label, tabIndex: tabbable ? undefined : -1 };
  return /^https:\/\//i.test(link)
    ? <a href={link} target="_blank" rel="noopener noreferrer" {...common}>{children}</a>
    : <Link to={link} {...common}>{children}</Link>;
};

const HeroBanner = ({ slides: input = [], autoplay = { enabled: false, seconds: 5 }, onEmpty }) => {
  const [dead, setDead] = useState(() => new Set());
  const slides = input.filter((s) => !dead.has(s.id));
  const n = slides.length;
  const rootRef = useRef(null);
  const trackRef = useRef(null);
  const [rawActive, setActive] = useState(0);
  const [onScreen, setOnScreen] = useState(false);
  const [hover, setHover] = useState(false);
  const [focusIn, setFocusIn] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);

  const active = rawActive < n ? rawActive : 0; // a broken image can drop a slide under the index
  const markDead = useCallback((id) => setDead((d) => new Set(d).add(id)), []);
  useEffect(() => { if (input.length && !n) onEmpty?.(); }, [input.length, n, onEmpty]);

  const go = useCallback((i) => {
    const el = trackRef.current;
    if (!el || !n) return;
    const next = (i + n) % n;
    el.scrollTo({ left: next * el.clientWidth, behavior: reduceMotion() ? 'auto' : 'smooth' });
  }, [n]);

  // Which slide is showing: IntersectionObserver on the slides inside the track.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || n < 2 || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(Number(e.target.dataset.i)); });
    }, { root: track, threshold: 0.6 });
    track.querySelectorAll('[data-i]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [n]);

  // Is the banner on screen at all?
  useEffect(() => {
    const el = rootRef.current;
    if (!el || n < 2 || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [n]);

  useEffect(() => {
    const on = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);

  const playing = n > 1 && !!autoplay?.enabled && onScreen && !hover && !focusIn && !tabHidden && !reduceMotion();
  useEffect(() => {
    if (!playing) return undefined;
    const id = setTimeout(() => go(active + 1), Math.min(10, Math.max(3, autoplay.seconds || 5)) * 1000);
    return () => clearTimeout(id); // restarts after every slide change, manual swipes included
  }, [playing, active, go, autoplay?.seconds]);

  if (!n) return null;

  if (n === 1) {
    const s = slides[0];
    return (
      <section className="hb" aria-label="Featured offer">
        <style>{CSS}</style>
        <div className={`hb-single${fadeClass(s)}`} style={boxStyle(s)}>
          <SlideLink link={s.link} label={s.alt} tabbable>
            <SlidePicture slide={s} first onDead={markDead} />
          </SlideLink>
          <Note text={s.note} />
        </div>
      </section>
    );
  }

  const onKey = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(active + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(active - 1); }
  };

  return (
    <section
      ref={rootRef}
      className="hb"
      aria-roledescription="carousel"
      aria-label="Featured offers"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFocusIn(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocusIn(false); }}
    >
      <style>{CSS}</style>
      <div ref={trackRef} className="hb-track" tabIndex={0} onKeyDown={onKey} aria-live={playing ? 'off' : 'polite'}>
        {slides.map((s, i) => (
          <div
            key={s.id}
            data-i={i}
            className={`hb-slide${fadeClass(s)}`}
            style={boxStyle(s)}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${n}`}
            aria-hidden={i === active ? undefined : true}
          >
            <SlideLink link={s.link} label={s.alt} tabbable={i === active}>
              <SlidePicture slide={s} first={i === 0} onDead={markDead} />
            </SlideLink>
            <Note text={s.note} />
          </div>
        ))}
      </div>

      <button type="button" className="hb-btn hb-arrow hb-prev" aria-label="Previous slide" onClick={() => go(active - 1)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <button type="button" className="hb-btn hb-arrow hb-next" aria-label="Next slide" onClick={() => go(active + 1)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
      </button>
    </section>
  );
};

export default HeroBanner;
