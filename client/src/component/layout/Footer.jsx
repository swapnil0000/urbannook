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
      {/* Outer Wrapper: 
          1. w-[98%] for consistent side margins.
          2. rounded-[2.5rem] to match your other home components.
          3. isolation-isolate to keep the watermark inside the curves.
      */}
      <div className="mx-auto w-[99%] relative overflow-hidden rounded-[2.5rem] lg:rounded-[4rem] bg-[#faf9f6] text-[#1a1a1a] pt-24 pb-12 shadow-sm border border-black/5 isolation-isolate">
        
        {/* Giant Decorative Watermark (Very Subtle) */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full pointer-events-none opacity-[0.03] select-none z-0">
          <h1 className="text-[14vw] font-serif font-bold text-center leading-none text-black tracking-tighter uppercase whitespace-nowrap">
            Urban Nook
          </h1>
        </div>

        <div className="max-w-[1440px] mx-auto px-8 md:px-16 lg:px-24 relative z-10">
          
          {/* --- SECTION 1: THE BRAND INVITATION --- */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-20 border-b border-black/5 pb-16">
            <div className="lg:col-span-7 flex flex-col justify-center">
               <div className="flex items-center gap-4 mb-6">
                  <span className="h-[1px] w-12 bg-[#1c3026]"></span>
                  <span className="text-[#1c3026] font-bold tracking-[0.3em] uppercase text-[10px]">Curation & Craft</span>
               </div>
               <h2 className="text-4xl md:text-6xl font-serif text-[#1c3026] leading-[1.1] mb-6">
                  Elevate your nook. <br />
                  <span className="italic font-light text-[#a89068]">Join the inner circle.</span>
               </h2>
               <p className="text-gray-500 text-lg font-light max-w-xl leading-relaxed">
                  Experience the intersection of 3D printing and lifestyle. Get early access to limited artifacts and shop the newest essentials.
               </p>
            </div>

            <div className="lg:col-span-5 flex items-center">
               <form className="w-full">
                  <div className="relative p-2 bg-white rounded-2xl shadow-sm border border-black/5 group focus-within:shadow-md transition-all duration-300">
                    <input 
                      type="email" 
                      placeholder="yourname@email.com"
                      className="w-full bg-transparent py-4 pl-4 pr-32 text-lg text-[#1a1a1a] placeholder-gray-400 focus:outline-none font-serif"
                    />
                    <button 
                      type="submit" 
                      className="absolute right-2 top-2 bottom-2 px-8 flex items-center justify-center rounded-xl bg-[#1c3026] text-white hover:bg-[#F5DEB3] hover:text-[#050c08] transition-all duration-300 font-bold uppercase tracking-widest text-[10px]"
                    >
                      Join Now
                    </button>
                  </div>
                  <p className="mt-4 text-[10px] uppercase tracking-widest text-gray-400">
                     Monthly updates on drops. No spam, ever.
                  </p>
               </form>
            </div>
          </div>

          {/* --- SECTION 2: NAVIGATION GRID --- */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-4">
              <div className="md:col-span-6 lg:col-span-6">
                  <Link to="/" className="inline-block mb-8">
                     <span className="text-3xl font-serif text-[#1c3026] tracking-tight">Urban<span className="text-[#a89068] italic">Nook.</span></span>
                  </Link>
                  <div className="flex flex-col gap-6">
                     <div className="space-y-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Connect with our studio</p>
                        <div className="flex gap-4">
                           {['instagram', 'twitter', 'facebook-f'].map((icon) => (
                              <a key={icon} href={`https://${icon}.com/urbannook.in`} className="w-10 h-10 rounded-full border border-black/10 flex items-center justify-center text-gray-400 hover:bg-[#1c3026] hover:text-white transition-all duration-300">
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

              <div className="md:col-span-3 lg:col-span-3">
                <h4 className="text-[#1a1a1a] font-bold uppercase tracking-widest text-[10px] mb-8">Support</h4>
                <ul className="space-y-4">
                  {['Track Order', 'Returns & Exchange', 'Cancellation & Refund', 'FAQs'].map((name) => (
                    <li key={name}>
                      <Link to="#" className="text-gray-500 text-sm hover:text-[#1c3026] transition-all duration-300 flex items-center group">
                         <span className="h-[1px] w-0 bg-[#a89068] group-hover:w-4 transition-all duration-300 mr-0 group-hover:mr-2"></span>
                         {name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="md:col-span-3 lg:col-span-3">
                <h4 className="text-[#1a1a1a] font-bold uppercase tracking-widest text-[10px] mb-8">Company</h4>
                <ul className="space-y-4">
                  {['Our Story', 'Contact Us', 'Privacy Policy', 'Terms of Service'].map((name) => (
                    <li key={name}>
                      <Link to="#" className="text-gray-500 text-sm hover:text-[#1c3026] transition-all duration-300 flex items-center group">
                         <span className="h-[1px] w-0 bg-[#a89068] group-hover:w-4 transition-all duration-300 mr-0 group-hover:mr-2"></span>
                         {name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
          </div>

          {/* --- SECTION 3: FOOTER BAR --- */}
<div className="flex flex-col lg:items-center md:flex-row justify-between items-center gap-8 pt-10 border-t border-black/5  w-full">
  
  {/* Left Side: Copyright Section */}
  <div className="flex flex-col gap-4 self-center pb-4">
    <div className="flex items-center gap-4 text-gray-400 text-[10px] uppercase tracking-widest font-medium">
      <span>© {new Date().getFullYear()} UrbanNook Inc.</span>
      <span className="h-4 w-[1px] bg-black/10 hidden md:block"></span>
      <span className="hidden md:block">Thoughtfully Made in India</span>
    </div>
  </div>

  {/* Right Side: Payment Section (No extra wrapping divs that center it) */}
  <div className="flex flex-col items-center md:items-end gap-6">
    {/* Razorpay Section */}
    <div className="flex flex-col items-center md:items-end gap-2">
      <span className="text-[10px] font-bold tracking-[0.4em] text-slate-400 uppercase">
        Secure Checkout Powered By
      </span>
      <img 
        src="https://razorpay.com/assets/razorpay-glyph.svg" 
        alt="Razorpay" 
        className="h-8 w-auto object-contain hover:scale-105 transition-transform duration-300"
      />
    </div>

    {/* Supported Methods Section */}
    <div className="flex flex-col items-center md:items-end gap-3">
      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-[0.25em]">
        Supported Payment Methods
      </span>
      
      <div className="flex items-center justify-center gap-6 px-6 py-3 bg-slate-50/50 rounded-full border border-slate-100 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-700">
        <img 
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Visa_Inc._logo_%282005%E2%80%932014%29.svg/1920px-Visa_Inc._logo_%282005%E2%80%932014%29.svg.png" 
          className="h-3 w-auto object-contain" 
          alt="Visa" 
        />
        <img 
          src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" 
          className="h-6 w-auto object-contain" 
          alt="Mastercard" 
        />
        <div className="hidden md:block h-4 w-[1px] bg-slate-200"></div>
        <img 
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/UPI_logo.svg/1920px-UPI_logo.svg.png" 
          className="h-4 w-auto object-contain" 
          alt="UPI" 
        />
        <img 
          src="https://upload.wikimedia.org/wikipedia/commons/c/cb/Rupay-Logo.png" 
          className="h-3 w-auto object-contain" 
          alt="RuPay" 
        />
      </div>
    </div>
  </div>
</div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;