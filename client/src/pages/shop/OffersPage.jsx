import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SEOHead from '../../component/SEOHead';
import SortMenu from '../../component/SortMenu';
import { OfferCard } from '../../component/ComboOfferSection';
import CouponOffersSection from '../../component/offers/CouponOffersSection';
import FestiveCountdown from '../../component/festive/FestiveCountdown';
import { useGetHomeComboOffersQuery } from '../../store/api/userApi';
import { useGetProductsQuery } from '../../store/api/productsApi';
import { useSiteCampaign, THEME_COPY } from '../../hooks/useSiteCampaign';
import { OFFER_SORTS, sortOffers } from '../../utils/offerSort';

/**
 * Every live offer in one place. Each card opens the same chooser the home
 * page uses (ComboBuilderSheet: pick the designs the offer allows); confirming
 * adds them to the cart through the same logic and goes straight on to
 * checkout, where the usual payment options appear. With 10–15 offers live,
 * this is where a shopper can actually compare them.
 */
const OffersPage = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useGetHomeComboOffersQuery();
  // Same args as header/home: a cache hit, used only for the "Trending" sort.
  const { data: prodRes } = useGetProductsQuery({ page: 1, limit: 24 });
  const { active, can, themeKey } = useSiteCampaign();
  const [sort, setSort] = useState('featured');

  useEffect(() => { window.scrollTo(0, 0); }, []);
  // Every offer here ends at checkout: fetch that page's code while the
  // shopper is still choosing, so "Add" → payment options doesn't wait on it.
  useEffect(() => {
    const t = setTimeout(() => import('../index.js').then((m) => m.CheckoutPage?.preload?.()), 1500);
    return () => clearTimeout(t);
  }, []);

  const productsById = useMemo(() => {
    const list = prodRes?.data?.listofPublishedProducts || prodRes?.data?.products || [];
    return new Map(list.map((p) => [p.productId, p]));
  }, [prodRes]);
  const combos = useMemo(() => sortOffers(data?.data?.combos || [], sort, productsById), [data, sort, productsById]);

  const festive = active && can('sectionAccents');
  const copy = THEME_COPY[themeKey] || {};
  const goCheckout = () => navigate('/checkout');

  return (
    <div className="font-inter bg-surface text-ink min-h-screen">
      <SEOHead
        title="Offers & Combos"
        url="/offers"
        description="All live UrbanNook offers in one place: combo deals, free stands and gifts, and coupons on 3D-printed lamps, anime katanas and décor."
      />

      <div className="max-w-[1280px] mx-auto px-5 pt-10">
        <p className="gl-lbl text-[11px] text-brand">{festive ? copy.eyebrow || 'Festive offers' : 'Live offers'}</p>
        <h1 className="mt-1 text-4xl md:text-5xl font-extrabold tracking-tight">{festive ? copy.offersTitle || 'Offers' : 'Offers & Combos'}</h1>
        <p className="text-muted mt-2 max-w-xl">Pick an offer, choose your designs, and checkout. The discount is applied for you, no code needed.</p>
        {festive && <div className="mt-3"><FestiveCountdown tone="dark" /></div>}
      </div>

      <section className="max-w-[1280px] mx-auto px-5 py-8">
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="whitespace-nowrap text-xs text-muted sm:text-sm">{combos.length} {combos.length === 1 ? 'offer' : 'offers'} live</p>
          <SortMenu value={sort} options={OFFER_SORTS} onChange={setSort} />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <div key={i} className="aspect-[4/5] bg-hair animate-pulse" />)}</div>
        ) : combos.length === 0 ? (
          <div className="text-center py-20 border border-hair bg-white">
            <p className="font-extrabold text-lg">No combo offers right now</p>
            <p className="text-muted mt-1 text-sm">Coupons below still apply at checkout.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {combos.map((c) => (
              <OfferCard key={c.id} combo={c} festive={festive} priceLabel={copy.priceLabel} onAdded={goCheckout} />
            ))}
          </div>
        )}
      </section>

      <section className="max-w-[1280px] mx-auto px-5 pb-28">
        <CouponOffersSection />
      </section>
    </div>
  );
};

export default OffersPage;
