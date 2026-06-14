import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useGetWishlistQuery,  } from '../../store/api/userApi';
import { useGetCategoriesQuery } from '../../store/api/productsApi';
import { logout as logoutAction } from '../../store/slices/authSlice';
import { setShowLoginModal, clearLoginCallback } from '../../store/slices/uiSlice';
import { useLogoutMutation } from '../../store/api/authApi';
import { useAuth } from '../../hooks/useRedux';
import { lazy } from 'react';
import { clearCsrfToken } from '../../store/api/apiSlice';

const SignupForm = lazy(() => import('./auth/SignupForm'));
const LoginForm = lazy(() => import('./auth/LoginForm'));
const CartDrawer = lazy(() => import('./CartDrawer'));

const NewHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { items: cartItems, totalQuantity } = useSelector((state) => state.cart);
  const { isAuthenticated, user: authUser } = useAuth();
  const { showLoginModal } = useSelector((state) => state.ui);
  const { loginCallback } = useSelector((state) => state.ui);
  const wishlistItems = useSelector((state) => state.wishlist.items);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);
  const [user, setUser] = useState(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showShopDropdown, setShowShopDropdown] = useState(false);
  const [mobileShopExpanded, setMobileShopExpanded] = useState(false);

  const wishlistCount = wishlistItems?.length;

  useGetWishlistQuery(undefined, {
    skip: !isAuthenticated,
    refetchOnMountOrArgChange: false
  });

  const { data: categoriesData } = useGetCategoriesQuery(undefined, {
    refetchOnMountOrArgChange: false,
  });
  const categories = categoriesData?.data || [];

  const [logoutAPI, { isLoading: isLoggingOut }] = useLogoutMutation();

  const getActiveRoute = () => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path.startsWith('/shop')) return 'products';
    if (path === '/contact-us') return 'support';
    if (path === '/about-us') return 'about-us';
    return '';
  };

  const navLinks = useMemo(() => [
    { name: 'Home', path: '/', key: 'home' },
    { name: 'Shop', path: '/shop', key: 'products' },
    { name: 'About Us', path: '/about-us', key: 'about-us' },
    { name: 'Contact Us', path: '/contact-us', key: 'support' },
  ], []);

  const activeRoute = useMemo(() => getActiveRoute(), [location.pathname]);

  useEffect(() => {
    const syncUser = () => {
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');

      if (isAuthenticated && authUser) {
        setUser(authUser);
      } else if (storedUser && localStorage.getItem('authToken')) {
        setUser(storedUser);
      } else {
        setUser(null);
      }
    };

    syncUser();
    window.addEventListener('storage', syncUser);
    return () => window.removeEventListener('storage', syncUser);
  }, [isAuthenticated, authUser]);

  useEffect(() => {
    if (showLoginModal) {
      setShowLogin(true);
    } else {
      setShowLogin(false);
    }
  }, [showLoginModal]);

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
          setShowShopDropdown(false);
        } else {
          setShowHeader(true);
        }
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMenuOpen]);

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
      setUser(null);
      dispatch(logoutAction());
      clearCsrfToken();
      navigate('/');
    }
  };

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

  return (
    <>
      {/* ─── HEADER ─── */}
      <header
        className="fixed top-14 left-3 right-3 md:top-12 md:left-6 md:right-6 z-50 bg-[#e8f8d7]/90 backdrop-blur-xl shadow-lg border border-white/40 transition-all duration-0 md:duration-500 ease-in-out rounded-full"
        style={{
          transform: showHeader ? 'translateY(0)' : 'translateY(-200%)',
        }}
      >
        <div className="px-4 py-2">
          <div className="flex items-center justify-between relative h-10 md:h-12">

            {/* LEFT: Mobile hamburger + Desktop logo */}
            <div className="flex items-center z-20 shrink-0">
              <button
                onClick={() => setIsMenuOpen(true)}
                className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full bg-emerald-900/5 hover:bg-emerald-900/10 transition-colors focus:outline-none"
              >
                <i className="fa-solid fa-bars text-lg text-emerald-900"></i>
              </button>

              <Link to="/" className="hidden lg:flex items-center shrink-0">
                <img
                  src="/assets/logo.webp"
                  alt="UrbanNook"
                  className="h-14 w-auto object-contain rounded-full mix-blend-multiply"
                />
              </Link>
            </div>

            {/* CENTER: Mobile logo + Desktop nav */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:static lg:translate-x-0 lg:translate-y-0 z-10 pointer-events-none lg:pointer-events-auto">
              {/* Mobile logo */}
              <Link to="/" className="lg:hidden flex items-center pointer-events-auto">
                <img
                  src="/assets/logo.webp"
                  alt="UrbanNook"
                  className="h-14 w-auto object-contain rounded-full mix-blend-multiply"
                />
              </Link>

              {/* Desktop nav */}
              <nav className="hidden lg:flex items-center gap-1 bg-white/40 p-1.5 rounded-full border border-white/20 shadow-sm backdrop-blur-md">
                {navLinks.map((item) => {
                  const isActive = activeRoute === item.key;
                  const isShop = item.key === 'products';

                  if (isShop) {
                    return (
                      <div
                        key={item.key}
                        className="relative"
                        onMouseEnter={() => setShowShopDropdown(true)}
                        onMouseLeave={() => setShowShopDropdown(false)}
                      >
                        <Link
                          to="/shop"
                          className={`flex items-center gap-1 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                            isActive
                              ? 'bg-emerald-800 text-white shadow-md'
                              : 'text-emerald-900 hover:text-emerald-700 hover:bg-white/50'
                          }`}
                        >
                          Shop
                          <i className={`fa-solid fa-chevron-down text-[9px] transition-transform ${showShopDropdown ? 'rotate-180' : ''}`}></i>
                        </Link>

                        {/* Shop dropdown */}
                        {showShopDropdown && categories.length > 0 && (
                          <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden z-50 min-w-[220px] animate-in fade-in slide-in-from-top-2 duration-150">
                            <Link
                              to="/shop"
                              className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-emerald-900 hover:bg-emerald-50 border-b border-emerald-50 transition-colors"
                              onClick={() => setShowShopDropdown(false)}
                            >
                              <i className="fa-solid fa-store text-xs text-emerald-600"></i>
                              All Products
                            </Link>
                            {categories.map((cat) => (
                              <div key={cat.slug}>
                                <Link
                                  to={`/shop?category=${cat.slug}`}
                                  className="flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 transition-colors"
                                  onClick={() => setShowShopDropdown(false)}
                                >
                                  {cat.name}
                                  {cat.subcategories?.length > 0 && (
                                    <i className="fa-solid fa-chevron-right text-[9px] text-emerald-400"></i>
                                  )}
                                </Link>
                                {cat.subcategories?.map((sub) => (
                                  <Link
                                    key={sub.slug}
                                    to={`/shop?category=${cat.slug}&subcategory=${sub.slug}`}
                                    className="flex items-center gap-2 pl-8 pr-4 py-2 text-xs text-emerald-600 hover:bg-emerald-50 hover:text-emerald-900 transition-colors"
                                    onClick={() => setShowShopDropdown(false)}
                                  >
                                    <span className="w-1 h-1 rounded-full bg-emerald-300 shrink-0"></span>
                                    {sub.name}
                                  </Link>
                                ))}
                              </div>
                            ))}
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

            {/* RIGHT: Desktop actions */}
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

              {user && (
                <Link
                  to="/wishlist"
                  className="relative flex items-center justify-center w-9 h-9 bg-emerald-800 text-white hover:bg-emerald-80 rounded-full transition-colors group"
                >
                  <i className="fa-regular fa-heart text-lg text-white group-hover:scale-110 transition-transform"></i>
                  {wishlistCount > 0 && (
                    <span className="absolute -top-2 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center font-bold border-2 border-[#e8f8d7]">
                      {wishlistCount}
                    </span>
                  )}
                </Link>
              )}
            </div>

            {/* Spacer to balance hamburger on mobile */}
            <div className="lg:hidden w-10"></div>
          </div>
        </div>
      </header>

      {/* ─── MOBILE SIDEBAR BACKDROP ─── */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[55] lg:hidden transition-opacity duration-300 ${
          isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMenuOpen(false)}
      />

      {/* ─── MOBILE SIDEBAR ─── */}
      <div
        className={`fixed top-0 left-0 h-full w-[300px] z-[60] bg-[#e8f8d7] shadow-2xl transition-transform duration-300 ease-in-out lg:hidden flex flex-col overflow-hidden ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-900/10 shrink-0">
          <Link to="/" onClick={() => setIsMenuOpen(false)}>
            <img src="/assets/logo.webp" alt="UrbanNook" className="h-12 w-auto object-contain rounded-full mix-blend-multiply" />
          </Link>
          <button
            onClick={() => setIsMenuOpen(false)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-emerald-900/5 hover:bg-emerald-900/10 transition-colors"
          >
            <i className="fa-solid fa-xmark text-lg text-emerald-900"></i>
          </button>
        </div>

        {/* Sidebar scrollable body */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-4">

          {/* User block */}
          {user ? (
            <div className="bg-white/60 p-3 rounded-3xl border border-white/60 shadow-sm relative overflow-hidden group">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-emerald-200/30 rounded-full blur-2xl group-hover:bg-emerald-300/40 transition-all"></div>
              <div onClick={() => handleMobileNav('/profile')} className="flex items-center justify-between mb-4 relative z-10 cursor-pointer active:opacity-80">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-emerald-700 rounded-full flex items-center justify-center text-white text-lg font-serif italic shadow-md border-2 border-white">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-emerald-950 font-bold text-base leading-tight">Hi, {user?.name?.split(' ')[0]}</span>
                    <span className="text-xs text-emerald-700 uppercase tracking-wider font-semibold">View Profile <i className="fa-solid fa-chevron-right text-[9px]"></i></span>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleLogout(); }} disabled={isLoggingOut} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50">
                  <i className="fa-solid fa-arrow-right-from-bracket text-sm"></i>
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 relative z-10">
                <button onClick={() => handleMobileNav('/customer-support')} className="flex flex-col items-center gap-1.5">
                  <div className="w-11 h-11 rounded-2xl bg-white border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-sm">
                    <i className="fa-solid fa-headset text-base"></i>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-900 uppercase tracking-wide">Support</span>
                </button>
                <button onClick={handleMobileCart} className="flex flex-col items-center gap-1.5 relative">
                  <div className="w-11 h-11 rounded-2xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-800 shadow-sm">
                    <i className="fa-solid fa-cart-shopping text-base"></i>
                  </div>
                  {totalQuantity > 0 && (
                    <span className="absolute top-0 right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold border-2 border-white shadow-sm">
                      {totalQuantity}
                    </span>
                  )}
                  <span className="text-[9px] font-bold text-emerald-900 uppercase tracking-wide">Cart</span>
                </button>
                <button onClick={() => handleMobileNav('/wishlist')} className="flex flex-col items-center gap-1.5 relative">
                  <div className="w-11 h-11 rounded-2xl bg-white border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-sm">
                    <i className="fa-regular fa-heart text-base"></i>
                  </div>
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 right-0 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold border-2 border-white">
                      {wishlistCount}
                    </span>
                  )}
                  <span className="text-[9px] font-bold text-emerald-900 uppercase tracking-wide">Wishlist</span>
                </button>
                <button onClick={() => handleMobileNav('/orders')} className="flex flex-col items-center gap-1.5">
                  <div className="w-11 h-11 rounded-2xl bg-white border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-sm">
                    <i className="fa-solid fa-box text-base"></i>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-900 uppercase tracking-wide">Orders</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white/40 p-4 rounded-2xl border border-white/50 space-y-2.5">
              <button
                onClick={handleMobileLogin}
                className="w-full py-3.5 bg-emerald-800 text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg hover:bg-emerald-900 flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                <i className="fa-regular fa-user text-sm"></i>
                Login / Create Account
              </button>
              <button
                onClick={handleMobileCart}
                className="w-full py-3.5 bg-white border border-emerald-200 text-emerald-900 rounded-xl font-bold uppercase tracking-widest text-xs shadow-sm hover:bg-emerald-50 flex items-center justify-center gap-3 active:scale-95 transition-all relative"
              >
                <i className="fa-solid fa-cart-shopping text-sm"></i>
                View Cart
                {totalQuantity > 0 && (
                  <span className="absolute top-2 right-4 w-5 h-5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold border-2 border-white shadow-sm">
                    {totalQuantity}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Nav links */}
          <nav className="flex flex-col gap-1">
            {navLinks.map((item) => {
              const isActive = activeRoute === item.key;
              const isShop = item.key === 'products';
              const icons = {
                home: 'fa-house',
                products: 'fa-bag-shopping',
                support: 'fa-life-ring',
                'about-us': 'fa-users',
                'contact-us': 'fa-envelope',
              };

              if (isShop) {
                return (
                  <div key={item.key}>
                    <button
                      onClick={() => setMobileShopExpanded(!mobileShopExpanded)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all duration-200 ${
                        isActive
                          ? 'bg-white shadow-md border border-emerald-100'
                          : 'bg-transparent hover:bg-white/40 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors ${
                          isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-white/40 text-emerald-900'
                        }`}>
                          <i className="fa-solid fa-bag-shopping"></i>
                        </div>
                        <span className={`font-bold text-xs tracking-wide ${isActive ? 'text-emerald-900' : 'text-emerald-900/80'}`}>
                          Shop
                        </span>
                      </div>
                      <i className={`fa-solid fa-chevron-down text-[10px] text-emerald-500 transition-transform duration-200 ${mobileShopExpanded ? 'rotate-180' : ''}`}></i>
                    </button>

                    {mobileShopExpanded && (
                      <div className="ml-10 mt-1 mb-1 flex flex-col gap-0.5">
                        <button
                          onClick={() => handleMobileNav('/shop')}
                          className="text-left px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-white/60 rounded-xl transition-colors"
                        >
                          All Products
                        </button>
                        {categories.map((cat) => (
                          <div key={cat.slug}>
                            <button
                              onClick={() => handleMobileNav(`/shop?category=${cat.slug}`)}
                              className="w-full text-left px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-white/60 rounded-xl transition-colors"
                            >
                              {cat.name}
                            </button>
                            {cat.subcategories?.map((sub) => (
                              <button
                                key={sub.slug}
                                onClick={() => handleMobileNav(`/shop?category=${cat.slug}&subcategory=${sub.slug}`)}
                                className="w-full text-left px-5 py-1.5 text-[11px] text-emerald-600 hover:bg-white/60 rounded-xl transition-colors flex items-center gap-2"
                              >
                                <span className="w-1 h-1 rounded-full bg-emerald-300 shrink-0"></span>
                                {sub.name}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.key}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center justify-between p-3 rounded-2xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-white shadow-md border border-emerald-100'
                      : 'bg-transparent hover:bg-white/40 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors ${
                      isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-white/40 text-emerald-900'
                    }`}>
                      <i className={`fa-solid ${icons[item.key] || 'fa-circle'}`}></i>
                    </div>
                    <span className={`font-bold text-xs tracking-wide ${isActive ? 'text-emerald-900' : 'text-emerald-900/80'}`}>
                      {item.name}
                    </span>
                  </div>
                  <i className={`fa-solid fa-chevron-right text-[10px] transition-transform group-hover:translate-x-1 ${isActive ? 'text-emerald-500' : 'text-black/10'}`}></i>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ─── MODALS ─── */}
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
