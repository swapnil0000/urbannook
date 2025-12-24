import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../component/layout/Footer';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    pincode: ''
  });

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(savedCart);
    
    if (savedCart.length === 0) {
      navigate('/products');
    }
  }, [navigate]);

  const updateQuantity = (cartId, newQuantity) => {
    if (newQuantity === 0) {
      removeFromCart(cartId);
      return;
    }
    
    const updatedCart = cart.map(item => 
      item.cartId === cartId ? { ...item, quantity: newQuantity } : item
    );
    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
  };

  const removeFromCart = (cartId) => {
    const updatedCart = cart.filter(item => item.cartId !== cartId);
    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    
    if (updatedCart.length === 0) {
      navigate('/products');
    }
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleInputChange = (e) => {
    setCustomerInfo({
      ...customerInfo,
      [e.target.name]: e.target.value
    });
  };

  const handlePlaceOrder = (e) => {
    e.preventDefault();
    // Clear cart
    localStorage.removeItem('cart');
    setCart([]);
    
    // Show success message and redirect
    alert('Order placed successfully! Thank you for your purchase.');
    navigate('/');
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <i className="fa-solid fa-shopping-cart text-6xl text-textMuted mb-4"></i>
          <h2 className="text-2xl font-bold text-textPrimary mb-4">Your cart is empty</h2>
          <button onClick={() => navigate('/products')} className="px-6 py-3 bg-primary text-white rounded-lg">
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bgPrimary">
      {/* Header */}
      <section className="py-8 px-8 bg-bgSecondary">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 text-textSecondary text-sm mb-4">
            <a href="/" className="hover:text-primary">Home</a>
            <i className="fa-solid fa-chevron-right text-xs"></i>
            <span className="text-textPrimary font-semibold">Checkout</span>
          </div>
          <h1 className="text-3xl font-bold text-textPrimary">Checkout</h1>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Customer Information */}
            <div className="lg:col-span-2">
              <div className="bg-bgSecondary rounded-2xl p-6 mb-6">
                <h2 className="text-2xl font-bold text-textPrimary mb-6">Customer Information</h2>
                <form onSubmit={handlePlaceOrder} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-textSecondary font-semibold mb-2">Full Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={customerInfo.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-borderPrimary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-textSecondary font-semibold mb-2">Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={customerInfo.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-borderPrimary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-textSecondary font-semibold mb-2">Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={customerInfo.phone}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-borderPrimary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter your phone number"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-textSecondary font-semibold mb-2">Address *</label>
                    <textarea
                      name="address"
                      value={customerInfo.address}
                      onChange={handleInputChange}
                      required
                      rows="3"
                      className="w-full px-4 py-3 border border-borderPrimary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      placeholder="Enter your complete address"
                    ></textarea>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-textSecondary font-semibold mb-2">City *</label>
                      <input
                        type="text"
                        name="city"
                        value={customerInfo.city}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-borderPrimary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Enter your city"
                      />
                    </div>
                    <div>
                      <label className="block text-textSecondary font-semibold mb-2">PIN Code *</label>
                      <input
                        type="text"
                        name="pincode"
                        value={customerInfo.pincode}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-borderPrimary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Enter PIN code"
                      />
                    </div>
                  </div>
                </form>
              </div>
            </div>

            {/* Order Summary */}
            <div>
              <div className="bg-bgSecondary rounded-2xl p-6 sticky top-4">
                <h2 className="text-2xl font-bold text-textPrimary mb-6">Order Summary</h2>
                
                {/* Cart Items */}
                <div className="space-y-4 mb-6">
                  {cart.map((item) => (
                    <div key={item.cartId} className="flex gap-4 p-4 bg-bgPrimary rounded-lg">
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

                {/* Price Breakdown */}
                <div className="border-t border-borderPrimary pt-4 space-y-2">
                  <div className="flex justify-between text-textSecondary">
                    <span>Subtotal:</span>
                    <span>₹{getTotalPrice().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-textSecondary">
                    <span>Shipping:</span>
                    <span className="text-accent">Free</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-textPrimary border-t border-borderPrimary pt-2">
                    <span>Total:</span>
                    <span className="text-primary">₹{getTotalPrice().toLocaleString()}</span>
                  </div>
                </div>

                {/* Place Order Button */}
                <button
                  onClick={handlePlaceOrder}
                  className="w-full bg-primary hover:bg-accent text-white py-4 rounded-lg font-semibold transition-colors mt-6"
                >
                  Place Order
                </button>
                
                <div className="mt-4 text-center">
                  <button
                    onClick={() => navigate('/products')}
                    className="text-textSecondary hover:text-primary transition-colors text-sm"
                  >
                    ← Continue Shopping
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CheckoutPage;