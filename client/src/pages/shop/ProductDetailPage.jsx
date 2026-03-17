import { useState, useEffect, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useCookies } from "react-cookie";
import confetti from "canvas-confetti";

// API & Redux imports
import { useGetProductByIdQuery } from "../../store/api/productsApi";
import {
  useAddToCartMutation,
  useUpdateCartMutation,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
} from "../../store/api/userApi";
import {
  addToWishlistLocal,
  removeFromWishlistLocal,
} from "../../store/slices/wishlistSlice";
import {
  addItem,
  updateQuantity,
  removeItem,
  updateSelection,
} from "../../store/slices/cartSlice";
import { useUI } from "../../hooks/useRedux";
import { useCartData } from "../../hooks/useCartSync";

const OptimizedImage = lazy(() => import("../../component/OptimizedImage"));
const LoginForm = lazy(() => import("../../component/layout/auth/LoginForm"));
const SignupForm = lazy(() => import("../../component/layout/auth/SignupForm"));

const ProductDetailPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showNotification, openLoginModal, closeLoginModal } = useUI();

  // 1. Auth & Cookies
  const [cookies] = useCookies(["userAccessToken"]);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const cartItems = useSelector((state) => state.cart.items);
  const cartSelections = useSelector((state) => state.cart.selections);

  // 2. Local UI States
  const [activeAccordion, setActiveAccordion] = useState("description");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showSignup, setShowSignup] = useState(false);
  const [selectedColor, setSelectedColor] = useState("");

  // 3. API Hooks
  const { data: productResponse, isLoading, error } = useGetProductByIdQuery(productId);
  const [addToCartAPI, { isLoading: isAdding }] = useAddToCartMutation();
  const [updateCart] = useUpdateCartMutation();
  const [addToWishlist] = useAddToWishlistMutation();
  const [removeFromWishlist] = useRemoveFromWishlistMutation();
  const { refetch: refetchCart } = useCartData();

  const product = productResponse?.data;

  useEffect(() => {
    if (product?.color && product.color.length > 0) {
      const savedSelection = cartSelections[product.productId];
      let initialColor = product.color[0];
      
      if (savedSelection && savedSelection.color && product.color.includes(savedSelection.color)) {
        initialColor = savedSelection.color;
      }
      setSelectedColor(initialColor);
    } else {
      setSelectedColor("");
    }
  }, [product, cartSelections]);

  const cartItem = cartItems.find((item) => {
    const isIdMatch =
      String(item.id) === String(product?.productId) ||
      String(item.mongoId) === String(product?.productId) ||
      String(item.productId) === String(product?.productId);

    if (!isIdMatch) return false;

    if (!product?.color || product.color.length === 0) {
      return true;
    }

    return (item.selectedColor || 'N/A') === (selectedColor || 'N/A');
  });

  const isInCart = !!cartItem;
  const currentCartQty = cartItem ? (Number(cartItem.quantity) || 0) : 0;

  const wishlistItems = useSelector((state) => state.wishlist.items);
  const isInWishlist = wishlistItems.some(
    (item) => item.productName === product?.productName,
  );

  const galleryImages = product
    ? [ ...(product.secondaryImages || [])].filter(Boolean)
    : [];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex(
      (prev) => (prev - 1 + galleryImages.length) % galleryImages.length,
    );
  };

  const handleInitialAddToCart = async () => {
    if (!product) return;

    const hasToken = !!localStorage.getItem("authToken");
    const isLoggedIn = isAuthenticated || hasToken;

    if (isLoggedIn) {
       try {
        await addToCartAPI({
          productId: product?.productId,
          quantity: 1,
          color: selectedColor || 'N/A',
        }).unwrap();

        dispatch(updateSelection({
          productId: product.productId,
          quantity: 1,
          color: selectedColor || 'N/A'
        }));

        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#F5DEB3", "#1c3026", "#a89068", "#ffffff"],
        });

        await refetchCart();

        setFeedbackMessage(
          selectedColor ? `Added ${selectedColor} to Cart` : "Added to Cart",
        );
        setTimeout(() => setFeedbackMessage(""), 2000);
      } catch (err) {
        console.error('Add to cart failed:', err);
        showNotification(err.data?.message || "Something went wrong", 'error');
      }
    } else {
      dispatch(addItem({
        id: product?.productId,
        mongoId: product?.productId,
        name: product?.productName,
        price: product?.sellingPrice || product?.price,
        image: product?.productImg,
        quantity: 1,
        selectedColor: selectedColor || 'N/A'
      }));
      
      setFeedbackMessage("Added");
      setTimeout(() => setFeedbackMessage(""), 2000);
    }
  };

  const handleUpdateQty = async (newQuantity) => {
    const hasToken = !!localStorage.getItem('authToken');
    const isLoggedIn = isAuthenticated || hasToken;

    if (newQuantity < 1) {
      if (isLoggedIn) {
        try {
          await updateCart({
            productId: product.productId,
            quantity: 1,
            action: 'remove',
            color: selectedColor || undefined,
          }).unwrap();
          
          await refetchCart();
        } catch (err) {
          console.error('Remove from cart failed:', err);
          showNotification('Failed to update cart', 'error');
        }
      } else {
        // FIX: Pass color when removing guest item
        dispatch(removeItem({ 
          id: product?.productId,
          selectedColor: selectedColor || 'N/A'
        }));
      }
      return;
    }

    if (isLoggedIn) {
      try {
        const action = newQuantity > currentCartQty ? 'add' : 'sub';
        await updateCart({
          productId: product.productId,
          quantity: 1,
          action,
          color: selectedColor || undefined,
        }).unwrap();
        
        await refetchCart();
      } catch (err) {
        console.error('Update failed:', err);
        window.location.reload();
      }
    } else {
      // FIX: Pass color when updating guest item quantity
      dispatch(updateQuantity({ 
        id: product.productId, 
        quantity: newQuantity,
        selectedColor: selectedColor || 'N/A'
      }));
    }
  };

  const handleCheckoutClick = () => {
    const hasToken = !!localStorage.getItem('authToken');

    if (isAuthenticated || hasToken) {
      navigate('/checkout');
    } else {
      openLoginModal();
    }
  };

  const handleWishlistToggle = async () => {
    const hasToken = !!localStorage.getItem("authToken");
    const isLoggedIn = isAuthenticated || hasToken;

    if (!isLoggedIn) {
      openLoginModal();
      return;
    }

    try {
      if (isInWishlist) {
        await removeFromWishlist(product.productId).unwrap();
        dispatch(removeFromWishlistLocal(product.productId));
        setFeedbackMessage("Removed from wishlist");
      } else {
        await addToWishlist({ productId: product.productId }).unwrap();
        dispatch(addToWishlistLocal(product.productName));
        setFeedbackMessage("Added to wishlist");
      }
      setTimeout(() => setFeedbackMessage(""), 2000);
    } catch (error) {
      console.error('Failed to toggle wishlist:', error);
      showNotification(error.data?.message || "Something went wrong", 'error');
    }
  };

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center bg-[#1c3026]">
      <div className="w-16 h-16 border border-[#F5DEB3] rounded-full animate-spin border-t-transparent"></div>
    </div>
  );

  if (error || !product) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#1c3026] text-[#F5DEB3]">
      <h1 className="text-4xl font-serif">Product Not Found</h1>
      <button 
        onClick={() => navigate('/products')} 
        className="mt-4 border-b border-[#F5DEB3] pb-1 hover:text-white transition-colors"
      >
        Return to Shop
      </button>
    </div>
  );

  return (
    <div className="bg-[#2e443c] min-h-screen font-sans text-gray-200 selection:bg-[#F5DEB3] selection:text-[#1c3026] relative overflow-hidden">
      <div className="fixed top-0 left-0 w-[300px] h-[300px] bg-[#2e443c] rounded-full blur-[150px] pointer-events-none opacity-40"></div>

      <main className="mx-auto pt-24 pb-32 lg:pt-36 lg:pb-20 px-4 lg:px-12 relative z-10">
        <nav className="flex items-center text-[10px] tracking-[0.2em] uppercase text-[#F5DEB3]/50 mb-6 lg:mb-12 cursor-pointer">
          <span onClick={() => navigate('/products')} className="flex items-center gap-2 hover:text-[#F5DEB3] transition-colors">
            <i className="fa-solid fa-arrow-left lg:hidden"></i>
            <span>Shop</span>
          </span>
          <span className="mx-3 text-[#F5DEB3]/20 hidden lg:inline">/</span>
          <span className="text-[#F5DEB3] font-bold border-b border-[#F5DEB3]/30 pb-0.5 hidden lg:inline">
            {product.productName}
          </span>
        </nav>

        <div className="flex flex-col md:flex-row items-start">
          <div
            className="lg:col-span-6 max-w-[500px] w-full lg:sticky lg:top-24 flex flex-col items-start"
            style={{ maxHeight: 'calc(100vh - 6rem)' }}
          >
            <div className="relative max-w-[500px] max-h-[520px] lg:max-h-[600px] rounded-2xl overflow-hidden shadow-2xl group w-full">
              <div className="w-full h-full relative cursor-pointer flex items-center justify-center">
                <div key={currentImageIndex}>
                  <Suspense fallback={<div className="w-full h-full bg-gray-200 animate-pulse rounded-lg"></div>}>
                    <OptimizedImage
                      src={galleryImages[currentImageIndex] || '/placeholder.jpg'}
                      alt={product.productName}
                      className="object-contain"
                      loading="eager"
                    />
                  </Suspense>
                </div>
              </div>

              {galleryImages.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full border border-[#1c3026]/10 flex items-center justify-center text-[#1c3026] bg-white/20 backdrop-blur-sm hover:bg-[#1c3026] hover:text-[#F5DEB3] transition-all z-20"
                  >
                    <i className="fa-solid fa-arrow-left text-sm"></i>
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full border border-[#1c3026]/10 flex items-center justify-center text-[#1c3026] bg-white/20 backdrop-blur-sm hover:bg-[#1c3026] hover:text-[#F5DEB3] transition-all z-20"
                  >
                    <i className="fa-solid fa-arrow-right text-sm"></i>
                  </button>
                </>
              )}
            </div>

            {/* Gallery Thumbnails with Carousel Indicator */}
            <div className="w-full max-w-[500px] mt-6 relative">
              {/* Scroll Container */}
              <div className="flex gap-3 overflow-x-auto pb-2 px-2 md:max-w-[500px] max-w-[390px] scroll-smooth" style={{ scrollBehavior: 'smooth' }}>
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-16 h-16 lg:w-20 lg:h-20 rounded-xl border bg-[#e8e6e1] overflow-hidden transition-all flex-shrink-0 relative group ${
                      currentImageIndex === idx
                        ? 'border-[#F5DEB3] ring-2 ring-[#F5DEB3]/30 scale-105'
                        : 'border-transparent opacity-60 hover:opacity-80'
                    }`}
                  >
                    <Suspense fallback={<div className="w-full h-full bg-gray-200 animate-pulse"></div>}>
                      <OptimizedImage
                        src={img}
                        alt={`Product thumbnail ${idx + 1}`}
                        className="w-full h-full object-contain p-1"
                        loading="lazy"
                      />
                    </Suspense>
                  </button>
                ))}
              </div>

              {/* Simple Counter Below Thumbnails */}
              {galleryImages.length > 1 && (
                <div className="mt-3 flex justify-end px-2">
                  <span className="text-[10px] text-[#F5DEB3]/60 font-mono bg-[#1c3026]/50 px-2.5 py-1 rounded">
                    {currentImageIndex + 1}/{galleryImages.length}
                  </span>
                </div>
              )}
            </div>
          </div>

<div className="lg:col-span-5 flex flex-col ml-auto w-full lg:max-w-[calc(100%-560px)]">
            <div className="mb-1 lg:mb-2 border-b border-[#F5DEB3]/10 pb-2 lg:pb-3">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[#1c3026] text-[9px] lg:text-[10px] font-bold tracking-[0.2em] uppercase bg-[#F5DEB3] px-3 py-1.5 rounded-full shadow-lg shadow-[#F5DEB3]/10">
                  {product.productCategory || 'Featured'}
                </span>
                <div className="flex text-[#F5DEB3] text-xs gap-1 items-center bg-white/5 px-3 py-1 rounded-full">
                  <i className="fa-solid fa-star text-[10px]"></i>
                  <span className="ml-1 text-gray-300 font-mono text-[10px]">
                    4.8
                  </span>
                </div>
              </div>

              <h1 className="text-3xl lg:text-6xl font-serif text-[#F5DEB3] leading-tight mb-4">
                {product.productName}
              </h1>

              <div className="flex items-baseline gap-4 mb-2">
                <p className="text-2xl lg:text-3xl font-light text-white">
                  ₹{product.sellingPrice?.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 line-through">
                  ₹{product.listedPrice?.toLocaleString() || (product.sellingPrice * 1.18).toFixed(0)}
                </p>
              </div>
            </div>

            <p className="text-gray-300 leading-relaxed mb-8 font-light text-sm lg:text-md">
              {product.productSubDes}
            </p>

            {product?.color && product.color.length > 0 && (
              <div className="mb-8 bg-white/5 p-5 rounded-2xl border border-[#F5DEB3]/10">
                <div className="flex justify-between items-baseline mb-3">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#F5DEB3]/70 font-bold">
                    Choose Color
                  </span>
                  <span className="text-xs text-gray-400">
                    Selected:{" "}
                    <strong className="text-white font-medium">
                      {selectedColor}
                    </strong>
                  </span>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                  {product.color.map((colorName, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedColor(colorName);
                      }}
                      title={colorName}
                      className={`w-8 h-8 rounded-full transition-all duration-300 ${
                        selectedColor === colorName
                          ? "border-[3px] border-[#F5DEB3] scale-110 shadow-[0_0_15px_rgba(245,222,179,0.4)]"
                          : "border-2 border-transparent shadow-md hover:scale-110"
                      }`}
                      style={
                        colorName.toLowerCase() === "rainbow"
                          ? {
                              background:
                                "linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)",
                            }
                          : {
                              backgroundColor: colorName
                                .replace(/\s+/g, "")
                                .toLowerCase(),
                            }
                      }
                    ></button>
                  ))}
                </div>

                <p className="text-[10px] text-[#F5DEB3] mt-3 italic font-light">
                  * By default <strong>{product.color[0]}</strong> is selected
                  if you don't choose one.
                </p>
              </div>
            )}

            <div className="hidden lg:block bg-white/5 backdrop-blur-sm p-8 rounded-[2rem] max-w-[400px] border border-[#F5DEB3]/10 mb-10">
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
                      <button onClick={() => handleUpdateQty(currentCartQty - 1)} className="text-[#F5DEB3] px-2">
                        <i className="fa-solid fa-minus"></i>
                      </button>
                      <span className="font-serif text-[#F5DEB3] text-lg">{currentCartQty}</span>
                      <button onClick={() => handleUpdateQty(currentCartQty + 1)} className="text-[#F5DEB3] px-2">
                        <i className="fa-solid fa-plus"></i>
                      </button>
                    </div>
                    <button 
                      onClick={handleCheckoutClick} 
                      className="flex-1 h-14 bg-[#F5DEB3] text-[#1c3026] rounded-full font-bold uppercase tracking-[0.2em] text-xs hover:bg-white transition-all"
                    >
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

            <div className="border-t border-[#F5DEB3]/10">
              {product.specifications && product.specifications.length > 0 && (
                <AccordionItem
                  title="Specifications"
                  isOpen={activeAccordion === 'specifications'}
                  onClick={() => setActiveAccordion(activeAccordion === 'specifications' ? '' : 'specifications')}
                >
                  <div className="space-y-3">
                    {product.specifications.map((spec, index) => (
                      <div 
                        key={spec._id || index} 
                        className="flex justify-between items-start py-2 border-b border-[#F5DEB3]/5 last:border-0"
                      >
                        <span className="text-[#F5DEB3]/60 text-xs uppercase tracking-wider font-medium">
                          {spec.key}
                        </span>
                        <span className="text-gray-200 text-sm text-right max-w-[60%]">
                          {spec.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </AccordionItem>
              )}

              {product.dimensions &&
                (product.dimensions.length ||
                  product.dimensions.breadth ||
                  product.dimensions.height) && (
                  <AccordionItem
                    title="Dimensions"
                    isOpen={activeAccordion === "dimensions"}
                    onClick={() =>
                      setActiveAccordion(
                        activeAccordion === "dimensions" ? "" : "dimensions",
                      )
                    }
                  >
                    <div className="flex justify-between items-center py-2">
                      <span className="text-[#F5DEB3]/60 text-xs uppercase tracking-wider font-medium">
                        Size
                      </span>
                      <span className="text-gray-200 text-sm">
                        {[
                          product.dimensions.length &&
                            `${product.dimensions.length}L`,
                          product.dimensions.breadth &&
                            `${product.dimensions.breadth}B`,
                          product.dimensions.height &&
                            `${product.dimensions.height}H`,
                        ]
                          .filter(Boolean)
                          .join(" × ")}{" "}
                        cm
                      </span>
                    </div>
                  </AccordionItem>
                )}

              {product.materialAndCare && (
                <AccordionItem
                  title="Materials & Care"
                  isOpen={activeAccordion === 'care'}
                  onClick={() => setActiveAccordion(activeAccordion === 'care' ? '' : 'care')}
                >
                  {product.materialAndCare}
                </AccordionItem>
              )}
            </div>
          </div>
        </div>
      </main>

      <div
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
              <div className="flex items-center justify-between bg-[#111f18] border border-[#F5DEB3]/20 rounded-full h-12 px-4 w-[120px]">
                <button onClick={() => handleUpdateQty(currentCartQty - 1)} className="text-[#F5DEB3] p-1">
                  <i className="fa-solid fa-minus text-[10px]"></i>
                </button>
                <span className="font-serif text-[#F5DEB3] text-sm">{currentCartQty}</span>
                <button onClick={() => handleUpdateQty(currentCartQty + 1)} className="text-[#F5DEB3] p-1">
                  <i className="fa-solid fa-plus text-[10px]"></i>
                </button>
              </div>

              <button
                onClick={handleCheckoutClick}
                className="flex-1 h-12 bg-[#F5DEB3] text-[#1c3026] rounded-full font-bold uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-transform"
              >
                Checkout
              </button>
            </div>
          )}
        </div>

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
      </div>

      {feedbackMessage && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#F5DEB3] text-[#1c3026] px-6 py-3 rounded-full shadow-2xl z-[60] flex items-center gap-2 font-bold text-xs uppercase tracking-widest"
        >
          <i className="fa-solid fa-check-circle"></i> {feedbackMessage}
        </div>
      )}

      <Suspense
        fallback={
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        }
      >
        {showSignup && (
          <SignupForm
            onClose={() => setShowSignup(false)}
            onSignupSuccess={() => setShowSignup(false)}
            onSwitchToLogin={() => { setShowSignup(false); openLoginModal(); }}
          />
        )}
      </Suspense>
    </div>
  );
};

const AccordionItem = ({ title, isOpen, onClick, children }) => (
  <div className="border-b border-[#F5DEB3]/10">
    <button 
      onClick={onClick} 
      className="w-full py-5 flex justify-between items-center text-left hover:text-[#F5DEB3] text-[#F5DEB3]/70 transition-colors group"
    >
      <span className="text-xs font-bold uppercase tracking-[0.2em] group-hover:text-[#F5DEB3] transition-colors">
        {title}
      </span>
      <span
        className={`flex items-center justify-center w-6 h-6 rounded-full border border-[#F5DEB3]/20 text-[#F5DEB3] text-[10px] transition-transform duration-300 ${
          isOpen ? "rotate-180 text-[#1c3026]" : ""
        }`}
      >
        <i className="fa-solid fa-chevron-down"></i>
      </span>
    </button>
    {isOpen && (
      <div
        className="overflow-hidden"
      >
        <div className="pb-6 text-gray-300 text-sm leading-relaxed font-light">
          {children}
        </div>
      </div>
    )}
  </div>
);

export default ProductDetailPage;
