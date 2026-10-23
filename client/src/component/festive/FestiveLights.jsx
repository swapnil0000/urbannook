import { useSiteCampaign } from '../../hooks/useSiteCampaign';

const SAG = 12;    // px a string sags between two anchor points
const HEIGHT = 22; // px, fixed — the layer is absolutely positioned, so it adds no layout height

/**
 * One drooping string of warm lights: a hairline wire (SVG, stretched with
 * non-scaling stroke) plus bulbs placed along each arc. Bulb y follows the
 * quadratic curve the wire is drawn with: y = 4·SAG·t·(1−t).
 */
/**
 * `tone`: "onDark" (default) = golden lights for dark backgrounds; "onLight" =
 * ink wire + brand-red/gold bulbs with a dark ring so they stay visible on the
 * light (paper/surface) panels.
 */
export const Garland = ({ arcs, className = '', tone = 'onDark' }) => {
  const total = arcs * 100;
  let d = '';
  const bulbs = [];
  for (let k = 0; k < arcs; k += 1) {
    d += `M${k * 100} 0Q${k * 100 + 50} ${SAG * 2} ${(k + 1) * 100} 0`;
    [0.25, 0.5, 0.75].forEach((t, j) => {
      bulbs.push({
        left: ((k * 100 + t * 100) / total) * 100,
        top: 4 * SAG * t * (1 - t),
        delay: ((k * 3 + j) % 7) * 0.4,
        dim: (k + j) % 2 === 1,
      });
    });
  }
  return (
    <div className={`relative w-full ${className}`} style={{ height: HEIGHT }}>
      <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${total} ${HEIGHT}`} preserveAspectRatio="none" fill="none" aria-hidden="true">
        <path d={d} stroke={tone === 'onLight' ? 'rgb(var(--gl-ink) / 0.55)' : 'rgb(var(--gl-star) / 0.45)'} strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      {bulbs.map((b, i) => (
        <span
          key={i}
          className="un-bulb absolute block w-[5px] h-[5px] sm:w-1.5 sm:h-1.5 rounded-full -translate-x-1/2"
          style={{
            left: `${b.left}%`,
            top: b.top + 1,
            animationDelay: `${b.delay}s`,
            ...(tone === 'onLight'
              ? {
                  background: b.dim ? 'rgb(var(--gl-brand))' : 'rgb(var(--gl-star))',
                  boxShadow: '0 0 0 1px rgb(var(--gl-ink) / 0.55), 0 0 7px 1px rgb(var(--gl-brand) / 0.45)',
                }
              : {
                  background: b.dim ? 'rgb(var(--gl-star) / 0.8)' : 'rgb(var(--gl-star))',
                  boxShadow: '0 0 6px 1px rgb(var(--gl-star) / 0.55)',
                }),
          }}
        />
      ))}
    </div>
  );
};

export const Diya = ({ className = '', tone = 'onDark' }) => {
  const light = tone === 'onLight';
  return (
    <svg viewBox="0 0 24 20" width="22" height="18" className={className} aria-hidden="true">
      <path
        className="un-flame"
        d="M12 1c2.2 2.6 3.2 4.4 3.2 6.2A3.2 3.2 0 0 1 12 10.4 3.2 3.2 0 0 1 8.8 7.2C8.8 5.4 9.8 3.6 12 1Z"
        fill="rgb(var(--gl-star))"
        stroke={light ? 'rgb(var(--gl-ink) / 0.7)' : undefined}
        strokeWidth={light ? 0.7 : undefined}
        style={{ transformOrigin: '12px 10px', filter: `drop-shadow(0 0 ${light ? 3 : 4}px ${light ? 'rgb(var(--gl-brand) / 0.7)' : 'rgb(var(--gl-star) / 0.8)'})` }}
      />
      <path
        d="M2 11h20c0 4.4-4.5 8-10 8S2 15.4 2 11Z"
        fill={light ? 'rgb(var(--gl-brand))' : 'rgb(var(--gl-star) / 0.9)'}
        stroke={light ? 'rgb(var(--gl-ink) / 0.7)' : undefined}
        strokeWidth={light ? 0.8 : undefined}
      />
      <path d="M2 11h20" stroke={light ? 'rgb(var(--gl-star))' : 'rgb(var(--gl-brand))'} strokeWidth="1" />
    </svg>
  );
};

/**
 * A diya hanging from a fine string, swaying gently. Used sparingly (a couple
 * of spots) instead of diyas standing everywhere.
 */
export const HangingDiya = ({ tone = 'onDark', length = 14, className = '', style }) => (
  <div className={`un-sway absolute ${className}`} style={{ transformOrigin: 'top center', ...style }} aria-hidden="true">
    <span
      className="mx-auto block w-px"
      style={{ height: length, background: tone === 'onLight' ? 'rgb(var(--gl-ink) / 0.55)' : 'rgb(var(--gl-star) / 0.65)' }}
    />
    <Diya tone={tone} />
  </div>
);

/**
 * A corner toran: a gold string with marigold-and-leaf pendants that sway
 * gently. 160×34 viewBox, ≤34px tall so it clears the hero's first line.
 */
export const Toran = ({ className = '', mirror = false, tone = 'onDark' }) => {
  const light = tone === 'onLight';
  const pendants = [0.12, 0.31, 0.5, 0.69, 0.88].map((t, i) => {
    const x = 160 * t;
    const y = 2 + 20 * t * (1 - t);
    return { x, y, len: 3 + (i % 2 ? 5 : 2), leaf: i % 2 === 0, delay: i * 0.45 };
  });
  return (
    <svg viewBox="0 0 160 34" className={className} style={mirror ? { transform: 'scaleX(-1)' } : undefined} fill="none" aria-hidden="true">
      <path d="M0 2Q80 22 160 2" stroke={light ? 'rgb(var(--gl-ink) / 0.6)' : 'rgb(var(--gl-star) / 0.7)'} strokeWidth="1.2" />
      {pendants.map((p, i) => (
        <g key={i} className="un-sway" style={{ transformOrigin: `${p.x}px ${p.y}px`, animationDelay: `${p.delay}s` }}>
          <line x1={p.x} y1={p.y} x2={p.x} y2={p.y + p.len} stroke={light ? 'rgb(var(--gl-ink) / 0.55)' : 'rgb(var(--gl-star) / 0.6)'} strokeWidth="0.8" />
          {p.leaf ? (
            <path d={`M${p.x} ${p.y + p.len}c-3.2 1.4-3.6 5-0 7.6 3.6-2.6 3.2-6.2 0-7.6Z`} fill="rgb(var(--gl-brand))" stroke={light ? 'rgb(var(--gl-ink) / 0.7)' : 'rgb(var(--gl-star) / 0.8)'} strokeWidth="0.7" />
          ) : (
            <g>
              <circle cx={p.x} cy={p.y + p.len + 3} r="3.4" fill="rgb(var(--gl-star))" stroke={light ? 'rgb(var(--gl-ink) / 0.7)' : undefined} strokeWidth={light ? 0.8 : undefined} style={{ filter: light ? 'drop-shadow(0 0 2px rgb(var(--gl-brand) / 0.6))' : 'drop-shadow(0 0 3px rgb(var(--gl-star) / 0.7))' }} />
              <circle cx={p.x} cy={p.y + p.len + 3} r="1.3" fill="rgb(var(--gl-brand))" />
            </g>
          )}
        </g>
      ))}
    </svg>
  );
};

/**
 * Festive framing under the header — lights, torans, diyas, gold hairline,
 *
 *
 * Everything here is gated by useSiteCampaign().can(...): the campaign is live
 * (server-decided), the admin enabled that specific element and this page
 * type, and — on phones — the mobile switches allow it. Zero layout height (a
 * 0-high anchor with an absolutely positioned, pointer-events:none overlay),
 * clipped to the viewport so it can't cause horizontal overflow; animation
 * stops under prefers-reduced-motion (see index.css).
 */
const FestiveLights = () => {
  const { can, page } = useSiteCampaign();
  // The home page's hero is dark (golden lights read well); every other page
  // is light, where gold washes out — so those get the dark-toned variants.
  const tone = page === 'home' ? 'onDark' : 'onLight';

  const lights = can('lights');
  const diyas = can('diyas');
  const torans = can('torans');
  const accent = can('headerAccent');

  if (!lights && !diyas && !torans && !accent) return null;

  return (
    <div className="relative h-0 z-40 pointer-events-none select-none" aria-hidden="true">
      <div className="absolute top-0 inset-x-0 overflow-hidden" style={{ height: 44 }}>
        {accent && <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent ${tone === 'onLight' ? 'via-ink/40' : 'via-star/60'} to-transparent`} />}
        {/* Torans first so the light string paints on top of them. */}
        {torans && (
          <>
            <Toran tone={tone} className="absolute left-0 top-0 z-0 w-[76px] sm:w-[120px]" />
            <Toran tone={tone} className="absolute right-0 top-0 z-0 w-[76px] sm:w-[120px]" mirror />
          </>
        )}
        {lights && (
          <>
            <Garland arcs={8} tone={tone} className="relative z-10 hidden sm:block" />
            <Garland arcs={4} tone={tone} className="relative z-10 sm:hidden" />
          </>
        )}
        {diyas && (
          <>
            <HangingDiya tone={tone} className="hidden sm:block left-[27%] top-[9px] z-20" />
            <HangingDiya tone={tone} className="hidden sm:block right-[27%] top-[9px] z-20" />
            <HangingDiya tone={tone} className="sm:hidden left-[14%] top-[9px] z-20" length={20} />
            <HangingDiya tone={tone} className="sm:hidden right-[14%] top-[9px] z-20" length={20} />
          </>
        )}
      </div>

    </div>
  );
};

export default FestiveLights;
