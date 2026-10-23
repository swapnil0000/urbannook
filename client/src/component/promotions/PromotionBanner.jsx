const inr = (amount) => `₹${Math.round(Number(amount) || 0).toLocaleString('en-IN')}`;

// Compact applied-offer receipt used in the cart and checkout. The amount is
// supplied by the API's promotion price preview, never recalculated here.
const PromotionBanner = ({ promo, savings = 0 }) => (
  <div className="flex min-w-0 items-center gap-3 rounded-xl border border-save/25 bg-save/5 px-3 py-2.5 text-ink">
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-save/10 text-save" aria-hidden="true">
      <i className="fa-solid fa-check text-xs" />
    </span>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-save">Offer applied</p>
      <p className="truncate text-xs font-bold" title={promo.title}>{promo.title}</p>
      {promo.subtitle && <p className="truncate text-[11px] text-muted">{promo.subtitle}</p>}
    </div>
    {savings > 0 && <span className="shrink-0 rounded-full bg-paper px-2.5 py-1 text-xs font-extrabold tabular-nums text-save">Save {inr(savings)}</span>}
  </div>
);

export default PromotionBanner;
