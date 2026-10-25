import { useGiftClaims } from '../../hooks/useGiftClaims';

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

const GiftThumb = ({ image, size = 'h-14 w-14' }) => (
  <span className={`grid ${size} shrink-0 place-items-center overflow-hidden border border-star/50 bg-white`}>
    {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <i className="fa-solid fa-gift text-xl text-brand" aria-hidden="true" />}
  </span>
);

/**
 * Free gifts in the cart. Two states, both straight from the server's evaluation of the cart:
 *  - CLAIMABLE: a premium offer card with a "Claim Free Gift" button (nothing is ever added automatically);
 *  - CLAIMED: shown as a cart line — original price crossed out, ₹0 payable, FREE GIFT badge, Remove.
 * Paid products are separate cart items and are never touched by any of this.
 *
 * @param {boolean} [readOnly] checkout summary: show claimed gifts only, no actions
 */
const GiftClaimList = ({ className = '', readOnly = false }) => {
  const { claimable, claimed, claim, unclaim } = useGiftClaims();
  if (!claimed.length && (readOnly || !claimable.length)) return null;

  return (
    <div className={`space-y-2 ${className}`} aria-label="Free gifts">
      {claimed.map((g) => (
        <div key={g.key} className="flex items-center gap-3 border border-star/60 bg-gradient-to-r from-star/15 to-white p-2.5">
          <GiftThumb image={g.image} />
          <div className="min-w-0 flex-1">
            <span className="inline-block bg-brand px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white">Free gift</span>
            <p className="mt-0.5 truncate text-[13px] font-bold text-ink" title={g.name}>{g.name}</p>
            {g.image && g.variantName && <p className="truncate text-[11.5px] text-muted">{g.variantName}</p>}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] tabular-nums text-faint line-through">{inr(g.originalPrice * g.claimedQuantity)}</p>
            <p className="text-[15px] font-extrabold tabular-nums text-save">₹0</p>
            {!readOnly && <button type="button" onClick={() => unclaim(g)} className="mt-0.5 text-[11px] text-muted underline underline-offset-2 hover:text-brand">Remove</button>}
          </div>
        </div>
      ))}

      {!readOnly && claimable.map((g) => (
        <div key={g.key} className="relative overflow-hidden border border-star/70 bg-gradient-to-br from-white via-white to-star/20 p-3 shadow-[0_10px_24px_-16px_rgb(var(--gl-star))]">
          <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand via-star to-brand" aria-hidden="true" />
          <p className="gl-lbl text-[9.5px] text-brand" style={{ letterSpacing: '0.2em' }}>✦ You unlocked a free gift</p>
          <div className="mt-2 flex items-center gap-3">
            <GiftThumb image={g.image} size="h-16 w-16" />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[14px] font-bold leading-tight text-ink">{g.name}</p>
              {g.image && g.variantName && <p className="truncate text-[11.5px] text-muted">{g.variantName}</p>}
              <p className="mt-1 flex items-baseline gap-2">
                <span className="text-[12px] tabular-nums text-faint line-through">{inr(g.originalPrice * g.quantity)}</span>
                <span className="text-[16px] font-extrabold text-save">FREE</span>
              </p>
            </div>
          </div>
          {g.promotionName && <p className="mt-2 text-[11px] leading-snug text-muted">Offer: {g.promotionName}</p>}
          <button
            type="button"
            onClick={() => claim(g)}
            disabled={!g.available}
            className="mt-2.5 flex h-10 w-full items-center justify-center bg-ink text-[13px] font-semibold text-paper transition-colors hover:bg-brand disabled:cursor-not-allowed disabled:opacity-50"
          >
            {g.available ? 'Claim Free Gift' : 'Currently out of stock'}
          </button>
        </div>
      ))}
    </div>
  );
};

export default GiftClaimList;
