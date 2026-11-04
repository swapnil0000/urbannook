import { Link } from 'react-router-dom';
import { Reveal, Stagger, StaggerItem } from '../motion';
import { firstVariant, productImg, productHref, inr } from '../HomeProductCard';
import { trackSelectItem } from '../../utils/analytics';
import { GIFT_EDIT as C } from '../../content/homeRedesign';

const GiftCard = ({ p, index }) => {
  const v = firstVariant(p);
  const price = Number(p?.effectivePrice ?? v.variantPrice ?? 0);
  const mrp = Number(p?.effectiveMrp ?? v.variantMrp ?? 0);
  const pct = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const track = () => trackSelectItem?.({ itemId: p.productId, itemName: p.productName, itemVariant: v.variantName || '', price: v.variantPrice || 0, listId: 'home_best', listName: 'Bestsellers', index });
  return (
    <Link to={productHref(p)} onClick={track} className="rd-card group block">
      <div className="rd-card-img relative overflow-hidden bg-surface">
        <img src={productImg(p)} alt={p.productName} loading="lazy" className="rd-card-photo w-full h-full object-cover" onError={(e) => { e.currentTarget.src = '/assets/logo.webp'; }} />
        <span className="rd-badge absolute top-3 left-3 font-mono uppercase bg-paper text-ink">{C.cardBadge}</span>
        <span className="rd-arrow absolute bottom-3 right-3 grid place-items-center bg-paper text-ink"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 11 11 3M4.5 3H11v6.5" /></svg></span>
      </div>
      <div className="rd-card-cap">
        <p className="rd-cat font-mono uppercase text-muted">{p.productCategory || C.fallbackCategory}</p>
        <h3 className="rd-name font-archivo text-ink">{p.productName}</h3>
        <div className="rd-price-row border-t border-hair font-inter text-ink">
          <span className="rd-price">{inr(price)}</span>
          {pct > 0 && <span className="rd-mrp text-muted line-through">{inr(mrp)}</span>}
          {pct > 0 && <span className="rd-off font-mono uppercase">{C.off.replace('{pct}', pct)}</span>}
        </div>
      </div>
    </Link>
  );
};

/** Homepage "Thoughtfully picked" — replaces the old Bestsellers grid; same products (tag best_seller). */
const GiftEditSection = ({ products, loading }) => {
  const list = products.slice(0, C.max);
  const [countA, countB] = C.count;
  return (
    <section className="rd-gift bg-paper text-ink">
      <Reveal className="rd-gift-head">
        <div>
          <p className="rd-eyebrow font-mono uppercase text-muted">{C.index} / {C.eyebrow}</p>
          <h2 className="rd-h2 font-archivo text-ink">{C.heading}</h2>
          <p className="rd-sub font-inter text-muted">{C.sub}</p>
        </div>
        <div className="rd-head-side">
          <p className="rd-count font-mono uppercase text-muted">
            {countA.replace('{n}', String(list.length).padStart(2, '0'))}<br />{countB}
          </p>
          <Link to={C.viewAllHref} className="rd-viewall font-inter text-ink">{C.viewAll} <span aria-hidden="true">→</span></Link>
        </div>
      </Reveal>
      {loading
        ? <div className="rd-grid">{[...Array(C.max)].map((_, i) => <div key={i} className="rd-card-img bg-hair animate-pulse" />)}</div>
        : <Stagger className="rd-grid" stagger={0.06}>{list.map((p, i) => <StaggerItem key={p.productId || i}><GiftCard p={p} index={i} /></StaggerItem>)}</Stagger>}
    </section>
  );
};

export default GiftEditSection;
