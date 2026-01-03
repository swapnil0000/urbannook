import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-[#0a1a13] text-white pt-24 pb-8 overflow-hidden relative">
      
      {/* Background Large Typography (Watermark) */}
      <div className="absolute top-0 left-0 w-full overflow-hidden pointer-events-none opacity-[0.03]">
        <h1 className="text-[15vw] font-bold text-center leading-none text-white tracking-tighter uppercase whitespace-nowrap">
          Urban Nook
        </h1>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Top Section: Brand & Newsletter */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-12 mb-20 border-b border-white/10 pb-16">
          <div className="max-w-md">
            {/* UPDATED LOGO SECTION */}
            <div className="flex items-center gap-3 mb-6">
              <img 
                src="/assets/logo.jpeg91`" // Make sure you have a white version of the logo here
                alt="UrbanNook Logo" 
                className="h-12 w-auto" // Adjust height as needed
              />
            </div>
            <p className="text-gray-400 leading-relaxed text-lg font-light">
              Curating your space with aesthetic essentials. We blend utility with modern design to elevate your everyday carry and living spaces.
            </p>
          </div>

          <div className="w-full lg:w-1/3">
             <h4 className="text-lg font-medium mb-4">Join our community</h4>
             <p className="text-gray-400 mb-6 text-sm">Get 10% off your first order and exclusive access to new drops.</p>
             <form className="relative">
                <input 
                  type="email" 
                  placeholder="Enter your email address"
                  className="w-full bg-transparent border-b border-gray-700 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors pr-12"
                />
                <button type="button" className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-500 transition-colors">
                  <i className="fa-solid fa-arrow-right text-xl"></i>
                </button>
             </form>
          </div>
        </div>

        {/* Links Grid - (No changes here) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 lg:gap-8 mb-20">
            
            {/* Column 1: Shop */}
            <div>
              <h4 className="text-emerald-400 font-bold uppercase tracking-widest text-xs mb-8">Shop</h4>
              <ul className="space-y-4">
                {['Keychains', 'Desk Organizers', 'Car Accessories', 'Wall Holders', 'Posters'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group">
                      <span className="w-0 h-[1px] bg-emerald-500 group-hover:w-3 transition-all duration-300"></span>
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: Help */}
            <div>
              <h4 className="text-emerald-400 font-bold uppercase tracking-widest text-xs mb-8">Support</h4>
              <ul className="space-y-4">
                {['Track Order', 'Shipping Info', 'Returns & Exchange', 'Size Guide', 'FAQs'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group">
                       <span className="w-0 h-[1px] bg-emerald-500 group-hover:w-3 transition-all duration-300"></span>
                       {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Company */}
            <div>
              <h4 className="text-emerald-400 font-bold uppercase tracking-widest text-xs mb-8">Company</h4>
              <ul className="space-y-4">
                {['Our Story', 'Sustainability', 'Careers', 'Contact Us', 'Privacy Policy'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group">
                       <span className="w-0 h-[1px] bg-emerald-500 group-hover:w-3 transition-all duration-300"></span>
                       {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Connect */}
            <div>
              <h4 className="text-emerald-400 font-bold uppercase tracking-widest text-xs mb-8">Connect</h4>
              <div className="space-y-6">
                 <div className="flex gap-4">
                    {[
                      { icon: 'fa-instagram', link: '#' },
                      { icon: 'fa-twitter', link: '#' },
                      { icon: 'fa-facebook-f', link: '#' },
                      { icon: 'fa-youtube', link: '#' }
                    ].map((social, idx) => (
                      <a 
                        key={idx} 
                        href={social.link} 
                        className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-emerald-500 hover:text-[#0a1a13] hover:border-emerald-500 transition-all duration-300"
                      >
                        <i className={`fa-brands ${social.icon}`}></i>
                      </a>
                    ))}
                 </div>
                 
                 <div className="space-y-2 pt-4">
                    <p className="text-gray-400 text-sm flex items-center gap-3">
                      <i className="fa-solid fa-envelope text-emerald-500"></i>
                      hello@urbannook.in
                    </p>
                    <p className="text-gray-400 text-sm flex items-center gap-3">
                      <i className="fa-solid fa-phone text-emerald-500"></i>
                      +91 63864 55982
                    </p>
                    <p className="text-gray-400 text-sm flex items-center gap-3">
                      <i className="fa-solid fa-location-dot text-emerald-500"></i>
                      Mumbai, India
                    </p>
                 </div>
              </div>
            </div>
        </div>
      </div>

      {/* Bottom Footer Bar - (No changes here) */}
      <div className="border-t border-white/10 pt-8 px-6 md:px-12 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col-reverse md:flex-row justify-between items-center gap-6">
          <div className="text-gray-500 text-sm font-light">
            © 2024 UrbanNook Inc. Designed with <span className="text-red-500">♥</span> in India.
          </div>
          
          <div className="flex gap-4">
             {/* Simple visual representation of payment cards */}
             <div className="h-8 px-3 bg-white rounded flex items-center justify-center">
                <i className="fa-brands fa-cc-visa text-xl text-blue-900"></i>
             </div>
             <div className="h-8 px-3 bg-white rounded flex items-center justify-center">
                <i className="fa-brands fa-cc-mastercard text-xl text-red-600"></i>
             </div>
             <div className="h-8 px-3 bg-white rounded flex items-center justify-center">
                <i className="fa-brands fa-google-pay text-xl text-gray-700"></i>
             </div>
             <div className="h-8 px-3 bg-white rounded flex items-center justify-center">
                <i className="fa-brands fa-apple-pay text-xl text-black"></i>
             </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;