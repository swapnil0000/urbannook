import { useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { toCategorySlug } from '../../utils/categoryUrl';
import { useGetProductsQuery, useGetCategoriesQuery } from '../../store/api/productsApi';
import SEOHead from '../../component/SEOHead';
import CollectionProductCard from '../../component/CollectionProductCard';
import CollectionRail from '../../component/CollectionRail';
import CategoryPage from './CategoryPage';
import SaleBanner from '../../component/festive/SaleBanner';
import { buildSections, summarizeProduct } from '../../utils/collectionSections';
import { shopPills } from '../../utils/shopPills';
import { trackViewItemList } from '../../utils/analytics';
import useOverlayAvoidance from '../../hooks/useOverlayAvoidance';

// Catalogue data is cached server-side for ~10 min anyway, so re-mounting this page within 5 min reuses the client cache
// (the app default refetches anything older than 30 s on every mount).
const FRESH = { refetchOnMountOrArgChange: 300 };
const FIRST_PAGE = { page: 1, limit: 24 }; // same args as the header/SSR list: already cached, no new request
const MAX_ALL = 200; // safety cap for the one "everything" request below
const productList = (res) => res?.data?.products || res?.data?.listofPublishedProducts || [];

const Arrow = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M2 7h10M8 3l4 4-4 4" /></svg>;

const AllProductsPage = () => {
  const [searchParams] = useSearchParams();
  const activeTag = searchParams.get('tag'); // footer "Bestsellers" → ?tag=best_seller
  // ?category=<slug|name>: the tabs and the "view all" arrows filter THIS page in place (the backend returns that whole category)
  const activeSlug = searchParams.get('category') ? toCategorySlug(searchParams.get('category')) : null;

  const { data: res, isLoading, error } = useGetProductsQuery(FIRST_PAGE, FRESH);
  const firstPage = useMemo(() => productList(res), [res]);
  // Catalogue larger than the first page? ONE more request for all of it (not one per category, not page by page),
  // so a section never silently drops products. With <= 24 products (today) this is skipped entirely.
  const total = Number(res?.data?.pagination?.totalProducts || 0);
  const needAll = total > firstPage.length;
  const { data: allRes } = useGetProductsQuery({ page: 1, limit: Math.min(total, MAX_ALL) }, { skip: !needAll });
  const products = useMemo(() => (needAll && productList(allRes).length > firstPage.length ? productList(allRes) : firstPage), [needAll, allRes, firstPage]);

  const { data: catRes } = useGetCategoriesQuery(undefined, FRESH); // names/order/images + the pills; one small request, cached
  const cats = useMemo(() => catRes?.data || [], [catRes]);

  // Content-aware layout: a category with 3+ products gets a full row (rail); one with 1-2 gets a compact panel,
  // and those panels sit side by side instead of each taking the whole page width for a single card.
  const sections = useMemo(() => {
    const scoped = products.filter((p) => !activeTag || (p.tags || []).includes(activeTag));
    const all = buildSections(scoped, cats);
    return all;
  }, [products, cats, activeTag]);
  // Blocks in EXACTLY the order the backend sent (Admin → Categories). A category with 3+ products is a row of its own;
  // consecutive categories with 1-2 products share one compact panel row, so order is never rearranged to fit the layout.
  const blocks = useMemo(() => {
    const out = [];
    sections.forEach((x) => {
      if (x.products.length >= 3) { out.push({ type: 'row', section: x }); return; }
      const last = out[out.length - 1];
      if (last?.type === 'minis') last.sections.push(x); else out.push({ type: 'minis', sections: [x] });
    });
    return out;
  }, [sections]);

  // Series / games / collections (Demon Slayer, …) live at variant level, so they open their own page.
  // Tabs: every page the backend lists, in the backend's order (before /categories arrives: the sections already loaded).
  const tabs = useMemo(() => (cats.length ? shopPills(cats) : sections.map((x) => ({ slug: x.slug, name: x.label, kind: 'category' }))), [cats, sections]);

  useOverlayAvoidance('[data-avoid-overlay]'); // phones: the Help button fades out while it would sit over a card or a section link
  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    const shown = sections.flatMap((s) => s.products);
    if (shown.length) trackViewItemList?.({ listName: 'All Products', listId: 'all_products', items: shown.map((p, i) => ({ itemId: p.productId, itemName: p.productName, price: summarizeProduct(p).price, index: i })) });
  }, [sections]);

  const filtered = Boolean(activeTag);
  const showNav = !isLoading && !error && tabs.length > 0;
  const tabHref = (slug) => `/products?category=${slug}`;
  // computed from the catalogue (no hand-written category names or counts)
  const introLine = sections.length ? `${sections.length} ${sections.length === 1 ? 'collection' : 'collections'} · ${sections.reduce((n, x) => n + x.products.length, 0)} products · ${sections.reduce((n, x) => n + x.designs, 0)} designs` : '';
  const countLine = (x) => `${x.products.length} ${x.products.length === 1 ? 'product' : 'products'} · ${x.designs} ${x.designs === 1 ? 'design' : 'designs'}`;
  const ArrowIcon = () => <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M2 7h10M8 3l4 4-4 4" /></svg>;

  return (
    <div className="rd-shop bg-paper font-inter text-ink">
      <SEOHead title="Shop All Products" url={activeSlug ? `/category/${activeSlug}` : '/products'} description="Browse UrbanNook's full collection of 3D-printed desk lamps, pen stands & décor. Made in India, fast pan-India delivery." />

      {/* head: compact - breadcrumb, heading, one line, then the collection tabs */}
      <section className="rd-gift rd-shop-head" aria-label="Shop all">
        <nav aria-label="Breadcrumb" className="rd-crumb font-mono uppercase text-muted">
          <Link to="/" className="hover:text-ink">Home</Link> / <span className="text-ink">Shop</span>
        </nav>
        <SaleBanner className="mb-5" />
        <h1 className="rd-h2 font-archivo text-ink">{activeTag === 'best_seller' ? 'Bestsellers' : 'Shop All'}</h1>
        <p className="rd-sub font-inter text-muted">{introLine}</p>

        {showNav && (
          <nav aria-label="Collections" className="rd-tabs gl-hscroll">
            <Link to="/products" aria-current={!activeSlug ? 'page' : undefined} className="rd-tab">All</Link>
            {tabs.filter((x) => x.kind === 'category').map((x) => (
              <Link key={x.slug} to={tabHref(x.slug)} aria-current={x.slug === activeSlug ? 'page' : undefined} className="rd-tab">{x.name}</Link>
            ))}
            {tabs.some((x) => x.kind === 'category') && tabs.some((x) => x.kind !== 'category') && <span className="rd-tabsep" aria-hidden="true" />}
            {tabs.filter((x) => x.kind !== 'category').map((x) => (
              <Link key={x.slug} to={tabHref(x.slug)} aria-current={x.slug === activeSlug ? 'page' : undefined} className="rd-tab rd-tab-sub">{x.name}</Link>
            ))}
          </nav>
        )}
      </section>

      {activeSlug ? (
        <CategoryPage embeddedSlug={activeSlug} />
      ) : isLoading ? (
        <section className="rd-gift rd-shop-sec" aria-busy="true">
          <div className="mb-4 h-7 w-48 animate-pulse bg-hair" />
          <div className="rd-rail">{[...Array(5)].map((_, i) => <div key={i} className="aspect-[3/4] animate-pulse bg-hair" />)}</div>
        </section>
      ) : error ? (
        <section className="rd-gift rd-shop-sec">
          <div className="border border-hair py-20 text-center">
            <h2 className="font-archivo text-2xl font-semibold tracking-tight">Unable to load products</h2>
            <p className="rd-sub mt-2 text-muted">Please check your connection and try again.</p>
            <button onClick={() => window.location.reload()} className="rd-cust-cta mx-auto">Retry</button>
          </div>
        </section>
      ) : sections.length === 0 ? (
        <section className="rd-gift rd-shop-sec">
          <div className="border border-hair py-20 text-center">
            <h2 className="font-archivo text-2xl font-semibold tracking-tight">{filtered ? 'Nothing here yet' : 'Dropping soon'}</h2>
            <p className="rd-sub mt-2 text-muted">{filtered ? 'No products match this view.' : 'New pieces land here - check back Friday.'}</p>
            {filtered && <Link to="/products" className="rd-pill mt-5">See all collections</Link>}
          </div>
        </section>
      ) : (
        <>
          {blocks.map((b) => (b.type === 'row' ? (
            <section key={b.section.slug} id={b.section.slug} aria-labelledby={`h-${b.section.slug}`} className="rd-gift rd-shop-sec">
              <div className="rd-gift-head">
                <div>
                  <h2 id={`h-${b.section.slug}`} className="rd-h2 font-archivo text-ink">{b.section.label}</h2>
                  <p className="rd-count-inline font-mono uppercase text-muted">{countLine(b.section)}</p>
                </div>
                <div className="rd-head-side">
                  <Link to={tabHref(b.section.slug)} data-avoid-overlay className="rd-viewall-arrow text-ink" aria-label={`View all ${b.section.label}`}><ArrowIcon /></Link>
                </div>
              </div>
              <CollectionRail label={b.section.label}>
                {b.section.products.map((p, k) => <CollectionProductCard key={p.productId} p={p} index={k} />)}
              </CollectionRail>
            </section>
          ) : (
            <section key={`m-${b.sections[0].slug}`} className="rd-gift rd-shop-sec" aria-label={b.sections.map((x) => x.label).join(', ')}>
              <div className="rd-mini-grid">
                {b.sections.map((x) => (
                  <div key={x.slug} id={x.slug} className="rd-mini" role="group" aria-labelledby={`h-${x.slug}`}>
                    <div className="rd-mini-head">
                      <div>
                        <h2 id={`h-${x.slug}`} className="rd-h2 font-archivo text-ink">{x.label}</h2>
                        <p className="rd-count-inline font-mono uppercase text-muted">{countLine(x)}</p>
                      </div>
                      <Link to={tabHref(x.slug)} data-avoid-overlay className="rd-viewall-arrow text-ink" aria-label={`View all ${x.label}`}><ArrowIcon /></Link>
                    </div>
                    {x.products.map((p, k) => <CollectionProductCard key={p.productId} p={p} index={k} layout="row" />)}
                  </div>
                ))}
              </div>
            </section>
          )))}
        </>
      )}
    </div>
  );
};

export default AllProductsPage;
