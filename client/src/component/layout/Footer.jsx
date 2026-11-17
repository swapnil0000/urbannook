import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useJoinCommunityMutation } from '../../store/api/userApi';
import { useUI } from '../../hooks/useRedux';
import { useGetProductsQuery } from '../../store/api/productsApi';
import { categoryPath, CATEGORY_LABEL, sortByCategoryPriority } from '../../utils/categoryUrl';

/* Footer - forest green poster block with lime Anton headings (matches the 2026-11 homepage). */
const Footer = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joinCommunity] = useJoinCommunityMutation();
  const { showNotification, openLoginModal } = useUI();

  // Categories read off the live catalogue, like the header nav — the old
  // hard-coded Lamp / Pen Stand links missed most of the catalogue. Same
  // query args as the header, so this is a cache hit, not a new request.
  const { data: prodRes } = useGetProductsQuery({ page: 1, limit: 24 });
  const categories = useMemo(() => {
    const list = prodRes?.data?.products || prodRes?.data?.listofPublishedProducts || [];
    const seen = [];
    list.forEach((p) => { const c = p?.productCategory; if (c && !seen.includes(c)) seen.push(c); });
    // Same order as the header; every category stays listed (keeps each category page linked).
    return sortByCategoryPriority(seen);
  }, [prodRes]);

  const handleCommunityJoin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showNotification('Please enter a valid email address.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await joinCommunity({ email }).unwrap();
      // Use the backend message directly
      showNotification(response?.message || 'Welcome to the inner circle.', 'success');
      setEmail('');
    } catch (error) {
      showNotification(error?.data?.message || 'Failed to join. Try again later.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Track Order is login-only — prompt instead of landing on an empty page.
  const handleTrackOrderClick = (e) => {
    e.preventDefault();
    const isLoggedIn = isAuthenticated || !!localStorage.getItem('authToken');
    if (!isLoggedIn) {
      showNotification('Please login to track your orders', 'error');
      openLoginModal();
    } else {
      navigate('/orders');
    }
  };

  return (
  <footer className="relative bg-forest text-cream/85 font-inter rounded-t-[36px] md:rounded-t-[56px] border-t-[3px] border-ink">
    <div className="max-w-[1280px] mx-auto px-5 pt-14 pb-12 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
      <div className="col-span-2 md:col-span-1">
        <p className="font-anton uppercase text-brand text-4xl leading-none [text-shadow:2px_2px_0_rgb(var(--gl-ink))]">UrbanNook</p>
        <p className="text-sm mt-3 max-w-xs">3D-printed desk lamps, pen stands & décor. Made to order in India - make every corner count.</p>
        <div className="flex gap-4 mt-5 text-sm">
          <a href="https://www.instagram.com/urbannook.store" target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center rounded-full border-2 border-lime px-4 font-anton uppercase tracking-wide text-lime hover:bg-lime hover:text-forest transition-colors">Instagram</a>
        </div>
      </div>
      <div>
        <p className="font-anton uppercase text-lime text-2xl mb-3">Shop</p>
        <ul className="space-y-1 text-[15px]">
          {categories.map((c) => (
            <li key={c} className="min-h-[32px] flex items-center"><Link to={categoryPath(c)} className="hover:text-lime underline-offset-4 hover:underline">{CATEGORY_LABEL[c] || c}</Link></li>
          ))}
          <li className="min-h-[32px] flex items-center"><Link to="/products?tag=best_seller" className="hover:text-lime underline-offset-4 hover:underline">Bestsellers</Link></li>
          <li className="min-h-[32px] flex items-center"><Link to="/products" className="hover:text-lime underline-offset-4 hover:underline">Shop All</Link></li>
        </ul>
      </div>
      <div>
        <p className="font-anton uppercase text-lime text-2xl mb-3">Help</p>
        <ul className="space-y-1 text-[15px]">
          <li className="min-h-[32px] flex items-center"><a href="/orders" onClick={handleTrackOrderClick} className="hover:text-lime underline-offset-4 hover:underline cursor-pointer">Track Order</a></li>
          <li className="min-h-[32px] flex items-center"><Link to="/return-policy" className="hover:text-lime underline-offset-4 hover:underline">Shipping & Exchange</Link></li>
          <li className="min-h-[32px] flex items-center"><Link to="/faqs" className="hover:text-lime underline-offset-4 hover:underline">FAQs</Link></li>
          <li className="min-h-[32px] flex items-center"><Link to="/blog" className="hover:text-lime underline-offset-4 hover:underline">Journal</Link></li>
          <li className="min-h-[32px] flex items-center"><Link to="/contact-us" className="hover:text-lime underline-offset-4 hover:underline">Contact</Link></li>
        </ul>
      </div>
      <div>
        <p className="font-anton uppercase text-lime text-2xl mb-3">Newsletter</p>
        <form onSubmit={handleCommunityJoin} className="flex rounded-full overflow-hidden border-2 border-ink bg-white">
          <label htmlFor="footer-email" className="sr-only">Email address</label>
          <input
            id="footer-email"
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-ink outline-none placeholder:text-ink/45 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-w-[52px] bg-brand px-4 font-anton text-lg text-white border-l-2 border-ink hover:bg-brandHi transition-colors disabled:opacity-50"
            aria-label="Subscribe"
          >
            {isSubmitting ? '…' : '→'}
          </button>
        </form>
        <p className="mt-2.5 text-[12px] text-cream/60">Monthly updates on drops. No spam, ever.</p>
        <div className="flex gap-1.5 mt-4 text-[11px] font-bold flex-wrap">
          {['VISA', 'Mastercard', 'UPI', 'RuPay', 'Partial COD'].map((x) => <span key={x} className="rounded-full border-2 border-ink bg-mustard text-ink px-2 py-0.5">{x}</span>)}
        </div>
      </div>
    </div>
    <div className="bg-ink">
      <div className="max-w-[1280px] mx-auto px-5 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-cream/70">
        <span>© {new Date().getFullYear()} Urban Nook · Made in India 🇮🇳</span>
        <div className="flex gap-4">
          <Link to="/privacy-policy" className="hover:text-lime underline-offset-4 hover:underline">Privacy</Link>
          <Link to="/terms-conditions" className="hover:text-lime underline-offset-4 hover:underline">Terms</Link>
          <Link to="/about-us" className="hover:text-lime underline-offset-4 hover:underline">About</Link>
        </div>
      </div>
    </div>
  </footer>
  );
};

export default Footer;
