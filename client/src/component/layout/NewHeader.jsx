import { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetWishlistQuery } from '../../store/api/userApi';
import SignupForm from './auth/SignupForm';
import LoginForm from './auth/LoginForm';
import CartDrawer from '../layout/CartDrawer';

const NewHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get cart and auth state from Redux
  const { items: cartItems, totalQuantity } = useSelector((state) => state.cart);
  const { isAuthenticated, user: authUser } = useSelector((state) => state.auth);
  
  // Get wishlist count
  const { data: wishlistData } = useGetWishlistQuery(undefined, { skip: !isAuthenticated });
  const wishlistCount = wishlistData?.data?.wishlist?.length || 0;
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);
  const [user, setUser] = useState(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const getActiveRoute = () => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path.startsWith('/products')) return 'products';
    if (path === '/contact-us') return 'support';
    if (path === '/about-us') return 'about-us';
    return '';
  };

  // Sync User from LocalStorage
  useEffect(() => {
    const syncUser = () => {
      if (!isAuthenticated) {
        setUser(JSON.parse(localStorage.getItem('user') || 'null'));
      } else {
        setUser(authUser);
      }
    };
    
    syncUser();
    window.addEventListener('storage', syncUser);
    return () => window.removeEventListener('storage', syncUser);
  }, [isAuthenticated, authUser]);

  // Hide/Show Header on Scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (!isMenuOpen) {
        if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
          setShowHeader(false);
          setShowUserDropdown(false);
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
    setShowUserDropdown(false);
    setIsMenuOpen(false);
    navigate('/');
  };

  // --- HELPER FUNCTIONS ---
  const handleMobileNav = (path) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  const handleMobileLogin = () => {
    setIsMenuOpen(false);
    setShowLogin(true);
  };

  const handleMobileCart = () => {
    setIsMenuOpen(false);
    setShowCart(true);
  };
  // -------------------------------

  // Navigation Items Configuration
  const navLinks = [
    { name: 'Home', path: '/', key: 'home' },
    { name: 'Shop', path: '/products', key: 'products' },
    { name: 'About Us', path: '/about-us', key: 'about-us' },
    { name: 'Contact Us', path: '/contact-us', key: 'support' },
  ];

  return (
    <>
      <header
        className={`fixed top-3 left-3 right-3 md:top-6 md:left-6 md:right-6 z-50 bg-[#e8f8d7]/90 backdrop-blur-xl shadow-lg border border-white/40 ${
          isMenuOpen ? 'rounded-[2rem]' : 'rounded-full'
        }`}
        style={{
          transform: showHeader ? 'translateY(0)' : 'translateY(-150%)',
        }}
      >
        <div className="px-4 py-2">
          
          {/* Main Flex Container */}
          <div className="flex items-center justify-between relative h-10 md:h-12">
            
            {/* --- LEFT SECTION: Mobile Menu Button & Desktop Logo --- */}
            <div className="flex items-center z-20 shrink-0">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full bg-emerald-900/5 hover:bg-emerald-900/10 transition-colors focus:outline-none"
              >
                <i className={`fa-solid ${isMenuOpen ? 'fa-xmark' : 'fa-bars'} text-lg text-emerald-900`}></i>
              </button>

              {/* Desktop Logo */}
              <Link to="/" className="hidden lg:flex items-center shrink-0">
                <img 
                    src="/assets/logo.webp" 
                    alt="UrbanNook" 
                    className="h-10 w-auto object-contain rounded-full mix-blend-multiply" 
                />
              </Link>
            </div>

            {/* --- CENTER SECTION: Mobile Logo & Desktop Nav --- */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:static lg:translate-x-0 lg:translate-y-0 z-10 pointer-events-none lg:pointer-events-auto">
              {/* Mobile Logo */}
              <Link to="/" className="lg:hidden flex items-center pointer-events-auto">
                 <img 
                    src="/assets/logo.webp" 
                    alt="UrbanNook" 
                    className="h-9 w-auto object-contain rounded-full mix-blend-multiply" 
                />
              </Link>

              {/* Desktop Nav */}
              <nav className="hidden lg:flex items-center gap-1 bg-white/40 p-1.5 rounded-full border border-white/20 shadow-sm backdrop-blur-md">
                {navLinks.map((item) => {
                  const isActive = getActiveRoute() === item.key;
                  return (
                    <Link 
                      key={item.key}
                      to={item.path}
                      className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                        isActive 
                          ? 'bg-emerald-800 text-white shadow-md' 
                          : 'text-emerald-900 hover:text-emerald-700 hover:bg-white/50'
                      }`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* --- RIGHT SECTION: Desktop Actions --- */}
            <div className="hidden lg:flex items-center gap-3 z-20 shrink-0">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="flex items-center gap-2 pl-1 pr-3 py-1.5 bg-white border border-emerald-100 rounded-full shadow-sm hover:shadow-md"
                  >
                    <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {user?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <span className="text-emerald-900 text-sm font-semibold max-w-[80px] truncate">
                      {user?.name?.split(' ')[0]}
                    </span>
                    <i className={`fa-solid fa-chevron-down text-[10px] text-emerald-600 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`}></i>
                  </button>
                  
                  {/* DESKTOP DROPDOWN MENU */}
                  {showUserDropdown && (
                     <div className="absolute top-full right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                       <div className="p-4 border-b border-gray-100 bg-emerald-50/50">
                          <p className="text-sm font-bold text-emerald-950">{user.name}</p>
                          <p className="text-xs text-emerald-600 truncate">{user.email}</p>
                       </div>
                       <div className="p-2">
                          <Link to="/profile" onClick={() => setShowUserDropdown(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-900 rounded-xl transition-colors">
                             <i className="fa-regular fa-user w-5"></i> Profile
                          </Link>
                          <Link to="/settings" onClick={() => setShowUserDropdown(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-900 rounded-xl transition-colors">
                             <i className="fa-solid fa-gear w-5"></i> Settings
                          </Link>
                           <Link to="/customer-support" onClick={() => setShowUserDropdown(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-900 rounded-xl transition-colors">
                             <i className="fa-solid fa-headset text-lg"></i> Support
                          </Link>
                       </div>
                       <div className="p-2 border-t border-gray-100">
                          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left">
                             <i className="fa-solid fa-arrow-right-from-bracket w-5"></i> Logout
                          </button>
                       </div>
                     </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowLogin(true)}
                  className="px-5 py-2.5 bg-white text-emerald-900 border border-emerald-900/10 rounded-full hover:bg-emerald-50 hover:border-emerald-900/20 transition-all duration-200 shadow-sm flex items-center"
                >
                  <i className="fa-regular fa-user text-sm mr-2"></i>
                  <span className="text-xs font-bold uppercase tracking-wide">Login</span>
                </button>
              )}

              <button
                className="relative flex items-center px-5 py-2.5 bg-emerald-800 text-white rounded-full hover:bg-emerald-900 hover:shadow-lg transition-all duration-200 shadow-md"
                onClick={() => setShowCart(true)}
              >
                <i className="fa-solid fa-cart-shopping text-sm mr-2"></i>
                <span className="text-xs font-bold uppercase tracking-wide">Cart</span>
                
                {totalQuantity > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold border-2 border-[#e8f8d7]">
                    {totalQuantity}
                  </span>
                )}
              </button>

              {/* Wishlist Icon */}
              {user && (
                <Link
                  to="/wishlist"
                  className="relative flex items-center justify-center w-11 h-11 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  <i className="fa-regular fa-heart text-lg text-white"></i>
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold border-2 border-[#e8f8d7]">
                      {wishlistCount}
                    </span>
                  )}
                </Link>
              )}
            </div>
             <div className="lg:hidden w-10"></div> 
          </div>

          {/* --- MOBILE MENU DROPDOWN --- */}
          {isMenuOpen && (
            <div className="lg:hidden mt-4 pt-4 border-t border-emerald-900/10 animate-in fade-in slide-in-from-top-2 pb-2 h-[62vh]  no-scrollbar">
              
              {/* 1. MOBILE USER CONTROL CENTER */}
              {user ? (
                <div className="bg-white/60 p-5 rounded-3xl border border-white/60 shadow-sm mb-6 relative overflow-hidden group">
                    {/* Decorative Background Blob */}
                    <div className="absolute -right-10 -top-10 w-32 h-32 bg-emerald-200/30 rounded-full blur-2xl group-hover:bg-emerald-300/40 transition-all"></div>

                    {/* Header: Clickable Profile Access */}
                    <div onClick={() => handleMobileNav('/profile')} className="flex items-center justify-between mb-6 relative z-10 cursor-pointer active:opacity-80">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-emerald-700 rounded-full flex items-center justify-center text-white text-lg font-serif italic shadow-md border-2 border-white">
                                {user?.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-emerald-950 font-bold text-lg leading-tight">Hi, {user?.name?.split(' ')[0]}</span>
                                <span className="text-xs text-emerald-700 uppercase tracking-wider font-semibold">View Profile <i className="fa-solid fa-chevron-right text-[9px]"></i></span>
                            </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleLogout(); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                            <i className="fa-solid fa-arrow-right-from-bracket text-sm"></i>
                        </button>
                    </div>

                    {/* THE APP-STYLE GRID (Modified to 3 Cols since Orders is removed) */}
                    <div className="grid grid-cols-3 gap-5 relative z-10">
                        
                        {/* Settings */}
                        <button onClick={() => handleMobileNav('/settings')} className="flex flex-col items-center gap-2 group/btn">
                            <div className="w-12 h-12 rounded-2xl bg-white border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-sm group-hover/btn:scale-105 group-hover/btn:border-emerald-300 transition-all">
                                <i className="fa-solid fa-gear text-lg"></i>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wide">Settings</span>
                        </button>

                        {/* Support */}
                        <button onClick={() => handleMobileNav('/customer-support')} className="flex flex-col items-center gap-2 group/btn">
                            <div className="w-12 h-12 rounded-2xl bg-white border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-sm group-hover/btn:scale-105 group-hover/btn:border-emerald-300 transition-all">
                                <i className="fa-solid fa-headset text-lg"></i>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wide">Support</span>
                        </button>

                         {/* Cart */}
                         <button onClick={handleMobileCart} className="flex flex-col items-center gap-2 group/btn relative">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 shadow-sm group-hover/btn:scale-105 group-hover/btn:bg-emerald-200 transition-all">
                                <i className="fa-solid fa-cart-shopping text-lg"></i>
                            </div>
                            {totalQuantity > 0 && (
                                <span className="absolute top-0 right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold border-2 border-white shadow-sm animate-bounce">
                                    {totalQuantity}
                                </span>
                            )}
                            <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wide">Cart</span>
                        </button>

                        {/* Wishlist */}
                        <button onClick={() => handleMobileNav('/wishlist')} className="flex flex-col items-center gap-2 group/btn relative">
                            <div className="w-12 h-12 rounded-2xl bg-white border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-sm group-hover/btn:scale-105 group-hover/btn:border-emerald-300 transition-all">
                                <i className="fa-regular fa-heart text-lg"></i>
                            </div>
                            {wishlistCount > 0 && (
                                <span className="absolute top-0 right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold border-2 border-white shadow-sm">
                                    {wishlistCount}
                                </span>
                            )}
                            <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wide">Wishlist</span>
                        </button>

                    </div>
                </div>
              ) : (
                /* LOGIN CTA IF NOT LOGGED IN */
                <div className="bg-white/40 p-1 rounded-2xl border border-white/50 mb-6">
                    <button 
                        onClick={handleMobileLogin}
                        className="w-full py-4 bg-emerald-800 text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg hover:bg-emerald-900 flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                        <i className="fa-regular fa-user text-sm"></i> 
                        Login / Create Account
                    </button>
                </div>
              )}

              {/* 2. MAIN NAVIGATION LIST */}
              <nav className="flex flex-col gap-2">
                {navLinks.map((item) => {
                  const isActive = getActiveRoute() === item.key;
                  // Map specific icons for each route
                  const icons = {
                    home: 'fa-house',
                    products: 'fa-bag-shopping',
                    support: 'fa-life-ring',
                    'about-us': 'fa-users',
                    'contact-us': 'fa-envelope'
                  };

                  return (
                    <Link 
                      key={item.key}
                      to={item.path}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center justify-between p-4 rounded-2xl transition-all duration-200 group ${
                        isActive 
                          ? 'bg-white shadow-md border border-emerald-100' 
                          : 'bg-transparent hover:bg-white/40 border border-transparent'
                      }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
                                isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-white/40 text-emerald-900'
                            }`}>
                                <i className={`fa-solid ${icons[item.key] || 'fa-circle'}`}></i>
                            </div>
                            <span className={`font-bold text-sm tracking-wide ${isActive ? 'text-emerald-900' : 'text-emerald-900/80'}`}>
                                {item.name}
                            </span>
                        </div>
                        <i className={`fa-solid fa-chevron-right text-xs transition-transform group-hover:translate-x-1 ${isActive ? 'text-emerald-500' : 'text-black/10'}`}></i>
                    </Link>
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

      <CartDrawer 
        isOpen={showCart} 
        onClose={() => setShowCart(false)} 
        cartItems={cartItems} 
      />
    </>
  );
};

export default NewHeader;