import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useCookies } from 'react-cookie';
import { motion, AnimatePresence } from 'framer-motion';

// API & Redux imports
import { useGetProductByIdQuery } from '../../store/api/productsApi';
import { useAddToCartMutation, userApi, useUpdateCartMutation, useAddToWishlistMutation, useRemoveFromWishlistMutation } from '../../store/api/userApi';
import { addItem, updateQuantity } from '../../store/slices/cartSlice';
import { addToWishlistLocal, removeFromWishlistLocal } from '../../store/slices/wishlistSlice';

const ProductDetailPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // 1. Auth & Cookies
  const [cookies] = useCookies(['userAccessToken']);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const cartItems = useSelector((state) => state.cart.items);

  // 2. Local UI States
  const [activeAccordion, setActiveAccordion] = useState('description');
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // 3. API Hooks
  const { data: productResponse, isLoading, error } = useGetProductByIdQuery(productId);
  const [addToCartAPI, { isLoading: isAdding }] = useAddToCartMutation();
  const [updateCart] = useUpdateCartMutation();
  const [addToWishlist] = useAddToWishlistMutation();
  const [removeFromWishlist] = useRemoveFromWishlistMutation();

  const product = productResponse?.data;

  // 4. Derived State
  const cartItem = cartItems.find(item => String(item.id) === String(product?.productId));
  const isInCart = !!cartItem;
  const currentCartQty = cartItem?.quantity || 0;
  const wishlistItems = useSelector((state) => state.wishlist.items);
  const isInWishlist = wishlistItems.some(item => item.productName === product?.productName);

  // MOCK GALLERY
  const galleryImages = product?.productImg 
    ? [product.productImg, product.productImg, product.productImg] 
    : [];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 5. Image Zoom Handler
  const handleMouseMove = (e) => {
    if (!isZoomed) return;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setMousePos({ x, y });
  };

  // Slider Handlers
  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % galleryImages.length);
  };
  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  // 6. Logic: Add to Cart / Update / Checkout
  const handleInitialAddToCart = async () => {
    if (!product) return;
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };
    
    const token = getCookie('userAccessToken') || cookies.userAccessToken;
    const hasLocalUser = localStorage.getItem('user');
    
    if (!isAuthenticated && !token && !hasLocalUser) {
      alert('Please login to add items to cart');
      return;
    }

    try {
      await addToCartAPI({ productId: product?.productId, quantity: 1 }).unwrap();

      dispatch(addItem({
        id: product.productId,
        mongoId: product.productId,
        name: product.productName,
        price: product.sellingPrice,
        image: product.productImg,
        quantity: 1
      }));
      
      dispatch(userApi?.util?.invalidateTags(['User']));
      setFeedbackMessage("Added");
      setTimeout(() => setFeedbackMessage(""), 2000);
    } catch (err) {
      alert(err.data?.message || "Something went wrong");
    }
  };

  const handleUpdateQty = async (newQuantity) => {
    if (newQuantity < 1) return;
    try {
      const action = newQuantity > currentCartQty ? 'add' : 'remove';
      await updateCart({ productId: product.productId, quantity: newQuantity, action:action }).unwrap();
      dispatch(updateQuantity({ id: product.productId, quantity: newQuantity }));
      dispatch(userApi.util.invalidateTags(['User']));
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  const handleCheckoutClick = () => {
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };
    const token = getCookie('userAccessToken') || cookies.userAccessToken;
    const hasLocalUser = localStorage.getItem('user');
    if (isAuthenticated || token || hasLocalUser) {
      navigate('/checkout');
    } else {
      alert('Please login to proceed to checkout');
    }
  };

  const handleWishlistToggle = async () => {
    try {
      if (isInWishlist) {
        await removeFromWishlist(product.productName).unwrap();
        dispatch(removeFromWishlistLocal(product.productName));
        dispatch(userApi.util.invalidateTags(['User']));
        setFeedbackMessage("Removed from wishlist");
      } else {
        await addToWishlist({ productId: product.productName }).unwrap();
        dispatch(addToWishlistLocal(product.productName));
        setFeedbackMessage("Added to wishlist");
      }
      setTimeout(() => setFeedbackMessage(""), 2000);
    } catch (error) {
      console.error('Failed to toggle wishlist:', error);
    }
  };

  // Animation Variants
  const fadeIn = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } } };

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center bg-[#1c3026]">
      <div className="w-16 h-16 border border-[#F5DEB3] rounded-full animate-spin border-t-transparent"></div>
    </div>
  );
  
  if (error || !product) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#1c3026] text-[#F5DEB3]">
      <h1 className="text-4xl font-serif">Product Not Found</h1>
      <button onClick={() => navigate('/products')} className="mt-4 border-b border-[#F5DEB3] pb-1 hover:text-white transition-colors">Return to Shop</button>
    </div>
  );

  return (
    <div className="bg-[#2e443c] min-h-screen font-sans text-gray-200 selection:bg-[#F5DEB3] selection:text-[#1c3026] relative overflow-hidden">

      {/* Lighting Effect */}
      <div className="fixed top-0 left-0 w-[800px] h-[800px] bg-[#2e443c] rounded-full blur-[150px] pointer-events-none opacity-40"></div>

      {/* Main Container 
         - Mobile: pt-20 (Header space) pb-32 (Space for sticky bottom bar)
         - Desktop: Standard padding
      */}
      <main className="max-w-[1400px] mx-auto pt-24 pb-32 lg:pt-36 lg:pb-20 px-4 lg:px-12 relative z-10">
        
        {/* Breadcrumbs (Simple Back on Mobile) */}
        <motion.nav 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="flex items-center text-[10px] tracking-[0.2em] uppercase text-[#F5DEB3]/50 mb-6 lg:mb-12 cursor-pointer"
        >
          <span onClick={() => navigate('/products')} className="flex items-center gap-2 hover:text-[#F5DEB3] transition-colors">
             <i className="fa-solid fa-arrow-left lg:hidden"></i>
             <span>Shop</span>
          </span>
          <span className="mx-3 text-[#F5DEB3]/20 hidden lg:inline">/</span>
          <span className="text-[#F5DEB3] font-bold border-b border-[#F5DEB3]/30 pb-0.5 hidden lg:inline">{product.productName}</span>
        </motion.nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-20 items-start">
          
          {/* --- LEFT: IMAGE GALLERY --- */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-7 w-full lg:sticky lg:top-36"
          >
            {/* Main Image Card */}
            <div className="relative aspect-[4/5] bg-[#e8e6e1] rounded-[2rem] lg:rounded-[2rem] overflow-hidden shadow-2xl shadow-black/30 group">
                
                {/* Product Image */}
                <div 
                  className="w-full h-full relative cursor-zoom-in flex items-center justify-center"
                  onMouseEnter={() => setIsZoomed(true)}
                  onMouseLeave={() => setIsZoomed(false)}
                  onMouseMove={handleMouseMove}
                >
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={currentImageIndex}
                      src={galleryImages[currentImageIndex] || '/placeholder.jpg'}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, scale: isZoomed ? 1.4 : 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="w-full h-full object-contain p-6 md:p-8 mix-blend-multiply" 
                      style={isZoomed ? { transformOrigin: `${mousePos.x}% ${mousePos.y}%` } : {}}
                    />
                  </AnimatePresence>
                </div>

                {/* Slider Arrows (Visible on Desktop hover, Always visible on Mobile tap areas) */}
                {galleryImages.length > 0 && (
                  <>
                    <button 
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-[#1c3026]/10 flex items-center justify-center text-[#1c3026] bg-white/20 backdrop-blur-sm hover:bg-[#1c3026] hover:text-[#F5DEB3] transition-all z-20"
                    >
                      <i className="fa-solid fa-arrow-left text-sm"></i>
                    </button>
                    <button 
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-[#1c3026]/10 flex items-center justify-center text-[#1c3026] bg-white/20 backdrop-blur-sm hover:bg-[#1c3026] hover:text-[#F5DEB3] transition-all z-20"
                    >
                      <i className="fa-solid fa-arrow-right text-sm"></i>
                    </button>
                  </>
                )}
            </div>

            {/* Thumbnail Strip (Hidden on very small screens to save space, visible md+) */}
            <div className="flex gap-3 mt-6 overflow-x-auto pb-2 justify-center lg:justify-start px-2">
                {galleryImages.map((img, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-16 h-16 lg:w-20 lg:h-20 rounded-xl border bg-[#e8e6e1] overflow-hidden transition-all flex-shrink-0 ${
                      currentImageIndex === idx 
                      ? 'border-[#F5DEB3] ring-2 ring-[#F5DEB3]/30 scale-105' 
                      : 'border-transparent opacity-60'
                    }`}
                  >
                    <img src={img} className="w-full h-full object-contain p-1 mix-blend-multiply" alt="thumb" />
                  </button>
                ))}
            </div>
          </motion.div>

          {/* --- RIGHT: PRODUCT INFO --- */}
          <motion.div 
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="lg:col-span-5 flex flex-col"
          >
            <div className="mb-6 lg:mb-8 border-b border-[#F5DEB3]/10 pb-6 lg:pb-8">
              <div className="flex justify-between items-start mb-4">
                 <span className="text-[#1c3026] text-[9px] lg:text-[10px] font-bold tracking-[0.2em] uppercase bg-[#F5DEB3] px-3 py-1.5 rounded-full shadow-lg shadow-[#F5DEB3]/10">
                    {product.productCategory || 'Featured'}
                 </span>
                 
                 {/* Mobile Rating */}
                 <div className="flex text-[#F5DEB3] text-xs gap-1 items-center bg-white/5 px-3 py-1 rounded-full">
                      <i className="fa-solid fa-star text-[10px]"></i>
                      <span className="ml-1 text-gray-300 font-mono text-[10px]">4.8</span>
                  </div>
              </div>

              <h1 className="text-3xl lg:text-6xl font-serif text-[#F5DEB3] leading-tight mb-4">
                {product.productName}
              </h1>
              
              <div className="flex items-baseline gap-4">
                  <p className="text-2xl lg:text-3xl font-light text-white">₹{product.sellingPrice?.toLocaleString()}</p>
                  <p className="text-sm text-gray-500 line-through">₹{(product.sellingPrice * 1.2).toFixed(0)}</p>
              </div>
            </div>

            {/* Description */}
            <p className="text-gray-300 leading-relaxed mb-8 font-light text-sm lg:text-lg">
              {product.productDes}
            </p>

            {/* --- DESKTOP ACTION BUTTONS (Hidden on Mobile) --- */}
            <div className="hidden lg:block bg-white/5 backdrop-blur-sm p-8 rounded-[2rem] border border-[#F5DEB3]/10 mb-10">
              <div className="flex flex-row gap-4">
                {!isInCart ? (
                  <button
                    onClick={handleInitialAddToCart}
                    disabled={product.productStatus !== 'in_stock' || isAdding}
                    className="flex-1 h-14 bg-[#F5DEB3] text-[#1c3026] rounded-full font-bold uppercase tracking-[0.2em] text-xs hover:bg-white transition-all shadow-xl shadow-[#F5DEB3]/10"
                  >
                    {isAdding ? 'Adding...' : 'Add to Collection'}
                  </button>
                ) : (
                  <>
                    <div className="flex items-center bg-[#1c3026] border border-[#F5DEB3]/20 rounded-full h-14 px-4 gap-4">
                      <button onClick={() => handleUpdateQty(currentCartQty - 1)} className="text-[#F5DEB3] px-2"><i className="fa-solid fa-minus"></i></button>
                      <span className="font-serif text-[#F5DEB3] text-lg">{currentCartQty}</span>
                      <button onClick={() => handleUpdateQty(currentCartQty + 1)} className="text-[#F5DEB3] px-2"><i className="fa-solid fa-plus"></i></button>
                    </div>
                    <button onClick={handleCheckoutClick} className="flex-1 h-14 bg-[#F5DEB3] text-[#1c3026] rounded-full font-bold uppercase tracking-[0.2em] text-xs hover:bg-white transition-all">
                      Checkout
                    </button>
                  </>
                )}
                <button 
                  onClick={handleWishlistToggle}
                  className={`w-14 h-14 border rounded-full flex items-center justify-center transition-all ${
                    isInWishlist 
                      ? 'bg-red-500 border-red-500 text-white' 
                      : 'border-[#F5DEB3]/20 text-[#F5DEB3] hover:bg-[#F5DEB3] hover:text-[#1c3026]'
                  }`}
                >
                  <i className={`${isInWishlist ? 'fa-solid' : 'fa-regular'} fa-heart`}></i>
                </button>
              </div>
            </div>

            {/* Accordions */}
            <div className="border-t border-[#F5DEB3]/10">
              <AccordionItem 
                title="Description" 
                isOpen={activeAccordion === 'description'} 
                onClick={() => setActiveAccordion(activeAccordion === 'description' ? '' : 'description')}
              >
                {product.productDes}
              </AccordionItem>
              <AccordionItem 
                title="Shipping & Returns" 
                isOpen={activeAccordion === 'shipping'} 
                onClick={() => setActiveAccordion(activeAccordion === 'shipping' ? '' : 'shipping')}
              >
                Complimentary shipping on orders above ₹500. Securely dispatched within 24-48 hours.
              </AccordionItem>
              <AccordionItem 
                title="Materials & Care" 
                isOpen={activeAccordion === 'care'} 
                onClick={() => setActiveAccordion(activeAccordion === 'care' ? '' : 'care')}
              >
                Handcrafted with premium materials. Wipe clean with a soft, dry cloth.
              </AccordionItem>
            </div>
          </motion.div>
        </div>
      </main>

      {/* --- MOBILE STICKY BOTTOM BAR (Visible only on Mobile) --- */}
      {/* This ensures the "Add to Cart" button is always reachable with the thumb */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-0 left-0 right-0 bg-[#1c3026]/95 backdrop-blur-xl border-t border-[#F5DEB3]/20 p-4 px-6 z-50 lg:hidden flex gap-4 items-center shadow-[0_-10px_40px_rgba(0,0,0,0.3)]"
      >
         <div className="flex-1">
            {!isInCart ? (
                <button
                    onClick={handleInitialAddToCart}
                    disabled={product.productStatus !== 'in_stock' || isAdding}
                    className="w-full h-12 bg-[#F5DEB3] text-[#1c3026] rounded-full font-bold uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                    {isAdding ? 'Adding...' : 'Add to Cart'}
                    <span className="w-1 h-1 bg-[#1c3026] rounded-full"></span>
                    <span>₹{product.sellingPrice?.toLocaleString()}</span>
                </button>
            ) : (
                <div className="flex gap-3 w-full">
                    {/* Qty Control */}
                    <div className="flex items-center justify-between bg-[#111f18] border border-[#F5DEB3]/20 rounded-full h-12 px-4 w-[120px]">
                        <button onClick={() => handleUpdateQty(currentCartQty - 1)} className="text-[#F5DEB3] p-1"><i className="fa-solid fa-minus text-[10px]"></i></button>
                        <span className="font-serif text-[#F5DEB3] text-sm">{currentCartQty}</span>
                        <button onClick={() => handleUpdateQty(currentCartQty + 1)} className="text-[#F5DEB3] p-1"><i className="fa-solid fa-plus text-[10px]"></i></button>
                    </div>
                    {/* Checkout Button */}
                    <button 
                        onClick={handleCheckoutClick}
                        className="flex-1 h-12 bg-[#F5DEB3] text-[#1c3026] rounded-full font-bold uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-transform"
                    >
                        Checkout
                    </button>
                </div>
            )}
         </div>
         
         {/* Wishlist Button Mobile */}
         <button 
           onClick={handleWishlistToggle}
           className={`w-12 h-12 border rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
             isInWishlist 
               ? 'bg-red-500 border-red-500 text-white' 
               : 'border-[#F5DEB3]/20 text-[#F5DEB3] active:bg-[#F5DEB3] active:text-[#1c3026]'
           }`}
         >
            <i className={`${isInWishlist ? 'fa-solid' : 'fa-regular'} fa-heart`}></i>
         </button>
      </motion.div>

      {/* Feedback Toast */}
      <AnimatePresence>
        {feedbackMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#F5DEB3] text-[#1c3026] px-6 py-3 rounded-full shadow-2xl z-[60] flex items-center gap-2 font-bold text-xs uppercase tracking-widest"
          >
            <i className="fa-solid fa-check-circle"></i> {feedbackMessage}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

// Accordion Component (Unchanged)
const AccordionItem = ({ title, isOpen, onClick, children }) => (
  <div className="border-b border-[#F5DEB3]/10">
    <button onClick={onClick} className="w-full py-5 flex justify-between items-center text-left hover:text-[#F5DEB3] text-[#F5DEB3]/70 transition-colors group">
      <span className="text-xs font-bold uppercase tracking-[0.2em] group-hover:text-[#F5DEB3] transition-colors">{title}</span>
      <span className={`flex items-center justify-center w-6 h-6 rounded-full border border-[#F5DEB3]/20 text-[#F5DEB3] text-[10px] transition-transform duration-300 ${isOpen ? 'rotate-180 bg-[#F5DEB3] text-[#1c3026]' : ''}`}>
        <i className="fa-solid fa-chevron-down"></i>
      </span>
    </button>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className="pb-6 text-gray-300 text-sm leading-relaxed font-light">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export default ProductDetailPage;