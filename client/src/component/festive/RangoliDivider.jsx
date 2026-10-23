import { useSiteCampaign } from '../../hooks/useSiteCampaign';

/** A rangoli-style mandala: petal ring, inner ring, dot border. */
const Mandala = ({ size = 56 }) => {
  const petals = Array.from({ length: 12 }, (_, i) => i * 30);
  const dots = Array.from({ length: 24 }, (_, i) => i * 15);
  return (
    <svg viewBox="-30 -30 60 60" width={size} height={size} fill="none" aria-hidden="true">
      <g className="un-spin" style={{ transformOrigin: '0 0' }}>
        {dots.map((a) => (
          <circle key={a} cx={0} cy={-26} r="0.9" fill="rgb(var(--gl-star) / 0.85)" transform={`rotate(${a})`} />
        ))}
        {petals.map((a) => (
          <path key={a} d="M0 -9C4 -15 4 -21 0 -24C-4 -21 -4 -15 0 -9Z" transform={`rotate(${a})`}
            fill={a % 60 === 0 ? 'rgb(var(--gl-brand) / 0.8)' : 'rgb(var(--gl-star) / 0.22)'}
            stroke="rgb(var(--gl-star) / 0.9)" strokeWidth="0.6" />
        ))}
      </g>
      <circle r="6.5" fill="rgb(var(--gl-star) / 0.2)" stroke="rgb(var(--gl-star))" strokeWidth="0.8" />
      <circle r="2.4" fill="rgb(var(--gl-star))" />
    </svg>
  );
};

/**
 * Rangoli motif straddling a section boundary: a zero-height anchor with the
 * artwork absolutely centered on the seam and flanked by fine dotted rules —
 * it overlays the boundary's padding instead of adding height, so appearing
 * or disappearing with the campaign never shifts the layout. Heavy-gated
 * (off on phones unless the admin allows mobile effects).
 */
const RangoliDivider = ({ className = '' }) => {
  const { can } = useSiteCampaign();
  if (!can('rangoli', { heavy: true })) return null;
  return (
    <div className={`relative h-0 z-20 pointer-events-none select-none ${className}`} aria-hidden="true">
      <div className="absolute left-0 right-0 top-0 -translate-y-1/2 flex items-center justify-center gap-3 px-6">
        <span className="hidden sm:block flex-1 max-w-[260px] h-px bg-[repeating-linear-gradient(90deg,rgb(var(--gl-star)/0.7)_0_3px,transparent_3px_9px)]" />
        <span className="shrink-0 rounded-full bg-ink/90 p-0.5 ring-1 ring-star/50 shadow-[0_0_18px_rgb(var(--gl-star)/0.25)]"><Mandala /></span>
        <span className="hidden sm:block flex-1 max-w-[260px] h-px bg-[repeating-linear-gradient(90deg,rgb(var(--gl-star)/0.7)_0_3px,transparent_3px_9px)]" />
      </div>
    </div>
  );
};

export default RangoliDivider;
