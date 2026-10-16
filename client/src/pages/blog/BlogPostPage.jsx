import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useGetBlogPostQuery } from '../../store/api/productsApi';
import SEOHead from '../../component/SEOHead';
import UnProductCard from '../../component/UnProductCard';
import NotFound from '../NotFound';

const SITE = 'https://www.urbannook.in';
const date = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

// Seigaiha (blue-sea wave) pattern, drawn inline so it costs no request.
const SEIGAIHA = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20" viewBox="0 0 40 20"><g fill="none" stroke="#b7282e" stroke-opacity=".18"><circle cx="0" cy="20" r="18"/><circle cx="0" cy="20" r="12"/><circle cx="0" cy="20" r="6"/><circle cx="40" cy="20" r="18"/><circle cx="40" cy="20" r="12"/><circle cx="40" cy="20" r="6"/><circle cx="20" cy="10" r="18"/><circle cx="20" cy="10" r="12"/><circle cx="20" cy="10" r="6"/></g></svg>',
)}")`;

// Click-to-play YouTube: only the thumbnail loads until the reader presses
// play, then a youtube-nocookie iframe replaces it. videoId comes from the
// API (server youtubeId), so it is always an 11-character YouTube id.
const VideoFacade = ({ id, title }) => {
  const [play, setPlay] = useState(false);
  return (
    <figure className="jp-video" data-anim="video">
      <div className="jp-video-frame">
        {play ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title={title}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        ) : (
          <button type="button" onClick={() => setPlay(true)} className="absolute inset-0 w-full h-full group" aria-label={`Play video: ${title}`}>
            <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
            <span className="jp-play" aria-hidden="true">▶</span>
          </button>
        )}
      </div>
      <figcaption>映像 · Watch the official trailer</figcaption>
    </figure>
  );
};

