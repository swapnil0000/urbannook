import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addItem } from '../../store/slices/cartSlice';
import { useAddToCartMutation, useGetHomeComboOffersQuery } from '../../store/api/userApi';
import { useCartPromotions } from '../../hooks/useCartPromotions';
import { recordOfferInterest } from '../../utils/offerInterest';
import { trackAddToCart } from '../../utils/analytics';
import Phuljadi from '../festive/Phuljadi';
import MysteryGiftArt from './MysteryGiftArt';

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const pctOff = (c) => (c.mrp != null && c.price != null && c.mrp > c.price ? Math.round(((c.mrp - c.price) / c.mrp) * 100) : 0);

const benefitOf = (c) => {
  if (c.kind === 'reward') {
    if (c.savingsLabel) return `FREE · ${c.savingsLabel}`;
    if (typeof c.rewardValue === 'number' && c.rewardValue > 0) return `Save ${inr(c.rewardValue)}`;
    return 'Free reward';
  }
  if (c.save > 0) return c.savingsMode === 'percent' && c.percentOff > 0 ? `${c.percentOff}% OFF` : `Save ${inr(c.save)}`;
  if (c.freeShipping) return 'Free Shipping';
  if (c.freeGift) return 'Free Gift';
  return c.savingsLabel || 'Special offer';
};

/** One eligible variant: image, name, MRP / price / % off, and an Add button. */
const VariantCard = ({ card, inCart, adding, onAdd }) => {
  const off = pctOff(card);
  const name = card.variantName || card.productName;
  return (
    <article className={`relative flex min-w-0 flex-col border bg-gradient-to-b from-white to-star/15 p-2 transition-shadow ${inCart ? 'border-ink' : 'border-star/60'} ${card.outOfStock ? 'opacity-50' : 'shadow-[0_10px_24px_-16px_rgb(var(--gl-star))] hover:shadow-[0_14px_30px_-14px_rgb(var(--gl-star))]'}`}>
      <span className="absolute inset-x-0 top-0 z-10 h-[3px] bg-gradient-to-r from-brand via-star to-brand" aria-hidden="true" />
      <div className="relative aspect-square w-full overflow-hidden bg-surface">
        {card.image && <img src={card.image} alt={name} loading="lazy" className={`h-full w-full object-cover ${card.outOfStock ? 'grayscale' : ''}`} />}
        {inCart > 0 && <span className="absolute left-1 top-1 bg-ink px-1.5 py-0.5 text-[10px] font-bold text-star">In cart · {inCart}</span>}
        {card.outOfStock && <span className="absolute right-1 top-1 bg-ink/80 px-1.5 py-0.5 text-[10px] font-bold uppercase text-paper">Sold out</span>}
      </div>
      <h4 className="mt-2 line-clamp-2 min-h-[2.5em] text-[12.5px] font-semibold leading-snug text-ink" title={name}>{name}</h4>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-[15px] font-bold tabular-nums text-ink">{inr(card.price)}</span>
        {off > 0 && <span className="text-[11px] tabular-nums text-faint line-through">{inr(card.mrp)}</span>}
        {off > 0 && <span className="text-[11px] font-bold text-save">{off}% off</span>}
      </p>
      <button
        type="button"
        onClick={() => onAdd(card)}
        disabled={card.outOfStock || adding}
        className="mt-2 flex h-9 w-full items-center justify-center bg-ink text-[13px] font-semibold text-paper transition-colors hover:bg-brand disabled:opacity-50"
      >
        {adding ? 'Adding…' : inCart > 0 ? 'Add another' : 'Add to Cart'}
      </button>
    </article>
  );
};

/**
 * The offer experience on the offer's primary product page
 * (/products/<id>?offer=<promotionId>): a festive banner that explains the
 * offer, the live progress from the promotion engine, and every eligible
 * product with its variants, each addable straight to the cart. All of it
 * comes from the admin-configured promotion (the home offer data); an offer
 * that is no longer live renders nothing, so no stale benefit is shown.
 */
