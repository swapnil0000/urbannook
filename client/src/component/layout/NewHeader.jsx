import { useState, useEffect, useRef, Suspense, useMemo, useCallback, lazy } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useGetWishlistQuery } from '../../store/api/userApi';
import { useGetCategoriesQuery, useGetProductsQuery } from '../../store/api/productsApi';
import { logout as logoutAction } from '../../store/slices/authSlice';
import { setShowLoginModal, clearLoginCallback } from '../../store/slices/uiSlice';
import { useLogoutMutation } from '../../store/api/authApi';
import { useAuth } from '../../hooks/useRedux';
import GoogleLoginButton from './auth/GoogleLoginButton';
import { clearCsrfToken } from '../../store/api/apiSlice';

const SignupForm = lazy(() => import('./auth/SignupForm'));
const LoginForm = lazy(() => import('./auth/LoginForm'));
const CartDrawer = lazy(() => import('./CartDrawer'));

const NewHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Get cart and auth state from Redux
  const { items: cartItems, totalQuantity } = useSelector((state) => state.cart);
  const { isAuthenticated, user: authUser } = useAuth();
  const { showLoginModal } = useSelector((state) => state.ui);
  const { loginCallback } = useSelector((state) => state.ui);
  const wishlistItems = useSelector((state) => state.wishlist.items);
  
  // State declarations
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);
  const [user, setUser] = useState(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showShopDropdown, setShowShopDropdown] = useState(false);
  const [expandedCats, setExpandedCats] = useState(new Set());
  const toggleCat = useCallback((slug) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  }, []);

  // Fetch categories for Shop dropdown
  const { data: categoriesData } = useGetCategoriesQuery(undefined, {
    refetchOnMountOrArgChange: false,
  });
  const categories = categoriesData?.data || [];

  const shopOpen = expandedCats.has('__shop__');
  const { data: shopProductsData } = useGetProductsQuery(
    { limit: 200 },
    { skip: !shopOpen, refetchOnMountOrArgChange: false }
  );
  const shopProductsByCategory = useMemo(() => {
    if (!shopOpen) return {};
    const all = shopProductsData?.data?.listofPublishedProducts || [];
    const map = {};
    for (const p of all) {
      const key = p.categorySlug || p.productCategory?.toLowerCase().replace(/\s+/g, '-') || '__other__';
      if (!map[key]) map[key] = [];
      map[key].push(p);
    }
    return map;
  }, [shopProductsData, shopOpen]);

  // Get wishlist count from Redux
  const wishlistCount = wishlistItems?.length;
  
  // Fetch wishlist data - only when authenticated
  useGetWishlistQuery(undefined, { 
    skip: !isAuthenticated,
    refetchOnMountOrArgChange: false
  });
  
  // Logout mutation
  const [logoutAPI, { isLoading: isLoggingOut }] = useLogoutMutation();

  const getActiveRoute = () => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path.startsWith('/shop')) return 'products';
    if (path === '/contact-us') return 'support';
    if (path === '/about-us') return 'about-us';
    return '';
  };

  // Memoize expensive calculations
  const navLinks = useMemo(() => [
    { name: 'Home', path: '/', key: 'home' },
    { name: 'Shop', path: '/shop', key: 'products' },
    { name: 'About Us', path: '/about-us', key: 'about-us' },
    { name: 'Contact Us', path: '/contact-us', key: 'support' },
  ], []);

  const activeRoute = useMemo(() => getActiveRoute(), [location.pathname]);

  // Sync User from auth state
  useEffect(() => {
    const syncUser = () => {
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
      
      if (isAuthenticated && authUser) {
        setUser(authUser);
      } else if (storedUser && localStorage.getItem('authToken')) {
        // localStorage has auth data but Redux lost state (e.g., before SessionManager runs)
        setUser(storedUser);
      } else {
        setUser(null);
      }
    };
    
    syncUser();
    window.addEventListener('storage', syncUser);
    return () => window.removeEventListener('storage', syncUser);
  }, [isAuthenticated, authUser]);

  // Sync showLogin with Redux showLoginModal state
  useEffect(() => {
    if (showLoginModal) {
      setShowLogin(true);
    } else {
      // Reset local state when Redux state is false
      setShowLogin(false);
    }
  }, [showLoginModal]);

  // Hide/Show Header on Scroll
  useEffect(() => {
    const threshold = 10;
    const handleScroll = () => {
      if (document.body.classList.contains("address-modal-open")) return;
      const currentScrollY = window.scrollY;

      if (Math.abs(currentScrollY - lastScrollY.current) < threshold) {
        return;
      }

      if (!isMenuOpen) {
        if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
          setShowHeader(false);
          setShowUserDropdown(false);
        } else {
          setShowHeader(true);
        }
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMenuOpen]);

  // Hide header immediately when address modal opens
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.body.classList.contains("address-modal-open")) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const handleLogout = async () => {
    try {
      await logoutAPI().unwrap();
      
      setUser(null);
      setShowUserDropdown(false);
      setIsMenuOpen(false);
      dispatch(logoutAction());
      clearCsrfToken();
      
      window.dispatchEvent(new Event('storage'));
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if API fails, clear local state
      setUser(null);
      dispatch(logoutAction());
      clearCsrfToken();
      navigate('/');
    }
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

  // Navigation Items Configuration - moved after useMemo

  return (
    <>
      <header
        className="fixed top-14 left-3 right-3 md:top-12 md:left-6 md:right-6 z-50 bg-[#e8f8d7]/90 backdrop-blur-xl shadow-lg border border-white/40 transition-all duration-500 ease-in-out rounded-full"
        style={{
          transform: showHeader ? 'translateY(0)' : 'translateY(-200%)',
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
                    className="h-14 w-auto object-contain rounded-full mix-blend-multiply" 
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
                    className="h-14 w-auto object-contain rounded-full mix-blend-multiply" 
                />
              </Link>

              {/* Desktop Nav */}
              <nav className="hidden lg:flex items-center gap-1 bg-white/40 p-1.5 rounded-full border border-white/20 shadow-sm backdrop-blur-md">
                {navLinks.map((item) => {
                  const isActive = activeRoute === item.key;

                  if (item.key === 'products') {
                    return (
                      <div
                        key={item.key}
                        className="relative"
                        onMouseEnter={() => setShowShopDropdown(true)}
                        onMouseLeave={() => setShowShopDropdown(false)}
                      >
                        <button
                          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 ${
                            isActive
                              ? 'bg-emerald-800 text-white shadow-md'
                              : 'text-emerald-900 hover:text-emerald-700 hover:bg-white/50'
                          }`}
                        >
                          Shop
                          <i className={`fa-solid fa-chevron-down text-[10px] transition-transform duration-200 ${showShopDropdown ? 'rotate-180' : ''}`}></i>
                        </button>

                        {showShopDropdown && categories.length > 0 && (
                          <div className="absolute top-[calc(100%+10px)] left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl border border-emerald-100/60 p-5 z-50"
                            style={{ minWidth: '420px' }}>
                            {/* Caret */}
                            <div className="absolute -top-[7px] left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-t border-l border-emerald-100 rotate-45 rounded-tl-sm"></div>

                            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-3 px-1">Browse Categories</p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                              {categories.map((cat) => (
                                <div key={cat.slug || cat._id?.$oid}>
                                  <Link
                                    to={`/shop?category=${cat.slug}`}
                                    onClick={() => setShowShopDropdown(false)}
                                    className="text-sm font-bold text-emerald-900 hover:text-emerald-600 transition-colors block mb-2"
                                  >
                                    {cat.name}
                                  </Link>
                                  <ul className="space-y-1">
                                    {cat.subcategories?.map((sub) => (
                                      <li key={sub.slug || sub._id?.$oid}>
                                        <Link
                                          to={`/shop?category=${cat.slug}&subcategory=${sub.slug}`}
                                          onClick={() => setShowShopDropdown(false)}
                                          className="text-xs text-emerald-700/80 hover:text-emerald-900 transition-colors flex items-center gap-1.5 pl-2 border-l-2 border-emerald-100 hover:border-emerald-400 py-0.5"
                                        >
                                          {sub.name}
                                        </Link>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

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

                           <Link to="/orders" onClick={() => setShowUserDropdown(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-900 rounded-xl transition-colors">
                             <i className="fa-solid fa-box w-5"></i> My Orders
                          </Link>
    
                           <Link to="/customer-support" onClick={() => setShowUserDropdown(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-900 rounded-xl transition-colors">
                             <i className="fa-solid fa-headset text-lg"></i> Support
                          </Link>
                       </div>
                       <div className="p-2 border-t border-gray-100">
                          <button 
                            onClick={handleLogout} 
                            disabled={isLoggingOut}
                            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left disabled:opacity-50"
                          >
                             <i className="fa-solid fa-arrow-right-from-bracket w-5"></i> 
                             {isLoggingOut ? 'Logging out...' : 'Logout'}
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
                  className="relative flex items-center justify-center w-9 h-9 bg-emerald-800 text-white hover:bg-emerald-80 rounded-full transition-colors group"
                >
                  <i className="fa-regular fa-heart text-lg text-white group-hover:scale-110 transition-transform"></i>
                  {wishlistCount > 0 && (
                    <span className="absolute -top-2 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center font-bold border-2 border-[#e8f8d7] ">
                      {wishlistCount}
                    </span>
                  )}
                </Link>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* --- MOBILE SIDEBAR BACKDROP --- */}
      <div
        className={`fixed inset-0 z-[59] bg-black/40 backdrop-blur-sm lg:hidden transition-opacity duration-200 ${
          isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMenuOpen(false)}
      />

      {/* --- MOBILE SIDEBAR --- */}
      <aside
        className={`fixed top-0 left-0 h-full w-[300px] z-[60] lg:hidden flex flex-col bg-[#faf9f6] shadow-2xl transition-all duration-200 ease-in-out ${
          isMenuOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-5 pt-10 pb-5 border-b border-gray-200 shrink-0">
          <Link to="/" onClick={() => setIsMenuOpen(false)}>
            <img src="/assets/logo.webp" alt="UrbanNook" className="h-12 w-auto object-contain rounded-full mix-blend-multiply" />
          </Link>
          <button
            onClick={() => setIsMenuOpen(false)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <i className="fa-solid fa-xmark text-base text-gray-600"></i>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-3">

          {/* USER SECTION */}
          {user ? (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-28 h-28 bg-gray-100/60 rounded-full blur-2xl pointer-events-none" />
              <div
                onClick={() => handleMobileNav('/profile')}
                className="flex items-center gap-3 mb-4 cursor-pointer active:opacity-80 relative z-10"
              >
                <div className="w-11 h-11 bg-emerald-700 rounded-full flex items-center justify-center text-white text-base font-serif italic shadow border-2 border-white shrink-0">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="text-emerald-950 font-bold text-sm leading-tight">Hi, {user?.name?.split(' ')[0]}</p>
                  <p className="text-[10px] text-emerald-700 uppercase tracking-wider font-semibold">
                    View Profile <i className="fa-solid fa-chevron-right text-[8px]"></i>
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                  disabled={isLoggingOut}
                  className="ml-auto w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50 shrink-0"
                >
                  <i className="fa-solid fa-arrow-right-from-bracket text-sm"></i>
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 relative z-10">
                <button onClick={() => handleMobileNav('/customer-support')} className="flex flex-col items-center gap-1.5">
                  <div className="w-11 h-11 rounded-xl bg-white border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-sm">
                    <i className="fa-solid fa-headset"></i>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-900 uppercase tracking-wide">Support</span>
                </button>
                <button onClick={handleMobileCart} className="flex flex-col items-center gap-1.5 relative">
                  <div className="w-11 h-11 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-800 shadow-sm">
                    <i className="fa-solid fa-cart-shopping"></i>
                  </div>
                  {totalQuantity > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center font-bold border border-white">
                      {totalQuantity}
                    </span>
                  )}
                  <span className="text-[9px] font-bold text-emerald-900 uppercase tracking-wide">Cart</span>
                </button>
                <button onClick={() => handleMobileNav('/wishlist')} className="flex flex-col items-center gap-1.5 relative">
                  <div className="w-11 h-11 rounded-xl bg-white border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-sm">
                    <i className="fa-regular fa-heart"></i>
                  </div>
                  {wishlistCount > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center font-bold border border-white">
                      {wishlistCount}
                    </span>
                  )}
                  <span className="text-[9px] font-bold text-emerald-900 uppercase tracking-wide">Wishlist</span>
                </button>
                <button onClick={() => handleMobileNav('/orders')} className="flex flex-col items-center gap-1.5">
                  <div className="w-11 h-11 rounded-xl bg-white border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-sm">
                    <i className="fa-solid fa-box"></i>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-900 uppercase tracking-wide">Orders</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={handleMobileLogin}
                className="w-full py-3.5 bg-[#2e443c] text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <i className="fa-regular fa-user text-sm"></i>
                Login / Sign Up
              </button>
              <button
                onClick={handleMobileCart}
                className="w-full py-3.5 bg-white border border-gray-200 text-gray-800 rounded-xl font-bold uppercase tracking-widest text-xs shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all relative"
              >
                <i className="fa-solid fa-cart-shopping text-sm"></i>
                View Cart
                {totalQuantity > 0 && (
                  <span className="absolute top-2 right-4 w-5 h-5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold border-2 border-white">
                    {totalQuantity}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* NAVIGATION */}
          <nav className="flex flex-col">

            {/* Other top-level links */}
            {[
              { path: '/', label: 'Home', icon: 'fa-house' },
              { path: '/shop', label: 'All Products', icon: 'fa-bag-shopping' },
            ].map(({ path, label, icon }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-1 py-3.5 border-b border-gray-200/70"
              >
                <i className={`fa-solid ${icon} text-sm text-gray-400 w-4 text-center`} />
                <span className="text-[15px] font-bold text-gray-900">{label}</span>
              </Link>
            ))}

            {/* SHOP accordion — contains all categories */}
            <div className="border-b border-gray-200/70">
              <button
                onClick={() => toggleCat('__shop__')}
                className="w-full flex items-center justify-between px-1 py-3.5 text-left"
              >
                <div className="flex items-center gap-3">
                  <i className="fa-solid fa-store text-sm text-gray-400 w-4 text-center" />
                  <span className="text-[15px] font-bold text-gray-900">Shop</span>
                </div>
                <i className={`fa-solid fa-chevron-down text-[11px] text-gray-400 transition-transform duration-200 ${expandedCats.has('__shop__') ? 'rotate-180' : ''}`} />
              </button>

              {/* Category sections inside Shop */}
              {expandedCats.has('__shop__') && categories.length > 0 && (
                <div className="pb-3 space-y-4 pt-1">
                  {categories.map((cat) => {
                    const products = shopProductsByCategory[cat.slug] || [];
                    return (
                      <div key={cat.slug}>
                        {/* Category heading — tapping navigates to all products */}
                        <Link
                          to={`/shop?category=${cat.slug}`}
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center justify-between px-1 mb-2"
                        >
                          <span className="text-sm font-bold text-gray-900">{cat.name}</span>
                          <i className="fa-solid fa-chevron-right text-[10px] text-gray-400" />
                        </Link>

                        {/* Horizontal scrollable product cards */}
                        {products.length > 0 ? (
                          <div
                            className="flex gap-2.5 overflow-x-auto pb-1"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                          >
                            {products.map((p) => {
                              const img = p.variantDetails?.[0]?.variantImage?.[0] || p.productImg || null;
                              return (
                                <Link
                                  key={p.productId}
                                  to={`/shop?product=${p.productId}`}
                                  onClick={() => setIsMenuOpen(false)}
                                  className="flex-shrink-0 w-24 flex flex-col rounded-xl overflow-hidden border border-gray-200 bg-white"
                                >
                                  <div className="w-full aspect-square bg-gray-100 overflow-hidden">
                                    {img ? (
                                      <img
                                        src={img}
                                        alt={p.productName}
                                        loading="lazy"
                                        decoding="async"
                                        className="w-full h-full object-cover mix-blend-multiply"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <i className="fa-solid fa-image text-xs text-gray-300" />
                                      </div>
                                    )}
                                  </div>
                                  {/* <p className="text-[10px] font-medium text-gray-700 px-1.5 py-1 line-clamp-2 leading-tight">
                                    {p.productName}
                                  </p> */}
                                </Link>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="h-24 flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom links */}
            {[
              { path: '/about-us', label: 'About Us', icon: 'fa-users' },
              { path: '/contact-us', label: 'Contact', icon: 'fa-envelope' },
              { path: '/customer-support', label: 'Support', icon: 'fa-life-ring' },
            ].map(({ path, label, icon }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-1 py-3.5 border-b border-gray-200/70 last:border-b-0"
              >
                <i className={`fa-solid ${icon} text-sm text-gray-400 w-4 text-center`} />
                <span className="text-[15px] font-bold text-gray-900">{label}</span>
              </Link>
            ))}

          </nav>
        </div>
      </aside>

      {/* --- MODALS --- */}
      <Suspense fallback={
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        {showLogin && (
          <LoginForm 
            onClose={() => {
              setShowLogin(false);
              dispatch(setShowLoginModal(false));
              dispatch(clearLoginCallback());
            }}
            onLoginSuccess={(u) => { 
              setUser(u); 
              setShowLogin(false); 
              dispatch(setShowLoginModal(false));
              // Handle post-login navigation or callback
              if (loginCallback && loginCallback.startsWith('navigate:')) {
                const path = loginCallback.replace('navigate:', '');
                navigate(path);
              } else if (loginCallback) {
                window.dispatchEvent(new CustomEvent('loginSuccess', { detail: { callback: loginCallback } }));
              }
              dispatch(clearLoginCallback());
            }}
            onSwitchToSignup={() => { 
              setShowLogin(false); 
              setShowSignup(true); 
              dispatch(setShowLoginModal(false));
            }}
          />
        )}

        {showSignup && (
          <SignupForm 
            onClose={() => setShowSignup(false)}
            onSignupSuccess={(u) => { 
              setUser(u); 
              setShowSignup(false);
              // Handle post-signup navigation
              if (loginCallback && loginCallback.startsWith('navigate:')) {
                const path = loginCallback.replace('navigate:', '');
                navigate(path);
              }
              dispatch(clearLoginCallback());
            }}
            onSwitchToLogin={() => { setShowSignup(false); setShowLogin(true); }}
          />
        )}

        <CartDrawer
          isOpen={showCart}
          onClose={() => setShowCart(false)}
          cartItems={cartItems}
        />
      </Suspense>

    </>
  );
};

export default NewHeader;