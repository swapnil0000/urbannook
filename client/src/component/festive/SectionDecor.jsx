import { useSiteCampaign } from '../../hooks/useSiteCampaign';
import { Garland, Toran, HangingDiya } from './FestiveLights';

/** A quarter rangoli (fan of petals + dotted arcs) anchored on a corner. */
const CornerRangoli = ({ className = '', flip = false }) => {
  const petals = Array.from({ length: 7 }, (_, i) => -90 + i * 15); // fan across a quarter turn
  return (
    <svg viewBox="0 0 100 100" className={className} style={flip ? { transform: 'scaleX(-1)' } : undefined} fill="none" aria-hidden="true">
      {[96, 78, 60].map((r, i) => (
        <circle key={r} cx="0" cy="100" r={r} stroke="rgb(var(--gl-star) / 0.45)" strokeWidth="0.7" strokeDasharray={i === 1 ? '1.5 3.5' : undefined} />
      ))}
      {petals.map((a, i) => (
        <path
          key={a}
          d="M0 -14C4.5 -22 4.5 -32 0 -38C-4.5 -32 -4.5 -22 0 -14Z"
          transform={`translate(0 100) rotate(${a + 7.5}) translate(0 -26)`}
          fill={i % 2 ? 'rgb(var(--gl-star) / 0.28)' : 'rgb(var(--gl-brand) / 0.7)'}
          stroke="rgb(var(--gl-star) / 0.85)"
          strokeWidth="0.6"
        />
      ))}
      <circle cx="0" cy="100" r="9" fill="rgb(var(--gl-star) / 0.25)" stroke="rgb(var(--gl-star))" strokeWidth="0.8" />
    </svg>
  );
};

/** A small firecracker starburst: rays + dots, pulsing. */
const CrackerBurst = ({ className = '', delay = 0 }) => (
  <svg viewBox="-20 -20 40 40" className={`un-burst ${className}`} style={{ animationDelay: `${delay}s` }} fill="none" aria-hidden="true">
    {Array.from({ length: 10 }, (_, i) => (
      <g key={i} transform={`rotate(${i * 36})`}>
        <line x1="0" y1="-6" x2="0" y2={i % 2 ? -13 : -17} stroke={i % 2 ? 'rgb(var(--gl-brand))' : 'rgb(var(--gl-star))'} strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="0" cy={i % 2 ? -17 : -19.5} r="1.2" fill="rgb(var(--gl-star))" />
      </g>
    ))}
    <circle r="2.2" fill="rgb(var(--gl-star))" />
  </svg>
);

/**
 * Festive framing for ONE section, placed only on its edges — a light string
 * along the top, torans in the top corners, a rangoli quarter-motif and a diya
 * in each bottom corner, firecracker starbursts.
 * It is an absolutely positioned, pointer-events:none layer BEHIND the
 * section's content (the content wrapper is `relative z-10`), so it can never
 * cover text, prices or buttons, and adds no layout height.
 *
 * Every element obeys the admin's per-element switches, the location/device
 * rules, and (for fireworks-class "heavy" effects) the mobile-effects switch.
 */
const SectionDecor = () => {
  const { can } = useSiteCampaign();
  const lights = can('lights');
  const torans = can('torans');
  const diyas = can('diyas');
  const rangoli = can('rangoli', { heavy: true });
  const sparkles = can('sparkles', { heavy: true });

  if (!lights && !torans && !diyas && !rangoli && !sparkles) return null;

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {torans && (
        <>
          <Toran className="absolute left-0 top-[10px] z-0 w-[68px] sm:w-[104px]" />
          <Toran className="absolute right-0 top-[10px] z-0 w-[68px] sm:w-[104px]" mirror />
        </>
      )}
      {lights && (
        <div className="absolute top-0 inset-x-0 z-10 h-[24px] overflow-hidden">
          <Garland arcs={8} className="hidden sm:block" />
          <Garland arcs={4} className="sm:hidden" />
        </div>
      )}
      {rangoli && (
        <>
          <CornerRangoli className="absolute left-0 bottom-0 w-[96px] sm:w-[150px]" />
          <CornerRangoli className="absolute right-0 bottom-0 w-[96px] sm:w-[150px]" flip />
        </>
      )}
      {diyas && (
        <>
          <HangingDiya className="left-[14%] sm:left-[24%] top-[14px] z-10" length={18} />
          <HangingDiya className="right-[14%] sm:right-[24%] top-[14px] z-10" length={18} />
        </>
      )}
      {sparkles && (
        <>
          <CrackerBurst className="absolute left-[4%] top-[17%] w-8 sm:w-11" />
          <CrackerBurst className="absolute right-[4%] top-[24%] w-7 sm:w-10" delay={1.1} />
          <CrackerBurst className="hidden sm:block absolute left-[9%] bottom-[16%] w-9" delay={0.6} />
          <CrackerBurst className="hidden sm:block absolute right-[9%] bottom-[20%] w-8" delay={1.7} />
        </>
      )}
    </div>
  );
};

export default SectionDecor;
