
import Footer from '../component/layout/Footer';
import { useEffect } from 'react';
import WhyChooseUs from '../component/home/WhyChooseUs';
import AireHeroBanner from '../component/home/AireHeroBanner';
import AireFeaturedProducts from '../component/home/AireFeaturedProducts';
import AireTestimonials from '../component/home/AireTestimonials';
import AireInstagramFeed from '../component/home/AireInstagramFeed';

const HomePage = () => {
    useEffect(() => {
      window.scrollTo(0, 0);
    }, []);
  return (
    <div className="min-h-screen">
      <AireHeroBanner />  
      <AireFeaturedProducts />
      <WhyChooseUs />
      <AireTestimonials />
      <AireInstagramFeed />
      <Footer />
    </div>
  );
};

export default HomePage;