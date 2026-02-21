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
      const response = await joinCommunity({ email }).unwrap();
      // Use the backend message directly
      const message = response?.message || 'Welcome to the inner circle.';
      showNotification(message, 'success');
      setEmail('');
    } catch (error) {
      // Use backend error message if available
      const errorMessage = error?.data?.message || 'Failed to join. Try again later.';
      showNotification(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="w-full bg-[#f5f7f8] py-4 selection:bg-[#F5DEB3] selection:text-[#1a1a1a]">

  <div className="mx-auto  relative overflow-hidden  bg-[#faf9f6] text-[#1a1a1a] pt-20 md:pt-24 pb-12 shadow-sm isolate">
    
    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full pointer-events-none opacity-[0.03] select-none z-0">
      <h1 className="text-[14vw] font-serif font-bold text-center leading-none text-black tracking-tighter uppercase whitespace-nowrap">
        Urban Nook
      </h1>
    </div>

    <div className="max-w-[1440px] mx-auto px-6 md:px-16 lg:px-24 relative z-10">
      
      {/* --- SECTION 1: THE BRAND INVITATION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 mb-16 md:mb-20 border-b border-black/5 pb-12 md:pb-16">
        <div className="lg:col-span-7 flex flex-col justify-center text-center lg:text-left">
           <div className="flex items-center justify-center lg:justify-start gap-4 mb-6">
              <span className="h-[1px] w-12 bg-[#1c3026]"></span>
              <span className="text-[#1c3026] font-bold tracking-[0.3em] uppercase text-[10px]">Curation & Craft</span>
           </div>
           <h2 className="text-3xl md:text-6xl font-serif text-[#1c3026] leading-[1.1] mb-6">
              Elevate your nook. <br />
              <span className="italic font-light text-[#a89068]">Join the inner circle.</span>
           </h2>
           <p className="text-gray-500 text-base md:text-lg font-light max-w-xl leading-relaxed mx-auto lg:mx-0">
              Experience the intersection of 3D printing and lifestyle. Get early access to limited artifacts and shop the newest essentials.
           </p>
        </div>

        <div className="lg:col-span-5 flex items-center">
           <form className="w-full">
              <div className="relative bg-white rounded-2xl shadow-sm border border-black/5 group focus-within:shadow-md transition-all duration-300">
                <input 
                  type="email" 
                  placeholder="yourname@email.com"
                  className="w-full bg-transparent py-4 pl-4 pr-32 text-base md:text-lg text-[#1a1a1a] placeholder-gray-400 focus:outline-none font-serif"
                />
                <button 
                  type="submit" 
                  className="absolute right-2 top-2 bottom-2 px-4 md:px-8 flex items-center justify-center rounded-xl bg-[#1c3026] text-white hover:bg-[#F5DEB3] hover:text-[#050c08] transition-all duration-300 font-bold uppercase tracking-widest text-[9px] md:text-[10px]"
                >
                  Join Now
                </button>
              </div>
              <p className="mt-4 text-[9px] md:text-[10px] text-center lg:text-left uppercase tracking-widest text-gray-400">
                  Monthly updates on drops. No spam, ever.
              </p>
           </form>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-12">
          <div className="md:col-span-6 lg:col-span-6 text-center md:text-left">
              <Link to="/" className="inline-block mb-8">
                 <span className="text-3xl font-serif text-[#1c3026] tracking-tight">Urban<span className="text-[#a89068] italic">Nook.</span></span>
              </Link>
              <div className="flex flex-col gap-6 items-center md:items-start">
                 <div className="space-y-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Connect with us</p>
                    <div className="flex gap-3 justify-center md:justify-start">
                       {[
                         { icon: 'instagram', url: 'https://instagram.com/urbannook.store' },
                         { icon: 'twitter', url: 'https://twitter.com/urbannook' },
                         { icon: 'facebook-f', url: 'https://facebook.com/urbannook' }
                       ].map((social) => (
                          <a key={social.icon} href={social.url} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full border border-black/10 flex items-center justify-center text-gray-400 hover:bg-[#1c3026] hover:text-white hover:border-[#1c3026] transition-all duration-300">
                             <i className={`fa-brands fa-${social.icon} text-xs`}></i>
                          </a>
                       ))}
                    </div>
                 </div>
                 <div className="space-y-2">
                    <a href="mailto:support@urbannook.in" className="flex items-center gap-2 text-gray-500 hover:text-[#1c3026] transition-colors group">
                      <i className="fa-solid fa-envelope text-xs text-gray-400 group-hover:text-[#1c3026]"></i>
                      <span className="text-sm font-medium">support@urbannook.in</span>
                    </a>
                    <a href="tel:+918299638749" className="flex items-center gap-2 text-gray-500 hover:text-[#1c3026] transition-colors group">
                      <i className="fa-solid fa-phone text-xs text-gray-400 group-hover:text-[#1c3026]"></i>
                      <span className="text-sm">+91 82996 38749</span>
                    </a>
                    <span className="text-[10px] text-gray-400">Mon - Sat | 10AM - 7PM</span>
                 </div>
              </div>
          </div>

          <div className="hidden md:block md:col-span-3 lg:col-span-3">
            <h4 className="text-[#1a1a1a] font-bold uppercase tracking-widest text-[10px] mb-8">Support</h4>
            <ul className="space-y-4">
              {[
                { name: 'Track Order', path: '/orders' },
                { name: 'Returns & Exchange', path: '/return-policy' },
                { name: 'Cancellation & Refund', path: '/cancellation-refund' },
                { name: 'FAQs', path: '/faqs' }
              ].map((item) => (
                <li key={item.name}>
                  <Link to={item.path} className="text-gray-500 text-sm hover:text-[#1c3026] transition-all duration-300 flex items-center group">
                     <span className="h-[1px] w-0 bg-[#a89068] group-hover:w-4 transition-all duration-300 mr-0 group-hover:mr-2"></span>
                     {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="hidden md:block md:col-span-3 lg:col-span-3">
            <h4 className="text-[#1a1a1a] font-bold uppercase tracking-widest text-[10px] mb-8">Company</h4>
            <ul className="space-y-4">
              {[
                { name: 'Our Story', path: '/about-us' },
                { name: 'Contact Us', path: '/contact-us' },
                { name: 'Privacy Policy', path: '/privacy-policy' },
                { name: 'Terms of Service', path: '/terms-conditions' }
              ].map((item) => (
                <li key={item?.name}>
                  <Link to={item?.path} className="text-gray-500 text-sm hover:text-[#1c3026] transition-all duration-300 flex items-center group">
                     <span className="h-[1px] w-0 bg-[#a89068] group-hover:w-4 transition-all duration-300 mr-0 group-hover:mr-2"></span>
                     {item?.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-10 pt-10 border-t border-black/5 w-full">
        
        <div className="flex flex-col gap-4 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-gray-400 text-[10px] uppercase tracking-widest font-medium">
            <span>© {new Date().getFullYear()} UrbanNook Inc.</span>
            <span className="h-4 w-[1px] bg-black/10 hidden md:block"></span>
            <span>Thoughtfully Made in India</span>
          </div>
        </div>

        <div className="flex flex-col items-center md:items-end gap-6 w-full md:w-auto">
          <div className="flex items-center gap-3 px-4 py-2.5 bg-white/50 rounded-xl border border-black/5">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-shield-check text-emerald-600 text-sm"></i>
              <span className="text-[9px] md:text-[10px] font-bold tracking-wider text-gray-600 uppercase">Secured by</span>
            </div>
            <img 
              src="https://razorpay.com/assets/razorpay-glyph.svg" 
              alt="Razorpay" 
              className="h-5 md:h-6 w-auto object-contain opacity-70 hover:opacity-100 transition-all"
            />
            <span className='text-[10px] md:text-[10px] font-bold tracking-wider text-gray-600 '>Razorpay</span>
          </div>

          {/* <div className="flex flex-col items-center md:items-end gap-3">
            <span className="text-[8px] md:text-[9px] font-semibold text-slate-400 uppercase tracking-[0.25em]">
              Supported Payment Methods
            </span>
            
            <div className="flex items-center justify-center gap-4 md:gap-6 px-5 py-3 bg-slate-50/50 rounded-full border border-slate-100 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-700">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png" className="h-2.5 md:h-3" alt="Visa" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-5 md:h-6" alt="Mastercard" />
              <div className="h-4 w-[1px] bg-slate-200"></div>
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/UPI-Logo.png/1200px-UPI-Logo.png" className="h-3.5 md:h-4" alt="UPI" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/cb/Rupay-Logo.png" className="h-2.5 md:h-3" alt="RuPay" />
            </div>
          </div> */}
        </div>
      </div>

    </div>
  </div>
</footer>
  );
};

export default Footer;