import { useState, useEffect, useRef, Suspense, useMemo, lazy } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useGetWishlistQuery } from '../../store/api/userApi';
import { logout as logoutAction } from '../../store/slices/authSlice';
import { setShowLoginModal, clearLoginCallback } from '../../store/slices/uiSlice';
import { useLogoutMutation } from '../../store/api/authApi';
import { useAuth } from '../../hooks/useRedux';
import { clearCsrfToken } from '../../store/api/apiSlice';

const SignupForm = lazy(() => import('./auth/SignupForm'));
const LoginForm = lazy(() => import('./auth/LoginForm'));
const CartDrawer = lazy(() => import('./CartDrawer'));

/* GullyLabs-style header — clean white sticky bar. All auth/cart/wishlist logic preserved. */
const NewHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { items: cartItems, totalQuantity } = useSelector((state) => state.cart);
  const { isAuthenticated, user: authUser } = useAuth();
  const { showLoginModal, loginCallback } = useSelector((state) => state.ui);
  const wishlistItems = useSelector((state) => state.wishlist.items);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [user, setUser] = useState(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const ddRef = useRef(null);

  const wishlistCount = wishlistItems?.length;
  useGetWishlistQuery(undefined, { skip: !isAuthenticated, refetchOnMountOrArgChange: false });
  const [logoutAPI, { isLoading: isLoggingOut }] = useLogoutMutation();

  const navLinks = useMemo(() => [
    { name: 'Shop All', path: '/products', key: 'products' },
    { name: 'Lamps', path: '/products?category=Lamp', key: 'lamp' },
    { name: 'Pen Stands', path: '/products?category=Pen%20Stand', key: 'pen' },
    { name: 'Story', path: '/about-us', key: 'about-us' },
  ], []);

  const activeRoute = useMemo(() => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path.startsWith('/products') || path.startsWith('/product/')) return 'products';
    if (path === '/contact-us') return 'support';
    if (path === '/about-us') return 'about-us';
    return '';
  }, [location.pathname]);

  useEffect(() => {
    const syncUser = () => {
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
      if (isAuthenticated && authUser) setUser(authUser);
      else if (storedUser && localStorage.getItem('authToken')) setUser(storedUser);
      else setUser(null);
    };
    syncUser();
    window.addEventListener('storage', syncUser);
    return () => window.removeEventListener('storage', syncUser);
  }, [isAuthenticated, authUser]);

  useEffect(() => { setShowLogin(!!showLoginModal); }, [showLoginModal]);

  // open cart drawer from the mobile bottom-nav
  useEffect(() => {
    const open = () => setShowCart(true);
    window.addEventListener('openCartDrawer', open);
    return () => window.removeEventListener('openCartDrawer', open);
  }, []);

  // close menu/dropdown on route change
  useEffect(() => { setIsMenuOpen(false); setShowUserDropdown(false); }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logoutAPI().unwrap();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null); setShowUserDropdown(false); setIsMenuOpen(false);
      dispatch(logoutAction()); clearCsrfToken();
      window.dispatchEvent(new Event('storage'));
      navigate('/');
    }
  };

  const handleMobileNav = (path) => { setIsMenuOpen(false); navigate(path); };

  const Icon = {
    search: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>,
    user: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>,
    heart: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" /></svg>,
    cart: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 7h12l1 13H5L6 7z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>,
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-ink/95 backdrop-blur border-b border-white/10 font-inter text-paper">
        <div className="max-w-[1280px] mx-auto px-5 h-16 flex items-center justify-between gap-4">
          {/* left */}
          <div className="flex items-center gap-2.5">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden w-9 h-9 grid place-items-center" aria-label="Menu">
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">{isMenuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 6h16M4 12h16M4 18h16" />}</svg>
            </button>
            <Link to="/" className="flex items-center shrink-0" aria-label="UrbanNook — home">
              <span className="un-wordmark font-archivo font-extrabold text-2xl md:text-3xl tracking-tight uppercase select-none">urbannook</span>
            </Link>
          </div>

          {/* center nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
            {navLinks.map((item) => (
              <Link key={item.key} to={item.path} className={`flex items-center gap-1.5 transition-colors ${activeRoute === item.key ? 'text-brand' : 'text-paper/70 hover:text-brand'}`}>
                {item.dot && <span className="w-1.5 h-1.5 rounded-full bg-sale"></span>}
                {item.name}
              </Link>
            ))}
          </nav>

          {/* right actions */}
          <div className="flex items-center gap-3 md:gap-4">
            {user ? (
              <div className="relative hidden sm:block" ref={ddRef}>
                <button onClick={() => setShowUserDropdown((s) => !s)} className="flex items-center gap-2 pl-1 pr-2.5 py-1.5 rounded-full border border-white/20 hover:border-white/50 transition-colors">
                  <span className="w-7 h-7 rounded-full bg-brand text-white grid place-items-center text-xs font-bold">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                  <span className="text-sm font-semibold max-w-[80px] truncate">{user?.name?.split(' ')[0]}</span>
                </button>
                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white text-ink rounded-2xl shadow-xl border border-hair overflow-hidden z-50">
                    <div className="p-4 border-b border-hair"><p className="text-sm font-bold">{user.name}</p><p className="text-xs text-muted truncate">{user.email}</p></div>
                    <div className="p-2 text-sm">
                      <Link to="/profile" onClick={() => setShowUserDropdown(false)} className="block px-3 py-2.5 rounded-xl hover:bg-surface">Profile</Link>
                      <Link to="/orders" onClick={() => setShowUserDropdown(false)} className="block px-3 py-2.5 rounded-xl hover:bg-surface">My Orders</Link>
                      <Link to="/customer-support" onClick={() => setShowUserDropdown(false)} className="block px-3 py-2.5 rounded-xl hover:bg-surface">Support</Link>
                    </div>
                    <div className="p-2 border-t border-hair"><button onClick={handleLogout} disabled={isLoggingOut} className="w-full text-left px-3 py-2.5 text-sm text-sale rounded-xl hover:bg-surface disabled:opacity-50">{isLoggingOut ? 'Logging out…' : 'Logout'}</button></div>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => setShowLogin(true)} className="w-9 h-9 grid place-items-center hover:text-brand transition-colors" aria-label="Account">{Icon.user}</button>
            )}

            {user && (
              <Link to="/wishlist" className="relative w-9 h-9 hidden sm:grid place-items-center hover:text-brand transition-colors" aria-label="Wishlist">
                {Icon.heart}
                {wishlistCount > 0 && <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-sale text-white text-[10px] font-bold grid place-items-center">{wishlistCount}</span>}
              </Link>
            )}

            <button onClick={() => setShowCart(true)} className="relative w-9 h-9 grid place-items-center hover:text-brand transition-colors" aria-label="Cart">
              {Icon.cart}
              {totalQuantity > 0 && <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-sale text-white text-[10px] font-bold grid place-items-center">{totalQuantity}</span>}
            </button>
          </div>
        </div>

        {/* mobile dropdown */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-ink text-paper px-5 py-3">
            <nav className="flex flex-col">
              {navLinks.map((item) => (
                <button key={item.key} onClick={() => handleMobileNav(item.path)} className={`text-left py-3 border-b border-white/10 font-semibold ${activeRoute === item.key ? 'text-brand' : 'text-paper'}`}>{item.name}</button>
              ))}
            </nav>
            {user ? (
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-2.5"><span className="w-9 h-9 rounded-full bg-brand text-white grid place-items-center font-bold">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span><span className="font-semibold">{user?.name?.split(' ')[0]}</span></div>
                <button onClick={handleLogout} disabled={isLoggingOut} className="text-sm text-sale font-semibold">Logout</button>
              </div>
            ) : (
              <button onClick={() => { setIsMenuOpen(false); setShowLogin(true); }} className="gl-press w-full mt-4 bg-brand text-white font-bold text-sm py-3 rounded-xl hover:bg-brandHi">Login / Sign up</button>
            )}
          </div>
        )}
      </header>

      {/* modals */}
      <Suspense fallback={<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"><div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div></div>}>
        {showLogin && (
          <LoginForm
            onClose={() => { setShowLogin(false); dispatch(setShowLoginModal(false)); dispatch(clearLoginCallback()); }}
            onLoginSuccess={(u) => {
              setUser(u); setShowLogin(false); dispatch(setShowLoginModal(false));
              if (loginCallback && loginCallback.startsWith('navigate:')) navigate(loginCallback.replace('navigate:', ''));
              else if (loginCallback) window.dispatchEvent(new CustomEvent('loginSuccess', { detail: { callback: loginCallback } }));
              dispatch(clearLoginCallback());
            }}
            onSwitchToSignup={() => { setShowLogin(false); setShowSignup(true); dispatch(setShowLoginModal(false)); }}
          />
        )}
        {showSignup && (
          <SignupForm
            onClose={() => setShowSignup(false)}
            onSignupSuccess={(u) => {
              setUser(u); setShowSignup(false);
              if (loginCallback && loginCallback.startsWith('navigate:')) navigate(loginCallback.replace('navigate:', ''));
              dispatch(clearLoginCallback());
            }}
            onSwitchToLogin={() => { setShowSignup(false); setShowLogin(true); }}
          />
        )}
        <CartDrawer isOpen={showCart} onClose={() => setShowCart(false)} cartItems={cartItems} />
      </Suspense>
    </>
  );
};

export default NewHeader;