const OfferDetailsSection = ({ promotionId, currentProductId }) => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((s) => s.auth);
  const cartItems = useSelector((s) => s.cart.items);
  const [addToCartAPI] = useAddToCartMutation();
  const { data } = useGetHomeComboOffersQuery();
  const combo = (data?.data?.combos || []).find((c) => String(c.id) === String(promotionId));
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');
  const busyRef = useRef(false);

  // remember the interest so the checkout can remind them if the offer is incomplete
  useEffect(() => {
    if (combo) recordOfferInterest(combo.id, currentProductId || combo.primaryProductId);
  }, [combo?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // an offer can unlock through any of its combinations (wooden / LED / mixed ...)
  const familyIds = useMemo(() => (combo ? [...new Set([String(combo.id), ...(combo.relatedPromotionIds || []), ...(combo.builder?.combos || []).map((c) => c.promotionId)].map(String))] : null), [combo]);
  const { promotions, pricing } = useCartPromotions('cart', null, null, Boolean(combo), familyIds);
  const family = familyIds ? promotions.filter((p) => familyIds.includes(p.id)) : [];
  const entry = family.find((p) => p.progress?.complete) || family.find((p) => p.id === String(promotionId));
  const progress = entry?.progress;
  const savings = family.reduce((s, p) => s + (Number(pricing?.savingsByPromotion?.[p.id]) || 0), 0);

  const combos = combo?.builder?.combos || [];
  // every product the offer can use, with all its variants (first mention wins)
  const products = useMemo(() => {
    const seen = new Map();
    combos.forEach((c) => c.slots.forEach((slot) => slot.options.forEach((o) => {
      if (!seen.has(o.productId)) seen.set(o.productId, o);
    })));
    return [...seen.values()];
  }, [combos]);

  const inCartCount = useMemo(() => {
    const m = new Map();
    (cartItems || []).forEach((i) => {
      const id = String(i.productId || i.mongoId || i.id);
      const q = typeof i.quantity === 'object' ? Number(i.quantity?.quantity || 0) : Number(i.quantity || 0);
      const k = `${id}:${i.selectedVariant || 'N/A'}`;
      m.set(k, (m.get(k) || 0) + q);
    });
    return m;
  }, [cartItems]);

  if (!combo || products.length === 0) return null;

  const first = combos[0];
  const reward = first?.reward;
  const unlocked = Boolean(progress?.complete);

  const add = async (card) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setError('');
    setBusyKey(`${card.productId}:${card.sku || ''}`);
    try {
      const loggedIn = isAuthenticated || !!localStorage.getItem('authToken');
      if (loggedIn) {
        await addToCartAPI({ productId: card.productId, quantity: 1, variant: card.variantName || undefined, image: card.image }).unwrap();
      } else {
        dispatch(addItem({
          id: card.productId, mongoId: card.productId, name: card.productName, price: card.price,
          image: card.image, quantity: 1, selectedVariant: card.variantName || 'N/A', sku: card.sku,
        }));
      }
      trackAddToCart({ itemId: card.productId, sku: card.sku, itemName: card.productName, itemVariant: card.variantName, price: card.price, quantity: 1, placement: 'offer_page' });
    } catch (err) {
      setError(err?.data?.message || 'Could not add this item. Please try again.');
    } finally {
      busyRef.current = false;
      setBusyKey('');
    }
  };

  return (
    <section className="mb-8" aria-label={`Offer: ${combo.title}`}>
      {/* ── banner ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden border border-star/40 text-paper" style={{ background: 'radial-gradient(90% 90% at 0% 0%, rgb(var(--gl-brand-hi) / 0.5), transparent 65%), radial-gradient(70% 80% at 100% 100%, rgb(var(--gl-star) / 0.16), transparent 70%), rgb(var(--gl-ink))' }}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-star to-transparent" aria-hidden="true" />
        <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-[220px_1fr] md:gap-7">
          <div className="relative mx-auto aspect-square w-full max-w-[220px] overflow-hidden border border-star/40 bg-white/5 md:mx-0">
            {/* a mystery gift shows the wrapped box (or the admin's own reward image), never the katana that unlocks it */}
            {combo.mysteryGift && !combo.rewardImage
              ? <MysteryGiftArt />
              : <img src={(combo.mysteryGift && combo.rewardImage) || combo.bannerImage || reward?.image || first?.slots?.[0]?.options?.[0]?.cards?.[0]?.image || '/assets/logo.webp'} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.src = '/assets/logo.webp'; }} />}
            <span className="absolute left-0 top-0 bg-gradient-to-r from-star to-[#f0a52a] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-ink">{benefitOf(combo)}</span>
          </div>

          <div className="min-w-0">
            <p className="gl-lbl text-[10.5px] text-star" style={{ letterSpacing: '0.24em' }}>✦ Festive offer</p>
            <h2 className="mt-1.5 font-archivo text-[26px] font-bold leading-tight tracking-tight sm:text-[32px]">{combo.title}</h2>
            {first?.description && <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-paper/75">{first.description}</p>}

            {/* how to unlock: every supported combination */}
            <div className="mt-4">
              <p className="gl-lbl mb-2 text-[10px] text-paper/55" style={{ letterSpacing: '0.2em' }}>{combos.length > 1 ? 'Choose any one combination' : 'What you need'}</p>
              <ul className="flex flex-wrap gap-2">
                {combos.map((c) => (
                  <li key={c.promotionId} className="inline-flex items-center gap-2 border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[12.5px] font-semibold">
                    <span>{c.label}</span>
                    {c.reward?.badge && <span className="bg-star px-1.5 py-px text-[10px] font-extrabold text-ink">{c.reward.badge === 'FREE' && c.reward.name ? `FREE ${c.reward.name}` : c.reward.badge}</span>}
                  </li>
                ))}
              </ul>
            </div>

            {/* live progress from the promotion engine */}
            <div className="mt-4 border border-white/10 bg-black/25 p-3">
              {progress
                ? <Phuljadi promotionId={entry.id} tone="dark" />
                : <p className="text-[12.5px] text-paper/70">Add the products below to start unlocking this offer.</p>}
              {unlocked && (
                <p className="mt-2 text-[12.5px] font-semibold text-star">
                  Offer applied in your cart{savings > 0 ? ` — you save ${inr(savings)}` : ''}.
                </p>
              )}
            </div>

            <ul className="mt-3 space-y-1 text-[11.5px] leading-snug text-paper/55">
              <li>• The offer applies automatically in your cart once the requirements are met.</li>
              <li>• Only the products listed below count towards this offer.</li>
              <li>• Remove items any time — the offer updates with your cart.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── eligible products ────────────────────────────────── */}
      <div className="mt-6">
        <h3 className="font-archivo text-xl font-bold text-ink sm:text-2xl">Eligible products</h3>
        <p className="mt-0.5 text-[13px] text-muted">Pick your variants and add them — prices below are before the offer.</p>
        {error && <p className="mt-3 border border-brand/20 bg-brand/5 px-3 py-2 text-xs font-semibold text-brand" role="alert">{error}</p>}

        {products.map((product) => (
          <div key={product.productId} className="mt-5">
            <div className="mb-2.5 flex items-baseline justify-between gap-3 border-b border-hair pb-1.5">
              <p className="text-[13px] font-extrabold uppercase tracking-wider text-ink">{product.label}</p>
              <p className="text-[11.5px] text-muted">{product.cards.length} variant{product.cards.length === 1 ? '' : 's'}</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {product.cards.map((card) => (
                <VariantCard
                  key={`${card.productId}:${card.sku || ''}`}
                  card={card}
                  inCart={inCartCount.get(`${card.productId}:${card.variantName || 'N/A'}`) || 0}
                  adding={busyKey === `${card.productId}:${card.sku || ''}`}
                  onAdd={add}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default OfferDetailsSection;
