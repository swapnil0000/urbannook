import { Link } from 'react-router-dom';
import { useGetBlogPostsQuery } from '../../store/api/productsApi';
import SEOHead from '../../component/SEOHead';

const SITE = 'https://www.urbannook.in';
const date = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

// The API tags each post with its franchise (`series`, server/src/utils/series.util.js).
// The journal groups by it: anime series first, then games, then everything else.
const OTHER = { slug: 'guides', name: 'Guides, gifts & desk', kind: 'other' };
const KIND_ORDER = { anime: 0, game: 1, other: 2 };
const groupBySeries = (posts) => {
  const groups = new Map();
  for (const p of posts) {
    const s = p.series || OTHER;
    if (!groups.has(s.slug)) groups.set(s.slug, { ...s, posts: [] });
    groups.get(s.slug).posts.push(p);
  }
  return [...groups.values()].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || b.posts.length - a.posts.length);
};

const PostCard = ({ p }) => (
  <Link to={`/blog/${p.slug}`} className="group bg-white border-[3px] border-ink rounded-[24px] overflow-hidden hover:border-ink transition-colors flex flex-col shadow-[4px_4px_0_rgb(var(--gl-ink))]">
    <div className="aspect-[16/9] bg-cream overflow-hidden">
      {p.coverImage
        ? <img src={p.coverImage} alt={p.coverAlt || p.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
        : <div className="w-full h-full grid place-items-center text-ink/60 gl-lbl">UrbanNook</div>}
    </div>
    <div className="p-5 flex flex-col gap-2 flex-1">
      <p className="text-xs text-ink/60">{date(p.publishedAt)}{p.readingMinutes ? ` · ${p.readingMinutes} min read` : ''}</p>
      <h3 className="text-lg leading-snug group-hover:text-brand font-anton uppercase">{p.title}</h3>
      {p.excerpt && <p className="text-sm text-ink/70 line-clamp-3">{p.excerpt}</p>}
    </div>
  </Link>
);

// /blog — every published post (Admin → Blog), grouped by franchise, newest first
// within each group. Each franchise links to its shop page (/category/<series>).
const BlogListPage = () => {
  const { data, isLoading, error } = useGetBlogPostsQuery({ limit: 100 });
  const posts = data?.data || [];
  const groups = groupBySeries(posts);

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
    <div className="font-inter bg-cream text-ink min-h-screen">
      <SEOHead
        title="Journal - Anime Swords, Car Culture & Desk Setup Guides"
        description="Stories and guides from UrbanNook: the anime swords behind our katanas, car culture behind our caliper lamps, and ideas for your desk and setup."
        url="/blog"
        structuredData={structuredData}
      />
      <div className="max-w-[1100px] mx-auto px-5 pt-10 pb-16">
        <nav aria-label="Breadcrumb" className="text-sm text-ink/60 mb-5">
          <Link to="/" className="hover:text-brand">Home</Link> / <span className="text-ink">Journal</span>
        </nav>
        <p className="gl-lbl text-brand mb-2">The UrbanNook Journal</p>
        <h1 className="text-4xl md:text-5xl font-anton uppercase leading-[.95] text-brand [text-shadow:2px_2px_0_rgb(var(--gl-ink))]">Stories behind the pieces</h1>
        <p className="text-ink/70 mt-3 max-w-2xl">The anime swords behind our katanas, the car culture behind our lamps, and ideas for the desk you love coming back to.</p>

        {isLoading && <div className="py-20 grid place-items-center"><div className="w-10 h-10 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>}
        {error && <p className="py-16 text-ink/70">Couldn't load the journal right now. Please try again.</p>}
        {!isLoading && !error && posts.length === 0 && <p className="py-16 text-ink/70">New stories are on the way.</p>}

        {groups.length > 1 && (
          <nav aria-label="Journal sections" className="mt-8 -mx-5 px-5 overflow-x-auto gl-hscroll">
            <div className="flex gap-2.5 w-max">
              {groups.map((g) => (
                <a key={g.slug} href={`#${g.slug}`} className="gl-press px-4 py-2 rounded-full text-sm font-semibold bg-white border-[3px] border-ink hover:border-ink shadow-[4px_4px_0_rgb(var(--gl-ink))]">
                  {g.name} <span className="text-ink/60">({g.posts.length})</span>
                </a>
              ))}
            </div>
          </nav>
        )}

        {groups.map((g) => (
          <section key={g.slug} id={g.slug} className="mt-12 scroll-mt-24">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <h2 className="text-2xl md:text-3xl font-anton uppercase leading-[.95]">{g.kind === 'other' ? g.name : `${g.name} stories`}</h2>
              {g.kind !== 'other' && (
                <Link to={`/category/${g.slug}`} className="text-sm font-bold text-brand hover:underline">Shop {g.name} →</Link>
              )}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-5">
              {g.posts.map((p) => <PostCard key={p.slug} p={p} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default BlogListPage;
