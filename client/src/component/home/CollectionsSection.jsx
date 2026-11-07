import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Reveal, Stagger, StaggerItem } from '../motion';
import { useGetCategoriesQuery } from '../../store/api/productsApi';
import { COLLECTIONS as C } from '../../content/homeRedesign';
import { designsLabel } from '../../utils/designsLabel';
import { imageCandidates } from '../../utils/collectionImage';
import RailProgress from './RailProgress';

const SUBS_SHOWN = 3;
/** Walks the candidate list: if one fails to load, the next is tried, ending on the logo. */
const TileImage = ({ sources }) => {
  const [i, setI] = useState(0);
  return <img src={sources[Math.min(i, sources.length - 1)]} alt="" loading="lazy" decoding="async" className="rd-card-photo w-full h-full object-cover" onError={() => setI((n) => n + 1)} />;
};

const CollectionCard = ({ c, products }) => {
  const subs = (c.subcategories || []).map((s) => s.name);
  const extra = subs.length - SUBS_SHOWN;
  return (
    <Link to={`/category/${c.slug}`} className="rd-card rd-col-card group block" aria-label={`${c.name} - ${designsLabel(c.itemCount)}`}>
      <div className="rd-card-img rd-col-img relative overflow-hidden bg-ink">
        <TileImage sources={imageCandidates(c, products)} />
        <div className="rd-col-shade absolute inset-0" aria-hidden="true" />
        <span className="rd-arrow absolute top-3 right-3 grid place-items-center bg-paper text-ink"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 11 11 3M4.5 3H11v6.5" /></svg></span>
        <div className="rd-col-cap absolute left-0 right-0 bottom-0 text-paper">
          <p className="rd-col-count font-mono uppercase text-paper/70">{designsLabel(c.itemCount)}</p>
          <h3 className="rd-col-name font-archivo text-paper">{c.name}</h3>
          {subs.length > 0 && (
            <p className="rd-col-subs font-inter text-paper/70">
              {subs.slice(0, SUBS_SHOWN).join(' · ')}{extra > 0 && ` · ${C.moreSubs.replace('{n}', extra)}`}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
};

/** Homepage "Shop by collection": the admin's categories (never a hand-typed list), each leading to /category/<slug>
 *  and from there to its sub-categories → products → variants. Hidden when there are fewer than C.min to show. */
const CollectionsSection = ({ products = [] }) => {
  const { data, isLoading } = useGetCategoriesQuery();
  const list = (data?.data || []).filter((c) => c.kind === 'category' && c.itemCount > 0).slice(0, C.max);
  if (!isLoading && list.length < C.min) return null;
  const [countA, countB] = C.count;
  return (
    <section className="rd-gift rd-col bg-paper text-ink">
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
      {isLoading
        ? <div className="rd-grid">{[...Array(4)].map((_, i) => <div key={i} className="rd-card-img bg-hair animate-pulse" />)}</div>
        : <><Stagger className="rd-grid" stagger={0.06}>{list.map((c) => <StaggerItem key={c.slug}><CollectionCard c={c} products={products} /></StaggerItem>)}</Stagger><RailProgress /></>}
    </section>
  );
};

export default CollectionsSection;
