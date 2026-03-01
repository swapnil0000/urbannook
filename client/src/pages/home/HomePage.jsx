
import { useEffect, lazy, Suspense } from 'react';

// Lazy load home page components
const WhyChooseUs = lazy(() => import('./WhyChooseUs'));
const AireHeroBanner = lazy(() => import('./AireHeroBanner'));
const AireFeaturedProducts = lazy(() => import('./AireFeaturedProducts'));
const AireTestimonials = lazy(() => import('./AireTestimonials'));
const AireInstagramFeed = lazy(() => import('./AireInstagramFeed'));
const NewsTicker = lazy(() => import('./NewsTicker'));

const HomePage = () => {
    useEffect(() => {
      window.scrollTo(0, 0);
    }, []);
  return (
    <div className="min-h-screen">
      <Suspense fallback={
        <div className="h-screen flex items-center justify-center bg-[#2e443c]">
          <div className="w-8 h-8 border-2 border-[#a89068] border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        {/* <NewsTicker/>   */}
        <AireHeroBanner />
        <AireFeaturedProducts />
        <WhyChooseUs />
        <AireTestimonials />
        <AireInstagramFeed />
      </Suspense>
    </div>
  );
};

export default HomePage;