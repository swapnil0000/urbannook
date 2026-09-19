import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useJoinCommunityMutation } from '../../store/api/userApi';
import { useUI } from '../../hooks/useRedux';

/* GullyLabs-style footer — dark, clean, trust-forward. */
const Footer = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joinCommunity] = useJoinCommunityMutation();
  const { showNotification, openLoginModal } = useUI();

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
  <footer className="bg-ink text-white/80 font-inter">
    <div className="max-w-[1280px] mx-auto px-5 py-14 grid grid-cols-2 md:grid-cols-4 gap-8">
      <div className="col-span-2 md:col-span-1">
        <p className="font-extrabold text-white text-xl tracking-tight">URBAN&nbsp;NOOK</p>
        <p className="text-sm mt-3 max-w-xs">3D-printed desk lamps, pen stands & décor. Made to order in India — make every corner count.</p>
        <div className="flex gap-4 mt-4 text-sm text-white/60">
          <a href="https://www.instagram.com/urbannook.store" target="_blank" rel="noreferrer" className="hover:text-white">Instagram</a>
          <a href="#" className="hover:text-white">YouTube</a>
          <a href="#" className="hover:text-white">X</a>
        </div>
      </div>
      <div>
        <p className="gl-lbl text-white/50 mb-4">Shop</p>
        <ul className="space-y-2 text-sm">
          <li><Link to="/products?category=Lamp" className="hover:text-white">Desk Lamps</Link></li>
          <li><Link to="/products?category=Pen%20Stand" className="hover:text-white">Pen Stands</Link></li>
          <li><Link to="/products" className="hover:text-white">Bestsellers</Link></li>
          <li><Link to="/products" className="hover:text-white">Shop All</Link></li>
        </ul>
      </div>
      <div>
        <p className="gl-lbl text-white/50 mb-4">Help</p>
        <ul className="space-y-2 text-sm">
          <li><a href="/orders" onClick={handleTrackOrderClick} className="hover:text-white cursor-pointer">Track Order</a></li>
          <li><Link to="/return-policy" className="hover:text-white">Shipping & Returns</Link></li>
          <li><Link to="/faqs" className="hover:text-white">FAQs</Link></li>
          <li><Link to="/contact-us" className="hover:text-white">Contact</Link></li>
        </ul>
      </div>
      <div>
        <p className="gl-lbl text-white/50 mb-4">Newsletter</p>
        <form onSubmit={handleCommunityJoin} className="flex rounded-lg overflow-hidden bg-white/10">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-white/40 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-brand px-4 text-sm font-bold text-white hover:bg-brandHi transition-colors disabled:opacity-50"
            aria-label="Subscribe"
          >
            {isSubmitting ? '…' : '→'}
          </button>
        </form>
        <p className="mt-2.5 gl-lbl text-[9px] text-white/35">Monthly updates on drops. No spam, ever.</p>
        <div className="flex gap-1.5 mt-4 text-[10px] font-bold text-white/50 flex-wrap">
          {['VISA', 'Mastercard', 'UPI', 'RuPay', 'COD'].map((x) => <span key={x} className="border border-white/20 rounded px-1.5 py-0.5">{x}</span>)}
        </div>
      </div>
    </div>
    <div className="border-t border-white/10">
      <div className="max-w-[1280px] mx-auto px-5 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
        <span>© {new Date().getFullYear()} Urban Nook · Made in India 🇮🇳</span>
        <div className="flex gap-4">
          <Link to="/privacy-policy" className="hover:text-white">Privacy</Link>
          <Link to="/terms-conditions" className="hover:text-white">Terms</Link>
          <Link to="/about-us" className="hover:text-white">About</Link>
        </div>
      </div>
    </div>
  </footer>
  );
};

export default Footer;
