import { useMemo } from 'react';
import { useSiteCampaign } from '../../hooks/useSiteCampaign';

// Deterministic pseudo-random so the layout is stable between renders.
const rnd = (i, salt) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * A few slow, soft golden sparkles drifting upward — a hint of warm light, not
 * confetti. Fixed, pointer-events:none, only transform/opacity animated, and a
 * small fixed count (fewer on phones). Gated as a "heavy" effect: on phones it
 * needs the admin's mobile-effects switch. Hidden under reduced-motion (CSS).
 */
const FestiveSparkles = () => {
  const { can, isMobile } = useSiteCampaign();
  const count = isMobile ? 6 : 13;
  const sparks = useMemo(() => Array.from({ length: count }, (_, i) => ({
    left: 4 + rnd(i, 1) * 92,
    size: 3 + rnd(i, 2) * 4,
    dur: 14 + rnd(i, 3) * 12,
    delay: -rnd(i, 4) * 24,
    dx: (rnd(i, 5) - 0.5) * 60,
    amber: rnd(i, 6) > 0.6,
  })), [count]);

  if (!can('sparkles', { heavy: true })) return null;

  return (
    <div className="fixed inset-0 z-[35] overflow-hidden pointer-events-none" aria-hidden="true">
      {sparks.map((s, i) => (
        <i
          key={i}
          className="un-spark absolute block"
          style={{
            left: `${s.left}%`,
            bottom: '-12px',
            width: s.size,
            height: s.size,
            '--dx': `${s.dx}px`,
            animationDuration: `${s.dur}s`,
            animationDelay: `${s.delay}s`,
            background: s.amber ? 'rgb(var(--gl-star) / 0.7)' : 'rgb(var(--gl-star))',
            filter: `drop-shadow(0 0 ${s.size}px rgb(var(--gl-star) / 0.8))`,
          }}
        />
      ))}
    </div>
  );
};

export default FestiveSparkles;
