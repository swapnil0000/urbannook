import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Footer from '../component/layout/Footer';
import { products, productCategories, colors } from '../data/products';

const ProductDetailPage = () => {
  const { category, slug } = useParams();
  const navigate = useNavigate();
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const product = products.find(p => p.category === category && p.slug === slug) 
  const categoryInfo = productCategories.find(cat => cat.id === category);
  const relatedProducts = products.filter(p => p.category === category && p.id !== product?.id).slice(0, 4);

  useEffect(() => {
    if (product) {
      setSelectedColor(product.colors[0]);
      // Check if product is in wishlist
      const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
      setIsWishlisted(wishlist.some(item => item.id === product.id));
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
      selectedColor,
      quantity,
      cartId: `${product.id}-${selectedColor}`
    };
    
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItem = cart.find(item => item.cartId === cartItem.cartId);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push(cartItem);
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    // You can add a toast notification here
    alert('Product added to cart!');
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

              {/* Color Selection */}
              <div>
                <h3 className="font-semibold text-textPrimary mb-3">Color</h3>
                <div className="flex gap-3">
                  {product.colors.map(colorId => {
                    const color = colors.find(c => c.id === colorId);
                    return (
                      <button
                        key={colorId}
                        onClick={() => setSelectedColor(colorId)}
                        className={`w-12 h-12 rounded-full border-2 transition-all ${
                          selectedColor === colorId ? 'border-primary scale-110' : 'border-borderPrimary'
                        }`}
                        style={{ backgroundColor: color?.hex }}
                        title={color?.name}
                      />
                    );
                  })}
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
                <button
                  onClick={addToCart}
                  disabled={!product.inStock}
                  className="flex-1 bg-primary hover:bg-accent text-white py-4 px-6 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="fa-solid fa-shopping-cart mr-2"></i>
                  Add to Cart
                </button>
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
                <h3 className="font-semibold text-textPrimary mb-3">Features</h3>
                <ul className="space-y-2">
                  {product.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-textSecondary">
                      <i className="fa-solid fa-check text-accent"></i>
                      {feature}
                    </li>
                  ))}
                </ul>
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
  );
};

export default ProductDetailPage;