import { useEffect, lazy, Suspense } from 'react';
import SEOHead from '../../component/SEOHead';

// Hero loads immediately — it's the LCP element
import AireHeroBanner from './AireHeroBanner';

// Everything below the fold is lazy loaded
const AireFeaturedProducts = lazy(() => import('./AireFeaturedProducts'));
const WhyChooseUs = lazy(() => import('./WhyChooseUs'));
const AireTestimonials = lazy(() => import('./AireTestimonials'));
const AireInstagramFeed = lazy(() => import('./AireInstagramFeed'));
const NewLaunchPopup = lazy(() => import('../../component/NewLaunchPopup'));

const HOME_STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'UrbanNook',
  url: 'https://www.urbannook.in',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://www.urbannook.in/products?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};


const HomePage = () => {
    useEffect(() => {
      window.scrollTo(0, 0);
    }, []);
  return (
    <div className="min-h-screen">
      <SEOHead
        url="/"
        structuredData={HOME_STRUCTURED_DATA}
      />
      <Suspense fallback={null}>
        <NewLaunchPopup />
      </Suspense>
      {/* Hero loads immediately — critical for LCP */}
      <AireHeroBanner />
      {/* Below-fold sections lazy loaded */}
      <Suspense fallback={<div className="mx-2 my-2 md:mx-4 md:my-4 rounded-[2rem] md:rounded-[3rem] min-h-[85vh] bg-[#2e443c]" />}>
        <AireFeaturedProducts />
      </Suspense>
      <Suspense fallback={<div style={{ height: '300vh' }} className="bg-stone-900" />}>
        <WhyChooseUs />
      </Suspense>
      <Suspense fallback={<div className="mx-2 my-2 md:mx-4 md:my-4 rounded-[1.5rem] md:rounded-[2.5rem] min-h-[97vh] bg-[#1a2822]" />}>
        <AireTestimonials />
      </Suspense>
      <Suspense fallback={<div className="mx-2 my-2 md:mx-4 md:my-4 rounded-[1.5rem] md:rounded-[2.5rem] min-h-[70vh] bg-[#2e443c]" />}>
        <AireInstagramFeed />
      </Suspense>
    </div>
  );
};

export default HomePage;