import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

/**
 * Background / product video that never slows the page down.
 *
 * - Downloads nothing until it is near the screen (preload="none", no src
 *   until then), so it never competes with the page's main image (LCP).
 * - Plays only while visible and pauses off-screen (saves CPU and battery,
 *   keeps taps fast — INP).
 * - Reserves its box from the start via `aspect` (no layout shift — CLS);
 *   the poster image shows in that box until the video starts.
 * - With prefers-reduced-motion it shows the poster and doesn't autoplay.
 *
 * Use it for GIF-style clips too: upload them as MP4 (and WebM) instead of
 * GIF — the same clip is usually 5–20x smaller as video.
 *
 *   <LazyVideo
 *     sources={[{ src: '…/clip.webm', type: 'video/webm' }, { src: '…/clip.mp4', type: 'video/mp4' }]}
 *     poster="…/clip-poster.webp" aspect="16/9" className="rounded-none" />
 *
 * Files go in urbannook-assets-storage (assets-prod.urbannook.in), never the
 * website bucket.
 */
const LazyVideo = ({ sources, poster, aspect = '16/9', className = '', label, loop = true, controls = false }) => {
  const ref = useRef(null);
  const visible = useRef(false);
  const [near, setNear] = useState(false);
  const autoplay = () => !controls && !matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => {
      visible.current = e.isIntersecting;
      if (e.isIntersecting) {
        setNear(true);
        if (el.currentSrc && autoplay()) el.play().catch(() => {});
      } else if (!el.paused) {
        el.pause();
      }
    }, { rootMargin: '200px 0px' });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls]);

  // <source>s were just added: the element only picks them up after load().
  useEffect(() => {
    const el = ref.current;
    if (!near || !el) return;
    el.load();
    if (visible.current && autoplay()) el.play().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [near]);

  return (
    <video
      ref={ref}
      className={`block w-full object-cover ${className}`}
      style={{ aspectRatio: aspect }}
      poster={poster}
      preload="none"
      muted
      playsInline
      loop={loop}
      controls={controls}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {near && sources.map((s) => <source key={s.src} src={s.src} type={s.type} />)}
    </video>
  );
};

LazyVideo.propTypes = {
  sources: PropTypes.arrayOf(PropTypes.shape({ src: PropTypes.string.isRequired, type: PropTypes.string })).isRequired,
  poster: PropTypes.string,
  aspect: PropTypes.string,
  className: PropTypes.string,
  label: PropTypes.string,
  loop: PropTypes.bool,
  controls: PropTypes.bool,
};

export default LazyVideo;
