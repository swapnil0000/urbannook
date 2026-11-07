import { Link } from 'react-router-dom';
import FestiveCountdown from './FestiveCountdown';
import { useSiteCampaign, THEME_COPY } from '../../hooks/useSiteCampaign';
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
        <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.13em] text-paper/70">
          <span className="h-1.5 w-1.5 rounded-full bg-brand motion-safe:animate-pulse" aria-hidden="true" />
          {headline} · live
        </span>
        <h2 className="mt-3 font-archivo text-[38px] font-semibold leading-[1.04] tracking-[-0.06em] text-paper sm:text-5xl md:text-[54px]">{copy.offersTitle || headline}</h2>
        {copy.bandLine && <p className="mt-4 max-w-md text-[15px] leading-relaxed text-paper/75">{copy.bandLine}</p>}
        {/* the two real facts of the sale, one quiet line each: the biggest markdown and when it ends */}
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          {upTo > 0 && <p className="font-archivo text-[22px] font-semibold leading-none tracking-[-0.04em] text-paper">Up to <span className="text-brand">{upTo}%</span> off</p>}
          <FestiveCountdown tone="light" />
        </div>
        <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3">
          <Link to="/offers" className="inline-flex h-12 items-center gap-2 bg-brandHi px-6 text-[13px] font-semibold text-paper transition-colors hover:bg-brand">See all offers <span aria-hidden="true">→</span></Link>
          <Link to="/products" className="inline-flex items-center border-b border-paper/50 pb-0.5 text-[13px] font-semibold text-paper transition-colors hover:border-paper">{copy.bandCta || 'Shop the sale'}</Link>
        </div>
      </div>

      {/* biggest real markdowns; each tile opens that product */}
      {deals.length > 0 && (
        <div>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.13em] text-paper/60">{copy.bandTitle || 'Biggest price drops'}</p>
          <ul className="grid grid-cols-3 gap-2.5 list-none m-0 p-0 sm:gap-3">
            {deals.map((d) => (
              <li key={d.id}>
                <Link to={`/products/${d.id}`} className="group relative block aspect-[3/4] overflow-hidden bg-white/5">
                  <img src={d.img} alt={d.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(e) => { e.currentTarget.src = '/assets/logo.webp'; }} />
                  <span className="absolute bottom-0 left-0 bg-ink px-2 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-paper">{d.off}% off</span>
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
