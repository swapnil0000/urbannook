import React, { useState } from 'react';

const NewBanner = () => {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <section className="relative px-8 py-16 min-h-[600px] flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-bgSecondary to-accent/10"></div>
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1920&h=1080&fit=crop')] bg-cover bg-center bg-no-repeat"></div>
      </div>
      
      {/* Decorative Elements */}
      <div className="absolute top-20 right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-20 left-20 w-48 h-48 bg-accent/5 rounded-full blur-2xl animate-float-reverse"></div>
      
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
        {/* Content */}
        <div className="flex flex-col gap-6">
          <div className="inline-flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-full text-sm font-semibold w-fit">
            ✨ New Collection
          </div>

          <h1 className="text-5xl font-bold text-textPrimary leading-tight">
            Aesthetic Essentials
          </h1>
          
          <p className="text-lg text-textSecondary leading-relaxed">
            Curating your space with minimalist keychains, posters, and desk accessories.
          </p>
          
          <div className="flex gap-4 items-center">
            <button className="bg-primary text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:bg-accent transition-all">
              <i className="fa-solid fa-shopping-bag"></i>
              Shop New Arrivals
            </button>
            <button 
              onClick={() => setShowVideo(true)}
              className="bg-transparent text-textPrimary border border-borderPrimary px-5 py-3 rounded-lg font-semibold flex items-center gap-2 hover:bg-primary hover:text-white hover:border-primary transition-all"
            >
              <i className="fa-solid fa-play"></i>
              Watch Demo
            </button>
          </div>
          
          {/* Stats */}
          <div className="flex gap-8 mt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-textPrimary">500+</p>
              <p className="text-sm text-textSecondary">Products</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-textPrimary">10K+</p>
              <p className="text-sm text-textSecondary">Happy Customers</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-textPrimary">4.8⭐</p>
              <p className="text-sm text-textSecondary">Average Rating</p>
            </div>
          </div>
        </div>

        {/* Product Image/Video */}
        <div className="relative flex justify-center items-center">
          <div className="relative w-full max-w-lg">
            <img 
              src="https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&h=500&fit=crop" 
              alt="Aesthetic keychain collection"
              className="w-full h-auto rounded-xl shadow-2xl"
            />
            {/* Video Play Overlay */}
            <div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
              <button 
                onClick={() => setShowVideo(true)}
                className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all duration-300 shadow-2xl"
              >
                <i className="fa-solid fa-play text-2xl ml-1"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Modal */}
      {showVideo && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl overflow-hidden">
            <button 
              onClick={() => setShowVideo(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors z-10"
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
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default NewBanner;