import { useEffect, useRef } from 'react';
import { animate } from 'motion';

/**
 * URBAN NOOK — editorial "2040" motion layer.
 * Mounted once at app level. Adds film grain, and wires
 * up (via event delegation, so it survives route changes / re-renders):
 *   - magnetic pull on `.un-magnet`
 *   - 3D tilt + glare on `.un-card`
 *   - scroll reveals on `.un-reveal`  (IntersectionObserver + MutationObserver)
 *   - spring press on `.un-btn` via Motion (motion.dev), progressive enhancement
 * Everything is disabled for touch devices / prefers-reduced-motion.
 */
const MotionLayer = () => {
  const grainRef = useRef(null);

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

    /* ---------- 3D tilt + magnet (pointer devices only) ---------- */
    if (!coarse && !reduced) {
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
      addEventListener('mousemove', onTiltMove, { passive: true });
      addEventListener('mouseout', onTiltOut, { passive: true });
      cleanups.push(() => {
        removeEventListener('mousemove', onTiltMove);
        removeEventListener('mouseout', onTiltOut);
      });
    }

    /* ---------- press spring on .un-btn / .un-chip (Motion, bundled locally) ---------- */
    if (!reduced) {
      const onDown = (e) => {
        const b = e.target.closest && e.target.closest('.un-btn,.un-chip');
        if (b) animate(b, { scale: 0.95 }, { duration: 0.12 }).finished
          .then(() => animate(b, { scale: 1 }, { type: 'spring', stiffness: 460, damping: 15 }));
      };
      document.body.addEventListener('pointerdown', onDown);
      cleanups.push(() => document.body.removeEventListener('pointerdown', onDown));
    }

    return () => { cleanups.forEach((fn) => fn()); };
  }, []);

  return <div ref={grainRef} className="un-grain" aria-hidden="true" />;
};

export default MotionLayer;
