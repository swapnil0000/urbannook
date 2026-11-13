import { Link } from 'react-router-dom';

/**
 * Design / variant choices as small photo + name tiles. Every tile is a real link to that variant's own URL (crawlable);
 * a normal click stays on the page and swaps the variant in place through `onSelect`. Sold-out designs stay selectable
 * (the buy area then offers "Notify me") but are dimmed and labelled.
 */
const VariantChoices = ({ label, variants, selectedName, productId, shortNames, isSoldOut, onSelect, onImgErr }) => {
  if (!variants || variants.length < 2) return null;
  const selected = variants.find((v) => v.variantName === selectedName);
  // in stock first, sold out after
  const ordered = [...variants].sort((a, b) => Number(isSoldOut(a)) - Number(isSoldOut(b)));
  return (
    <div className="pdp-variants" role="group" aria-label={label}>
      <p className="pdp-label font-mono uppercase">
        {label}: <span className="pdp-label-val">{shortNames.get(selectedName) || selected?.variantName || selectedName}</span>
      </p>
      <ul className="pdp-vlist">
        {ordered.map((v) => {
          const on = v.variantName === selectedName;
          const out = isSoldOut(v);
          const name = shortNames.get(v.variantName) || v.variantName;
          return (
            <li key={v.sku || v.variantName}>
              <Link
                to={v.sku ? `/product/${productId}/${v.sku}` : `/product/${productId}`}
                onClick={(e) => { e.preventDefault(); onSelect(v); }}
                aria-current={on ? 'true' : undefined}
                title={v.variantName}
                className={`pdp-vtile${on ? ' is-on' : ''}${out ? ' is-out' : ''}`}
              >
                <span className="pdp-vimg">
                  {v.variantImage?.[0] ? <img src={v.variantImage[0]} alt="" loading="lazy" decoding="async" draggable="false" onError={onImgErr} /> : null}
                </span>
                <span className="pdp-vname font-archivo">{name}</span>
                {out && <span className="pdp-vsold font-mono uppercase">Sold out</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default VariantChoices;
