import { Link } from 'react-router-dom';
import { inr } from '../utils/productCardData';
import './ShopProductCard.css';

// Portrait studio photos have vertical breathing room; filling the square
// removes uneven side bars. Wide photos stay contained so long products keep
// both ends visible. Reading intrinsic dimensions needs no request or render.
const fitCatalogImage = (event) => {
  const image = event.currentTarget;
  image.style.objectFit = image.naturalWidth > image.naturalHeight * 1.05 ? 'contain' : 'cover';
};

// One presentation for ordinary product and variant listings. All data and
// navigation still come from each caller's existing source and handlers.
const ShopProductCard = ({ href, onClick, title, image, secondaryImage, price, mrp, showStock = false, outOfStock = false }) => {
  const sellingPrice = Number(price || 0);
  const originalPrice = Number(mrp || 0);
  const discounted = sellingPrice > 0 && originalPrice > sellingPrice;
  const discount = discounted ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100) : 0;

  return (
    <Link to={href} onClick={onClick} className="gl-pcard shop-product-card group flex h-full min-w-0 flex-col overflow-hidden border border-hair bg-white">
      <div className="shop-product-image relative aspect-square w-full overflow-hidden bg-white">
        <img src={image} alt={title} loading="lazy" decoding="async" className="gl-img h-full w-full object-cover" onLoad={fitCatalogImage} onError={(event) => { event.currentTarget.src = '/assets/logo.webp'; }} />
        {secondaryImage && <img src={secondaryImage} alt="" loading="lazy" decoding="async" className="gl-img2 absolute inset-0 h-full w-full object-cover" onLoad={fitCatalogImage} onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
      </div>
      <div className="shop-product-details flex min-w-0 flex-1 flex-col">
        <h3 title={title} className="shop-product-title line-clamp-2 break-words text-ink">{title}</h3>
        {showStock && <span className={`shop-product-stock mt-1.5 inline-flex w-fit items-center gap-1.5 border px-1.5 py-0.5 text-[10px] font-semibold leading-tight ${outOfStock ? 'border-hair text-muted' : 'border-save/30 text-save'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${outOfStock ? 'bg-muted' : 'bg-save'}`} aria-hidden="true" />
          {outOfStock ? 'Out of stock' : 'In stock'}
        </span>}
        <div className="shop-product-price mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="shop-product-selling text-ink">{inr(sellingPrice)}</span>
          {discounted && <>
            <span className="shop-product-mrp text-faint line-through">{inr(originalPrice)}</span>
            <span className="shop-product-discount text-muted">{discount}% off</span>
          </>}
        </div>
      </div>
    </Link>
  );
};

export default ShopProductCard;
