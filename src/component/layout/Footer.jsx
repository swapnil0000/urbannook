import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-textPrimary text-white">
      {/* Main Footer */}
      <div className="py-16 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Company Info */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xl">
                  UN
                </div>
                <h3 className="text-2xl font-bold">UrbanNook</h3>
              </div>
              <p className="text-gray-300 mb-6 leading-relaxed">
                Curating your space with aesthetic essentials. From minimalist keychains to stylish desk accessories, we bring beauty to your everyday life.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-primary rounded-full flex items-center justify-center hover:bg-accent transition-colors">
                  <i className="fa-brands fa-instagram"></i>
                </a>
                <a href="#" className="w-10 h-10 bg-primary rounded-full flex items-center justify-center hover:bg-accent transition-colors">
                  <i className="fa-brands fa-facebook"></i>
                </a>
                <a href="#" className="w-10 h-10 bg-primary rounded-full flex items-center justify-center hover:bg-accent transition-colors">
                  <i className="fa-brands fa-twitter"></i>
                </a>
                <a href="#" className="w-10 h-10 bg-primary rounded-full flex items-center justify-center hover:bg-accent transition-colors">
                  <i className="fa-brands fa-youtube"></i>
                </a>
              </div>
            </div>

            {/* Products */}
            <div>
              <h4 className="text-lg font-semibold mb-6">Products</h4>
              <ul className="space-y-3">
                <li><a href="/keychains" className="text-gray-300 hover:text-primary transition-colors">Aesthetic Keychains</a></li>
                <li><a href="/posters" className="text-gray-300 hover:text-primary transition-colors">Minimalist Posters</a></li>
                <li><a href="/pen-stands" className="text-gray-300 hover:text-primary transition-colors">Desk Organizers</a></li>
                <li><a href="/car-accessories" className="text-gray-300 hover:text-primary transition-colors">Car Accessories</a></li>
                <li><a href="/key-holders" className="text-gray-300 hover:text-primary transition-colors">Wall Key Holders</a></li>
                <li><a href="/stationery" className="text-gray-300 hover:text-primary transition-colors">Aesthetic Stationery</a></li>
                <li><a href="/home-decor" className="text-gray-300 hover:text-primary transition-colors">Home Decor</a></li>
              </ul>
            </div>

            {/* Customer Care */}
            <div>
              <h4 className="text-lg font-semibold mb-6">Customer Care</h4>
              <ul className="space-y-3">
                <li><a href="/contact" className="text-gray-300 hover:text-primary transition-colors">Contact Us</a></li>
                <li><a href="/shipping" className="text-gray-300 hover:text-primary transition-colors">Shipping Info</a></li>
                <li><a href="/returns" className="text-gray-300 hover:text-primary transition-colors">Returns & Exchanges</a></li>
                <li><a href="/size-guide" className="text-gray-300 hover:text-primary transition-colors">Size Guide</a></li>
                <li><a href="/faq" className="text-gray-300 hover:text-primary transition-colors">FAQ</a></li>
                <li><a href="/track-order" className="text-gray-300 hover:text-primary transition-colors">Track Your Order</a></li>
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h4 className="text-lg font-semibold mb-6">Stay Updated</h4>
              <p className="text-gray-300 mb-4">Subscribe to get special offers and updates</p>
              <div className="flex flex-col gap-3">
                <input 
                  type="email" 
                  placeholder="Enter your email"
                  className="px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button className="bg-primary hover:bg-accent text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                  Subscribe
                </button>
              </div>
              
              {/* Contact Info */}
              <div className="mt-6 space-y-2">
                <div className="flex items-center gap-3 text-gray-300">
                  <i className="fa-solid fa-phone text-primary"></i>
                  <span>+91 98765 43210</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <i className="fa-solid fa-envelope text-primary"></i>
                  <span>hello@urbannook.com</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <i className="fa-solid fa-location-dot text-primary"></i>
                  <span>Mumbai, India</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-gray-700 py-6 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-gray-400 text-sm">
              © 2024 UrbanNook. All rights reserved.
            </div>
            <div className="flex gap-6 text-sm">
              <a href="/privacy" className="text-gray-400 hover:text-primary transition-colors">Privacy Policy</a>
              <a href="/terms" className="text-gray-400 hover:text-primary transition-colors">Terms of Service</a>
              <a href="/cookies" className="text-gray-400 hover:text-primary transition-colors">Cookie Policy</a>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-400 text-sm">We Accept:</span>
              <div className="flex gap-2">
                <div className="w-8 h-5 bg-gray-600 rounded flex items-center justify-center text-xs text-white">VISA</div>
                <div className="w-8 h-5 bg-gray-600 rounded flex items-center justify-center text-xs text-white">MC</div>
                <div className="w-8 h-5 bg-gray-600 rounded flex items-center justify-center text-xs text-white">UPI</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;