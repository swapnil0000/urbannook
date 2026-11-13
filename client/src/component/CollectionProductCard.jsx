import { Link } from 'react-router-dom';
import WishlistButton from './WishlistButton';
import { productImg, inr } from './UnProductCard';
import { summarizeProduct, tagLabel, activeVariants } from '../utils/collectionSections';
import { trackSelectItem } from '../utils/analytics';

const MAX_PREVIEWS = 4;

/**
 * The one browsing card for Shop All and category pages: ONE card per parent product (its variants live on the
 * product page it opens, /products/:id). Compact by design: a square photo in a thin frame, a two-line name, the
 * price (with "From" when variants differ) and the design count. At most ONE badge: Sold out, else the product's own
 * tag (Bestseller / Trending / New / Featured); the discount is a small figure beside the price, not a label.
 *
 * layout="card" - the standard grid / rail card.
 * layout="row"  - the compact horizontal version used where a category has only 1-2 products (photo left, details and
 *                 small design previews right); it still opens the same parent product.
 *
 * Separate from UnProductCard on purpose - that one is shared by the PDP, the blog and the variants row and stays as it is.
 */
const CollectionProductCard = ({ p, index = 0, layout = 'card', listId = 'all_products', listName = 'All Products' }) => {
  const s = summarizeProduct(p);
  const off = s.mrp > s.price && s.price > 0 ? Math.round(((s.mrp - s.price) / s.mrp) * 100) : 0;
  const badge = s.soldOut ? 'Sold out' : tagLabel(p);
  const row = layout === 'row';
  const previews = row ? activeVariants(p).map((v) => v?.variantImage?.[0]).filter(Boolean).slice(0, MAX_PREVIEWS) : [];

  return (
    <Link
      to={`/products/${p.productId}`}
      onClick={() => trackSelectItem?.({ itemId: p.productId, itemName: p.productName, itemVariant: '', price: s.price, listId, listName, index })}
      data-avoid-overlay
      className={`cpc group ${row ? 'cpc-row' : ''}`}
    >
      <span className="cpc-img">
        <img src={productImg(p)} alt={p.productName} loading="lazy" decoding="async" width="400" height="400"
          className="cpc-photo" onError={(e) => { e.currentTarget.src = '/assets/logo.webp'; }} />
        {badge && <span className={`cpc-badge font-mono uppercase ${s.soldOut ? 'cpc-badge-dark' : ''}`}>{badge}</span>}
        {!row && (
          <span className="cpc-heart" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <WishlistButton productId={p.productId} size="sm" />
          </span>
        )}
      </span>
      <span className="cpc-body">
        <span className="cpc-name font-archivo">{p.productName}</span>
        <span className="cpc-price font-inter">
          {s.from && <span className="cpc-from">From</span>}
          <span className="cpc-now">{inr(s.price)}</span>
          {off > 0 && !s.from && <span className="cpc-mrp">{inr(s.mrp)}</span>}
          {off > 0 && <span className="cpc-off font-mono">{off}% off</span>}
        </span>
        {s.designs > 0 && <span className="cpc-meta">{s.designs} {s.designs === 1 ? 'design' : 'designs'}</span>}
        {previews.length > 1 && (
          <span className="cpc-previews" aria-hidden="true">
            {previews.map((src, i) => <img key={i} src={src} alt="" loading="lazy" decoding="async" width="40" height="40" />)}
            {s.designs > previews.length && <span className="cpc-more font-mono">+{s.designs - previews.length}</span>}
          </span>
        )}
      </span>
    </Link>
  );
};

export default CollectionProductCard;
