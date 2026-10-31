import { useEffect, useMemo, useRef, useState } from 'react';
import { useCartPromotions } from '../../hooks/useCartPromotions';

const INTENSITY = { low: 5, medium: 9, high: 15 };
const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

// "Dual Layer Katana Stand — FREE" -> "Free Dual Layer Katana Stand"
const rewardName = (label) => {
  const text = String(label || '').trim();
  if (!text) return 'your reward';
  const m = text.match(/^(.*?)\s*[—-]\s*free\s*$/i);
  return m ? `Free ${m[1]}` : text;
};
const plural = (noun, n) => (n === 1 ? noun : `${noun}s`);

// Deterministic falling embers (they drift outward and drop with gravity).
const emberVectors = (count) => Array.from({ length: count }, (_, i) => {
  const dir = i % 2 ? 1 : -1;
  return { dx: dir * (6 + ((i * 5) % 17)), dy: 8 + ((i * 7) % 18), delay: (i % 6) * 0.16, size: 1.4 + (i % 3) * 0.6, hue: ['#ffe08a', '#ffb02e', '#ff7a1a'][i % 3] };
});

// Spark rays of the burning tip: alternating long and short spikes.
const RAYS = Array.from({ length: 16 }, (_, i) => ({ a: i * 22.5 + (i % 2 ? 6 : 0), len: i % 2 ? 11 : 21 + (i % 4) * 1.5 }));

/** Starburst that plays once when the offer unlocks. */
const Burst = () => (
  <svg viewBox="-30 -30 60 60" className="un-phj-burst pointer-events-none absolute right-0 top-1/2 h-16 w-16" fill="none" aria-hidden="true">
    {Array.from({ length: 14 }, (_, i) => (
      <g key={i} transform={`rotate(${i * (360 / 14)})`}>
        <line x1="0" y1="-8" x2="0" y2={i % 2 ? -17 : -26} stroke={i % 3 ? '#ffb02e' : '#ff7a1a'} strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="0" cy={i % 2 ? -21 : -29} r="1.3" fill="#ffe08a" />
      </g>
    ))}
    <circle r="3" fill="#fff3b0" />
  </svg>
);

/**
 * Diwali sparkler (phuljadi) progress for ONE admin-picked promotion. The
 * numbers come from the promotion engine (`progress` on the display entry of
 * POST /promotions/display/cart): an amount offer fills continuously, a
 * quantity offer is marked in one band per required item, and an offer with
 * several conditions gets one band per condition. The rod burns from the left
 * (glowing, white-hot tip throwing star sparks); the unburnt rest stays a
 * dull silver coating; the bare wire handle is on the right. Unlocked only
 * when the engine says the offer applies. No box around it — it sits on the
 * surface it is placed on, so it reads on the light cart/product surfaces.
 */
