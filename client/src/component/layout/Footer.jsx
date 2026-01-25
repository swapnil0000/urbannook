import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useJoinCommunityMutation } from '../../store/api/userApi';
import { useUI } from '../../hooks/useRedux';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joinCommunity] = useJoinCommunityMutation();
  
  // Hook to trigger the Notification component
  const { showNotification } = useUI();

  const handleCommunityJoin = async (e) => {
    e.preventDefault();
    
    // Basic Validation
    if (!email.trim()) {
      showNotification('Please enter your email address.', 'error');
      return;
    }
    
    // Email Regex Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showNotification('Please enter a valid email address.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await joinCommunity({ email }).unwrap();

      // Handle specific backend messages
      if(result?.message && result.message.includes("already part")) {
         showNotification(result.message, 'warning');
      } else {
        showNotification(result?.message || 'Welcome to the community!', 'success');
      }

      setEmail('');
    } catch (error) {
      showNotification(error.data?.message || 'Failed to join. Please try again later.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="bg-[#0a1a13] text-white pt-24 pb-10 overflow-hidden relative font-sans selection:bg-[#F5DEB3] selection:text-[#0a1a13]">
      
      {/* --- BACKGROUND ELEMENTS --- */}
      {/* Giant Watermark */}
      <div className="absolute top-20 left-0 w-full pointer-events-none opacity-[0.02]">
        <h1 className="text-[18vw] font-bold text-center leading-none text-white tracking-tighter uppercase whitespace-nowrap font-serif">
          Urban Nook
        </h1>
      </div>
      
      {/* Ambient Glow */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#F5DEB3] rounded-full blur-[150px] opacity-[0.03] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* --- TOP SECTION: BRAND & NEWSLETTER --- */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-12 mb-20 border-b border-white/10 pb-16">
          
          {/* Brand Info */}
          <div className="max-w-md">
            <Link to="/" className="inline-block mb-6 group">
              <img 
                src="/assets/logo.webp" 
                alt="UrbanNook Logo" 
                className="h-12 w-auto object-contain bg-white/5 rounded-lg p-1 group-hover:bg-white/10 transition-colors" 
              />
            </Link>
            <p className="text-gray-400 leading-relaxed text-base md:text-lg font-light">
              Curating your space with aesthetic essentials. We blend utility with modern design to elevate your everyday carry and living spaces.
            </p>
          </div>

          {/* Newsletter / Community Box */}
          <div className="w-full lg:w-[40%] bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-8 relative overflow-hidden">
             {/* Decorative shine */}
             <div className="absolute top-0 right-0 w-20 h-20 bg-[#F5DEB3]/10 rounded-full blur-xl"></div>
             
             <h4 className="text-xl md:text-2xl font-serif text-white mb-2">Join the Community</h4>
             <p className="text-gray-400 mb-6 text-sm">Unlock 10% off your first order and get early access to our limited drops.</p>
             
             <form className="relative flex items-center" onSubmit={handleCommunityJoin}>
                <div className="relative w-full">
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full bg-black/20 border border-white/10 rounded-xl py-4 pl-4 pr-14 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5DEB3] focus:ring-1 focus:ring-[#F5DEB3]/50 transition-all text-sm"
                    disabled={isSubmitting}
                  />
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-lg bg-[#F5DEB3] text-[#0a1a13] hover:bg-white transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <i className="fa-solid fa-circle-notch animate-spin text-sm"></i>
                    ) : (
                      <i className="fa-solid fa-arrow-right text-sm"></i>
                    )}
                  </button>
                </div>
             </form>
          </div>
        </div>

        {/* --- MIDDLE SECTION: LINKS GRID --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-12 mb-20">
            
            {/* Column 1: Shop */}
            <div>
              <h4 className="text-[#F5DEB3] font-bold uppercase tracking-widest text-xs mb-6">Collections</h4>
              <ul className="space-y-3">
                {[
                  { name: 'Keychains', link: '/shop/keychains' },
                  { name: 'Desk Setup', link: '/shop/desk-organizers' },
                  { name: 'Car Accessories', link: '/shop/car-accessories' },
                  { name: 'Wall Mounts', link: '/shop/wall-holders' },
                  { name: 'Art Prints', link: '/shop/posters' }
                ].map((item) => (
                  <li key={item.name}>
                    <Link to={item.link} className="text-gray-400 text-sm hover:text-white transition-colors flex items-center gap-2 group">
                      <span className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-[#F5DEB3] transition-colors"></span>
                      <span className="group-hover:translate-x-1 transition-transform duration-300">{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: Support */}
            <div>
              <h4 className="text-[#F5DEB3] font-bold uppercase tracking-widest text-xs mb-6">Support</h4>
              <ul className="space-y-3">
                {[
                  { name: 'Track Order', link: '/track-order' },
                  { name: 'Returns & Exchange', link: '/return-policy' },
                  { name: 'Cancellation & Refund', link: '/cancellation-refund' },
                  { name: 'FAQs', link: '/faqs' }
                ].map((item) => (
                  <li key={item.name}>
                    <Link to={item.link} className="text-gray-400 text-sm hover:text-white transition-colors flex items-center gap-2 group">
                       <span className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-[#F5DEB3] transition-colors"></span>
                       <span className="group-hover:translate-x-1 transition-transform duration-300">{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Company */}
            <div>
              <h4 className="text-[#F5DEB3] font-bold uppercase tracking-widest text-xs mb-6">Company</h4>
              <ul className="space-y-3">
                {[
                  { name: 'Our Story', link: '/about-us' },
                  { name: 'Contact Us', link: '/contact-us' },
                  { name: 'Privacy Policy', link: '/privacy-policy' },
                  { name: 'Terms of Service', link: '/terms-conditions' }
                ].map((item) => (
                  <li key={item.name}>
                    <Link to={item.link} className="text-gray-400 text-sm hover:text-white transition-colors flex items-center gap-2 group">
                       <span className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-[#F5DEB3] transition-colors"></span>
                       <span className="group-hover:translate-x-1 transition-transform duration-300">{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Social & Contact */}
            <div>
              <h4 className="text-[#F5DEB3] font-bold uppercase tracking-widest text-xs mb-6">Connect</h4>
              <div className="space-y-6">
                 {/* Social Icons */}
                 <div className="flex flex-wrap gap-3">
                    {[
                      { icon: 'fa-instagram', link: 'https://instagram.com' },
                      { icon: 'fa-twitter', link: 'https://twitter.com' },
                      { icon: 'fa-facebook-f', link: 'https://facebook.com' },
                      { icon: 'fa-youtube', link: 'https://youtube.com' }
                    ].map((social, idx) => (
                      <a 
                        key={idx} 
                        href={social.link} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-[#F5DEB3] hover:text-[#0a1a13] hover:border-[#F5DEB3] hover:-translate-y-1 transition-all duration-300 shadow-sm"
                      >
                        <i className={`fa-brands ${social.icon}`}></i>
                      </a>
                    ))}
                 </div>
                 
                 {/* Contact Details */}
                 <div className="space-y-3 pt-2">
                    <a href="mailto:support@urbannook.in" className="text-gray-400 text-sm flex items-center gap-3 hover:text-white transition-colors group">
                      <i className="fa-solid fa-envelope text-[#F5DEB3] text-xs opacity-70 group-hover:opacity-100"></i>
                      support@urbannook.in
                    </a>
                    <a href="tel:+916386455982" className="text-gray-400 text-sm flex items-center gap-3 hover:text-white transition-colors group">
                      <i className="fa-solid fa-phone text-[#F5DEB3] text-xs opacity-70 group-hover:opacity-100"></i>
                      +91 63864 55982
                    </a>
                    <div className="text-gray-400 text-sm flex items-center gap-3 group cursor-default">
                      <i className="fa-solid fa-location-dot text-[#F5DEB3] text-xs opacity-70 group-hover:opacity-100"></i>
                      Gurgaon, India
                    </div>
                 </div>
              </div>
            </div>
        </div>
      </div>

      {/* --- BOTTOM BAR --- */}
      <div className="border-t border-white/10 pt-8 px-6 md:px-12 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col-reverse md:flex-row justify-between items-center gap-6">
          <div className="text-gray-500 text-xs md:text-sm font-light text-center md:text-left">
            © {new Date().getFullYear()} UrbanNook Inc. All rights reserved. 
            <span className="hidden sm:inline"> | Designed in <span className="text-[#F5DEB3]">India</span></span>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-3">
             <div className="flex gap-2 opacity-80 grayscale hover:grayscale-0 transition-all duration-500">
                <div className="h-7 px-2 bg-white rounded flex items-center justify-center shadow-sm" title="Visa">
                   <i className="fa-brands fa-cc-visa text-xl text-[#1434CB]"></i>
                </div>
                <div className="h-7 px-2 bg-white rounded flex items-center justify-center shadow-sm" title="Mastercard">
                   <i className="fa-brands fa-cc-mastercard text-xl text-[#EB001B]"></i>
                </div>
                <div className="h-7 px-2 bg-white rounded flex items-center justify-center shadow-sm" title="UPI">
                   <i className="fa-brands fa-google-pay text-xl text-gray-700"></i>
                </div>
                <div className="h-7 px-2 bg-white rounded flex items-center justify-center shadow-sm" title="Razorpay">
                   <span className="text-[10px] font-bold text-[#0a1a13] uppercase tracking-wide">Razorpay</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;