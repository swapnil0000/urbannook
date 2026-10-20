import { useEffect, useRef } from 'react';

/**
 * URBAN NOOK — editorial "2040" motion layer.
 * Mounted once at app level. Adds film grain, and wires
 * up (via event delegation, so it survives route changes / re-renders):
 *   - magnetic pull on `.un-magnet`
 *   - 3D tilt + glare on `.un-card`
 *   - scroll reveals on `.un-reveal`  (IntersectionObserver + MutationObserver)
 *   - spring-like press on `.un-btn` via the Web Animations API, progressive enhancement
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

    /* ---------- press "spring" on .un-btn / .un-chip ----------
       The browser's own Web Animations API on the `scale` property (so it never fights the
       element's transform): a quick press, then an overshooting ease back. It used to be
       Motion's vanilla animate(), which pulled a second copy of Motion's engine into the
       main bundle for this one effect. */
    if (!reduced && typeof Element !== 'undefined' && Element.prototype.animate) {
      const onDown = (e) => {
        const b = e.target.closest && e.target.closest('.un-btn,.un-chip');
        if (!b) return;
        b.animate([{ scale: '1' }, { scale: '0.95' }], { duration: 120, easing: 'ease-out' }).finished
          .then(() => b.animate([{ scale: '0.95' }, { scale: '1' }], { duration: 380, easing: 'cubic-bezier(.34,1.56,.64,1)' }))
          .catch(() => {});
      };
      document.body.addEventListener('pointerdown', onDown);
      cleanups.push(() => document.body.removeEventListener('pointerdown', onDown));
    }

    return () => { cleanups.forEach((fn) => fn()); };
  }, []);

  return <div ref={grainRef} className="un-grain" aria-hidden="true" />;
};

export default MotionLayer;
