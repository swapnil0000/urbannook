import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

// Sample product data (in real app, this would come from API)
const productData = {
  1: {
    id: 1,
    title: 'Minimalist Metal Keychain',
    price: 199,
    originalPrice: 299,
    images: [
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=600&h=600&fit=crop'
    ],
    badge: 'BESTSELLER',
    rating: 4.8,
    reviews: 156,
    description: 'Sleek and durable metal keychain with minimalist design. Perfect for everyday use and makes a great gift.',
    features: [
      'Premium stainless steel construction',
      'Scratch-resistant coating',
      'Lightweight and compact design',
      'Perfect for keys, bags, or accessories',
      'Available in multiple finishes'
    ],
    specifications: {
      'Material': 'Stainless Steel',
      'Dimensions': '5cm x 2cm x 0.3cm',
      'Weight': '15g',
      'Color': 'Silver, Black, Gold',
      'Warranty': '1 Year'
    },
    category: 'Keychains',
    inStock: true,
    stockCount: 25
  }
};

const similarProducts = [
  {
    id: 2,
    title: 'Wooden Aesthetic Keychain',
    price: 249,
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop',
    rating: 4.7
  },
  {
    id: 3,
    title: 'Acrylic Design Keychain',
    price: 179,
    image: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=300&h=300&fit=crop',
    rating: 4.9
  }
];

