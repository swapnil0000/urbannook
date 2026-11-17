import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { categoryPath, CATEGORY_LABEL } from '../../utils/categoryUrl';
import { useGetProductsQuery, useGetCategoriesQuery } from '../../store/api/productsApi';
import SEOHead from '../../component/SEOHead';
import UnProductCard, { firstVariant } from '../../component/UnProductCard';
import { toItems } from '../../utils/shopItems';
import { shopPills } from '../../utils/shopPills';
import { trackViewItemList } from '../../utils/analytics';
import RevealCard from '../../component/RevealCard';
import ScrollRow from '../../component/ScrollRow';
import SaleBanner from '../../component/festive/SaleBanner';
import { useGetHomeComboOffersQuery } from '../../store/api/userApi';
import { buildOfferLines } from '../../utils/productOfferLines';
import { ShopFilterSidebar, ShopFilterButton, ShopSort, ActiveFilterChips } from '../../component/ShopFilters';
import { useSessionState } from '../../hooks/useSessionState';
import { EMPTY_FILTERS, applyShopFilters, sortShopItems, demandChips, recentSalesChips } from '../../utils/shopFilters';

const productList = (res) => res?.data?.products || res?.data?.listofPublishedProducts || [];

const AllProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeCat, setActiveCat] = useState(searchParams.get('category') || 'All');

  const { data: productsResponse, isLoading, error } = useGetProductsQuery({ page: 1, limit: 24 });

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { setActiveCat(searchParams.get('category') || 'All'); }, [searchParams]);
  // ?tag=best_seller (footer "Bestsellers") - narrows to products carrying
  // that tag, the same tag that puts the "Bestseller" badge on a card.
  const activeTag = searchParams.get('tag');

  const products = useMemo(() => productList(productsResponse), [productsResponse]);
  // Pills = the store's real category pages (GET /categories, same list the
  // category pages use): product categories first, then collections, series
  // and games. Only indexable ones (enough items to be worth a visit).
  const { data: catRes } = useGetCategoriesQuery();
  const pills = useMemo(() => shopPills(catRes?.data || []).map((c) => ({ slug: c.slug, label: CATEGORY_LABEL[c.name] || c.name })), [catRes]);

  // Price sorting is gone with its control: with a catalogue this size the
  // whole category fits on one screen, so sorting solved a problem nobody had
  // while taking the room the categories actually needed.
  // Category/tag chips pick products; the grid then shows one card per
  // sellable variant (toItems: round-robin, sold-out last), so the card count
  // and the Availability counts match what can actually be bought.
  const chipProducts = useMemo(() => toItems(products.filter((p) =>
    (activeCat === 'All' || p.productCategory === activeCat) &&
    (!activeTag || (p.tags || []).includes(activeTag)))), [products, activeCat, activeTag]);
  // Availability / price filters: client state only, never URL params (see ShopFilters).
  const [filters, setFilters] = useSessionState('shop:all:filters', EMPTY_FILTERS);
  const [sort, setSort] = useSessionState('shop:all:sort', 'featured');
  // Live combo benefit per product, for the card's offer line (cached query).
  const { data: comboRes } = useGetHomeComboOffersQuery();
  const offerLines = useMemo(() => buildOfferLines(comboRes?.data?.combos || [], new Map(products.map((x) => [String(x.productId), x.productName]))), [comboRes, products]);
  const chips = useMemo(() => demandChips(chipProducts), [chipProducts]);
  const displayProducts = useMemo(() => sortShopItems(applyShopFilters(chipProducts, filters), sort), [chipProducts, filters, sort]);
  const recentSales = useMemo(() => recentSalesChips(displayProducts), [displayProducts]);

  useEffect(() => {
    if (displayProducts.length) trackViewItemList?.({ listName: 'All Products', listId: 'all_products', items: displayProducts.map(({ p }, i) => ({ itemId: p.productId, itemName: p.productName, price: firstVariant(p)?.variantPrice || 0, index: i })) });
  }, [displayProducts]);

  const selectCat = (c) => {
    setActiveCat(c);
    // Picking a chip leaves the bestseller view - chips are the way back out of it.
    searchParams.delete('tag');
    if (c === 'All') { searchParams.delete('category'); setSearchParams(searchParams, { replace: true }); }
    else setSearchParams({ category: c }, { replace: true });
  };

  const chip = (c) => `gl-press inline-flex min-h-[44px] items-center px-4 rounded-full border-2 font-anton uppercase tracking-wide text-[15px] transition-colors ${activeCat === c ? 'bg-forest text-lime border-forest' : 'bg-white text-ink border-ink hover:bg-lime'}`;

  return (
    <div className="font-inter bg-cream text-ink min-h-screen overflow-x-clip">
      <SEOHead title="Shop All Products" url={activeCat === 'All' ? '/products' : categoryPath(activeCat)} description="Browse UrbanNook's full collection of 3D-printed desk lamps, pen stands & décor. Made in India, fast pan-India delivery." />

      <div className="max-w-[1280px] mx-auto px-5 pt-6 md:pt-10">
        {/* same header shape as category pages (breadcrumb → title → line → pills),
            so switching between them doesn't jump the layout */}
        <nav aria-label="Breadcrumb" className="text-sm text-ink/60 mb-4 pt-2">
          <Link to="/" className="hover:text-brand">Home</Link> / <span className="text-ink">Shop</span>
        </nav>
        {/* the sale, announced once per page (no longer repeated on every card) */}
        <SaleBanner className="mb-5" />
        <h1 className="font-anton uppercase text-brand text-[clamp(2.6rem,10vw,6rem)] leading-[.88] [text-shadow:3px_3px_0_rgb(var(--gl-ink))] break-words">{activeTag === 'best_seller' ? 'Bestsellers' : 'Shop All'}</h1>
        <p className="text-ink/70 mt-3 truncate">Katanas, lamps &amp; décor. Made in India.</p>

        {/* One line, scrolled sideways - wrapping pushed the grid down a whole
            row on phones, and a category list is read across, not down.
            gl-hscroll hides the scrollbar; the negative margin lets the row
            bleed to the screen edge so the last chip is visibly cut off,
            which is what tells you there is more to swipe. */}
        <ScrollRow className="mt-6" activeKey={activeCat}>
            <button onClick={() => selectCat('All')} aria-current={activeCat === 'All' ? 'page' : undefined} className={chip('All')}>All</button>
            {/* Each pill opens that category's own page (real, indexable URL). */}
            {pills.map((c) => (
              <Link key={c.slug} to={`/category/${c.slug}`} className={chip(c.slug)}>{c.label}</Link>
            ))}
        </ScrollRow>
      </div>

      <section className="max-w-[1280px] mx-auto px-5 py-8 pb-28 flex gap-8 [overflow-anchor:none]">
        {!isLoading && !error && products.length > 0 && <ShopFilterSidebar items={chipProducts} filters={filters} setFilters={setFilters} />}
        <div className="flex-1 min-w-0">
        {!isLoading && !error && products.length > 0 && (
          <div className="mb-4 flex items-center justify-between gap-2 sm:gap-3">
            <ShopFilterButton items={chipProducts} filters={filters} setFilters={setFilters} resultCount={displayProducts.length} />
            <p className="ml-auto whitespace-nowrap text-xs text-muted sm:text-sm">{displayProducts.length} of {chipProducts.length} items</p>
            <ShopSort value={sort} onChange={setSort} />
          </div>
        )}
        <ActiveFilterChips filters={filters} setFilters={setFilters} />
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">{[...Array(8)].map((_, i) => <div key={i} className="aspect-[4/5] bg-hair animate-pulse rounded-2xl border border-hair" />)}</div>
        ) : error ? (
          <div className="text-center py-28 rounded-[24px] border-[3px] border-ink bg-white">
            <h2 className="font-anton uppercase text-3xl">Unable to load products</h2>
            <p className="text-muted mt-2">Please check your connection and try again.</p>
            <button onClick={() => window.location.reload()} className="gl-press mt-6 inline-flex min-h-[52px] items-center px-7 rounded-full border-[3px] border-ink bg-brand text-white font-anton uppercase tracking-wide text-lg shadow-[4px_4px_0_rgb(var(--gl-ink))]">Retry</button>
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="text-center py-28 rounded-[24px] border-[3px] border-ink bg-white">
            {chipProducts.length > 0 ? (
              <>
                <h2 className="font-anton uppercase text-3xl">No products match these filters</h2>
                <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="mt-3 text-sm font-bold text-brand hover:underline">Clear filters</button>
              </>
            ) : (
              <>
                <h2 className="font-anton uppercase text-3xl">Dropping soon</h2>
                <p className="text-muted mt-2">New pieces land here - check back Friday.</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {displayProducts.map(({ key, p, href, badge }, i) => (
              <RevealCard key={key} index={i}>
              <UnProductCard p={p} href={href} badge={badge} demand={sort === 'trending' ? 'trending' : chips.get(key)} trendCount={Number(p.variantDetails?.[0]?.soldRecent || 0)} recentSalesUnits={recentSales.get(key)} offerLine={offerLines.get(String(p.productId))} index={i} listId="all_products" listName="All Products" />
              </RevealCard>
            ))}
          </div>
        )}
        </div>
      </section>
    </div>
  );
};

export default AllProductsPage;
