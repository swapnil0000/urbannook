import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NewHeader from '../component/layout/NewHeader';
import Footer from '../component/layout/Footer';

const CheckoutPage = () => {
  useEffect(() => {
      window.scrollTo(0, 0);
  }, []);
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '', email: '', phone: '', address: '', city: '', pincode: ''
  });

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(savedCart);
    if (savedCart.length === 0) navigate('/products');
  }, [navigate]);

  const updateQuantity = (cartId, newQuantity) => {
    if (newQuantity === 0) { removeFromCart(cartId); return; }
    const updatedCart = cart.map(item => item.cartId === cartId ? { ...item, quantity: newQuantity } : item);
    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
  };

  const removeFromCart = (cartId) => {
    const updatedCart = cart.filter(item => item.cartId !== cartId);
    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    if (updatedCart.length === 0) navigate('/products');
  };

  const getTotalPrice = () => cart.reduce((total, item) => total + (item.price * item.quantity), 0);

  const handleInputChange = (e) => setCustomerInfo({ ...customerInfo, [e.target.name]: e.target.value });

  const handlePlaceOrder = (e) => {
    e.preventDefault();
    // Simulate Razorpay trigger
    console.log("Initializing Razorpay for amount:", getTotalPrice());
    localStorage.removeItem('cart');
    alert('Transaction Successful. Your series is being prepared.');
    navigate('/');
  };

  if (cart.length === 0) return null;

  return (
    <div className="min-h-screen bg-[#fafafa] selection:bg-emerald-100 font-sans relative">
      <NewHeader />

      {/* ARCHITECTURAL BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10H90V90H10z' fill='none' stroke='%23000' stroke-width='0.5'/%3E%3C/svg%3E")` }}></div>
          <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] bg-[radial-gradient(circle,rgba(255,245,230,0.5)_0%,rgba(255,255,255,0)_70%)] blur-[100px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[70vw] h-[70vw] bg-[radial-gradient(circle,rgba(209,250,229,0.4)_0%,rgba(255,255,255,0)_70%)] blur-[100px]"></div>
      </div>

      <main className="relative z-10 pt-32 lg:pt-44 pb-20 px-6 max-w-[1500px] mx-auto">
        
        {/* BREADCRUMB */}
        <nav className="mb-10 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
          <a href="/" className="hover:text-emerald-700">Home</a>
          <i className="fa-solid fa-chevron-right mx-3 text-[8px]"></i>
          <span className="text-slate-900">Checkout Console</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
          
          {/* LEFT: SHIPPING CONSOLE (7 Columns) */}
          <div className="lg:col-span-7 space-y-8">
            <div className="bg-white rounded-[3rem] p-8 lg:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100">
              <div className="mb-10">
                <h2 className="text-4xl lg:text-5xl font-serif text-slate-900 mb-2">Shipping <span className="italic font-light text-emerald-700">Protocol</span></h2>
                <p className="text-slate-500 text-sm">Verify your destination for the Urban Nook Series.</p>
              </div>

              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                    <input type="text" name="name" value={customerInfo.name} onChange={handleInputChange} required className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl focus:border-emerald-500 transition-all outline-none text-sm" placeholder="John Doe" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                    <input type="email" name="email" value={customerInfo.email} onChange={handleInputChange} required className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl focus:border-emerald-500 transition-all outline-none text-sm" placeholder="name@example.com" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
                  <input type="tel" name="phone" value={customerInfo.phone} onChange={handleInputChange} required className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl focus:border-emerald-500 transition-all outline-none text-sm" placeholder="+91 00000 00000" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Delivery Address</label>
                  <textarea name="address" value={customerInfo.address} onChange={handleInputChange} required rows="3" className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl focus:border-emerald-500 transition-all outline-none text-sm resize-none" placeholder="House no, Street, Landmark..."></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">City</label>
                    <input type="text" name="city" value={customerInfo.city} onChange={handleInputChange} required className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl focus:border-emerald-500 transition-all outline-none text-sm" placeholder="New Delhi" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">PIN Code</label>
                    <input type="text" name="pincode" value={customerInfo.pincode} onChange={handleInputChange} required className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl focus:border-emerald-500 transition-all outline-none text-sm" placeholder="110001" />
                  </div>
                </div>
              </form>
            </div>

            {/* SECURE PAYMENT METHOD CARD */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Gateway</h3>
                    <div className="flex items-center gap-2">
                        <i className="fa-solid fa-shield-halved text-emerald-600 text-xs"></i>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Secure 256-bit SSL</span>
                    </div>
                </div>
                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-emerald-500/30">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <i className="fa-solid fa-credit-card text-emerald-600"></i>
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 text-sm">Razorpay Secure Checkout</p>
                            <p className="text-[10px] text-slate-500">Cards, UPI, Netbanking, & Wallets</p>
                        </div>
                    </div>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/8/89/Razorpay_logo.svg" className="h-4 opacity-70" alt="Razorpay" />
                </div>
            </div>
          </div>

          {/* RIGHT: ORDER SUMMARY (5 Columns) */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-[3rem] p-8 lg:p-10 sticky top-32 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100">
              <h2 className="text-2xl font-serif text-slate-900 mb-8 tracking-tight">Order <span className="italic">Inventory</span></h2>
              
              <div className="space-y-4 mb-8 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                {cart.map((item) => (
                  <div key={item.cartId} className="flex gap-4 p-4 bg-slate-50 rounded-[2rem] border border-white">
                    <img src={item.image} alt={item.title} className="w-20 h-20 object-cover rounded-2xl" />
                    <div className="flex-1 flex flex-col justify-center">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-tight mb-1">{item.title}</h4>
                      <p className="text-emerald-700 font-bold text-sm">₹{item.price.toLocaleString()}</p>
                      
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center bg-white rounded-lg p-1 border border-slate-200">
                           <button onClick={() => updateQuantity(item.cartId, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-900"><i className="fa-solid fa-minus text-[8px]"></i></button>
                           <span className="text-xs font-bold text-slate-900 w-6 text-center">{item.quantity}</span>
                           <button onClick={() => updateQuantity(item.cartId, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-900"><i className="fa-solid fa-plus text-[8px]"></i></button>
                        </div>
                        <button onClick={() => removeFromCart(item.cartId)} className="text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 ml-auto">Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* PRICE BREAKDOWN */}
              <div className="border-t border-slate-100 pt-6 space-y-3">
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <span>Sub-Protocol Total</span>
                  <span className="text-slate-900">₹{getTotalPrice().toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <span>Architectural Delivery</span>
                  <span className="text-emerald-600">Complimentary</span>
                </div>
                <div className="flex justify-between text-2xl font-serif text-slate-900 border-t border-slate-100 pt-4 mt-2">
                  <span>Final Total</span>
                  <span className="font-sans font-light">₹{getTotalPrice().toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold tracking-[0.2em] uppercase hover:bg-emerald-700 transition-all shadow-xl active:scale-95 mt-8"
              >
                Complete Transaction
              </button>
              
              <p className="mt-6 text-center text-[10px] text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                <i className="fa-solid fa-lock"></i>
                End-to-End Encrypted Secure Acquisition
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CheckoutPage;