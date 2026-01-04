import React, { useState } from 'react';

const Wishlist = () => {
  const [wishlistItems, setWishlistItems] = useState([
    {
      id: 1,
      name: 'Modern Sectional Sofa',
      price: 45999,
      originalPrice: 52999,
      image: '/api/placeholder/300/200',
      inStock: true,
      rating: 4.5
    },
    {
      id: 2,
      name: 'Wooden Dining Table',
      price: 18999,
      originalPrice: 22999,
      image: '/api/placeholder/300/200',
      inStock: false,
      rating: 4.2
    },
    {
      id: 3,
      name: 'Luxury Bed Frame',
      price: 32999,
      originalPrice: 38999,
      image: '/api/placeholder/300/200',
      inStock: true,
      rating: 4.8
    }
  ]);

  const removeFromWishlist = (id) => {
    setWishlistItems(items => items.filter(item => item.id !== id));
  };

  const addToCart = (item) => {
    console.log('Adding to cart:', item);
    // Add to cart logic
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <i className="fa-solid fa-heart text-2xl"></i>
            </div>
            <div>
              <h1 className="text-2xl font-bold">My Wishlist</h1>
              <p className="text-pink-100">{wishlistItems.length} items saved for later</p>
            </div>
          </div>
        </div>

        {/* Wishlist Content */}
        <div className="p-6">
          {wishlistItems.length === 0 ? (
            <div className="text-center py-12">
              <i className="fa-solid fa-heart text-6xl text-gray-300 mb-4"></i>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Your Wishlist is Empty</h3>
              <p className="text-gray-500 mb-6">Save items you love to buy them later</p>
              <button className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishlistItems.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Product Image */}
                  <div className="relative">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-48 object-cover"
                    />
                    <button
                      onClick={() => removeFromWishlist(item.id)}
                      className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-red-500 hover:bg-white transition-colors"
                    >
                      <i className="fa-solid fa-heart text-sm"></i>
                    </button>
                    {!item.inStock && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                          Out of Stock
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{item.name}</h3>
                    
                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <i key={i} className={`fa-solid fa-star text-xs ${i < Math.floor(item.rating) ? '' : 'text-gray-300'}`}></i>
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">({item.rating})</span>
                    </div>

                    {/* Price */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-lg font-bold text-emerald-600">₹{item.price.toLocaleString()}</span>
                      <span className="text-sm text-gray-500 line-through">₹{item.originalPrice.toLocaleString()}</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        {Math.round((1 - item.price / item.originalPrice) * 100)}% OFF
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => addToCart(item)}
                        disabled={!item.inStock}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                          item.inStock 
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {item.inStock ? 'Add to Cart' : 'Out of Stock'}
                      </button>
                      <button
                        onClick={() => removeFromWishlist(item.id)}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <i className="fa-solid fa-trash text-red-500"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Wishlist;