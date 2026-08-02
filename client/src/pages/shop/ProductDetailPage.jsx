import {
  useState,
  useEffect,
  lazy,
  Suspense,
  useMemo,
  useRef,
  memo,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useCookies } from "react-cookie";
import { fireAddToCartConfetti } from "../../utils/celebration";
import { resolveVariantTitle, splitTitleForDisplay } from "../../utils/variantTitle";
import SEOHead from "../../component/SEOHead";
import ComparisonTable from "../../component/ComparisonTable";
import SetupShowcase from "../../component/SetupShowcase";

// TEMP: hardcoded showcase slides until wired to flagged review images
// (e.g. a `showInSetup` boolean on each review image, toggled from admin).
// Module-scope so the array reference stays stable across renders.
// TODO(wiring): map flagged review images →
//   { url: img, quote: review.desc, author: review.name } from reviewsData.
const SETUP_SHOWCASE_IMG =
  "https://d1dhs7xre1cv0d.cloudfront.net/prod/reviews/019da690-729b-7428-8ae1-0273f030d2a8/019da759-db13-76ec-b7cf-8005fd5ab150-1779439962727.jpeg";
const SETUP_SHOWCASE_ITEMS = [
  { url: SETUP_SHOWCASE_IMG, quote: "Absolutely lights up my desk — everyone who visits asks about it.", author: "Aditya R." },
  { url: SETUP_SHOWCASE_IMG, quote: "Build quality is insane for the price. Looks premium on my shelf.", author: "Priya S." },
  { url: SETUP_SHOWCASE_IMG, quote: "The glow is exactly like a real hot rotor. Perfect gift for a car guy.", author: "Karan M." },
  { url: SETUP_SHOWCASE_IMG, quote: "Sits right next to my monitor and completely changed the vibe.", author: "Neha T." },
  { url: SETUP_SHOWCASE_IMG, quote: "Ordered a second one for my brother. Packaging was top notch.", author: "Rohit V." },
  { url: SETUP_SHOWCASE_IMG, quote: "Way brighter than I expected — genuinely a conversation starter.", author: "Sanya K." },
];

// Struck-through MRP shown when a variant has no real variantMrp set yet —
// see the strikePrice/discountPercent memo in the component below.
const FALLBACK_MRP = 2000;
// FreeShippingBanner render moved off the PDP into the cart — import kept
// commented so restoring the PDP banner is a one-line change.
// import FreeShippingBanner from "../../component/FreeShippingBanner";
import MiniCartPreview from "../../component/layout/MiniCartPreview";
import useTimer from "../../hooks/useTimer";
import config from "../../config/env";
import { trackViewItem, trackAddToCart, trackRemoveFromCart, trackAddToWishlist, trackVariantSelect } from "../../utils/analytics";

