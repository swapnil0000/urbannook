import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import WishlistButton from './WishlistButton';
import { addItem } from '../store/slices/cartSlice';
import { trackSelectItem, trackAddToCart } from '../utils/analytics';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const firstVariant = (p) => p?.variantDetails?.[0] || {};
const productImg = (p) => firstVariant(p)?.variantImage?.[0] || p?.productImg || p?.productImage || '/assets/logo.webp';
const secondImg = (p) => p?.secondaryImages?.[0] || p?.variantDetails?.[1]?.variantImage?.[0] || null;
const productHref = (p) => {
  const sku = firstVariant(p)?.sku;
  return sku ? `/product/${p.productId}/${sku}` : `/product/${p.productId}`;
};
const badgeOf = (p) => {
  const t = p?.tags || [];
  if (t.includes('best_seller')) return 'Bestseller';
  if (t.includes('trending')) return 'Trending';
  if (t.includes('new_arrival')) return 'New';
  if (t.includes('featured')) return 'Featured';
  return null;
};

/** GullyLabs-style product card — real data, hover 2nd image, quick-add variants, wishlist. */
const UnProductCard = ({ p, index = 0, listId = 'grid', listName = 'Grid' }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const v = firstVariant(p);
  const badge = badgeOf(p);
  const img2 = secondImg(p);
  const variants = (p?.variantDetails || []).slice(0, 5);

  const go = () => {
    trackSelectItem?.({ itemId: p.productId, itemName: p.productName, itemVariant: v.variantName || '', price: v.variantPrice || 0, listId, listName, index });
    navigate(productHref(p));
  };
  const addVariant = (variant, e) => {
    e?.stopPropagation();
    dispatch(addItem({
      id: p.productId, mongoId: p.productId, name: p.productName,
      price: variant.variantPrice, image: variant.variantImage?.[0], quantity: 1, selectedVariant: variant.variantName,
    }));
    trackAddToCart?.({ itemId: p.productId, itemName: p.productName, itemVariant: variant.variantName || '', price: variant.variantPrice || 0, quantity: 1 });
  };

  return (
    <div onClick={go} className="gl-pcard group bg-white rounded-none border border-hair overflow-hidden flex flex-col h-full cursor-pointer">
      <div className="relative aspect-square overflow-hidden bg-surface">
        {badge && <span className="absolute top-3 left-3 z-10 bg-sale text-white gl-lbl text-[9px] px-2 py-1 rounded-none shadow-sm">{badge}</span>}
        <div className="absolute top-2.5 right-2.5 z-10" onClick={(e) => e.stopPropagation()}>
          <WishlistButton productId={p.productId} />
        </div>
        <img src={productImg(p)} alt={p.productName} loading="lazy" className="gl-img w-full h-full object-cover" onError={(e) => { e.currentTarget.src = '/assets/logo.webp'; }} />
        {img2 && <img src={img2} alt="" className="gl-img2 absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
        {variants.length > 0 && (
          <div className="gl-qa absolute inset-x-0 bottom-0 z-20 p-2.5 bg-white/95 backdrop-blur border-t border-hair flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-1.5 flex-1 flex-wrap">
              {variants.map((vr, i) => (
                <button key={i} title={vr.variantName} onClick={(e) => addVariant(vr, e)}
                  className="w-6 h-6 rounded-full overflow-hidden border border-hair bg-cover bg-center gl-press"
                  style={{ backgroundImage: vr.variantImage?.[0] ? `url('${vr.variantImage[0]}')` : undefined }} />
              ))}
            </div>
            <button title="Quick add" onClick={(e) => addVariant(v, e)} className="w-9 h-9 rounded-none bg-brand text-white grid place-items-center shrink-0 gl-press hover:bg-brandHi">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          </div>
        )}
      </div>
      <div className="p-3.5 flex flex-col flex-1">
        <span className="gl-lbl text-[10px] text-faint">{p.productCategory || 'Urban Nook'}</span>
        <p className="font-bold text-sm leading-snug line-clamp-2 min-h-[2.75em] mt-1">{p.productName}</p>
        <div className="mt-auto pt-2 flex items-center gap-2">
          <span className="font-extrabold">{inr(v.variantPrice)}</span>
        </div>
      </div>
    </div>
  );
};

export default UnProductCard;
export { inr, firstVariant, productImg, productHref };
