import React, { useState, useEffect } from 'react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';

const NewHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(savedCart);
    
    const handleStorageChange = () => {
      const updatedCart = JSON.parse(localStorage.getItem('cart') || '[]');
      setCart(updatedCart);
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);


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
            <a href="/products" className="text-textSecondary hover:text-primary font-medium transition-colors">
              Products
            </a>
            {/* <a href="/customize-products" className="text-textSecondary hover:text-primary font-medium transition-colors">
              Customization
            </a> */}
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
              <button 
                onClick={() => setShowCart(true)}
                className="p-2 rounded-full text-textSecondary hover:bg-bgSecondary hover:text-primary transition-all relative"
              >
                <i className="fa-solid fa-shopping-cart"></i>
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                    {cart.reduce((total, item) => total + item.quantity, 0)}
                  </span>
                )}
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
              <a href="/" className="block py-3 px-2 text-textSecondary hover:text-primary hover:bg-bgSecondary rounded-lg font-medium transition-all">
                Home
              </a>
              <a href="/products" className="block py-3 px-2 text-textSecondary hover:text-primary hover:bg-bgSecondary rounded-lg font-medium transition-all">
                Products
              </a>
              {/* <a href="/customize-products" className="block py-3 px-2 text-textSecondary hover:text-primary hover:bg-bgSecondary rounded-lg font-medium transition-all">
                Customization
              </a> */}
              <a href="/about-us" className="block py-3 px-2 text-textSecondary hover:text-primary hover:bg-bgSecondary rounded-lg font-medium transition-all">
                About Us
              </a>
              <a href="/contact-us" className="block py-3 px-2 text-textSecondary hover:text-primary hover:bg-bgSecondary rounded-lg font-medium transition-all">
                Contact Us
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

      {/* Cart Sidebar */}
      {showCart && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
            onClick={() => setShowCart(false)}
          ></div>
          
          {/* Cart Panel */}
          <div className="fixed right-0 top-0 h-full w-96 bg-bgPrimary shadow-2xl z-50 transform transition-transform duration-300 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-borderPrimary">
              <h3 className="text-xl font-bold text-textPrimary">Shopping Cart</h3>
              <button 
                onClick={() => setShowCart(false)}
                className="w-8 h-8 rounded-full bg-bgSecondary hover:bg-borderPrimary transition-colors flex items-center justify-center"
              >
                <i className="fa-solid fa-times text-textSecondary"></i>
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <i className="fa-solid fa-shopping-cart text-4xl text-textMuted mb-4"></i>
                  <p className="text-textSecondary">Your cart is empty</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.cartId} className="flex gap-4 p-4 bg-bgSecondary rounded-lg">
                      <img 
                        src={item.image} 
                        alt={item.title} 
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-textPrimary text-sm mb-1">{item.title}</h4>
                        <p className="text-primary font-bold">₹{item.price?.toLocaleString()}</p>
                        <p className="text-textSecondary text-xs">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="p-6 border-t border-borderPrimary">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold text-textPrimary">Total:</span>
                  <span className="text-2xl font-bold text-primary">
                    ₹{cart.reduce((total, item) => total + (item.price * item.quantity), 0).toLocaleString()}
                  </span>
                </div>
                <button 
                  onClick={() => {
                    setShowCart(false);
                    window.location.href = '/products';
                  }}
                  className="w-full bg-primary hover:bg-accent text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  View Cart
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </header>
  );
};

export default NewHeader;