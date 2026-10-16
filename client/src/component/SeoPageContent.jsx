import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useSeoContent, faqPageJsonLd } from '../utils/seoContent';

// Product pages show the admin intro inside "Product details" and merge the
// admin FAQs into their own "Questions, answered" (ProductDetailPage.jsx).
const isProductPage = (pathname) => /^\/products?\//.test(pathname);

// Intro text and FAQs from Admin → SEO Pages for the current URL, above the
// footer on every page except product pages. Renders nothing when the URL has
// no such content. Same look as the product page's FAQ section.
const SeoPageContent = () => {
  const { pathname } = useLocation();
  const { intro, faqs } = useSeoContent();
  if (isProductPage(pathname) || (!intro.length && !faqs.length)) return null;

  return (
    <section className="bg-paper text-ink font-inter">
      {faqs.length > 0 && (
        <Helmet>
          <script type="application/ld+json">{JSON.stringify(faqPageJsonLd(faqs))}</script>
        </Helmet>
      )}
      <div className="max-w-3xl mx-auto px-5 py-16 space-y-12">
        {intro.length > 0 && (
          <div className="space-y-3 text-sm leading-relaxed text-muted">
            {intro.map((t, i) => <p key={i}>{t}</p>)}
          </div>
        )}
        {faqs.length > 0 && (
          <div>
            <p className="gl-lbl text-brand mb-2 text-center">Good to know</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-8 text-center">Questions, answered</h2>
            <div className="divide-y divide-hair border-y border-hair">
              {faqs.map((f, i) => (
                <details key={i} className="group py-4">
                  <summary className="flex items-center justify-between gap-4 cursor-pointer font-bold list-none">
                    <span>{f.q}</span>
                    <span className="shrink-0 text-brand text-2xl leading-none transition-transform duration-300 group-open:rotate-45">＋</span>
                  </summary>
                  <p className="text-muted text-sm mt-3 leading-relaxed">{f.a}</p>
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
