import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import confetti from 'canvas-confetti';
import SEOHead from '../../component/SEOHead';
import WishlistButton from '../../component/WishlistButton';
import UnProductCard from '../../component/UnProductCard';
import RecommendedProducts from '../../component/RecommendedProducts';
import NotifyMeModal from '../../component/NotifyMeModal';
import ComboBundleSection from '../../component/ComboBundleSection';
import ImageCarousel from '../../component/ImageCarousel';
import { motion, AnimatePresence } from 'motion/react';
import { ScrollColorBand } from '../../component/motion';
import { trackViewItem, trackAddToCart, trackRemoveFromCart, trackAddToWishlist, trackVariantSelect, trackShare, trackDeliveryCheck } from '../../utils/analytics';
import { useGetProductByIdQuery, useGetProductsQuery } from '../../store/api/productsApi';
import { useAddToCartMutation, useUpdateCartMutation, useCalculateShippingMutation } from '../../store/api/userApi';
import { useGetProductReviewsQuery, useSubmitProductReviewMutation, useUpdateProductReviewMutation } from '../../store/api/testimonialsApi';
import { addItem, updateQuantity, removeItem, updateSelection } from '../../store/slices/cartSlice';
import { useUI } from '../../hooks/useRedux';
import { useCartData } from '../../hooks/useCartSync';

const MotionDiv = motion.div;
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const productList = (res) => res?.data?.products || res?.data?.listofPublishedProducts || [];
const onImgErr = (e) => { e.currentTarget.src = '/assets/logo.webp'; };
const Stars = ({ n = 5, className = '' }) => {
  const r = Math.round(n);
  return <span className={`text-star ${className}`}>{'★'.repeat(Math.max(0, Math.min(5, r)))}{'☆'.repeat(Math.max(0, 5 - r))}</span>;
};

// Effective per-variant out-of-stock — mirrors the server rule: a manual admin
// flag, or a tracked quantity (variantQuantity != null) that has reached 0.
// A null/undefined quantity means "not stock-tracked" → never OOS by quantity.
const isVariantOutOfStock = (v) =>
  !!v &&
  (v.variantOutOfStock === true ||
    (v.variantQuantity != null && Number(v.variantQuantity) <= 0));

// At or below this many tracked units left, show an urgency "limited stock"
// badge to nudge the buyer. Tweak freely.
const LOW_STOCK_THRESHOLD = 5;

