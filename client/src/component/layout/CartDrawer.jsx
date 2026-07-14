import { useEffect, useState, lazy, Suspense } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  useUpdateCartMutation,
  useEvaluateCartRulesQuery,
  useGetFreeShippingOfferQuery,
  useGetAllFreeShippingBannersQuery,
} from '../../store/api/userApi';
import { updateQuantity, removeItem } from '../../store/slices/cartSlice';
import { setShowLoginModal, setLoginCallback } from '../../store/slices/uiSlice';
import { trackViewCart, trackRemoveFromCart, track } from '../../utils/analytics';
import { computeLineDiscount } from '../../utils/cartRules';

const OptimizedImage = lazy(() => import('../OptimizedImage'));

const CartDrawer = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [mounted, setMounted] = useState(false);
  
  const { items: cartItems, totalAmount } = useSelector((state) => state.cart);
  const { isAuthenticated } = useSelector((state) => state.auth);

  const [updateCart] = useUpdateCartMutation();

  // Generic, data-driven cart-promotion rules (server/src/model/cartRule.model.js)
  // — same evaluator the payment controller uses for the real order total.
  // Needed here so the drawer's own price display doesn't disagree with
  // checkout/the actual charge (previously it never checked this at all,
  // so a discounted item like Pen Stand at 2+ Lamps still showed ₹299 here).
  const cartRuleEvalItems = cartItems
    .map((item) => ({
      productId: item.mongoId || item.id,
      quantity: typeof item.quantity === 'object' ? Number(item.quantity?.quantity || 0) : Number(item.quantity || 0),
    }))
    .filter((i) => i.productId && i.quantity > 0);
  const { data: cartRuleEvalData } = useEvaluateCartRulesQuery(cartRuleEvalItems, {
    skip: cartRuleEvalItems.length === 0,
  });

  // Free-shipping eligibility for the "Shipping" line below — mirrors the
  // same OR logic used at checkout/payment (rp.payment.controller.js): the
  // admin combo-banner offer, any active generic cart rule's free_shipping
  // effect, or the plain cart-value threshold. Previously this drawer never
  // showed shipping status at all, so the customer only found out at checkout.
  const { data: offerRes } = useGetFreeShippingOfferQuery();
  const { data: bannersRes } = useGetAllFreeShippingBannersQuery();
  // ₹ knocked off a whole line by a matched rule. Shared helper mirrors the
  // server exactly, including the rule's discounted-unit cap — so a 2nd Pen
  // Stand is shown (and charged) at full price, not another ₹150.
  const getItemLineDiscount = (item) =>
    computeLineDiscount(
      item.price,
      item.quantity,
      cartRuleEvalData?.data?.discounts?.[item.mongoId || item.id],
    );

  // Map a cart line item → analytics item shape
  const toTrackItem = (item) => ({
    itemId: item.productId || item.id || item.mongoId,
    itemName: item.name,
    itemVariant: item.selectedVariant,
    price: Number(item.price) || 0,
    quantity: typeof item.quantity === 'object' ? Number(item.quantity?.quantity || 0) : Number(item.quantity || 0),
  });

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

  // Fire view_cart when the drawer opens with items in it
  useEffect(() => {
    if (isOpen && cartItems.length > 0) {
      trackViewCart({ value: Number(totalAmount) || 0, items: cartItems.map(toTrackItem) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleQuantityChange = async (productId, selectedVariant, newQuantity, mongoId, currentQty, image) => {
    const effectiveVariant = selectedVariant || 'N/A';
    if (newQuantity <= 0) {
      handleRemoveItem(productId, effectiveVariant, mongoId);
      return;
    }

    track('quantity_changed', {
      item_id: productId,
      old_quantity: currentQty,
      new_quantity: newQuantity,
      placement: 'cart_drawer',
    });

    const hasToken = !!localStorage.getItem('authToken');
    const isLoggedIn = isAuthenticated || hasToken;

    if (isLoggedIn) {
      try {
        const action = newQuantity > currentQty ? 'add' : 'sub';
        await updateCart({ productId: mongoId || productId, quantity: 1, action, variant: effectiveVariant, image }).unwrap();
      } catch (error) {
        console.error('Failed to update cart:', error);
      }
    } else {
      dispatch(updateQuantity({ id: productId, quantity: newQuantity, selectedVariant: effectiveVariant }));
    }
  };

  const handleRemoveItem = async (productId, selectedVariant, mongoId) => {
    const effectiveVariant = selectedVariant || 'N/A';

    const removed = cartItems.find(
      (i) => (i.mongoId || i.productId || i.id) === (mongoId || productId) &&
             (i.selectedVariant || 'N/A') === effectiveVariant
    );
    if (removed) trackRemoveFromCart(toTrackItem(removed));

    const hasToken = !!localStorage.getItem('authToken');
    const isLoggedIn = isAuthenticated || hasToken;

    if (isLoggedIn) {
      try {
        await updateCart({ productId: mongoId || productId, quantity: 1, action: 'remove', variant: effectiveVariant }).unwrap();
      } catch (error) {
        console.error('Failed to remove item:', error);
      }
    } else {
      dispatch(removeItem({ id: productId, selectedVariant: effectiveVariant }));
    }
  };
  
  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  if (!mounted && !isOpen) return null;

  // totalAmount (Redux) doesn't know about cart-rule discounts — subtract
  // the same savings the line-item prices above already reflect, so the
  // drawer's own subtotal/total never disagrees with what checkout charges.
  const ruleDiscountSavings = cartItems.reduce((sum, item) => sum + getItemLineDiscount(item), 0);
  const subtotal = totalAmount - ruleDiscountSavings;

  // Same three-path eligibility used at checkout: admin combo banner (source
  // + recommended product both in cart), any active generic cart rule whose
  // effects include free_shipping, or the plain cart-value threshold.
  const offerConfig = offerRes?.data;
  const banners = bannersRes?.data || [];
  const cartProductIds = new Set(cartItems.map((i) => i.mongoId || i.id));
  const comboEligible =
    !!offerConfig?.isActive &&
    banners.some((b) => cartProductIds.has(b.sourceProductId) && cartProductIds.has(b.recommendedProductId));
  const thresholdEligible =
    !!offerConfig?.isActive && (offerConfig?.thresholdAmount || 0) > 0 && subtotal >= offerConfig.thresholdAmount;
  const isFreeShippingEligible = comboEligible || !!cartRuleEvalData?.data?.freeShipping || thresholdEligible;

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
                  const itemId = item.mongoId || item.productId || item.id;

                  return (
                    <div key={`${itemId}-${item.selectedVariant || 'N/A'}`} className="flex items-stretch gap-4 group relative pb-6 border-b border-gray-50 last:border-0 last:pb-0">
                      
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
                              onClick={() => handleRemoveItem(itemId, item.selectedVariant, item.mongoId)}
                              className="text-gray-300 hover:text-red-500 transition-colors p-1 -mt-1 -mr-1 shrink-0"
                              title="Remove Item"
                            >
                              <i className="fa-regular fa-trash-can text-sm"></i>
                            </button>
                          </div>
                          
                          <p className="text-xs text-gray-400 mt-1 font-medium tracking-wide">
                            {item.category || "Standard Variant"}
                          </p>

                          {/* Variant Selection (If Exists) */}
                          {(() => {
                            const itemVariant = item.selectedVariant || 'N/A';
                            if (!itemVariant || itemVariant === 'N/A') return null;

                            return (
                              <div className="flex items-center gap-1.5 mb-2">
                                <div 
                                  className="w-2.5 h-2.5 rounded-full border border-gray-200 shadow-sm"
                                  style={{ 
                                    background: itemVariant.toLowerCase() === 'rainbow' 
                                      ? 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)' 
                                      : itemVariant.replace(/\s+/g, '').toLowerCase() 
                                  }}
                                ></div>
                                <span className="text-xs text-gray-400 mt-1 font-medium tracking-wide">{itemVariant}</span>
                              </div>
                            );
                          })()}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          {/* Quantity Controls - Exact match to your screenshot inspector */}
                          <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-full h-8 px-3 shadow-sm">
                            <button 
                              onClick={() => handleQuantityChange(itemId, item.selectedVariant, Math.max(0, itemQty - 1), item.mongoId, itemQty, item.image)}
                              className="w-4 h-full flex items-center justify-center text-gray-400 hover:text-[#0a110e] transition-colors"
                            >
                              <i className="fa-solid fa-minus text-[10px]"></i>
                            </button>
                            <span className="text-xs font-bold text-[#0a110e] min-w-[12px] text-center">
                              {itemQty}
                            </span>
                            <button 
                              onClick={() => handleQuantityChange(itemId, item.selectedVariant, itemQty + 1, item.mongoId, itemQty, item.image)}
                              className="w-4 h-full flex items-center justify-center text-gray-400 hover:text-[#0a110e] transition-colors"
                            >
                              <i className="fa-solid fa-plus text-[10px]"></i>
                            </button>
                          </div>

                          {/* LINE total (unit price × qty, minus any rule
                              discount) — not a per-unit price. A rule may
                              discount only some units of the line (one Pen
                              Stand at 50% off, a second at full price), which
                              no single unit price can express. */}
                          {(() => {
                            const rawPrice = Number(item.price) || 0;
                            // `itemQty` here is the local numeric quantity
                            // computed above in this map scope, not a function.
                            const lineRaw = rawPrice * itemQty;
                            const lineDiscount = getItemLineDiscount(item);
                            const percentOff =
                              lineDiscount > 0 ? Math.round((lineDiscount / lineRaw) * 100) : 0;
                            return lineDiscount > 0 ? (
                              <div className="text-right">
                                <p className="text-sm font-bold text-[#157a44]">₹{(lineRaw - lineDiscount).toLocaleString()}</p>
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-[10px] text-gray-400 line-through">₹{lineRaw.toLocaleString()}</span>
                                  <span className="text-[9px] font-bold uppercase rounded-full bg-[#157a44] text-white px-1.5 py-px">
                                    {percentOff}% OFF
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm font-bold text-[#0a110e]">₹{lineRaw.toLocaleString()}</p>
                            );
                          })()}
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
                    <span className="font-medium text-[#0a110e]">₹{(Number(subtotal) || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center gap-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    <span className="shrink-0">Shipping</span>
                    {isFreeShippingEligible ? (
                      <span className="font-extrabold text-green-600 text-right">Free</span>
                    ) : (
                      <span className="font-medium normal-case tracking-normal text-gray-500 text-right">Calculated at checkout</span>
                    )}
                </div>
                <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-base font-serif text-[#0a110e]">Total</span>
                    <span className="text-xl font-bold text-[#0a110e]">₹{(Number(subtotal) || 0).toLocaleString()}</span>
                </div>
            </div>

            {/* COD availability notice */}
            <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-4">
              <i className="fa-solid fa-hand-holding-dollar text-amber-500 text-base shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-amber-800">Cash on Delivery available</p>
                <p className="text-[10px] text-amber-600 mt-0.5 leading-snug">Pay a small advance online · rest at your door</p>
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