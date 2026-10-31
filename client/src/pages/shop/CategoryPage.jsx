import { useEffect, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useGetCategoryBySlugQuery, useGetCategoriesQuery, useGetBlogPostsQuery } from '../../store/api/productsApi';
import SEOHead from '../../component/SEOHead';
import UnProductCard from '../../component/UnProductCard';
import RevealCard from '../../component/RevealCard';
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
    title: 'Anime Katana – Wooden & LED Swords, Buy Online in India',
    description: `${itemCount} anime katanas from Demon Slayer, One Piece, Naruto, Bleach and games: 104 cm wooden and LED display swords. ${tail}`,
  };
  if (kind === 'series') return {
    h1: `${name} Swords & Collectibles`,
    title: `${name} Katana, Swords & Collectibles – Buy in India`,
    description: `${itemCount} ${name} katanas, swords and collectibles: wooden and LED display swords and figures for fans. ${tail}`,
  };
  if (kind === 'game') return {
    h1: name,
    title: `${name} – Gaming Katana Replicas, Buy in India`,
    description: `${itemCount} katanas from video games: wooden and LED display replicas for gamers and collectors. ${tail}`,
  };
  return { h1: name, title: `${name} – Buy Online in India`, description: `Shop ${itemCount} ${name} designs at UrbanNook. ${tail}` };
};
const PER_PAGE = 24;

// One card per sellable variant, linking to that variant's own page — a
// category with one product and four variants (BMW, Ferrari, …) shows four
// cards. Variants hidden by admin (isActive:false) are skipped.
// Cards are interleaved round-robin across products (1st variant of each
// product, then the 2nd of each, …) so a product with many variants (21
// wooden katanas) doesn't fill the whole first page and hide the others.
const toItems = (products = []) => {
  const perProduct = products.map((p) => {
    const variants = (p.variantDetails || []).filter((v) => v && v.isActive !== false);
    if (!variants.length) return [{ key: p.productId, p, href: `/product/${p.productId}` }];
    return variants.map((v, i) => ({
      key: `${p.productId}-${v.sku || i}`,
      // Card shows this variant's name/image/price; second image would be
      // another variant's, so it's dropped.
      p: { ...p, productName: v.variantName || p.productName, variantDetails: [v], secondaryImages: [], effectivePrice: undefined, effectiveMrp: undefined },
      href: v.sku ? `/product/${p.productId}/${v.sku}` : `/product/${p.productId}`,
      soldOut: v.variantOutOfStock === true || (v.variantQuantity != null && v.variantQuantity <= 0),
    }));
  });
  const total = perProduct.reduce((n, list) => n + list.length, 0);
  const out = [];
  for (let i = 0; out.length < total; i++) {
    for (const list of perProduct) if (list[i]) out.push(list[i]);
  }
  return out;
};

