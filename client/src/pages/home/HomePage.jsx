import { useEffect } from 'react';

// Import components directly for faster loading
import WhyChooseUs from './WhyChooseUs';
import AireHeroBanner from './AireHeroBanner';
import AireFeaturedProducts from './AireFeaturedProducts';
import AireTestimonials from './AireTestimonials';
import AireInstagramFeed from './AireInstagramFeed';
// const NewsTicker = lazy(() => import('./NewsTicker'));

const HomePage = () => {
    useEffect(() => {
      window.scrollTo(0, 0);
    }, []);
  return (
    <div className="min-h-screen">
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