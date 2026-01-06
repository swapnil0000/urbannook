import React from 'react';
import { Link } from 'react-router-dom'; // Assuming you are using react-router-dom

const Footer = () => {
  return (
    <footer className="bg-[#0a1a13] text-white pt-24 pb-8 overflow-hidden relative font-sans">
      
      {/* Background Large Typography (Watermark) */}
      <div className="absolute top-50 left-0 w-full overflow-hidden pointer-events-none opacity-[0.03]">
        <h1 className="text-[15vw] font-bold text-center leading-none text-white tracking-tighter uppercase whitespace-nowrap">
          Urban Nook
        </h1>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Top Section: Brand & Newsletter */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-12 mb-20 border-b border-white/10 pb-16">
          <div className="max-w-md">
            {/* Logo Section */}
            <Link to="/" className="inline-block mb-6">
              <img 
                src="/assets/logo.jpeg" // Ensure this path is correct
                alt="UrbanNook Logo" 
                className="h-12 w-auto object-contain bg-white/10 rounded-lg p-1" // Added background for visibility if logo has transparency issues
              />
            </Link>
            <p className="text-gray-400 leading-relaxed text-lg font-light">
              Curating your space with aesthetic essentials. We blend utility with modern design to elevate your everyday carry and living spaces.
            </p>
          </div>

          <div className="w-full lg:w-1/3">
             <h4 className="text-lg font-medium mb-4">Join our community</h4>
             <p className="text-gray-400 mb-6 text-sm">Get 10% off your first order and exclusive access to new drops.</p>
             <form className="relative" onSubmit={(e) => e.preventDefault()}>
                <input 
                  type="email" 
                  placeholder="Enter your email address"
                  className="w-full bg-transparent border-b border-gray-700 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors pr-12"
                />
                <button type="submit" className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-500 transition-colors">
                  <i className="fa-solid fa-arrow-right text-xl"></i>
                </button>
             </form>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-12 mb-20">
            
            {/* Column 1: Shop */}
            <div>
              <h4 className="text-emerald-400 font-bold uppercase tracking-widest text-xs mb-8">Shop</h4>
              <ul className="space-y-4">
                {[
                  { name: 'Keychains', link: '/shop/keychains' },
                  { name: 'Desk Organizers', link: '/shop/desk-organizers' },
                  { name: 'Car Accessories', link: '/shop/car-accessories' },
                  { name: 'Wall Holders', link: '/shop/wall-holders' },
                  { name: 'Posters', link: '/shop/posters' }
                ].map((item) => (
                  <li key={item.name}>
                    <Link to={item.link} className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group">
                      <span className="w-0 h-[1px] bg-emerald-500 group-hover:w-3 transition-all duration-300"></span>
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: Help & Policies */}
            <div>
              <h4 className="text-emerald-400 font-bold uppercase tracking-widest text-xs mb-8">Support</h4>
              <ul className="space-y-4">
                {[
                  { name: 'Track Order', link: '/track-order' },
                  { name: 'Shipping Info', link: '/shipping-policy' },
                  { name: 'Returns & Exchange', link: '/return-policy' },
                  { name: 'Cancellation & Refund', link: '/cancellation-refund' },
                  { name: 'Size Guide', link: '/size-guide' },
                  { name: 'FAQs', link: '/faqs' }
                ].map((item) => (
                  <li key={item.name}>
                    <Link to={item.link} className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group">
                       <span className="w-0 h-[1px] bg-emerald-500 group-hover:w-3 transition-all duration-300"></span>
                       {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Company */}
            <div>
              <h4 className="text-emerald-400 font-bold uppercase tracking-widest text-xs mb-8">Company</h4>
              <ul className="space-y-4">
                {[
                  { name: 'Our Story', link: '/about' },
                  { name: 'Contact Us', link: '/contact' },
                  { name: 'Privacy Policy', link: '/privacy-policy' },
                  { name: 'Terms & Conditions', link: '/terms-conditions' }
                ].map((item) => (
                  <li key={item.name}>
                    <Link to={item.link} className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group">
                       <span className="w-0 h-[1px] bg-emerald-500 group-hover:w-3 transition-all duration-300"></span>
                       {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Connect */}
            <div>
              <h4 className="text-emerald-400 font-bold uppercase tracking-widest text-xs mb-8">Connect</h4>
              <div className="space-y-6">
                 {/* Social Icons - Flex wrap fixed for mobile distortion */}
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
                        className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-emerald-500 hover:text-[#0a1a13] hover:border-emerald-500 transition-all duration-300 shrink-0"
                      >
                        <i className={`fa-brands ${social.icon}`}></i>
                      </a>
                    ))}
                 </div>
                 
                 <div className="space-y-4 pt-4">
                    <a href="mailto:support@urbannook.in" className="text-gray-400 text-sm flex items-center gap-3 hover:text-white transition-colors group">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                        <i className="fa-solid fa-envelope text-emerald-500 text-xs group-hover:text-white"></i>
                      </div>
                      support@urbannook.in
                    </a>
                    <a href="tel:+916386455982" className="text-gray-400 text-sm flex items-center gap-3 hover:text-white transition-colors group">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                        <i className="fa-solid fa-phone text-emerald-500 text-xs group-hover:text-white"></i>
                      </div>
                      +91 63864 55982
                    </a>
                    <div className="text-gray-400 text-sm flex items-center gap-3 group cursor-default">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                        <i className="fa-solid fa-location-dot text-emerald-500 text-xs group-hover:text-white"></i>
                      </div>
                      Gurgaon, India
                    </div>
                 </div>
              </div>
            </div>
        </div>
      </div>

      {/* Bottom Footer Bar */}
      <div className="border-t border-white/10 pt-8 px-6 md:px-12 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col-reverse md:flex-row justify-between items-center gap-6">
          <div className="text-gray-500 text-sm font-light text-center md:text-left">
            © {new Date().getFullYear()} UrbanNook Inc. Designed with <span className="text-red-500 animate-pulse">♥</span> in India.
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-2">
             <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">100% Secured by Razorpay</span>
             <div className="flex gap-2">
                {/* Razorpay Supported Methods Visuals */}
                <div className="h-6 px-2 bg-white rounded flex items-center justify-center" title="Visa">
                   <i className="fa-brands fa-cc-visa text-lg text-blue-900"></i>
                </div>
                <div className="h-6 px-2 bg-white rounded flex items-center justify-center" title="Mastercard">
                   <i className="fa-brands fa-cc-mastercard text-lg text-red-600"></i>
                </div>
                <div className="h-6 px-2 bg-white rounded flex items-center justify-center" title="UPI / Google Pay">
                   <i className="fa-brands fa-google-pay text-lg text-gray-700"></i>
                </div>
                <div className="h-6 px-2 bg-white rounded flex items-center justify-center" title="Net Banking">
                   <i className="fa-solid fa-building-columns text-sm text-gray-700"></i>
                </div>
             </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;