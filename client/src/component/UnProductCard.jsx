import { useNavigate } from 'react-router-dom';
import OptimizedImage from './OptimizedImage';
import WishlistButton from './WishlistButton';
import { trackSelectItem } from '../utils/analytics';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const firstVariant = (p) => p?.variantDetails?.[0] || {};
const productImg = (p) => firstVariant(p)?.variantImage?.[0] || p?.productImg || p?.productImage || '/assets/logo.webp';
const productHref = (p) => {
  const sku = firstVariant(p)?.sku;
  return sku ? `/product/${p.productId}/${sku}` : `/product/${p.productId}`;
};
const badgeOf = (p) => {
  const t = p?.tags || [];
  if (t.includes('best_seller')) return 'Best Seller';
  if (t.includes('new_arrival')) return 'New';
  if (t.includes('trending')) return 'Trending';
  if (t.includes('featured')) return 'Featured';
  return null;
};

/** Editorial 3D-tilt product card (cream/ink/red). Reused on Home + Shop. */
const UnProductCard = ({ p, index = 0, listId = 'grid', listName = 'Grid' }) => {
  const navigate = useNavigate();
  const v = firstVariant(p);
  const badge = badgeOf(p);
  const go = () => {
    trackSelectItem?.({
      itemId: p.productId, itemName: p.productName, itemVariant: v.variantName || '',
      price: v.variantPrice || 0, listId, listName, index,
    });
    navigate(productHref(p));
  };
  return (
    <article className="un-card group relative flex flex-col bg-white border border-un-line" style={{ transitionDelay: `${(index % 8) * 55}ms` }}>
      <div className="relative aspect-square overflow-hidden bg-un-ink">
        {badge && (
          <span className="absolute top-3 left-3 z-[3] bg-un-red text-white font-mono text-[10px] tracking-[0.14em] uppercase font-semibold px-2.5 py-1">{badge}</span>
        )}
        <div className="absolute top-2.5 right-2.5 z-[3]"><WishlistButton productId={p.productId} /></div>
        <button onClick={go} className="block w-full h-full" aria-label={p.productName}>
          <OptimizedImage src={productImg(p)} alt={p.productName}
            className="w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.07]" />
        </button>
        <span className="un-glare" />
      </div>
      <div className="flex flex-col gap-2 p-4 flex-1" style={{ transform: 'translateZ(24px)' }}>
        <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-un-grey">{p.productCategory || 'Urban Nook'}</span>
        <button onClick={go} className="text-left font-archivo font-extrabold uppercase text-[15px] leading-tight text-un-ink hover:text-un-red transition-colors line-clamp-2">
          {p.productName}
        </button>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-mono font-semibold text-un-red">{inr(v.variantPrice)}</span>
          <button onClick={go} className="un-btn font-archivo font-extrabold text-[11px] tracking-[0.06em] uppercase border-2 border-un-ink px-3.5 py-2 text-un-ink hover:text-white transition-colors">
            <span className="un-fill bg-un-red" />View
          </button>
        </div>
      </div>
    </article>
  );
};

export default UnProductCard;
export { inr, firstVariant, productImg, productHref };
