import React from 'react';
import NewHeader from '../component/layout/NewHeader';
import NewBanner from '../component/layout/NewBanner';
import Footer from '../component/layout/Footer';
import InstagramFeed from './InstagramFeed';
import Testimonials from './Testimonials';
import WhyChooseUs from './WhyChooseUs';
import ProductListing from './ProductListing';

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
      <Testimonials/>
      
      {/* Instagram Feed Section */}
      <InstagramFeed />
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default HomePage;