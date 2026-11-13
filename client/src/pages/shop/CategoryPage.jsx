import { useEffect, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useGetCategoryBySlugQuery, useGetCategoriesQuery, useGetBlogPostsQuery, useGetProductsQuery } from '../../store/api/productsApi';
import SEOHead from '../../component/SEOHead';
import UnProductCard from '../../component/UnProductCard';
import CollectionProductCard from '../../component/CollectionProductCard';
import RevealCard from '../../component/RevealCard';
import SubcategoryRow from '../../component/SubcategoryRow';
import SaleBanner from '../../component/festive/SaleBanner';
import { useGetHomeComboOffersQuery } from '../../store/api/userApi';
import { buildOfferLines } from '../../utils/productOfferLines';
import { ShopFilterSidebar, ShopFilterButton, ShopSort, ActiveFilterChips } from '../../component/ShopFilters';
import { useSessionState } from '../../hooks/useSessionState';
import { EMPTY_FILTERS, applyShopFilters, sortShopItems, demandChips, recentSalesChips } from '../../utils/shopFilters';
import { toItems, toParentItems } from '../../utils/shopItems';
import { shopPills } from '../../utils/shopPills';
import NotFound from '../NotFound';
import { trackViewItemList } from '../../utils/analytics';

const SITE = 'https://www.urbannook.in';

// Default copy per page kind (the API's `kind`): "category" is a productCategory
// page; "collection", "series" and "game" are variant collections built by the
// server (server/src/utils/category.util.js → buildCollections). Shoppers search
// "anime katana", "demon slayer katana", "vergil sword", so titles say that.
// Admin → SEO Pages (/category/<slug>) can still override title, description,
// intro and FAQs for any of them.
const pageCopy = ({ kind, slug, name, itemCount }) => {
  const tail = 'Gift wrap, partial COD and delivery across India.';
  if (slug === 'anime-katana') return {
    h1: 'Anime Katana: Wooden & LED Swords',
    title: 'Anime Katana - Wooden & LED Swords, Buy Online in India',
    description: `${itemCount} anime katanas from Demon Slayer, One Piece, Naruto, Bleach and games: 104 cm wooden and LED display swords. ${tail}`,
  };
  if (kind === 'series') return {
    h1: `${name} Swords & Collectibles`,
    title: `${name} Katana, Swords & Collectibles - Buy in India`,
    description: `${itemCount} ${name} katanas, swords and collectibles: wooden and LED display swords and figures for fans. ${tail}`,
  };
  if (kind === 'game') return {
    h1: name,
    title: `${name} - Gaming Katana Replicas, Buy in India`,
    description: `${itemCount} katanas from video games: wooden and LED display replicas for gamers and collectors. ${tail}`,
  };
  return { h1: name, title: `${name} - Buy Online in India`, description: `Shop ${itemCount} ${name} designs at UrbanNook. ${tail}` };
};
const PER_PAGE = 24;
// Catalogue data is cached server-side for ~10 min anyway: re-opening a category / the lists within 5 min reuses the client cache.
const FRESH = { refetchOnMountOrArgChange: 300 };

