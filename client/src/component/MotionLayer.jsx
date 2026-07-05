import { useEffect, useRef } from 'react';

/**
 * URBAN NOOK — editorial "2040" motion layer.
 * Mounted once at app level. Adds a custom cursor + film grain, and wires
 * up (via event delegation, so it survives route changes / re-renders):
 *   - magnetic pull on `.un-magnet`
 *   - 3D tilt + glare on `.un-card`
 *   - scroll reveals on `.un-reveal`  (IntersectionObserver + MutationObserver)
 *   - spring press on `.un-btn` via Motion (motion.dev), progressive enhancement
 * Everything is disabled for touch devices / prefers-reduced-motion.
 */
const MotionLayer = () => {
  const grainRef = useRef(null);
  const curRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = matchMedia('(pointer: coarse)').matches || matchMedia('(hover: none)').matches;
    const cleanups = [];

    /* ---------- scroll reveals (works on touch too) ---------- */
    if (!reduced) {
      const io = new IntersectionObserver(
        (entries) => entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        }),
        { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
      );
      const observeAll = (root) => {
        (root.querySelectorAll ? root.querySelectorAll('.un-reveal:not(.in)') : []).forEach((el) => io.observe(el));
      };
      observeAll(document);
      // catch elements added on route change
      const mo = new MutationObserver((muts) => {
        muts.forEach((m) => m.addedNodes.forEach((n) => {
          if (n.nodeType !== 1) return;
          if (n.classList && n.classList.contains('un-reveal') && !n.classList.contains('in')) io.observe(n);
          observeAll(n);
        }));
      });
      mo.observe(document.body, { childList: true, subtree: true });
      cleanups.push(() => { io.disconnect(); mo.disconnect(); });
    } else {
      document.querySelectorAll('.un-reveal').forEach((el) => el.classList.add('in'));
    }

    /* ---------- cursor + grain + tilt + magnet (pointer devices only) ---------- */
    if (!coarse && !reduced) {
      const cur = curRef.current, ring = ringRef.current;
      let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, raf;
      const onMove = (e) => { mx = e.clientX; my = e.clientY; };
      addEventListener('mousemove', onMove, { passive: true });
      const loop = () => {
        rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
        if (cur) cur.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
        if (ring) ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
        raf = requestAnimationFrame(loop);
      };
      loop();

      const onOver = (e) => {
        const t = e.target.closest && e.target.closest('a,button,.un-card,.un-chip,input,select,textarea,[data-cursor]');
        if (ring) ring.classList.toggle('is-hover', !!t);
      };
      const onTiltMove = (e) => {
        const mag = e.target.closest && e.target.closest('.un-magnet');
        if (mag) {
          const r = mag.getBoundingClientRect();
          mag.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.2}px,${(e.clientY - r.top - r.height / 2) * 0.26}px)`;
        }
        const card = e.target.closest && e.target.closest('.un-card');
        if (card && !mag) {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
          card.style.transform = `perspective(900px) rotateY(${(px - 0.5) * 6}deg) rotateX(${(0.5 - py) * 5}deg)`;
          card.style.setProperty('--gx', px * 100 + '%');
          card.style.setProperty('--gy', py * 100 + '%');
        }
      };
      const onTiltOut = (e) => {
        const mag = e.target.closest && e.target.closest('.un-magnet');
        if (mag && !mag.contains(e.relatedTarget)) mag.style.transform = '';
        const card = e.target.closest && e.target.closest('.un-card');
        if (card && !card.contains(e.relatedTarget)) card.style.transform = '';
      };
      addEventListener('mouseover', onOver, { passive: true });
      addEventListener('mousemove', onTiltMove, { passive: true });
      addEventListener('mouseout', onTiltOut, { passive: true });
      cleanups.push(() => {
        cancelAnimationFrame(raf);
        removeEventListener('mousemove', onMove);
        removeEventListener('mouseover', onOver);
        removeEventListener('mousemove', onTiltMove);
        removeEventListener('mouseout', onTiltOut);
      });
    }

    /* ---------- Motion (motion.dev) press spring — progressive enhancement ---------- */
    let disposed = false;
    if (!reduced) {
      import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/motion@11/+esm')
        .then(({ animate, press }) => {
          if (disposed || !press) return;
          const onDown = (e) => {
            const b = e.target.closest('.un-btn,.un-chip');
            if (b) animate(b, { scale: 0.95 }, { duration: 0.12 }).finished
              .then(() => animate(b, { scale: 1 }, { type: 'spring', stiffness: 460, damping: 15 }));
          };
          document.body.addEventListener('pointerdown', onDown);
          cleanups.push(() => document.body.removeEventListener('pointerdown', onDown));
        })
        .catch(() => {});
    }

    return () => { disposed = true; cleanups.forEach((fn) => fn()); };
  }, []);

  return (
    <>
      <div ref={grainRef} className="un-grain" aria-hidden="true" />
      <div ref={curRef} className="un-cursor" aria-hidden="true" />
      <div ref={ringRef} className="un-cursor-ring" aria-hidden="true" />
    </>
  );
};

export default MotionLayer;
