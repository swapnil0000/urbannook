import { Link } from 'react-router-dom';
import WishlistButton from './WishlistButton';
import SaleTag from './festive/SaleTag';
import StockStatus from './StockStatus';
import { allActiveVariantsOOS } from '../utils/variantStock';
import { trackSelectItem } from '../utils/analytics';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const firstVariant = (p) => p?.variantDetails?.[0] || {};
const productImg = (p) => firstVariant(p)?.variantImage?.[0] || p?.productImg || p?.productImage || '/assets/logo.webp';
const secondImg = (p) => p?.secondaryImages?.[0] || p?.variantDetails?.[1]?.variantImage?.[0] || null;
// Shop grid → variant list → PDP. Tapping a product card opens that
// product's variant page (/products/:id); the PDP is reached from there, per
// the product flow introduced on main. Products with a single variant still
// route through it so there is exactly one path into the PDP. (That page's
// canonical is /product/<id>, so search engines treat it as the product.)
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
  demand = null, // 'most-bought' | 'trending' (from real sales, see demandChips)
  recentSalesUnits = 0, // exact 7-day units for this product's top matching variants
  offerLine = null, // [{ text, title }] live combo benefits (utils/productOfferLines.js)
}) => {
  const v = firstVariant(p);
  const soldOut = allActiveVariantsOOS(p);
  const badge = badgeOverride !== undefined ? badgeOverride : badgeOf(p);
  const soldLast7Days = Number(recentSalesUnits || 0);
  const img2 = secondImg(p);
  // Struck MRP + % off, same source of truth as ProductCard: the first
  // variant's own variantMrp (never a synthesised markup).
  const price = Number(p?.effectivePrice ?? v.variantPrice ?? 0);
  const mrp = Number(p?.effectiveMrp ?? v.variantMrp ?? 0);

  // A real <a href> (not a div with onClick) so search engines can follow
  // every card to its product page; navigation is still client-side.
  const track = () => {
    trackSelectItem?.({ itemId: p.productId, itemName: p.productName, itemVariant: v.variantName || '', price: v.variantPrice || 0, listId, listName, index });
  };

  return (
    <Link to={href || productHref(p)} onClick={track} className="gl-pcard group bg-white rounded-none border border-hair overflow-hidden flex flex-col h-full cursor-pointer">
      <div className="relative aspect-square overflow-hidden bg-surface">
        {/* A real-sales chip beats an admin tag: it is the more useful signal */}
        {demand ? (
          <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-ink shadow-md md:text-[11px]">
            <span aria-hidden="true">{demand === 'most-bought' ? '★' : '🔥'}</span>
            {demand === 'most-bought' ? 'Most bought' : 'Trending now'}
          </span>
        ) : badge && <span className="absolute top-2 left-2 z-10 bg-sale text-white gl-lbl text-[7px] px-1.5 py-0.5 rounded-none shadow-sm">{badge}</span>}
        {soldLast7Days > 0 && (
          <span title={`${soldLast7Days.toLocaleString('en-IN')} units sold in the last 7 days`} className={`absolute ${demand || badge ? 'top-10' : 'top-2'} left-2 right-12 z-10 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold leading-tight text-ink shadow-md md:text-[11px]`}>
            <span aria-hidden="true">🔥</span>
            {soldLast7Days.toLocaleString('en-IN')} sold in last 7 days
          </span>
        )}
        {showWishlist && (
          <div className="absolute top-2.5 right-2.5 z-10" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <WishlistButton productId={p.productId} />
          </div>
        )}
        <img src={productImg(p)} alt={p.productName} loading="lazy" decoding="async" className="gl-img w-full h-full object-cover" onError={(e) => { e.currentTarget.src = '/assets/logo.webp'; }} />
        {img2 && <img src={img2} alt="" loading="lazy" decoding="async" className="gl-img2 absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
        {/* Sold out wins the pill slot; otherwise % off — the first thing the eye lands on */}
        {soldOut ? (
          <span className="absolute bottom-2 left-2 z-10 rounded-full bg-ink px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide text-white shadow-sm md:text-[11.5px]">Sold out</span>
        ) : mrp > price && (
          <span className="absolute bottom-2 left-2 z-10 rounded-full bg-sale px-2 py-0.5 text-[10.5px] font-extrabold text-white shadow-sm md:text-[11.5px]">
            {Math.round(((mrp - price) / mrp) * 100)}% OFF
          </span>
        )}
      </div>
      <div className="p-2.5 md:p-3 flex flex-col flex-1 min-w-0">
        {/* A live offer on this product beats the generic sale tag: one short
            line (soft red tint, red text + accent bar) so it is the first thing read. */}
        {offerLine?.length ? (
          <span className="mb-1.5 flex flex-col items-start gap-1">
            {offerLine.slice(0, 2).map((o) => (
              <span key={o.title} title={o.title} className="inline-flex max-w-full items-start gap-1 rounded-r-sm border-l-[3px] border-brand bg-brand/[0.08] px-2 py-1 text-[10.5px] font-bold leading-tight text-saleDeep md:text-[11.5px]">
                {/* full text, wraps to a 2nd line instead of being cut off */}
                <span aria-hidden="true">🎁</span><span className="break-words">{o.text}</span>
              </span>
            ))}
            {offerLine.length > 2 && <span className="text-[10.5px] font-bold text-brand">+{offerLine.length - 2} more offer{offerLine.length > 3 ? 's' : ''}</span>}
          </span>
        ) : <SaleTag className="mb-1.5 self-start" />}
        {/* Two lines, then an ellipsis; min-h reserves both lines so a
            one-line name keeps the price at the same Y as its neighbours. */}
        <h3 title={p.productName} className="font-bold text-ink text-[13px] md:text-[14px] leading-snug line-clamp-2 min-h-[2.75em] break-words">{p.productName}</h3>
        {/* Price with the struck MRP right next to it. Sits right under the
            title (mt-1.5, not mt-auto) so it never gets stretched away from
            it when a taller sibling card in the same row forces this card to
            grow — that used to leave a big dead gap between title and price. */}
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-[15px] md:text-[17px] text-ink font-extrabold">{inr(price)}</span>
          {mrp > price && <span className="text-[11px] md:text-xs text-faint line-through">{inr(mrp)}</span>}
        </div>
        <StockStatus outOfStock={soldOut} className="mt-1.5" />
      </div>
    </Link>
  );
};

export default UnProductCard;
export { inr, firstVariant, productImg, productHref };