// `embeddedSlug`: rendered inside Shop All (/products?category=<slug>) - same data and browsing (filters, sort, grid, pages),
// but no page chrome (no SEO head, breadcrumb or tabs: Shop All supplies them), and nothing that navigates away.
const CategoryPage = ({ embeddedSlug } = {}) => {
  const embedded = Boolean(embeddedSlug);
  const params = useParams();
  const slug = embeddedSlug || params.slug;
  const subSlug = embedded ? undefined : params.subSlug;
  const pageKey = subSlug ? `${slug}/${subSlug}` : slug;
  const [searchParams] = useSearchParams();
  const { data, isLoading, error } = useGetCategoryBySlugQuery(pageKey, FRESH);
  const { data: allRes } = useGetCategoriesQuery(undefined, { ...FRESH, skip: embedded });
  // A franchise page (/category/demon-slayer …) ends with that franchise's journal
  // posts; the API returns none for other slugs. Same args as entry-server.jsx.
  const { data: storiesRes } = useGetBlogPostsQuery({ series: slug, limit: 6 }, { skip: embedded });
  const stories = storiesRes?.data || [];

  const category = data?.data;
  // Product categories (Anime, Lamps, Decor…) list ONE card per parent product (its variants are on its own page).
  // Franchise / collection pages (Demon Slayer, Anime Katana…) are cut across products at VARIANT level, so they keep one
  // card per matching variant - collapsing them would hide the very designs the page is about.
  const parentMode = category?.kind === 'category';
  const allItems = useMemo(() => (parentMode ? toParentItems(category?.products) : toItems(category?.products)), [category, parentMode]);
  // Availability / price filters: client state only (see ShopFilters), reset per category.
  const [filters, setFilters] = useSessionState(`shop:${pageKey}:filters`, EMPTY_FILTERS);
  const [sort, setSort] = useSessionState(`shop:${pageKey}:sort`, 'featured');
  // Live combo benefit per product, for the card's offer line (cached query).
  // Offer lines are only for the variant cards of franchise pages; the parent-product cards of product categories carry no offer text.
  const { data: comboRes } = useGetHomeComboOffersQuery(undefined, { skip: !category || parentMode });
  // Names across the whole catalogue (same cached list as the header), so a
  // reward line can name a product from another category ("with a Lamp").
  const { data: allProdRes } = useGetProductsQuery({ page: 1, limit: 24 }, FRESH);
  const offerLines = useMemo(() => {
    const list = allProdRes?.data?.listofPublishedProducts || allProdRes?.data?.products || category?.products || [];
    return buildOfferLines(comboRes?.data?.combos || [], new Map(list.map((x) => [String(x.productId), x.productName])));
  }, [comboRes, allProdRes, category]);
  const chips = useMemo(() => demandChips(allItems), [allItems]);
  // Filters and sort start fresh on every category.
  const items = useMemo(() => sortShopItems(applyShopFilters(allItems, filters), sort), [allItems, filters, sort]);
  const recentSales = useMemo(() => recentSalesChips(items), [items]);
  const totalPages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const page = Math.min(Math.max(1, parseInt(searchParams.get('page'), 10) || 1), totalPages);
  const pageItems = useMemo(() => items.slice((page - 1) * PER_PAGE, page * PER_PAGE), [items, page]);
  // Chips: every other page that is worth a visit (indexable), categories first.
  const pills = useMemo(() => shopPills(allRes?.data || [], slug), [allRes, slug]);

  useEffect(() => { if (!embedded) window.scrollTo(0, 0); }, [pageKey, page, embedded]);
  useEffect(() => {
    if (!category || !pageItems.length) return;
    trackViewItemList?.({
      listName: `Category: ${category.name}`,
      listId: `category_${category.slug}`,
      items: pageItems.map(({ p }, i) => ({ itemId: p.productId, itemName: p.productName, price: p.variantDetails?.[0]?.variantPrice || 0, index: i })),
    });
  }, [category, pageItems]);

  if (isLoading && embedded) {
    return <section className="rd-gift rd-shop-sec" aria-busy="true"><div className="rd-cgrid">{[...Array(8)].map((_, i) => <div key={i} className="aspect-[3/4] animate-pulse bg-hair" />)}</div></section>;
  }
  if (embedded && (error || !category)) {
    return (
      <section className="rd-gift rd-shop-sec">
        <div className="border border-hair py-16 text-center">
          <p className="font-archivo text-xl font-semibold tracking-tight">{error?.status === 404 || !error ? 'This collection is not available' : 'Unable to load this collection'}</p>
          <Link to="/products" className="rd-pill mt-4">Back to all collections</Link>
        </div>
      </section>
    );
  }
  if (isLoading) {
    return <div className="grid min-h-[70vh] place-items-center bg-paper"><div className="h-12 w-12 animate-spin rounded-full border-2 border-brand border-t-transparent" /></div>;
  }
  if (error?.status === 404 || (!error && !category)) return <NotFound />;
  if (error) {
    return (
      <div className="min-h-[70vh] grid place-items-center bg-surface font-inter text-center px-5">
        <SEOHead title="Unable to load" noIndex />
        <div>
          <h1 className="text-2xl font-extrabold">Unable to load this category</h1>
          <button onClick={() => window.location.reload()} className="gl-press bg-brand text-white font-bold text-sm px-7 py-3.5 rounded-xl mt-6 hover:bg-brandHi">Retry</button>
        </div>
      </div>
    );
  }

  const { name, indexable, itemCount, subcategory, subcategories } = category;
  const copy = subcategory
    ? { h1: subcategory.name, title: `${subcategory.name} - ${name} - Buy Online in India`, description: `Shop ${itemCount} ${subcategory.name} designs in ${name} at UrbanNook. Gift wrap, partial COD and delivery across India.` }
    : pageCopy(category);
  const basePath = subcategory ? `/category/${category.slug}/${subcategory.slug}` : `/category/${category.slug}`;
  const pagePath = (n) => (embedded
    ? `/products?category=${category.slug}${n > 1 ? `&page=${n}` : ''}`
    : (n > 1 ? `${basePath}?page=${n}` : basePath));

  // Defaults (pageCopy above); Admin → SEO Pages (/category/<slug>) can override
  // them, and adds the intro text + FAQs above the footer (SeoPageContent).
  const { title, description } = copy;

  const structuredData = [
    {
      '@context': 'https://schema.org', '@type': 'CollectionPage', name, url: `${SITE}${pagePath(page)}`,
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: pageItems.map(({ p, href, ldHref }, i) => ({ '@type': 'ListItem', position: (page - 1) * PER_PAGE + i + 1, url: `${SITE}${ldHref || href}`, name: p.productName })),
      },
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE}/products` },
        { '@type': 'ListItem', position: 3, name, item: `${SITE}/category/${category.slug}` },
        ...(subcategory ? [{ '@type': 'ListItem', position: 4, name: subcategory.name, item: `${SITE}${basePath}` }] : []),
      ],
    },
  ];

  const listId = `category_${category.slug}${subcategory ? `_${subcategory.slug}` : ''}`;
  const listName = `Category: ${name}${subcategory ? ` / ${subcategory.name}` : ''}`;
  const unitLabel = parentMode ? (itemCount === 1 ? 'design' : 'designs') : (itemCount === 1 ? 'design' : 'designs');

  const browse = (
      <section className="rd-gift rd-shop-sec flex gap-8 [overflow-anchor:none]" style={{ marginTop: embedded ? 32 : 28 }}>
        <ShopFilterSidebar items={allItems} filters={filters} setFilters={setFilters} />
        <div className="min-w-0 flex-1">
          {embedded && (
            <div className="mb-5">
              <h2 className="rd-h2 font-archivo text-ink">{name}</h2>
              <p className="rd-count-inline font-mono uppercase text-muted">{itemCount} {unitLabel}{parentMode && allItems.length > 0 ? ` · ${allItems.length} ${allItems.length === 1 ? 'product' : 'products'}` : ''}</p>
            </div>
          )}
          <div className="mb-5 flex items-center justify-between gap-2 sm:gap-3">
            <ShopFilterButton items={allItems} filters={filters} setFilters={setFilters} resultCount={items.length} />
            <p className="ml-auto whitespace-nowrap font-mono text-[11px] uppercase tracking-[.13em] text-muted">{items.length} of {allItems.length} {parentMode ? 'products' : 'items'}</p>
            <ShopSort value={sort} onChange={setSort} />
          </div>
          <ActiveFilterChips filters={filters} setFilters={setFilters} />
          {items.length === 0 && (
            <div className="border border-hair py-20 text-center">
              <p className="font-archivo text-xl font-semibold tracking-tight">No products match these filters</p>
              <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="rd-pill mt-4">Clear filters</button>
            </div>
          )}
          {/* a category with only 1-2 products: the compact row panel (photo, details, design previews), not a grid with one card and a blank page */}
          {parentMode && allItems.length < 3 && pageItems.length > 0 && (
            <div className="rd-mini rd-mini-wide">
              {pageItems.map(({ key, p }, i) => <CollectionProductCard key={key} p={p} index={i} layout="row" listId={listId} listName={listName} />)}
            </div>
          )}
          <div className="rd-cgrid" hidden={parentMode && allItems.length < 3}>
            {(parentMode && allItems.length < 3 ? [] : pageItems).map(({ key, p, href, badge }, i) => (parentMode ? (
              <CollectionProductCard key={key} p={p} index={i} listId={listId} listName={listName} />
            ) : (
              <RevealCard key={key} index={i}>
                <UnProductCard
                  p={p}
                  href={href}
                  badge={badge}
                  demand={sort === 'trending' ? 'trending' : chips.get(key)} trendCount={Number(p.variantDetails?.[0]?.soldRecent || 0)}
                  recentSalesUnits={recentSales.get(key)}
                  offerLine={offerLines.get(String(p.productId))}
                  index={i}
                  listId={listId}
                  listName={listName}
                  showWishlist={false}
                />
              </RevealCard>
            )))}
          </div>

          {totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
              {page > 1 && <Link to={pagePath(page - 1)} rel="prev" className="rd-pill">Previous</Link>}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                n === page
                  ? <span key={n} aria-current="page" className="rd-pill" data-solid>{n}</span>
                  : <Link key={n} to={pagePath(n)} className="rd-pill">{n}</Link>
              ))}
              {page < totalPages && <Link to={pagePath(page + 1)} rel="next" className="rd-pill">Next</Link>}
            </nav>
          )}
        </div>
      </section>
  );

  if (embedded) return browse;

  return (
    <div className="rd-shop bg-paper font-inter text-ink">
      <SEOHead
        title={page > 1 ? `${title} - Page ${page}` : title}
        description={description}
        url={pagePath(page)}
        image={category.image || undefined}
        // Fewer than 3 items is a thin page: keep it out of the index until it grows.
        noIndex={!indexable}
        structuredData={structuredData}
      />

      {/* head: the homepage's section frame, heading and sub-line */}
      <section className="rd-gift rd-shop-head" aria-label={name}>
        <nav aria-label="Breadcrumb" className="rd-crumb font-mono uppercase text-muted">
          <Link to="/" className="hover:text-ink">Home</Link> / <Link to="/products" className="hover:text-ink">Shop</Link> / {subcategory ? <><Link to={`/category/${category.slug}`} className="hover:text-ink">{name}</Link> / <span className="text-ink">{subcategory.name}</span></> : <span className="text-ink">{name}</span>}
        </nav>
        <SaleBanner className="mb-5" />
        <h1 className="rd-h2 font-archivo text-ink">{copy.h1}</h1>
        <p className="rd-sub font-inter text-muted">{itemCount} {unitLabel}{parentMode && allItems.length > 0 ? ` · ${allItems.length} ${allItems.length === 1 ? 'product' : 'products'}` : ''}</p>

        <SubcategoryRow slug={category.slug} subcategories={subcategories} active={subcategory?.slug} />

        {pills.length > 0 && (
          <nav aria-label="Collections" className="rd-tabs gl-hscroll">
            <Link to="/products" className="rd-tab">All</Link>
            {/* product categories first, then a divider and the franchise / collection pages; the current page is marked in place */}
            {pills.filter((x) => x.kind === 'category').map((x) => (
              <Link key={x.slug} to={`/category/${x.slug}`} aria-current={x.slug === slug ? 'page' : undefined} className="rd-tab">{x.name}</Link>
            ))}
            {pills.some((x) => x.kind === 'category') && pills.some((x) => x.kind !== 'category') && <span className="rd-tabsep" aria-hidden="true" />}
            {pills.filter((x) => x.kind !== 'category').map((x) => (
              <Link key={x.slug} to={`/category/${x.slug}`} aria-current={x.slug === slug ? 'page' : undefined} className="rd-tab rd-tab-sub">{x.name}</Link>
            ))}
          </nav>
        )}
      </section>

      {browse}

      {stories.length > 0 && (
        <section className="rd-gift rd-shop-sec" aria-labelledby="stories-heading">
          <div className="rd-gift-head">
            <h2 id="stories-heading" className="rd-h2 font-archivo text-ink">The stories behind the swords</h2>
            <div className="rd-head-side">
              <Link to={`/blog#${category.slug}`} className="rd-viewall-arrow text-ink" aria-label={`All ${name} stories`}>
                <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M2 7h10M8 3l4 4-4 4" /></svg>
              </Link>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {stories.map((st) => (
              <Link key={st.slug} to={`/blog/${st.slug}`} className="group flex gap-4 border border-hair p-3 transition-colors hover:border-ink">
                {st.coverImage && <img src={st.coverImage} alt={st.coverAlt || st.title} loading="lazy" className="h-24 w-24 shrink-0 object-cover" />}
                <span className="flex min-w-0 flex-col">
                  <span className="line-clamp-2 font-archivo font-semibold leading-snug group-hover:text-brandHi">{st.title}</span>
                  {st.excerpt && <span className="mt-1 line-clamp-2 text-sm text-muted">{st.excerpt}</span>}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default CategoryPage;