const CategoryPage = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const { data, isLoading, error } = useGetCategoryBySlugQuery(slug);
  const { data: allRes } = useGetCategoriesQuery();
  // A franchise page (/category/demon-slayer …) ends with that franchise's journal
  // posts; the API returns none for other slugs. Same args as entry-server.jsx.
  const { data: storiesRes } = useGetBlogPostsQuery({ series: slug, limit: 6 });
  const stories = storiesRes?.data || [];

  const category = data?.data;
  const items = useMemo(() => toItems(category?.products), [category]);
  const totalPages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const page = Math.min(Math.max(1, parseInt(searchParams.get('page'), 10) || 1), totalPages);
  const pageItems = useMemo(() => items.slice((page - 1) * PER_PAGE, page * PER_PAGE), [items, page]);
  // Chips: every other page that is worth a visit (indexable), categories first.
  const otherCategories = (allRes?.data || []).filter((c) => c.slug !== slug && c.indexable !== false);

  useEffect(() => { window.scrollTo(0, 0); }, [slug, page]);
  useEffect(() => {
    if (!category || !pageItems.length) return;
    trackViewItemList?.({
      listName: `Category: ${category.name}`,
      listId: `category_${category.slug}`,
      items: pageItems.map(({ p }, i) => ({ itemId: p.productId, itemName: p.productName, price: p.variantDetails?.[0]?.variantPrice || 0, index: i })),
    });
  }, [category, pageItems]);

  if (isLoading) {
    return <div className="min-h-[70vh] grid place-items-center bg-surface"><div className="w-12 h-12 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>;
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

  const { name, indexable, itemCount } = category;
  const copy = pageCopy(category);
  const basePath = `/category/${category.slug}`;
  const pagePath = (n) => (n > 1 ? `${basePath}?page=${n}` : basePath);

  // Defaults (pageCopy above); Admin → SEO Pages (/category/<slug>) can override
  // them, and adds the intro text + FAQs above the footer (SeoPageContent).
  const { title, description } = copy;

  const structuredData = [
    {
      '@context': 'https://schema.org', '@type': 'CollectionPage', name, url: `${SITE}${pagePath(page)}`,
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: pageItems.map(({ p, href }, i) => ({ '@type': 'ListItem', position: (page - 1) * PER_PAGE + i + 1, url: `${SITE}${href}`, name: p.productName })),
      },
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE}/products` },
        { '@type': 'ListItem', position: 3, name, item: `${SITE}${basePath}` },
      ],
    },
  ];

  return (
    <div className="font-inter bg-surface text-ink min-h-screen">
      <SEOHead
        title={page > 1 ? `${title} – Page ${page}` : title}
        description={description}
        url={pagePath(page)}
        image={category.image || undefined}
        // Fewer than 3 items is a thin page: keep it out of the index until it grows.
        noIndex={!indexable}
        structuredData={structuredData}
      />

      <div className="max-w-[1280px] mx-auto px-5 pt-10">
        <nav aria-label="Breadcrumb" className="text-sm text-faint mb-5">
          <Link to="/" className="hover:text-brand">Home</Link> / <Link to="/products" className="hover:text-brand">Shop</Link> / <span className="text-ink">{name}</span>
        </nav>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{copy.h1}</h1>
        <p className="text-muted mt-2">{itemCount} {itemCount === 1 ? 'design' : 'designs'}</p>


        {otherCategories.length > 0 && (
          <div className="mt-6 -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto gl-hscroll">
            <div className="flex items-center gap-2.5 w-max">
              <Link to="/products" className="gl-press px-4 py-2 rounded-full text-sm font-semibold bg-white border border-hair hover:border-ink">All</Link>
              <span className="gl-press px-4 py-2 rounded-full text-sm font-semibold bg-brand text-white">{name}</span>
              {otherCategories.map((c) => (
                <Link key={c.slug} to={`/category/${c.slug}`} className="gl-press px-4 py-2 rounded-full text-sm font-semibold bg-white border border-hair hover:border-ink">{c.name}</Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <section className="max-w-[1280px] mx-auto px-5 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {pageItems.map(({ key, p, href, soldOut }, i) => (
            <RevealCard key={key} index={i}>
              <UnProductCard
                p={p}
                href={href}
                index={i}
                listId={`category_${category.slug}`}
                listName={`Category: ${name}`}
                badge={soldOut ? 'Sold out' : undefined}
                showWishlist={false}
              />
            </RevealCard>
          ))}
        </div>

        {totalPages > 1 && (
          <nav aria-label="Pagination" className="flex items-center justify-center gap-2 mt-10">
            {page > 1 && <Link to={pagePath(page - 1)} rel="prev" className="px-4 py-2 border border-hair rounded-lg text-sm font-semibold hover:border-ink">Previous</Link>}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              n === page
                ? <span key={n} aria-current="page" className="px-3.5 py-2 rounded-lg text-sm font-bold bg-ink text-white">{n}</span>
                : <Link key={n} to={pagePath(n)} className="px-3.5 py-2 border border-hair rounded-lg text-sm font-semibold hover:border-ink">{n}</Link>
            ))}
            {page < totalPages && <Link to={pagePath(page + 1)} rel="next" className="px-4 py-2 border border-hair rounded-lg text-sm font-semibold hover:border-ink">Next</Link>}
          </nav>
        )}
      </section>

      {stories.length > 0 && (
        <section className="max-w-[1280px] mx-auto px-5 pb-12" aria-labelledby="stories-heading">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <h2 id="stories-heading" className="text-2xl md:text-3xl font-extrabold tracking-tight">The stories behind the swords</h2>
            <Link to={`/blog#${category.slug}`} className="text-sm font-bold text-brand hover:underline">All {name} stories →</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
            {stories.map((p) => (
              <Link key={p.slug} to={`/blog/${p.slug}`} className="group bg-white border border-hair rounded-2xl overflow-hidden hover:border-ink transition-colors flex gap-4 p-3">
                {p.coverImage && <img src={p.coverImage} alt={p.coverAlt || p.title} loading="lazy" className="w-24 h-24 object-cover rounded-xl shrink-0" />}
                <span className="flex flex-col min-w-0">
                  <span className="font-extrabold leading-snug group-hover:text-brand line-clamp-2">{p.title}</span>
                  {p.excerpt && <span className="text-sm text-muted line-clamp-2 mt-1">{p.excerpt}</span>}
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
