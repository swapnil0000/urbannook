import { useEffect, useState, lazy, Suspense } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useUpdateCartMutation } from '../../store/api/userApi';
import { updateQuantity, removeItem } from '../../store/slices/cartSlice';
import { setShowLoginModal } from '../../store/slices/uiSlice';

const OptimizedImage = lazy(() => import('../OptimizedImage'));

const CartDrawer = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [mounted, setMounted] = useState(false);
  
  // Get cart items from Redux store
  const { items: cartItems, totalAmount } = useSelector((state) => state.cart);
  const { isAuthenticated } = useSelector((state) => state.auth);
  
  const [updateCart] = useUpdateCartMutation();

  // Handle animation mounting
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      document.body.style.overflow = 'hidden'; 
      return () => {
        document.body.style.overflow = ''; 
      };
    } 
    else {
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleQuantityChange = async (productId, selectedColor, newQuantity, mongoId, currentQty, image) => {
    if (newQuantity <= 0) {
      handleRemoveItem(productId, selectedColor, mongoId);
      return;
    }

    const hasToken = !!localStorage.getItem('authToken');
    const isLoggedIn = isAuthenticated || hasToken;

    if (isLoggedIn) {
      try {
        const action = newQuantity > currentQty ? 'add' : 'sub';
        await updateCart({ productId: mongoId || productId, quantity: 1, action, color: selectedColor, image }).unwrap();
      } catch (error) {
        console.error('Failed to update cart:', error);
        window.location.reload();
      }
    } else {
      dispatch(updateQuantity({ id: productId, quantity: newQuantity, selectedColor }));
    }
  };

  const handleRemoveItem = async (productId, selectedColor, mongoId) => {
    const hasToken = !!localStorage.getItem('authToken');
    const isLoggedIn = isAuthenticated || hasToken;

    if (isLoggedIn) {
      try {
        await updateCart({ productId: mongoId || productId, quantity: 1, action: 'remove', color: selectedColor }).unwrap();
      } catch (error) {
        console.error('Failed to remove item:', error);
        window.location.reload();
      }
    } else {
      dispatch(removeItem({ id: productId, selectedColor }));
    }
  };
  
  const handleCheckout = () => {
    const hasToken = !!localStorage.getItem('authToken');
    const isLoggedIn = isAuthenticated || hasToken;
    onClose();
    if (isLoggedIn) {
      navigate('/checkout');
    } else {
      sessionStorage.setItem('postLoginRedirect', '/checkout');
      dispatch(setShowLoginModal(true));
    }
  };

  if (!mounted && !isOpen) return null;

  const subtotal = totalAmount;
  const freeShippingThreshold = 300; 
  const progress = Math.min((subtotal / freeShippingThreshold) * 100, 100);
  const remainingForFreeShip = freeShippingThreshold - subtotal;

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end">
      
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-[#0a110e]/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div 
        className={`relative w-full max-w-[420px] bg-white h-full shadow-2xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        
        {/* --- HEADER --- */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white z-10 shrink-0">
          <div>
            <h2 className="text-2xl font-serif text-[#0a110e] tracking-tight">Your Nook</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              {cartItems.length} {cartItems.length === 1 ? 'ITEM' : 'ITEMS'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="group w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-[#0a110e] transition-all duration-300"
          >
            <i className="fa-solid fa-xmark text-sm group-hover:rotate-90 transition-transform duration-300"></i>
          </button>
        </div>

        {/* --- SCROLLABLE CONTENT --- */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-hide">
          
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-80">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-2 border border-dashed border-gray-200">
                <i className="fa-solid fa-bag-shopping text-3xl text-gray-300"></i>
              </div>
              <div>
                <h3 className="text-xl font-serif text-[#0a110e] mb-2">Your Bag is Empty</h3>
                <p className="text-sm text-gray-500 max-w-[220px] mx-auto leading-relaxed">
                  Looks like you haven't discovered your perfect piece yet.
                </p>
              </div>
              <button 
                onClick={() => {
                  onClose();
                  navigate('/products');
                }}
                className="px-8 py-3.5 bg-[#0a110e] text-white text-xs font-bold uppercase tracking-[0.15em] rounded-full hover:bg-[#1a2b24] transition-all duration-300"
              >
                Start Exploring
              </button>
            </div>
          ) : (
            <>
              {/* Items List */}
              <div className="space-y-6">
                {cartItems.map((item) => {
                  // Mongoose bug safe extraction
                  const itemQty = typeof item.quantity === 'object' ? Number(item.quantity?.quantity || 0) : Number(item.quantity || 0);
                  const itemColor = item.selectedColor || 'N/A';

                  return (
                    <div key={`${item.id}-${itemColor}`} className="flex items-stretch gap-4 group relative pb-6 border-b border-gray-50 last:border-0 last:pb-0">
                      
                      {/* Image */}
                      <div className="w-[85px] h-[85px] bg-gray-50 rounded-2xl overflow-hidden shrink-0 relative border border-gray-100 flex items-center justify-center">
                        <Suspense fallback={<div className="w-full h-full bg-gray-100 animate-pulse"></div>}>
                          <OptimizedImage
                            src={item.image || '/placeholder.jpg'}
                            alt={item.name}
                            className="w-full h-full object-contain mix-blend-multiply"
                            loading="lazy"
                          />
                        </Suspense>
                      </div>
                      
                      {/* Details */}
                      <div className="flex-1 flex flex-col min-w-0 justify-between min-h-[85px]">
                        
                        <div>
                          {/* Name & Delete */}
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="text-base font-serif text-[#0a110e] leading-snug pr-4 hover:text-emerald-700 transition-colors cursor-pointer">
                              {item.name}
                            </h4>
                            <button 
                              onClick={() => handleRemoveItem(item.id, itemColor, item.mongoId)}
                              className="text-gray-300 hover:text-red-500 transition-colors p-1 -mt-1 -mr-1 shrink-0"
                              title="Remove Item"
                            >
                              <i className="fa-regular fa-trash-can text-sm"></i>
                            </button>
                          </div>
                          
                          <p className="text-xs text-gray-400 mt-1 font-medium tracking-wide">
                            {item.category || "Standard Variant"}
                          </p>

                          {/* Color Selection (If Exists) */}
                          {item.selectedColor && item.selectedColor !== 'N/A' && (
                            <div className="flex items-center gap-1.5 mb-2">
                              <div 
                                className="w-2.5 h-2.5 rounded-full border border-gray-200 shadow-sm"
                                style={{ 
                                  background: item.selectedColor.toLowerCase() === 'rainbow' 
                                    ? 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)' 
                                    : item.selectedColor.replace(/\s+/g, '').toLowerCase() 
                                }}
                              ></div>
                              <span className="text-xs text-gray-400 mt-1 font-medium tracking-wide">{item.selectedColor}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          {/* Quantity Controls - Exact match to your screenshot inspector */}
                          <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-full h-8 px-3 shadow-sm">
                            <button 
                              onClick={() => handleQuantityChange(item.id, itemColor, Math.max(0, itemQty - 1), item.mongoId, itemQty, item.image)}
                              className="w-4 h-full flex items-center justify-center text-gray-400 hover:text-[#0a110e] transition-colors"
                            >
                              <i className="fa-solid fa-minus text-[10px]"></i>
                            </button>
                            <span className="text-xs font-bold text-[#0a110e] min-w-[12px] text-center">
                              {itemQty}
                            </span>
                            <button 
                              onClick={() => handleQuantityChange(item.id, itemColor, itemQty + 1, item.mongoId, itemQty, item.image)}
                              className="w-4 h-full flex items-center justify-center text-gray-400 hover:text-[#0a110e] transition-colors"
                            >
                              <i className="fa-solid fa-plus text-[10px]"></i>
                            </button>
                          </div>

                          {/* Price */}
                          <p className="text-sm font-bold text-[#0a110e]">₹{item.price?.toLocaleString()}</p>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* --- FOOTER (CHECKOUT) --- */}
        {cartItems?.length > 0 && (
          <div className="px-6 py-6 bg-white border-t border-gray-100 z-10 shrink-0">
            <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span className="font-medium text-[#0a110e]">₹{subtotal?.toLocaleString()}</span>
                </div>
                <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-base font-serif text-[#0a110e]">Total</span>
                    <span className="text-xl font-bold text-[#0a110e]">₹{subtotal?.toLocaleString()}</span>
                </div>
            </div>

            <button 
              onClick={handleCheckout}
              className="w-full py-4 bg-[#0a110e] text-white rounded-full font-bold uppercase tracking-[0.15em] text-[10px] hover:bg-[#1a2b24] transition-all duration-300 active:scale-[0.98] flex items-center justify-between px-6"
            >
                <span>Proceed to Checkout</span>
                <i className="fa-solid fa-arrow-right-long"></i>
            </button>
            <div className="mt-4 flex justify-center items-center gap-1.5 text-[9px] text-gray-400 uppercase tracking-widest font-bold">
                <i className="fa-solid fa-lock"></i>
                <span>Secure Checkout</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CartDrawer;