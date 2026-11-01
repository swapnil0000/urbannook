import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { addItem } from '../store/slices/cartSlice';
import { useAddToCartMutation, useGetCartPromotionsQuery } from '../store/api/userApi';
import { useSiteCampaign } from '../hooks/useSiteCampaign';
import { trackAddToCart } from '../utils/analytics';
import { Garland, HangingDiya } from './festive/FestiveLights';
import { buildPromotionCartItems } from '../utils/promotionCartItems';

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const keyOf = (c) => `${c.productId}:${c.sku || ''}`;
const pctOff = (c) => (c.mrp != null && c.price != null && c.mrp > c.price ? Math.round(((c.mrp - c.price) / c.mrp) * 100) : 0);

const Check = () => (
  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
);

/** One compact variant tile (glass): 1:1 thumb, variant-specific name, MRP + price + % off. */
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
      className={`un-bs-glass relative flex min-w-0 items-center gap-2.5 p-2 text-left transition-all duration-200 ${selected ? 'un-bs-on' : ''} ${card.outOfStock ? 'cursor-not-allowed opacity-45' : 'hover:-translate-y-px'}`}
    >
      <span className="relative h-[54px] w-[54px] shrink-0 overflow-hidden bg-white/10 ring-1 ring-white/15">
        {card.image && <img src={card.image} alt="" loading="lazy" className={`h-full w-full object-cover ${card.outOfStock ? 'grayscale' : ''}`} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-[11.5px] font-medium leading-[1.25] text-paper">{name}</span>
        <span className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-[13.5px] font-bold tabular-nums text-star">{inr(card.offerPrice ?? card.price)}</span>
          {card.offerPrice != null
            ? <>
                <span className="text-[10.5px] tabular-nums text-paper/45 line-through">{inr(card.price)}</span>
                <span className="un-bs-save text-[10.5px] font-bold">{Math.round(((card.price - card.offerPrice) / card.price) * 100)}% off</span>
              </>
            : <>
                {off > 0 && <span className="text-[10.5px] tabular-nums text-paper/45 line-through">{inr(card.mrp)}</span>}
                {off > 0 && <span className="un-bs-save text-[10.5px] font-bold">{off}% off</span>}
              </>}
        </span>
      </span>
      {card.outOfStock && <span className="absolute right-1 top-1 bg-white/15 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-paper">Sold out</span>}
      {selected && <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center bg-star text-ink"><Check /></span>}
    </button>
  );
};

/**
 * Combo builder bottom sheet. Slots (how many products, which products) and
 * the variants come from the admin-configured promotions behind the home card
 * (`combo.builder`). Pricing and validity of the exact selection come from the
 * existing cart promotion endpoint, so the sheet never invents a discount.
 */
