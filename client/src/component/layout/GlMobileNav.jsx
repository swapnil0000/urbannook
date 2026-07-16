import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

/* GullyLabs-style sticky mobile bottom nav (mobile only). */
const GlMobileNav = () => {
  const { pathname } = useLocation();
  const totalQuantity = useSelector((s) => s.cart.totalQuantity);
  const wishCount = useSelector((s) => s.wishlist.items?.length || 0);

  const items = [
    { key: 'home', label: 'Home', to: '/', match: (p) => p === '/', icon: <path d="M3 11l9-8 9 8M5 10v10h14V10" /> },
    { key: 'shop', label: 'Shop', to: '/products', match: (p) => p.startsWith('/product'), icon: <><path d="M6 7h12l1 13H5L6 7z" /><path d="M9 7a3 3 0 0 1 6 0" /></> },
    { key: 'wish', label: 'Wishlist', to: '/wishlist', match: (p) => p === '/wishlist', badge: wishCount, icon: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" /> },
  ];

  const cell = (active) => `relative flex flex-col items-center gap-1 py-2.5 transition-colors ${active ? 'text-brand' : 'text-paper/55 hover:text-paper'}`;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-ink border-t border-white/10 grid grid-cols-4 text-[10px] font-bold font-inter" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {items.map((it) => (
        <Link key={it.key} to={it.to} className={cell(it.match(pathname))}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">{it.icon}</svg>
          {it.badge > 0 && <span className="absolute top-1.5 right-[26%] min-w-[15px] h-[15px] px-1 rounded-full bg-sale text-white text-[9px] grid place-items-center">{it.badge}</span>}
          {it.label}
        </Link>
      ))}
      <button onClick={() => window.dispatchEvent(new Event('openCartDrawer'))} className="relative flex flex-col items-center gap-1 py-2.5 text-paper/55 hover:text-paper transition-colors">
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M6 7h12l1 13H5L6 7z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>
        {totalQuantity > 0 && <span className="absolute top-1.5 right-[26%] min-w-[15px] h-[15px] px-1 rounded-full bg-sale text-white text-[9px] grid place-items-center">{totalQuantity}</span>}
        Cart
      </button>
    </nav>
  );
};

export default GlMobileNav;
