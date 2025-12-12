import React from 'react';
import NewHeader from '../component/layout/NewHeader';
import NewBanner from '../component/layout/NewBanner';
import ProductListing from '../component/layout/ProductListing';
import WhyChooseUs from '../component/layout/WhyChooseUs';
import Testimonials from '../component/layout/Testimonials';
import InstagramFeed from '../component/layout/InstagramFeed';
import Footer from '../component/layout/Footer';

const HomePage = () => {
  return (
    <div className="min-h-screen">
      
      {/* Hero Banner */}
      <NewBanner />
      
      {/* Product Listing */}
      <ProductListing />
      
      {/* Why Choose Us Section */}
      <WhyChooseUs />
      
      {/* Testimonials Section */}
      <Testimonials />
      
      {/* Instagram Feed Section */}
      <InstagramFeed />
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default HomePage;