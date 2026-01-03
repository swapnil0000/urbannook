import React, { useState, useEffect } from 'react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import UserProfile from './UserProfile';

const AireHeroBanner = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);
  const [showUserProfile, setShowUserProfile] = useState(false);

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(savedCart);
    
    const savedUser = JSON.parse(localStorage.getItem('user') || 'null');
    setUser(savedUser);

    const handleStorageChange = () => {
      const updatedCart = JSON.parse(localStorage.getItem('cart') || '[]');
      setCart(updatedCart);
      
      const updatedUser = JSON.parse(localStorage.getItem('user') || 'null');
      setUser(updatedUser);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleSignupSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <section className="relative h-[calc(100vh-2rem)] min-h-[600px] max-h-[900px] mx-4 my-4 rounded-[2.5rem] overflow-hidden bg-[#e8e6e1] shadow-2xl">
      
      {/* Top Navigation Bar */}
      <div className="absolute top-6 left-6 right-6 z-40 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center">
          <img 
            src="/assets/logo.jpeg" 
            alt="UrbanNook Logo" 
            className="h-8 w-auto object-contain" 
          />
        </div>

        {/* Login & Cart Icons */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserProfile(!showUserProfile)}
                className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-white/40 hover:bg-white/90 transition-all group"
              >
                <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-800">{user.name.split(' ')[0]}</span>
                <i className="fa-solid fa-chevron-down text-xs text-gray-600"></i>
              </button>
              
              {showUserProfile && (
                <UserProfile 
                  user={user}
                  onLogout={handleLogout}
                  onClose={() => setShowUserProfile(false)}
                />
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-white/40 hover:bg-white/90 transition-all group"
            >
              <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center">
                <i className="fa-solid fa-user text-white text-xs"></i>
              </div>
              <span className="text-sm font-medium text-gray-800">Login</span>
            </button>
          )}

          <button className="relative flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-white/40 hover:bg-white/90 transition-all">
            <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center">
              <i className="fa-solid fa-shopping-cart text-white text-xs"></i>
            </div>
            <span className="text-sm font-medium text-gray-800">Cart</span>
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Background Decorative Gradient Blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-200/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gray-300/40 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>

      {/* Main Content Container */}
      <div className="relative z-10 h-full flex items-center px-6 md:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center w-full max-w-7xl mx-auto h-full">
          
          {/* Left Content */}
          <div className="space-y-8 flex flex-col justify-center lg:pr-12 order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-white/40 w-fit">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs font-bold tracking-widest uppercase text-gray-600">New Collection 2024</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-serif text-gray-900 leading-[1.1]">
              Elevate Your <br />
              <span className="italic font-light text-gray-600">Everyday Carry</span>
            </h1>
            
            <p className="text-lg text-gray-600 leading-relaxed max-w-lg">
              Discover the intersection of utility and style. From artisan keychains to premium car accessories, redefine what you carry.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <button className="bg-gray-900 text-white px-10 py-4 rounded-full font-medium hover:bg-black hover:scale-105 hover:shadow-xl transition-all duration-300">
                Shop Collection
              </button>
              <button className="px-8 py-4 rounded-full font-medium text-gray-800 border border-gray-300 hover:bg-white/50 transition-all flex items-center gap-2">
                <i className="fa-solid fa-play text-xs border border-gray-800 rounded-full p-1.5"></i>
                Watch Film
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="pt-8 flex items-center gap-8 border-t border-gray-300/50 mt-4">
                <div>
                    <p className="text-3xl font-bold text-gray-900">25k+</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Happy Users</p>
                </div>
                <div>
                    <p className="text-3xl font-bold text-gray-900">4.9</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Rating</p>
                </div>
            </div>
          </div>

          {/* Right Content - Product Showcase */}
          <div className="relative h-full flex items-center justify-center lg:justify-end order-1 lg:order-2">
            
            {/* Main Large Image */}
            <div className="relative w-[320px] md:w-[420px] aspect-[3/4] rounded-[2.5rem] overflow-hidden shadow-2xl rotate-[-2deg] hover:rotate-0 transition-transform duration-500 ease-out z-10">
              <img 
                src="https://images.unsplash.com/photo-1616401776146-2495d4d38382?q=80&w=800&auto=format&fit=crop" 
                alt="Urban Interior" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
              
              {/* Image Overlay Text */}
              <div className="absolute bottom-8 left-8 text-white">
                <p className="font-serif text-2xl italic">The Urban Series</p>
                <p className="text-sm opacity-80">Limited Edition</p>
              </div>
            </div>

            {/* Floating Card 1 (Top Left) */}
            <div className="absolute top-[10%] left-0 md:-left-8 bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-xl z-20 animate-[float_6s_ease-in-out_infinite]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                  <img src="https://images.unsplash.com/photo-1622434641406-a158123450f9?w=150&fit=crop" alt="Watch" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">Smart Key</p>
                  <p className="text-xs text-green-600 font-medium">$24.00</p>
                </div>
              </div>
            </div>

            {/* Floating Card 2 (Bottom Right) */}
            <div className="absolute bottom-[15%] -right-4 md:right-8 bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-xl z-20 animate-[float_5s_ease-in-out_infinite_reverse]">
               <div className="flex flex-col gap-2">
                 <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-bold text-gray-500 uppercase">Best Seller</span>
                    <i className="fa-solid fa-star text-yellow-500 text-xs"></i>
                 </div>
                 <p className="text-lg font-serif italic text-gray-900">Leather Folio</p>
                 <button className="text-xs bg-black text-white px-4 py-2 rounded-full w-full mt-1">View</button>
               </div>
            </div>

            {/* Decorative Circle Behind */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[80%] border border-gray-400/30 rounded-full rotate-12 -z-0"></div>

          </div>
        </div>
      </div>

      {/* WhatsApp Button */}
      <div className="absolute bottom-8 right-8 z-50">
        <button className="w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#1da851] hover:scale-110 transition-all duration-300">
          <i className="fab fa-whatsapp text-2xl"></i>
        </button>
      </div>

      {/* Login Modal */}
      {showLogin && (
        <LoginForm 
          onClose={() => setShowLogin(false)}
          onLoginSuccess={handleLoginSuccess}
          onSwitchToSignup={() => {
            setShowLogin(false);
            setShowSignup(true);
          }}
        />
      )}

      {/* Signup Modal */}
      {showSignup && (
        <SignupForm 
          onClose={() => setShowSignup(false)}
          onSignupSuccess={handleSignupSuccess}
          onSwitchToLogin={() => {
            setShowSignup(false);
            setShowLogin(true);
          }}
        />
      )}
    </section>
  );
};

export default AireHeroBanner;