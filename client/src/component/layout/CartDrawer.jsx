import { useEffect, useState, lazy, Suspense } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useUpdateCartMutation } from '../../store/api/userApi';
import { updateQuantity, removeItem } from '../../store/slices/cartSlice';
import { setShowLoginModal, setLoginCallback } from '../../store/slices/uiSlice';
import { trackViewCart, trackRemoveFromCart, track } from '../../utils/analytics';

const OptimizedImage = lazy(() => import('../OptimizedImage'));

const CartDrawer = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [mounted, setMounted] = useState(false);

  const { items: cartItems, totalAmount } = useSelector((state) => state.cart);
  const { isAuthenticated } = useSelector((state) => state.auth);

  const [updateCart] = useUpdateCartMutation();

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

  const subtotal = totalAmount;

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end font-inter text-ink">

      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-ink/50 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className={`relative w-full max-w-[430px] bg-paper h-full shadow-2xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >

        {/* --- HEADER --- */}
        <div className="px-5 py-4 border-b border-hair flex items-center justify-between shrink-0">
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-xl font-extrabold tracking-tight">Your Cart</h2>
            <span className="gl-lbl text-brand text-[11px]">{cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close cart"
            className="w-9 h-9 rounded-full border border-hair grid place-items-center text-muted hover:border-ink hover:text-ink transition-colors"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* --- SCROLLABLE CONTENT --- */}
        <div className="flex-1 overflow-y-auto px-5 py-5 scrollbar-hide">

          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-5">
              <div className="w-20 h-20 rounded-full bg-brand/10 grid place-items-center">
                <i className="fa-solid fa-bag-shopping text-2xl text-brand" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold mb-1">Your cart is empty</h3>
                <p className="text-sm text-muted max-w-[240px] mx-auto leading-relaxed">Add a piece you love — it'll show up here.</p>
              </div>
              <button
                onClick={() => { onClose(); navigate('/products'); }}
                className="gl-press bg-brand text-white text-sm font-bold px-7 py-3 rounded-xl hover:bg-brandHi transition-colors"
              >
                Start shopping
              </button>
            </div>
          ) : (
            <div className="divide-y divide-hair">
              {cartItems.map((item) => {
                const itemQty = typeof item.quantity === 'object' ? Number(item.quantity?.quantity || 0) : Number(item.quantity || 0);
                const itemId = item.mongoId || item.productId || item.id;
                const variant = item.selectedVariant && item.selectedVariant !== 'N/A' ? item.selectedVariant : null;

                return (
                  <div key={`${itemId}-${item.selectedVariant || 'N/A'}`} className="flex gap-4 py-4 first:pt-0">

                    {/* Image */}
                    <button
                      onClick={() => { onClose(); navigate(`/product/${item.productId || itemId}`); }}
                      className="w-20 h-20 rounded-xl overflow-hidden border border-hair bg-surface shrink-0"
                      aria-label={`View ${item.name}`}
                    >
                      <Suspense fallback={<div className="w-full h-full bg-hair animate-pulse" />}>
                        <OptimizedImage
                          src={item.image || '/placeholder.jpg'}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </Suspense>
                    </button>

                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold leading-snug line-clamp-2 pr-1 hover:text-brand transition-colors cursor-pointer"
                          onClick={() => { onClose(); navigate(`/product/${item.productId || itemId}`); }}>
                          {item.name}
                        </h4>
                        <button
                          onClick={() => handleRemoveItem(itemId, item.selectedVariant, item.mongoId)}
                          aria-label="Remove item"
                          className="shrink-0 -mt-0.5 -mr-1 p-1 text-faint hover:text-brand transition-colors"
                          title="Remove"
                        >
                          <i className="fa-regular fa-trash-can text-xs" />
                        </button>
                      </div>

                      {variant && <p className="text-[11px] text-muted mt-0.5 font-semibold uppercase tracking-wide">{variant}</p>}

                      <div className="mt-auto pt-2.5 flex items-center justify-between">
                        {/* Quantity */}
                        <div className="flex items-center border border-hair rounded-full h-8">
                          <button
                            onClick={() => handleQuantityChange(itemId, item.selectedVariant, Math.max(0, itemQty - 1), item.mongoId, itemQty, item.image)}
                            className="w-8 h-full grid place-items-center text-muted hover:text-brand transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <i className="fa-solid fa-minus text-[10px]" />
                          </button>
                          <span className="min-w-[20px] text-center text-xs font-bold tabular-nums">{itemQty}</span>
                          <button
                            onClick={() => handleQuantityChange(itemId, item.selectedVariant, itemQty + 1, item.mongoId, itemQty, item.image)}
                            className="w-8 h-full grid place-items-center text-muted hover:text-brand transition-colors"
                            aria-label="Increase quantity"
                          >
                            <i className="fa-solid fa-plus text-[10px]" />
                          </button>
                        </div>

                        <p className="text-sm font-extrabold">₹{(Number(item.price) || 0).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* --- FOOTER (CHECKOUT) --- */}
        {cartItems?.length > 0 && (
          <div className="px-5 py-5 border-t border-hair shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Subtotal</span>
              <span className="text-xl font-extrabold">₹{(Number(subtotal) || 0).toLocaleString('en-IN')}</span>
            </div>
            <p className="text-[11px] text-muted mt-1 mb-4">Shipping calculated at checkout.</p>

            {/* COD availability notice */}
            <div className="flex items-center gap-2.5 bg-surface border border-hair rounded-xl px-4 py-3 mb-4">
              <i className="fa-solid fa-hand-holding-dollar text-brand text-base shrink-0" />
              <div>
                <p className="text-[11px] font-bold">Cash on Delivery available</p>
                <p className="text-[10px] text-muted mt-0.5 leading-snug">Pay a small advance online · rest at your door</p>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              className="gl-press w-full h-12 bg-brand text-white rounded-xl font-bold text-sm hover:bg-brandHi transition-colors flex items-center justify-center gap-2"
            >
              Proceed to Checkout <i className="fa-solid fa-arrow-right-long text-xs" />
            </button>
            <div className="mt-3 flex justify-center items-center gap-1.5 text-[10px] text-faint font-bold uppercase tracking-widest">
              <i className="fa-solid fa-lock" /> Secure Checkout
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CartDrawer;
