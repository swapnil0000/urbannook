import { useEffect, useState, lazy, Suspense } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useUpdateCartMutation } from '../../store/api/userApi';

const OptimizedImage = lazy(() => import('../OptimizedImage'));

const CartDrawer = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  
  // Get cart items from Redux store
  const { items: cartItems, totalAmount } = useSelector((state) => state.cart);
  const { isAuthenticated } = useSelector((state) => state.auth);
  
  const [updateCart] = useUpdateCartMutation();

  // Handle animation mounting
useEffect(() => {
    // Agar drawer open ho raha hai
    if (isOpen) {
      setMounted(true);
      document.body.style.overflow = 'hidden'; // Scroll rok do
      
      // Cleanup function: Jab drawer close ho, style ko wapas normal kar do
      return () => {
        document.body.style.overflow = ''; 
      };
    } 
    // Agar drawer close ho raha hai (ya initially closed hai)
    else {
      const timer = setTimeout(() => setMounted(false), 300);
      // Yahan humne style ko touch nahi kiya, taaki initial load pe jhatka na lage
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleQuantityChange = async (productId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveItem(productId);
      return;
    }

    try {
      // Find the item to get mongoId and current quantity for backend sync
      const item = cartItems.find(item => item.id === productId);
      const mongoId = item?.mongoId || productId;
      const currentQty = item?.quantity || 0;
      
      // Determine action based on quantity change
      const action = newQuantity > currentQty ? 'add' : 'sub';
      
      // Call API with quantity=1 (the amount to change, not the new total)
      // RTK Query will automatically invalidate and refetch
      await updateCart({ productId: mongoId, quantity: 1, action }).unwrap();
    } catch (error) {
      console.error('Failed to update cart:', error);
      // Revert local state on error
      window.location.reload();
    }
  };

  const handleRemoveItem = async (productId) => {
    try {
      // Find the item to get mongoId for backend sync
      const item = cartItems.find(item => item.id === productId);
      const mongoId = item?.mongoId || productId;
      
      // Call API with action='remove' (quantity is ignored by backend for remove action)
      // RTK Query will automatically invalidate and refetch
      await updateCart({ productId: mongoId, quantity: 1, action: 'remove' }).unwrap();
    } catch (error) {
      console.error('Failed to remove item:', error);
      // Revert local state on error
      window.location.reload();
    }
  };
  
  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  if (!mounted && !isOpen) return null;

  const subtotal = totalAmount;
  // UPDATED: Threshold changed to 300
  const freeShippingThreshold = 300; 
  const progress = Math.min((subtotal / freeShippingThreshold) * 100, 100);
  const remainingForFreeShip = freeShippingThreshold - subtotal;

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end">
      
      {/* Backdrop (Darker & Blurring for focus) */}
      <div 
        className={`absolute inset-0 bg-[#0a110e]/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div 
        className={`relative w-full max-w-[400px] bg-white h-full shadow-2xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        
        {/* --- HEADER --- */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white z-10">
          <div>
            <h2 className="text-2xl font-serif text-[#0a110e] tracking-tight">Your Nook</h2>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mt-1">
              {cartItems.length} {cartItems.length === 1 ? 'Item' : 'Items'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="group w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-[#0a110e] hover:border-[#0a110e] hover:text-white transition-all duration-300"
          >
            <i className="fa-solid fa-xmark text-lg group-hover:rotate-90 transition-transform duration-300"></i>
          </button>
        </div>

        {/* --- SCROLLABLE CONTENT --- */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
          
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
                className="px-8 py-3.5 bg-[#0a110e] text-white text-xs font-bold uppercase tracking-[0.15em] rounded-full hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-900/20 transition-all duration-300"
              >
                Start Exploring
              </button>
            </div>
          ) : (
            <>

              {/* Items List */}
              <div className="space-y-8">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-5 group relative">
                    
                    {/* Image */}
                    <div className="w-24 h-28 bg-gray-50 rounded-lg overflow-hidden shrink-0 relative border border-gray-100">
                      <Suspense fallback={<div className="w-full h-full bg-gray-200 animate-pulse"></div>}>
                        <OptimizedImage
                          src={item.image || '/placeholder.jpg'}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </Suspense>
                    </div>
                    
                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <div className="flex justify-between items-start">
                             <h4 className="text-base font-serif text-[#0a110e] leading-snug pr-4 hover:text-emerald-700 transition-colors cursor-pointer">
                                {item.name}
                             </h4>
                             {/* Remove Button (Top Right) */}
                             <button 
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-gray-300 hover:text-red-500 transition-colors p-1"
                             >
                                <i className="fa-regular fa-trash-can text-sm"></i>
                             </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 font-medium tracking-wide">Standard Variant</p>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        {/* Quantity UI */}
                        <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-full h-8 px-3 shadow-sm">
                          <button 
                            onClick={() => handleQuantityChange(item.id, Math.max(0, item.quantity - 1))}
                            className="text-gray-400 hover:text-[#0a110e] transition-colors w-4 flex justify-center"
                          >
                            <i className="fa-solid fa-minus text-[10px]"></i>
                          </button>
                          <span className="text-xs font-bold text-[#0a110e] min-w-[12px] text-center">{item.quantity}</span>
                          <button 
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            className="text-gray-400 hover:text-[#0a110e] transition-colors w-4 flex justify-center"
                          >
                            <i className="fa-solid fa-plus text-[10px]"></i>
                          </button>
                        </div>

                        <p className="text-sm font-bold text-[#0a110e]">₹{item.price?.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* --- FOOTER (CHECKOUT) --- */}
        {cartItems?.length > 0 && (
          <div className="p-6 bg-white border-t border-gray-100 z-10 shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
            <div className="space-y-2 mb-6">
                <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>Subtotal</span>
                    <span className="font-medium text-[#0a110e]">₹{subtotal?.toLocaleString()}</span>
                </div>
                <div className="pt-4 border-t border-gray-100 flex justify-between items-end">
                    <span className="text-base font-serif text-[#0a110e]">Total</span>
                    <span className="text-xl font-bold text-[#0a110e]">₹{subtotal?.toLocaleString()}</span>
                </div>
            </div>

            <button 
              onClick={handleCheckout}
              className="w-full py-4 bg-[#0a110e] text-white rounded-full font-bold uppercase tracking-[0.15em] text-xs hover:bg-emerald-800 transition-all duration-300 shadow-lg hover:shadow-emerald-900/30 active:scale-[0.98] flex items-center justify-center gap-3"
            >
                <span>Proceed to Checkout</span>
                <i className="fa-solid fa-arrow-right-long"></i>
            </button>
            <div className="mt-4 flex justify-center items-center gap-2 text-[10px] text-gray-400 uppercase tracking-widest">
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