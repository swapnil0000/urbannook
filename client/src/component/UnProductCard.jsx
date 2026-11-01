import { Link } from 'react-router-dom';
import WishlistButton from './WishlistButton';
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
 * GullyLabs-style product card - real data, hover 2nd image, wishlist.
 *
 * The whole card is one tap target. It deliberately carries no quick-add
 * variant strip: that overlay sat over the bottom of the image and stopped
 * propagation, so on touch the first tap only triggered :hover, slid the strip
 * in and was swallowed - the card looked unclickable. Adding to cart happens on
 * the variant page the card links to.
 *
 * `href`, `badge` and `showWishlist` exist so a caller can reuse this exact
 * card for something that is not a whole product - the PDP's "Explore other
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
  demand = null,
  trendCount = 0, // set by the Trending sort: units sold in 30 days (the sort key) // 'most-bought' | 'trending' (from real sales, see demandChips)
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
        {showWishlist && (
          <div className="absolute top-2.5 right-2.5 z-10" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <WishlistButton productId={p.productId} />
          </div>
        )}
        <img src={productImg(p)} alt={p.productName} loading="lazy" decoding="async" className="gl-img w-full h-full object-cover" onError={(e) => { e.currentTarget.src = '/assets/logo.webp'; }} />
        {img2 && <img src={img2} alt="" loading="lazy" decoding="async" className="gl-img2 absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
        {/* Sold out wins the pill slot; otherwise % off - the first thing the eye lands on */}
        {soldOut ? (
          <span className="absolute bottom-2 left-2 z-10 rounded-full bg-ink px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide text-white shadow-sm md:text-[11.5px]">Sold out</span>
        ) : mrp > price && (
          <span className="absolute bottom-2 left-2 z-10 rounded-full bg-sale px-2 py-0.5 text-[10.5px] font-extrabold text-white shadow-sm md:text-[11.5px]">
            {Math.round(((mrp - price) / mrp) * 100)}% OFF
          </span>
        )}
      </div>
      <div className="p-2.5 md:p-3 flex flex-col flex-1 min-w-0">
        {/* Badges sit under the photo (never on it), max 3, one scrollless wrap row */}
        {(() => {
          const chips = [
            demand && (demand === 'most-bought' ? 'Most bought' : trendCount > 0 ? null : 'Trending now'),
            !demand && badge,
            // one sales line: last 7 days when that number is meaningful, else last 30 days
            soldLast7Days >= 3 ? `${soldLast7Days.toLocaleString('en-IN')} sold/7d` : trendCount > 0 ? `${trendCount.toLocaleString('en-IN')} sold/30d` : null,
          ].filter(Boolean).slice(0, 2);
          return (
            // row is always rendered (same height with or without chips) so titles line up
            <div className="mb-1.5 flex h-[18px] flex-nowrap gap-1 md:h-5">
              {chips.map((c) => <span key={c} className={`shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-tight md:text-[11px] ${/sold\//.test(c) ? 'bg-brand/10 text-saleDeep' : 'bg-ink text-paper'}`}>{c}</span>)}
            </div>
          );
        })()}
        {/* A live offer on this product beats the generic sale tag: one short
            line (soft red tint, red text + accent bar) so it is the first thing read. */}
        {/* one quiet, consistent offer line (the sale itself is announced once, at the top of the page) */}
        {/* offer row always takes the same space, so every card's title/price line up */}
        <p title={offerLine?.length ? offerLine.map((o) => o.text).join(' · ') : undefined} className="mb-1.5 h-4 truncate text-[11px] font-bold leading-4 text-saleDeep md:h-[18px] md:text-[12px] md:leading-[18px]">
          {offerLine?.length ? (offerLine.length > 1 ? `Comes with ${offerLine.length} offers` : 'Offer available') : null}
        </p>
        {/* Two lines, then an ellipsis; min-h reserves both lines so a
            one-line name keeps the price at the same Y as its neighbours. */}
        <h3 title={p.productName} className="font-bold text-ink text-[13px] md:text-[14px] leading-snug line-clamp-2 min-h-[2.75em] break-words">{p.productName}</h3>
        {/* Price with the struck MRP right next to it. Sits right under the
            title (mt-1.5, not mt-auto) so it never gets stretched away from
            it when a taller sibling card in the same row forces this card to
            grow - that used to leave a big dead gap between title and price. */}
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
