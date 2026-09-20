import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useState } from 'react';
import { useUI } from '../../hooks/useRedux';
import { useLogoutMutation } from '../../store/api/authApi';
import { logout as logoutAction } from '../../store/slices/authSlice';
import { clearCsrfToken } from '../../store/api/apiSlice';

/* GullyLabs-style sticky mobile bottom nav (mobile only). */
const GlMobileNav = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const totalQuantity = useSelector((s) => s.cart.totalQuantity);
  const { isAuthenticated, user } = useSelector((s) => s.auth);
  const { openLoginModal } = useUI();
  const [logoutAPI] = useLogoutMutation();
  const [menuOpen, setMenuOpen] = useState(false);

  const authed =
    isAuthenticated || (typeof window !== 'undefined' && !!localStorage.getItem('authToken'));

  const handleAccount = () => {
    if (authed) setMenuOpen((o) => !o);
    else openLoginModal();
  };

  const handleLogout = async () => {
    try {
      await logoutAPI().unwrap();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      dispatch(logoutAction());
      clearCsrfToken();
      window.dispatchEvent(new Event('storage'));
      setMenuOpen(false);
      navigate('/');
    }
  };

  const items = [
    { key: 'home', label: 'Home', to: '/', match: (p) => p === '/', icon: <path d="M3 11l9-8 9 8M5 10v10h14V10" /> },
    { key: 'shop', label: 'Shop', to: '/products', match: (p) => p.startsWith('/product'), icon: <><path d="M6 7h12l1 13H5L6 7z" /><path d="M9 7a3 3 0 0 1 6 0" /></> },
    { key: 'orders', label: 'Orders', to: '/orders', match: (p) => p === '/orders', icon: <><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" /><path d="M9 7h6M9 11h6M9 15h4" /></> },
  ];

  const cell = (active) => `relative flex flex-col items-center gap-1 py-2.5 transition-colors ${active ? 'text-brand' : 'text-paper/55 hover:text-paper'}`;
  const svgProps = { width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24' };

  return (
    <>
      {/* Account popover (only when logged in) */}
      {menuOpen && authed && (
        <div className="md:hidden fixed inset-0 z-[41]" onClick={() => setMenuOpen(false)}>
          <div
            className="absolute right-2 w-56 bg-ink border border-white/10 shadow-2xl overflow-hidden font-inter"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 60px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-paper text-xs font-bold truncate">{user?.name || 'Your account'}</p>
              {user?.email && <p className="text-paper/50 text-[11px] truncate">{user.email}</p>}
            </div>
            <button onClick={() => { setMenuOpen(false); navigate('/profile'); }} className="w-full text-left px-4 py-3.5 text-paper/85 hover:bg-white/5 text-sm flex items-center gap-3">
              <i className="fa-solid fa-user text-brand w-4 text-center"></i> My Profile
            </button>
            <button onClick={() => { setMenuOpen(false); navigate('/orders'); }} className="w-full text-left px-4 py-3.5 text-paper/85 hover:bg-white/5 text-sm flex items-center gap-3 border-t border-white/10">
              <i className="fa-solid fa-box-open text-brand w-4 text-center"></i> My Orders
            </button>
            <button onClick={handleLogout} className="w-full text-left px-4 py-3.5 text-paper/85 hover:bg-white/5 text-sm flex items-center gap-3 border-t border-white/10">
              <i className="fa-solid fa-arrow-right-from-bracket text-brand w-4 text-center"></i> Log out
            </button>
          </div>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-ink border-t border-white/10 grid grid-cols-5 text-[10px] font-bold font-inter" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {items.map((it) => (
          <Link key={it.key} to={it.to} className={cell(it.match(pathname))}>
            <svg {...svgProps}>{it.icon}</svg>
            {it.label}
          </Link>
        ))}

        <button onClick={() => window.dispatchEvent(new Event('openCartDrawer'))} className={cell(false)}>
          <svg {...svgProps}><path d="M6 7h12l1 13H5L6 7z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>
          {totalQuantity > 0 && <span className="absolute top-1.5 right-[22%] min-w-[15px] h-[15px] px-1 rounded-full bg-sale text-white text-[9px] grid place-items-center">{totalQuantity}</span>}
          Cart
        </button>

        <button onClick={handleAccount} className={cell((authed && (pathname === '/profile' || menuOpen)))}>
          <svg {...svgProps}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
          {authed ? 'Account' : 'Login'}
        </button>
      </nav>
    </>
  );
};

export default GlMobileNav;
