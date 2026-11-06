import { Link } from 'react-router-dom';
import { COLLECTIONS as C } from '../content/homeRedesign';
import { designsLabel } from '../utils/designsLabel';

/** Level 2 of the shop hierarchy: the sub-categories of the open category, with the current one marked.
 *  Read from the category API (never typed here); renders nothing when the category has none. */
const SubcategoryRow = ({ slug, subcategories, active }) => {
  if (!subcategories?.length) return null;
  return (
    <nav className="rd-subrow" aria-label={C.subRow.label}>
      <p className="rd-subrow-label font-mono uppercase text-muted">{C.subRow.label}</p>
      <div className="rd-subrow-list">
        <Link to={`/category/${slug}`} className="rd-subchip rd-subchip-all font-inter" aria-current={active ? undefined : 'page'}>
          <span className="rd-subchip-name">{C.subRow.all}</span>
        </Link>
        {subcategories.map((s) => (
          <Link key={s.slug} to={`/category/${slug}/${s.slug}`} className="rd-subchip font-inter" aria-current={s.slug === active ? 'page' : undefined}>
            {s.image && <img src={s.image} alt="" loading="lazy" className="rd-subchip-img" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
            <span>
              <span className="rd-subchip-name">{s.name}</span>
              <span className="rd-subchip-n font-mono uppercase">{designsLabel(s.itemCount)}</span>
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default SubcategoryRow;
