import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Reveal } from '../motion';
import { useGetPhotoReviewsQuery, useGetPublicStatsQuery } from '../../store/api/statsApi';
import { PHOTO_REVIEWS as C } from '../../content/homeRedesign';

const onImgErr = (e) => { e.currentTarget.src = '/assets/logo.webp'; };
const SPEED = 34;        // px per second: slow enough to read, steady enough to feel alive (time-based, so 60/120 Hz match)
const RESUME_MS = 2200;  // after a touch / drag, wait this long before drifting again
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const Stars = ({ n }) => {
  const r = Math.max(1, Math.min(5, Math.round(n) || 5));
  return <span className="rd-rev-stars text-star" role="img" aria-label={`${r} out of 5`}>{'★'.repeat(r)}<span className="opacity-25">{'★'.repeat(5 - r)}</span></span>;
};

/** One review: every card is the same 4:5 photo, a solid name + stars bar, then the comment in a fixed-height caption, so the rail stays level. */
const ReviewCard = ({ r, hidden }) => {
  const inner = (
    <>
      <div className="rd-rev-img relative overflow-hidden bg-hair">
        <img src={r.images[0]} alt={hidden ? '' : C.photoAlt.replace('{name}', r.userName || '')} loading="lazy" decoding="async" draggable="false" className="rd-card-photo w-full h-full object-cover" onError={onImgErr} />
        {r.images.length > 1 && <span className="rd-rev-more absolute top-3 right-3 font-mono bg-ink/70 text-paper">{C.morePhotos.replace('{n}', r.images.length - 1)}</span>}
      </div>
      {/* name + stars sit on a solid bar right under the photo; the comment follows below it */}
      <div className="rd-rev-top bg-ink">
        <p className="rd-rev-name font-mono uppercase text-paper">{r.userName}</p>
        <Stars n={r.rating} />
      </div>
      <div className="rd-rev-body">
        <p className="rd-rev-quote font-inter text-muted">{r.desc}</p>
        {r.productName && <p className="rd-rev-tag font-mono uppercase text-ink">{r.productName} <span aria-hidden="true">→</span></p>}
      </div>
    </>
  );
  return r.productId
    ? <Link to={`/product/${r.productId}`} tabIndex={hidden ? -1 : undefined} draggable="false" className="rd-rev-card rd-card group" aria-label={`${C.viewProduct}: ${r.productName || ''}`}>{inner}</Link>
    : <div className="rd-rev-card rd-card">{inner}</div>;
};

/** Homepage "Straight from your desks": every approved review that carries a customer photo, drifting slowly sideways in
 *  a loop. Hover / touch pauses it, a swipe or the wheel moves it by hand, reduced-motion makes it a plain scroller.
 *  Hidden until there is at least one photo review - never filler. */
const PhotoReviewsSection = () => {
  const { data, isLoading } = useGetPhotoReviewsQuery();
  const { data: statsRes } = useGetPublicStatsQuery();
  const rail = useRef(null);
  const list = data?.data?.reviews || [];
  const loop = list.length >= 3; // enough cards to fill a row twice → seamless wrap

  useEffect(() => {
    const el = rail.current;
    if (!el || !loop || reduceMotion()) return undefined;
    let raf = 0;
    let paused = false;
    let resume = 0;
    let pos = el.scrollLeft;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.1); // a background tab must not make it leap
      last = now;
      if (!paused) {
        pos += SPEED * dt;
        const half = el.scrollWidth / 2;
        if (pos >= half) pos -= half; // second copy is identical, so the jump is invisible
        el.scrollLeft = pos;
      }
      raf = requestAnimationFrame(tick);
    };
    const hold = () => { paused = true; clearTimeout(resume); };
    const release = (delay = 0) => { clearTimeout(resume); resume = setTimeout(() => { pos = el.scrollLeft; paused = false; }, delay); };
    const onEnter = () => hold();
    const onLeave = () => release(300);
    const onTouch = () => hold();
    const onTouchEnd = () => release(RESUME_MS);
    const onWheel = () => { hold(); release(RESUME_MS); };
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('touchstart', onTouch, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('wheel', onWheel, { passive: true });
    el.addEventListener('focusin', onEnter);
    el.addEventListener('focusout', onLeave);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf); clearTimeout(resume);
      el.removeEventListener('mouseenter', onEnter); el.removeEventListener('mouseleave', onLeave);
      el.removeEventListener('touchstart', onTouch); el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('wheel', onWheel); el.removeEventListener('focusin', onEnter); el.removeEventListener('focusout', onLeave);
    };
  }, [loop, list.length]);

  if (!isLoading && !list.length) return null;
  const { ratingAvg = 0, ratingCount = 0 } = statsRes?.data || {};
  const [countA, countB] = C.count;
  return (
    <section className="rd-gift rd-rev bg-paper text-ink" aria-label={C.heading}>
      <Reveal className="rd-gift-head">
        <div>
          <h2 className="rd-h2 font-archivo text-ink">{C.heading}</h2>
          {C.sub && <p className="rd-sub font-inter text-muted">{C.sub}</p>}
        </div>
        <div className="rd-head-side">
          <p className="rd-count font-mono uppercase text-muted">
            {countA.replace('{n}', String(list.length).padStart(2, '0'))}<br />{countB}
          </p>
          {ratingCount > 0 && ratingAvg > 0 && (
            <p className="rd-rev-rated font-inter text-ink"><span className="text-star" aria-hidden="true">★</span> {C.rated.replace('{avg}', ratingAvg.toFixed(1)).replace('{n}', ratingCount.toLocaleString('en-IN'))}</p>
          )}
        </div>
      </Reveal>
      <div className="rd-rev-wrap">
        <div className="rd-rev-rail" ref={rail}>
          {isLoading
            ? [...Array(5)].map((_, i) => <div key={i} className="rd-rev-card"><div className="rd-rev-img bg-hair animate-pulse" /><div className="rd-rev-body" /></div>)
            : (loop ? [0, 1] : [0]).map((copy) => (
              <div key={copy} className="rd-rev-set" aria-hidden={copy === 1 || undefined}>
                {list.map((r) => <ReviewCard key={r.id} r={r} hidden={copy === 1} />)}
              </div>
            ))}
        </div>
      </div>
    </section>
  );
};

export default PhotoReviewsSection;
