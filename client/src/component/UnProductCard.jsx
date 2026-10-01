import { useNavigate } from 'react-router-dom';
import WishlistButton from './WishlistButton';
import FitTitle from './FitTitle';
import { trackSelectItem } from '../utils/analytics';
import tailwindConfig from '../../tailwind.config.js';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const firstVariant = (p) => p?.variantDetails?.[0] || {};
const productImg = (p) => firstVariant(p)?.variantImage?.[0] || p?.productImg || p?.productImage || '/assets/logo.webp';
const secondImg = (p) => p?.secondaryImages?.[0] || p?.variantDetails?.[1]?.variantImage?.[0] || null;
// Shop grid → variant list → PDP. Tapping a product card opens that
// product's variant page (/products/:id); the PDP is reached from there, per
// the product flow introduced on main. Products with a single variant still
// route through it so there is exactly one path into the PDP.
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
 * GullyLabs-style product card — real data, hover 2nd image, wishlist.
 *
 * The whole card is one tap target. It deliberately carries no quick-add
 * variant strip: that overlay sat over the bottom of the image and stopped
 * propagation, so on touch the first tap only triggered :hover, slid the strip
 * in and was swallowed — the card looked unclickable. Adding to cart happens on
 * the variant page the card links to.
 *
 * `href`, `badge` and `showWishlist` exist so a caller can reuse this exact
 * card for something that is not a whole product — the PDP's "Explore other
 * variants" row feeds it one variant at a time, and needs to link to that
 * variant's own page, mark it out of stock, and drop the wishlist heart
 * (wishlist is keyed by product, so every variant card would toggle the
 * same heart). Everything defaults to the product behaviour.
 */
const UnProductCard = ({
  p,
  index = 0,
  listId = 'grid',
  listName = 'Grid',
  href,
  badge: badgeOverride,
  showWishlist = true,
}) => {
  const navigate = useNavigate();
  const v = firstVariant(p);
  const badge = badgeOverride !== undefined ? badgeOverride : badgeOf(p);
  const img2 = secondImg(p);
  // Struck MRP + % off, same source of truth as ProductCard: the first
  // variant's own variantMrp (never a synthesised markup).
  const price = Number(p?.effectivePrice ?? v.variantPrice ?? 0);
  const mrp = Number(p?.effectiveMrp ?? v.variantMrp ?? 0);

  const go = () => {
    trackSelectItem?.({ itemId: p.productId, itemName: p.productName, itemVariant: v.variantName || '', price: v.variantPrice || 0, listId, listName, index });
    navigate(href || productHref(p));
  };

  return (
    <div onClick={go} className="gl-pcard group bg-white rounded-none border border-hair overflow-hidden flex flex-col h-full cursor-pointer">
      <div className="relative aspect-square overflow-hidden bg-surface">
        {badge && <span className="absolute top-2 left-2 z-10 bg-sale text-white gl-lbl text-[7px] px-1.5 py-0.5 rounded-none shadow-sm">{badge}</span>}
        {showWishlist && (
          <div className="absolute top-2.5 right-2.5 z-10" onClick={(e) => e.stopPropagation()}>
            <WishlistButton productId={p.productId} />
          </div>
        )}
        <img src={productImg(p)} alt={p.productName} loading="lazy" className="gl-img w-full h-full object-cover" onError={(e) => { e.currentTarget.src = '/assets/logo.webp'; }} />
        {img2 && <img src={img2} alt="" className="gl-img2 absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
      </div>
      <div className="p-3.5 flex flex-col flex-1 min-w-0">
        <div className="h-5 flex items-center">
          <FitTitle
            text={p.productName}
            capPx={14}
            floorPx={9}
            fontFamily={tailwindConfig.theme.extend.fontFamily.inter.join(', ')}
            className="font-bold text-ink"
          />
        </div>
        {/* Price, then the % off / struck-MRP stack sitting right next to it
            (gap-1.5, no space-between spread) — smaller text on the stack. */}
        <div className="mt-auto pt-2 flex items-center gap-1.5">
          <span className="text-[15px] text-ink font-extrabold">{inr(price)}</span>
          {mrp > price && (
            <div className="flex flex-col leading-tight">
              <span className="gl-lbl text-[8px] text-sale">{Math.round(((mrp - price) / mrp) * 100)}% off</span>
              <span className="text-[10px] text-sale line-through">{inr(mrp)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnProductCard;
export { inr, firstVariant, productImg, productHref };