const Stars = ({ n }) => <span aria-label={`${n} out of 5`} className="text-[#a8843a] tracking-widest">{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;

// /blog/:slug — one post from Admin → Blog, in the "old Japan" journal style
// (washi paper, sumi ink, vermilion seal). contentHtml is sanitised on save
// (admin) and again by the API (server/src/utils/blogHtml.js), so it is
// rendered as HTML here. Sections carry data-anim="…" hooks for transitions.
const BlogPostPage = () => {
  const { slug } = useParams();
  const { data, isLoading, error } = useGetBlogPostQuery(slug);
  const [zoom, setZoom] = useState(null);
  const post = data?.data;

  if (isLoading) {
    return <div className="min-h-[70vh] grid place-items-center bg-[#f3ead8]"><div className="w-12 h-12 border-2 border-[#b7282e] border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (error?.status === 404 || (!error && !post)) return <NotFound />;
  if (error) {
    return (
      <div className="min-h-[70vh] grid place-items-center bg-paper font-inter text-center px-5">
        <SEOHead title="Unable to load" noIndex />
        <div>
          <h1 className="text-2xl font-extrabold">Unable to load this story</h1>
          <button onClick={() => window.location.reload()} className="gl-press bg-brand text-white font-bold text-sm px-7 py-3.5 rounded-xl mt-6 hover:bg-brandHi">Retry</button>
        </div>
      </div>
    );
  }

  const url = `/blog/${post.slug}`;
  const description = post.metaDescription || post.excerpt || '';
  const products = post.products || [];
  const reviews = post.reviews || [];
  const structuredData = [
    {
      '@context': 'https://schema.org', '@type': 'BlogPosting',
      headline: post.title, description, url: `${SITE}${url}`, mainEntityOfPage: `${SITE}${url}`,
      ...(post.coverImage ? { image: post.coverImage } : {}),
      ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
      ...(post.updatedAt ? { dateModified: post.updatedAt } : {}),
      author: { '@type': 'Organization', name: post.author || 'UrbanNook', url: `${SITE}/about-us` },
      publisher: { '@id': `${SITE}/#org` },
      ...(post.tags?.length ? { keywords: post.tags.join(', ') } : {}),
      ...(products.length ? { about: products.map((p) => ({ '@type': 'Product', name: p.productName, url: `${SITE}/product/${p.productId}` })) } : {}),
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Journal', item: `${SITE}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title, item: `${SITE}${url}` },
      ],
    },
  ];

  return (
    <div className="jp-page min-h-screen">
      {/* metaTitle is used as written; otherwise "<title> | UrbanNook". Admin → SEO Pages can still override. */}
      <SEOHead
        title={post.title}
        rawTitle={post.metaTitle || undefined}
        description={description}
        url={url}
        image={post.coverImage || undefined}
        type="article"
        structuredData={structuredData}
      />
      <Helmet>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700;800&family=Noto+Serif+JP:wght@400;600&display=swap" />
      </Helmet>

      {/* ── Hero: sumi-ink night, cover image, vertical title, hanko seal ── */}
      <header className="jp-hero" data-anim="hero">
        {post.coverImage && <img src={post.coverImage} alt={post.coverAlt || post.title} fetchPriority="high" className="jp-hero-img" />}
        <div className="jp-hero-shade" />
        <span className="jp-vertical" aria-hidden="true">刀の物語</span>
        <span className="jp-seal" aria-hidden="true">都<br />巣</span>
        <div className="relative max-w-[900px] mx-auto px-5 pt-24 pb-16 md:pb-24 w-full">
          <nav aria-label="Breadcrumb" className="text-xs tracking-[.2em] uppercase text-[#e9dcc0]/70 mb-10">
            <Link to="/" className="hover:text-white">Home</Link> <span className="mx-1">·</span> <Link to="/blog" className="hover:text-white">Journal</Link>
          </nav>
          <p className="jp-kicker" data-anim="kicker">UrbanNook Journal · 物語</p>
          <h1 className="jp-title" data-anim="title">{post.title}</h1>
          <p className="text-sm text-[#e9dcc0]/80 mt-6 tracking-wide">
            {post.author || 'UrbanNook'}{post.publishedAt ? ` · ${date(post.publishedAt)}` : ''}{post.readingMinutes ? ` · ${post.readingMinutes} min read` : ''}
          </p>
        </div>
      </header>
      <div className="jp-waves" aria-hidden="true" />

      {/* ── Story ── */}
      <article className="max-w-[720px] mx-auto px-5 pt-14 pb-10">
        {post.excerpt && <p className="jp-lede" data-anim="lede">{post.excerpt}</p>}
        <div className="jp-enso" aria-hidden="true">◯</div>
        <div className="jp-prose" data-anim="prose" dangerouslySetInnerHTML={{ __html: post.contentHtml || '' }} />
        {post.videoId && <VideoFacade id={post.videoId} title={post.title} />}
      </article>

      {/* ── Customer photos (approved reviews of the linked products) ── */}
      {reviews.length > 0 && (
        <section className="jp-band" data-anim="reviews">
          <div className="max-w-[1100px] mx-auto px-5 py-16">
            <p className="jp-kicker text-center">侍の間 · From our collectors</p>
            <h2 className="jp-h2 text-center">On real walls, in real rooms</h2>
            <div className="columns-2 md:columns-3 gap-4 mt-10 [&>*]:mb-4">
              {reviews.flatMap((r, ri) => r.images.map((src, ii) => (
                <figure key={`${ri}-${ii}`} className="jp-photo break-inside-avoid" data-anim="photo">
                  <button type="button" onClick={() => setZoom({ src, name: r.name })} className="block w-full" aria-label={`Open photo from ${r.name}`}>
                    <img src={src} alt={`Customer photo from ${r.name}`} loading="lazy" className="w-full" />
                  </button>
                  {ii === 0 && (
                    <figcaption className="p-3">
                      <Stars n={r.rating} />
                      <p className="text-sm leading-relaxed mt-1 line-clamp-3">“{r.text}”</p>
                      <p className="text-xs mt-2 tracking-widest uppercase opacity-60">— {r.name}</p>
                    </figcaption>
                  )}
                </figure>
              )))}
            </div>
          </div>
        </section>
      )}

      {/* ── Shop ── */}
      {products.length > 0 && (
        <section className="max-w-[1100px] mx-auto px-5 py-16" data-anim="shop">
          <p className="jp-kicker text-center">武器庫 · The armoury</p>
          <h2 className="jp-h2 text-center mb-10">Shop the pieces in this story</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((p, i) => (
              <UnProductCard key={p.productId} p={p} href={`/product/${p.productId}`} index={i} listId={`blog_${post.slug}`} listName={`Blog: ${post.title}`} showWishlist={false} />
            ))}
          </div>
        </section>
      )}

      {zoom && (
        <div role="dialog" aria-modal="true" aria-label="Customer photo" className="fixed inset-0 z-50 bg-black/85 grid place-items-center p-4" onClick={() => setZoom(null)}>
          <img src={zoom.src} alt={`Customer photo from ${zoom.name}`} className="max-h-[85vh] max-w-full rounded-lg" />
          <button type="button" className="absolute top-4 right-5 text-white text-3xl" aria-label="Close">×</button>
        </div>
      )}

      <style>{`
        .jp-page { --washi:#f3ead8; --washi-2:#ebdfc6; --sumi:#1c1a17; --shu:#b7282e; --kin:#a8843a;
          background-color: var(--washi); color: var(--sumi); font-family: 'Noto Serif JP', Georgia, serif;
          background-image: radial-gradient(rgba(120,90,40,.06) 1px, transparent 1px); background-size: 3px 3px; }
        .jp-hero { position: relative; min-height: 78vh; display: flex; align-items: flex-end; overflow: hidden; background: var(--sumi); color: #f6efe0; }
        .jp-hero-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: sepia(.35) contrast(1.05) brightness(.7); }
        .jp-hero-shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(28,26,23,.35) 0%, rgba(28,26,23,.2) 40%, rgba(28,26,23,.95) 100%); }
        .jp-vertical { position: absolute; top: 2rem; right: 1.25rem; writing-mode: vertical-rl; font-family: 'Shippori Mincho', serif; font-size: clamp(2rem, 6vw, 4.5rem); font-weight: 800; color: rgba(246,239,224,.18); letter-spacing: .15em; }
        .jp-seal { position: absolute; left: 1.25rem; top: 1.5rem; width: 3.2rem; padding: .35rem 0; text-align: center; line-height: 1.05; font-family: 'Shippori Mincho', serif; font-weight: 800; font-size: 1.15rem; color: #f6efe0; background: var(--shu); border-radius: 4px; transform: rotate(-4deg); box-shadow: 0 0 0 2px rgba(183,40,46,.35); }
        .jp-kicker { font-size: .72rem; letter-spacing: .32em; text-transform: uppercase; color: var(--kin); }
        .jp-title { font-family: 'Shippori Mincho', serif; font-weight: 800; font-size: clamp(2.1rem, 5.5vw, 4.2rem); line-height: 1.12; margin-top: 1rem; text-wrap: balance; }
        .jp-waves { height: 26px; background-color: var(--washi-2); background-image: ${SEIGAIHA}; border-top: 3px solid var(--shu); }
        .jp-lede { font-size: 1.25rem; line-height: 1.75; font-style: italic; color: #4a443b; }
        .jp-enso { text-align: center; color: var(--shu); font-size: 2rem; margin: 2rem 0 1rem; opacity: .7; }
        .jp-h2 { font-family: 'Shippori Mincho', serif; font-weight: 800; font-size: clamp(1.6rem, 3.5vw, 2.4rem); line-height: 1.2; margin-top: .6rem; }
        .jp-prose { counter-reset: sec; font-size: 17.5px; line-height: 1.9; }
        .jp-prose > * + * { margin-top: 1.15em; }
        .jp-prose > p:first-child::first-letter { float: left; font-family: 'Shippori Mincho', serif; font-weight: 800; font-size: 4.2em; line-height: .85; padding: .08em .12em 0 0; color: var(--shu); }
        .jp-prose h2 { counter-increment: sec; font-family: 'Shippori Mincho', serif; font-weight: 800; font-size: 1.75rem; line-height: 1.3; margin-top: 2.6em; padding-top: 1.4em; border-top: 1px solid rgba(28,26,23,.15); }
        .jp-prose h2::before { content: counter(sec, cjk-decimal); display: block; font-size: .85rem; letter-spacing: .3em; color: var(--shu); margin-bottom: .4rem; }
        .jp-prose h3 { font-family: 'Shippori Mincho', serif; font-weight: 700; font-size: 1.3rem; margin-top: 1.8em; }
        .jp-prose a { color: var(--shu); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 4px; }
        .jp-prose a:hover { background: rgba(183,40,46,.08); }
        .jp-prose ul { list-style: none; padding-left: 0; }
        .jp-prose ul li { position: relative; padding-left: 1.6em; }
        .jp-prose ul li::before { content: '◆'; position: absolute; left: 0; top: .1em; font-size: .7em; color: var(--shu); }
        .jp-prose ol { list-style: cjk-decimal; padding-left: 1.8em; }
        .jp-prose li + li { margin-top: .55em; }
        .jp-prose blockquote { margin: 2em 0; padding: 1.2em 1.4em; background: var(--washi-2); border-left: 4px solid var(--shu); font-family: 'Shippori Mincho', serif; font-size: 1.15em; }
        .jp-prose img { width: 100%; border: 8px solid #fff; box-shadow: 0 10px 30px -12px rgba(28,26,23,.45); }
        .jp-prose figcaption { font-size: .85rem; text-align: center; opacity: .7; margin-top: .5rem; }
        .jp-prose hr { border: 0; height: 20px; background-image: ${SEIGAIHA}; margin: 2.4em 0; }
        .jp-video { margin-top: 3rem; }
        .jp-video-frame { position: relative; aspect-ratio: 16/9; background: var(--sumi); border: 8px solid var(--sumi); outline: 1px solid var(--kin); outline-offset: 4px; overflow: hidden; }
        .jp-play { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); width: 4.5rem; height: 4.5rem; border-radius: 9999px; display: grid; place-items: center; background: var(--shu); color: #fff; font-size: 1.5rem; padding-left: .3rem; box-shadow: 0 0 0 8px rgba(183,40,46,.25); transition: transform .2s; }
        .jp-video button:hover .jp-play { transform: translate(-50%,-50%) scale(1.08); }
        .jp-video figcaption { text-align: center; font-size: .75rem; letter-spacing: .25em; text-transform: uppercase; color: var(--kin); margin-top: 1rem; }
        .jp-band { background-color: var(--sumi); color: #f6efe0; background-image: ${SEIGAIHA}; }
        .jp-band .jp-h2 { color: #f6efe0; }
        .jp-photo { background: #f6efe0; color: var(--sumi); padding: 6px; box-shadow: 0 12px 30px -14px rgba(0,0,0,.8); transition: transform .3s; }
        .jp-photo:nth-child(odd) { transform: rotate(-.6deg); } .jp-photo:nth-child(even) { transform: rotate(.6deg); }
        .jp-photo:hover { transform: rotate(0) translateY(-4px); }
        @media (prefers-reduced-motion: reduce) { .jp-photo, .jp-play { transition: none; } }
      `}</style>
    </div>
  );
};

export default BlogPostPage;
