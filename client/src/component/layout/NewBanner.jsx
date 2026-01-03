import React, { useState, useEffect } from 'react';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';

const NewBanner = () => {
  const [showVideo, setShowVideo] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [titleRef, titleVisible] = useScrollAnimation();
  const [contentRef, contentVisible] = useScrollAnimation();
  const [imageRef, imageVisible] = useScrollAnimation();

  const slides = [
    {
      title: "Aesthetic Essentials",
      subtitle: "Transform Your Space",
      description: "Curating your world with minimalist keychains, posters, and desk accessories that speak your style.",
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=600&fit=crop",
      cta: "Shop Collection"
    },
    {
      title: "Workspace Goals",
      subtitle: "Productivity Meets Style",
      description: "Elevate your desk setup with our premium organizers and aesthetic accessories.",
      image: "https://images.unsplash.com/photo-1586717799252-bd134ad00e26?w=600&h=600&fit=crop",
      cta: "Explore Desk Items"
    },
    {
      title: "Personal Touch",
      subtitle: "Express Yourself",
      description: "From keychains to wall art, find pieces that reflect your unique personality.",
      image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=600&fit=crop",
      cta: "Discover More"
    }
  ];

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
      
    <section className="relative min-h-screen overflow-hidden" style={{
      borderRadius:'30px'
    }}>
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-cyan-500"></div>
        
        <div className="absolute inset-0">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="none">
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(59, 130, 246, 0.8)" />
                <stop offset="100%" stopColor="rgba(16, 185, 129, 0.6)" />
              </linearGradient>
              <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(16, 185, 129, 0.4)" />
                <stop offset="100%" stopColor="rgba(6, 182, 212, 0.6)" />
              </linearGradient>
            </defs>
            <path d="M0,0 L1200,0 L1200,400 Q600,500 0,400 Z" fill="url(#grad1)" className="animate-pulse" />
            <path d="M0,200 Q600,100 1200,200 L1200,800 L0,800 Z" fill="url(#grad2)" className="animate-pulse" style={{animationDelay: '1s'}} />
          </svg>
        </div>
        
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl animate-float"></div>
          <div className="absolute top-40 right-32 w-24 h-24 bg-white/15 rotate-45 blur-lg animate-float-reverse"></div>
          <div className="absolute bottom-32 left-40 w-40 h-40 bg-white/5 rounded-full blur-2xl animate-float"></div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10 min-h-screen flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center w-full">
          <div ref={contentRef} className="relative order-2 lg:order-1">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-[3rem] transform -rotate-2 scale-105"></div>
            
            <div className="relative flex flex-col gap-6 text-center lg:text-left p-8">
              <div className={`inline-flex items-center gap-2 bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-full text-sm font-semibold w-fit mx-auto lg:mx-0 shadow-lg border border-white/30 transition-all duration-1000 ${
                contentVisible ? 'opacity-100 animate-slideInDown' : 'opacity-0'
              }`}>
                <span className="animate-pulse">✨</span> {slides[currentSlide].subtitle}
              </div>

              <h1 ref={titleRef} className={`text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight transition-all duration-1000 ${
                titleVisible ? 'opacity-100 animate-slideInLeft' : 'opacity-0'
              }`}>
                <span className="bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent drop-shadow-2xl">
                  {slides[currentSlide].title}
                </span>
              </h1>
              
              <p className={`text-lg md:text-xl text-white/90 leading-relaxed max-w-lg mx-auto lg:mx-0 transition-all duration-1000 delay-200 ${
                contentVisible ? 'opacity-100 animate-slideInLeft' : 'opacity-0'
              }`}>
                {slides[currentSlide].description}
              </p>
              
              <div className={`transition-all duration-1000 delay-300 ${
                contentVisible ? 'opacity-100 animate-slideInUp' : 'opacity-0'
              }`}>
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <button className="bg-white text-primary px-8 py-4 rounded-2xl font-semibold flex items-center gap-3 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all hover:bg-gray-50">
                    <i className="fa-solid fa-shopping-bag"></i>
                    {slides[currentSlide].cta}
                  </button>
                  <button 
                    onClick={() => setShowVideo(true)}
                    className="bg-white/20 backdrop-blur-md text-white border-2 border-white/30 px-6 py-4 rounded-2xl font-semibold flex items-center gap-3 hover:bg-white/30 transition-all shadow-lg"
                  >
                    <i className="fa-solid fa-play"></i>
                    Watch Demo
                  </button>
                </div>
              </div>
              
              {!isMobile && (
                <div className={`flex gap-8 mt-8 justify-center lg:justify-start transition-all duration-1000 delay-500 ${
                  contentVisible ? 'opacity-100 animate-slideInUp' : 'opacity-0'
                }`}>
                  {[
                    { value: '500+', label: 'Products' },
                    { value: '10K+', label: 'Happy Customers' },
                    { value: '4.8⭐', label: 'Average Rating' }
                  ].map((stat, index) => (
                    <div key={index} className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                      <p className="text-sm text-white/80">{stat.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div ref={imageRef} className={`relative flex justify-center items-center order-1 lg:order-2 transition-all duration-1000 delay-400 ${
            imageVisible ? 'opacity-100 animate-slideInRight' : 'opacity-0'
          }`}>
            <div className="relative w-full max-w-lg">
              <div className="absolute inset-0 transform scale-110">
                <svg viewBox="0 0 400 400" className="w-full h-full">
                  <defs>
                    <linearGradient id="blobGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgba(255, 255, 255, 0.2)" />
                      <stop offset="100%" stopColor="rgba(255, 255, 255, 0.1)" />
                    </linearGradient>
                  </defs>
                  <path d="M200,50 Q300,100 350,200 Q300,300 200,350 Q100,300 50,200 Q100,100 200,50 Z" 
                        fill="url(#blobGrad)" 
                        className="animate-pulse" />
                </svg>
              </div>
              
              <div className="relative z-10">
                <div className="relative overflow-hidden shadow-2xl transform hover:scale-105 transition-all duration-500" 
                     style={{
                       borderRadius: '60px 20px 60px 20px',
                       background: 'linear-gradient(45deg, rgba(255,255,255,0.1), rgba(255,255,255,0.2))'
                     }}>
                  <img 
                    src={slides[currentSlide].image}
                    alt={slides[currentSlide].title}
                    className="w-full h-80 md:h-96 object-cover"
                    style={{ borderRadius: '60px 20px 60px 20px' }}
                  />
                </div>
                
                <div className="absolute -top-6 -right-6 bg-white rounded-3xl p-4 shadow-xl animate-float transform rotate-12">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center">
                      <i className="fa-solid fa-star text-white text-sm"></i>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-textPrimary">4.9/5</p>
                      <p className="text-xs text-textSecondary">Rating</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showVideo && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl bg-white overflow-hidden" style={{borderRadius: '40px 10px 40px 10px'}}>
            <button 
              onClick={() => setShowVideo(false)}
              className="absolute top-4 right-4 w-12 h-12 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors z-10"
            >
              <i className="fa-solid fa-times"></i>
            </button>
            <div className="aspect-video">
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                title="UrbanNook Product Demo"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
                style={{borderRadius: '40px 10px 40px 10px'}}
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default NewBanner;