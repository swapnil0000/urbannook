import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetFeaturedProductsQuery } from '../store/api/productsApi';

const FeaturedProducts = () => {
  const [likedProducts, setLikedProducts] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [activeTab, setActiveTab] = useState('trending');
  const [showCart, setShowCart] = useState(false);
  const [cart, setCart] = useState(JSON.parse(localStorage.getItem('cart') || '[]'));
  const navigate = useNavigate();

  // Fetch featured products from API
  const { 
    data: featuredProducts = [], 
    isLoading, 
    error 
  } = useGetFeaturedProductsQuery({ limit: 9 });

  // Fallback products for when API is loading or fails
  const fallbackProducts = [
    {
      id: 1,
      title: 'Minimalist Metal Keychain',
      price: 199,
      originalPrice: 299,
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop',
      rating: 4.8,
      badge: 'TRENDING',
      shares: 1250
    },
    {
      id: 8,
      title: 'Desk Organizer Set',
      price: 799,
      originalPrice: 999,
      image: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=300&h=300&fit=crop',
      rating: 4.9,
      badge: 'TRENDING',
      shares: 980
    },
    {
      id: 3,
      title: 'Acrylic Design Keychain',
      price: 179,
      image: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=300&h=300&fit=crop',
      rating: 4.9,
      badge: 'TRENDING',
      shares: 850
    }
  ];

  // Use API data or fallback
  const products = featuredProducts.length > 0 ? featuredProducts : fallbackProducts;

  // Split products into different categories for tabs
  const trendingProducts = products.slice(0, 3).map(p => ({ ...p, badge: 'TRENDING' }));
  const mostSharedProducts = products.slice(3, 6).map(p => ({ ...p, badge: 'VIRAL' }));
  const famousProducts = products.slice(6, 9).map(p => ({ ...p, badge: 'BESTSELLER' }));

  const addToCart = (product) => {
    const cartItem = {
      ...product,
      quantity: 1,
      cartId: `featured-${product.id}`
    };
    
    const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItem = existingCart.find(item => item.cartId === cartItem.cartId);
    
    let updatedCart;
    if (existingItem) {
      updatedCart = existingCart.map(item => 
        item.cartId === cartItem.cartId 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      updatedCart = [...existingCart, cartItem];
    }
    
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    setCart(updatedCart);
    setShowCart(true);
  };

  const removeFromCart = (cartId) => {
    const updatedCart = cart.filter(item => item.cartId !== cartId);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    setCart(updatedCart);
  };

  const updateQuantity = (cartId, newQuantity) => {
    if (newQuantity === 0) {
      removeFromCart(cartId);
      return;
    }
    
    const updatedCart = cart.map(item => 
      item.cartId === cartId ? { ...item, quantity: newQuantity } : item
    );
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    setCart(updatedCart);
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const allProducts = [...trendingProducts, ...mostSharedProducts, ...famousProducts];

  useEffect(() => {
    const saved = localStorage.getItem('likedProducts');
    if (saved) setLikedProducts(JSON.parse(saved));

    const viewed = localStorage.getItem('recentlyViewed');
    if (viewed) setRecentlyViewed(JSON.parse(viewed));
  }, []);

  const toggleLike = (productId) => {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    let updatedLiked;
    if (likedProducts.some(p => p.id === productId)) {
      updatedLiked = likedProducts.filter(p => p.id !== productId);
    } else {
      updatedLiked = [...likedProducts, product];
    }
    
    setLikedProducts(updatedLiked);
    localStorage.setItem('likedProducts', JSON.stringify(updatedLiked));
  };

  const addToRecentlyViewed = (productId) => {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const updated = [product, ...recentlyViewed.filter(p => p.id !== productId)].slice(0, 6);
    setRecentlyViewed(updated);
    localStorage.setItem('recentlyViewed', JSON.stringify(updated));
    navigate(`/product/${productId}`);
  };

  const ProductCard = ({ product, showLikeButton = true }) => (
    <div className="bg-bgSecondary rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group">
      <div className="relative overflow-hidden">
        <img
          src={product.image || product.images?.[0] || 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop'}
          alt={product.title}
          className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop';
          }}
        />
        
        {product.badge && (
          <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold text-white ${
            product.badge === 'SALE' ? 'bg-primary' : 
            product.badge === 'BESTSELLER' ? 'bg-warning' : 
            product.badge === 'TRENDING' ? 'bg-orange-500' :
            product.badge === 'VIRAL' ? 'bg-blue-500' :
            product.badge === 'FAMOUS' ? 'bg-yellow-500' :
            product.badge === 'POPULAR' ? 'bg-purple-500' : 'bg-info'
          }`}>
            {product.badge}
          </div>
        )}
        
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
          {showLikeButton && (
            <button 
              onClick={() => toggleLike(product.id)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                likedProducts.some(p => p.id === product.id)
                  ? 'bg-primary text-white'
                  : 'bg-white text-textPrimary hover:bg-primary hover:text-white'
              }`}
            >
              <i className="fa-solid fa-heart"></i>
            </button>
          )}
          <button 
            onClick={() => addToRecentlyViewed(product.id)}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-textPrimary hover:bg-primary hover:text-white transition-all"
          >
            <i className="fa-solid fa-eye"></i>
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-1 mb-2">
          {[...Array(5)].map((_, i) => (
            <i
              key={i}
              className={`fa-solid fa-star text-sm ${
                i < Math.floor(product.rating || 4.5) ? 'text-warning' : 'text-borderSecondary'
              }`}
            />
          ))}
          <span className="text-textMuted text-sm ml-2">({product.rating || 4.5})</span>
        </div>

        <h3 className="text-textPrimary font-semibold mb-3 line-clamp-2">
          {product.title}
        </h3>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-primary font-bold text-xl">₹{product.price}</span>
          {product.originalPrice && (
            <>
              <span className="text-textMuted line-through text-sm">₹{product.originalPrice}</span>
              <span className="text-accent text-sm font-semibold">
                {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
              </span>
            </>
          )}
        </div>

        <button className="w-full bg-primary hover:bg-accent text-white py-2 rounded-lg font-semibold transition-all duration-300" onClick={() => addToCart(product)}>
          Add to Cart
        </button>
      </div>
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <section className="py-16 px-8 bg-bgPrimary">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-textPrimary mb-4">Featured Products</h2>
            <div className="w-20 h-1 bg-accent mx-auto mb-6"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-bgSecondary rounded-2xl overflow-hidden shadow-lg animate-pulse">
                <div className="w-full h-48 bg-borderSecondary"></div>
                <div className="p-4">
                  <div className="h-4 bg-borderSecondary rounded mb-2"></div>
                  <div className="h-6 bg-borderSecondary rounded mb-3"></div>
                  <div className="h-4 bg-borderSecondary rounded mb-4 w-1/2"></div>
                  <div className="h-10 bg-borderSecondary rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="py-16 px-8 bg-bgPrimary">
        <div className="max-w-7xl mx-auto text-center">
          <div className="bg-bgSecondary rounded-2xl p-8 max-w-md mx-auto">
            <i className="fa-solid fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
            <h3 className="text-xl font-semibold text-textPrimary mb-2">Failed to Load Featured Products</h3>
            <p className="text-textSecondary mb-6">Using fallback products for now.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="py-16 px-8 bg-bgPrimary">
        <div className="max-w-7xl mx-auto">
          {likedProducts.length > 0 && (
            <div className="mb-16">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-textPrimary mb-2">
                    <i className="fa-solid fa-heart text-primary mr-3"></i>
                    Your Favorites
                  </h2>
                  <p className="text-textSecondary">Products you've liked</p>
                </div>
                <button 
                  onClick={() => {
                    setLikedProducts([]);
                    localStorage.removeItem('likedProducts');
                  }}
                  className="text-textSecondary hover:text-primary transition-all"
                >
                  Clear All
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {likedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} showLikeButton={false} />
                ))}
              </div>
            </div>
          )}

          {recentlyViewed.length > 0 && (
            <div className="mb-16">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-textPrimary mb-2">
                    <i className="fa-solid fa-clock text-accent mr-3"></i>
                    Recently Viewed
                  </h2>
                  <p className="text-textSecondary">Products you've recently viewed</p>
                </div>
                <button 
                  onClick={() => {
                    setRecentlyViewed([]);
                    localStorage.removeItem('recentlyViewed');
                  }}
                  className="text-textSecondary hover:text-primary transition-all"
                >
                  Clear All
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                {recentlyViewed.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}

          {/* Featured Products Tabbed Interface */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-textPrimary mb-4">
                Featured Products
              </h2>
              <div className="w-20 h-1 bg-accent mx-auto mb-6"></div>
            </div>

            {/* Tab Navigation */}
            <div className="flex justify-center mb-8">
              <div className="bg-bgSecondary rounded-2xl p-2 inline-flex gap-2">
                <button
                  onClick={() => setActiveTab('trending')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === 'trending'
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg transform scale-105'
                      : 'text-textSecondary hover:text-textPrimary hover:bg-bgPrimary'
                  }`}
                >
                  <i className="fa-solid fa-fire"></i>
                  <span className="hidden sm:inline">Trending</span>
                </button>
                <button
                  onClick={() => setActiveTab('shared')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === 'shared'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg transform scale-105'
                      : 'text-textSecondary hover:text-textPrimary hover:bg-bgPrimary'
                  }`}
                >
                  <i className="fa-solid fa-share"></i>
                  <span className="hidden sm:inline">Most Shared</span>
                </button>
                <button
                  onClick={() => setActiveTab('famous')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === 'famous'
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg transform scale-105'
                      : 'text-textSecondary hover:text-textPrimary hover:bg-bgPrimary'
                  }`}
                >
                  <i className="fa-solid fa-crown"></i>
                  <span className="hidden sm:inline">Hall of Fame</span>
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="relative">
              <div className="overflow-hidden">
                <div 
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${activeTab === 'trending' ? 0 : activeTab === 'shared' ? 100 : 200}%)` }}
                >
                  {/* Trending Tab */}
                  <div className="w-full flex-shrink-0">
                    <div className="text-center mb-6">
                      <p className="text-textSecondary">🔥 Most popular products this week</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {trendingProducts.map((product) => (
                        <ProductCard key={`trending-${product.id}`} product={product} />
                      ))}
                    </div>
                  </div>

                  {/* Most Shared Tab */}
                  <div className="w-full flex-shrink-0">
                    <div className="text-center mb-6">
                      <p className="text-textSecondary">📤 Products everyone is talking about</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {mostSharedProducts.map((product) => (
                        <ProductCard key={`shared-${product.id}`} product={product} />
                      ))}
                    </div>
                  </div>

                  {/* Famous Tab */}
                  <div className="w-full flex-shrink-0">
                    <div className="text-center mb-6">
                      <p className="text-textSecondary">👑 Our all-time bestsellers</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {famousProducts.map((product) => (
                        <ProductCard key={`famous-${product.id}`} product={product} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
                        <p className="text-primary font-bold">₹{item.price.toLocaleString()}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button 
                            onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                            className="w-6 h-6 rounded bg-borderPrimary hover:bg-primary hover:text-white transition-colors flex items-center justify-center text-xs"
                          >
                            <i className="fa-solid fa-minus"></i>
                          </button>
                          <span className="text-sm font-semibold text-textPrimary w-8 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                            className="w-6 h-6 rounded bg-borderPrimary hover:bg-primary hover:text-white transition-colors flex items-center justify-center text-xs"
                          >
                            <i className="fa-solid fa-plus"></i>
                          </button>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.cartId)}
                        className="text-error hover:bg-error hover:text-white w-8 h-8 rounded transition-colors flex items-center justify-center"
                      >
                        <i className="fa-solid fa-trash text-xs"></i>
                      </button>
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
                  <span className="text-2xl font-bold text-primary">₹{getTotalPrice().toLocaleString()}</span>
                </div>
                <button 
                  onClick={() => {
                    setShowCart(false);
                    navigate('/checkout');
                  }}
                  className="w-full bg-primary hover:bg-accent text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default FeaturedProducts;