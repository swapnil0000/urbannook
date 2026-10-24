import { Link } from 'react-router-dom';
import ComboOfferSection from '../ComboOfferSection';
import FestiveCountdown from './FestiveCountdown';
import SectionDecor from './SectionDecor';
import CouponOffersSection from '../offers/CouponOffersSection';
import { useSiteCampaign, THEME_COPY } from '../../hooks/useSiteCampaign';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

/**
 * Admin-picked gifting/"festive favourites" products (admin → Festive →
 * Sections: specific products and/or whole categories, capped). The server
 * resolves them and only returns sellable products; the optional offer badge is
 * the NAME of the linked, currently-live promotion — no discount or shipping
 * claim is written here. Prices shown are plain current prices ("From ₹X").
 */
const GiftingSection = ({ section }) => {
  const { can, themeKey } = useSiteCampaign();
  const copy = THEME_COPY[themeKey] || {};
  const accents = can('sectionAccents');

  return (
    <section
      className="relative overflow-hidden bg-surface pt-14 pb-14 sm:pt-20 sm:pb-20"
      aria-label={section.title || 'Festive favourites'}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-star/60 to-transparent" aria-hidden="true" />
      <SectionDecor />

      <div className="relative z-10 px-4 lg:px-12 mb-8 text-center">
        <span className="inline-flex items-center gap-2 gl-lbl text-[11px] text-sale tracking-[0.18em]">
          <span aria-hidden="true">✦</span> {copy.eyebrow || 'Festive Favourites'} <span aria-hidden="true">✦</span>
        </span>
        <h2 className="font-archivo font-extrabold text-[28px] sm:text-4xl leading-tight text-ink mt-2">{section.title || 'Gifts they will remember'}</h2>
        {section.subtitle && <p className="text-muted text-sm sm:text-base mt-2 max-w-xl mx-auto">{section.subtitle}</p>}
        {section.offerLabel && (
          <span className="inline-block mt-3 bg-save text-white text-[11px] font-bold pl-3.5 pr-2.5 py-1 rounded-l-full rounded-r-md un-shine">{section.offerLabel}</span>
        )}
        {accents && <div className="mt-4 flex justify-center"><FestiveCountdown tone="dark" /></div>}
      </div>

      <ul className="relative z-10 max-w-[1200px] mx-auto px-4 lg:px-8 flex gap-3 sm:gap-4 overflow-x-auto gl-hscroll pb-2 snap-x sm:grid sm:grid-cols-3 lg:grid-cols-4 sm:overflow-visible list-none m-0">
        {section.items.map((p) => (
          <li key={p.productId} className="shrink-0 w-[44vw] sm:w-auto snap-start">
            <Link
              to={`/products/${p.productId}`}
              className="group block h-full bg-white rounded-xl overflow-hidden border-2 border-star/40 transition-all duration-300 hover:-translate-y-1 hover:border-star hover:shadow-[0_14px_34px_-12px_rgb(0_0_0/0.55)] focus-visible:-translate-y-1 focus-visible:border-star outline-none"
            >
              <div className="relative aspect-square bg-white p-2.5">
                <img
                  src={p.image || '/assets/logo.webp'}
                  alt={p.name}
                  loading="lazy"
                  className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.04]"
                  onError={(e) => { e.currentTarget.src = '/assets/logo.webp'; }}
                />
                <span className="absolute top-2 left-2 bg-ink text-star gl-lbl text-[8px] px-2 py-1 rounded-md tracking-wider">✦ GIFT PICK</span>
              </div>
              <div className="px-3 pb-3 pt-2.5">
                {p.category && <span className="gl-lbl text-[10px] text-sale">{p.category}</span>}
                <h3 className="font-archivo font-extrabold text-ink text-[15px] leading-snug line-clamp-2 min-h-[2.4em]">{p.name}</h3>
                <p className="text-[13px] text-muted mt-1">From <b className="text-ink text-[15px]">{inr(p.price)}</b></p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

/**
 * The homepage's festive sections, in the admin-configured order, below
 * Bestsellers. With no live campaign — or a campaign with no sections
 * configured — this is exactly the original single Combo Offers section, so
 * the normal storefront is unchanged.
 */
const FestiveSections = () => {
  const { active, sections, page } = useSiteCampaign();
  if (!active || page !== 'home' || sections.length === 0) return <ComboOfferSection />;

  return (
    <>
      {sections.map((s) => (s.type === 'combos'
        ? <ComboOfferSection key={s.id} title={s.title} subtitle={s.subtitle} />
        : <GiftingSection key={s.id} section={s} />))}
      {/* the coupon strip lives inside the combos section; without one, show it on its own */}
      {!sections.some((s) => s.type === 'combos') && <CouponOffersSection />}
    </>
  );
};

export default FestiveSections;
