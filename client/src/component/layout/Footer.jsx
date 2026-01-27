import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useJoinCommunityMutation } from '../../store/api/userApi';
import { useUI } from '../../hooks/useRedux';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joinCommunity] = useJoinCommunityMutation();
  const { showNotification } = useUI();

  const handleCommunityJoin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showNotification('Please enter a valid email address.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await joinCommunity({ email }).unwrap();
      showNotification('Welcome to the inner circle.', 'success');
      setEmail('');
    } catch (error) {
      showNotification('Failed to join. Try again later.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // Light Background: Warm Off-White / Paper texture feel
    <footer className="bg-[#faf9f6] text-[#1a1a1a] pt-32 pb-12 overflow-hidden relative font-sans selection:bg-[#F5DEB3] selection:text-[#1a1a1a]">
      
      {/* Top Border Detail */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-black/5"></div>
      
      {/* Giant Decorative Watermark (Very Subtle on Light) */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full pointer-events-none opacity-[0.03] select-none z-0">
        <h1 className="text-[18vw] font-serif font-bold text-center leading-none text-black tracking-tighter uppercase whitespace-nowrap">
          Urban Nook
        </h1>
      </div>

      <div className="max-w-[1440px] mx-auto px-8 md:px-16 lg:px-24 relative z-10">
        
        {/* --- SECTION 1: THE BRAND INVITATION --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-24 border-b border-black/5 pb-20">
          
          <div className="lg:col-span-7 flex flex-col justify-center">
             <div className="flex items-center gap-4 mb-8">
                <span className="h-[1px] w-12 bg-[#1c3026]"></span>
                <span className="text-[#1c3026] font-bold tracking-[0.3em] uppercase text-[10px]">Curation & Craft</span>
             </div>
             <h2 className="text-4xl md:text-6xl font-serif text-[#1c3026] leading-[1.1] mb-8">
                Elevate your nook. <br />
                <span className="italic font-light text-[#a89068]">Join the inner circle.</span>
             </h2>
             <p className="text-gray-500 text-lg font-light max-w-xl leading-relaxed">
                Experience the intersection of 3D printing and lifestyle. Get early access to limited artifacts and shop the newest essentials.
             </p>
          </div>

          <div className="lg:col-span-5 flex items-center">
             {/* Enhanced Newsletter Input with Background & Padding */}
             <form className="w-full" onSubmit={handleCommunityJoin}>
                <div className="relative p-2 bg-white rounded-2xl shadow-sm border border-black/5 group focus-within:shadow-md transition-all duration-300">
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@email.com"
                    className="w-full bg-transparent py-4 pl-4 pr-32 text-lg text-[#1a1a1a] placeholder-gray-400 focus:outline-none font-serif"
                    disabled={isSubmitting}
                  />
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="absolute right-2 top-2 bottom-2 px-8 flex items-center justify-center rounded-xl bg-[#1c3026] text-white hover:bg-[#F5DEB3] hover:text-[#050c08] transition-all duration-300 font-bold uppercase tracking-widest text-[10px]"
                  >
                    {isSubmitting ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Join Now'}
                  </button>
                </div>
                <p className="mt-4 text-[10px] uppercase tracking-widest text-gray-400">
                   Monthly updates on drops. No spam, ever.
                </p>
             </form>
          </div>

        </div>

        {/* --- SECTION 2: NAVIGATION GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-24">
            
            {/* Brand column */}
            <div className="md:col-span-6 lg:col-span-6">
                <Link to="/" className="inline-block mb-8">
                   <span className="text-3xl font-serif text-[#1c3026] tracking-tight">Urban<span className="text-[#a89068] italic">Nook.</span></span>
                </Link>
                <div className="flex flex-col gap-6">
                   <div className="space-y-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Connect with our studio</p>
                      <div className="flex gap-4">
                         {['instagram', 'twitter', 'facebook-f'].map((icon) => (
                            <a key={icon} href={`https://${icon}.com/urbannook.in`} className="w-10 h-10 rounded-full border border-black/10 flex items-center justify-center text-gray-400 hover:bg-[#1c3026] hover:text-white hover:border-[#1c3026] transition-all duration-300">
                               <i className={`fa-brands fa-${icon} text-sm`}></i>
                            </a>
                         ))}
                      </div>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[#1a1a1a] text-sm font-medium">support@urbannook.in</p>
                      <p className="text-gray-500 text-sm">+91 63864 55982</p>
                   </div>
                </div>
            </div>

            {/* Support column */}
            <div className="md:col-span-3 lg:col-span-3">
              <h4 className="text-[#1a1a1a] font-bold uppercase tracking-widest text-[10px] mb-8">Support</h4>
              <ul className="space-y-4">
                {[
                  { name: 'Track Order', link: '/orders' },
                  { name: 'Returns & Exchange', link: '/return-policy' },
                  { name: 'Cancellation & Refund', link: '/cancellation-refund' },
                  { name: 'FAQs', link: '/faqs' }
                ].map((item) => (
                  <li key={item.name}>
                    <Link to={item.link} className="text-gray-500 text-sm hover:text-[#1c3026] transition-all duration-300 flex items-center group">
                       <span className="h-[1px] w-0 bg-[#a89068] group-hover:w-4 transition-all duration-300 mr-0 group-hover:mr-2"></span>
                       {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company column */}
            <div className="md:col-span-3 lg:col-span-3">
              <h4 className="text-[#1a1a1a] font-bold uppercase tracking-widest text-[10px] mb-8">Company</h4>
              <ul className="space-y-4">
                {[
                  { name: 'Our Story', link: '/about-us' },
                  { name: 'Contact Us', link: '/contact-us' },
                  { name: 'Privacy Policy', link: '/privacy-policy' },
                  { name: 'Terms of Service', link: '/terms-conditions' }
                ].map((item) => (
                  <li key={item.name}>
                    <Link to={item.link} className="text-gray-500 text-sm hover:text-[#1c3026] transition-all duration-300 flex items-center group">
                       <span className="h-[1px] w-0 bg-[#a89068] group-hover:w-4 transition-all duration-300 mr-0 group-hover:mr-2"></span>
                       {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

        </div>

        {/* --- SECTION 3: FOOTER BAR --- */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 pt-12 border-t border-black/5">
            <div className="flex items-center gap-4 text-gray-400 text-[10px] uppercase tracking-widest font-medium">
               <span>© {new Date().getFullYear()} UrbanNook Inc.</span>
               <span className="h-4 w-[1px] bg-black/10 hidden md:block"></span>
               <span className="hidden md:block">Thoughtfully Made in India</span>
            </div>

            {/* Monochromatic Payment Icons for Premium Feel */}
            <div className="flex items-center gap-6 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
               <i className="fa-brands fa-cc-visa text-2xl text-[#1a1a1a]"></i>
               <i className="fa-brands fa-cc-mastercard text-2xl text-[#1a1a1a]"></i>
               <i className="fa-brands fa-google-pay text-3xl text-[#1a1a1a]"></i>
               <span className="text-[10px] font-bold tracking-tighter border border-black/20 px-2 py-1 rounded">RAZORPAY</span>
            </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;