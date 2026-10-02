import { useNavigate } from 'react-router-dom';
import WishlistButton from './WishlistButton';
import { trackSelectItem } from '../utils/analytics';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const firstVariant = (p) => p?.variantDetails?.[0] || {};
const productImg = (p) => firstVariant(p)?.variantImage?.[0] || p?.productImg || p?.productImage || '/assets/logo.webp';
const secondImg = (p) => p?.secondaryImages?.[0] || p?.variantDetails?.[1]?.variantImage?.[0] || null;
const productHref = (p) => `/products/${p.productId}`;
const badgeOf = (p) => {
  const t = p?.tags || [];
  if (t.includes('best_seller')) return 'Bestseller';
  if (t.includes('trending')) return 'Trending';
  if (t.includes('new_arrival')) return 'New';
  if (t.includes('featured')) return 'Featured';
  return null;
};

/**
 * Home-page-only product card. A dedicated copy of UnProductCard rather
 * than a shared-with-a-prop variant, so Home can be tuned (and re-tuned)
 * freely without ANY risk to how PDP's "You may also like" row or the All
 * Products grid render — those two keep using UnProductCard, completely
 * untouched.
 *
 * Layout: category label → title (up to 2 lines, fixed min-height so it
 * never depends on how long the name is) → price + struck MRP on one line
 * → "X% OFF" on its own line below. The title's reserved min-height is
 * what keeps every card's price at the same Y across a stretched row —
 * unlike a single-line title pinned to the bottom with margin-auto, there's
 * no leftover space for a taller sibling card to push into, so a flush,
 * even-height row (items-stretch) never grows a dead gap under the title.
 */
const HomeProductCard = ({ p, index = 0, listId = 'grid', listName = 'Grid' }) => {
  const navigate = useNavigate();
  const v = firstVariant(p);
  const badge = badgeOf(p);
  const img2 = secondImg(p);
  const price = Number(p?.effectivePrice ?? v.variantPrice ?? 0);
  const mrp = Number(p?.effectiveMrp ?? v.variantMrp ?? 0);

  const go = () => {
    trackSelectItem?.({ itemId: p.productId, itemName: p.productName, itemVariant: v.variantName || '', price: v.variantPrice || 0, listId, listName, index });
    navigate(productHref(p));
  };

  return (
    <div onClick={go} className="gl-pcard group bg-white rounded-none border border-hair overflow-hidden flex flex-col h-full cursor-pointer">
      <div className="relative aspect-square overflow-hidden bg-surface">
        {badge && <span className="absolute top-2 left-2 z-10 bg-sale text-white gl-lbl text-[9px] px-2 py-1 rounded-md shadow-sm">{badge}</span>}
        <div className="absolute top-2.5 right-2.5 z-10" onClick={(e) => e.stopPropagation()}>
          <WishlistButton productId={p.productId} />
        </div>
        <img src={productImg(p)} alt={p.productName} loading="lazy" className="gl-img w-full h-full object-cover" onError={(e) => { e.currentTarget.src = '/assets/logo.webp'; }} />
        {img2 && <img src={img2} alt="" className="gl-img2 absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
      </div>
      <div className="p-3.5 flex flex-col flex-1 min-w-0">
        <span className="gl-lbl text-[10px] text-sale">{p.productCategory || 'Urban Nook'}</span>
        <h3 className="font-bold text-ink text-[15px] leading-snug line-clamp-2 min-h-[2.4em] mt-0.5">
          {p.productName}
        </h3>
        <div className="mt-1.5 flex items-baseline flex-wrap gap-x-2 gap-y-0.5">
          <span className="text-[17px] text-ink font-extrabold">{inr(price)}</span>
          {mrp > price && <span className="text-[13px] text-faint line-through">{inr(mrp)}</span>}
        </div>
        {mrp > price && (
          <span className="gl-lbl text-[10px] text-sale mt-0.5">{Math.round(((mrp - price) / mrp) * 100)}% off</span>
        )}
      </div>
    </div>
  );
};

export default HomeProductCard;
export { inr, firstVariant, productImg, productHref };
