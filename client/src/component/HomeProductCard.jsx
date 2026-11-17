/* eslint-disable react-refresh/only-export-components -- card + its price/image helpers live together (helpers re-exported by UnProductCard users) */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import WishlistButton from './WishlistButton';
import { addItem, updateQuantity, removeItem } from '../store/slices/cartSlice';
import { useAddToCartMutation, useUpdateCartMutation } from '../store/api/userApi';

import { trackSelectItem, trackAddToCart, trackRemoveFromCart } from '../utils/analytics';

/** "Quick add" - first design straight to the cart. Desktop: slides up over the
 *  photo on hover. Touch: always shown as a small round + button (no hover there). */
/* "Added" burst: 10 brand-colour bits fan out upwards from the button (stays inside the card). Pure CSS (index.css .un-confetti),
   no library; hidden for reduced motion. */
const BITS = ['bg-lime', 'bg-mustard', 'bg-brand', 'bg-forest', 'bg-white'];
const Confetti = () => (
  <span aria-hidden="true" className="un-confetti">
    {Array.from({ length: 10 }, (_, i) => (
      <i key={i} className={BITS[i % BITS.length]} style={{ '--a': `${-80 + i * 17}deg`, '--d': `${34 + (i % 3) * 9}px` }} />
    ))}
  </span>
);

const QuickAdd = ({ p, inline = false }) => {
  const dispatch = useDispatch();
  const v = firstVariant(p);
  const variant = v.variantName || 'N/A';
  // how many of this design are already in the cart (guest: local cart, signed in: server cart mirrored in redux)
  const qty = useSelector((s) => {
    const it = s.cart.items.find((i) => String(i.mongoId || i.productId || i.id) === String(p.productId) && (i.selectedVariant || 'N/A') === variant);
    return Number(it?.quantity) || 0;
  });
  const isAuthenticated = useSelector((s) => s.auth?.isAuthenticated);
  const [addToCartAPI] = useAddToCartMutation();
  const [updateCart] = useUpdateCartMutation();
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [burst, setBurst] = useState(0); // new key per add, so the CSS burst replays on every tap
  // stock cap: a tracked quantity (variantQuantity != null) limits the stepper; null = not stock-tracked
  const max = v.variantQuantity != null ? Number(v.variantQuantity) : Infinity;
  const soldOut = v.variantOutOfStock === true || max <= 0;
  const loggedIn = () => isAuthenticated || (typeof window !== 'undefined' && !!localStorage.getItem('authToken'));
  const item = { itemId: p.productId, sku: v.sku, itemName: p.productName, itemVariant: v.variantName || '', price: v.variantPrice || 0, quantity: 1 };

  // same paths as the product page / cart drawer: server cart when signed in, local cart for guests
  const change = async (e, dir) => {
    e.preventDefault(); e.stopPropagation();
    if (busy || (dir > 0 && (soldOut || qty >= max))) return;
    setBusy(true);
    try {
      if (dir > 0) {
        if (loggedIn()) {
          if (qty === 0) await addToCartAPI({ productId: p.productId, quantity: 1, variant, image: v.variantImage?.[0] }).unwrap();
          else await updateCart({ productId: p.productId, quantity: 1, action: 'add', variant, image: v.variantImage?.[0] }).unwrap();
        } else {
          dispatch(addItem({ id: p.productId, mongoId: p.productId, name: p.productName, price: v.variantPrice, image: v.variantImage?.[0], quantity: 1, selectedVariant: variant, sku: v.sku }));
        }
        trackAddToCart?.({ ...item, placement: 'home_card' });
        setAdded(true); setBurst((n) => n + 1); setTimeout(() => setAdded(false), 1600);
      } else if (qty > 0) {
        if (loggedIn()) await updateCart({ productId: p.productId, quantity: 1, action: qty > 1 ? 'sub' : 'remove', variant }).unwrap();
        else if (qty > 1) dispatch(updateQuantity({ id: p.productId, quantity: qty - 1, selectedVariant: variant }));
        else dispatch(removeItem({ id: p.productId, selectedVariant: variant }));
        trackRemoveFromCart?.(item);
      }
    } catch (err) {
      console.error('Quick add failed:', err);
    } finally {
      setBusy(false);
    }
  };
  const add = (e) => change(e, 1);

  if (inline) {
    const live = <span className="sr-only" aria-live="polite">{qty > 0 ? `${qty} in cart` : ''}</span>;
    if (qty > 0) {
      // in the cart: the button becomes a stepper so the count is always visible (no drawer needed on mobile)
      return (
        <span className={`relative shrink-0 inline-flex items-center justify-between h-11 rounded-full border-2 border-ink bg-forest text-lime max-sm:w-full ${added ? 'un-added' : ''}`} key={burst}>
          <button type="button" onClick={(e) => change(e, -1)} disabled={busy} aria-label={qty > 1 ? `One less ${p.productName}` : `Remove ${p.productName} from cart`}
            className="grid place-items-center w-10 h-full rounded-l-full text-lg font-bold hover:bg-white/10 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime">
            {qty > 1 ? '−' : <i className="fa-solid fa-trash-can text-[12px]" aria-hidden="true" />}
          </button>
          <span className="min-w-[22px] text-center font-anton text-lg tabular-nums" aria-hidden="true">{qty}</span>
          <button type="button" onClick={add} disabled={busy || qty >= max} aria-label={`One more ${p.productName}`}
            className="grid place-items-center w-10 h-full rounded-r-full text-lg font-bold hover:bg-white/10 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime">+</button>
          {added && <Confetti key={`c${burst}`} />}
          {live}
        </span>
      );
    }
    return (
      <span className="relative shrink-0 inline-grid">
        <button type="button" onClick={add} disabled={busy || soldOut} aria-label={soldOut ? `${p.productName} is sold out` : `Quick add ${p.productName} to cart`}
          className="h-11 min-w-[44px] px-3 rounded-full border-2 border-ink font-anton uppercase text-[15px] text-white bg-brand hover:bg-brandHi transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          {soldOut ? 'Sold out' : <><span aria-hidden="true" className="sm:hidden">+</span><span className="hidden sm:inline">Add +</span></>}
        </button>
        {live}
      </span>
    );
  }
  return (
    <button type="button" onClick={add} aria-label={`Quick add ${p.productName} to cart`} aria-live="polite"
      className={`un-qa absolute z-20 bottom-3 right-3 h-11 rounded-full font-bold text-[13px] text-white shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${added ? 'bg-save' : 'bg-brand hover:bg-brandHi'}`}>
      <span className="un-qa-full px-4">{added ? 'Added ✓' : 'Quick add'}</span>
      <span className="un-qa-icon w-11 text-lg" aria-hidden="true">{added ? '✓' : '+'}</span>
    </button>
  );
};

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const firstVariant = (p) => p?.variantDetails?.[0] || {};
const productImg = (p) => firstVariant(p)?.variantImage?.[0] || p?.productImg || p?.productImage || '/assets/logo.webp';
const productHref = (p) => `/products/${p.productId}`;

