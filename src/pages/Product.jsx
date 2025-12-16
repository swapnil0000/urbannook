import React from "react";

const products = [
  {
    id: 1,
    title: "Aesthetic Keychain Set",
    price: 299,
    originalPrice: 399,
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop",
    badge: "SALE",
    rating: 4.8
  },
  {
    id: 2,
    title: "Minimalist Poster Collection",
    price: 599,
    image: "https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=300&h=300&fit=crop",
    rating: 4.9
  },
  {
    id: 3,
    title: "Modern Pen Stand",
    price: 449,
    image: "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=300&h=300&fit=crop",
    rating: 4.7
  },
  {
    id: 4,
    title: "Car Accessories Bundle",
    price: 899,
    image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=300&h=300&fit=crop",
    badge: "NEW",
    rating: 4.6
  },
  {
    id: 5,
    title: "Wooden Key Holder",
    price: 349,
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop",
    rating: 4.8
  },
  {
    id: 6,
    title: "Desk Organizer Set",
    price: 799,
    image: "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=300&h=300&fit=crop",
    rating: 4.5
  }
];

export default function Product() {
  return (
    <section className="py-16 px-8 bg-bgSecondary">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-primary text-4xl font-bold mb-3">
            Featured Products
          </h2>
          <div className="w-20 h-1 bg-accent mx-auto rounded-sm mb-4"></div>
          <p className="text-textSecondary max-w-2xl mx-auto">
            Discover our handpicked collection of aesthetic essentials
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-bgPrimary rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group"
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
                    product.badge === 'SALE' ? 'bg-primary' : 'bg-accent'
                  }`}>
                    {product.badge}
                  </div>
                )}
                
                {/* Quick Actions */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                  <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-textPrimary hover:bg-primary hover:text-white transition-all">
                    <i className="fa-solid fa-heart text-sm"></i>
                  </button>
                  <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-textPrimary hover:bg-primary hover:text-white transition-all">
                    <i className="fa-solid fa-eye text-sm"></i>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Rating */}
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <i
                      key={i}
                      className={`fa-solid fa-star text-xs ${
                        i < Math.floor(product.rating) ? 'text-warning' : 'text-borderSecondary'
                      }`}
                    />
                  ))}
                  <span className="text-textMuted text-sm ml-1">({product.rating})</span>
                </div>

                {/* Title */}
                <h3 className="text-textPrimary font-semibold mb-3 line-clamp-2">
                  {product.title}
                </h3>

                {/* Price */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-primary font-bold text-lg">₹{product.price}</span>
                  {product.originalPrice && (
                    <span className="text-textMuted line-through text-sm">₹{product.originalPrice}</span>
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
        <div className="text-center mt-12">
          <button className="bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300">
            View All Products
          </button>
        </div>
      </div>
    </section>
  );
}
