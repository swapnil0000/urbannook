import { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import UserProfile from './UserProfile';
import CartDrawer from './CartDrawer'; // <--- 1. Import the CartDrawer

const NewHeader = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showCart, setShowCart] = useState(false); // Controls the Drawer
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

  // Sync Cart & User from LocalStorage
  useEffect(() => {
    const syncState = () => {
      setCart(JSON.parse(localStorage.getItem('cart') || '[]'));
      setUser(JSON.parse(localStorage.getItem('user') || 'null'));
    };
    syncState();
    window.addEventListener('storage', syncState);
    return () => window.removeEventListener('storage', syncState);
  }, []);

  // Hide/Show Header on Scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (!isMenuOpen) {
        if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
          setShowHeader(false);
        } else {
          setShowHeader(true);
        }
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMenuOpen]);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('storage'));
    setShowUserProfile(false);
  };

  return (
    <>
      <header
        className={`fixed top-4 left-4 right-4 md:top-6 md:left-6 md:right-6 z-50 bg-[#e8f8d7]/95 backdrop-blur-xl shadow-lg transition-all duration-300 ease-in-out ${
          isMenuOpen ? 'rounded-3xl' : 'rounded-full'
        }`}
        style={{
          transform: showHeader ? 'translateY(0)' : 'translateY(-150%)',
        }}
      >
        <div className="px-4 md:px-6 py-2 md:py-3">
          
          {/* Main Flex Container */}
          <div className="flex items-center justify-between relative h-10 md:h-11">
            
            {/* --- LEFT SECTION: Mobile Menu Button --- */}
            <div className="flex items-center z-20">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full bg-white/40 hover:bg-white/60 transition-colors focus:outline-none"
              >
                <i className={`fa-solid ${isMenuOpen ? 'fa-xmark' : 'fa-bars'} text-lg text-gray-800`}></i>
              </button>

              {/* Desktop Logo (Hidden on Mobile) */}
              <Link to="/" className="hidden lg:flex items-center shrink-0">
                <img 
                    src="/assets/logo.jpeg" 
                    alt="UrbanNook" 
                    className="h-9 w-auto object-contain rounded-full mix-blend-multiply" 
                />
              </Link>
            </div>

            {/* --- CENTER SECTION: Mobile Logo (Absolute Center) & Desktop Nav --- */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:static lg:translate-x-0 lg:translate-y-0 z-10">
              {/* Mobile Logo */}
              <Link to="/" className="lg:hidden flex items-center">
                 <img 
                    src="/assets/logo.jpeg" 
                    alt="UrbanNook" 
                    className="h-8 w-auto object-contain rounded-full mix-blend-multiply" 
                />
              </Link>

              {/* Desktop Nav */}
              <nav className="hidden lg:flex items-center gap-2 bg-white/30 px-2 py-1.5 rounded-full border border-white/20">
                {[
                  { name: 'Home', path: '/', key: 'home' },
                  { name: 'Products', path: '/products', key: 'products' },
                  { name: 'About Us', path: '/about-us', key: 'about-us' },
                  { name: 'Contact Us', path: '/contact-us', key: 'contact-us' }
                ].map((item) => {
                  const isActive = getActiveRoute() === item.key;
                  return (
                    <a 
                      key={item.key}
                      href={item.path}
                      className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                        isActive 
                          ? 'bg-emerald-700 text-white shadow-md' 
                          : 'text-gray-700 hover:text-emerald-800 hover:bg-white/40'
                      }`}
                    >
                      {item.name}
                    </a>
                  );
                })}
              </nav>
            </div>

            {/* --- RIGHT SECTION: Actions --- */}
            <div className="flex items-center gap-2 z-20">
              
              {/* User Profile / Login */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserProfile(!showUserProfile)}
                    className="flex items-center gap-2 pl-1 pr-1 py-1 md:px-3 md:py-2 bg-white/40 hover:bg-white/60 backdrop-blur-sm rounded-full border border-white/30 transition-all duration-200"
                  >
                    <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm">
                      {user?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    {/* Hide name on mobile to save space */}
                    <span className="hidden md:inline text-gray-800 text-sm font-semibold max-w-[80px] truncate">
                      {user?.name?.split(' ')[0]}
                    </span>
                    <i className="fa-solid fa-chevron-down text-[10px] text-gray-600 hidden md:block"></i>
                  </button>
                  
                  {showUserProfile && (
                    <div className="absolute top-full right-0 mt-2">
                       <UserProfile 
                         user={user}
                         onLogout={handleLogout}
                         onClose={() => setShowUserProfile(false)}
                       />
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowLogin(true)}
                  className="flex items-center justify-center w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-2.5 bg-gray-900 text-white rounded-full hover:bg-gray-800 hover:scale-105 transition-all duration-200 shadow-md"
                >
                  <i className="fa-regular fa-user text-xs md:mr-2"></i>
                  <span className="hidden md:inline text-xs font-bold uppercase tracking-wide">Login</span>
                </button>
              )}

              {/* Cart Button (Now toggles Drawer) */}
              <button
                className="relative flex items-center justify-center w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-2.5 bg-emerald-700 text-white rounded-full hover:bg-emerald-800 hover:shadow-lg transition-all duration-200"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={() => setShowCart(true)} // <--- 2. Trigger Drawer Open
              >
                <i className="fa-solid fa-cart-shopping text-xs"></i>
                <span className="hidden md:inline ml-2 text-xs font-bold uppercase tracking-wide">Cart</span>
                
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 md:-top-1 md:-right-1 w-4 h-4 md:w-5 md:h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold border-2 border-[#e8f8d7]">
                    {cart.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* --- MOBILE MENU DROPDOWN --- */}
          {isMenuOpen && (
            <div className="lg:hidden mt-4 pt-2 border-t border-emerald-900/10 animate-in fade-in slide-in-from-top-2 duration-200 pb-2">
              <nav className="flex flex-col gap-2">
                {[
                  { name: 'Home', path: '/', icon: 'fa-house', key: 'home' },
                  { name: 'Products', path: '/products', icon: 'fa-box-open', key: 'products' },
                  { name: 'About Us', path: '/about-us', icon: 'fa-users', key: 'about-us' },
                  { name: 'Contact Us', path: '/contact-us', icon: 'fa-envelope', key: 'contact-us' }
                ].map((item) => {
                  const isActive = getActiveRoute() === item.key;
                  return (
                    <a 
                      key={item.key}
                      href={item.path}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-200 ${
                        isActive 
                          ? 'bg-emerald-600 text-white shadow-md' 
                          : 'bg-white/40 text-gray-800 hover:bg-white/60'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? 'bg-white/20' : 'bg-white'}`}>
                        <i className={`fa-solid ${item.icon} text-sm`}></i>
                      </div>
                      <span className="font-semibold text-sm tracking-wide">{item.name}</span>
                      {isActive && <i className="fa-solid fa-chevron-right ml-auto text-xs opacity-70"></i>}
                    </a>
                  );
                })}
              </nav>
            </div>
          )}
        </div>
      </header>
      
      {/* --- MODALS --- */}
      
      {showLogin && (
        <LoginForm 
          onClose={() => setShowLogin(false)}
          onLoginSuccess={(u) => { setUser(u); setShowLogin(false); }}
          onSwitchToSignup={() => { setShowLogin(false); setShowSignup(true); }}
        />
      )}

      {showSignup && (
        <SignupForm 
          onClose={() => setShowSignup(false)}
          onSignupSuccess={(u) => { setUser(u); setShowSignup(false); }}
          onSwitchToLogin={() => { setShowSignup(false); setShowLogin(true); }}
        />
      )}

      {/* --- 3. CART DRAWER (THE NEW IMPLEMENTATION) --- */}
      <CartDrawer 
        isOpen={showCart} 
        onClose={() => setShowCart(false)} 
        cartItems={cart} 
      />
    </>
  );
};

export default NewHeader;