/** Cheapest priced variant -> { price, mrp, off, count }. */
const priceOf = (p) => {
  const vs = (p?.variantDetails || []).filter((v) => Number(v.variantPrice) > 0);
  const v = vs.length ? vs.reduce((a, x) => (Number(x.variantPrice) < Number(a.variantPrice) ? x : a)) : firstVariant(p);
  const price = Number(p?.effectivePrice ?? v.variantPrice ?? 0);
  const mrp = Number(v.variantMrp) || 0;
  return { price, mrp, off: mrp > price && price > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0, count: (p?.variantDetails || []).length };
};

/**
 * Home-page-only product card (bento style, ui-ux-pro-max "Bento Box Grid"):
 * outlined poster card, square photo, % off sticker,
 * name + "from" price + struck MRP + % off, design count, round arrow.
 *
 * `feature` renders the large bento tile: photo fills the whole card and
 * the text sits on a gradient over it.
 */
const HomeProductCard = ({ p, index = 0, listId = 'grid', listName = 'Grid', feature = false }) => {
  const v = firstVariant(p);
  const { price, mrp, off, count } = priceOf(p);
  const cut = (productImg(p));

  // A real <a href> so search engines can follow product links; the router handles the click.
  const track = () => {
    trackSelectItem?.({ itemId: p.productId, itemName: p.productName, itemVariant: v.variantName || '', price: v.variantPrice || 0, listId, listName, index });
  };
  const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';
  const wish = (
    <div className="absolute top-3 right-3 z-10" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
      <WishlistButton productId={p.productId} />
    </div>
  );

  if (feature) {
    return (
      <Link to={productHref(p)} onClick={track} className={`un-bento group relative block h-full min-h-[280px] md:min-h-[340px] overflow-hidden rounded-[24px] bg-ink ${focus}`}>
        {cut
          ? <><span aria-hidden="true" className="absolute inset-0" style={{ background: 'radial-gradient(60% 55% at 50% 38%, rgb(var(--gl-brand) / .35), transparent 70%)' }} />
              <img src={cut} alt={p.productName} loading="lazy" className="un-cut-dark absolute inset-x-0 top-6 bottom-36 md:bottom-40 m-auto w-[80%] h-[calc(100%-11rem)] object-contain transition-transform duration-700 group-hover:scale-[1.06] group-hover:-rotate-2" onError={(e) => { e.currentTarget.src = '/assets/logo.webp'; }} /></>
          : <><img src={productImg(p)} alt={p.productName} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" onError={(e) => { e.currentTarget.src = '/assets/logo.webp'; }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" /></>}
        {wish}
        <div className="absolute inset-x-0 bottom-0 p-5 md:p-7 text-white">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-white/75">{p.productCategory}{count > 1 ? ` · ${count} designs` : ''}</p>
          <h3 className="font-archivo text-2xl md:text-4xl font-extrabold tracking-tight leading-[1.05] mt-1 line-clamp-2">{p.productName}</h3>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="flex items-baseline gap-2">
              <span className="text-white/75 text-sm">from</span>
              <span className="font-archivo text-2xl md:text-3xl font-extrabold">{inr(price)}</span>
              {off > 0 && <s className="text-white/60 text-sm">{inr(mrp)}</s>}
            </p>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand text-white font-bold text-sm pl-4 pr-1.5 h-11 transition-transform group-hover:translate-x-0.5">
              Shop <span className="grid place-items-center w-8 h-8 rounded-full bg-white/20" aria-hidden="true">→</span>
            </span>
          </div>
        </div>
      </Link>
    );
  }

  // Poster card: thick ink outline + hard shadow, square photo on cream (wide katanas
  // and tall figures both fit whole - object-contain, never cropped), % off as a sticker.
  return (
    <Link to={productHref(p)} onClick={track} className={`group flex flex-col h-full overflow-hidden rounded-[26px] border-[3px] border-ink bg-white shadow-[5px_5px_0_rgb(var(--gl-ink))] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[7px_7px_0_rgb(var(--gl-ink))] motion-reduce:transform-none ${focus}`}>
      {/* labels live in a strip above the photo, never on it */}
      <div className="relative bg-cream border-b-[3px] border-ink">
        <div className="flex items-center justify-between gap-2 px-2.5 pt-2.5 h-[52px]">
          {off > 0 ? <span className="-rotate-6 rounded-full border-2 border-ink bg-mustard px-2.5 py-1 font-anton uppercase text-[13px] leading-none text-ink shadow-[2px_2px_0_rgb(var(--gl-ink))]">{off}% off</span> : <span />}
          <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}><WishlistButton productId={p.productId} /></span>
        </div>
        <div className="aspect-[4/3] overflow-hidden">
        <img src={cut || productImg(p)} alt={p.productName} loading="lazy" decoding="async" className={`w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.05] ${cut ? 'un-cut p-5' : 'p-2'}`} onError={(e) => { e.currentTarget.src = '/assets/logo.webp'; }} />
        </div>
      </div>
      <div className="px-3.5 pt-3 pb-3.5 flex flex-col flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-ink/60 truncate">{p.productCategory || 'UrbanNook'}{count > 1 ? ` · ${count} designs` : ''}</p>
        <h3 className="font-bold text-ink text-[15px] md:text-base leading-snug line-clamp-2 min-h-[2.6em] mt-0.5">{p.productName}</h3>
        <div className="mt-auto pt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-baseline gap-1.5 shrink-0">
            <span className="font-anton text-xl md:text-2xl text-ink">{inr(price)}</span>
            {off > 0 && <s className="text-ink/45 text-[13px] truncate">{inr(mrp)}</s>}
          </p>
          <QuickAdd p={p} inline />
        </div>
      </div>
    </Link>
  );
};

export default HomeProductCard;
export { inr, firstVariant, productImg, productHref };