const ComboBuilderSheet = ({ combo, onClose, mode = 'builder', cartItems = [], onDismiss, onAdded }) => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((s) => s.auth);
  const [addToCartAPI] = useAddToCartMutation();
  const { active: festive, can } = useSiteCampaign();
  const combos = combo.builder?.combos || [];
  const reminder = mode === 'reminder';

  // Reminder mode: what is already in the cart fills the slots it can (those slots are
  // locked and never added twice), so the sheet only asks for what is still missing.
  const fitCart = (c) => {
    const pool = [];
    buildPromotionCartItems(cartItems).forEach((i) => { for (let k = 0; k < i.quantity; k += 1) pool.push(i); });
    const picks = {};
    const locks = {};
    c.slots.forEach((slot, si) => {
      const ui = pool.findIndex((u) => slot.options.some((o) => String(o.productId) === String(u.productId)));
      if (ui < 0) return;
      const u = pool.splice(ui, 1)[0];
      const opt = slot.options.find((o) => String(o.productId) === String(u.productId));
      picks[si] = opt.cards.find((x) => x.variantName === u.selectedVariant) || opt.cards[0];
      locks[si] = true;
    });
    return { picks, locks, score: Object.keys(locks).length };
  };
  const [init] = useState(() => {
    if (!reminder) return { idx: 0, picks: {}, locks: {} };
    let best = { idx: 0, picks: {}, locks: {}, score: -1 };
    combos.forEach((c, idx) => { const f = fitCart(c); if (f.score > best.score) best = { idx, ...f }; });
    return best;
  });

  const [comboIdx, setComboIdx] = useState(init.idx);
  const current = combos[comboIdx];
  const slots = current?.slots || [];

  const [picked, setPicked] = useState(init.picks); // slot index -> card
  const [locked, setLocked] = useState(init.locks); // slot index -> already in the cart
  const [activeSlot, setActiveSlot] = useState(() => {
    const free = (combos[init.idx]?.slots || []).findIndex((_, i) => !init.locks[i]);
    return free < 0 ? 0 : free;
  });
  const [filter, setFilter] = useState({}); // slot index -> productId (for slots accepting several products)
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const busyRef = useRef(false);

  const close = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };
  // closing a reminder is a "no thanks" — never forced
  const dismiss = () => {
    setVisible(false);
    setTimeout(() => (onDismiss ? onDismiss() : onClose()), 250);
  };
  const closeAction = reminder ? dismiss : close;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && closeAction();
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
    if (reminder) {
      const f = fitCart(next);
      setPicked(f.picks);
      setLocked(f.locks);
      setComboIdx(idx);
      setActiveSlot(Math.max(0, next.slots.findIndex((_, i) => !f.locks[i])));
      setFilter({});
      return;
    }
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
    if (locked[activeSlot]) return;
    setPicked((prev) => {
      const next = { ...prev, [activeSlot]: card };
      // move on to the next empty slot
      const nextEmpty = slots.findIndex((_, i) => !next[i] && !locked[i]);
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
  // only a FREE product gets a tile in the preview; discounts / shipping stay in the summary
  const showRewardTile = reward?.kind === 'free';
  const rewardWorth = unlocked && reward?.kind === 'free' && typeof reward.worth === 'number' ? reward.worth : 0;
  const totalSaved = markdown + comboSavings + rewardWorth;

  // units actually added: in reminder mode the ones already in the cart are skipped
  const addLines = (() => {
    const m = new Map();
    slots.forEach((_, i) => {
      const c = picked[i];
      if (!c || locked[i]) return;
      const k = keyOf(c);
      m.set(k, { card: c, quantity: (m.get(k)?.quantity || 0) + 1 });
    });
    return [...m.values()];
  })();

  const addCombo = async () => {
    if (!unlocked || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      const loggedIn = isAuthenticated || !!localStorage.getItem('authToken');
      for (const { card, quantity } of addLines) {
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
      // e.g. the /offers page continues straight to checkout (real payment options)
      if (onAdded) setTimeout(onAdded, 260);
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

  // 2 across on phones: at 3 across the design names were cut to "Zoro En…"
  const gridCols = slots.length >= 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={combo.title}>
      <button
        type="button"
        aria-label="Close"
        onClick={closeAction}
        className={`absolute inset-0 cursor-default backdrop-blur-md transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'radial-gradient(90% 60% at 50% 100%, rgb(var(--gl-brand-hi) / 0.35), transparent 70%), rgb(var(--gl-ink) / 0.72)' }}
      />
      <div className={`un-bs relative flex max-h-[92dvh] w-full flex-col overflow-hidden text-paper transition-transform duration-300 ease-out sm:max-w-[600px] ${visible ? 'translate-y-0' : 'translate-y-full sm:translate-y-8'}`}>
        {/* warm light across the top edge */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-star to-transparent" aria-hidden="true" />
        {/* minimal festive edge: a thin string of lights + two small hanging diyas */}
        {festive && can('lights') && <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[22px] overflow-hidden" aria-hidden="true"><Garland arcs={4} /></div>}
        {festive && can('diyas') && (
          <>
            <HangingDiya className="left-3 top-[6px] z-10" length={4} diyaClass="!h-[12px] !w-[15px]" />
            <HangingDiya className="right-14 top-[6px] z-10" length={8} diyaClass="!h-[12px] !w-[15px]" />
          </>
        )}

        {/* A. compact header */}
        <header className={`shrink-0 border-b border-white/10 px-4 pb-3 sm:px-5 ${festive && can('lights') ? 'pt-7' : 'pt-4'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="un-bs-glass inline-flex items-center gap-1.5 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-star"><span aria-hidden="true">✦</span> {reminder ? 'Offer reminder' : festive ? 'Festive offer' : 'Combo offer'}</p>
              <h3 className={`mt-1.5 font-archivo font-bold leading-tight tracking-tight text-paper ${reminder ? 'text-[18px]' : 'truncate text-[20px]'}`}>{reminder ? 'Add these products to unlock your offer' : combo.title}</h3>
              {(reminder || current?.description) && <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-paper/65">{reminder ? `${combo.title}${current?.description ? ` — ${current.description}` : ''}` : current?.description}</p>}
            </div>
            <button type="button" onClick={closeAction} aria-label="Close" className="un-bs-glass grid h-9 w-9 shrink-0 place-items-center text-xl leading-none text-paper/80 transition-colors hover:text-star">×</button>
          </div>

          {combos.length > 1 && (
            <div className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-0.5 gl-hscroll sm:-mx-5 sm:px-5" role="tablist" aria-label="Combination">
              {combos.map((c, i) => (
                <button
                  key={c.promotionId}
                  type="button"
                  role="tab"
                  aria-selected={i === comboIdx}
                  onClick={() => switchCombo(i)}
                  className={`shrink-0 px-3 py-1.5 text-[12px] font-semibold transition-all ${i === comboIdx ? 'bg-gradient-to-r from-star to-[#f0a52a] text-ink shadow-[0_6px_18px_-8px_rgb(var(--gl-star))]' : 'un-bs-glass text-paper/80 hover:text-paper'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </header>

        {!current ? (
          <p className="px-5 py-10 text-center text-sm text-paper/60">This offer is not available right now.</p>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5 sm:px-5">
              {/* B. image-only combo preview: what you add  →  what you unlock */}
              <div className="un-bs-glass p-2.5">
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="gl-lbl mb-1.5 text-[9px] text-paper/55" style={{ letterSpacing: '0.18em' }}>Adding to cart</p>
                    <div className="flex gap-1.5">
                      {slots.map((slot, i) => {
                        const c = picked[i];
                        const on = i === activeSlot;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => !locked[i] && setActiveSlot(i)}
                            aria-pressed={on}
                            aria-label={c ? `Item ${i + 1}: ${c.variantName || c.productName}` : `Choose item ${i + 1}`}
                            className={`relative aspect-square w-full max-w-[64px] overflow-hidden transition-all duration-200 ${c ? 'bg-white/10' : 'border border-dashed border-white/25 bg-white/[0.04]'} ${on ? 'ring-2 ring-star shadow-[0_0_16px_-4px_rgb(var(--gl-star))]' : 'ring-1 ring-white/15'}`}
                          >
                            {c?.image
                              ? <img src={c.image} alt="" className="h-full w-full object-cover" />
                              : <span className="grid h-full w-full place-items-center text-[22px] font-light text-paper/40" aria-hidden="true">+</span>}
                            {locked[i] && <span className="absolute inset-x-0 bottom-0 bg-ink/85 py-px text-center text-[8px] font-bold uppercase tracking-wide text-star">In cart</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {showRewardTile && <span className="pb-[18px] text-lg leading-none text-star" aria-hidden="true">→</span>}

                  {showRewardTile && (
                    <div className="shrink-0">
                      <p className="gl-lbl mb-1.5 text-[9px] text-paper/55" style={{ letterSpacing: '0.18em' }}>You&apos;ll unlock</p>
                      <div
                        className={`relative h-[64px] w-[64px] overflow-hidden transition-all duration-300 ${unlocked ? 'ring-2 ring-star shadow-[0_0_22px_-3px_rgb(var(--gl-star))]' : 'ring-1 ring-white/15'}`}
                        title={reward.name}
                      >
                        {reward.image ? (
                          <img src={reward.image} alt="" className={`h-full w-full object-cover transition-all duration-300 ${unlocked ? '' : 'opacity-50 grayscale'}`} />
                        ) : (
                          <span className={`grid h-full w-full place-items-center bg-white/10 text-[26px] transition-opacity duration-300 ${unlocked ? 'text-star' : 'text-paper/45'}`} aria-hidden="true">
                            {reward.kind === 'shipping' ? <i className="fa-solid fa-truck-fast" /> : <i className="fa-solid fa-gift" />}
                          </span>
                        )}
                        {reward.badge && (
                          <span className={`absolute inset-x-0 bottom-0 py-[3px] text-center text-[10px] font-extrabold uppercase tracking-wide ${unlocked ? 'bg-gradient-to-r from-star to-[#f0a52a] text-ink' : 'bg-ink/80 text-paper/80'}`}>{reward.badge}</span>
                        )}
                        {!unlocked && <span className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center bg-ink/80 text-[8px] text-paper/80"><i className="fa-solid fa-lock" aria-hidden="true" /></span>}
                      </div>
                    </div>
                  )}
                </div>
                {showRewardTile && (
                  <p className="mt-2 text-center text-[10.5px] text-paper/55" aria-live="polite">
                    {unlocked ? 'Unlocked — added with your combo' : complete ? 'Checking this combination…' : 'Complete your picks to unlock'}
                  </p>
                )}
              </div>

              {/* C. eligible variants of the slot being edited */}
              <div className="mb-2 mt-4 flex items-center justify-between gap-2">
                <p className="gl-lbl text-[10px] text-star/90" style={{ letterSpacing: '0.2em' }}>Choose item {activeSlot + 1}</p>
                {slotDef && slotDef.options.length > 1 && (
                  <div className="flex gap-1" role="group" aria-label="Product">
                    {slotDef.options.map((o) => (
                      <button key={o.productId} type="button" onClick={() => setFilter((f) => ({ ...f, [activeSlot]: o.productId }))} aria-pressed={o.productId === activeProduct} className={`px-2 py-0.5 text-[11px] font-semibold transition-colors ${o.productId === activeProduct ? 'bg-star text-ink' : 'un-bs-glass text-paper/75'}`}>{o.label}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className={`grid gap-2 ${gridCols}`}>
                {gridCards.map((card) => (
                  <VariantTile key={keyOf(card)} card={card} selected={picked[activeSlot] && keyOf(picked[activeSlot]) === keyOf(card)} onPick={pick} />
                ))}
              </div>
              {error && <p className="mt-3 border border-brand/40 bg-brand/15 px-3 py-2 text-xs font-semibold text-paper" role="alert">{error}</p>}
            </div>

            {/* D. sticky combo price summary + action */}
            <footer className="shrink-0 border-t border-white/10 bg-ink/55 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md sm:px-5">
              {complete ? (
                <dl className="mb-2.5 space-y-0.5 text-[12.5px]" aria-live="polite">
                  <div className="flex justify-between text-paper/60"><dt>Items (MRP)</dt><dd className={`tabular-nums ${markdown > 0 ? 'line-through' : ''}`}>{inr(mrpTotal)}</dd></div>
                  {markdown > 0 && <div className="flex justify-between text-paper/60"><dt>Product discount</dt><dd className="un-bs-save tabular-nums font-semibold">− {inr(markdown)}</dd></div>}
                  {comboSavings > 0 && <div className="flex justify-between text-paper/60"><dt>Combo discount</dt><dd className="un-bs-save tabular-nums font-semibold">− {inr(comboSavings)}</dd></div>}
                  {reward && reward.kind === 'free' && (
                    <div className="flex justify-between text-paper/60">
                      <dt className="truncate pr-2">{reward.name}</dt>
                      <dd className="shrink-0 font-bold text-star">{unlocked ? <>FREE {typeof reward.worth === 'number' ? <span className="font-normal text-paper/45 line-through">{inr(reward.worth)}</span> : reward.worth ? <span className="font-normal text-paper/70">({reward.worth})</span> : null}</> : '—'}</dd>
                    </div>
                  )}
                  {reward && reward.kind === 'shipping' && unlocked && <div className="flex justify-between text-paper/60"><dt>Shipping</dt><dd className="font-bold text-star">FREE</dd></div>}
                  <div className="flex items-baseline justify-between border-t border-white/10 pt-2 text-paper">
                    <dt className="font-semibold">You pay</dt>
                    <dd className="flex items-baseline gap-2.5">
                      {unlocked && totalSaved > 0 && <span className="bg-gradient-to-r from-star to-[#f0a52a] px-2 py-0.5 text-[10.5px] font-bold text-ink">You save {inr(totalSaved)}</span>}
                      <span className="font-archivo text-[22px] font-bold tabular-nums text-star">{isFetching && !pricing ? '…' : inr(finalPrice)}</span>
                    </dd>
                  </div>
                  {!unlocked && !isFetching && <p className="pt-1 text-[11.5px] text-paper/80">This selection does not unlock the offer. Try another combination.</p>}
                </dl>
              ) : (
                <p className="mb-2.5 text-center text-[12px] text-paper/65">
                  Pick {slots.length - selection.length} more {slots.length - selection.length === 1 ? 'item' : 'items'} to unlock{reward?.name ? ` ${reward.kind === 'free' ? `your free ${reward.name}` : reward.name}` : ' this offer'}.
                </p>
              )}
              <button
                type="button"
                onClick={addCombo}
                disabled={!unlocked || busy}
                className="flex h-12 w-full items-center justify-center bg-gradient-to-r from-star via-[#f7b733] to-[#f0a52a] text-[15px] font-bold tracking-tight text-ink shadow-[0_10px_28px_-10px_rgb(var(--gl-star)/0.8)] transition-all hover:brightness-105 disabled:bg-none disabled:bg-white/10 disabled:text-paper/40 disabled:shadow-none"
              >
                {busy ? 'Adding…' : reminder ? 'Add & Unlock Offer' : 'Add Selected Combo to Cart'}
              </button>
              {reminder && (
                <button type="button" onClick={dismiss} className="mt-2 block w-full py-1 text-center text-[12.5px] text-paper/70 underline underline-offset-2 hover:text-paper">No thanks — continue without offer</button>
              )}
            </footer>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default ComboBuilderSheet;
