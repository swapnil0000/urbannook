// Shared compact reward receipt for checkout savings and free shipping.
// Uses the same brand tokens as the cart's applied-offer summary.
export const UnderlineAmount = ({ children }) => (
  <strong className="font-black tabular-nums text-save">{children}</strong>
);

const SealBadgeCard = ({ eyebrowIcon, eyebrowText, children }) => (
  <div className="flex min-w-0 items-center gap-3 rounded-xl border border-save/25 bg-save/5 px-3.5 py-3 text-ink">
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-save/10 text-save" aria-hidden="true">
      <i className={`fa-solid ${eyebrowIcon || 'fa-tag'} text-sm`} />
    </span>
    <div className="min-w-0 flex-1">
      {eyebrowText && <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-save">{eyebrowText}</p>}
      <p className="flex flex-wrap items-baseline gap-x-1 text-sm font-semibold leading-snug">{children}</p>
    </div>
  </div>
);

export default SealBadgeCard;
