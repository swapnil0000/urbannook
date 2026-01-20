import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useCookies } from 'react-cookie';
import { motion, AnimatePresence } from 'framer-motion';

// API & Redux imports
import NewHeader from '../../component/layout/NewHeader';
import Footer from '../../component/layout/Footer';
import { useGetProductByIdQuery } from '../../store/api/productsApi';
import { useAddToCartMutation, userApi, useUpdateCartMutation } from '../../store/api/userApi';
import { addItem, updateQuantity } from '../../store/slices/cartSlice';

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

  const product = productResponse?.data;

  // 4. Derived State
  const cartItem = cartItems.find(item => String(item.id) === String(product?.productId));
  const isInCart = !!cartItem;
  const currentCartQty = cartItem?.quantity || 0;

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

  // 6. Initial Add to Cart
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
      await addToCartAPI({ productName: product.productName, quantity: 1 }).unwrap();

      dispatch(addItem({
        id: product.productId,
        mongoId: product.productId,
        name: product.productName,
        price: product.sellingPrice,
        image: product.productImg,
        quantity: 1
      }));
      
      dispatch(userApi?.util?.invalidateTags(['User']));
      setFeedbackMessage("Added to Collection");
      setTimeout(() => setFeedbackMessage(""), 3000);
    } catch (err) {
      alert(err.data?.message || "Something went wrong");
    }
  };

  // 7. Update Quantity
  const handleUpdateQty = async (newQuantity) => {
    if (newQuantity < 1) return;
    try {
      await updateCart({ productId: product.productId, quantity: newQuantity }).unwrap();
      dispatch(updateQuantity({ id: product.productId, quantity: newQuantity }));
      if (newQuantity > currentCartQty) {
        setFeedbackMessage(`Quantity Updated`);
        setTimeout(() => setFeedbackMessage(""), 3000);
      }
      dispatch(userApi.util.invalidateTags(['User']));
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  // 8. Checkout Handler
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

  // Animation Variants
  const fadeIn = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } } };
  const stagger = { visible: { transition: { staggerChildren: 0.15 } } };

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
    // BASE: "Botanical Moss Green" - Rich, green, but softer than black
    <div className="bg-[#1c3026] min-h-screen font-sans text-gray-200 selection:bg-[#F5DEB3] selection:text-[#1c3026] relative overflow-hidden">
      <NewHeader />

      {/* Lighting Effect: A subtle lighter green gradient at top left to mimic sunlight */}
      <div className="fixed top-0 left-0 w-[800px] h-[800px] bg-[#2a4538] rounded-full blur-[150px] pointer-events-none opacity-40"></div>

      <main className="max-w-[1400px] mx-auto pt-36 pb-20 px-6 lg:px-12 relative z-10">
        
        {/* Breadcrumbs */}
        <motion.nav 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="flex items-center text-[10px] tracking-[0.2em] uppercase text-[#F5DEB3]/50 mb-12 cursor-pointer"
        >
          <span onClick={() => navigate('/products')} className="hover:text-[#F5DEB3] transition-colors">Shop</span>
          <span className="mx-3 text-[#F5DEB3]/20">/</span>
          <span className="text-[#F5DEB3] font-bold border-b border-[#F5DEB3]/30 pb-0.5">{product.productName}</span>
        </motion.nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
          
          {/* LEFT: Image Section */}
          {/* DESIGN FIX: Using a 'Stone/Warm White' background for the image to add light to the page */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-7 w-full lg:sticky lg:top-36"
          >
            <div className="relative aspect-[4/5] bg-[#e8e6e1] rounded-[2rem] overflow-hidden shadow-2xl shadow-black/20 group">
                
                {/* Image Display */}
                <div 
                  className="w-full h-full relative cursor-zoom-in"
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
                      className="w-full h-full object-contain p-8 md:p-16 mix-blend-multiply" // Mix-blend helps image sit better on cream bg
                      style={isZoomed ? { transformOrigin: `${mousePos.x}% ${mousePos.y}%` } : {}}
                    />
                  </AnimatePresence>
                </div>

                {/* Slider Controls - Dark on Light for visibility */}
                {galleryImages.length > 0 && (
                  <>
                    <button 
                      onClick={prevImage}
                      className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full border border-[#1c3026]/10 flex items-center justify-center text-[#1c3026] opacity-0 group-hover:opacity-100 transition-all hover:bg-[#1c3026] hover:text-[#F5DEB3] z-20"
                    >
                      <i className="fa-solid fa-arrow-left"></i>
                    </button>
                    <button 
                      onClick={nextImage}
                      className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full border border-[#1c3026]/10 flex items-center justify-center text-[#1c3026] opacity-0 group-hover:opacity-100 transition-all hover:bg-[#1c3026] hover:text-[#F5DEB3] z-20"
                    >
                      <i className="fa-solid fa-arrow-right"></i>
                    </button>
                  </>
                )}
                
                {/* Zoom Badge */}
                <div className="absolute bottom-6 left-6 px-4 py-2 bg-[#1c3026]/10 rounded-full text-[10px] uppercase tracking-widest text-[#1c3026] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Hover to Zoom
                </div>
            </div>

            {/* Thumbnail Strip */}
            <div className="flex gap-4 mt-8 overflow-x-auto pb-2 justify-center lg:justify-start">
                {galleryImages.map((img, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-20 h-20 rounded-2xl border bg-[#e8e6e1] overflow-hidden transition-all ${
                      currentImageIndex === idx 
                      ? 'border-[#F5DEB3] scale-105 shadow-lg' 
                      : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} className="w-full h-full object-contain p-2 mix-blend-multiply" alt="thumb" />
                  </button>
                ))}
            </div>
          </motion.div>

          {/* RIGHT: Product Info */}
          <motion.div 
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="lg:col-span-5 flex flex-col pt-4"
          >
            <motion.div variants={fadeIn} className="mb-8 border-b border-[#F5DEB3]/10 pb-8">
              <span className="text-[#1c3026] text-[10px] font-bold tracking-[0.3em] uppercase bg-[#F5DEB3] px-4 py-2 rounded-full mb-6 inline-block shadow-lg shadow-[#F5DEB3]/20">
                {product.productCategory || 'Featured Collection'}
              </span>
              <h1 className="text-4xl lg:text-6xl font-serif text-[#F5DEB3] leading-[1.1] mb-6">
                {product.productName}
              </h1>
              <div className="flex items-center gap-4">
                  <p className="text-3xl font-light text-white">₹{product.sellingPrice?.toLocaleString()}</p>
                  {/* Mock Rating */}
                  <div className="flex text-[#F5DEB3] text-xs gap-1 items-center bg-white/5 px-3 py-1 rounded-full">
                      <i className="fa-solid fa-star"></i>
                      <i className="fa-solid fa-star"></i>
                      <i className="fa-solid fa-star"></i>
                      <i className="fa-solid fa-star"></i>
                      <i className="fa-solid fa-star-half-stroke"></i>
                      <span className="ml-1 text-gray-400">(4.8)</span>
                  </div>
              </div>
            </motion.div>

            {/* FEEDBACK BANNER */}
            <AnimatePresence>
              {feedbackMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-[#2a4538] border border-[#F5DEB3]/30 text-[#F5DEB3] text-xs font-bold tracking-widest uppercase py-4 px-6 rounded-xl mb-8 flex items-center shadow-lg"
                >
                  <i className="fa-solid fa-check-circle mr-3 text-lg"></i> {feedbackMessage}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.p variants={fadeIn} className="text-gray-300 leading-loose mb-10 font-light text-lg">
              {product.productDes}
            </motion.p>

            {/* ACTION BUTTONS */}
            <motion.div variants={fadeIn} className="bg-white/5 backdrop-blur-sm p-8 rounded-[2rem] border border-[#F5DEB3]/10 mb-10">
              <div className="flex flex-col sm:flex-row gap-4">

                {!isInCart ? (
                  /* Initial Add to Cart */
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleInitialAddToCart}
                    disabled={product.productStatus !== 'in_stock' || isAdding}
                    className="flex-1 h-16 bg-[#F5DEB3] text-[#1c3026] rounded-full font-bold uppercase tracking-[0.2em] text-xs hover:bg-white transition-all disabled:bg-gray-600 disabled:text-gray-400 shadow-xl shadow-[#F5DEB3]/10"
                  >
                    {isAdding ? 'Processing...' : 'Add to Collection'}
                  </motion.button>
                ) : (
                  /* After Adding to Cart */
                  <>
                    <div className="flex items-center bg-[#1c3026] border border-[#F5DEB3]/20 rounded-full h-16 px-6 gap-6 shadow-inner">
                      <button onClick={() => handleUpdateQty(currentCartQty - 1)} className="text-[#F5DEB3] hover:text-white transition-colors p-2">
                        <i className="fa-solid fa-minus text-xs"></i>
                      </button>
                      <span className="font-serif text-[#F5DEB3] text-xl min-w-[20px] text-center">{currentCartQty}</span>
                      <button onClick={() => handleUpdateQty(currentCartQty + 1)} className="text-[#F5DEB3] hover:text-white transition-colors p-2">
                        <i className="fa-solid fa-plus text-xs"></i>
                      </button>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCheckoutClick}
                      className="flex-1 h-16 bg-[#F5DEB3] text-[#1c3026] rounded-full font-bold uppercase tracking-[0.2em] text-xs hover:bg-white transition-all shadow-xl shadow-[#F5DEB3]/10"
                    >
                      Checkout
                    </motion.button>
                  </>
                )}

                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-16 h-16 border border-[#F5DEB3]/20 rounded-full flex items-center justify-center text-[#F5DEB3] hover:bg-[#F5DEB3] hover:text-[#1c3026] transition-all flex-shrink-0"
                >
                  <i className="fa-regular fa-heart"></i>
                </motion.button>
              </div>
            </motion.div>

            {/* Accordions */}
            <motion.div variants={fadeIn} className="border-t border-[#F5DEB3]/10">
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
                Complimentary shipping on orders above ₹500. Securely dispatched within 24-48 hours via our premium courier partners.
              </AccordionItem>
              <AccordionItem 
                title="Materials & Care" 
                isOpen={activeAccordion === 'care'} 
                onClick={() => setActiveAccordion(activeAccordion === 'care' ? '' : 'care')}
              >
                Handcrafted with premium materials. Wipe clean with a soft, dry cloth to maintain luster.
              </AccordionItem>
            </motion.div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

// Accordion Helper Component
const AccordionItem = ({ title, isOpen, onClick, children }) => (
  <div className="border-b border-[#F5DEB3]/10">
    <button onClick={onClick} className="w-full py-6 flex justify-between items-center text-left hover:text-[#F5DEB3] text-[#F5DEB3]/70 transition-colors group">
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
          <div className="pb-6 text-gray-300 text-sm leading-loose font-light">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export default ProductDetailPage;