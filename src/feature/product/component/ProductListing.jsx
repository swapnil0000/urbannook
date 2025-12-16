import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const productCategories = [
  {
    id: 'keychains',
    name: 'Keychains',
    icon: 'fa-solid fa-key',
    products: [
      {
        id: 1,
        title: 'Minimalist Metal Keychain',
        price: 199,
        originalPrice: 299,
        image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop',
        badge: 'BESTSELLER',
        rating: 4.8,
        description: 'Sleek and durable metal keychain with minimalist design. Perfect for everyday use and makes a great gift.'
      },
      {
        id: 2,
        title: 'Wooden Aesthetic Keychain',
        price: 249,
        image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop',
        rating: 4.7,
        description: 'Handcrafted wooden keychain with natural finish. Eco-friendly and stylish accessory for your keys.'
      },
      {
        id: 3,
        title: 'Acrylic Design Keychain',
        price: 179,
        image: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=300&h=300&fit=crop',
        badge: 'NEW',
        rating: 4.9,
        description: 'Modern acrylic keychain with unique design patterns. Lightweight and colorful addition to your keyring.'
      }
    ]
  },
  {
    id: 'posters',
    name: 'Posters',
    icon: 'fa-solid fa-image',
    products: [
      {
        id: 4,
        title: 'Abstract Art Poster Set',
        price: 599,
        originalPrice: 799,
        image: 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=300&h=300&fit=crop',
        badge: 'SALE',
        rating: 4.6,
        description: 'Set of 3 abstract art posters with premium quality prints. Perfect for modern home and office decor.'
      },
      {
        id: 5,
        title: 'Minimalist Typography',
        price: 399,
        image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop',
        rating: 4.8,
        description: 'Clean typography poster with inspirational quotes. Minimalist design that complements any interior.'
      },
      {
        id: 6,
        title: 'Nature Photography Print',
        price: 449,
        image: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=300&h=300&fit=crop',
        rating: 4.7,
        description: 'High-quality nature photography print on premium paper. Brings the beauty of outdoors to your space.'
      }
    ]
  },
  {
    id: 'desk-accessories',
    name: 'Desk Accessories',
    icon: 'fa-solid fa-desktop',
    products: [
      {
        id: 7,
        title: 'Bamboo Pen Stand',
        price: 349,
        image: 'https://images.unsplash.com/photo-1586717799252-bd134ad00e26?w=300&h=300&fit=crop',
        rating: 4.5,
        description: 'Sustainable bamboo pen stand with multiple compartments. Eco-friendly desk organization solution.'
      },
      {
        id: 8,
        title: 'Desk Organizer Set',
        price: 799,
        originalPrice: 999,
        image: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=300&h=300&fit=crop',
        badge: 'POPULAR',
        rating: 4.9,
        description: 'Complete desk organizer set with multiple compartments. Keep your workspace tidy and productive.'
      },
      {
        id: 9,
        title: 'Cable Management Box',
        price: 299,
        image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop',
        rating: 4.4,
        description: 'Smart cable management solution to hide and organize all your cables. Clean desk, clear mind.'
      }
    ]
  }
];

const ProductListing = () => {
  const [activeCategory, setActiveCategory] = useState('keychains');
  const navigate = useNavigate();

  const activeProducts = productCategories.find(cat => cat.id === activeCategory)?.products || [];

  return (
    <section className="py-20 px-8 relative overflow-hidden">
      {/* Background with pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-bgPrimary via-bgSecondary to-primary/5"></div>
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FF6B6B' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }}></div>
      </div>
      
      {/* Floating decorative elements */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-20 right-20 w-40 h-40 bg-accent/5 rounded-full blur-3xl animate-float-reverse"></div>
      <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-primary/3 rounded-full blur-2xl animate-pulse"></div>
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-textPrimary mb-4">
            Explore Our Products
          </h2>
          <div className="w-20 h-1 bg-accent mx-auto mb-6"></div>
          <p className="text-lg text-textSecondary max-w-2xl mx-auto">
            Discover our carefully curated collection of aesthetic essentials for your space
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {productCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`
                flex items-center gap-3 px-6 py-3 rounded-full font-semibold transition-all duration-300
                ${activeCategory === category.id 
                  ? 'bg-primary text-white shadow-lg' 
                  : 'bg-bgSecondary text-textSecondary hover:bg-primary hover:text-white'
                }
              `}
            >
              <i className={category.icon}></i>
              {category.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {activeProducts.map((product) => (
            <div
              key={product.id}
              className="bg-bgSecondary rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group"
            >
              {/* Image Container */}
              <div className="relative overflow-hidden">
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                />
                
                {/* Badge */}
                {product.badge && (
                  <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold text-white ${
                    product.badge === 'SALE' ? 'bg-primary' : 
                    product.badge === 'NEW' ? 'bg-accent' :
                    product.badge === 'BESTSELLER' ? 'bg-warning' : 'bg-info'
                  }`}>
                    {product.badge}
                  </div>
                )}
                
                {/* Quick Actions */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                  <button 
                    onClick={() => {
                      const saved = JSON.parse(localStorage.getItem('likedProducts') || '[]');
                      const isLiked = saved.some(p => p.id === product.id);
                      let updated;
                      if (isLiked) {
                        updated = saved.filter(p => p.id !== product.id);
                      } else {
                        updated = [...saved, product];
                      }
                      localStorage.setItem('likedProducts', JSON.stringify(updated));
                      window.dispatchEvent(new Event('storage'));
                    }}
                    className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-textPrimary hover:bg-primary hover:text-white transition-all"
                  >
                    <i className="fa-solid fa-heart"></i>
                  </button>
                  <button 
                    onClick={() => {
                      const viewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
                      const updated = [product, ...viewed.filter(p => p.id !== product.id)].slice(0, 6);
                      localStorage.setItem('recentlyViewed', JSON.stringify(updated));
                      navigate(`/product/${product.id}`);
                    }}
                    className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-textPrimary hover:bg-primary hover:text-white transition-all"
                  >
                    <i className="fa-solid fa-eye"></i>
                  </button>
                  <button className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-textPrimary hover:bg-primary hover:text-white transition-all">
                    <i className="fa-solid fa-shopping-cart"></i>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Rating */}
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <i
                      key={i}
                      className={`fa-solid fa-star text-sm ${
                        i < Math.floor(product.rating) ? 'text-warning' : 'text-borderSecondary'
                      }`}
                    />
                  ))}
                  <span className="text-textMuted text-sm ml-2">({product.rating})</span>
                </div>

                {/* Title */}
                <h3 className="text-textPrimary font-semibold mb-3 line-clamp-2">
                  {product.title}
                </h3>

                {/* Price */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-primary font-bold text-xl">₹{product.price}</span>
                  {product.originalPrice && (
                    <span className="text-textMuted line-through text-sm">₹{product.originalPrice}</span>
                  )}
                  {product.originalPrice && (
                    <span className="text-accent text-sm font-semibold">
                      {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                    </span>
                  )}
                </div>

                {/* Add to Cart Button */}
                <button className="w-full bg-primary hover:bg-accent text-white py-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-lg">
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center">
          <button className="bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-white px-8 py-4 rounded-lg font-semibold transition-all duration-300 inline-flex items-center gap-3">
            View All Products
            <i className="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProductListing;