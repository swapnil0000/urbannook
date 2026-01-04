import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import UserProfile from './UserProfile';

const NewHeader = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [cart, setCart] = useState([]);
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const [user, setUser] = useState(null);
  const [showUserProfile, setShowUserProfile] = useState(false);

  const getActiveRoute = () => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path.startsWith('/products') || path.startsWith('/product')) return 'products';
    if (path === '/about-us') return 'about-us';
    if (path === '/contact-us') return 'contact-us';
    return '';
  };

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

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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
    <>
      <header
        className="fixed top-7 left-6 right-6 z-50 bg-[#e8f8d7]/90 backdrop-blur-md shadow-md transition-all duration-300 rounded-full"
        style={{
          transform: showHeader ? 'translateY(0)' : 'translateY(-150%)',
        }}
      >
        <div className="max-w-7xl mx-auto px-5">
          <div className="flex items-center justify-between h-14">
            
            <div className="flex items-center">
              <a href="/" className="flex items-center">
                <img 
                    src="/assets/logo.jpeg" 
                    alt="UrbanNook Logo" 
                    className="h-7 w-auto object-contain" 
                />
              </a>
            </div>

            <nav className="hidden lg:flex items-center gap-6">
              {[
                { name: 'Home', path: '/', key: 'home' },
                { name: 'Products', path: '/products', key: 'products' },
                { name: 'About Us', path: '/about-us', key: 'about' },
                { name: 'Contact Us', path: '/contact-us', key: 'contact' }
              ].map((item) => {
                const isActive = getActiveRoute() === item.key;
                return (
                  <a 
                    key={item.key}
                    href={item.path}
                    className={`text-sm font-medium transition-all duration-200 ${
                      isActive 
                        ? 'text-emerald-700 bg-white/30 px-4 py-2 rounded-full' 
                        : 'text-black hover:text-emerald-700'
                    }`}
                  >
                    {item.name}
                  </a>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserProfile(!showUserProfile)}
                    className="flex items-center gap-2 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 hover:bg-white/30 hover:scale-105 transition-all duration-200 group"
                  >
                    <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:inline text-gray-900 text-sm font-medium">{user.name.split(' ')[0]}</span>
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
                  className="flex items-center gap-2 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 hover:bg-white/30 hover:scale-105 transition-all duration-200 group"
                >
                  <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center">
                    <i className="fa-solid fa-user text-white text-xs"></i>
                  </div>
                  <span className="hidden sm:inline text-gray-900 text-sm font-medium">Login</span>
                </button>
              )}

              <button
                className="relative flex items-center gap-2 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 hover:bg-white/30 hover:scale-105 transition-all duration-200 group"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={() => setShowCart(true)}
              >
                <div className="w-6 h-6 bg-emerald-700 rounded-full flex items-center justify-center">
                  <i className="fa-solid fa-shopping-cart text-white text-xs"></i>
                </div>
                <span className="hidden sm:inline text-gray-900 text-sm font-medium">Cart</span>
                
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg">
                    {cart.length}
                  </span>
                )}

                {showTooltip && (
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 text-xs text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap">
                    {cart.length || 0} items in cart
                  </div>
                )}
              </button>

              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden w-7 h-7 flex items-center justify-center text-black focus:outline-none"
              >
                <i className={`fa-solid ${isMenuOpen ? 'fa-times' : 'fa-bars'} text-lg`}></i>
              </button>
            </div>
          </div>

          {isMenuOpen && (
            <div className="lg:hidden py-3 border-t border-black/5 animate-in fade-in slide-in-from-top-2">
              <nav className="flex flex-col gap-1">
                {[
                  { name: 'Home', path: '/', key: 'home' },
                  { name: 'Products', path: '/products', key: 'products' },
                  { name: 'About Us', path: '/about', key: 'about' },
                  { name: 'Contact Us', path: '/contact', key: 'contact' }
                ].map((item) => {
                  const isActive = getActiveRoute() === item.key;
                  return (
                    <a 
                      key={item.key}
                      href={item.path}
                      className={`py-2 px-3 text-sm font-medium transition-all rounded-lg ${
                        isActive 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'text-black hover:bg-black/5'
                      }`}
                    >
                      {item.name}
                    </a>
                  );
                })}
              </nav>
            </div>
          )}
        </div>
      </header>
      
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
    </>
  );
};

export default NewHeader;