import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { updateQuantity, removeItem } from '../../store/slices/cartSlice';
import { useUpdateCartMutation, useRemoveFromCartMutation } from '../../store/api/userApi';

const CartDrawer = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [mounted, setMounted] = useState(false);
  
  // Get cart items from Redux store
  const { items: cartItems, totalAmount } = useSelector((state) => state.cart);
  
  const [updateCart] = useUpdateCartMutation();
  const [removeFromCart] = useRemoveFromCartMutation();

  // Handle animation mounting
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => setMounted(false), 300);
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleQuantityChange = async (productId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveItem(productId);
      return;
    }
    
    try {
      // Update Redux store immediately
      dispatch(updateQuantity({ id: productId, quantity: newQuantity }));
      
      // Find the item to get mongoId for backend sync
      const item = cartItems.find(item => item.id === productId);
      const mongoId = item?.mongoId || productId;
      
      // Sync with backend
      await updateCart({ productId: mongoId, quantity: newQuantity }).unwrap();
    } catch (error) {
      console.error('Failed to update cart:', error);
    }
  };

  const handleRemoveItem = async (productId) => {
    try {
      // Update Redux store immediately
      dispatch(removeItem(productId));
      
      // Find the item to get mongoId for backend sync
      const item = cartItems.find(item => item.id === productId);
      const mongoId = item?.mongoId || productId;
      
      // Sync with backend
      await removeFromCart(mongoId).unwrap();
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };
  
  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  if (!mounted && !isOpen) return null;

  const subtotal = totalAmount;
  const freeShippingThreshold = 5000;
  const progress = Math.min((subtotal / freeShippingThreshold) * 100, 100);

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end">
      
      {/* Backdrop (Blur Effect) */}
      <div 
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div 
        className={`relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col transition-transform duration-300 ease-out transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        
        {/* --- HEADER --- */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white z-10">
          <div>
            <h2 className="text-xl font-serif text-slate-900">Your Collection</h2>
            <p className="text-xs text-slate-500">{cartItems.length} items</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* --- SCROLLABLE CONTENT --- */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-60">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                <i className="fa-solid fa-basket-shopping text-3xl text-emerald-200"></i>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Your cart is empty</h3>
              <p className="text-sm text-slate-500 max-w-[200px]">Looks like you haven't added any pieces to your collection yet.</p>
              <button 
                onClick={onClose}
                className="px-6 py-3 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-colors mt-4"
              >
                Start Exploring
              </button>
            </div>
          ) : (
            <>
              {/* Free Shipping Progress */}
              <div className="mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-slate-700">
                        {progress < 100 
                            ? `Add ₹${(freeShippingThreshold - subtotal).toLocaleString()} for Free Shipping` 
                            : "You've unlocked Free Shipping!"}
                    </span>
                    <span className="text-emerald-600">{Math.round(progress)}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-emerald-500 transition-all duration-500 ease-out" 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-6">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4 group">
                    {/* Image */}
                    <div className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                      <img src={item.image || '/placeholder.jpg'} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    
                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{item.name}</h4>
                        <p className="text-xs text-slate-500">Standard</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                          <button 
                            onClick={() => handleQuantityChange(item.id, Math.max(0, item.quantity - 1))}
                            className="text-slate-400 hover:text-slate-900 text-xs px-1"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold text-slate-900">{item.quantity}</span>
                          <button 
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            className="text-slate-400 hover:text-slate-900 text-xs px-1"
                          >
                            +
                          </button>
                        </div>
                        <p className="text-sm font-bold text-emerald-700">₹{item.price?.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Remove */}
                    <button 
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors self-start p-1"
                    >
                      <i className="fa-regular fa-trash-can text-sm"></i>
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* --- FOOTER (CHECKOUT) --- */}
        {cartItems.length > 0 && (
          <div className="p-6 bg-white border-t border-slate-100 z-10">
            <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-slate-500">Subtotal</span>
                <span className="text-xl font-serif text-slate-900">₹{subtotal.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-slate-400 mb-4 text-center">Shipping & taxes calculated at checkout</p>
            <button 
              onClick={handleCheckout}
              className="w-full py-4 bg-emerald-700 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-emerald-800 transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
            >
                <span>Checkout Securely</span>
                <i className="fa-solid fa-lock text-[10px] opacity-70"></i>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default CartDrawer;