// Timer Component for Product Page
const ProductTimer = memo(({ timeLeft }) => {
  if (timeLeft.isExpired) return null;

  return (
    <div className="mb-6 bg-gradient-to-br from-[#1c3026] to-[#121f19] border border-[#F5DEB3]/30 rounded-2xl p-4 md:p-5 shadow-2xl relative overflow-hidden group">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#F5DEB3]/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-[#F5DEB3]/10 transition-colors"></div>

      <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
          <div className="flex items-center gap-2 mb-2 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 px-3 py-1 rounded-full w-fit backdrop-blur-sm">
            <i className="fa-solid fa-bolt-lightning text-red-500 text-[10px] animate-pulse"></i>
            <span className="text-red-500 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em]">
              Flash Offer Ending
            </span>
          </div>
          <p className="text-[#F5DEB3]/90 text-xs md:text-sm font-light italic">
            Don't miss out!{" "}
            <span className="text-[#F5DEB3] font-bold underline decoration-[#F5DEB3]/30 underline-offset-4 uppercase tracking-wider ml-1">
              Prices are rising soon
            </span>
          </p>
        </div>

        <div className="flex gap-2 md:gap-3 items-center">
          {[
            { label: "Days", value: timeLeft.days },
            { label: "Hrs", value: timeLeft.hours },
            { label: "Min", value: timeLeft.minutes },
            { label: "Sec", value: timeLeft.seconds },
          ].map((item, idx) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <div className="bg-white/5 backdrop-blur-md rounded-xl px-2.5 py-1.5 md:px-3.5 md:py-2.5 min-w-[45px] md:min-w-[55px] border border-white/10 flex items-center justify-center shadow-inner">
                  <span className="text-lg md:text-2xl font-bold text-[#F5DEB3] font-mono tracking-tighter tabular-nums leading-none">
                    {item.value}
                  </span>
                </div>
                <span className="text-[7px] md:text-[8px] uppercase tracking-[0.2em] text-[#F5DEB3]/50 mt-1.5 font-bold">
                  {item.label}
                </span>
              </div>
              {idx < 2 && (
                <span className="text-lg md:text-2xl font-light text-white/10 self-start mt-1.5 md:mt-2">
                  :
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Shine effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:animate-[shine_3s_ease-in-out_infinite] pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-20deg]"></div>
    </div>
  );
});

// API & Redux imports
import { useGetProductByIdQuery } from "../../store/api/productsApi";
import {
  useAddToCartMutation,
  useUpdateCartMutation,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
} from "../../store/api/userApi";
import {
  useGetProductReviewsQuery,
  useSubmitProductReviewMutation,
  useUpdateProductReviewMutation,
} from "../../store/api/testimonialsApi";
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
  // Helper to safely extract quantity
  const itemQty = (q) => {
    if (typeof q === "object" && q !== null) return q.quantity || 0;
    return q || 0;
  };

  const { productId, variantSku: urlVariantSku } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showNotification, openLoginModal, closeLoginModal, openCart } = useUI();
  // Tapping "Go to Cart" opens this quick preview first (items + total +
  // shipping note), not the full editable CartDrawer — "View Cart" inside it
  // is the escape hatch into that full drawer via `openCart`.
  const [showMiniCart, setShowMiniCart] = useState(false);

  // 1. Auth & Cookies
  const [cookies] = useCookies(["userAccessToken"]);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const cartItems = useSelector((state) => state.cart.items);
  const cartSelections = useSelector((state) => state.cart.selections);
  const cartTotalQuantity = useSelector((state) => state.cart.totalQuantity);

  // 2. Local UI States
  const [activeAccordion, setActiveAccordion] = useState("description");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  // Drag/swipe slider — pointer events unify mouse-drag and touch-swipe in
  // one handler set, so the same code drives it on desktop and mobile.
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isGalleryHovering, setIsGalleryHovering] = useState(false);
  const [suppressSlideTransition, setSuppressSlideTransition] = useState(false);
  // Autoplay is a desktop-only nicety — on mobile the customer's thumb is the
  // primary way to browse images, and an automatic 1s cycle fighting a swipe
  // gesture reads as "scrolling by itself, too fast." matchMedia (not a
  // one-time innerWidth check) so rotating the phone updates it live.
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e) => setIsMobileViewport(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  const currentImageIndexRef = useRef(0);
  const dragStartXRef = useRef(0);
  const dragWidthRef = useRef(0);
  // Guard the move handler off a ref, not `isDragging` state — a fast first
  // move can fire before the setState from drag-start has committed.
  const draggingRef = useRef(false);
  const [showSignup, setShowSignup] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState("");

  // 3. API Hooks
  const {
    data: productResponse,
    isLoading,
    error,
  } = useGetProductByIdQuery(productId);
  const [addToCartAPI, { isLoading: isAdding }] = useAddToCartMutation();
  const [updateCart] = useUpdateCartMutation();
  const [addToWishlist] = useAddToWishlistMutation();
  const [removeFromWishlist] = useRemoveFromWishlistMutation();
  const { refetch: refetchCart } = useCartData();

  // Reviews
  const { data: reviewsData, refetch: refetchReviews } =
    useGetProductReviewsQuery(productId);
  const [submitProductReview, { isLoading: isSubmittingReview }] =
    useSubmitProductReviewMutation();
  const [updateProductReview, { isLoading: isUpdatingReview }] =
    useUpdateProductReviewMutation();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState(null); // null = new, string = editing
  const [reviewForm, setReviewForm] = useState({ rating: 5, desc: "" });
  const [reviewImages, setReviewImages] = useState([]); // up to 3 File objects
  const [reviewImagePreviews, setReviewImagePreviews] = useState([]); // preview URLs
  const reviewImageRef = useRef(null);
  const variantScrollRef = useRef(null);
  const [variantScrollAtStart, setVariantScrollAtStart] = useState(true);
  const [variantScrollAtEnd, setVariantScrollAtEnd] = useState(true);
  const [lightboxData, setLightboxData] = useState(null); // { imgList: [{url, review}], currentIdx }
  const [showMobileAllReviews, setShowMobileAllReviews] = useState(false);
  const mobileReviewScrollRef = useRef(null);
  const [mobileReviewScrollEnd, setMobileReviewScrollEnd] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState(new Set());
  
  const currentUserId = useSelector((state) => state.auth.user?.userId);
  const timeLeft = useTimer(config.offerEndDate);

  // Listen for post-login callback to open review form
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.callback === "openReviewForm") {
        setShowReviewForm(true);
      }
    };
    window.addEventListener("loginSuccess", handler);
    return () => window.removeEventListener("loginSuccess", handler);
  }, []);

  const product = productResponse?.data;

  const currentPrice = useMemo(() => {
    if (!product) return 0;
    if (product.variantDetails && product.variantDetails.length > 0) {
      const selectedDetail = product.variantDetails.find(v => v.variantName === selectedVariant);
      if (selectedDetail && selectedDetail.variantPrice) {
        return selectedDetail.variantPrice;
      }
      // Default to first variant's price if no specific variant is matched/priced
      return product.variantDetails[0].variantPrice || 0;
    }
    return 0;
  }, [product, selectedVariant]);

  // Struck "compare-at" price + its discount % — a direct read of the
  // selected variant's real `variantMrp`/`variantPrice`. If a variant has no
  // MRP set (or an invalid one that isn't actually higher than the price),
  // falls back to a flat ₹2000 rather than a synthetic markup/markdown
  // formula — a simple placeholder until every variant has a real MRP.
  const { strikePrice, discountPercent } = useMemo(() => {
    if (!product || !product.variantDetails || product.variantDetails.length === 0) {
      return { strikePrice: 0, discountPercent: 0 };
    }

    const selectedDetail =
      product.variantDetails.find(v => v.variantName === selectedVariant) || product.variantDetails[0];
    const realMrp = Number(selectedDetail?.variantMrp) || 0;
    const mrp = realMrp > currentPrice ? realMrp : FALLBACK_MRP;
    if (mrp <= currentPrice) {
      return { strikePrice: 0, discountPercent: 0 };
    }
    const discount = Math.round(((mrp - currentPrice) / mrp) * 100);
    return { strikePrice: mrp, discountPercent: discount };
  }, [product, currentPrice, selectedVariant]);

  // Per-variant description — admin can set a distinct description per
  // variant (e.g. each anime-character katana has its own blurb). Falls back
  // to the product-level description when the selected variant has none set.
  const displayDescription = useMemo(() => {
    if (!product) return "";
    const selectedDetail = product.variantDetails?.find(v => v.variantName === selectedVariant);
    return (selectedDetail?.variantDes && selectedDetail.variantDes.trim()) || product.productDes || "";
  }, [product, selectedVariant]);

  // Optional per-product title template (admin-set `variantTitleTemplate`,
  // e.g. "{variant} Cosplay Wooden Katana ({variant} Inspired, 104cm)").
  // Blank template (the default for every existing product) falls straight
  // back to the plain productName, so this can't affect products that never
  // opted in.
  const displayTitle = useMemo(() => {
    if (!product) return "";
    return resolveVariantTitle(product.productName, product.variantTitleTemplate, selectedVariant);
  }, [product, selectedVariant]);

  // Splits a template-resolved title like "Sasuke Cosplay Wooden Katana
  // (Sasuke Inspired, 104cm)" into a bold main heading and a smaller,
  // normal-weight parenthetical sub-line shown underneath it.
  const { main: displayTitleMain, sub: displayTitleSub } = useMemo(
    () => splitTitleForDisplay(displayTitle),
    [displayTitle]
  );

  const availableVariants = useMemo(() => {
    if (!product || !product.variantDetails) return [];
    return product.variantDetails.map(v => v.variantName);
  }, [product]);

  // Keeps the Amazon-style ‹ › arrows in sync with actual scroll position —
  // both show whenever there's more to scroll to in that direction, and fade
  // out at the strip's start/end (or entirely, if everything already fits).
  const updateVariantScrollState = () => {
    const el = variantScrollRef.current;
    if (!el) return;
    setVariantScrollAtStart(el.scrollLeft <= 4);
    setVariantScrollAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  };
  useEffect(() => {
    updateVariantScrollState();
  }, [availableVariants]);
  const scrollVariants = (direction) => {
    variantScrollRef.current?.scrollBy({ left: direction * 180, behavior: "smooth" });
  };

  const galleryImages = useMemo(() => {
    if (!product) return [];

    // 1. Agar variant select kiya hai, toh wahi images dikhayenge
    if (product.variantDetails && product.variantDetails.length > 0) {
      const selectedDetail = product.variantDetails.find(v => v.variantName === selectedVariant);
      if (selectedDetail && selectedDetail.variantImage && selectedDetail.variantImage.length > 0) {
        return selectedDetail.variantImage;
      }
      
      // If selected variant has no image, try the first variant's image
      if (product.variantDetails[0].variantImage && product.variantDetails[0].variantImage.length > 0) {
        return product.variantDetails[0].variantImage;
      }
    }

    // 2. Fallback: Placeholder
    return ["https://urbannook.in/assets/logo.webp"];
  }, [product, selectedVariant]);

  useEffect(() => {
    if (availableVariants.length > 0 && product) {
      let initialVariant = availableVariants[0];

      if (urlVariantSku) {
        const matched = product.variantDetails?.find(v => v.sku === urlVariantSku);
        if (matched) initialVariant = matched.variantName;
      } else {
        const savedSelection = cartSelections[product.productId];
        if (savedSelection && savedSelection.variant && availableVariants.includes(savedSelection.variant)) {
          initialVariant = savedSelection.variant;
        }
      }
      setSelectedVariant(initialVariant);
      setCurrentImageIndex(0);
    } else if (!product) {
       setSelectedVariant("");
    }
  }, [product?.productId, availableVariants, cartSelections, product, urlVariantSku]);

  // NAYA: Variant change hone par image index hamesha reset hoga
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [selectedVariant]);

  // Keeps a ref mirror of the current index so the interval below can read
  // it synchronously without depending on (and re-creating the interval
  // for) currentImageIndex itself.
  useEffect(() => {
    currentImageIndexRef.current = currentImageIndex;
  }, [currentImageIndex]);

  // Auto-advance the gallery every second — desktop only (see
  // isMobileViewport above), and paused while the customer is actually
  // interacting with it (mouse hovering, or mid-drag/swipe) so autoplay
  // never fights a manual gesture. On mobile there's no autoplay at all —
  // swipe is the only way to move between images there.
  // Advances WITHOUT wrapping via modulo — it's allowed to walk one step past
  // the last real image, onto a cloned copy of image 1 appended to the track
  // (see `extendedGalleryImages`/`handleTrackTransitionEnd` below). Letting it
  // slide forward onto the clone (instead of snapping backward to index 0)
  // is what makes the loop look continuous instead of rewinding.
  useEffect(() => {
    if (isMobileViewport || galleryImages.length <= 1 || isGalleryHovering || isDragging) return;
    const id = setInterval(() => {
      setCurrentImageIndex(currentImageIndexRef.current + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [isMobileViewport, galleryImages.length, isGalleryHovering, isDragging]);

  // The instant the forward slide onto the cloned last-slot finishes, snap
  // back to the real index 0 with the transition disabled. The clone and the
  // real first image are pixel-identical, so this snap is invisible — unlike
  // trying to time a CSS transition toggle around a backward jump, this only
  // fires once the browser confirms the animation actually completed.
  const handleTrackTransitionEnd = () => {
    if (currentImageIndex >= galleryImages.length) {
      setSuppressSlideTransition(true);
      setCurrentImageIndex(0);
    }
  };
  useEffect(() => {
    if (!suppressSlideTransition) return;
    const id = requestAnimationFrame(() => setSuppressSlideTransition(false));
    return () => cancelAnimationFrame(id);
  }, [suppressSlideTransition]);

  // The track renders one extra slide (a clone of image 1) after the real
  // last image, purely so autoplay has somewhere to slide FORWARD into
  // instead of snapping backward.
  const extendedGalleryImages = useMemo(
    () => (galleryImages.length > 1 ? [...galleryImages, galleryImages[0]] : galleryImages),
    [galleryImages]
  );

  // Track product view ONCE per product. Switching variant/color must NOT re-fire
  // ViewContent (that inflated it 2-5x); variant interest is captured by the separate
  // trackVariantSelect event. Guard on the product id so only a genuine new product fires.
  const viewedProductRef = useRef(null);
  useEffect(() => {
    if (product && selectedVariant && viewedProductRef.current !== product.productId) {
      viewedProductRef.current = product.productId;
      trackViewItem({
        itemId: product.productId,
        itemName: product.productName,
        itemVariant: selectedVariant,
        price: currentPrice,
        quantity: 1,
      });
    }
  }, [product?.productId, selectedVariant, currentPrice]);

  const cartItem = useMemo(() => {
    if (!product) return null;
    return cartItems.find((item) => {
      const isIdMatch =
        String(item.id) === String(product?.productId) ||
        String(item.mongoId) === String(product?.productId) ||
        String(item.productId) === String(product?.productId);

      if (!isIdMatch) return false;
      
      const effectiveVariant = selectedVariant || (availableVariants[0] || "N/A");
      const itemVariant = item.selectedVariant || "N/A";
      return itemVariant === effectiveVariant;
    });
  }, [cartItems, product, selectedVariant, availableVariants]);

  const wishlistItems = useSelector((state) => state.wishlist.items);
  const isInWishlist = useMemo(() => {
    if (!product) return false;
    return wishlistItems.some(
        (item) => item.productId === product.productId || item.productName === product.productName,
    );
  }, [wishlistItems, product]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Shared drag core — driven by pointer events (mouse) AND native touch
  // events (iOS Safari delivers custom-drag pointermove unreliably, so touch
  // is the reliable path on iPhones). touch-action: pan-y lets vertical page
  // scroll through while we own the horizontal swipe.
  const beginDrag = (clientX, width) => {
    if (galleryImages.length <= 1) return;
    draggingRef.current = true;
    setIsDragging(true);
    dragStartXRef.current = clientX;
    dragWidthRef.current = width || 1;
  };
  const moveDrag = (clientX) => {
    if (!draggingRef.current) return;
    let dx = clientX - dragStartXRef.current;
    // Resistance at the ends — can't endlessly drag past the first/last image.
    if (currentImageIndex === 0 && dx > 0) dx *= 0.35;
    if (currentImageIndex === galleryImages.length - 1 && dx < 0) dx *= 0.35;
    setDragOffset(dx);
  };
  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);
    const threshold = dragWidthRef.current * 0.15;
    if (dragOffset <= -threshold && currentImageIndex < galleryImages.length - 1) {
      setCurrentImageIndex((i) => i + 1);
    } else if (dragOffset >= threshold && currentImageIndex > 0) {
      setCurrentImageIndex((i) => i - 1);
    }
    setDragOffset(0);
  };

  // Pointer handlers — MOUSE/PEN ONLY. Touch is handled by the touch* handlers
  // below so iOS gets a reliable event stream (and the two never double-fire).
  const handleImageDragStart = (e) => {
    if (e.pointerType === "touch") return;
    beginDrag(e.clientX, e.currentTarget.offsetWidth);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const handleImageDragMove = (e) => {
    if (e.pointerType === "touch") return;
    moveDrag(e.clientX);
  };
  const handleImageDragEnd = (e) => {
    if (e?.pointerType === "touch") return;
    endDrag();
  };

  // Native touch handlers — the reliable path on iOS Safari.
  const handleImageTouchStart = (e) => {
    if (!e.touches?.length) return;
    beginDrag(e.touches[0].clientX, e.currentTarget.offsetWidth);
  };
  const handleImageTouchMove = (e) => {
    if (!e.touches?.length) return;
    moveDrag(e.touches[0].clientX);
  };
  const handleImageTouchEnd = () => {
    endDrag();
  };

  const handleInitialAddToCart = async () => {
    if (!product) return;

    const effectiveVariant =
      selectedVariant ||
      (availableVariants && availableVariants.length > 0 
        ? availableVariants[0] 
        : (product.color && product.color.length > 0 ? product.color[0] : "Standard Variant"));
    
    // Get image for the selected variant
    let selectedImage = product.productImg || "https://urbannook.in/assets/logo.webp";
    if (product.variantDetails && product.variantDetails.length > 0) {
      const variant = product.variantDetails.find(v => v.variantName === effectiveVariant);
      if (variant && variant.variantImage && variant.variantImage.length > 0) {
        selectedImage = variant.variantImage[0];
      } else if (product.variantDetails[0].variantImage?.[0]) {
        selectedImage = product.variantDetails[0].variantImage[0];
      }
    }

    const hasToken = !!localStorage.getItem("authToken");
    const isLoggedIn = isAuthenticated || hasToken;

    if (isLoggedIn) {
      try {
        await addToCartAPI({
          productId: product?.productId,
          quantity: 1,
          variant: effectiveVariant,
          image: selectedImage,
        }).unwrap();

        // Update local selection for persistence
        dispatch(
          updateSelection({
            productId: product.productId,
            quantity: 1,
            variant: effectiveVariant,
          }),
        );

        // Force an immediate refetch and wait for it
        await refetchCart().unwrap();

        fireAddToCartConfetti();

        setSelectedVariant(effectiveVariant);

        setFeedbackMessage(
          effectiveVariant !== "N/A"
            ? `Added ${effectiveVariant} to Cart`
            : "Added to Cart",
        );
        setTimeout(() => setFeedbackMessage(""), 2000);

        trackAddToCart({
          itemId: product.productId,
          itemName: product.productName,
          itemVariant: effectiveVariant,
          price: currentPrice,
          quantity: 1,
        });
      } catch (err) {
        console.error("Add to cart failed:", err);
        showNotification(err.data?.message || "Something went wrong", "error");
      }
    } else {
      dispatch(
        addItem({
          id: product?.productId,
          mongoId: product?.productId,
          name: product?.productName,
          price: currentPrice,
          image: selectedImage,
          quantity: 1,
          selectedVariant: effectiveVariant,
        }),
      );

      setSelectedVariant(effectiveVariant);
      setFeedbackMessage("Added");
      setTimeout(() => setFeedbackMessage(""), 2000);

      trackAddToCart({
        itemId: product.productId,
        itemName: product.productName,
        itemVariant: effectiveVariant,
        price: currentPrice,
        quantity: 1,
      });
    }
  };

  const handleUpdateQty = async (newQuantity) => {
    if (!product) return;

    const hasToken = !!localStorage.getItem("authToken");
    const isLoggedIn = isAuthenticated || hasToken;

    let selectedImage = "https://urbannook.in/assets/logo.webp";
    if (product.variantDetails && product.variantDetails.length > 0) {
      const variant = product.variantDetails.find(v => v.variantName === selectedVariant);
      if (variant && variant.variantImage && variant.variantImage.length > 0) {
        selectedImage = variant.variantImage[0];
      } else if (product.variantDetails[0].variantImage?.[0]) {
        selectedImage = product.variantDetails[0].variantImage[0];
      }
    }

    if (newQuantity < 1) {
      if (isLoggedIn) {
        try {
          await updateCart({
            productId: product.productId,
            quantity: 1,
            action: "remove",
            variant: selectedVariant || undefined,
            image: selectedImage,
          }).unwrap();

          await refetchCart();
        } catch (err) {
          console.error("Remove from cart failed:", err);
          showNotification("Failed to update cart", "error");
        }
      } else {
        dispatch(
          removeItem({
            id: product?.productId,
            selectedVariant: selectedVariant || "N/A",
          }),
        );
      }

      trackRemoveFromCart({
        itemId: product.productId,
        itemName: product.productName,
        itemVariant: selectedVariant,
        price: currentPrice,
        quantity: currentCartQty || 1,
      });

      return;
    }

    if (isLoggedIn) {
      try {
        const action = newQuantity > currentCartQty ? "add" : "sub";
        await updateCart({
          productId: product.productId,
          quantity: 1,
          action,
          variant: selectedVariant || undefined,
          image: selectedImage,
        }).unwrap();

        await refetchCart();
      } catch (err) {
        console.error("Update failed:", err);
        window.location.reload();
      }
    } else {
      dispatch(
        updateQuantity({
          id: product.productId,
          quantity: newQuantity,
          selectedVariant: selectedVariant || "N/A",
        }),
      );
    }
  };

  const handleSubmitReview = async () => {
    const hasToken = !!localStorage.getItem("authToken");
    if (!isAuthenticated && !hasToken) {
      openLoginModal("openReviewForm");
      return;
    }
    if (!reviewForm.desc.trim()) {
      showNotification("Please write a review", "error");
      return;
    }

    const formData = new FormData();
    formData.append("productId", productId);
    formData.append("desc", reviewForm.desc);
    formData.append("rating", reviewForm.rating);
    reviewImages.forEach((img) => formData.append("images", img));

    try {
      if (editingReviewId) {
        await updateProductReview({
          reviewId: editingReviewId,
          formData,
        }).unwrap();
        showNotification(
          "Review updated! It will appear after admin approval.",
          "success",
        );
      } else {
        await submitProductReview(formData).unwrap();
        showNotification(
          "Review submitted! It will appear after admin approval.",
          "success",
        );
      }
      setShowReviewForm(false);
      setEditingReviewId(null);
      setReviewForm({ rating: 5, desc: "" });
      setReviewImages([]);
      setReviewImagePreviews([]);
    } catch (err) {
      showNotification(
        err?.data?.message || "Failed to submit review",
        "error",
      );
    }
  };

  const handleEditReview = (review) => {
    setEditingReviewId(review._id);
    setReviewForm({ rating: review.rating, desc: review.desc });
    setReviewImages([]);
    setReviewImagePreviews(
      review.imageUrls?.length
        ? review.imageUrls
        : review.imageUrl
          ? [review.imageUrl]
          : [],
    );
    setShowReviewForm(true);
    // Scroll to review form
    setTimeout(
      () =>
        document
          .getElementById("review-form-anchor")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      100,
    );
  };

  const handleAddReviewImage = (e) => {
    const files = Array.from(e.target.files || []);
    const remaining = 3 - reviewImages.length;
    const toAdd = files.slice(0, remaining);
    setReviewImages((prev) => [...prev, ...toAdd]);
    setReviewImagePreviews((prev) => [
      ...prev,
      ...toAdd.map((f) => URL.createObjectURL(f)),
    ]);
    e.target.value = "";
  };

  const handleRemoveReviewImage = (idx) => {
    setReviewImages((prev) => prev.filter((_, i) => i !== idx));
    setReviewImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCheckoutClick = () => {
    navigate("/checkout");
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

        trackAddToWishlist({
          itemId: product.productId,
          itemName: product.productName,
          itemVariant: selectedVariant,
          price: currentPrice,
        });
      }
      setTimeout(() => setFeedbackMessage(""), 2000);
    } catch (error) {
      console.error("Failed to toggle wishlist:", error);
      showNotification(error.data?.message || "Something went wrong", "error");
    }
  };

  const curEntry = lightboxData ? lightboxData.imgList[lightboxData.currentIdx] : null;
  const curReview = curEntry?.review;
  const curUrl = curEntry?.url;
  const isInCart = !!cartItem;
  const currentCartQty = cartItem ? Number(itemQty(cartItem.quantity)) || 0 : 0;

  if (isLoading)
    return (
      <div className="h-screen flex items-center justify-center bg-[#1c3026]">
        <div className="w-16 h-16 border border-[#F5DEB3] rounded-full animate-spin border-t-transparent"></div>
      </div>
    );

  if (error || !product)
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#1c3026] text-[#F5DEB3]">
        <h1 className="text-4xl font-serif">Product Not Found</h1>
        <button
          onClick={() => navigate("/products")}
          className="mt-4 border-b border-[#F5DEB3] pb-1 hover:text-white transition-colors"
        >
          Return to Shop
        </button>
      </div>
    );

  const productStructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.productName,
    image: galleryImages,
    description: product.productSubDes,
    sku: product.productId,
    brand: { "@type": "Brand", name: "UrbanNook" },
    offers: {
      "@type": "Offer",
      url: `https://www.urbannook.in/product/${product.productId}`,
      priceCurrency: "INR",
      price: currentPrice,
      availability:
        product.productStatus === "in_stock"
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "UrbanNook" },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "24",
    },
  };

  return (
    <div className="bg-[#2e443c] min-h-screen font-sans text-gray-200 selection:bg-[#F5DEB3] selection:text-[#1c3026] relative overflow-hidden">
      <SEOHead
        title={product.productName}
        description={
          product.productSubDes ||
          `Buy ${product.productName} at UrbanNook. Premium quality, fast pan-India delivery.`
        }
        image={galleryImages[0]}
        url={`/product/${product.productId}`}
        type="product"
        structuredData={productStructuredData}
      />
      <div className="fixed top-0 left-0 w-[300px] h-[300px] bg-[#2e443c] rounded-full blur-[150px] pointer-events-none opacity-40"></div>

      <main className="mx-auto pt-24 pb-32 lg:pt-36 lg:pb-20 px-4 lg:px-12 relative z-10">
        <nav className="flex items-center text-[10px] tracking-[0.2em] uppercase text-[#F5DEB3]/50 mb-6 lg:mb-12 cursor-pointer">
          <span
            onClick={() => navigate("/products")}
            className="flex items-center gap-2 hover:text-[#F5DEB3] transition-colors"
          >
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
          >
            <div className="relative max-w-[500px] aspect-square md:aspect-auto md:h-[520px] rounded-2xl overflow-hidden shadow-2xl group w-full bg-[#e8e6e1]">
              <div
                className={`w-full h-full relative flex ${galleryImages.length > 1 ? "cursor-grab active:cursor-grabbing" : ""}`}
                style={{ touchAction: "pan-y" }}
                onPointerDown={handleImageDragStart}
                onPointerMove={handleImageDragMove}
                onPointerUp={handleImageDragEnd}
                onPointerLeave={(e) => { handleImageDragEnd(e); setIsGalleryHovering(false); }}
                onPointerCancel={handleImageDragEnd}
                onTouchStart={handleImageTouchStart}
                onTouchMove={handleImageTouchMove}
                onTouchEnd={handleImageTouchEnd}
                onTouchCancel={handleImageTouchEnd}
                onMouseEnter={() => setIsGalleryHovering(true)}
              >
                <Suspense
                  fallback={
                    <div className="w-full h-full bg-gray-200 animate-pulse rounded-lg"></div>
                  }
                >
                  <div
                    className="flex w-full h-full"
                    onTransitionEnd={handleTrackTransitionEnd}
                    style={{
                      transform: `translateX(calc(${-currentImageIndex * 100}% + ${dragOffset}px))`,
                      transition: (isDragging || suppressSlideTransition) ? "none" : "transform 400ms cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  >
                    {extendedGalleryImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="w-full h-full shrink-0 flex items-center justify-center"
                      >
                        <OptimizedImage
                          src={img || "/placeholder.jpg"}
                          alt={product.productName}
                          className="object-contain pointer-events-none select-none"
                          loading={idx === 0 ? "eager" : "lazy"}
                          draggable={false}
                        />
                      </div>
                    ))}
                  </div>
                </Suspense>
              </div>
            </div>

            {/* Dot indicators — below the image box, small; active one is a
                slightly wider pill. Replaces the old thumbnail strip. */}
            {galleryImages.length > 1 && (
              <div className="w-full max-w-[500px] mt-4 flex items-center justify-center gap-1.5">
                {galleryImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    aria-label={`View image ${idx + 1}`}
                    style={{ transition: "width 400ms cubic-bezier(0.4,0,0.2,1), background-color 400ms ease" }}
                    className={`h-1.5 rounded-full ${
                      // Modulo, not a direct match — autoplay briefly pushes
                      // currentImageIndex to galleryImages.length (the cloned
                      // slide) while sliding forward, and that clone IS
                      // visually image 1, so its dot should still light up.
                      idx === currentImageIndex % galleryImages.length
                        ? "w-4 bg-[#F5DEB3]"
                        : "w-1.5 bg-[#F5DEB3]/25 hover:bg-[#F5DEB3]/50"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* NAYA: Variant Selection Block - Ab yahan aayega (Badi image ke neeche aur thumbnails se pehle) */}
            {availableVariants && availableVariants.length > 0 && (
              <div className="w-full max-w-[500px] mt-8 bg-white/5 p-5 rounded-2xl border border-[#F5DEB3]/10">
                <div className="flex justify-between items-baseline mb-3">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#F5DEB3]/70 font-bold">
                    Choose Variant
                  </span>
                  <span className="text-xs text-gray-400">
                    Selected:{" "}
                    <strong className="text-white font-medium">
                      {selectedVariant}
                    </strong>
                  </span>
                </div>

                <div className="relative">
                  {!variantScrollAtStart && (
                    <button
                      type="button"
                      onClick={() => scrollVariants(-1)}
                      aria-label="Scroll variants left"
                      className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-[#1c3026] border border-[#F5DEB3]/30 text-[#F5DEB3] shadow-lg hover:bg-[#25382f] transition-colors"
                    >
                      <i className="fa-solid fa-chevron-left text-xs" />
                    </button>
                  )}
                  {!variantScrollAtEnd && (
                    <button
                      type="button"
                      onClick={() => scrollVariants(1)}
                      aria-label="Scroll variants right"
                      className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-[#1c3026] border border-[#F5DEB3]/30 text-[#F5DEB3] shadow-lg hover:bg-[#25382f] transition-colors"
                    >
                      <i className="fa-solid fa-chevron-right text-xs" />
                    </button>
                  )}
                  <div
                    ref={variantScrollRef}
                    onScroll={updateVariantScrollState}
                    className="flex flex-nowrap gap-2 items-center overflow-x-auto no-scrollbar scroll-smooth px-1"
                  >
                  {(product.variantDetails || []).map((detail, idx) => {
                    const variantName = detail.variantName;
                    const isSelected = selectedVariant === variantName;
                    // Swatch is admin-set per variant, not guessed from the
                    // name — "image" (logo/photo URL, falls back to the
                    // variant's first product image) or "color" (any CSS
                    // color). See variantSwatchType/variantSwatchValue.
                    const swatchType = detail.variantSwatchType === "color" ? "color" : "image";
                    const swatchValue =
                      (detail.variantSwatchValue && detail.variantSwatchValue.trim()) ||
                      (swatchType === "image" ? detail.variantImage?.[0] : "");

                    return (
                      <button
                        key={detail._id || idx}
                        onClick={() => {
                          setSelectedVariant(variantName);
                          if (galleryImages[idx]) setCurrentImageIndex(idx);
                          trackVariantSelect({ itemId: product.productId, itemName: product.productName, variantName, price: currentPrice });
                          // replace, not push — switching variants updates the
                          // URL's SKU segment for sharing/refresh, but must NOT
                          // add a browser-history entry. Otherwise the back
                          // button (or a mobile back-swipe) just cycles
                          // through previously-viewed variants on this same
                          // page instead of leaving it, since each variant
                          // click would otherwise push a new history entry.
                          navigate(`/product/${productId}/${detail.sku || variantName}`, { replace: true });
                        }}
                        className={`group flex items-center gap-1.5 px-2.5 py-2 rounded-xl border transition-all duration-300 ${
                          isSelected
                            ? "bg-[#F5DEB3] border-[#F5DEB3] text-[#1c3026] shadow-[0_8px_20px_rgba(245,222,179,0.15)]"
                            : "bg-white/10 border-white/20 text-gray-200 hover:bg-white/15 hover:border-white/40"
                        }`}
                        title={variantName}
                      >
                        <span
                          className={`shrink-0 w-6 h-6 rounded-full overflow-hidden flex items-center justify-center border ${
                            isSelected ? "border-white/20" : "border-white/10"
                          }`}
                        >
                          {swatchType === "color" && swatchValue ? (
                            <span className="w-full h-full block" style={{ background: swatchValue }} />
                          ) : swatchValue ? (
                            <img
                              src={swatchValue}
                              alt={variantName}
                              className={`w-full h-full object-cover ${isSelected ? "" : "opacity-80 group-hover:opacity-100 transition-opacity"}`}
                            />
                          ) : (
                            <span className={`text-[10px] font-bold uppercase ${isSelected ? "text-[#1c3026]" : "text-[#F5DEB3]"}`}>
                              {variantName?.charAt(0)}
                            </span>
                          )}
                        </span>
                        <div className="flex flex-col items-start leading-none min-w-0">
                          <span className={`text-[11px] font-bold uppercase tracking-wide truncate max-w-[110px] ${isSelected ? 'text-[#1c3026]' : 'text-white group-hover:text-[#F5DEB3]'}`}>
                            {variantName}
                          </span>
                          {swatchType === "image" && swatchValue && (
                            <span className={`text-[7px] uppercase tracking-tighter ${isSelected ? 'text-[#1c3026]/60' : 'text-gray-400 group-hover:text-[#F5DEB3]/60'} font-bold mt-0.5`}>
                              Inspired
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  </div>
                </div>
              </div>
            )}

            {/* Gallery Thumbnails with Carousel Indicator — COMMENTED OUT
                (kept for reference, not deleted). The main image now uses the
                dot indicators overlaid above instead of this thumbnail strip.
                Flip `false` → `true` to bring it back. */}
            {false && (
            <div className="w-full max-w-[500px] mt-6 relative">
              {/* Scroll Container */}
              <div
                className="flex gap-3 overflow-x-auto pb-2 px-2 md:max-w-[500px] max-w-[390px] scroll-smooth"
                style={{ scrollBehavior: "smooth" }}
              >
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentImageIndex(idx);
                      // Only sync variant to image index for legacy products (no variantDetails)
                      if (!product.variantDetails?.length && availableVariants?.[idx]) {
                        setSelectedVariant(availableVariants[idx]);
                      }
                    }}
                    className={`w-16 h-16 lg:w-20 lg:h-20 rounded-xl border bg-[#e8e6e1] overflow-hidden transition-all flex-shrink-0 relative group ${
                      currentImageIndex === idx
                        ? "border-[#F5DEB3] ring-2 ring-[#F5DEB3]/30 scale-105"
                        : "border-transparent opacity-60 hover:opacity-80"
                    }`}
                  >
                    <Suspense
                      fallback={
                        <div className="w-full h-full bg-gray-200 animate-pulse"></div>
                      }
                    >
                      <OptimizedImage
                        src={img}
                        alt={`Product thumbnail ${idx + 1}`}
                        className="w-full h-full object-contain"
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
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col ml-auto w-full lg:max-w-[calc(100%-530px)]">
            {productId === config.specialProductId && (
              <ProductTimer timeLeft={timeLeft} />
            )}
            <div className="mb-1 mt-4 lg:mb-2 border-b border-[#F5DEB3]/10 pb-2 lg:pb-3">
              {/* Category label + live rating pill (real avgRating / count).
                  The rating pill balances the row on the right; only shown
                  once the product actually has reviews. */}
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="text-[#1c3026] text-[9px] lg:text-[10px] font-bold tracking-[0.2em] uppercase bg-[#F5DEB3] px-3 py-1 rounded-full shadow-lg shadow-[#F5DEB3]/10">
                  {product.productCategory || "Featured"}
                </span>
                {reviewsData?.data?.totalReviews > 0 && (
                  <button
                    onClick={() =>
                      document
                        .getElementById("pdp-all-reviews")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                    className="flex items-center gap-1.5 bg-white/5 border border-[#F5DEB3]/15 px-2.5 py-1 rounded-full hover:bg-white/10 transition-colors"
                    title={`${reviewsData.data.totalReviews} review${reviewsData.data.totalReviews !== 1 ? "s" : ""}`}
                  >
                    <i className="fa-solid fa-star text-[#C8A96E] text-[10px]"></i>
                    <span className="text-[#F5DEB3] font-bold text-[11px] tabular-nums leading-none">
                      {reviewsData.data.avgRating}
                    </span>
                    <span className="text-gray-400 text-[10px] leading-none">
                      ({reviewsData.data.totalReviews})
                    </span>
                  </button>
                )}
              </div>

              <h1 className={`text-4xl lg:text-6xl font-serif text-[#F5DEB3] leading-tight ${displayTitleSub ? "mb-1" : "mb-4"}`}>
                {displayTitleMain}
              </h1>
              {displayTitleSub && (
                <p className="text-base lg:text-xl font-serif font-normal text-[#F5DEB3]/70 leading-snug mb-4">
                  {displayTitleSub}
                </p>
              )}

              <div className="flex items-baseline gap-4 mb-2">
                <p className="text-2xl lg:text-3xl font-light text-white">
                  ₹{currentPrice.toLocaleString()}
                </p>
                {discountPercent > 0 && (
                  // strikePrice/discountPercent are computed above: 18% markup
                  // for a non-top variant, 25%-off reference for the top/single
                  // variant. Single display path for both cases.
                  <>
                    <p className="text-sm text-gray-500 line-through">
                      ₹{strikePrice.toLocaleString()}
                    </p>
                    <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                      <i className="fa-solid fa-bolt-lightning text-[9px]"></i>
                      {discountPercent}% OFF
                      <span className="text-[9px] text-green-300/80 font-medium">• Limited Time</span>
                    </span>
                  </>
                )}
              </div>

              {/* COD availability */}
              <p className="text-[15px] text-[#F5DEB3] mt-2 flex items-center gap-1.5">
                <i className="fa-solid fa-hand-holding-dollar text-[9px]" />
                Cash on Delivery available
              </p>
            </div>

            <p className="text-gray-300 leading-relaxed mb-8 font-light text-sm lg:text-md">
              {product.productDes}
            </p>

            {/* Desktop: "Add to Collection" box and the free-shipping banner
                sit side-by-side as two columns. Mobile keeps its original
                stacked flow untouched — the grid classes only kick in at lg,
                so below that this wrapper behaves like a plain block. */}
            <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start lg:mb-10">
            <div className="hidden lg:block bg-white/5 backdrop-blur-sm p-8 rounded-[2rem] border border-[#F5DEB3]/10 mb-10 lg:mb-0 lg:h-full">
              <div className="flex flex-row gap-4">
                {!isInCart ? (
                  <button
                    onClick={handleInitialAddToCart}
                    disabled={product.productStatus !== "in_stock" || isAdding}
                    className="flex-1 h-14 bg-[#F5DEB3] text-[#1c3026] rounded-full font-bold uppercase tracking-[0.2em] text-xs hover:bg-white transition-all shadow-xl shadow-[#F5DEB3]/10"
                  >
                    {isAdding ? "Adding..." : "Add to Collection"}
                  </button>
                ) : (
                  <>
                    <div className="flex items-center bg-[#1c3026] border border-[#F5DEB3]/20 rounded-full h-14 px-4 gap-4">
                      <button
                        onClick={() => handleUpdateQty(currentCartQty - 1)}
                        className="text-[#F5DEB3] px-2"
                      >
                        <i className="fa-solid fa-minus"></i>
                      </button>
                      <span className="font-serif text-[#F5DEB3] text-lg">
                        {currentCartQty}
                      </span>
                      <button
                        onClick={() => handleUpdateQty(currentCartQty + 1)}
                        className="text-[#F5DEB3] px-2"
                      >
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
                      ? "bg-red-500 border-red-500 text-white"
                      : "border-[#F5DEB3]/20 text-[#F5DEB3] hover:bg-[#F5DEB3] hover:text-[#1c3026]"
                  }`}
                >
                  <i
                    className={`${isInWishlist ? "fa-solid" : "fa-regular"} fa-heart`}
                  ></i>
                </button>
              </div>

              {/* Delivery reassurance */}
              <div className="mt-5 pt-4 border-t border-[#F5DEB3]/10 grid grid-cols-3 gap-2 text-center">
                <div className="flex flex-col items-center gap-1">
                  <i className="fa-solid fa-truck text-[#F5DEB3] text-sm"></i>
                  <span className="text-[9px] text-[#F5DEB3]/70 uppercase tracking-wider font-bold leading-tight">
                    {" "}
                  24–48 Hours Estimated 
                    <br />
                    Shipment
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <i className="fa-solid fa-shield-halved text-[#F5DEB3] text-sm"></i>
                  <span className="text-[9px] text-[#F5DEB3]/70 uppercase tracking-wider font-bold leading-tight">
                    Secure
                    <br />
                    Payment
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <i className="fa-solid fa-location-dot text-[#F5DEB3] text-sm"></i>
                  <span className="text-[9px] text-[#F5DEB3]/70 uppercase tracking-wider font-bold leading-tight">
                    Pan India
                    <br />
                    Shipping
                  </span>
                </div>
              </div>
            </div>

            {/* Combo-offer banner moved OFF the PDP — it now shows in the cart
                (mini-cart + side drawer) instead, so the customer sees the
                "add the add-on to unlock free shipping" nudge at the cart stage.
                Kept here commented for easy restore. */}
            {/* <FreeShippingBanner productId={product.productId} className="mt-4 lg:mt-0" /> */}
            </div>

            <div className="border-t border-[#F5DEB3]/10">
              {displayDescription && (
                <AccordionItem
                  title="Description"
                  isOpen={activeAccordion === "description"}
                  onClick={() =>
                    setActiveAccordion(
                      activeAccordion === "description" ? "" : "description",
                    )
                  }
                >
                  <p className="whitespace-pre-line">{displayDescription}</p>
                </AccordionItem>
              )}

              {product.specifications && product.specifications.length > 0 && (
                <AccordionItem
                  title="Specifications"
                  isOpen={activeAccordion === "specifications"}
                  onClick={() =>
                    setActiveAccordion(
                      activeAccordion === "specifications"
                        ? ""
                        : "specifications",
                    )
                  }
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

              {product.warranty && (
                <AccordionItem
                  title="Warranty"
                  isOpen={activeAccordion === "warranty"}
                  onClick={() =>
                    setActiveAccordion(
                      activeAccordion === "warranty" ? "" : "warranty",
                    )
                  }
                >
                  <p>{product.warranty}</p>
                </AccordionItem>
              )}

              {product.dimensions && (
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
                      Dimensions (L × B × H)
                    </span>
                    <span className="text-gray-200 text-sm">
                      {product.dimensions.length || 0} × {product.dimensions.breadth || 0} × {product.dimensions.height || 0} cm
                    </span>
                  </div>
                  {product.boxDimensionsAndWeight && (
                    <div className="flex justify-between items-center py-2 border-t border-[#F5DEB3]/5">
                      <span className="text-[#F5DEB3]/60 text-xs uppercase tracking-wider font-medium">
                        Weight
                      </span>
                      <span className="text-gray-200 text-sm">
                        {product.boxDimensionsAndWeight.w || 0}g
                      </span>
                    </div>
                  )}
                </AccordionItem>
              )}

              {product.materialAndCare && (
                <AccordionItem
                  title="Materials & Care"
                  noBorder={true}
                  isOpen={activeAccordion === "care"}
                  onClick={() =>
                    setActiveAccordion(activeAccordion === "care" ? "" : "care")
                  }
                >
                  <p className="whitespace-pre-line">{product.materialAndCare}</p>
                </AccordionItem>
              )}
            </div>

            {/* Standalone Disclaimer Section — driven by the admin-set
                `disclaimer` field so ANY product can have one, not just the
                brake caliper lamp. Falls back to the old hardcoded caliper
                text only when that product's disclaimer field is still
                empty, so nothing regresses before someone fills it in. */}
            {(() => {
              const isCaliperLamp = (product.productName || "").toLowerCase().includes("caliper");
              const disclaimerText =
                product.disclaimer?.trim() ||
                (isCaliperLamp
                  ? "This product is an aftermarket decorative lamp inspired by automotive brake disc designs. Urbannook is not affiliated with, endorsed by, or connected to BMW, Porsche, Lamborghini, or any other automotive brand."
                  : "");
              if (!disclaimerText) return null;
              return (
                <p className="text-[12px] leading-relaxed text-gray-400 italic font-light">
                  <strong className="text-[#F5DEB3]/70 not-italic mr-1">Disclaimer:</strong>
                  {disclaimerText}
                </p>
              );
            })()}
          </div>
        </div>

        {/* ===== COMPARISON TABLE ===== */}
        <ComparisonTable productName={product.productName} />

        {/* ===== REAL-LIFE SETUP SHOWCASE (lazy-mounted marquee) ===== */}
        {/* <SetupShowcase items={SETUP_SHOWCASE_ITEMS} /> */}

        {/* ===== REVIEWS SECTION ===== */}
        <div className="mt-8 pt-4 ">
          {/* Header row — eyebrow + heading. Only makes sense once this
              product actually has reviews to show off; hidden otherwise so
              a brand-new product doesn't claim customers already "said"
              anything. The "Write a Review" action lives only in the 1d
              summary block below (top button removed to avoid duplication);
              functionality is identical. */}
          {reviewsData?.data?.totalReviews > 0 && (
            <div className="mb-7">
              <div className="mb-2">
                <span className="text-[#F5DEB3] font-bold tracking-[0.2em] uppercase text-[10px]">
                  Customer Reviews
                </span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-serif text-white">
                What our customers{" "}
                <span className="italic text-[#F5DEB3]">say.</span>
              </h2>
            </div>
          )}

          {/* Review Form — full width, above the two-column grid */}
          <div id="review-form-anchor"></div>
          {showReviewForm && (
            <div className="mb-10 bg-[#FAF7F2] border border-[#1c3026]/15 rounded-2xl p-6 lg:p-8 max-w-2xl shadow-sm">
              <h3 className="text-[#1c3026] font-serif text-xl mb-6">
                {editingReviewId ? "Edit Your Review" : "Your Review"}
              </h3>
              <div className="mb-5">
                <p className="text-[10px] uppercase tracking-widest text-[#1c3026]/50 mb-3">
                  Rating
                </p>
                <div className="flex gap-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() =>
                        setReviewForm((f) => ({ ...f, rating: s }))
                      }
                    >
                      <i
                        className={`fa-star text-2xl transition-all ${s <= reviewForm.rating ? "fa-solid text-[#C8A96E]" : "fa-regular text-[#1c3026]/20 hover:text-[#C8A96E]/50"}`}
                      ></i>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-5">
                <p className="text-[10px] uppercase tracking-widest text-[#1c3026]/50 mb-3">
                  Your Experience
                </p>
                <textarea
                  value={reviewForm.desc}
                  onChange={(e) =>
                    setReviewForm((f) => ({
                      ...f,
                      desc: e.target.value.slice(0, 500),
                    }))
                  }
                  placeholder="Share your experience with this product..."
                  rows={4}
                  className="w-full bg-white border border-[#1c3026]/15 rounded-xl p-4 text-[#1c3026] text-sm placeholder:text-[#1c3026]/30 focus:outline-none focus:border-[#1c3026]/40 resize-none transition-colors"
                />
                <p className="text-[10px] text-[#1c3026]/40 mt-1 text-right">
                  {reviewForm.desc.length}/500
                </p>
              </div>
              <div className="mb-6">
                <p className="text-[10px] uppercase tracking-widest text-[#1c3026]/50 mb-3">
                  Photos (optional, up to 3)
                </p>
                <input
                  ref={reviewImageRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleAddReviewImage}
                />
                <div className="flex gap-3 flex-wrap">
                  {reviewImagePreviews.map((src, idx) => (
                    <div key={idx} className="relative w-24 h-24">
                      <img
                        src={src}
                        className="w-24 h-24 object-cover rounded-xl border border-[#1c3026]/15"
                        alt={`preview ${idx + 1}`}
                      />
                      <button
                        onClick={() => handleRemoveReviewImage(idx)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white text-xs flex items-center justify-center"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  ))}
                  {reviewImagePreviews.length < 3 && (
                    <button
                      onClick={() => reviewImageRef.current?.click()}
                      className="w-24 h-24 border border-dashed border-[#1c3026]/20 rounded-xl flex flex-col items-center justify-center gap-1.5 text-[#1c3026]/30 hover:border-[#1c3026]/50 hover:text-[#1c3026]/60 transition-colors"
                    >
                      <i className="fa-solid fa-camera text-xl"></i>
                      <span className="text-[9px] uppercase tracking-wider">
                        Add Photo
                      </span>
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSubmitReview}
                  disabled={isSubmittingReview || isUpdatingReview}
                  className="px-8 py-3 bg-[#1c3026] text-[#FAF7F2] rounded-full text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 hover:bg-[#2e443c] transition-colors"
                >
                  {isSubmittingReview || isUpdatingReview
                    ? "Submitting..."
                    : editingReviewId
                      ? "Update Review"
                      : "Submit Review"}
                </button>
                <button
                  onClick={() => {
                    setShowReviewForm(false);
                    setEditingReviewId(null);
                  }}
                  className="px-6 py-3 border border-[#1c3026]/20 text-[#1c3026]/50 rounded-full text-[10px] font-bold uppercase tracking-widest hover:border-[#1c3026]/40 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Two-column grid: left=summary/tags/photos, right=reviews ── */}
          <div className="md:grid md:grid-cols-[5fr_7fr] md:gap-10 lg:gap-14 md:items-start">
            {/* ── LEFT COLUMN ── */}
            <div
              className="md:sticky md:top-24 md:max-h-[calc(100vh-6rem)]"
              style={{ overflow: "clip" }}
            >
              {/* ===== Reviews Summary — Claude Design "1d", wired to real
                   data. Compact confident review line + category pills (big
                   cream box + histogram removed per this direction). ===== */}

              {/* 1d — confident single review line (all items vertically
                  centered on one baseline; FA star aligns cleaner than the
                  unicode glyph). */}
              {reviewsData?.data?.totalReviews > 0 && (
                <div className="mb-4 flex items-center gap-2.5 px-4 py-3 rounded-2xl border border-[#C8A96E]/30 bg-[#C8A96E]/[0.06]">
                  <span className="font-serif text-xl leading-none text-[#F5DEB3]">
                    {reviewsData.data.avgRating}
                  </span>
                  <i className="fa-solid fa-star text-[#C8A96E] text-sm leading-none"></i>
                  <span className="w-px h-4 bg-white/15" />
                  <span className="text-[13px] font-semibold text-white/70 leading-none">
                    {reviewsData.data.totalReviews} review
                    {reviewsData.data.totalReviews !== 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={() =>
                      document
                        .getElementById("pdp-all-reviews")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                    className="ml-auto text-[12px] font-bold text-[#C8A96E] hover:text-[#F5DEB3] transition-colors leading-none"
                  >
                    Read ›
                  </button>
                </div>
              )}

              {/* 1d — category pills (horizontal scroll, hidden scrollbar) */}
              {reviewsData?.data?.totalReviews > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-0.5 mb-[18px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {[
                    { label: "Quality", rating: 4 },
                    { label: "Build", rating: 5 },
                    { label: "Service", rating: 4 },
                    { label: "Value", rating: 5 },
                  ].map(({ label, rating }) => (
                    <div
                      key={label}
                      className="flex-none flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.12] rounded-full pl-2.5 pr-2 py-1.5"
                    >
                      <span className="text-[10px] font-semibold text-white/60 leading-none">
                        {label}
                      </span>
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-[#F5DEB3] leading-none">
                        {rating}
                        <i className="fa-solid fa-star text-[8px] text-[#C8A96E]"></i>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* 1d — Customer Photos: header + horizontal strip (hidden
                   scrollbar). Lightbox behaviour preserved. */}
              {(() => {
                const allImgsWithReview = (
                  reviewsData?.data?.reviews || []
                ).flatMap((r) =>
                  (r.imageUrls?.length
                    ? r.imageUrls
                    : r.imageUrl
                      ? [r.imageUrl]
                      : []
                  ).map((url) => ({ url, review: r })),
                );
                if (allImgsWithReview.length === 0) return null;
                const STRIP_MAX = 5;
                const stripItems = allImgsWithReview.slice(0, STRIP_MAX);
                const extra = allImgsWithReview.length - STRIP_MAX;
                return (
                  <div className="mb-5">
                    <div className="flex items-baseline justify-between mb-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
                        Customer Photos
                      </span>
                      <button
                        onClick={() =>
                          setLightboxData({ imgList: allImgsWithReview, currentIdx: 0 })
                        }
                        className="text-[11px] font-bold text-[#C8A96E] hover:text-[#F5DEB3] transition-colors"
                      >
                        View all ›
                      </button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {stripItems.map(({ url }, i) => {
                        const isLast = i === STRIP_MAX - 1 && extra > 0;
                        return (
                          <div
                            key={i}
                            onClick={() =>
                              setLightboxData({ imgList: allImgsWithReview, currentIdx: i })
                            }
                            className="relative flex-none w-[62px] h-[62px] rounded-[10px] overflow-hidden cursor-pointer"
                          >
                            <ReviewImg
                              src={url}
                              alt={`Customer photo ${i + 1}`}
                              className="w-full h-full hover:brightness-90 transition-all"
                            />
                            {isLast && (
                              <div className="absolute inset-0 bg-[#0f1c16]/55 flex items-center justify-center pointer-events-none">
                                <span className="text-white font-extrabold text-[15px]">
                                  +{extra}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* 1d — Write a Review (full-width outlined gold pill) */}
              {(reviewsData?.data?.totalReviews > 0 ||
                reviewsData?.data?.canReview) && (
                <button
                  onClick={() => {
                    const hasToken = !!localStorage.getItem("authToken");
                    if (!isAuthenticated && !hasToken) {
                      openLoginModal("openReviewForm");
                      return;
                    }
                    setEditingReviewId(null);
                    setReviewForm({ rating: 5, desc: "" });
                    setReviewImages([]);
                    setReviewImagePreviews([]);
                    setShowReviewForm((v) => !v);
                  }}
                  className="w-full flex items-center justify-center gap-2 border border-[#C8A96E]/55 text-[#F5DEB3] rounded-full px-5 py-3 text-[11px] font-bold uppercase tracking-[0.14em] hover:bg-[#C8A96E]/[0.12] transition-colors"
                >
                  <span className="text-[13px]">✎</span> Write a Review
                </button>
              )}
            </div>
            {/* end LEFT COLUMN */}

            {/* ── RIGHT COLUMN: Reviews ── */}
            <div
              id="pdp-all-reviews"
              className="md:max-h-[calc(100vh-6rem)] md:overflow-y-auto"
              style={{ scrollbarWidth: "none" }}
            >
              {reviewsData?.data?.reviews?.length > 0 ? (
                <>
                  {/* Desktop: top 2 reviews + show more */}
                  <div className="hidden md:block">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#F5DEB3]/50 mb-5">
                      All Reviews ({reviewsData.data.totalReviews})
                    </p>
                    <div className="space-y-4">
                      {reviewsData.data.reviews.map((review) => {
                        const isOwnReview =
                          currentUserId && review.userId === currentUserId;
                        const reviewImgs = review.imageUrls?.length
                          ? review.imageUrls
                          : review.imageUrl
                            ? [review.imageUrl]
                            : [];
                        return (
                          <div
                            key={review._id}
                            className="bg-[#FAF7F2] rounded-2xl p-4 lg:p-5 border border-[#1c3026]/10"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-full bg-[#1c3026] flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-[#F5DEB3] font-bold text-sm uppercase">
                                  {(review.userName || "?")[0]}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="text-[#1c3026] font-semibold text-sm leading-tight">
                                      {review.userName}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      <div className="flex gap-0.5">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                          <i
                                            key={s}
                                            className={`fa-star text-[10px] ${s <= review.rating ? "fa-solid text-[#C8A96E]" : "fa-regular text-[#1c3026]/15"}`}
                                          ></i>
                                        ))}
                                      </div>
                                      <span className="text-[9px] text-[#1c3026]/40">
                                        {new Date(
                                          review.createdAt,
                                        ).toLocaleDateString("en-IN", {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric",
                                        })}
                                      </span>
                                      <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                                        <i className="fa-solid fa-circle-check text-[7px]"></i>{" "}
                                        Verified
                                      </span>
                                    </div>
                                  </div>
                                  {isOwnReview && (
                                    <button
                                      onClick={() => handleEditReview(review)}
                                      className="w-6 h-6 flex items-center justify-center rounded-full border border-[#1c3026]/20 text-[#1c3026]/40 hover:text-[#1c3026] transition-colors shrink-0"
                                      title="Edit your review"
                                    >
                                      <i className="fa-solid fa-pen text-[9px]"></i>
                                    </button>
                                  )}
                                </div>
                                <p className="text-[#1c3026]/65 text-sm leading-relaxed mt-2">
                                  {review.desc}
                                </p>
                                {reviewImgs.length > 0 && (
                                  <div className="flex gap-2 mt-3">
                                    {reviewImgs.map((url, i) => {
                                      const allImgsWithReview = (
                                        reviewsData?.data?.reviews || []
                                      ).flatMap((r) =>
                                        (r.imageUrls?.length
                                          ? r.imageUrls
                                          : r.imageUrl
                                            ? [r.imageUrl]
                                            : []
                                        ).map((u) => ({ url: u, review: r })),
                                      );
                                      const clickedIdx =
                                        allImgsWithReview.findIndex(
                                          (item) =>
                                            item.url === url &&
                                            item.review._id === review._id,
                                        );
                                      return (
                                        <ReviewImg
                                          key={i}
                                          src={url}
                                          alt={`Review photo ${i + 1}`}
                                          className="w-14 h-14 rounded-lg border border-[#1c3026]/10 cursor-pointer hover:opacity-80 hover:scale-105 transition-all shrink-0"
                                          onClick={() =>
                                            setLightboxData({
                                              imgList: allImgsWithReview,
                                              currentIdx:
                                                clickedIdx >= 0
                                                  ? clickedIdx
                                                  : 0,
                                            })
                                          }
                                        />
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mobile: Flipkart-style horizontal scroll cards (no images) + Show all reviews */}
                  <div className="md:hidden mt-6">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#F5DEB3]/50 mb-4">
                      All Reviews ({reviewsData.data.totalReviews})
                    </p>
                    {/* Horizontal scroll cards */}
                    <div className="relative">
                    <div
                      ref={mobileReviewScrollRef}
                      onScroll={(e) => {
                        const el = e.currentTarget;
                        setMobileReviewScrollEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 10);
                      }}
                      className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1"
                      style={{ scrollbarWidth: "none" }}
                    >
                      {reviewsData.data.reviews.map((review) => {
                        const reviewImgs = review.imageUrls?.length
                          ? review.imageUrls
                          : review.imageUrl
                            ? [review.imageUrl]
                            : [];
                        return (
                          <div
                            key={review._id}
                            className="w-[72vw] sm:w-[46vw] bg-[#FAF7F2] rounded-2xl p-4 border border-[#1c3026]/10 cursor-pointer flex flex-col gap-2 shrink-0 active:opacity-80 transition-opacity overflow-hidden"
                            onClick={() => {
                              if (reviewImgs.length > 0) {
                                const allImgsWithReview = (
                                  reviewsData?.data?.reviews || []
                                ).flatMap((r) =>
                                  (r.imageUrls?.length
                                    ? r.imageUrls
                                    : r.imageUrl
                                      ? [r.imageUrl]
                                      : []
                                  ).map((u) => ({ url: u, review: r })),
                                );
                                const idx = allImgsWithReview.findIndex(
                                  (item) =>
                                    item.url === reviewImgs[0] &&
                                    item.review._id === review._id,
                                );
                                setLightboxData({
                                  imgList: allImgsWithReview,
                                  currentIdx: idx >= 0 ? idx : 0,
                                });
                              } else {
                                setLightboxData({
                                  imgList: [{ url: null, review }],
                                  currentIdx: 0,
                                });
                              }
                            }}
                          >
                            {/* Stars + date */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <i
                                    key={s}
                                    className={`fa-star text-[11px] ${s <= review.rating ? "fa-solid text-[#C8A96E]" : "fa-regular text-[#1c3026]/15"}`}
                                  ></i>
                                ))}
                              </div>
                              <span className="text-[10px] text-[#1c3026]/40 shrink-0">
                                {relativeDate(review.createdAt)}
                              </span>
                            </div>
                            {/* Review text — fixed height, scrollable */}
                            <div className="h-[130px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(28, 48, 38, 0.2) transparent' }}>
                              <p className="text-[#1c3026] text-sm leading-snug">
                                {review.desc}
                              </p>
                            </div>
                            {/* Name + verified */}
                            <div className="mt-auto pt-2 border-t border-[#1c3026]/8">
                              <p className="text-[#1c3026]/70 text-xs font-semibold leading-tight">
                                {review.userName}
                              </p>
                              <span className="text-[8px] font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                                <i className="fa-solid fa-circle-check text-[7px]"></i>{" "}
                                Verified Buyer
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Scroll arrow hint */}
                    {!mobileReviewScrollEnd && (
                      <button
                        onClick={() => {
                          mobileReviewScrollRef.current?.scrollBy({ left: window.innerWidth * 0.72, behavior: "smooth" });
                        }}
                        className="absolute right-0 top-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-[#1c3026] border border-[#F5DEB3]/20 text-[#F5DEB3]/70 shadow-md"
                        style={{ animation: "breathe 2s ease-in-out infinite", transform: "translateY(-50%)" }}
                        aria-label="Scroll reviews"
                      >
                        <i className="fa-solid fa-chevron-right text-[11px]"></i>
                      </button>
                    )}
                    </div>
                    {/* Show all reviews button */}
                    <button
                      onClick={() => setShowMobileAllReviews(true)}
                      className="mt-4 w-full py-3 border border-[#F5DEB3]/20 rounded-full text-[#F5DEB3]/60 text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:border-[#F5DEB3]/40 hover:text-[#F5DEB3]/80 transition-colors"
                    >
                      Show all reviews{" "}
                      <i className="fa-solid fa-chevron-right text-[10px]"></i>
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-10 border-t border-[#F5DEB3]/10">
                  <p className="text-[#F5DEB3]/30 italic text-sm">
                    No reviews yet for this product.
                  </p>
                  {reviewsData?.data?.canReview && (
                    <button
                      onClick={() => setShowReviewForm(true)}
                      className="mt-4 text-[#F5DEB3] text-[10px] font-bold uppercase tracking-widest border-b border-[#F5DEB3]/30 pb-0.5 hover:text-white transition-colors"
                    >
                      Be the first to review
                    </button>
                  )}
                </div>
              )}
            </div>
            {/* end RIGHT COLUMN */}
          </div>
          {/* end two-column grid */}

          {/* ── LIGHTBOXES — outside grid to avoid stacking context conflicts ── */}
          {/* Mobile Lightbox */}
          {lightboxData && curReview && (
            <div className="md:hidden fixed inset-0 z-[9999] flex flex-col bg-black">
              <div className="flex items-center px-4 py-3 bg-black shrink-0">
                <button onClick={() => setLightboxData(null)} className="text-white p-1">
                  <i className="fa-solid fa-arrow-left text-lg"></i>
                </button>
                {curUrl && (
                  <span className="text-white/50 text-xs font-mono ml-auto">
                    {lightboxData.currentIdx + 1}/{lightboxData.imgList.length}
                  </span>
                )}
              </div>
              {curUrl && (
                <div className="relative bg-black shrink-0" style={{ height: "52vh" }}>
                  <img src={curUrl} alt="Review" className="w-full h-full object-contain" loading="eager" />
                  {lightboxData.imgList.length > 1 && (
                    <>
                      <button
                        onClick={() => setLightboxData((prev) => ({ ...prev, currentIdx: (prev.currentIdx - 1 + prev.imgList.length) % prev.imgList.length }))}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 p-2"
                      >
                        <i className="fa-solid fa-chevron-left text-xl"></i>
                      </button>
                      <button
                        onClick={() => setLightboxData((prev) => ({ ...prev, currentIdx: (prev.currentIdx + 1) % prev.imgList.length }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 p-2"
                      >
                        <i className="fa-solid fa-chevron-right text-xl"></i>
                      </button>
                    </>
                  )}
                </div>
              )}
              <div className="flex-1 bg-white overflow-y-auto">
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm flex items-center gap-1 shrink-0">
                      {curReview.rating} <i className="fa-solid fa-star text-[8px]"></i>
                    </span>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map((s) => (
                        <i key={s} className={`fa-star text-xs ${s <= curReview.rating ? "fa-solid text-[#C8A96E]" : "fa-regular text-gray-200"}`}></i>
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-800 text-sm leading-relaxed">{curReview.desc}</p>
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-gray-100">
                    <span className="text-gray-700 text-[11px] font-semibold">{curReview.userName}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span className="text-[9px] font-bold text-green-600 flex items-center gap-0.5">
                      <i className="fa-solid fa-circle-check text-[8px]"></i> Certified Buyer
                    </span>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span className="text-gray-400 text-[10px]">{relativeDate(curReview.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Lightbox */}
          {lightboxData && curReview && (
            <div
              className="hidden md:flex fixed inset-0 bg-black/85 z-[9999] items-center justify-center p-8"
              onClick={() => setLightboxData(null)}
            >
              <div
                className="bg-white rounded-2xl overflow-hidden w-full max-w-3xl max-h-[92vh] flex shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative bg-gray-50 flex items-center justify-center w-[55%]">
                  <img src={curUrl} alt="Review" className="object-contain max-h-[88vh] w-full p-4" loading="eager" />
                  {lightboxData.imgList.length > 1 && (
                    <>
                      <button
                        onClick={() => setLightboxData((prev) => ({ ...prev, currentIdx: (prev.currentIdx - 1 + prev.imgList.length) % prev.imgList.length }))}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-gray-600 hover:bg-white shadow"
                      >
                        <i className="fa-solid fa-chevron-left text-xs"></i>
                      </button>
                      <button
                        onClick={() => setLightboxData((prev) => ({ ...prev, currentIdx: (prev.currentIdx + 1) % prev.imgList.length }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-gray-600 hover:bg-white shadow"
                      >
                        <i className="fa-solid fa-chevron-right text-xs"></i>
                      </button>
                    </>
                  )}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] bg-black/40 text-white px-2.5 py-0.5 rounded-full font-mono">
                    {lightboxData.currentIdx + 1}/{lightboxData.imgList.length}
                  </div>
                </div>
                <div className="w-[45%] flex flex-col overflow-y-auto">
                  <div className="flex justify-end p-3 border-b border-gray-100 shrink-0">
                    <button
                      onClick={() => setLightboxData(null)}
                      className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                    >
                      <i className="fa-solid fa-xmark text-sm"></i>
                    </button>
                  </div>
                  <div className="p-5 flex flex-col gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-[#1c3026] flex items-center justify-center shrink-0">
                        <span className="text-[#F5DEB3] font-bold text-sm uppercase">{(curReview.userName || "?")[0]}</span>
                      </div>
                      <div>
                        <p className="text-[#1c3026] font-semibold text-sm">{curReview.userName}</p>
                        <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded inline-flex items-center gap-1 mt-0.5">
                          <i className="fa-solid fa-circle-check text-[7px]"></i> Verified Purchase
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map((s) => (
                          <i key={s} className={`fa-star text-sm ${s <= curReview.rating ? "fa-solid text-[#C8A96E]" : "fa-regular text-gray-200"}`}></i>
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">{relativeDate(curReview.createdAt)}</span>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">{curReview.desc}</p>
                    {(() => {
                      const thisImgs = curReview.imageUrls?.length ? curReview.imageUrls : curReview.imageUrl ? [curReview.imageUrl] : [];
                      if (thisImgs.length <= 1) return null;
                      return (
                        <div className="flex gap-2 flex-wrap pt-3 border-t border-gray-100">
                          {thisImgs.map((thumbUrl, ti) => {
                            const gi = lightboxData.imgList.findIndex((item) => item.url === thumbUrl && item.review._id === curReview._id);
                            return (
                              <img
                                key={ti}
                                src={thumbUrl}
                                alt={`thumb ${ti + 1}`}
                                loading="lazy"
                                className={`w-14 h-14 object-cover rounded-lg cursor-pointer border-2 transition-all ${curUrl === thumbUrl ? "border-[#C8A96E]" : "border-transparent hover:border-gray-300"}`}
                                onClick={() => gi >= 0 && setLightboxData((prev) => ({ ...prev, currentIdx: gi }))}
                              />
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── MOBILE: "Show all reviews" fullscreen overlay ── */}
      {showMobileAllReviews && reviewsData?.data?.reviews?.length > 0 && (
        <div className="md:hidden fixed inset-0 z-[210] bg-[#1c3026] flex flex-col">
          {/* Header */}
          <div className="flex items-center px-4 py-4 border-b border-[#F5DEB3]/10 shrink-0">
            <button
              onClick={() => setShowMobileAllReviews(false)}
              className="text-[#F5DEB3] p-1 mr-3"
            >
              <i className="fa-solid fa-arrow-left text-lg"></i>
            </button>
            <span className="text-white font-semibold text-sm">
              All Reviews ({reviewsData.data.totalReviews})
            </span>
          </div>
          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {reviewsData.data.reviews.map((review) => {
              const isOwnReview =
                currentUserId && review.userId === currentUserId;
              const reviewImgs = review.imageUrls?.length
                ? review.imageUrls
                : review.imageUrl
                  ? [review.imageUrl]
                  : [];
              return (
                <div
                  key={review._id}
                  className="bg-[#FAF7F2] rounded-2xl p-4 border border-[#1c3026]/10"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1c3026] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[#F5DEB3] font-bold text-xs uppercase">
                        {(review.userName || "?")[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[#1c3026] font-semibold text-sm leading-tight">
                            {review.userName}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-0.5">
                              {review.rating}
                              <i className="fa-solid fa-star text-[7px]"></i>
                            </span>
                            <span className="text-[9px] text-[#1c3026]/40">
                              {new Date(review.createdAt).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </span>
                            <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                              <i className="fa-solid fa-circle-check text-[7px]"></i>{" "}
                              Verified
                            </span>
                          </div>
                        </div>
                        {isOwnReview && (
                          <button
                            onClick={() => {
                              setShowMobileAllReviews(false);
                              handleEditReview(review);
                            }}
                            className="w-6 h-6 flex items-center justify-center rounded-full border border-[#1c3026]/20 text-[#1c3026]/40 hover:text-[#1c3026] transition-colors shrink-0"
                          >
                            <i className="fa-solid fa-pen text-[9px]"></i>
                          </button>
                        )}
                      </div>
                      <p className="text-[#1c3026]/70 text-sm leading-relaxed mt-2">
                        {review.desc}
                      </p>
                      {reviewImgs.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {reviewImgs.map((url, i) => {
                            const allImgsWithReview = (
                              reviewsData?.data?.reviews || []
                            ).flatMap((r) =>
                              (r.imageUrls?.length
                                ? r.imageUrls
                                : r.imageUrl
                                  ? [r.imageUrl]
                                  : []
                              ).map((u) => ({ url: u, review: r })),
                            );
                            const clickedIdx = allImgsWithReview.findIndex(
                              (item) =>
                                item.url === url &&
                                item.review._id === review._id,
                            );
                            return (
                              <ReviewImg
                                key={i}
                                src={url}
                                alt={`Review photo ${i + 1}`}
                                className="w-14 h-14 rounded-lg border border-[#1c3026]/10 cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                                onClick={() => {
                                  setShowMobileAllReviews(false);
                                  setLightboxData({
                                    imgList: allImgsWithReview,
                                    currentIdx:
                                      clickedIdx >= 0 ? clickedIdx : 0,
                                  });
                                }}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile Sticky Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1c3026]/95 backdrop-blur-xl border-t border-[#F5DEB3]/20 z-50 lg:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        {/* Delivery strip above buttons — removed per request, keep for later reference
        <div className="flex items-center bg-white justify-center gap-4 px-4 py-2 border-b border-[#F5DEB3]/10">
          <span className="flex items-center gap-1.5 text-[9px] text-[#2e443c]/70 uppercase tracking-wider font-bold">
            <i className="fa-solid fa-truck text-[#2e443c] text-[9px]"></i>
            24–48 Hours
          </span>
          <span className="w-1 h-1 rounded-full bg-[#F5DEB3]/20"></span>
          <span className="flex items-center gap-1.5 text-[9px] text-[#2e443c]/70 uppercase tracking-wider font-bold">
            <i className="fa-solid fa-location-dot text-[#2e443c] text-[9px]"></i>
            Pan India
          </span>
          <span className="w-1 h-1 rounded-full bg-[#F5DEB3]/20"></span>
          <span className="flex items-center gap-1.5 text-[9px] text-[#2e443c]/70 uppercase tracking-wider font-bold">
            <i className="fa-solid fa-shield-halved text-[#2e443c] text-[9px]"></i>
            Secure Pay
          </span>
        </div>
        */}
        <div className="flex gap-4 items-center p-4 px-6">
          <div className="flex-1">
            {!isInCart ? (
              <button
                onClick={handleInitialAddToCart}
                disabled={product.productStatus !== "in_stock" || isAdding}
                className="w-full h-12 bg-[#F5DEB3] text-[#1c3026] rounded-full font-bold uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                {isAdding ? "Adding..." : "Add to Cart"}
                <span className="w-1 h-1 bg-[#1c3026] rounded-full"></span>
                <span>₹{currentPrice.toLocaleString()}</span>
              </button>
            ) : (
              <div className="flex gap-3 w-full">
                <div className="flex items-center justify-between bg-[#111f18] border border-[#F5DEB3]/20 rounded-full h-12 px-4 w-[120px]">
                  <button
                    onClick={() => handleUpdateQty(currentCartQty - 1)}
                    className="text-[#F5DEB3] p-1"
                  >
                    <i className="fa-solid fa-minus text-[10px]"></i>
                  </button>
                  <span className="font-serif text-[#F5DEB3] text-sm">
                    {currentCartQty}
                  </span>
                  <button
                    onClick={() => handleUpdateQty(currentCartQty + 1)}
                    className="text-[#F5DEB3] p-1"
                  >
                    <i className="fa-solid fa-plus text-[10px]"></i>
                  </button>
                </div>

                {/* Mobile: "Go to Cart" opens the real cart drawer directly
                    (not the quick mini-cart preview), so the customer lands in
                    the full cart in one tap. */}
                <button
                  onClick={openCart}
                  className="flex-1 h-12 bg-[#F5DEB3] text-[#1c3026] rounded-full font-bold uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                  <span className="relative flex items-center justify-center">
                    <i className="fa-solid fa-cart-shopping text-[11px]"></i>
                    {cartTotalQuantity > 0 && (
                      <span className="absolute -top-2 -right-2 min-w-[15px] h-[15px] px-0.5 rounded-full bg-[#1c3026] text-[#F5DEB3] text-[8px] font-bold flex items-center justify-center">
                        {cartTotalQuantity}
                      </span>
                    )}
                  </span>
                  Go to Cart
                  <i className="fa-solid fa-chevron-right text-[9px]"></i>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleWishlistToggle}
            className={`w-12 h-12 border rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
              isInWishlist
                ? "bg-red-500 border-red-500 text-white"
                : "border-[#F5DEB3]/20 text-[#F5DEB3] active:bg-[#F5DEB3] active:text-[#1c3026]"
            }`}
          >
            <i
              className={`${isInWishlist ? "fa-solid" : "fa-regular"} fa-heart`}
            ></i>
          </button>
        </div>
      </div>

      {showMiniCart && (
        <MiniCartPreview
          onClose={() => setShowMiniCart(false)}
          onViewCart={() => {
            setShowMiniCart(false);
            openCart();
          }}
        />
      )}

      {feedbackMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#F5DEB3] text-[#1c3026] px-6 py-3 rounded-full shadow-2xl z-[60] flex items-center gap-2 font-bold text-xs uppercase tracking-widest">
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
            onSwitchToLogin={() => {
              setShowSignup(false);
              openLoginModal();
            }}
          />
        )}
      </Suspense>
    </div>
  );
};

// Relative date helper
const relativeDate = (dateStr) => {
  const days = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 86400000,
  );
  if (days < 1) return "Today";
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
  return `${Math.floor(months / 12)} year${Math.floor(months / 12) > 1 ? "s" : ""} ago`;
};

// Lazy image with skeleton — mirrors OptimizedImage's IntersectionObserver pattern
const ReviewImg = ({ src, alt, className = "", onClick }) => {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin: "80px" },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      onClick={onClick}
    >
      {!loaded && (
        <div className="absolute inset-0 bg-[#d4cfc7] animate-pulse" />
      )}
      {inView && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
        />
      )}
    </div>
  );
};

const AccordionItem = ({ title, isOpen, onClick, children, noBorder = false }) => (
  <div className={`${noBorder ? "" : "border-b border-[#F5DEB3]/10"}`}>
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
      <div className="overflow-hidden">
        <div className="pb-6 text-gray-300 text-sm leading-relaxed font-light">
          {children}
        </div>
      </div>
    )}
  </div>
);

export default ProductDetailPage;

//mergeed with main