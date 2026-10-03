import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useGetSeoDataQuery } from '../store/api/productsApi';
import { normalizeSeoPath } from '../utils/seoMerge';

const paragraphs = (text = '') => text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);

// Intro text and FAQs from Admin → SEO Pages for the current URL, shown above
// the footer on any page. Renders nothing when the URL has no such content.
// The FAQ schema is only emitted here, next to the visible FAQs it describes.
const SeoPageContent = () => {
  const { pathname } = useLocation();
  const { data } = useGetSeoDataQuery(normalizeSeoPath(pathname));
  const seo = data?.data;
  const intro = paragraphs(seo?.introContent);
  const faqs = (seo?.faqs || []).filter((f) => f?.question && f?.answer);
  if (!intro.length && !faqs.length) return null;

  return (
    <section className="bg-surface text-ink font-inter">
      {faqs.length > 0 && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify({
              '@context': 'https://schema.org', '@type': 'FAQPage',
              mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
            })}
          </script>
        </Helmet>
      )}
      <div className="max-w-3xl mx-auto px-5 py-12 space-y-8">
        {intro.length > 0 && (
          <div className="space-y-3 text-[15px] leading-relaxed text-muted">
            {intro.map((t, i) => <p key={i}>{t}</p>)}
          </div>
        )}
        {faqs.length > 0 && (
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight mb-4">Frequently asked questions</h2>
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
          </div>
        )}
      </div>
    </section>
  );
};

export default SeoPageContent;
