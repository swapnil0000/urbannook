import { Link } from 'react-router-dom';
import FestiveCountdown from './FestiveCountdown';
import { useSiteCampaign, THEME_COPY } from '../../hooks/useSiteCampaign';
import { STORE_PROMISES } from '../../utils/storePromises';
import { isVariantOutOfStock } from '../../utils/variantStock';
import { maxDiscountPercent } from '../../utils/festiveDeals';

// One headline per campaign theme; a theme with no entry shows no band.
const HEADLINES = { diwali: 'Diwali Sale' };

// Up to three in-stock, discounted products (biggest markdown first) for the
// band's photo stack: real catalogue images, real discounts.
const topDeals = (products = []) => products
  .map((p) => {
    const v = (p?.variantDetails || []).find((x) => x && x.isActive !== false && !isVariantOutOfStock(x) && Number(x.variantMrp) > Number(x.variantPrice));
    if (!v || !v.variantImage?.[0]) return null;
    return { id: p.productId, name: p.productName, img: v.variantImage[0], off: Math.round(((v.variantMrp - v.variantPrice) / v.variantMrp) * 100) };
  })
  .filter(Boolean)
  .sort((a, b) => b.off - a.off)
  .slice(0, 3);

/**
 * Full-width festive offer band for the home page, right under the hero, so
 * the sale is the first thing you read after the drop. UrbanNook's own look:
 * ink band, warm glow, red accent, mono label. Shows only while a campaign is
 * live on this page (admin's section-accents switch) and disappears by itself
 * when it ends; the countdown follows admin's end date.
 */
const FestiveOfferBand = ({ products = [] }) => {
  const { active, can, themeKey } = useSiteCampaign();
  const headline = HEADLINES[themeKey];
  if (!active || !can('sectionAccents') || !headline) return null;
  const copy = THEME_COPY[themeKey] || {};
  const upTo = maxDiscountPercent(products);
  const deals = topDeals(products);

  return (
    // Header of the home offers section (ComboOfferSection `lead`): the sale,
    // its real biggest markdowns and the combo offers sit in ONE block, so the
    // page no longer shows two "Diwali" sections saying the same thing.
    <div className="relative mx-auto grid max-w-[1100px] items-center gap-6 px-4 sm:px-6 md:grid-cols-[1.1fr_1fr] md:gap-10">
      <div className="min-w-0 text-left">
        <span className="inline-flex items-center gap-2 gl-lbl text-[10px] text-star tracking-[0.18em]">
          <span className="h-1.5 w-1.5 rounded-full bg-star motion-safe:animate-pulse" aria-hidden="true" />
          {headline} · live
        </span>
        <h2 className="mt-2 font-anton uppercase text-[34px] leading-[0.95] tracking-tight text-paper sm:text-5xl md:text-6xl">{copy.offersTitle || headline}</h2>
        {copy.bandLine && <p className="mt-3 max-w-md text-[15px] leading-snug text-paper/80 md:text-lg">{copy.bandLine}</p>}
        <p className="mt-2 gl-lbl text-[9.5px] text-star sm:text-[10px]">✦ {STORE_PROMISES[0]} ✦ {STORE_PROMISES[1].split(' · ')[0]}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          {upTo > 0 && <span className="rounded-full bg-sale px-3.5 py-1.5 text-[15px] font-extrabold leading-none text-white md:text-lg">Up to {upTo}% OFF</span>}
          <FestiveCountdown tone="light" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Link to="/offers" className="gl-press inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brandHi">See all offers <span aria-hidden="true">→</span></Link>
          <Link to="/products" className="gl-press inline-flex h-11 items-center gap-2 rounded-xl border border-white/30 px-5 text-sm font-bold text-paper hover:border-white">{copy.bandCta || 'Shop the sale'}</Link>
        </div>
      </div>

      {/* biggest real markdowns; each tile opens that product */}
      {deals.length > 0 && (
        <div>
          <p className="mb-2 gl-lbl text-[10px] text-paper/60">{copy.bandTitle || 'Biggest price drops'}</p>
          <ul className="grid grid-cols-3 gap-2.5 list-none m-0 p-0 sm:gap-3">
            {deals.map((d) => (
              <li key={d.id}>
                <Link to={`/products/${d.id}`} className="group relative block aspect-[3/4] overflow-hidden border border-white/15 bg-white/5">
                  <img src={d.img} alt={d.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(e) => { e.currentTarget.src = '/assets/logo.webp'; }} />
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-sale px-2 py-0.5 text-[10.5px] font-extrabold text-white sm:text-[11px]">{d.off}% OFF</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FestiveOfferBand;
