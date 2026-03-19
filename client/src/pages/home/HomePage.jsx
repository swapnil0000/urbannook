import { useEffect } from 'react';
import SEOHead from '../../component/SEOHead';

// Import components directly for faster loading
import WhyChooseUs from './WhyChooseUs';
import AireHeroBanner from './AireHeroBanner';
import AireFeaturedProducts from './AireFeaturedProducts';
import AireTestimonials from './AireTestimonials';
import AireInstagramFeed from './AireInstagramFeed';
import NewLaunchPopup from '../../component/NewLaunchPopup';

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
      <NewLaunchPopup />
      {/* No Suspense wrapper - components load immediately */}
      <AireHeroBanner />
      <AireFeaturedProducts />
      <WhyChooseUs />
      <AireTestimonials />
      <AireInstagramFeed />
    </div>
  );
};

export default HomePage;