const ProductDetails = () => {
  const { id } = useParams();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [is3DView, setIs3DView] = useState(false);

  const product = productData[id] || productData[1];


    useEffect(() => {
        window.scrollTo(0, 0);
      }, []);

  const tabs = [
    { id: 'description', label: 'Description', icon: 'fa-solid fa-file-text' },
    { id: 'specifications', label: 'Specifications', icon: 'fa-solid fa-cog' },
    { id: 'reviews', label: 'Reviews', icon: 'fa-solid fa-star' },
    { id: 'comparison', label: 'Compare', icon: 'fa-solid fa-balance-scale' }
  ];

  return (
    <div className="min-h-screen bg-bgPrimary py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-textSecondary mb-8">
          <span>Home</span>
          <i className="fa-solid fa-chevron-right text-xs"></i>
          <span>{product.category}</span>
          <i className="fa-solid fa-chevron-right text-xs"></i>
          <span className="text-textPrimary">{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Product Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative bg-bgSecondary rounded-2xl overflow-hidden">
              <img
                src={product.images[selectedImage]}
                alt={product.title}
                className={`w-full h-96 object-cover transition-transform duration-500 ${
                  is3DView ? 'transform rotate-y-12 scale-110' : ''
                }`}
              />
              
              {/* 3D View Toggle */}
              <button
                onClick={() => setIs3DView(!is3DView)}
                className={`absolute top-4 right-4 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  is3DView ? 'bg-primary text-white' : 'bg-white text-textPrimary hover:bg-primary hover:text-white'
                }`}
              >
                <i className="fa-solid fa-cube"></i>
              </button>

              {/* Badge */}
              {product.badge && (
                <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold text-white bg-primary">
                  {product.badge}
                </div>
              )}
            </div>

            {/* Thumbnail Images */}
            <div className="flex gap-3">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage === index ? 'border-primary' : 'border-borderSecondary hover:border-primary'
                  }`}
                >
                  <img src={image} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-textPrimary mb-2">{product.title}</h1>
              
              {/* Rating */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <i
                      key={i}
                      className={`fa-solid fa-star ${
                        i < Math.floor(product.rating) ? 'text-warning' : 'text-borderSecondary'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-textPrimary font-semibold">{product.rating}</span>
                <span className="text-textSecondary">({product.reviews} reviews)</span>
              </div>

              {/* Price */}
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl font-bold text-primary">₹{product.price}</span>
                {product.originalPrice && (
                  <>
                    <span className="text-xl text-textMuted line-through">₹{product.originalPrice}</span>
                    <span className="bg-accent text-white px-2 py-1 rounded text-sm font-semibold">
                      {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${product.inStock ? 'bg-success' : 'bg-danger'}`}></div>
              <span className={`font-semibold ${product.inStock ? 'text-success' : 'text-danger'}`}>
                {product.inStock ? `In Stock (${product.stockCount} available)` : 'Out of Stock'}
              </span>
            </div>

            {/* Description */}
            <p className="text-textSecondary leading-relaxed">{product.description}</p>

            {/* Key Features */}
            <div>
              <h3 className="text-lg font-semibold text-textPrimary mb-3">Key Features</h3>
              <ul className="space-y-2">
                {product.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-textSecondary">
                    <i className="fa-solid fa-check text-success text-sm"></i>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Quantity & Actions */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-textPrimary font-semibold">Quantity:</span>
                <div className="flex items-center border border-borderSecondary rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-bgSecondary"
                  >
                    <i className="fa-solid fa-minus text-sm"></i>
                  </button>
                  <span className="w-12 text-center font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-bgSecondary"
                  >
                    <i className="fa-solid fa-plus text-sm"></i>
                  </button>
                </div>
              </div>

              <div className="flex gap-4">
                <button className="flex-1 bg-primary hover:bg-accent text-white py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2">
                  <i className="fa-solid fa-shopping-cart"></i>
                  Add to Cart
                </button>
                <button className="w-12 h-12 border border-borderSecondary rounded-lg flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-all">
                  <i className="fa-solid fa-heart"></i>
                </button>
                <button className="w-12 h-12 border border-borderSecondary rounded-lg flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-all">
                  <i className="fa-solid fa-share"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="bg-bgSecondary rounded-2xl overflow-hidden mb-12">
          {/* Tab Headers */}
          <div className="flex border-b border-borderSecondary">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-textSecondary hover:text-primary'
                }`}
              >
                <i className={tab.icon}></i>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'description' && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-textPrimary">Product Description</h3>
                <p className="text-textSecondary leading-relaxed">{product.description}</p>
                <div>
                  <h4 className="font-semibold text-textPrimary mb-2">Features:</h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {product.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-textSecondary">
                        <i className="fa-solid fa-check text-success"></i>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'specifications' && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-textPrimary">Specifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b border-borderSecondary">
                      <span className="font-semibold text-textPrimary">{key}:</span>
                      <span className="text-textSecondary">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-textPrimary">Customer Reviews</h3>
                  <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-accent transition-all">
                    Write Review
                  </button>
                </div>
                
                {/* Review Summary */}
                <div className="bg-bgPrimary rounded-lg p-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">{product.rating}</div>
                      <div className="flex items-center justify-center gap-1 mb-1">
                        {[...Array(5)].map((_, i) => (
                          <i key={i} className={`fa-solid fa-star text-sm ${i < Math.floor(product.rating) ? 'text-warning' : 'text-borderSecondary'}`} />
                        ))}
                      </div>
                      <div className="text-sm text-textSecondary">{product.reviews} reviews</div>
                    </div>
                    <div className="flex-1 space-y-2">
                      {[5, 4, 3, 2, 1].map((star) => (
                        <div key={star} className="flex items-center gap-2">
                          <span className="text-sm w-8">{star}★</span>
                          <div className="flex-1 bg-borderSecondary rounded-full h-2">
                            <div className="bg-warning h-2 rounded-full" style={{ width: `${star === 5 ? 70 : star === 4 ? 20 : 5}%` }}></div>
                          </div>
                          <span className="text-sm text-textSecondary w-8">{star === 5 ? 70 : star === 4 ? 20 : 5}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sample Reviews */}
                <div className="space-y-4">
                  {[1, 2, 3].map((review) => (
                    <div key={review} className="border border-borderSecondary rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                            U{review}
                          </div>
                          <div>
                            <div className="font-semibold text-textPrimary">User {review}</div>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <i key={i} className={`fa-solid fa-star text-xs ${i < 5 ? 'text-warning' : 'text-borderSecondary'}`} />
                              ))}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm text-textSecondary">2 days ago</span>
                      </div>
                      <p className="text-textSecondary">Great product! Excellent quality and fast delivery. Highly recommended.</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'comparison' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-textPrimary">Compare Similar Products</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border border-borderSecondary rounded-lg">
                    <thead className="bg-bgPrimary">
                      <tr>
                        <th className="text-left p-4 font-semibold text-textPrimary">Feature</th>
                        <th className="text-center p-4 font-semibold text-textPrimary">Current Product</th>
                        <th className="text-center p-4 font-semibold text-textPrimary">Alternative 1</th>
                        <th className="text-center p-4 font-semibold text-textPrimary">Alternative 2</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-borderSecondary">
                        <td className="p-4 font-semibold">Price</td>
                        <td className="p-4 text-center text-primary font-bold">₹{product.price}</td>
                        <td className="p-4 text-center">₹249</td>
                        <td className="p-4 text-center">₹179</td>
                      </tr>
                      <tr className="border-t border-borderSecondary bg-bgPrimary/50">
                        <td className="p-4 font-semibold">Rating</td>
                        <td className="p-4 text-center">{product.rating}★</td>
                        <td className="p-4 text-center">4.7★</td>
                        <td className="p-4 text-center">4.9★</td>
                      </tr>
                      <tr className="border-t border-borderSecondary">
                        <td className="p-4 font-semibold">Material</td>
                        <td className="p-4 text-center">Stainless Steel</td>
                        <td className="p-4 text-center">Wood</td>
                        <td className="p-4 text-center">Acrylic</td>
                      </tr>
                      <tr className="border-t border-borderSecondary bg-bgPrimary/50">
                        <td className="p-4 font-semibold">Warranty</td>
                        <td className="p-4 text-center text-success">1 Year</td>
                        <td className="p-4 text-center">6 Months</td>
                        <td className="p-4 text-center">6 Months</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Similar Products */}
        <div>
          <h3 className="text-2xl font-bold text-textPrimary mb-6">Similar Products</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {similarProducts.map((product) => (
              <div key={product.id} className="bg-bgSecondary rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <img src={product.image} alt={product.title} className="w-full h-48 object-cover" />
                <div className="p-4">
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <i key={i} className={`fa-solid fa-star text-xs ${i < Math.floor(product.rating) ? 'text-warning' : 'text-borderSecondary'}`} />
                    ))}
                    <span className="text-textMuted text-sm ml-1">({product.rating})</span>
                  </div>
                  <h4 className="font-semibold text-textPrimary mb-2 line-clamp-2">{product.title}</h4>
                  <div className="text-primary font-bold">₹{product.price}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;