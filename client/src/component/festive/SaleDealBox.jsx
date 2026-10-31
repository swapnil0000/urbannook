import { useSiteCampaign } from '../../hooks/useSiteCampaign';
import { useCountdown } from './FestiveCountdown';

const pad = (n) => String(n).padStart(2, '0');
const endLabel = (ms) => new Date(ms).toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
});

/**
 * Product-page sale box: the live campaign's countdown (server clock, admin
 * end time) as big DAYS / HRS / MIN / SEC tiles, above the product's offers.
 * The label is the admin's countdown label ("Diwali Sale ends in"); it never
 * claims a price change — the campaign end is the only date it knows.
 */
const SaleDealBox = ({ className = '' }) => {
  const { active, can, countdownLabel, endsAtMs } = useSiteCampaign();
  const t = useCountdown({ seconds: true });
  if (!active || !can('countdown') || !t.visible) return null;

  const tile = (v, l) => (
    <span className="flex w-[46px] flex-col items-center rounded-md border border-paper/15 bg-paper/10 py-1.5 sm:w-[52px]">
      <b className="font-archivo text-lg font-extrabold leading-none tabular-nums text-paper sm:text-xl">{pad(v)}</b>
      <span className="mt-1 text-[8.5px] font-bold uppercase tracking-wider text-paper/60">{l}</span>
    </span>
  );

  return (
    <section
      className={`relative overflow-hidden rounded-xl bg-ink p-3.5 text-paper sm:p-4 ${className}`}
      style={{ background: 'radial-gradient(90% 140% at 0% 0%, rgb(var(--gl-brand-hi) / 0.35), transparent 65%), rgb(var(--gl-ink))' }}
      aria-label={countdownLabel}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/20 px-2 py-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-brand motion-safe:animate-pulse" aria-hidden="true" />
          <span className="gl-lbl text-[9px] tracking-[0.16em] text-paper">Limited-time sale</span>
        </span>
        {endsAtMs && <span className="text-[11px] font-semibold text-paper/70">Ends {endLabel(endsAtMs)} IST</span>}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="gl-lbl text-[9.5px] tracking-[0.18em] text-paper/70">{countdownLabel}</p>
          <p className="mt-1 font-archivo text-[15px] font-bold leading-snug sm:text-base">Grab your festive offers</p>
        </div>
        <div className="flex shrink-0 items-center gap-1" role="timer" aria-label={`${t.d} days ${t.h} hours ${t.m} minutes left`}>
          {tile(t.d, 'Days')}{tile(t.h, 'Hrs')}{tile(t.m, 'Min')}{tile(t.s, 'Sec')}
        </div>
      </div>
    </section>
  );
};

export default SaleDealBox;
