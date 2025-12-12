import React, { useState } from 'react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';

const NewHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);


  const hadleClickLogin = () =>{
    setShowLogin(true);
  }

  return (
    <header className="bg-bgPrimary border-b border-borderPrimary shadow-sm">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <a href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-lg">
                UN
              </div>
              <h1 className="text-2xl font-bold text-textPrimary">
                UrbanNook
              </h1>
            </a>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            <a href="/" className="text-textSecondary hover:text-primary font-medium transition-colors">
              Home
            </a>
            <a href="/customize-products" className="text-textSecondary hover:text-primary font-medium transition-colors">
              Customization
            </a>
            <a href="/about-us" className="text-textSecondary hover:text-primary font-medium transition-colors">
              About Us
            </a>
            <a href="/contact-us" className="text-textSecondary hover:text-primary font-medium transition-colors">
             Contact Us
            </a>
            {/* <a href="/key-holders" className="text-textSecondary hover:text-primary font-medium transition-colors">
              Key Holders
            </a> */}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-6">
            {/* Search */}
            <div className="hidden md:flex relative">
              <input 
                type="text" 
                placeholder="Search products..." 
                className="w-80 pl-4 pr-12 py-2 bg-bgSecondary border border-borderPrimary rounded-full text-sm text-textPrimary placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-textMuted hover:text-primary">
                <i className="fa-solid fa-search"></i>
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Mobile menu button */}
              <button 
                className="lg:hidden p-2 rounded-full text-textSecondary hover:bg-bgSecondary"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <i className="fa-solid fa-bars"></i>
              </button>
              
              {/* Cart */}
              <button className="p-2 rounded-full text-textSecondary hover:bg-bgSecondary hover:text-primary transition-all relative">
                <i className="fa-solid fa-shopping-cart"></i>
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">2</span>
              </button>
              
              {/* User */}
              <button onClick={hadleClickLogin} className="p-2 rounded-full text-textSecondary hover:bg-bgSecondary hover:text-primary transition-all">
                <i className="fa-solid fa-user"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-borderPrimary">
            {/* Mobile Search */}
            <div className="mb-4">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Search products..." 
                  className="w-full pl-4 pr-10 py-2 bg-bgSecondary border border-borderPrimary rounded-full text-sm text-textPrimary placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <i className="fa-solid fa-search absolute right-3 top-1/2 transform -translate-y-1/2 text-textMuted"></i>
              </div>
            </div>
            
            {/* Mobile Navigation */}
            <nav className="space-y-1">
              <a href="/keychains" className="block py-3 px-2 text-textSecondary hover:text-primary hover:bg-bgSecondary rounded-lg font-medium transition-all">
                Keychains
              </a>
              <a href="/posters" className="block py-3 px-2 text-textSecondary hover:text-primary hover:bg-bgSecondary rounded-lg font-medium transition-all">
                Posters
              </a>
              <a href="/pen-stands" className="block py-3 px-2 text-textSecondary hover:text-primary hover:bg-bgSecondary rounded-lg font-medium transition-all">
                Pen Stands
              </a>
              <a href="/car-accessories" className="block py-3 px-2 text-textSecondary hover:text-primary hover:bg-bgSecondary rounded-lg font-medium transition-all">
                Car Accessories
              </a>
              <a href="/key-holders" className="block py-3 px-2 text-textSecondary hover:text-primary hover:bg-bgSecondary rounded-lg font-medium transition-all">
                Key Holders
              </a>
            </nav>
          </div>
        )}
      </div>
         {showLogin && (
          <LoginForm 
            onClose={() => setShowLogin(false)}
            onSwitchToSignup={() => {
              setShowLogin(false);
              setShowSignup(true);
            }}
          />
        )}
        {
          showSignup && (
            <SignupForm 
              onClose={() => setShowSignup(false)}
              onSwitchToLogin={() => {
              setShowSignup(false);
              setShowLogin(true);
            }}
            />
            )}
    </header>
  );
};

export default NewHeader;