const ProductDetailPage = () => {
  const itemQty = (q) => (typeof q === 'object' && q !== null ? q.quantity || 0 : q || 0);

  const { productId, variantSku: urlVariantSku } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showNotification, openLoginModal } = useUI();

  const { isAuthenticated } = useSelector((state) => state.auth);
  const cartItems = useSelector((state) => state.cart.items);
  const cartSelections = useSelector((state) => state.cart.selections);
  const currentUserId = useSelector((state) => state.auth.user?.userId);

  const [selectedVariant, setSelectedVariant] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const buyBoxRef = useRef(null);
  const [buyBoxVisible, setBuyBoxVisible] = useState(true); // controls the sticky mobile CTA
  const [pinInput, setPinInput] = useState('');            // pincode delivery check
  const [pinStatus, setPinStatus] = useState(null);        // { ok, msg, charge, eta }
  const [showShare, setShowShare] = useState(false);       // desktop share row fallback
  const [showNotifyModal, setShowNotifyModal] = useState(false); // out-of-stock notify-me
  const [isAddingCombo, setIsAddingCombo] = useState(false);     // combo bundle add in flight

  const { data: productResponse, isLoading, error } = useGetProductByIdQuery(productId);
  const [addToCartAPI, { isLoading: isAdding }] = useAddToCartMutation();
  const [updateCart] = useUpdateCartMutation();
  const [checkPincode, { isLoading: isCheckingPin }] = useCalculateShippingMutation();
  const { refetch: refetchCart } = useCartData();

  const { data: reviewsData } = useGetProductReviewsQuery(productId);
  const [submitProductReview, { isLoading: isSubmittingReview }] = useSubmitProductReviewMutation();
  const [updateProductReview, { isLoading: isUpdatingReview }] = useUpdateProductReviewMutation();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, desc: '' });
  const [reviewImages, setReviewImages] = useState([]);
  const [reviewImagePreviews, setReviewImagePreviews] = useState([]);
  const reviewImageRef = useRef(null);
  const [lightbox, setLightbox] = useState(null); // {list:[url], idx}
  const [visibleReviews, setVisibleReviews] = useState(4); // progressive "show more" reviews

  const product = productResponse?.data;
  const { data: relRes } = useGetProductsQuery({ page: 1, limit: 8 });
  const related = useMemo(() => productList(relRes).filter((p) => p.productId !== productId).slice(0, 4), [relRes, productId]);

  // Product FAQs — use CMS-provided product.faqs if present, else generate helpful
  // defaults from the product's own data so buyers understand it before purchase.
  const productFaqs = useMemo(() => {
    if (Array.isArray(product?.faqs) && product.faqs.length) {
      return product.faqs.map((f) => ({ q: f.question || f.q, a: f.answer || f.a })).filter((f) => f.q && f.a);
    }
    if (!product) return [];
    const cat = (product.productCategory || '').toLowerCase();
    const isLamp = cat.includes('lamp');
    const list = [
      { q: 'How long does delivery take?', a: 'Every piece is 3D-printed to order and ships pan-India in 2–4 business days with tracking.' },
    ];
    if (isLamp) list.push({ q: 'How is it powered?', a: 'It runs on a USB adapter (included) — just plug in and switch it on. No batteries required.' });
    list.push({ q: 'What is it made of?', a: `Precision 3D-printed with a durable build and a hand-finished ${isLamp ? 'glossy resin' : 'premium'} coat, so no two are exactly alike.` });
    list.push({
      q: product.isCodAvailable ? 'Is Cash on Delivery available?' : 'What payment methods do you accept?',
      a: product.isCodAvailable ? 'Yes — COD is available at checkout, alongside UPI, cards, net-banking and wallets.' : 'We accept UPI, credit/debit cards, net-banking and wallets at checkout.',
    });
    list.push({ q: 'Can I return or exchange it?', a: '7-day easy returns on unused items in original condition — reach out and we’ll sort it quickly.' });
    return list;
  }, [product]);

  // Cross-sell: pair a lamp with a pen stand (and vice-versa) — "complete the set".
  const crossSell = useMemo(() => {
    const all = productList(relRes).filter((p) => p.productId !== productId);
    const viewingPen = /pen/i.test(product?.productCategory || '') || /pen/i.test(product?.productName || '');
    const match = all.find((p) =>
      viewingPen
        ? /lamp/i.test(p.productCategory || '')
        : (/pen/i.test(p.productCategory || '') || /pen/i.test(p.productName || ''))
    );
    return match || null;
  }, [relRes, product, productId]);
  const crossSellVariant = crossSell?.variantDetails?.[0];
  const crossSellPrice = crossSellVariant?.variantPrice || 0;
  const crossSellImg = crossSellVariant?.variantImage?.[0] || crossSell?.productImg || 'https://urbannook.in/assets/logo.webp';
  const crossSellInCart = useMemo(
    () => !!crossSell && cartItems.some((i) => [i.id, i.mongoId, i.productId].map(String).includes(String(crossSell.productId))),
    [cartItems, crossSell]
  );

  const currentPrice = useMemo(() => {
    if (!product?.variantDetails?.length) return 0;
    const sel = product.variantDetails.find((v) => v.variantName === selectedVariant);
    return (sel && sel.variantPrice) || product.variantDetails[0].variantPrice || 0;
  }, [product, selectedVariant]);

  const { maxVariantPrice, discountPercent } = useMemo(() => {
    if (!product?.variantDetails?.length) return { maxVariantPrice: 0, discountPercent: 0 };
    const maxPrice = Math.max(...product.variantDetails.map((v) => v.variantPrice || 0));
    const discount = maxPrice > currentPrice ? Math.round(((maxPrice - currentPrice) / maxPrice) * 100) : 0;
    return { maxVariantPrice: maxPrice, discountPercent: discount };
  }, [product, currentPrice]);

  const availableVariants = useMemo(() => (product?.variantDetails ? product.variantDetails.map((v) => v.variantName) : []), [product]);

  // Admin-curated combo + recommendation rows (empty => sections render nothing).
  const comboProducts = product?.comboProductsDetails || [];
  const recommendedProducts = product?.recommendedProductsDetails || [];

  // Stock state for the SELECTED variant — the page-level productStatus is
  // only half the answer; a single variant can be out while the product is in.
  const selectedVariantObj = useMemo(
    () => product?.variantDetails?.find((v) => v.variantName === (selectedVariant || availableVariants[0])) || null,
    [product, selectedVariant, availableVariants],
  );
  const selectedVariantOOS = useMemo(() => isVariantOutOfStock(selectedVariantObj), [selectedVariantObj]);
  const isOutOfStock = (product && product.productStatus !== 'in_stock') || selectedVariantOOS;
  const selectedVariantQty = selectedVariantObj?.variantQuantity;
  const selectedVariantLowStock = useMemo(() => {
    const q = selectedVariantObj?.variantQuantity;
    return q != null && Number(q) > 0 && Number(q) <= LOW_STOCK_THRESHOLD;
  }, [selectedVariantObj]);

  const galleryImages = useMemo(() => {
    if (!product?.variantDetails?.length) return ['https://urbannook.in/assets/logo.webp'];
    const sel = product.variantDetails.find((v) => v.variantName === selectedVariant);
    if (sel?.variantImage?.length) return sel.variantImage;
    if (product.variantDetails[0].variantImage?.length) return product.variantDetails[0].variantImage;
    return ['https://urbannook.in/assets/logo.webp'];
  }, [product, selectedVariant]);

  useEffect(() => {
    if (availableVariants.length > 0 && product) {
      let initial = availableVariants[0];
      if (urlVariantSku) {
        const matched = product.variantDetails?.find((v) => v.sku === urlVariantSku);
        if (matched) initial = matched.variantName;
      } else {
        const saved = cartSelections[product.productId];
        if (saved?.variant && availableVariants.includes(saved.variant)) initial = saved.variant;
      }
      setSelectedVariant(initial);
    } else if (!product) setSelectedVariant('');
  }, [product?.productId, availableVariants, cartSelections, product, urlVariantSku]);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Reset the pincode check + share row when navigating to another product —
  // the component stays mounted, and a quote computed for product A's weight/price
  // must not display under product B.
  useEffect(() => {
    setPinStatus(null);
    setPinInput('');
    setShowShare(false);
  }, [product?.productId]);

  // Show the sticky mobile CTA only once the main Add-to-Cart box has scrolled out of view.
  useEffect(() => {
    const el = buyBoxRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setBuyBoxVisible(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [product?.productId]);

  const viewedProductRef = useRef(null);
  useEffect(() => {
    if (product && selectedVariant && viewedProductRef.current !== product.productId) {
      viewedProductRef.current = product.productId;
      trackViewItem({ itemId: product.productId, itemName: product.productName, itemVariant: selectedVariant, price: currentPrice, quantity: 1 });
    }
  }, [product?.productId, selectedVariant, currentPrice]);

  const cartItem = useMemo(() => {
    if (!product) return null;
    return cartItems.find((item) => {
      const idMatch = String(item.id) === String(product?.productId) || String(item.mongoId) === String(product?.productId) || String(item.productId) === String(product?.productId);
      if (!idMatch) return false;
      const effVar = selectedVariant || availableVariants[0] || 'N/A';
      return (item.selectedVariant || 'N/A') === effVar;
    });
  }, [cartItems, product, selectedVariant, availableVariants]);

  const isInCart = !!cartItem;
  const currentCartQty = cartItem ? Number(itemQty(cartItem.quantity)) || 0 : 0;

  const onSelectVariant = (v) => {
    setSelectedVariant(v.variantName);
    setPinStatus(null); // quote was priced for the previous variant — require a re-check
    trackVariantSelect?.({ itemId: product.productId, itemName: product.productName, itemVariant: v.variantName, price: v.variantPrice });
    if (v.sku) navigate(`/product/${product.productId}/${v.sku}`, { replace: true });
  };

  const variantImage = (name) => {
    const v = product?.variantDetails?.find((x) => x.variantName === name);
    return v?.variantImage?.[0] || product?.variantDetails?.[0]?.variantImage?.[0] || 'https://urbannook.in/assets/logo.webp';
  };

  const handleInitialAddToCart = async () => {
    if (!product) return;
    const effectiveVariant = selectedVariant || availableVariants[0] || 'Standard Variant';
    const selectedImage = variantImage(effectiveVariant);
    const isLoggedIn = isAuthenticated || !!localStorage.getItem('authToken');

    if (isLoggedIn) {
      try {
        await addToCartAPI({ productId: product?.productId, quantity: 1, variant: effectiveVariant, image: selectedImage }).unwrap();
        dispatch(updateSelection({ productId: product.productId, quantity: 1, variant: effectiveVariant }));
        await refetchCart().unwrap();
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#E63329', '#C9281F', '#F3C33B', '#ffffff'] });
        setSelectedVariant(effectiveVariant);
        setFeedbackMessage('Added to cart'); setTimeout(() => setFeedbackMessage(''), 2000);
        trackAddToCart({ itemId: product.productId, itemName: product.productName, itemVariant: effectiveVariant, price: currentPrice, quantity: 1 });
      } catch (err) {
        showNotification(err.data?.message || 'Something went wrong', 'error');
      }
    } else {
      dispatch(addItem({ id: product?.productId, mongoId: product?.productId, name: product?.productName, price: currentPrice, image: selectedImage, quantity: 1, selectedVariant: effectiveVariant, giftWrapEligible: !!product?.giftWrapEligible }));
      setSelectedVariant(effectiveVariant);
      setFeedbackMessage('Added to cart'); setTimeout(() => setFeedbackMessage(''), 2000);
      trackAddToCart({ itemId: product.productId, itemName: product.productName, itemVariant: effectiveVariant, price: currentPrice, quantity: 1 });
    }

  };

  const addCrossSell = async () => {
    if (!crossSell) return;
    const vName = crossSellVariant?.variantName || 'Standard Variant';
    const isLoggedIn = isAuthenticated || !!localStorage.getItem('authToken');
    try {
      if (isLoggedIn) {
        await addToCartAPI({ productId: crossSell.productId, quantity: 1, variant: vName, image: crossSellImg }).unwrap();
        await refetchCart().unwrap();
      } else {
        dispatch(addItem({ id: crossSell.productId, mongoId: crossSell.productId, name: crossSell.productName, price: crossSellPrice, image: crossSellImg, quantity: 1, selectedVariant: vName }));
      }
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 }, colors: ['#E63329', '#F3C33B', '#ffffff'] });
      trackAddToCart({ itemId: crossSell.productId, itemName: crossSell.productName, itemVariant: vName, price: crossSellPrice, quantity: 1 });
    } catch (err) {
      showNotification(err?.data?.message || 'Something went wrong', 'error');
    }
  };

  // Adds every item the customer kept in the static "buy together" section
  // (the main product at whatever variant is selected there, plus each kept
  // companion). This section is standalone — it doesn't assume the main
  // product is already in the cart, so it always adds it too; the cart
  // reducer/server merges quantity when the same product+variant is already in.
  const handleAddComboBundle = async (selections) => {
    if (!selections?.length) return;

    setIsAddingCombo(true);
    const isLoggedIn = isAuthenticated || !!localStorage.getItem("authToken");

    try {
      // Sequential, not Promise.all — the cart endpoint mutates one shared
      // cart doc, so parallel writes can clobber each other.
      for (const { product: combo, variantName } of selections) {
        const variantDetail =
          combo.variantDetails?.find((v) => v.variantName === variantName) ||
          combo.variantDetails?.[0];
        const image =
          variantDetail?.variantImage?.[0] ||
          combo.productImg ||
          "https://urbannook.in/assets/logo.webp";
        const price = Number(variantDetail?.variantPrice ?? 0);
        const variant = variantDetail?.variantName || "Standard Variant";

        if (isLoggedIn) {
          await addToCartAPI({
            productId: combo.productId,
            quantity: 1,
            variant,
            image,
          }).unwrap();
        } else {
          dispatch(
            addItem({
              id: combo.productId,
              mongoId: combo.productId,
              name: combo.productName,
              price,
              image,
              quantity: 1,
              selectedVariant: variant,
              giftWrapEligible: !!combo.giftWrapEligible,
            }),
          );
        }

        trackAddToCart({
          itemId: combo.productId,
          itemName: combo.productName,
          itemVariant: variant,
          price,
          quantity: 1,
        });
      }

      if (isLoggedIn) await refetchCart().unwrap();

      setFeedbackMessage(
        selections.length > 1 ? "Items added to cart" : "Added to cart",
      );
      setTimeout(() => setFeedbackMessage(""), 2000);
    } catch (err) {
      console.error("Combo bundle add failed:", err);
      showNotification(err.data?.message || "Could not add the bundle", "error");
    } finally {
      setIsAddingCombo(false);
    }
  };

  const handleUpdateQty = async (newQuantity) => {
    if (!product) return;
    const isLoggedIn = isAuthenticated || !!localStorage.getItem('authToken');
    const selectedImage = variantImage(selectedVariant);

    if (newQuantity < 1) {
      if (isLoggedIn) {
        try { await updateCart({ productId: product.productId, quantity: 1, action: 'remove', variant: selectedVariant || undefined, image: selectedImage }).unwrap(); await refetchCart(); }
        catch { showNotification('Failed to update cart', 'error'); }
      } else dispatch(removeItem({ id: product?.productId, selectedVariant: selectedVariant || 'N/A' }));
      trackRemoveFromCart({ itemId: product.productId, itemName: product.productName, itemVariant: selectedVariant, price: currentPrice, quantity: currentCartQty || 1 });
      return;
    }
    if (isLoggedIn) {
      try { await updateCart({ productId: product.productId, quantity: 1, action: newQuantity > currentCartQty ? 'add' : 'sub', variant: selectedVariant || undefined, image: selectedImage }).unwrap(); await refetchCart(); }
      catch { window.location.reload(); }
    } else dispatch(updateQuantity({ id: product.productId, quantity: newQuantity, selectedVariant: selectedVariant || 'N/A' }));
  };

  const handleCheckoutClick = () => navigate('/checkout');

  // ── Pincode delivery check — same ShipMozo rate API the checkout uses ──
  const handlePinCheck = async () => {
    const pin = pinInput.trim();
    if (!/^[1-9][0-9]{5}$/.test(pin)) { setPinStatus({ ok: false, msg: 'Please enter a valid 6-digit pincode' }); return; }
    try {
      const res = await checkPincode({
        deliveryPinCode: parseInt(pin, 10),
        cartItems: [{ productId: product.productId, quant: 1, price: currentPrice, selectedVariant: selectedVariant || undefined }],
        paymentType: 'PREPAID',
      }).unwrap();
      const charge = Math.ceil(parseFloat(res?.data?.total_charges));
      // Ships in 2–4 days + courier transit — show the outer estimate as the promise date.
      const eta = new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      setPinStatus({ ok: true, msg: `Delivery available to ${pin}`, charge: Number.isFinite(charge) ? charge : null, eta });
      trackDeliveryCheck({ pincode: pin, serviceable: true, shippingAmount: charge });
    } catch (err) {
      const reason = err?.data?.message || err?.message || '';
      setPinStatus({ ok: false, msg: /serviceable/i.test(reason) ? `Sorry — ${pin} isn't serviceable yet` : 'Could not check this pincode. Please try again.' });
      trackDeliveryCheck({ pincode: pin, serviceable: false, errorReason: reason });
    }
  };

  // ── Share — native sheet on mobile, social buttons on desktop ──
  const shareUrl = `https://www.urbannook.in/product/${product?.productId}`;
  const shareText = `${product?.productName || 'Urban Nook'} — Urban Nook`;
  const openShare = (method, href) => {
    trackShare({ contentType: 'product', itemId: product.productId, method });
    window.open(href, '_blank', 'noopener,noreferrer');
  };
  const handleShareClick = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: shareText, text: shareText, url: shareUrl });
        trackShare({ contentType: 'product', itemId: product.productId, method: 'native' });
      } catch { /* user dismissed the sheet */ }
    } else {
      setShowShare((s) => !s);
    }
  };
  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setFeedbackMessage('Link copied'); setTimeout(() => setFeedbackMessage(''), 2000);
    } catch { /* clipboard unavailable */ }
    trackShare({ contentType: 'product', itemId: product.productId, method: 'copy_link' });
  };

  // reviews
  const rd = reviewsData?.data || {};
  const reviews = useMemo(() => rd.reviews || [], [rd.reviews]);
  const avgRating = rd.avgRating || 0;
  const totalReviews = rd.totalReviews || reviews.length;

  // Count of reviews per star (index 0 = 1★ … 4 = 5★) for the distribution bars.
  const ratingDist = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    reviews.forEach((r) => { const n = Math.round(r.rating || 0); if (n >= 1 && n <= 5) counts[n - 1]++; });
    return counts;
  }, [reviews]);

  // All customer-uploaded review photos, for the editorial "In the wild" showcase.
  const communityShots = useMemo(() => {
    const shots = [];
    reviews.forEach((r) => {
      const imgs = r.imageUrls?.length ? r.imageUrls : (r.imageUrl ? [r.imageUrl] : []);
      imgs.forEach((u) => shots.push({ url: u, name: r.userName || 'Customer' }));
    });
    return shots.slice(0, 8);
  }, [reviews]);
  // Stable URL array so the carousel doesn't reset every render.
  const communityShotUrls = useMemo(() => communityShots.map((s) => s.url), [communityShots]);

  const openReviewForm = () => {
    if (!isAuthenticated && !localStorage.getItem('authToken')) { openLoginModal('openReviewForm'); return; }
    setEditingReviewId(null); setReviewForm({ rating: 5, desc: '' }); setReviewImages([]); setReviewImagePreviews([]); setShowReviewForm(true);
  };
  useEffect(() => {
    const handler = (e) => { if (e.detail?.callback === 'openReviewForm') setShowReviewForm(true); };
    window.addEventListener('loginSuccess', handler);
    return () => window.removeEventListener('loginSuccess', handler);
  }, []);

  const handleSubmitReview = async () => {
    if (!isAuthenticated && !localStorage.getItem('authToken')) { openLoginModal('openReviewForm'); return; }
    if (!reviewForm.desc.trim()) { showNotification('Please write a review', 'error'); return; }
    const formData = new FormData();
    formData.append('productId', productId);
    formData.append('desc', reviewForm.desc);
    formData.append('rating', reviewForm.rating);
    reviewImages.forEach((img) => formData.append('images', img));
    try {
      if (editingReviewId) { await updateProductReview({ reviewId: editingReviewId, formData }).unwrap(); showNotification('Review updated! It will appear after admin approval.', 'success'); }
      else { await submitProductReview(formData).unwrap(); showNotification('Review submitted! It will appear after admin approval.', 'success'); }
      setShowReviewForm(false); setEditingReviewId(null); setReviewForm({ rating: 5, desc: '' }); setReviewImages([]); setReviewImagePreviews([]);
    } catch (err) { showNotification(err?.data?.message || 'Failed to submit review', 'error'); }
  };
  const handleEditReview = (review) => {
    setEditingReviewId(review._id); setReviewForm({ rating: review.rating, desc: review.desc }); setReviewImages([]);
    setReviewImagePreviews(review.imageUrls?.length ? review.imageUrls : review.imageUrl ? [review.imageUrl] : []);
    setShowReviewForm(true);
    setTimeout(() => document.getElementById('review-form-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };
  const handleAddReviewImage = (e) => {
    const files = Array.from(e.target.files || []); const toAdd = files.slice(0, 3 - reviewImages.length);
    setReviewImages((prev) => [...prev, ...toAdd]); setReviewImagePreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]); e.target.value = '';
  };
  const handleRemoveReviewImage = (idx) => { setReviewImages((p) => p.filter((_, i) => i !== idx)); setReviewImagePreviews((p) => p.filter((_, i) => i !== idx)); };

  if (isLoading) return <div className="min-h-[70vh] grid place-items-center bg-paper"><div className="w-12 h-12 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>;
  if (error || !product) return (
    <div className="min-h-[70vh] grid place-items-center bg-paper font-inter text-center px-5">
      <div><h1 className="text-3xl font-extrabold">Product not found</h1><button onClick={() => navigate('/products')} className="gl-press mt-5 bg-brand text-white font-bold px-7 py-3 rounded-xl hover:bg-brandHi">Back to Shop</button></div>
    </div>
  );

  const specs = product.specifications || [];
  const structuredData = {
    '@context': 'https://schema.org', '@type': 'Product', name: product.productName, image: galleryImages, description: product.productSubDes || product.productDes, sku: product.productId,
    brand: { '@type': 'Brand', name: 'UrbanNook' },
    offers: { '@type': 'Offer', url: `https://www.urbannook.in/product/${product.productId}`, priceCurrency: 'INR', price: currentPrice, availability: product.productStatus === 'in_stock' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
  };

  return (
    <div className="font-inter bg-paper text-ink min-h-screen overflow-x-clip">
      <SEOHead title={product.productName} description={product.productSubDes || product.productDes} url={`/product/${product.productId}`} image={galleryImages[0]} structuredData={structuredData} />

      <div className="max-w-[1280px] mx-auto px-5 py-6 md:py-8">
        {/* breadcrumb */}
        <div className="text-sm text-faint mb-5">
          <button onClick={() => navigate('/')} className="hover:text-brand">Home</button> / <button onClick={() => navigate('/products')} className="hover:text-brand">{product.productCategory || 'Shop'}</button> / <span className="text-ink">{product.productName}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-10">
          {/* GALLERY — one big full-width framed image (swipe + dots on mobile, arrows on desktop) */}
          <div className="lg:sticky lg:top-24 self-start w-full min-w-0">
            <ImageCarousel images={galleryImages} alt={product.productName} onImgErr={onImgErr} onItemClick={(i) => setLightbox({ list: galleryImages, idx: i })} />
          </div>

          {/* INFO */}
          <div className="min-w-0">
            {/* ZONE A — IDENTITY (on paper): kicker + rating chip, title + heart, lede */}
            <div className="flex items-center justify-between gap-3">
              <p className="gl-lbl text-brand">{product.productSubCategory || product.productCategory || '3D Printed'}</p>
              {totalReviews > 0 && (
                <button onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })} className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-hair px-2.5 py-1 hover:border-ink transition-colors">
                  <Stars n={avgRating || 5} className="text-xs" />
                  <span className="text-xs font-bold text-ink">{(avgRating || 4.8).toFixed?.(1) || avgRating}</span>
                  <span className="text-xs text-muted">({totalReviews})</span>
                </button>
              )}
            </div>
            <div className="flex items-start justify-between gap-3 mt-2">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-ink leading-tight">{product.productName}</h1>
              <div className="shrink-0 pt-1 flex items-center gap-2">
                <button onClick={handleShareClick} aria-label="Share this product" className="w-9 h-9 grid place-items-center rounded-full border border-hair text-ink hover:border-ink transition-colors">
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.7 13.5 6.6 3.9M15.3 6.6 8.7 10.5" /></svg>
                </button>
                <WishlistButton productId={product.productId} />
              </div>
            </div>
            {showShare && (
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs font-bold text-muted mr-1">Share:</span>
                <button onClick={() => openShare('whatsapp', `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`)} aria-label="Share on WhatsApp" className="w-9 h-9 grid place-items-center rounded-full border border-hair text-ink hover:border-ink hover:bg-surface transition-colors"><i className="fa-brands fa-whatsapp text-base" /></button>
                <button onClick={() => openShare('facebook', `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`)} aria-label="Share on Facebook" className="w-9 h-9 grid place-items-center rounded-full border border-hair text-ink hover:border-ink hover:bg-surface transition-colors"><i className="fa-brands fa-facebook-f text-sm" /></button>
                <button onClick={() => openShare('x', `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`)} aria-label="Share on X" className="w-9 h-9 grid place-items-center rounded-full border border-hair text-ink hover:border-ink hover:bg-surface transition-colors"><i className="fa-brands fa-x-twitter text-sm" /></button>
                <button onClick={() => openShare('instagram', 'https://www.instagram.com/urbannook.store')} aria-label="Instagram" className="w-9 h-9 grid place-items-center rounded-full border border-hair text-ink hover:border-ink hover:bg-surface transition-colors"><i className="fa-brands fa-instagram text-base" /></button>
                <button onClick={copyShareLink} aria-label="Copy link" className="w-9 h-9 grid place-items-center rounded-full border border-hair text-ink hover:border-ink hover:bg-surface transition-colors"><i className="fa-solid fa-link text-xs" /></button>
              </div>
            )}
            {(product.productDes || product.productSubDes) && <p className="text-sm text-muted leading-relaxed mt-2 line-clamp-2">{product.productDes || product.productSubDes}</p>}

            {/* ZONE B — BUY CARD: price → savings → variants → urgency → CTA → trust, one unit */}
            <div className="mt-5  bg-paper p-4 md:p-5 md:max-w-md">
              {/* price hero */}
              <div className="flex items-baseline flex-wrap gap-x-3 gap-y-1">
                <span className="text-4xl md:text-5xl font-extrabold text-ink tracking-tight tabular-nums leading-none">{inr(currentPrice)}</span>
                {discountPercent > 0 && (
                  <>
                    <span className="text-base text-faint line-through tabular-nums">{inr(maxVariantPrice)}</span>
                    <span className="gl-lbl text-[11px] text-save bg-save/10 px-2 py-0.5 rounded-md">{discountPercent}% OFF</span>
                  </>
                )}
              </div>
              {discountPercent > 0 && <p className="text-sm font-semibold text-save mt-1">You save {inr(maxVariantPrice - currentPrice)}</p>}

              {/* variants */}
              {availableVariants.length > 0 && (
                <>
                  <div className="border-t border-hair my-4" />
                  <p className="gl-lbl text-ink mb-2">{product.productCategory === 'Lamp' ? 'Marque' : 'Variant'} · <span className="normal-case tracking-normal font-semibold text-muted">{selectedVariant}</span></p>
                  <div className="flex gap-2 flex-wrap">
                    {product.variantDetails.map((v, i) => (
                      <button
                        key={i}
                        onClick={() => onSelectVariant(v)}
                        className={`gl-press px-4 h-10 rounded-xl border text-sm font-semibold transition-colors ${v.variantName === selectedVariant ? 'border-brand bg-brand/5 text-brand' : 'border-hair bg-white text-ink hover:border-ink'}`}
                      >
                        {v.variantName}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* urgency + delivery */}
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs mt-4">
                {isOutOfStock ? (
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-faint" /><span className="text-muted font-semibold">Out of stock</span></span>
                ) : selectedVariantLowStock ? (
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand animate-pulse" /><span className="text-brand font-semibold">Only {selectedVariantQty} left</span></span>
                ) : (
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-save" /><span className="text-ink font-semibold">In stock</span></span>
                )}
                <span className="text-muted">🚚 Ships in 2–4 days</span>
              </div>

              {/* CTA */}
              <div ref={buyBoxRef} className="flex items-center gap-3 mt-4">
                {isOutOfStock ? (
                  <button
                    onClick={() => setShowNotifyModal(true)}
                    className="gl-press flex-1 h-12 border border-ink text-ink font-bold text-sm rounded-xl hover:bg-ink hover:text-paper transition-colors flex items-center justify-center gap-2"
                  >
                    <i className="fa-regular fa-bell text-xs" /> Notify me when back
                  </button>
                ) : isInCart ? (
                  <>
                    <div className="flex items-center border border-ink rounded-xl h-12 shrink-0">
                      <button onClick={() => handleUpdateQty(currentCartQty - 1)} className="w-10 h-full text-lg">−</button>
                      <span className="w-8 text-center font-bold">{currentCartQty}</span>
                      <button onClick={() => handleUpdateQty(currentCartQty + 1)} className="w-10 h-full text-lg">+</button>
                    </div>
                    <button onClick={handleCheckoutClick} className="gl-press flex-1 h-12 bg-brand text-paper font-bold text-sm rounded-xl hover:bg-brandHi">Go to Checkout</button>
                  </>
                ) : (
                  <>
                    <button onClick={handleInitialAddToCart} disabled={isAdding} className="gl-press flex-1 h-12 bg-brand text-paper font-bold text-sm rounded-xl hover:bg-brandHi disabled:opacity-60 whitespace-nowrap">
                      {isAdding ? 'Adding…' : <>Add to Cart</>}
                    </button>
                    {/* <button onClick={handleCheckoutClick} className="gl-press flex-1 h-12 border border-ink text-ink font-bold text-sm rounded-xl hover:bg-ink hover:text-paper transition-colors whitespace-nowrap">Buy it Now</button> */}
                  </>
                )}
              </div>

              {/* pincode delivery check */}
              <div className="mt-4 pt-4 border-t border-hair">
                <p className="gl-lbl text-ink mb-2">Check delivery</p>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={6}
                    value={pinInput}
                    onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6)); if (pinStatus) setPinStatus(null); }}
                    onKeyDown={(e) => e.key === 'Enter' && !isCheckingPin && pinInput.length === 6 && handlePinCheck()}
                    placeholder="Enter 6-digit pincode"
                    className="flex-1 min-w-0 h-11 px-3.5 rounded-xl border border-hair bg-white text-sm text-ink outline-none focus:border-brand tabular-nums"
                  />
                  <button
                    onClick={handlePinCheck}
                    disabled={isCheckingPin || pinInput.length !== 6}
                    className="gl-press h-11 px-5 rounded-xl border border-ink text-ink font-bold text-sm hover:bg-ink hover:text-paper transition-colors disabled:opacity-40 shrink-0"
                  >
                    {isCheckingPin ? 'Checking…' : 'Check'}
                  </button>
                </div>
                {pinStatus && (
                  pinStatus.ok ? (
                    <div className="mt-2 text-sm font-semibold text-save">
                      ✓ {pinStatus.msg}
                      <span className="block text-xs font-medium text-muted mt-0.5">
                        Expected delivery by {pinStatus.eta}{pinStatus.charge != null && <> · Shipping {inr(pinStatus.charge)}</>}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-brand">✕ {pinStatus.msg}</p>
                  )
                )}
              </div>

              {/* trust strip inside the card */}
              <div className="mt-4 pt-4 border-t border-hair grid grid-cols-3 divide-x divide-hair text-center text-[11px] text-muted">
                <div className="px-1 flex flex-col items-center gap-1"><span className="text-lg">🚚</span>2–4 days</div>
                <div className="px-1 flex flex-col items-center gap-1"><span className="text-lg">💸</span>{product.isCodAvailable ? 'COD available' : 'Secure pay'}</div>
                <div className="px-1 flex flex-col items-center gap-1"><span className="text-lg">↺</span>7-day returns</div>
              </div>
            </div>

            {/* OFFERS — UPI / EMI / card offers, applied via Razorpay at checkout */}
            <div className="mt-4 rounded-2xl border border-hair bg-white p-4 md:max-w-md">
              <div className="flex items-center justify-between mb-3">
                <p className="gl-lbl text-brand">Available offers</p>
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Powered by Razorpay</span>
              </div>
              <ul className="space-y-2.5 text-sm text-ink">
                <li className="flex items-start gap-2.5">
                  <i className="fa-solid fa-bolt text-brand text-xs mt-1 w-4 text-center shrink-0" />
                  <span><b>UPI</b> — pay instantly with GPay, PhonePe, Paytm &amp; more</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <i className="fa-regular fa-credit-card text-brand text-xs mt-1 w-4 text-center shrink-0" />
                  <span><b>EMI</b> available on eligible credit &amp; debit cards</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <i className="fa-solid fa-tag text-brand text-xs mt-1 w-4 text-center shrink-0" />
                  <span>Bank &amp; card <b>offers auto-applied</b> on the payment page</span>
                </li>
                {product.isCodAvailable && (
                  <li className="flex items-start gap-2.5">
                    <i className="fa-solid fa-money-bill-wave text-brand text-xs mt-1 w-4 text-center shrink-0" />
                    <span><b>Cash on Delivery</b> available for this product</span>
                  </li>
                )}
              </ul>
            </div>

            {/* ZONE C — complete the set (secondary card) */}
            {crossSell && (
              <div className="mt-4 rounded-2xl border border-hair bg-white p-4 md:max-w-md">
                <div className="flex items-center justify-between mb-3">
                  <p className="gl-lbl text-brand">Complete the set</p>
                  <span className="text-[11px] font-bold text-muted flex items-center gap-1">🔗 Frequently bought together</span>
                </div>
                <div className="flex items-center gap-3">
                  <img src={crossSellImg} alt={crossSell.productName} onClick={() => navigate(`/product/${crossSell.productId}`)} className="w-16 h-16 rounded-xl object-cover border border-hair cursor-pointer shrink-0" onError={onImgErr} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{crossSell.productName}</p>
                    <p className="text-xs text-muted">Pairs with your {(product.productCategory || 'lamp').toLowerCase()}</p>
                    <p className="text-sm font-extrabold mt-0.5">{inr(crossSellPrice)}</p>
                  </div>
                  {crossSellInCart ? (
                    <span className="shrink-0 flex items-center gap-1.5 text-sm font-bold text-save">
                      <span className="w-5 h-5 rounded-full bg-save text-paper grid place-items-center text-xs">✓</span>Added
                    </span>
                  ) : (
                    <button onClick={addCrossSell} className="un-btn gl-press shrink-0 bg-ink text-paper text-sm font-bold px-5 h-10 rounded-xl hover:bg-brandHi transition-colors">Add</button>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* LOOK CLOSER — full-bleed LIGHT-GREY (surface) band, auto-playing carousel (tap to zoom) */}
        {galleryImages.length > 1 && (
          <div className="w-screen ml-[calc(50%-50vw)] bg-paper text-ink mt-6">
            <div className="max-w-[1280px] mx-auto px-5 py-5 md:py-5">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <p className="gl-lbl text-brand mb-2">— The Details</p>
                  <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-[0.95]">
                    <span className="text-ink">Look</span> <span className="text-faint">closer.</span>
                  </h2>
                </div>
                <span className="text-xs text-faint shrink-0">Tap to zoom</span>
              </div>
              <ImageCarousel
                peek
                images={galleryImages}
                alt={product.productName}
                onImgErr={onImgErr}
                onItemClick={(i) => setLightbox({ list: galleryImages, idx: i })}
                renderOverlay={(i) => (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent p-3 pt-8">
                    <span className="gl-lbl text-paper/60 text-[10px]">0{i + 1}</span>
                    <p className="text-paper font-bold text-xs uppercase tracking-wide leading-tight line-clamp-1">{specs[i]?.key || product.productName}</p>
                    {specs[i]?.value && <p className="text-paper/60 text-[10px] leading-tight line-clamp-1">{specs[i].value}</p>}
                  </div>
                )}
              />
            </div>
          </div>
        )}

        {/* IN THE WILD — full-bleed BLACK (ink) editorial band from customer review photos */}
        {communityShots.length > 0 && (
          <ScrollColorBand className="w-screen ml-[calc(50%-50vw)] mt-16">
            <div className="max-w-[1280px] mx-auto px-5 py-14 md:py-20">
              <p className="gl-lbl opacity-50 mb-2">— In the wild</p>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-[0.95] mb-1">
                <span>Seen in</span><br /><span className="opacity-40">real setups.</span>
              </h2>
              <p className="opacity-60 text-sm mb-7">Straight from {totalReviews > 0 ? `${totalReviews} verified ` : ''}customers who bought it.</p>
              <ImageCarousel
                peek
                images={communityShotUrls}
                alt={`${product.productName} in real setups`}
                onImgErr={onImgErr}
                onItemClick={(i) => setLightbox({ list: communityShotUrls, idx: i })}
                renderOverlay={(i) => (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent p-3 pt-8">
                    <span className="gl-lbl text-paper/70 text-[10px]">0{i + 1}</span>
                    <p className="text-paper font-bold text-xs leading-tight line-clamp-1">{communityShots[i]?.name}</p>
                  </div>
                )}
              />
            </div>
          </ScrollColorBand>
        )}

        {/* WHY URBAN NOOK — comparison / trust table */}
        <section className="mt-14">
          <p className="gl-lbl text-brand mb-2 text-center">Why Urban Nook</p>
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-6 text-center">Made different.</h2>
          <div className="max-w-lg mx-auto rounded-2xl border border-hair overflow-hidden">
            <div className="grid grid-cols-[1fr_64px_64px] items-center px-4 py-2.5 bg-paper">
              <span />
              <span className="text-center text-[11px] font-extrabold uppercase tracking-wide text-brand">Us</span>
              <span className="text-center text-[11px] font-extrabold uppercase tracking-wide text-faint">Others</span>
            </div>
            {[
              '3D-printed to order',
              'Original Indian design',
              'Handcrafted finish',
              'COD available',
              '7-day easy returns',
              'Made in India 🇮🇳',
            ].map((label, i) => (
              <div key={i} className="grid grid-cols-[1fr_64px_64px] items-center px-4 py-2.5 border-t border-hair">
                <span className="text-sm font-semibold">{label}</span>
                <span className="grid place-items-center"><span className="w-6 h-6 rounded-full bg-brand text-white grid place-items-center text-xs">✓</span></span>
                <span className="grid place-items-center text-faint">✕</span>
              </div>
            ))}
          </div>
        </section>

        {/* PRODUCT DETAILS — full-bleed LIGHT-GREY (surface) band: description / specs / shipping */}
        <div className="w-screen ml-[calc(50%-50vw)] bg-paper mt-16">
        <section className="max-w-3xl mx-auto px-5 ">
          <p className="gl-lbl text-brand mb-2 text-center">The full rundown</p>
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-6 text-center">Product details</h2>
          <div className="divide-y divide-hair border-y border-hair">
            {(product.productSubDes || product.productDes) && (
              <details open className="group py-4"><summary className="flex justify-between items-center gap-4 cursor-pointer font-bold list-none">Description<span className="shrink-0 text-brand text-2xl leading-none transition-transform duration-300 group-open:rotate-45">＋</span></summary><p className="text-muted mt-3 text-sm leading-relaxed">{product.productSubDes || product.productDes}</p></details>
            )}
            {specs.length > 0 && (
              <details className="group py-4"><summary className="flex justify-between items-center gap-4 cursor-pointer font-bold list-none">Specifications<span className="shrink-0 text-brand text-2xl leading-none transition-transform duration-300 group-open:rotate-45">＋</span></summary>
                <div className="mt-3 text-sm">{specs.map((s, i) => <div key={i} className="flex justify-between py-1.5 border-b border-hair last:border-0"><span className="text-muted">{s.key}</span><span className="font-medium text-right">{s.value}</span></div>)}</div>
              </details>
            )}
            <details className="group py-4"><summary className="flex justify-between items-center gap-4 cursor-pointer font-bold list-none">Shipping &amp; Returns<span className="shrink-0 text-brand text-2xl leading-none transition-transform duration-300 group-open:rotate-45">＋</span></summary><p className="text-muted mt-3 text-sm">Made to order, ships pan-India in 2–4 business days. 7-day easy returns.{product.isCodAvailable ? ' COD available.' : ''}</p></details>
          </div>
        </section>
        </div>

        {/* FAQ — helps buyers understand the product before purchase */}
        {productFaqs.length > 0 && (
          <section className="mt-16">
            <p className="gl-lbl text-brand mb-2 text-center">Good to know</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-8 text-center">Questions, answered</h2>
            <div className="max-w-3xl mx-auto divide-y divide-hair border-y border-hair">
              {productFaqs.map((f, i) => (
                <details key={i} className="group py-4">
                  <summary className="flex items-center justify-between gap-4 cursor-pointer font-bold list-none">
                    <span>{f.q}</span>
                    <span className="shrink-0 text-brand text-2xl leading-none transition-transform duration-300 group-open:rotate-45">＋</span>
                  </summary>
                  <p className="text-muted text-sm mt-3 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* REVIEWS — full-bleed LIGHT-GREY (surface) band */}
        <div className="w-screen ml-[calc(50%-50vw)] bg-paper mt-16">
        <div id="reviews" className="max-w-[1280px] mx-auto px-5 scroll-mt-24">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Ratings &amp; Reviews</h2>
              {totalReviews > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <Stars n={avgRating || 5} className="text-base" />
                  <span className="font-extrabold">{Number(avgRating || 0).toFixed(1)}</span>
                  <span className="text-muted text-sm">· {totalReviews} review{totalReviews === 1 ? '' : 's'}</span>
                </div>
              )}
            </div>
            <button onClick={openReviewForm} className="gl-press shrink-0 bg-brand text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-brandHi">Write a review</button>
          </div>

          <div id="review-form-anchor" />
          {showReviewForm && (
            <div className="border border-hair rounded-2xl p-6 mb-8 bg-white">
              <p className="font-bold text-lg mb-3">{editingReviewId ? 'Edit your review' : 'Share your experience'}</p>
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((r) => <button key={r} onClick={() => setReviewForm((f) => ({ ...f, rating: r }))} className={`text-2xl leading-none ${r <= reviewForm.rating ? 'text-star' : 'text-hair'}`}>★</button>)}
              </div>
              <textarea value={reviewForm.desc} onChange={(e) => setReviewForm((f) => ({ ...f, desc: e.target.value.slice(0, 500) }))} rows={4} placeholder="How's the product? (max 500 chars)" className="w-full border border-hair rounded-xl px-4 py-3 text-sm outline-none focus:border-brand bg-white resize-none" />
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {reviewImagePreviews.map((src, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-hair"><img src={src} alt="" className="w-full h-full object-cover" /><button onClick={() => handleRemoveReviewImage(i)} className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-ink text-white text-xs grid place-items-center">×</button></div>
                ))}
                {reviewImages.length < 3 && <button onClick={() => reviewImageRef.current?.click()} className="w-16 h-16 rounded-lg border-2 border-dashed border-hair grid place-items-center text-muted text-2xl hover:border-brand">+</button>}
                <input ref={reviewImageRef} type="file" accept="image/*" multiple hidden onChange={handleAddReviewImage} />
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={handleSubmitReview} disabled={isSubmittingReview || isUpdatingReview} className="gl-press bg-brand text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-brandHi disabled:opacity-60">{isSubmittingReview || isUpdatingReview ? 'Submitting…' : editingReviewId ? 'Update review' : 'Submit review'}</button>
                <button onClick={() => { setShowReviewForm(false); setEditingReviewId(null); }} className="gl-press border border-hair font-bold text-sm px-6 py-3 rounded-xl hover:border-ink">Cancel</button>
              </div>
            </div>
          )}

          {/* {reviews.length > 0 && (
            <div className="max-w-md mb-8 space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const c = ratingDist[star - 1];
                const pct = reviews.length ? (c / reviews.length) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3 text-xs">
                    <span className="w-9 text-muted tabular-nums shrink-0">{star} ★</span>
                    <div className="flex-1 h-2 rounded-full bg-hair overflow-hidden"><div className="h-full bg-star rounded-full transition-all duration-500" style={{ width: `${pct}%` }} /></div>
                    <span className="w-6 text-right text-faint tabular-nums shrink-0">{c}</span>
                  </div>
                );
              })}
            </div>
          )} */}

          <div className="grid sm:grid-cols-2 gap-4">
              {reviews.length === 0 ? (
                <div className="sm:col-span-2 text-muted text-sm bg-white border border-hair rounded-2xl p-8 text-center">No reviews yet — be the first to review this product.</div>
              ) : reviews.slice(0, visibleReviews).map((rev) => {
                const imgs = rev.imageUrls?.length ? rev.imageUrls : rev.imageUrl ? [rev.imageUrl] : [];
                return (
                  <div key={rev._id} className="bg-white border border-hair rounded-2xl p-5">
                    <div className="flex items-center justify-between"><Stars n={rev.rating} className="text-sm" />{rev.userId && rev.userId === currentUserId && <button onClick={() => handleEditReview(rev)} className="text-xs text-brand font-semibold">Edit</button>}</div>
                    <p className="text-muted text-sm mt-2">{rev.desc}</p>
                    {imgs.length > 0 && (
                      <div className="flex gap-2 mt-3">{imgs.map((u, i) => <button key={i} onClick={() => setLightbox({ list: imgs, idx: i })} className="w-14 h-14 rounded-lg overflow-hidden border border-hair"><img src={u} alt="" className="w-full h-full object-cover" /></button>)}</div>
                    )}
                    <p className="mt-3 text-xs font-bold">{rev.userName || 'Customer'}{rev.verified !== false ? ' · Verified' : ''}</p>
                  </div>
                );
              })}
            </div>
          {reviews.length > visibleReviews && (
            <div className="text-center mt-6">
              <button onClick={() => setVisibleReviews((n) => n + 3)} className="gl-press border border-ink font-bold text-sm px-6 py-2.5 rounded-xl hover:bg-ink hover:text-white transition-colors">
                Show more reviews ({reviews.length - visibleReviews} more)
              </button>
            </div>
          )}
        </div>
        </div>

        {/* related */}
        {/* Admin-curated combo bundle — "buy these together" */}
        {comboProducts.length > 0 && (
          <ComboBundleSection
            mainProduct={product}
            mainVariantName={selectedVariant || availableVariants[0]}
            onSelectMainVariant={onSelectVariant}
            mainOutOfStock={isOutOfStock}
            onNotifyMe={() => setShowNotifyModal(true)}
            comboProducts={comboProducts}
            copy={{
              eyebrow: product?.comboEyebrow,
              heading: product?.comboHeading,
              cta: product?.comboCtaLabel,
            }}
            onAddBundle={handleAddComboBundle}
            isAdding={isAddingCombo}
          />
        )}

        {/* Admin-curated recommendations (distinct from the generic grid below) */}
        {recommendedProducts.length > 0 && (
          <RecommendedProducts products={recommendedProducts} />
        )}

        {related.length > 0 && (
          <div className="mt-16">
            <div className="flex items-end justify-between mb-6"><h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">You may also like</h2><button onClick={() => navigate('/products')} className="text-sm font-bold underline underline-offset-4 decoration-2 hover:text-brand">View all →</button></div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">{related.map((p, i) => <UnProductCard key={p.productId || i} p={p} index={i} listId="pdp_related" listName="Related" />)}</div>
          </div>
        )}
      </div>

      {/* sticky mobile Add-to-Cart bar — appears after the main CTA scrolls out of view */}
      <AnimatePresence>
        {!buyBoxVisible && product && !isLoading && (
          <MotionDiv
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden fixed inset-x-0 z-30 bg-paper/95 backdrop-blur border-t border-hair px-4 py-3 flex items-center gap-3"
            style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom))' }}
          >
            <img src={variantImage(selectedVariant)} alt="" className="w-11 h-11 rounded-lg object-cover border border-hair shrink-0" onError={onImgErr} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate leading-tight">{product.productName}</p>
              <p className="text-sm font-extrabold">{inr(currentPrice)}</p>
            </div>
            {isOutOfStock ? (
              <button onClick={() => setShowNotifyModal(true)} className="gl-press border border-ink text-ink font-bold text-sm px-5 h-11 rounded-xl shrink-0 hover:bg-ink hover:text-paper transition-colors">Notify me</button>
            ) : isInCart ? (
              <button onClick={handleCheckoutClick} className="gl-press bg-brand text-white font-bold text-sm px-6 h-11 rounded-xl shrink-0 hover:bg-brandHi">Checkout</button>
            ) : (
              <button onClick={handleInitialAddToCart} disabled={isAdding} className="gl-press bg-brand text-white font-bold text-sm px-6 h-11 rounded-xl shrink-0 hover:bg-brandHi disabled:opacity-60">{isAdding ? 'Adding…' : 'Add to Cart'}</button>
            )}
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* out-of-stock notify-me */}
      {showNotifyModal && (
        <NotifyMeModal
          productName={product?.productName}
          productId={product?.productId}
          onClose={() => setShowNotifyModal(false)}
        />
      )}

      {/* feedback toast */}
      {feedbackMessage && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[120] bg-ink text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg">{feedbackMessage}</div>}

      {/* lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[130] bg-black/80 grid place-items-center p-6" onClick={() => setLightbox(null)}>
          <img src={lightbox.list[lightbox.idx]} alt="" className="max-h-[85vh] max-w-full rounded-xl" onClick={(e) => e.stopPropagation()} />
          <button className="absolute top-5 right-5 w-10 h-10 rounded-full bg-paper text-ink grid place-items-center text-xl" onClick={() => setLightbox(null)}>×</button>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;
