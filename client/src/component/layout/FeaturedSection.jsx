import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollAnimation, useStaggeredAnimation } from '../../hooks/useScrollAnimation';

const FeaturedSection = () => {
  const [activeTab, setActiveTab] = useState('trending');
  const [isMobile, setIsMobile] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const navigate = useNavigate();
  const [headerRef, headerVisible] = useScrollAnimation();
  const [tabsRef, tabsVisible] = useScrollAnimation();
  const [productsRef, visibleProducts] = useStaggeredAnimation(3, 200);

  const animatedTexts = [
    "Featured Products",
    "Trending Items", 
    "Popular Choices",
    "Best Sellers",
    "Customer Favorites"
  ];

  useEffect(() => {
    const textTimer = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % animatedTexts.length);
    }, 3000);
    return () => clearInterval(textTimer);
  }, []);

  const tabs = [
    { id: 'trending', label: 'Trending', icon: 'fa-solid fa-fire' },
    { id: 'new', label: 'New Arrivals', icon: 'fa-solid fa-sparkles' },
    { id: 'bestseller', label: 'Best Sellers', icon: 'fa-solid fa-crown' }
  ];

  const products = {
    trending: [
      {
        id: 1,
        title: 'Aesthetic Keychain Set',
        price: 299,
        originalPrice: 399,
        image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop',
        rating: 4.9,
        reviews: 234,
        badge: 'Hot',
        colors: ['#FF6B35', '#FF8C42', '#FFB366']
      },
      {
        id: 2,
        title: 'Minimalist Desk Organizer',
        price: 599,
        originalPrice: 799,
        image: 'https://images.unsplash.com/photo-1586717799252-bd134ad00e26?w=400&h=400&fit=crop',
        rating: 4.8,
        reviews: 189,
        badge: 'Sale',
        colors: ['#FF6B35', '#FF8C42', '#FFB366']
      },
      {
        id: 3,
        title: 'Abstract Wall Poster',
        price: 449,
        image: 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=400&h=400&fit=crop',
        rating: 4.7,
        reviews: 156,
        colors: ['#FF6B35', '#FF8C42', '#FFB366']
      }
    ],
    new: [
      {
        id: 4,
        title: 'Smart Cable Organizer',
        price: 199,
        image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
        rating: 4.6,
        reviews: 89,
        badge: 'New',
        colors: ['#FF6B35', '#FF8C42', '#FFB366']
      },
      {
        id: 5,
        title: 'Wooden Phone Stand',
        price: 349,
        image: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=400&h=400&fit=crop',
        rating: 4.8,
        reviews: 67,
        colors: ['#FF6B35', '#FF8C42', '#FFB366']
      }
    ],
    bestseller: [
      {
        id: 6,
        title: 'Premium Keychain Collection',
        price: 799,
        originalPrice: 999,
        image: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=400&h=400&fit=crop',
        rating: 4.9,
        reviews: 445,
        badge: 'Bestseller',
        colors: ['#FF6B35', '#FF8C42', '#FFB366']
      }
    ]
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const addToCart = (product) => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1, cartId: Date.now() });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('storage'));
    
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-primary text-white px-4 py-2 rounded-lg shadow-lg z-50';
    toast.textContent = 'Added to cart!';
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 2000);
  };

  const ProductCard = ({ product }) => {
    const [isLiked, setIsLiked] = useState(false);
    const [selectedColor, setSelectedColor] = useState(0);

    return (
      <div className="group relative bg-white overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2"
           style={{
             borderRadius: '30px 10px 30px 10px'
           }}>
        <div className="relative overflow-hidden">
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-700"
            style={{
              borderRadius: '30px 10px 0 0'
            }}
          />
          
          {/* Creative gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          {product.badge && (
            <div className={`absolute top-4 left-4 px-3 py-1 text-xs font-bold text-white transform -rotate-12 ${
              product.badge === 'Hot' ? 'bg-red-500' :
              product.badge === 'Sale' ? 'bg-primary' :
              product.badge === 'New' ? 'bg-accent' : 'bg-warning'
            }`}
                 style={{
                   borderRadius: '15px 3px 15px 3px'
                 }}>
              {product.badge}
            </div>
          )}
          
          <button
            onClick={() => setIsLiked(!isLiked)}
            className={`absolute top-4 right-4 w-10 h-10 flex items-center justify-center transition-all transform hover:scale-110 ${
              isLiked ? 'bg-red-500 text-white' : 'bg-white/90 text-textSecondary hover:bg-red-500 hover:text-white'
            }`}
            style={{
              borderRadius: '50% 20% 50% 20%'
            }}
          >
            <i className={`fa-${isLiked ? 'solid' : 'regular'} fa-heart`}></i>
          </button>
          
          {isMobile && (
            <div className="absolute bottom-4 left-4 right-4">
              <button 
                onClick={() => addToCart(product)}
                className="w-full bg-primary text-white py-3 font-semibold active:scale-95 transition-all"
                style={{
                  borderRadius: '20px 5px 20px 5px'
                }}
              >
                Quick Add
              </button>
            </div>
          )}
          
          {!isMobile && (
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
              <button 
                onClick={() => navigate(`/product/${product.id}`)}
                className="w-12 h-12 bg-white flex items-center justify-center text-textPrimary hover:bg-primary hover:text-white transition-all transform hover:scale-110"
                style={{
                  borderRadius: '50% 20% 50% 20%'
                }}
              >
                <i className="fa-solid fa-eye"></i>
              </button>
              <button 
                onClick={() => addToCart(product)}
                className="w-12 h-12 bg-white flex items-center justify-center text-textPrimary hover:bg-primary hover:text-white transition-all transform hover:scale-110"
                style={{
                  borderRadius: '50% 20% 50% 20%'
                }}
              >
                <i className="fa-solid fa-shopping-cart"></i>
              </button>
            </div>
          )}
        </div>

        <div className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <i
                  key={i}
                  className={`fa-solid fa-star text-xs ${
                    i < Math.floor(product.rating) ? 'text-warning' : 'text-borderSecondary'
                  }`}
                />
              ))}
            </div>
            <span className="text-textMuted text-sm">({product.reviews})</span>
          </div>

          <h3 className="text-textPrimary font-semibold mb-3 line-clamp-2">
            {product.title}
          </h3>

          {product.colors && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-textMuted text-sm">Colors:</span>
              <div className="flex gap-2">
                {product.colors.map((color, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedColor(index)}
                    className={`w-6 h-6 border-2 transition-all transform hover:scale-110 ${
                      selectedColor === index ? 'border-textPrimary scale-110' : 'border-borderSecondary'
                    }`}
                    style={{ 
                      backgroundColor: color,
                      borderRadius: '50% 20% 50% 20%'
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-primary font-bold text-xl">₹{product.price}</span>
              {product.originalPrice && (
                <span className="text-textMuted line-through text-sm">₹{product.originalPrice}</span>
              )}
            </div>
            {!isMobile && (
              <button 
                onClick={() => addToCart(product)}
                className="bg-primary text-white px-4 py-2 font-semibold hover:bg-accent transition-all transform hover:scale-105"
                style={{
                  borderRadius: '15px 5px 15px 5px'
                }}
              >
                Add to Cart
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="py-20 px-4 md:px-8 relative overflow-hidden">
      {/* Creative background with diagonal sections */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-blue-50"></div>
        
        {/* Diagonal overlay sections */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="none">
          <defs>
            <linearGradient id="featuredGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0.05)" />
              <stop offset="100%" stopColor="rgba(16, 185, 129, 0.08)" />
            </linearGradient>
            <linearGradient id="featuredGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(16, 185, 129, 0.03)" />
              <stop offset="100%" stopColor="rgba(6, 182, 212, 0.06)" />
            </linearGradient>
          </defs>
          <path d="M0,100 L1200,0 L1200,300 L0,400 Z" fill="url(#featuredGrad1)" />
          <path d="M0,500 L1200,400 L1200,800 L0,800 Z" fill="url(#featuredGrad2)" />
        </svg>
      </div>
      
      {/* Floating geometric elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-24 h-24 bg-primary/5 transform rotate-45 animate-float"></div>
        <div className="absolute top-40 right-32 w-32 h-32 bg-accent/5 rounded-full animate-float-reverse"></div>
        <div className="absolute bottom-32 left-40 w-20 h-20 bg-primary/5 transform rotate-12 animate-float"></div>
        <div className="absolute top-60 right-20 w-16 h-16 bg-accent/5 rounded-full animate-pulse"></div>
      </div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header with creative design */}
        <div ref={headerRef} className={`text-center mb-16 relative transition-all duration-1000 ${
          headerVisible ? 'opacity-100 animate-slideInUp' : 'opacity-0'
        }`}>
          {/* Background decoration */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 bg-gradient-to-r from-primary/5 to-accent/5 rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-bold text-textPrimary mb-4 min-h-[3rem] flex items-center justify-center">
              <span 
                key={currentTextIndex}
                className="animate-slideUp bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
              >
                {animatedTexts[currentTextIndex]}
              </span>
            </h2>
            
            {/* Creative underline */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-8 h-1 bg-primary rounded-full animate-pulse"></div>
              <div className="w-16 h-1 bg-gradient-to-r from-primary to-accent rounded-full"></div>
              <div className="w-8 h-1 bg-accent rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
            </div>
            
            <p className="text-lg text-textSecondary max-w-2xl mx-auto animate-fadeInUp">
              Discover our handpicked selection of trending items
            </p>
          </div>
        </div>

        {/* Creative tab design */}
        <div ref={tabsRef} className={`flex justify-center mb-16 transition-all duration-1000 delay-200 ${
          tabsVisible ? 'opacity-100 animate-slideInUp' : 'opacity-0'
        }`}>
          <div className="relative">
            {/* Tab background with custom shape */}
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm shadow-xl" 
                 style={{
                   borderRadius: '30px 10px 30px 10px',
                   transform: 'rotate(-1deg)'
                 }}></div>
            
            <div className="relative p-3">
              <div className="flex gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 md:px-6 py-3 font-semibold transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg transform scale-105'
                        : 'text-textSecondary hover:text-primary hover:bg-gray-50'
                    }`}
                    style={{
                      borderRadius: activeTab === tab.id ? '20px 5px 20px 5px' : '15px'
                    }}
                  >
                    <i className={tab.icon}></i>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Products grid with creative layout */}
        <div ref={productsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {products[activeTab].map((product, index) => (
            <div key={product.id} 
                 className={`transform transition-all duration-700 ${
                   visibleProducts.has(index) ? 'opacity-100 animate-slideInUp' : 'opacity-0 translate-y-8'
                 }`}
                 style={{
                   transitionDelay: `${index * 200}ms`
                 }}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {/* CTA with creative design */}
        <div className="text-center mt-16 relative">
          {/* Background decoration */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 bg-gradient-to-r from-primary/10 to-accent/10 rounded-full blur-2xl"></div>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => navigate('/products')}
              className="bg-gradient-to-r from-primary to-accent text-white px-8 py-4 font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all inline-flex items-center gap-3 relative overflow-hidden"
              style={{
                borderRadius: '25px 8px 25px 8px'
              }}
            >
              {/* Button background animation */}
              <div className="absolute inset-0 bg-gradient-to-r from-accent to-primary opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
              <span className="relative z-10">View All Products</span>
              <i className="fa-solid fa-arrow-right relative z-10"></i>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedSection;