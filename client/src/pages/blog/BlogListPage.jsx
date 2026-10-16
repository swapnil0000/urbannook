import { Link } from 'react-router-dom';
import { useGetBlogPostsQuery } from '../../store/api/productsApi';
import SEOHead from '../../component/SEOHead';

const SITE = 'https://www.urbannook.in';
const date = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

// /blog — every published post (Admin → Blog), newest first.
const BlogListPage = () => {
  const { data, isLoading, error } = useGetBlogPostsQuery({ limit: 100 });
  const posts = data?.data || [];

  const structuredData = [
    {
      '@context': 'https://schema.org', '@type': 'Blog', name: 'UrbanNook Journal', url: `${SITE}/blog`,
      blogPost: posts.slice(0, 20).map((p) => ({
        '@type': 'BlogPosting', headline: p.title, url: `${SITE}/blog/${p.slug}`,
        ...(p.publishedAt ? { datePublished: p.publishedAt } : {}), ...(p.coverImage ? { image: p.coverImage } : {}),
      })),
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Journal', item: `${SITE}/blog` },
      ],
    },
  ];

  return (
    <div className="font-inter bg-paper text-ink min-h-screen">
      <SEOHead
        title="Journal – Anime Swords, Car Culture & Desk Setup Guides"
        description="Stories and guides from UrbanNook: the anime swords behind our katanas, car culture behind our caliper lamps, and ideas for your desk and setup."
        url="/blog"
        structuredData={structuredData}
      />
      <div className="max-w-[1100px] mx-auto px-5 pt-10 pb-16">
        <nav aria-label="Breadcrumb" className="text-sm text-faint mb-5">
          <Link to="/" className="hover:text-brand">Home</Link> / <span className="text-ink">Journal</span>
        </nav>
        <p className="gl-lbl text-brand mb-2">The UrbanNook Journal</p>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Stories behind the pieces</h1>
        <p className="text-muted mt-3 max-w-2xl">The anime swords behind our katanas, the car culture behind our lamps, and ideas for the desk you love coming back to.</p>

        {isLoading && <div className="py-20 grid place-items-center"><div className="w-10 h-10 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>}
        {error && <p className="py-16 text-muted">Couldn't load the journal right now. Please try again.</p>}
        {!isLoading && !error && posts.length === 0 && <p className="py-16 text-muted">New stories are on the way.</p>}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
          {posts.map((p) => (
            <Link key={p.slug} to={`/blog/${p.slug}`} className="group bg-white border border-hair rounded-2xl overflow-hidden hover:border-ink transition-colors flex flex-col">
              <div className="aspect-[16/9] bg-surface overflow-hidden">
                {p.coverImage
                  ? <img src={p.coverImage} alt={p.coverAlt || p.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                  : <div className="w-full h-full grid place-items-center text-faint gl-lbl">UrbanNook</div>}
              </div>
              <div className="p-5 flex flex-col gap-2 flex-1">
                <p className="text-xs text-faint">{date(p.publishedAt)}{p.readingMinutes ? ` · ${p.readingMinutes} min read` : ''}</p>
                <h2 className="text-lg font-extrabold leading-snug group-hover:text-brand">{p.title}</h2>
                {p.excerpt && <p className="text-sm text-muted line-clamp-3">{p.excerpt}</p>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlogListPage;
