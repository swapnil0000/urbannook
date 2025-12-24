import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Footer from '../component/layout/Footer';
import { products, productCategories, colors } from '../data/products';

const ProductDetailPage = () => {
  const { category, slug } = useParams();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [showCart, setShowCart] = useState(false);
  const [cart, setCart] = useState(JSON.parse(localStorage.getItem('cart') || '[]'));
  const [isInCart, setIsInCart] = useState(false);

  const product = products.find(p => p.category === category && p.slug === slug) 
  const categoryInfo = productCategories.find(cat => cat.id === category);
  const relatedProducts = products.filter(p => p.category === category && p.id !== product?.id).slice(0, 4);

  useEffect(() => {
    if (product) {
      // Check if product is in wishlist
      const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
      setIsWishlisted(wishlist.some(item => item.id === product.id));
      
      // Check if product is in cart
      const currentCart = JSON.parse(localStorage.getItem('cart') || '[]');
      setIsInCart(currentCart.some(item => item.id === product.id));
      setCart(currentCart);
    }
  }, [product]);

  const toggleWishlist = () => {
    const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    let updatedWishlist;
    
    if (isWishlisted) {
      updatedWishlist = wishlist.filter(item => item.id !== product.id);
    } else {
      updatedWishlist = [...wishlist, product];
    }
    
    localStorage.setItem('wishlist', JSON.stringify(updatedWishlist));
    setIsWishlisted(!isWishlisted);
  };

  const addToCart = () => {
    const cartItem = {
      ...product,
      quantity,
      cartId: `${product.id}-${Date.now()}`
    };
    
    const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItem = existingCart.find(item => item.id === product.id);
    
    let updatedCart;
    if (existingItem) {
      updatedCart = existingCart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
    } else {
      updatedCart = [...existingCart, cartItem];
    }
    
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    setCart(updatedCart);
    setIsInCart(true);
    setShowCart(true);
  };

  const goToCheckout = () => {
    navigate('/checkout');
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

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-textPrimary mb-4">Product not found</h2>
          <button onClick={() => navigate('/products')} className="px-6 py-3 bg-primary text-white rounded-lg">
            View All Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-bgPrimary">
      {/* Breadcrumb */}
      <section className="py-6 px-8 bg-bgSecondary">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 text-textSecondary text-sm">
            <a href="/" className="hover:text-primary">Home</a>
            <i className="fa-solid fa-chevron-right text-xs"></i>
            <a href="/products" className="hover:text-primary">Products</a>
            <i className="fa-solid fa-chevron-right text-xs"></i>
            <a href={`/product/${category}`} className="hover:text-primary">{categoryInfo?.name}</a>
            <i className="fa-solid fa-chevron-right text-xs"></i>
            <span className="text-textPrimary font-semibold">{product.title}</span>
          </div>
        </div>
      </section>

      {/* Product Details */}
      <section className="py-12 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Product Images */}
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl bg-bgSecondary">
                <img
                  src={product.images?.[selectedImage] || product.image}
                  alt={product.title}
                  className="w-full h-96 lg:h-[500px] object-cover"
                />
                {product.badge && (
                  <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-bold text-white ${
                    product.badge === 'SALE' ? 'bg-primary' : 
                    product.badge === 'NEW' ? 'bg-accent' : 'bg-warning'
                  }`}>
                    {product.badge}
                  </div>
                )}
              </div>
              
              {/* Thumbnail Images */}
              {product.images && product.images.length > 1 && (
                <div className="flex gap-3">
                  {product.images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImage === index ? 'border-primary' : 'border-borderPrimary'
                      }`}
                    >
                      <img src={img} alt={`${product.title} ${index + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-semibold rounded-full">
                    {categoryInfo?.name}
                  </span>
                  {product.inStock ? (
                    <span className="px-3 py-1 bg-accent/10 text-accent text-sm font-semibold rounded-full">
                      In Stock
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-error/10 text-error text-sm font-semibold rounded-full">
                      Out of Stock
                    </span>
                  )}
                </div>
                <h1 className="text-3xl font-bold text-textPrimary mb-4">{product.title}</h1>
                
                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <i key={i} className={`fa-solid fa-star text-sm ${
                        i < Math.floor(product.rating) ? 'text-warning' : 'text-borderSecondary'
                      }`} />
                    ))}
                  </div>
                  <span className="text-textPrimary font-semibold">{product.rating}</span>
                  <span className="text-textMuted">({product.reviews} reviews)</span>
                </div>

                {/* Price */}
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-3xl font-bold text-primary">₹{product.price}</span>
                  {product.originalPrice && (
                    <>
                      <span className="text-xl text-textMuted line-through">₹{product.originalPrice}</span>
                      <span className="px-2 py-1 bg-accent text-white text-sm font-semibold rounded">
                        {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                      </span>
                    </>
                  )}
                </div>

                <p className="text-textSecondary leading-relaxed">{product.description}</p>
              </div>

              {/* Product Tags */}
              <div>
                <h3 className="font-semibold text-textPrimary mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {product.tags?.map((tag, index) => (
                    <span key={index} className="px-3 py-1 bg-bgSecondary text-textSecondary text-sm rounded-full border border-borderPrimary">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Size/Dimensions */}
              <div>
                <h3 className="font-semibold text-textPrimary mb-3">Specifications</h3>
                <div className="bg-bgSecondary rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-textSecondary">Material:</span>
                    <span className="text-textPrimary font-medium">Premium Quality</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-textSecondary">Weight:</span>
                    <span className="text-textPrimary font-medium">Lightweight</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-textSecondary">Warranty:</span>
                    <span className="text-textPrimary font-medium">1 Year</span>
                  </div>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <h3 className="font-semibold text-textPrimary mb-3">Quantity</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-lg border border-borderPrimary flex items-center justify-center hover:bg-bgSecondary"
                  >
                    <i className="fa-solid fa-minus"></i>
                  </button>
                  <span className="w-16 text-center font-semibold text-textPrimary">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 rounded-lg border border-borderPrimary flex items-center justify-center hover:bg-bgSecondary"
                  >
                    <i className="fa-solid fa-plus"></i>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                {isInCart ? (
                  <button
                    onClick={goToCheckout}
                    className="flex-1 bg-accent hover:bg-primary text-white py-4 px-6 rounded-lg font-semibold transition-all"
                  >
                    <i className="fa-solid fa-credit-card mr-2"></i>
                    Checkout
                  </button>
                ) : (
                  <button
                    onClick={addToCart}
                    disabled={!product.inStock}
                    className="flex-1 bg-primary hover:bg-accent text-white py-4 px-6 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i className="fa-solid fa-shopping-cart mr-2"></i>
                    Add to Cart
                  </button>
                )}
                <button
                  onClick={toggleWishlist}
                  className={`w-14 h-14 rounded-lg border-2 transition-all ${
                    isWishlisted ? 'border-primary bg-primary text-white' : 'border-borderPrimary hover:border-primary'
                  }`}
                >
                  <i className={`fa-solid fa-heart ${isWishlisted ? 'text-white' : 'text-textMuted'}`}></i>
                </button>
              </div>

              {/* Features */}
              <div>
                <h3 className="font-semibold text-textPrimary mb-3">Key Features</h3>
                <ul className="space-y-2">
                  {product.features?.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-textSecondary">
                      <i className="fa-solid fa-check text-accent"></i>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Product Details Tabs */}
              <div>
                <div className="border-b border-borderPrimary mb-4">
                  <div className="flex gap-6">
                    <button
                      onClick={() => setActiveTab('description')}
                      className={`pb-2 px-1 font-medium transition-colors ${
                        activeTab === 'description' 
                          ? 'text-primary border-b-2 border-primary' 
                          : 'text-textSecondary hover:text-textPrimary'
                      }`}
                    >
                      Description
                    </button>
                    <button
                      onClick={() => setActiveTab('shipping')}
                      className={`pb-2 px-1 font-medium transition-colors ${
                        activeTab === 'shipping' 
                          ? 'text-primary border-b-2 border-primary' 
                          : 'text-textSecondary hover:text-textPrimary'
                      }`}
                    >
                      Shipping
                    </button>
                    <button
                      onClick={() => setActiveTab('returns')}
                      className={`pb-2 px-1 font-medium transition-colors ${
                        activeTab === 'returns' 
                          ? 'text-primary border-b-2 border-primary' 
                          : 'text-textSecondary hover:text-textPrimary'
                      }`}
                    >
                      Returns
                    </button>
                  </div>
                </div>
                
                <div className="min-h-[100px]">
                  {activeTab === 'description' && (
                    <div className="text-textSecondary leading-relaxed">
                      <p>{product.description}</p>
                      <p className="mt-3">This product is carefully crafted with attention to detail and quality materials to ensure long-lasting durability and aesthetic appeal.</p>
                    </div>
                  )}
                  {activeTab === 'shipping' && (
                    <div className="text-textSecondary space-y-2">
                      <p>• Free shipping on orders above ₹999</p>
                      <p>• Standard delivery: 3-5 business days</p>
                      <p>• Express delivery: 1-2 business days (additional charges apply)</p>
                      <p>• Cash on delivery available</p>
                    </div>
                  )}
                  {activeTab === 'returns' && (
                    <div className="text-textSecondary space-y-2">
                      <p>• 30-day return policy</p>
                      <p>• Items must be unused and in original packaging</p>
                      <p>• Free returns for defective items</p>
                      <p>• Refund processed within 5-7 business days</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="py-16 px-8 bg-bgSecondary">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-textPrimary mb-8">Related Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map(relatedProduct => (
                <div
                  key={relatedProduct.id}
                  className="bg-bgPrimary rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group cursor-pointer"
                  onClick={() => navigate(`/product/${relatedProduct.category}/${relatedProduct.slug}`)}
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={relatedProduct.image}
                      alt={relatedProduct.title}
                      className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-textPrimary font-semibold mb-2 line-clamp-2">{relatedProduct.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-primary font-bold">₹{relatedProduct.price}</span>
                      {relatedProduct.originalPrice && (
                        <span className="text-textMuted line-through text-sm">₹{relatedProduct.originalPrice}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>

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

export default ProductDetailPage;