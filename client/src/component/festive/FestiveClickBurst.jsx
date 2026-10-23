import { useEffect } from 'react';
import { useSiteCampaign } from '../../hooks/useSiteCampaign';

const COLORS = ['var(--gl-star)', 'var(--gl-brand)', 'var(--gl-paper)'];
const TARGET = 'button, a[href], [role="button"]';

/**
 * A tiny firecracker pop where a visitor clicks a button or link. Particles live
 * in their own fixed, pointer-events:none layer and animate with transform/opacity
 * only, so nothing in the page layout moves. Gated like fireworks (admin switch,
 * location, mobile-effects) and skipped for reduced-motion.
 */
const FestiveClickBurst = () => {
  const { can } = useSiteCampaign();
  const on = can('fireworks', { heavy: true });

  useEffect(() => {
    if (!on || typeof window === 'undefined') return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    const layer = document.createElement('div');
    layer.setAttribute('aria-hidden', 'true');
    layer.style.cssText = 'position:fixed;inset:0;z-index:70;pointer-events:none;overflow:hidden';
    document.body.appendChild(layer);

    let last = 0;
    const pop = (e) => {
      if (!e.target?.closest?.(TARGET)) return;
      const now = Date.now();
      if (now - last < 250) return; // no stacking on rapid clicks
      last = now;
      const n = 10;
      for (let i = 0; i < n; i += 1) {
        const a = (Math.PI * 2 * i) / n + Math.random() * 0.5;
        const d = 22 + Math.random() * 22;
        const s = 3 + Math.random() * 3;
        const p = document.createElement('i');
        p.style.cssText = `position:absolute;left:${e.clientX}px;top:${e.clientY}px;width:${s}px;height:${s}px;margin:${-s / 2}px 0 0 ${-s / 2}px;border-radius:50%;background:rgb(${COLORS[i % 3]});box-shadow:0 0 6px rgb(var(--gl-star) / .8)`;
        layer.appendChild(p);
        const anim = p.animate(
          [
            { transform: 'translate(0,0) scale(1)', opacity: 1 },
            { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d + 8}px) scale(.2)`, opacity: 0 },
          ],
          { duration: 520 + Math.random() * 200, easing: 'cubic-bezier(.15,.7,.3,1)' },
        );
        anim.onfinish = () => p.remove();
      }
    };
    document.addEventListener('click', pop, true);
    return () => {
      document.removeEventListener('click', pop, true);
      layer.remove();
    };
  }, [on]);

  return null;
};

export default FestiveClickBurst;