const Phuljadi = ({ promotionId, intensity = 'medium', className = '', fallback = null, tone = 'light' }) => {
  const { promotions, isFetching } = useCartPromotions('cart', null, null, true, [promotionId]);
  const fresh = promotions.find((p) => p.id === promotionId);
  // While the cart change is being re-priced RTK has no data for the new args yet;
  // keep showing the last real result instead of blanking (keeps the sparks and
  // width transitions alive and never flashes the old bar).
  const lastEntry = useRef(null);
  if (fresh?.progress) lastEntry.current = fresh;
  const entry = fresh?.progress ? fresh : (isFetching ? lastEntry.current : null);
  const progress = entry?.progress;
  const complete = Boolean(progress?.complete);

  // celebrate only on a real incomplete -> complete change while mounted
  const prevComplete = useRef(null);
  const [burst, setBurst] = useState(false);
  useEffect(() => {
    if (!progress) return undefined;
    const was = prevComplete.current;
    prevComplete.current = complete;
    if (was === false && complete) {
      setBurst(true);
      const t = setTimeout(() => setBurst(false), 1500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [complete, progress]);

  const embers = useMemo(() => emberVectors(INTENSITY[intensity] || INTENSITY.medium), [intensity]);

  // not loaded yet: reserve the space; promotion gone / not trackable: the normal bar
  if (!progress) return isFetching ? <div className={`h-[78px] ${className}`} aria-hidden="true" /> : fallback;

  const frac = Math.min(Math.max(progress.fraction, 0), 1);
  const single = progress.steps.length === 1 ? progress.steps[0] : null;
  const name = rewardName(entry.rewardLabel);
  // band boundaries: one per required item (quantity) or per condition (multi)
  const bands = progress.mode === 'multi' ? progress.steps.length : progress.segments;
  const burning = frac > 0 && (!complete || burst);

  let message;
  if (complete) message = `${name} Unlocked!`;
  else if (progress.blocked) message = 'Almost there — adjust your cart to match the offer.';
  else if (single?.kind === 'amount') message = `Add ${inr(single.need - single.have)} more to unlock ${name}`;
  else if (single) {
    const rem = single.need - single.have;
    const noun = progress.noun || 'item';
    message = `${single.have} of ${single.need} ${plural(noun, single.need)} Added — Add ${rem} more to unlock ${name}!`;
  } else message = `${progress.current} of ${progress.target} steps done — ${entry.progressText || `keep going to unlock ${name}`}`;

  // rod geometry: 100% of the rod = the coated part; the bare handle sits after it
  const HANDLE = 16; // px
  return (
    <div className={`relative ${burst ? 'un-phj-pop' : ''} ${className}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(frac * 100)} aria-label={message}>
      <p className={`text-[12.5px] leading-snug ${complete ? (tone === 'dark' ? 'font-bold text-star' : 'font-bold text-brand') : (tone === 'dark' ? 'font-medium text-paper/90' : 'font-medium text-ink')}`}>
        {complete && <span aria-hidden="true">✦ </span>}{message}
      </p>

      <div className="relative mt-2 h-10 overflow-visible">
        {/* unburnt rod: dull silver coating, with the bare wire handle on the right */}
        <div className="absolute inset-y-0 left-0 flex items-center" style={{ right: HANDLE }}>
          <div className="relative h-[6px] w-full" style={{ background: 'linear-gradient(180deg,#d4d4d4 0%,#8d8d8d 55%,#6b6b6b 100%)', boxShadow: 'inset 0 -1px 0 rgb(0 0 0/.25)' }}>
            <span className="absolute inset-0 opacity-50" style={{ backgroundImage: 'radial-gradient(circle at 20% 40%,#555 0 0.8px,transparent 1px),radial-gradient(circle at 70% 60%,#444 0 0.8px,transparent 1px)', backgroundSize: '9px 6px' }} />
            {/* the burning (completed) part: glowing, white-hot toward the tip */}
            <div
              className="absolute inset-y-0 left-0 transition-[width] duration-700 ease-out"
              style={{
                width: `${frac * 100}%`,
                background: 'linear-gradient(90deg,#c2410c 0%,#ff7a1a 35%,#ffb02e 75%,#fff3b0 100%)',
                boxShadow: '0 0 6px 1px rgba(255,140,30,.9), 0 0 16px 3px rgba(255,170,50,.55)',
              }}
            />
            {/* a tick for every required item / condition */}
            {bands > 1 && Array.from({ length: bands - 1 }, (_, i) => (
              <span key={i} className="absolute -top-[3px] h-[12px] w-px bg-ink/55" style={{ left: `${((i + 1) / bands) * 100}%` }} aria-hidden="true" />
            ))}
          </div>
        </div>
        <span className="absolute right-0 top-1/2 h-px -translate-y-1/2 bg-[#6b6b6b]" style={{ width: HANDLE + 2 }} aria-hidden="true" />

        {/* burning tip: white-hot core, star rays, falling embers */}
        {frac > 0 && (
          <span className="pointer-events-none absolute top-1/2" style={{ left: `calc((100% - ${HANDLE}px) * ${frac})`, transform: 'translate(-50%,-50%)', transition: 'left .7s ease-out' }} aria-hidden="true">
            <svg viewBox="-26 -26 52 52" className={`${burning ? 'un-phj-star' : ''} block h-[52px] w-[52px] overflow-visible`} style={{ opacity: complete && !burst ? 0.9 : 1 }}>
              <circle r="9" fill="rgba(255,150,40,.35)" />
              {RAYS.map((r, i) => (
                <line key={i} x1="0" y1="-3" x2="0" y2={-r.len} transform={`rotate(${r.a})`} stroke={i % 3 === 0 ? '#fff3b0' : i % 3 === 1 ? '#ffb02e' : '#ff7a1a'} strokeWidth={i % 2 ? 1 : 1.6} strokeLinecap="round" />
              ))}
              <circle r="3.6" fill="#fff" />
            </svg>
            {burning && embers.map((e, i) => (
              <i key={i} className="un-phj-p absolute left-1/2 top-1/2 block rounded-full" style={{ width: e.size, height: e.size, background: e.hue, boxShadow: `0 0 4px ${e.hue}`, '--dx': `${e.dx}px`, '--dy': `${e.dy}px`, animationDelay: `${e.delay}s` }} />
            ))}
          </span>
        )}
        {burst && <Burst />}
      </div>
    </div>
  );
};

export default Phuljadi;
