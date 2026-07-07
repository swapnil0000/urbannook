import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import confetti from 'canvas-confetti';
import SEOHead from '../../component/SEOHead';
import WishlistButton from '../../component/WishlistButton';
import UnProductCard from '../../component/UnProductCard';
import { trackViewItem, trackAddToCart, trackRemoveFromCart, trackAddToWishlist, trackVariantSelect } from '../../utils/analytics';
import { useGetProductByIdQuery, useGetProductsQuery } from '../../store/api/productsApi';
import { useAddToCartMutation, useUpdateCartMutation } from '../../store/api/userApi';
import { useGetProductReviewsQuery, useSubmitProductReviewMutation, useUpdateProductReviewMutation } from '../../store/api/testimonialsApi';
import { addItem, updateQuantity, removeItem, updateSelection } from '../../store/slices/cartSlice';
import { useUI } from '../../hooks/useRedux';
import { useCartData } from '../../hooks/useCartSync';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const productList = (res) => res?.data?.products || res?.data?.listofPublishedProducts || [];
const onImgErr = (e) => { e.currentTarget.src = '/assets/logo.webp'; };
const Stars = ({ n = 5, className = '' }) => {
  const r = Math.round(n);
  return <span className={`text-star ${className}`}>{'★'.repeat(Math.max(0, Math.min(5, r)))}{'☆'.repeat(Math.max(0, 5 - r))}</span>;
};

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

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [addGift, setAddGift] = useState(false);

  const { data: productResponse, isLoading, error } = useGetProductByIdQuery(productId);
  const [addToCartAPI, { isLoading: isAdding }] = useAddToCartMutation();
  const [updateCart] = useUpdateCartMutation();
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

  const product = productResponse?.data;
  const { data: relRes } = useGetProductsQuery({ page: 1, limit: 8 });
  const related = useMemo(() => productList(relRes).filter((p) => p.productId !== productId).slice(0, 4), [relRes, productId]);

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
      setCurrentImageIndex(0);
    } else if (!product) setSelectedVariant('');
  }, [product?.productId, availableVariants, cartSelections, product, urlVariantSku]);

  useEffect(() => { setCurrentImageIndex(0); }, [selectedVariant]);
  useEffect(() => { window.scrollTo(0, 0); }, []);

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
    setCurrentImageIndex(0);
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
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#DF0024', '#A8101A', '#F3C33B', '#ffffff'] });
        setSelectedVariant(effectiveVariant);
        setFeedbackMessage('Added to cart'); setTimeout(() => setFeedbackMessage(''), 2000);
        trackAddToCart({ itemId: product.productId, itemName: product.productName, itemVariant: effectiveVariant, price: currentPrice, quantity: 1 });
      } catch (err) {
        showNotification(err.data?.message || 'Something went wrong', 'error');
      }
    } else {
      dispatch(addItem({ id: product?.productId, mongoId: product?.productId, name: product?.productName, price: currentPrice, image: selectedImage, quantity: 1, selectedVariant: effectiveVariant }));
      setSelectedVariant(effectiveVariant);
      setFeedbackMessage('Added to cart'); setTimeout(() => setFeedbackMessage(''), 2000);
      trackAddToCart({ itemId: product.productId, itemName: product.productName, itemVariant: effectiveVariant, price: currentPrice, quantity: 1 });
    }

    // optional matching add-on
    const gift = product?.giftAddOns?.[0];
    if (addGift && gift) dispatch(addItem({ id: gift.giftProductId, mongoId: gift.giftProductId, name: gift.label || 'Add-on', price: gift.addOnPrice || 0, image: undefined, quantity: 1, selectedVariant: 'Add-on' }));
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

  // reviews
  const rd = reviewsData?.data || {};
  const reviews = rd.reviews || [];
  const avgRating = rd.avgRating || 0;
  const totalReviews = rd.totalReviews || reviews.length;

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
    <div className="min-h-[70vh] grid place-items-center bg-paper font-jakarta text-center px-5">
      <div><h1 className="text-3xl font-extrabold">Product not found</h1><button onClick={() => navigate('/products')} className="gl-press mt-5 bg-brand text-white font-bold px-7 py-3 rounded-xl hover:bg-brandHi">Back to Shop</button></div>
    </div>
  );

  const gift = product?.giftAddOns?.[0];
  const specs = product.specifications || [];
  const structuredData = {
    '@context': 'https://schema.org', '@type': 'Product', name: product.productName, image: galleryImages, description: product.productSubDes || product.productDes, sku: product.productId,
    brand: { '@type': 'Brand', name: 'UrbanNook' },
    offers: { '@type': 'Offer', url: `https://www.urbannook.in/product/${product.productId}`, priceCurrency: 'INR', price: currentPrice, availability: product.productStatus === 'in_stock' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
  };

  return (
    <div className="font-jakarta bg-paper text-ink min-h-screen">
      <SEOHead title={product.productName} description={product.productSubDes || product.productDes} url={`/product/${product.productId}`} image={galleryImages[0]} structuredData={structuredData} />

      <div className="max-w-[1280px] mx-auto px-5 py-6 md:py-8">
        {/* breadcrumb */}
        <div className="text-sm text-faint mb-5">
          <button onClick={() => navigate('/')} className="hover:text-brand">Home</button> / <button onClick={() => navigate('/products')} className="hover:text-brand">{product.productCategory || 'Shop'}</button> / <span className="text-ink">{product.productName}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-10">
          {/* GALLERY */}
          <div>
            <div className="rounded-[1.5rem] overflow-hidden border border-hair bg-surface aspect-square">
              <img src={galleryImages[currentImageIndex] || galleryImages[0]} alt={product.productName} className="w-full h-full object-cover" onError={onImgErr} />
            </div>
            {galleryImages.length > 1 && (
              <div className="grid grid-cols-5 gap-2.5 mt-3">
                {galleryImages.slice(0, 5).map((img, i) => (
                  <button key={i} onClick={() => setCurrentImageIndex(i)} className={`rounded-xl overflow-hidden border-2 aspect-square ${i === currentImageIndex ? 'border-brand' : 'border-transparent'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" onError={onImgErr} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* INFO */}
          <div>
            <p className="gl-lbl text-brand">{product.productSubCategory || product.productCategory || '3D Printed'}</p>
            <div className="flex items-start justify-between gap-3 mt-2">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{product.productName}</h1>
              <div className="shrink-0 pt-1"><WishlistButton productId={product.productId} /></div>
            </div>
            {totalReviews > 0 && (
              <button onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })} className="flex items-center gap-2 mt-3">
                <Stars n={avgRating || 5} /><span className="text-sm text-muted">{(avgRating || 4.8).toFixed?.(1) || avgRating} ({totalReviews} reviews)</span>
              </button>
            )}

            <div className="flex items-center gap-3 mt-4">
              <span className="text-3xl font-extrabold">{inr(currentPrice)}</span>
              {discountPercent > 0 && <><span className="text-faint line-through">{inr(maxVariantPrice)}</span><span className="gl-lbl text-[10px] bg-sale/10 text-sale px-2 py-1 rounded">{discountPercent}% OFF</span></>}
            </div>

            {(product.productDes || product.productSubDes) && <p className="text-muted mt-4 leading-relaxed">{product.productDes || product.productSubDes}</p>}

            {/* variants */}
            {availableVariants.length > 0 && (
              <div className="mt-6">
                <p className="gl-lbl mb-2">{product.productCategory === 'Lamp' ? 'Marque' : 'Variant'} · <span className="text-muted normal-case tracking-normal font-semibold">{selectedVariant}</span></p>
                <div className="flex gap-3 flex-wrap">
                  {product.variantDetails.map((v, i) => (
                    <button key={i} onClick={() => onSelectVariant(v)} title={v.variantName} className={`gl-swatch rounded-xl overflow-hidden w-16 h-16 border ${v.variantName === selectedVariant ? 'on border-brand' : 'border-hair'}`}>
                      <img src={v.variantImage?.[0] || variantImage(v.variantName)} alt={v.variantName} className="w-full h-full object-cover" onError={onImgErr} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* qty + add */}
            <div className="mt-7 flex items-center gap-3">
              {isInCart ? (
                <>
                  <div className="flex items-center border border-ink rounded-xl h-14">
                    <button onClick={() => handleUpdateQty(currentCartQty - 1)} className="w-12 h-full text-xl">−</button>
                    <span className="w-8 text-center font-bold">{currentCartQty}</span>
                    <button onClick={() => handleUpdateQty(currentCartQty + 1)} className="w-12 h-full text-xl">+</button>
                  </div>
                  <button onClick={handleCheckoutClick} className="gl-press flex-1 h-14 bg-brand text-white font-bold rounded-xl hover:bg-brandHi">Go to Checkout</button>
                </>
              ) : (
                <button onClick={handleInitialAddToCart} disabled={isAdding} className="gl-press flex-1 h-14 bg-brand text-white font-bold rounded-xl hover:bg-brandHi disabled:opacity-60">
                  {isAdding ? 'Adding…' : <>Add to Cart · {inr(currentPrice)}</>}
                </button>
              )}
            </div>
            <button onClick={handleCheckoutClick} className="gl-press w-full py-3.5 mt-3 border border-ink rounded-xl font-bold hover:bg-ink hover:text-white transition-colors">Buy it Now</button>

            {/* gift add-on */}
            {gift && (
              <label className="mt-4 flex items-center gap-3 border border-hair rounded-xl p-3.5 cursor-pointer hover:border-brand transition-colors">
                <input type="checkbox" checked={addGift} onChange={(e) => setAddGift(e.target.checked)} className="w-4 h-4 accent-brand" />
                <span className="flex-1 text-sm"><b>{gift.label || 'Add a matching add-on'}</b><span className="block text-faint text-xs">Add it to this order</span></span>
                <span className="font-bold text-brand">+{inr(gift.addOnPrice)}</span>
              </label>
            )}

            {/* trust */}
            <div className="grid grid-cols-3 gap-2 mt-5 text-center text-xs text-muted">
              <div className="border border-hair rounded-xl py-3"><div className="text-lg">🚚</div>Free over ₹999</div>
              <div className="border border-hair rounded-xl py-3"><div className="text-lg">💸</div>{product.isCodAvailable ? 'COD available' : 'Secure payment'}</div>
              <div className="border border-hair rounded-xl py-3"><div className="text-lg">↺</div>7-day returns</div>
            </div>

            {/* accordions */}
            <div className="mt-6 divide-y divide-hair border-y border-hair">
              {(product.productSubDes || product.productDes) && (
                <details open className="py-4"><summary className="flex justify-between cursor-pointer font-bold list-none">Description<span>＋</span></summary><p className="text-muted mt-3 text-sm leading-relaxed">{product.productSubDes || product.productDes}</p></details>
              )}
              {specs.length > 0 && (
                <details className="py-4"><summary className="flex justify-between cursor-pointer font-bold list-none">Specifications<span>＋</span></summary>
                  <div className="mt-3 text-sm">{specs.map((s, i) => <div key={i} className="flex justify-between py-1.5 border-b border-hair last:border-0"><span className="text-muted">{s.key}</span><span className="font-medium text-right">{s.value}</span></div>)}</div>
                </details>
              )}
              <details className="py-4"><summary className="flex justify-between cursor-pointer font-bold list-none">Shipping &amp; Returns<span>＋</span></summary><p className="text-muted mt-3 text-sm">Made to order, ships pan-India in 2–4 business days. 7-day easy returns.{product.isCodAvailable ? ' COD available.' : ''}</p></details>
            </div>
          </div>
        </div>

        {/* LOOK CLOSER — showcases variant images (BMW/Porsche/Lambo…) or gallery+specs */}
        {product.variantDetails?.length > 0 && (
          <section className="mt-16">
            <p className="gl-lbl text-brand mb-2">The Details</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-8">Look closer.</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {(product.variantDetails.length > 1
                ? product.variantDetails.slice(0, 4).map((v) => ({ img: v.variantImage?.[0], title: v.variantName, desc: `${inr(v.variantPrice)} · made to order`, v }))
                : galleryImages.slice(0, 4).map((img, i) => ({ img, title: specs[i]?.key || 'Crafted detail', desc: specs[i]?.value || 'Precision 3D-printed to order.', v: null }))
              ).map((it, i) => (
                <div key={i} className={`group ${it.v ? 'cursor-pointer' : ''}`} onClick={() => it.v && onSelectVariant(it.v)}>
                  <div className="rounded-2xl overflow-hidden border border-hair bg-surface aspect-[4/3]">
                    <img src={it.img} alt={it.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" onError={onImgErr} />
                  </div>
                  <div className="flex gap-4 mt-4">
                    <span className="text-2xl font-extrabold text-faint">0{i + 1}</span>
                    <div><h3 className="font-extrabold uppercase text-sm tracking-wide">{it.title}</h3><p className="text-muted text-sm mt-1">{it.desc}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* WHY URBAN NOOK — comparison / trust table */}
        <section className="mt-16">
          <p className="gl-lbl text-brand mb-2 text-center">Why Urban Nook</p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-8 text-center">Made different.</h2>
          <div className="max-w-3xl mx-auto overflow-x-auto">
            <div className="min-w-[560px] rounded-2xl border border-hair overflow-hidden">
              <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr]">
                <div className="p-4" />
                <div className="p-4 bg-brand text-white text-center font-extrabold">Urban Nook</div>
                <div className="p-4 text-center font-bold text-muted">Local sellers</div>
                <div className="p-4 text-center font-bold text-muted">Marketplace</div>
              </div>
              {[
                ['3D-printed to order', 'Mass-produced', 'Warehouse stock'],
                ['Original Indian design', 'Generic designs', 'Global templates'],
                ['Handcrafted finish', 'Machine-made', 'Standardized'],
                ['COD available', 'Prepaid only', 'Prepaid only'],
                ['7-day easy returns', 'No returns', 'Complex returns'],
                ['Made in India 🇮🇳', 'Imported', 'Imported'],
              ].map((r, i) => (
                <div key={i} className="grid grid-cols-[1.3fr_1fr_1fr_1fr] border-t border-hair">
                  <div className="p-4 font-bold text-sm flex items-center">{r[0]}</div>
                  <div className="p-4 bg-brand grid place-items-center"><span className="w-7 h-7 rounded-full bg-white/20 grid place-items-center text-white text-sm">✓</span></div>
                  <div className="p-4 text-center text-xs text-faint flex items-center justify-center">{r[1]}</div>
                  <div className="p-4 text-center text-xs text-faint flex items-center justify-center">{r[2]}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* REVIEWS */}
        <div id="reviews" className="mt-16 scroll-mt-24">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Ratings &amp; Reviews</h2>
            <button onClick={openReviewForm} className="gl-press bg-brand text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-brandHi">Write a review</button>
          </div>

          <div id="review-form-anchor" />
          {showReviewForm && (
            <div className="border border-hair rounded-2xl p-6 mb-8 bg-surface">
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

          <div className="grid lg:grid-cols-[280px_1fr] gap-8 items-start">
            <div className="bg-surface border border-hair rounded-2xl p-6 text-center lg:sticky lg:top-24">
              <div className="text-5xl font-extrabold">{avgRating ? Number(avgRating).toFixed(1) : '—'}</div>
              <Stars n={avgRating || 0} className="text-lg block my-1" />
              <p className="text-muted text-sm">{totalReviews} review{totalReviews === 1 ? '' : 's'}</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {reviews.length === 0 ? (
                <div className="sm:col-span-2 text-muted text-sm border border-hair rounded-2xl p-8 text-center">No reviews yet — be the first to review this product.</div>
              ) : reviews.map((rev) => {
                const imgs = rev.imageUrls?.length ? rev.imageUrls : rev.imageUrl ? [rev.imageUrl] : [];
                return (
                  <div key={rev._id} className="border border-hair rounded-2xl p-5">
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
          </div>
        </div>

        {/* related */}
        {related.length > 0 && (
          <div className="mt-16">
            <div className="flex items-end justify-between mb-6"><h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">You may also like</h2><button onClick={() => navigate('/products')} className="text-sm font-bold underline underline-offset-4 decoration-2 hover:text-brand">View all →</button></div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">{related.map((p, i) => <UnProductCard key={p.productId || i} p={p} index={i} listId="pdp_related" listName="Related" />)}</div>
          </div>
        )}
      </div>

      {/* feedback toast */}
      {feedbackMessage && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[120] bg-ink text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg">{feedbackMessage}</div>}

      {/* lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[130] bg-black/80 grid place-items-center p-6" onClick={() => setLightbox(null)}>
          <img src={lightbox.list[lightbox.idx]} alt="" className="max-h-[85vh] max-w-full rounded-xl" onClick={(e) => e.stopPropagation()} />
          <button className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white text-ink grid place-items-center text-xl" onClick={() => setLightbox(null)}>×</button>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;
