import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useGetSeoDataQuery } from '../store/api/productsApi';
import { mergeSeo, normalizeSeoPath } from '../utils/seoMerge';

const SITE_NAME = 'UrbanNook';
const SITE_URL = 'https://www.urbannook.in';
const DEFAULT_IMAGE = `${SITE_URL}/assets/logo_with_text.webp`;
const DEFAULT_DESCRIPTION =
  'UrbanNook — Premium 3D printed home decor, lighting & lifestyle products. Proudly made in India. Shop modern, minimal designs delivered pan-India.';

const SEOHead = ({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  structuredData,
  noIndex = false,
}) => {
  const { pathname } = useLocation();
  // Admin → SEO Pages overrides for this URL (null when none). While it loads,
  // or if it fails, the page's own values are used.
  const { data: seoRes } = useGetSeoDataQuery(normalizeSeoPath(pathname));

  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Modern Lifestyle Store`;
  // No url → no canonical. Defaulting to the homepage told Google every such page was a duplicate of it.
  const canonicalUrl = url ? `${SITE_URL}${url}` : null;

  const seo = mergeSeo(
    {
      fullTitle, description, canonicalUrl, image, noIndex,
      ogTitle: fullTitle, ogDescription: description,
      structuredData: [].concat(structuredData || []),
    },
    seoRes?.data || null,
  );

  return (
    <Helmet>
      {/* Primary */}
      <title>{seo.fullTitle}</title>
      <meta name="description" content={seo.description} />
      {seo.canonicalUrl && <link rel="canonical" href={seo.canonicalUrl} />}
      {/* The only robots tag on the page (index.html has none, so they never conflict). */}
      <meta name="robots" content={seo.noIndex ? 'noindex, nofollow' : 'index, follow'} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={seo.ogTitle} />
      <meta property="og:description" content={seo.ogDescription} />
      <meta property="og:image" content={seo.image} />
      {seo.canonicalUrl && <meta property="og:url" content={seo.canonicalUrl} />}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_IN" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seo.ogTitle} />
      <meta name="twitter:description" content={seo.ogDescription} />
      <meta name="twitter:image" content={seo.image} />
      <meta name="twitter:site" content="@urbannookstore" />

      {/* Structured Data */}
      {seo.structuredData.map((data, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEOHead;
