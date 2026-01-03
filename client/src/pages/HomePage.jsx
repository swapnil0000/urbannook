
import WhyChooseUs from './WhyChooseUs';
import AireHeroBanner from '../component/layout/AireHeroBanner';
import AireFeaturedProducts from '../component/layout/AireFeaturedProducts';
import AireTestimonials from '../component/layout/AireTestimonials';
import AireInstagramFeed from '../component/layout/AireInstagramFeed';
import Footer from '../component/layout/Footer';

const HomePage = () => {
  return (
    <div className="min-h-screen">
      <AireHeroBanner />
      
      <AireFeaturedProducts />
      
      <WhyChooseUs />
      
      <AireTestimonials />
     
      <AireInstagramFeed />
      
      <Footer />
      
      {/* Previous UI (Commented out) */}
      {/* 
      <NewBanner />
      <FeaturedSection />
      <CategoriesSection />
      */}
    </div>
  );
};

export default HomePage;