import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const NewBanner = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const banners = [
    {
      id: 1,
      type: 'video',
      title: "Transform Your Space",
      subtitle: "Aesthetic Home Essentials",
      description: "Discover our curated collection of beautiful home decor items that bring style and functionality to every corner of your space.",
      buttonText: "Shop Home Decor",
      buttonLink: "/product/home-decor",
      videoUrl: "https://videos.pexels.com/video-files/6195149/6195149-hd_1920_1080_25fps.mp4"
    },
    {
      id: 2,
      type: 'gradient',
      title: "Exclusive Deals",
      subtitle: "🎁 Limited Time Offers",
      offers: [
        { icon: "🎁", text: "Free gift with orders above ₹999" },
        { icon: "🚚", text: "Free shipping nationwide" },
        { icon: "💝", text: "Buy 2 Get 1 Free on keychains" },
        { icon: "⭐", text: "Extra 20% off on first order" }
      ],
      buttonText: "Shop Now",
      buttonLink: "/products"
    },
    {
      id: 3,
      type: 'gradient',
      title: "Why UrbanNook?",
      subtitle: "Trusted by 10,000+ Customers",
      stats: [
        { number: "10K+", label: "Happy Customers", icon: "👥" },
        { number: "500+", label: "Products", icon: "📦" },
        { number: "4.8⭐", label: "Rating", icon: "⭐" },
        { number: "50+", label: "Cities", icon: "🏙️" }
      ],
      features: [
        "✅ Premium Quality Products",
        "✅ 30-Day Return Policy",
        "✅ 24/7 Customer Support",
        "✅ Secure Payment Gateway"
      ],
      buttonText: "Start Shopping",
      buttonLink: "/products"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % banners.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
  };

  return (
    <section className="relative h-screen overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {banner.type === 'video' ? (
              <>
                <video
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                >
                  <source src={banner.videoUrl} type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-black bg-opacity-40"></div>
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-primary"></div>
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="max-w-7xl mx-auto px-8 w-full">
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className={`transition-all duration-1000 transform ${
                index === currentSlide
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
              }`}
              style={{ display: index === currentSlide ? 'block' : 'none' }}
            >
              {banner.type === 'video' && (
                <div className="max-w-2xl">
                  <h1 className="text-6xl md:text-7xl font-bold text-white mb-4 leading-tight">
                    {banner.title}
                  </h1>
                  <h2 className="text-2xl md:text-3xl text-accent font-semibold mb-6">
                    {banner.subtitle}
                  </h2>
                  <p className="text-xl text-gray-200 mb-8 leading-relaxed max-w-xl">
                    {banner.description}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={() => navigate(banner.buttonLink)}
                      className="bg-primary hover:bg-accent text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 hover:scale-105 shadow-lg"
                    >
                      {banner.buttonText}
                    </button>
                    <button
                      onClick={() => navigate('/products')}
                      className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300"
                    >
                      View All Products
                    </button>
                  </div>
                </div>
              )}

              {banner.type === 'gradient' && banner.offers && (
                <div className="max-w-4xl">
                  <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
                    {banner.title}
                  </h1>
                  <h2 className="text-3xl md:text-4xl text-white font-semibold mb-8">
                    {banner.subtitle}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {banner.offers.map((offer, idx) => (
                      <div key={idx} className="bg-white/20 backdrop-blur-sm rounded-lg p-4 flex items-center gap-4">
                        <span className="text-3xl">{offer.icon}</span>
                        <span className="text-white text-lg font-medium">{offer.text}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => navigate(banner.buttonLink)}
                    className="bg-white hover:bg-gray-100 text-primary px-10 py-4 rounded-lg font-bold text-xl transition-all duration-300 hover:scale-105 shadow-lg"
                  >
                    {banner.buttonText} 🛍️
                  </button>
                </div>
              )}

              {banner.type === 'gradient' && banner.stats && (
                <div className="max-w-5xl">
                  <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
                    {banner.title}
                  </h1>
                  <h2 className="text-2xl md:text-3xl text-white font-semibold mb-8">
                    {banner.subtitle}
                  </h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                    {banner.stats.map((stat, idx) => (
                      <div key={idx} className="text-center bg-white/20 backdrop-blur-sm rounded-lg p-4">
                        <div className="text-3xl mb-2">{stat.icon}</div>
                        <div className="text-3xl font-bold text-white mb-1">{stat.number}</div>
                        <div className="text-gray-100 text-sm">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {banner.features.map((feature, idx) => (
                      <div key={idx} className="text-white text-lg">{feature}</div>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => navigate(banner.buttonLink)}
                    className="bg-white hover:bg-gray-100 text-primary px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 hover:scale-105 shadow-lg"
                  >
                    {banner.buttonText}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center text-white transition-all duration-300"
      >
        <i className="fa-solid fa-chevron-left"></i>
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center text-white transition-all duration-300"
      >
        <i className="fa-solid fa-chevron-right"></i>
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-3">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentSlide
                ? 'bg-white scale-125'
                : 'bg-white bg-opacity-50 hover:bg-opacity-75'
            }`}
          />
        ))}
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 right-8 z-20 text-white animate-bounce">
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm opacity-75">Scroll</span>
          <i className="fa-solid fa-chevron-down"></i>
        </div>
      </div>
    </section>
  );
};

export default NewBanner;