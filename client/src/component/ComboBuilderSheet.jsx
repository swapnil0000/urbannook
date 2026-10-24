import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { addItem } from '../store/slices/cartSlice';
import { useAddToCartMutation, useGetCartPromotionsQuery } from '../store/api/userApi';
import { useSiteCampaign } from '../hooks/useSiteCampaign';
import { trackAddToCart } from '../utils/analytics';
import { Garland, HangingDiya } from './festive/FestiveLights';

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const keyOf = (c) => `${c.productId}:${c.sku || ''}`;
const pctOff = (c) => (c.mrp != null && c.price != null && c.mrp > c.price ? Math.round(((c.mrp - c.price) / c.mrp) * 100) : 0);

const Check = () => (
  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
);

/** One compact variant tile: 1:1 thumb, variant-specific name, MRP + price + % off. */
const VariantTile = ({ card, selected, onPick }) => {
  const off = pctOff(card);
  const name = card.variantName || card.productName;
  return (
    <button
      type="button"
      onClick={() => !card.outOfStock && onPick(card)}
      disabled={card.outOfStock}
      aria-pressed={selected}
      title={name}
      className={`relative flex min-w-0 items-center gap-2 border bg-white p-1.5 text-left transition-colors ${selected ? 'border-ink shadow-[inset_0_0_0_1px_rgb(var(--gl-ink))]' : 'border-hair hover:border-ink/40'} ${card.outOfStock ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <span className="relative h-[52px] w-[52px] shrink-0 overflow-hidden bg-surface">
        {card.image && <img src={card.image} alt="" loading="lazy" className="h-full w-full object-cover" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-[11.5px] font-semibold leading-[1.25] text-ink">{name}</span>
        <span className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-[13px] font-bold tabular-nums text-ink">{inr(card.price)}</span>
          {off > 0 && <span className="text-[10.5px] tabular-nums text-faint line-through">{inr(card.mrp)}</span>}
          {off > 0 && <span className="text-[10.5px] font-bold text-save">{off}% off</span>}
        </span>
      </span>
      {card.outOfStock && <span className="absolute right-1 top-1 bg-ink px-1 py-px text-[9px] font-bold uppercase tracking-wide text-paper">Sold out</span>}
      {selected && <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center bg-ink text-paper"><Check /></span>}
    </button>
  );
};

/**
 * Combo builder bottom sheet. Slots (how many products, which products) and
 * the variants come from the admin-configured promotions behind the home card
 * (`combo.builder`). Pricing and validity of the exact selection come from the
 * existing cart promotion endpoint, so the sheet never invents a discount.
 */
const ComboBuilderSheet = ({ combo, onClose }) => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((s) => s.auth);
  const [addToCartAPI] = useAddToCartMutation();
  const { active: festive, can } = useSiteCampaign();
  const combos = combo.builder?.combos || [];
  const [comboIdx, setComboIdx] = useState(0);
  const current = combos[comboIdx];
  const slots = current?.slots || [];

  const [picked, setPicked] = useState({}); // slot index -> card
  const [activeSlot, setActiveSlot] = useState(0);
  const [filter, setFilter] = useState({}); // slot index -> productId (for slots accepting several products)
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const busyRef = useRef(false);

  const close = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selection = slots.map((_, i) => picked[i]).filter(Boolean);
  const complete = slots.length > 0 && selection.length === slots.length;

  // Switching combination keeps every selection that is still allowed in its slot.
  const switchCombo = (idx) => {
    const next = combos[idx];
    setPicked((prev) => {
      const kept = {};
      next.slots.forEach((slot, i) => {
        const c = prev[i];
        if (c && slot.options.some((o) => o.productId === c.productId)) kept[i] = c;
      });
      return kept;
    });
    setComboIdx(idx);
    setActiveSlot(0);
    setFilter({});
  };

  const pick = (card) => {
    setPicked((prev) => {
      const next = { ...prev, [activeSlot]: card };
      // move on to the next empty slot
      const nextEmpty = slots.findIndex((_, i) => !next[i]);
      if (nextEmpty >= 0) setActiveSlot(nextEmpty);
      return next;
    });
  };

  // Same variant picked twice becomes quantity 2 (one cart line).
  const lines = useMemo(() => {
    const m = new Map();
    selection.forEach((c) => {
      const k = keyOf(c);
      m.set(k, { card: c, quantity: (m.get(k)?.quantity || 0) + 1 });
    });
    return [...m.values()];
  }, [selection.map(keyOf).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const familyIds = useMemo(() => new Set([...(combo.relatedPromotionIds || []), ...combos.map((c) => c.promotionId)]), [combo.relatedPromotionIds, combos]);

  const { currentData, isFetching } = useGetCartPromotionsQuery(
    {
      items: lines.map(({ card, quantity }) => ({ productId: card.productId, quantity, selectedVariant: card.variantName || undefined })),
      placement: 'cart',
      subtotal: lines.reduce((s, { card, quantity }) => s + (Number(card.price) || 0) * quantity, 0),
    },
    { skip: !complete },
  );
  const pricing = complete ? currentData?.data?.pricing : null;
  const unlocked = Boolean(complete && !isFetching && (currentData?.data?.promotions || []).some((p) => familyIds.has(p.id) && p.applied));

  const sellingTotal = selection.reduce((s, c) => s + (Number(c.price) || 0), 0);
  const mrpTotal = selection.reduce((s, c) => s + (Number(c.mrp ?? c.price) || 0), 0);
  const markdown = Math.max(0, mrpTotal - sellingTotal);
  const comboSavings = unlocked ? Math.max(0, Number(pricing?.savings) || 0) : 0;
  const finalPrice = pricing?.discountedSubtotal ?? sellingTotal;
  const reward = current?.reward;
  const rewardWorth = unlocked && reward?.kind === 'free' && typeof reward.worth === 'number' ? reward.worth : 0;
  const totalSaved = markdown + comboSavings + rewardWorth;

  const addCombo = async () => {
    if (!unlocked || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      const loggedIn = isAuthenticated || !!localStorage.getItem('authToken');
      for (const { card, quantity } of lines) {
        if (loggedIn) {
          // sequential so the cart never races itself
          // eslint-disable-next-line no-await-in-loop
          await addToCartAPI({ productId: card.productId, quantity, variant: card.variantName || undefined, image: card.image }).unwrap();
        } else {
          dispatch(addItem({
            id: card.productId, mongoId: card.productId, name: card.productName, price: card.price,
            image: card.image, quantity, selectedVariant: card.variantName || 'N/A', sku: card.sku,
          }));
        }
        trackAddToCart({ itemId: card.productId, sku: card.sku, itemName: card.productName, itemVariant: card.variantName, price: card.price, quantity, placement: 'home_combo_builder' });
      }
      close();
    } catch (err) {
      setError(err?.data?.message || 'Could not add the combo. Please try again.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  // variants of the slot being edited (optionally filtered to one product)
  const slotDef = slots[activeSlot];
  const activeProduct = filter[activeSlot] || slotDef?.options[0]?.productId;
  const gridCards = slotDef
    ? (slotDef.options.find((o) => o.productId === activeProduct) || slotDef.options[0])?.cards || []
    : [];

  const gridCols = slots.length >= 3 ? 'grid-cols-3' : 'grid-cols-2';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={combo.title}>
      <button type="button" aria-label="Close" onClick={close} className={`absolute inset-0 bg-ink/60 backdrop-blur-[3px] transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`} />
      <div className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-paper shadow-2xl transition-transform duration-300 ease-out sm:max-w-[600px] ${visible ? 'translate-y-0' : 'translate-y-full sm:translate-y-8'}`}>
        {/* minimal festive edge: a thin string of lights + two small hanging diyas */}
        {festive && can('lights') && <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[22px] overflow-hidden" aria-hidden="true"><Garland arcs={4} /></div>}
        {festive && can('diyas') && (
          <>
            <HangingDiya className="left-3 top-[6px] z-10" length={4} diyaClass="!h-[12px] !w-[15px]" />
            <HangingDiya className="right-14 top-[6px] z-10" length={8} diyaClass="!h-[12px] !w-[15px]" />
          </>
        )}

        {/* A. compact header */}
        <header className={`shrink-0 border-b border-hair px-4 pb-3 sm:px-5 ${festive && can('lights') ? 'pt-7' : 'pt-4'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 border border-star/60 bg-star/15 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-ink"><span aria-hidden="true">✦</span> {festive ? 'Festive offer' : 'Combo offer'}</p>
              <h3 className="mt-1.5 truncate font-archivo text-[19px] font-bold leading-tight text-ink">{combo.title}</h3>
              {current?.description && <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted">{current.description}</p>}
            </div>
            <button type="button" onClick={close} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center border border-hair text-xl leading-none text-ink hover:bg-surface">×</button>
          </div>

          {combos.length > 1 && (
            <div className="-mx-4 mt-2.5 flex gap-1.5 overflow-x-auto px-4 pb-0.5 gl-hscroll sm:-mx-5 sm:px-5" role="tablist" aria-label="Combination">
              {combos.map((c, i) => (
                <button key={c.promotionId} type="button" role="tab" aria-selected={i === comboIdx} onClick={() => switchCombo(i)} className={`shrink-0 border px-3 py-1.5 text-[12px] font-semibold transition-colors ${i === comboIdx ? 'border-ink bg-ink text-paper' : 'border-hair bg-white text-ink hover:border-ink/40'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </header>

        {!current ? (
          <p className="px-5 py-10 text-center text-sm text-muted">This offer is not available right now.</p>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
              {/* B. selected combo preview — one slot per required product */}
              <div className={`grid gap-2 ${slots.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {slots.map((slot, i) => {
                  const c = picked[i];
                  const on = i === activeSlot;
                  return (
                    <button key={i} type="button" onClick={() => setActiveSlot(i)} aria-pressed={on} className={`relative flex min-w-0 items-center gap-2 border-2 bg-white p-1.5 text-left transition-colors ${on ? 'border-brand' : 'border-hair'}`}>
                      <span className="grid h-[46px] w-[46px] shrink-0 place-items-center overflow-hidden bg-surface">
                        {c?.image ? <img src={c.image} alt="" className="h-full w-full object-cover" /> : <span className="text-[18px] font-light text-faint" aria-hidden="true">+</span>}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[9.5px] font-extrabold uppercase tracking-wider ${on ? 'text-brand' : 'text-faint'}`}>{on ? `Choosing item ${i + 1}` : `Item ${i + 1}`}</span>
                        {c ? (
                          <>
                            <span className="block truncate text-[11.5px] font-semibold leading-tight text-ink" title={c.variantName || c.productName}>{c.variantName || c.productName}</span>
                            <span className="block text-[11.5px] font-bold tabular-nums text-ink">{inr(c.price)}</span>
                          </>
                        ) : (
                          <span className="block truncate text-[11.5px] text-muted">{slot.options.length === 1 ? slot.options[0].label : 'Select a variant'}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* C. eligible variants of the slot being edited */}
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink">Choose item {activeSlot + 1}</p>
                {slotDef && slotDef.options.length > 1 && (
                  <div className="flex gap-1" role="group" aria-label="Product">
                    {slotDef.options.map((o) => (
                      <button key={o.productId} type="button" onClick={() => setFilter((f) => ({ ...f, [activeSlot]: o.productId }))} aria-pressed={o.productId === activeProduct} className={`border px-2 py-0.5 text-[11px] font-semibold ${o.productId === activeProduct ? 'border-ink bg-ink text-paper' : 'border-hair bg-white text-ink'}`}>{o.label}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className={`mt-2 grid gap-1.5 ${gridCols}`}>
                {gridCards.map((card) => (
                  <VariantTile key={keyOf(card)} card={card} selected={picked[activeSlot] && keyOf(picked[activeSlot]) === keyOf(card)} onPick={pick} />
                ))}
              </div>
              {error && <p className="mt-3 border border-brand/20 bg-brand/5 px-3 py-2 text-xs font-semibold text-brand" role="alert">{error}</p>}
            </div>

            {/* D. sticky combo price summary + action */}
            <footer className="shrink-0 border-t border-hair bg-paper px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2.5 sm:px-5">
              {complete ? (
                <dl className="mb-2 space-y-0.5 text-[12.5px]" aria-live="polite">
                  <div className="flex justify-between text-muted"><dt>Items (MRP)</dt><dd className={`tabular-nums ${markdown > 0 ? 'line-through' : ''}`}>{inr(mrpTotal)}</dd></div>
                  {markdown > 0 && <div className="flex justify-between text-muted"><dt>Product discount</dt><dd className="tabular-nums text-save">− {inr(markdown)}</dd></div>}
                  {comboSavings > 0 && <div className="flex justify-between text-muted"><dt>Combo discount</dt><dd className="tabular-nums text-save">− {inr(comboSavings)}</dd></div>}
                  {reward && reward.kind === 'free' && (
                    <div className="flex justify-between text-muted">
                      <dt className="truncate pr-2">{reward.name}</dt>
                      <dd className="shrink-0 font-bold text-save">{unlocked ? <>FREE {typeof reward.worth === 'number' ? <span className="font-normal text-faint line-through">{inr(reward.worth)}</span> : reward.worth ? <span className="font-normal">({reward.worth})</span> : null}</> : '—'}</dd>
                    </div>
                  )}
                  {reward && reward.kind === 'shipping' && unlocked && <div className="flex justify-between text-muted"><dt>Shipping</dt><dd className="font-bold text-save">FREE</dd></div>}
                  <div className="flex items-baseline justify-between border-t border-hair pt-1.5 text-ink">
                    <dt className="font-bold">You pay</dt>
                    <dd className="flex items-baseline gap-2">
                      {unlocked && totalSaved > 0 && <span className="bg-save px-1.5 py-0.5 text-[10.5px] font-semibold text-white">You save {inr(totalSaved)}</span>}
                      <span className="font-archivo text-[20px] font-extrabold tabular-nums">{isFetching && !pricing ? '…' : inr(finalPrice)}</span>
                    </dd>
                  </div>
                  {!unlocked && !isFetching && <p className="pt-1 text-[11.5px] text-brand">This selection does not unlock the offer. Try another combination.</p>}
                </dl>
              ) : (
                <p className="mb-2 text-center text-[12px] text-muted">
                  Pick {slots.length - selection.length} more {slots.length - selection.length === 1 ? 'item' : 'items'} to unlock{reward?.name ? ` ${reward.kind === 'free' ? `your free ${reward.name}` : reward.name}` : ' this offer'}.
                </p>
              )}
              <button type="button" onClick={addCombo} disabled={!unlocked || busy} className="flex h-12 w-full items-center justify-center bg-ink text-[15px] font-semibold text-paper transition-colors hover:bg-black disabled:opacity-45">
                {busy ? 'Adding…' : 'Add Selected Combo to Cart'}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default ComboBuilderSheet;
