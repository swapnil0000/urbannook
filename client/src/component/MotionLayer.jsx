import { useEffect, useRef } from 'react';

/**
 * URBAN NOOK — editorial "2040" motion layer.
 * Mounted once at app level. Adds film grain, and wires
 * up (via event delegation, so it survives route changes / re-renders):
 *   - magnetic pull on `.un-magnet`
 *   - 3D tilt + glare on `.un-card`
 *   - scroll reveals on `.un-reveal`  (IntersectionObserver + MutationObserver)
 *   - spring press on `.un-btn` / `.un-chip` (Web Animations API, no library)
 * Everything is disabled for touch devices / prefers-reduced-motion.
 *
 * Kept cheap on purpose (INP): DOM changes and mouse moves are batched to at
 * most one pass per animation frame, however many carousels, toasts, images or
 * videos the page adds. Doesn't import `motion`, so the library stays out of
 * the main bundle and only loads with the pages that use it.
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
      const seen = new WeakSet();
      const observeAll = () => {
        document.querySelectorAll('.un-reveal:not(.in)').forEach((el) => {
          if (!seen.has(el)) { seen.add(el); io.observe(el); }
        });
      };
      observeAll();
      // Elements added later (route change, lazy sections): one scan per frame
      // instead of one per added node.
      let raf = 0;
      const mo = new MutationObserver(() => {
        if (!raf) raf = requestAnimationFrame(() => { raf = 0; observeAll(); });
      });
      mo.observe(document.body, { childList: true, subtree: true });
      cleanups.push(() => { io.disconnect(); mo.disconnect(); cancelAnimationFrame(raf); });
    } else {
      document.querySelectorAll('.un-reveal').forEach((el) => el.classList.add('in'));
    }

    /* ---------- 3D tilt + magnet (pointer devices only) ---------- */
    if (!coarse && !reduced) {
      // mousemove fires faster than the screen refreshes; read layout and write
      // styles once per frame, for the latest position only.
      let lastMove = null;
      let raf = 0;
      const applyTilt = () => {
        raf = 0;
        const e = lastMove;
        if (!e) return;
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
      const onTiltMove = (e) => {
        lastMove = e;
        if (!raf) raf = requestAnimationFrame(applyTilt);
      };
      const onTiltOut = (e) => {
        const mag = e.target.closest && e.target.closest('.un-magnet');
        if (mag && !mag.contains(e.relatedTarget)) { lastMove = null; mag.style.transform = ''; }
        const card = e.target.closest && e.target.closest('.un-card');
        if (card && !card.contains(e.relatedTarget)) { lastMove = null; card.style.transform = ''; }
      };
      addEventListener('mousemove', onTiltMove, { passive: true });
      addEventListener('mouseout', onTiltOut, { passive: true });
      cleanups.push(() => {
        removeEventListener('mousemove', onTiltMove);
        removeEventListener('mouseout', onTiltOut);
        cancelAnimationFrame(raf);
      });
    }

    /* ---------- press spring on .un-btn / .un-chip ---------- */
    // Animates the CSS `scale` property, so it never overwrites the inline
    // `transform` the magnet effect sets on the same button.
    if (!reduced) {
      const onDown = (e) => {
        const b = e.target.closest && e.target.closest('.un-btn,.un-chip');
        if (!b || !b.animate) return;
        b.animate([{ scale: '1' }, { scale: '0.95' }], { duration: 120, easing: 'ease-out' }).finished
          .then(() => b.animate([{ scale: '0.95' }, { scale: '1' }], { duration: 380, easing: 'cubic-bezier(.34,1.8,.64,1)' }))
          .catch(() => {});
      };
      document.body.addEventListener('pointerdown', onDown, { passive: true });
      cleanups.push(() => document.body.removeEventListener('pointerdown', onDown));
    }

    return () => { cleanups.forEach((fn) => fn()); };
  }, []);

  return <div ref={grainRef} className="un-grain" aria-hidden="true" />;
};

export default MotionLayer;
