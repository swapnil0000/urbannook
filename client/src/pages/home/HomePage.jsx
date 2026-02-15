
import { useEffect } from 'react';
import WhyChooseUs from './WhyChooseUs';
import AireHeroBanner from './AireHeroBanner';
import AireFeaturedProducts from './AireFeaturedProducts';
import AireTestimonials from './AireTestimonials';
import AireInstagramFeed from './AireInstagramFeed';
import NewsTicker from './NewsTicker';

const HomePage = () => {
    useEffect(() => {
      window.scrollTo(0, 0);
    }, []);
  return (
    <div className="min-h-screen">
      {/* <NewsTicker/>   */}
      <AireHeroBanner />
      <AireFeaturedProducts />
      <WhyChooseUs />
      <AireTestimonials />
      <AireInstagramFeed />
    </div>
  );
};

export default HomePage;