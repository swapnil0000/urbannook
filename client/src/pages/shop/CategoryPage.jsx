import { useEffect, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useGetCategoryBySlugQuery, useGetCategoriesQuery } from '../../store/api/productsApi';
import SEOHead from '../../component/SEOHead';
import UnProductCard from '../../component/UnProductCard';
import RevealCard from '../../component/RevealCard';
import NotFound from '../NotFound';
import { trackViewItemList } from '../../utils/analytics';

const SITE = 'https://www.urbannook.in';
const PER_PAGE = 24;

// One card per sellable variant, linking to that variant's own page — a
// category with one product and four variants (BMW, Ferrari, …) shows four
// cards. Variants hidden by admin (isActive:false) are skipped.
const toItems = (products = []) =>
  products.flatMap((p) => {
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

const paragraphs = (text = '') => text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);

const CategoryPage = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const { data, isLoading, error } = useGetCategoryBySlugQuery(slug);
  const { data: allRes } = useGetCategoriesQuery();

  const category = data?.data;
  const items = useMemo(() => toItems(category?.products), [category]);
  const totalPages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const page = Math.min(Math.max(1, parseInt(searchParams.get('page'), 10) || 1), totalPages);
  const pageItems = useMemo(() => items.slice((page - 1) * PER_PAGE, page * PER_PAGE), [items, page]);
  const otherCategories = (allRes?.data || []).filter((c) => c.slug !== slug);

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

  const { name, seo = {}, indexable, itemCount } = category;
  const basePath = `/category/${category.slug}`;
  const pagePath = (n) => (n > 1 ? `${basePath}?page=${n}` : basePath);
  const faqs = seo.faqs || [];

  // Admin SEO wins; empty fields fall back to these defaults.
  const title = seo.metaTitle || `${name} – Buy Online in India`;
  const description = seo.metaDescription
    || `Shop ${itemCount} ${name} designs at UrbanNook — 3D-printed and made in India. Cash on delivery and pan-India shipping.`;

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
    // FAQ schema only for FAQs that are visible on this page.
    ...(faqs.length ? [{
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
    }] : []),
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
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{name}</h1>
        <p className="text-muted mt-2">{itemCount} {itemCount === 1 ? 'design' : 'designs'}</p>

        {page === 1 && seo.introContent && (
          <div className="mt-5 max-w-3xl space-y-3 text-[15px] leading-relaxed text-muted">
            {paragraphs(seo.introContent).map((t, i) => <p key={i}>{t}</p>)}
          </div>
        )}

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

      {page === 1 && faqs.length > 0 && (
        <section className="max-w-3xl mx-auto px-5 pb-28">
          <h2 className="text-2xl font-extrabold tracking-tight mb-4">{name} — FAQs</h2>
          <div className="divide-y divide-hair border-y border-hair">
            {faqs.map((f, i) => (
              <details key={i} className="py-4 group">
                <summary className="font-semibold cursor-pointer list-none flex justify-between gap-4">
                  {f.question}<span className="text-muted group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-2 text-muted leading-relaxed">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default CategoryPage;
