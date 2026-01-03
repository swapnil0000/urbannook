import React, { useState, useEffect } from 'react';

const MobileBottomNav = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [cartCount, setCartCount] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const navItems = [
    { id: 'home', icon: 'fa-solid fa-home', label: 'Home', href: '/' },
    { id: 'categories', icon: 'fa-solid fa-th-large', label: 'Categories', href: '/categories' },
    { id: 'search', icon: 'fa-solid fa-search', label: 'Search', href: '/search' },
    { id: 'cart', icon: 'fa-solid fa-shopping-cart', label: 'Cart', href: '/cart', badge: true },
    { id: 'profile', icon: 'fa-solid fa-user', label: 'Profile', href: '/profile' }
  ];

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCartCount(savedCart.reduce((total, item) => total + item.quantity, 0));
    
    const handleStorageChange = () => {
      const updatedCart = JSON.parse(localStorage.getItem('cart') || '[]');
      setCartCount(updatedCart.reduce((total, item) => total + item.quantity, 0));
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    const controlNavbar = () => {
      if (typeof window !== 'undefined') {
        if (window.scrollY > lastScrollY && window.scrollY > 100) {
          setIsVisible(false);
        } else {
          setIsVisible(true);
        }
        setLastScrollY(window.scrollY);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', controlNavbar);
      return () => window.removeEventListener('scroll', controlNavbar);
    }
  }, [lastScrollY]);

  return (
    <div className={`md:hidden fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ${
      isVisible ? 'translate-y-0' : 'translate-y-full'
    }`}>
      {/* Background with blur */}
      <div className="bg-white/95 backdrop-blur-lg border-t border-borderPrimary shadow-2xl">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 relative ${
                activeTab === item.id
                  ? 'text-primary bg-primary/10 scale-110'
                  : 'text-textMuted hover:text-primary'
              }`}
            >
              <div className="relative">
                <i className={`${item.icon} text-xl mb-1`}></i>
                {item.badge && cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
              
              {/* Active indicator */}
              {activeTab === item.id && (
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MobileBottomNav;