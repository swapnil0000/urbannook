import { useEffect, useState } from 'react';
import { useSiteCampaign } from '../../hooks/useSiteCampaign';

const pad = (n) => String(n).padStart(2, '0');

// Time left until the campaign's configured end, on the SERVER's clock
// (the provider's skew-corrected nowMs). Ticks every 30s, every second only
// in the final hour — no needless re-renders.
export function useCountdown() {
  const { endsAtMs, nowMs, isPreview } = useSiteCampaign();
  const [, force] = useState(0);
  const left = endsAtMs ? Math.max(0, endsAtMs - nowMs()) : 0;

  useEffect(() => {
    if (!endsAtMs || left <= 0) return undefined;
    const t = setInterval(() => force((n) => n + 1), left < 3600e3 ? 1000 : 30000);
    return () => clearInterval(t);
  }, [endsAtMs, left <= 0, left < 3600e3]); // eslint-disable-line react-hooks/exhaustive-deps

  const s = Math.floor(left / 1000);
  return {
    // A preview of a finished/not-yet-started campaign has nothing to count.
    visible: Boolean(endsAtMs) && left > 0 && (!isPreview || left > 0),
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
    final: left < 3600e3,
  };
}

/**
 * Tasteful "offers end in" chip. `tone="light"` for dark bands (gold on
 * ink), `tone="dark"` for light surfaces.
 */
const FestiveCountdown = ({ tone = 'light', compact = false, className = '' }) => {
  const { can, countdownLabel } = useSiteCampaign();
  const t = useCountdown();
  if (!can('countdown') || !t.visible) return null;

  const unit = (v, l) => (
    <span className="inline-flex items-baseline gap-0.5">
      <b className="tabular-nums font-extrabold">{pad(v)}</b>
      <span className="text-[9px] uppercase tracking-wider opacity-70">{l}</span>
    </span>
  );
  const palette = tone === 'light'
    ? 'border-star/50 text-star bg-black/25'
    : 'border-star/60 text-ink bg-star/15';

  return (
    <div
      className={`inline-flex items-center gap-2.5 rounded-full border ${compact ? 'px-2.5 py-0.5' : 'px-3 py-1.5'} text-[11px] ${palette} ${className}`}
      role="timer"
      aria-label={`${countdownLabel} ${t.d} days ${t.h} hours ${t.m} minutes`}
    >
      <span className={`gl-lbl text-[9px] tracking-[0.14em] opacity-90 ${compact ? 'hidden sm:inline' : ''}`}>{countdownLabel}</span>
      <span className="inline-flex items-baseline gap-2">
        {t.d > 0 && unit(t.d, 'd')}
        {unit(t.h, 'h')}
        {unit(t.m, 'm')}
        {t.final && unit(t.s, 's')}
      </span>
    </div>
  );
};

export default FestiveCountdown;
