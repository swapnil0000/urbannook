import { Fragment, useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { categoryPath } from '../../utils/categoryUrl';
import { SsrStatus } from '../../utils/ssrContext';
import { useSelector, useDispatch } from 'react-redux';
import confetti from 'canvas-confetti';
import SEOHead from '../../component/SEOHead';
import { useSeoContent, faqPageJsonLd } from '../../utils/seoContent';
import { pdpDisplayFor } from '../../utils/pdpDisplay';
import { orderedSelection, reviewPhotos } from '../../utils/mediaCuration';
import WishlistButton from '../../component/WishlistButton';
import UnProductCard from '../../component/UnProductCard';
import RecommendedProducts from '../../component/RecommendedProducts';
import NotifyMeModal from '../../component/NotifyMeModal';
import ComparisonTable from '../../component/ComparisonTable';
import ImageCarousel from '../../component/ImageCarousel';
import CommunityShots from '../../component/CommunityShots';
import { premiumPdpPurchaseDesign, floatingPdpPlatformDesign } from '../../config/pdpPurchaseDesign';
import './ProductDetailPage.css';
import { motion, AnimatePresence } from 'motion/react';
import { ScrollColorBand, MotionRoot } from '../../component/motion';
import { useGetPhotoReviewsQuery } from '../../store/api/statsApi';
import { variantSku, trackViewItem, trackAddToCart, trackRemoveFromCart, trackAddToWishlist, trackVariantSelect, trackShare, trackDeliveryCheck } from '../../utils/analytics';
import { productsApi, useGetProductByIdQuery, useGetProductsQuery, useGetBlogPostsQuery } from '../../store/api/productsApi';
import { useAddToCartMutation, useUpdateCartMutation, useCalculateShippingMutation, useGetFreeShippingOfferQuery, useGetHomeComboOffersQuery, useGetProductPromotionsQuery } from '../../store/api/userApi';
import { buildOfferLines } from '../../utils/productOfferLines';
import { shippingDetails, RETURN_POLICY } from '../../utils/productSchema';
import { useGetProductReviewsQuery, useSubmitProductReviewMutation, useUpdateProductReviewMutation } from '../../store/api/testimonialsApi';
import { addItem, updateQuantity, removeItem, updateSelection } from '../../store/slices/cartSlice';
import { useUI } from '../../hooks/useRedux';
import { useCartData } from '../../hooks/useCartSync';
import FreeShippingStrip from '../../component/FreeShippingStrip';
import OfferProgress from '../../component/festive/OfferProgress';
import { compressImage } from '../../utils/compressImage';
import ProductOffers from '../../component/offers/ProductOffers';
import CouponOffersSection from '../../component/offers/CouponOffersSection';
import { requestCheckout } from '../../utils/checkoutIntent';
import { useCartPromotions } from '../../hooks/useCartPromotions';
import SaleTag from '../../component/festive/SaleTag';
import { useSiteCampaignState } from '../../hooks/useSiteCampaign';
import SaleDealBox from '../../component/festive/SaleDealBox';
import { shortVariantNames } from '../../utils/variantShortName';
import ScrollRow from '../../component/ScrollRow';

import ProductQuestions from '../../component/support/ProductQuestions';

const MotionDiv = motion.div;
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const productList = (res) => res?.data?.products || res?.data?.listofPublishedProducts || [];
const onImgErr = (e) => { e.currentTarget.src = '/assets/logo.webp'; };
const Stars = ({ n = 5, className = '' }) => {
  const r = Math.round(n);
  return <span className={`text-star ${className}`}>{'★'.repeat(Math.max(0, Math.min(5, r)))}{'☆'.repeat(Math.max(0, 5 - r))}</span>;
};

// Effective per-variant out-of-stock - mirrors the server rule: a manual admin
// flag, or a tracked quantity (variantQuantity != null) that has reached 0.
// A null/undefined quantity means "not stock-tracked" → never OOS by quantity.
const isVariantOutOfStock = (v) =>
  !!v &&
  (v.variantOutOfStock === true ||
    (v.variantQuantity != null && Number(v.variantQuantity) <= 0));

/* Version picker (e.g. Wooden | LED katana). The server inlines, per variant,
   the other published variants in its variantGroup as `versions`. No type →
   nothing shown. The open version is selected; another type opens its own PDP
   (a separate product). A type with no linked variant is shown greyed out; an
   out-of-stock one still opens - the existing OOS logic there blocks purchase. */
const VERSION_TYPE_ORDER = ['Non-LED', 'LED'];
// "Wooden" was the old name for the Non-LED edition - show it as Non-LED.
const lc = (s) => {
  const k = String(s || '').trim().toLowerCase();
  return k === 'wooden' ? 'non-led' : k;
};

const VersionPicker = ({ variant, onOpen }) => {
  if (!variant?.variantGroup && !variant?.variantType) return null;
  const currentType = variant.variantType || '';
  const versions = Array.isArray(variant.versions) ? variant.versions : [];
  // Always show the known types in a fixed order, plus any other type in use.
  const types = [...VERSION_TYPE_ORDER];
  [currentType, ...versions.map((o) => o.type)].forEach((t) => {
    if (t && !types.some((x) => lc(x) === lc(t))) types.push(t);
  });

  return (
    <div className="mt-4">
      <p className="gl-lbl text-[10px] text-muted mb-2">Type</p>
      <div className="flex flex-wrap items-stretch gap-2">
        {types.map((t) => {
          const isCurrent = lc(t) === lc(currentType);
          const target = versions.find((o) => lc(o.type) === lc(t));
          const unavailable = !isCurrent && !target;
          return (
            <button
              key={t}
              type="button"
              aria-pressed={isCurrent}
              disabled={unavailable}
              onClick={() => !isCurrent && target && onOpen(target)}
              aria-label={unavailable ? `${t} version not available for this design` : target?.outOfStock ? `${t} version is out of stock` : t}
              className={`pdp-version-option flex min-h-11 min-w-[4.5rem] flex-col items-center justify-center px-3 py-1.5 rounded-lg border text-sm font-bold leading-tight transition-colors ${
                isCurrent
                  ? 'border-ink bg-ink text-paper'
                  : unavailable
                    ? 'border-hair text-faint bg-surface cursor-not-allowed'
                    : 'border-hair text-ink bg-white hover:border-ink'
              }`}
            >
              <span>{t}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// At or below this many tracked units left, show an urgency "limited stock"
// badge to nudge the buyer. Tweak freely.
const LOW_STOCK_THRESHOLD = 5;

/* Every variant name repeats the product name in full - "Zoro Enma Wooden
   Katana (Black & Red)" sitting under a product called "Anime Wooden Katana".
   Dropping the words the product already says leaves "Zoro Enma (Black &
   Red)": the part that actually tells one variant from the next, and short
   enough that the pills stop wrapping into a column. Falls back to the full
   name when nothing would be left (single-variant products). */
const shortVariantName = (variantName = '', productName = '') => {
  const norm = (w) => w.toLowerCase().replace(/[^a-z0-9]/gi, '');
  const drop = new Set(String(productName).split(/\s+/).map(norm).filter(Boolean));
  const kept = String(variantName).split(/\s+/).filter((w) => !drop.has(norm(w)));
  return kept.join(' ').trim() || variantName;
};

/* What the variant row is called, per category. A category listed here sells
   variants that are different things (Zenitsu's vs Zoro's katana, the BMW vs
   Ferrari lamp), not colours of one thing, so each variant URL is its own page
   for search engines (own canonical, title, sitemap entry - see variantPage
   below and client/scripts/ssg.mjs). Other categories (pen stands in ten
   colours) keep every variant URL canonical to the product. */
const VARIANT_NOUN = { Lamp: 'Marque', Anime: 'Design' };

const ProductDetailPage = () => {
  const itemQty = (q) => (typeof q === 'object' && q !== null ? q.quantity || 0 : q || 0);

  const { productId, variantSku: urlVariantSku } = useParams();
  const { hash } = useLocation();
  const previewNonce = hash.startsWith('#pdpPreview=') ? hash.slice(12) : null;
  const previewMode = Boolean(previewNonce);
  const [previewDraft, setPreviewDraft] = useState(null);
  const [previewVariantName, setPreviewVariantName] = useState('');
  useEffect(() => {
    if (!previewMode || typeof window === 'undefined') return undefined;
    let active = true;
    let cleanup;
    import('../../utils/pdpPreviewBridge').then(({ attachPdpPreview }) => {
      if (active) cleanup = attachPdpPreview({ nonce: previewNonce, productId, onDraft: (draft, variantName) => { setPreviewDraft(draft); setPreviewVariantName(variantName); } });
    });
    return () => {
      active = false;
      cleanup?.();
    };
  }, [previewMode, previewNonce, productId]);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showNotification, openLoginModal } = useUI();

  const { isAuthenticated } = useSelector((state) => state.auth);
  const cartItems = useSelector((state) => state.cart.items);
  const cartSelections = useSelector((state) => state.cart.selections);
  const currentUserId = useSelector((state) => state.auth.user?.userId);

  const [feedbackMessage, setFeedbackMessage] = useState('');
  const buyBoxRef = useRef(null);
  const { active: festiveOn } = useSiteCampaignState();
  const pageRef = useRef(null); // night-mode scope for the "In the wild" band
  const [buyBoxVisible, setBuyBoxVisible] = useState(true); // controls the sticky mobile CTA
  const [pinInput, setPinInput] = useState('');            // pincode delivery check
  const [pinStatus, setPinStatus] = useState(null);        // { ok, msg, charge, eta }
  const [showShare, setShowShare] = useState(false);       // desktop share row fallback
  const [showNotifyModal, setShowNotifyModal] = useState(false); // out-of-stock notify-me

  const { data: productResponse, isLoading, error } = useGetProductByIdQuery(productId);
  const product = useMemo(() => previewDraft ? { ...productResponse?.data, ...previewDraft } : productResponse?.data, [previewDraft, productResponse?.data]);
  const pdpDisplay = useMemo(() => pdpDisplayFor(product), [product]);
  // Cart-value free-shipping offer (same query FreeShippingStrip uses): drives the
  // shipping details in this page's Offer schema.
  const { data: freeShippingRes } = useGetFreeShippingOfferQuery();
  const [addToCartAPI, { isLoading: isAdding }] = useAddToCartMutation();
  const [updateCart] = useUpdateCartMutation();
  const [checkPincode, { isLoading: isCheckingPin }] = useCalculateShippingMutation();
  const { refetch: refetchCart } = useCartData();
  const cartTotal = useSelector((state) => state.cart.totalAmount);

  // Offers already working in the cart (same subscription as the cart drawer) → "Applied" on the offer rows.
  const { promotions: cartPromotions } = useCartPromotions('cart');
  const appliedOfferIds = useMemo(() => cartPromotions.filter((p) => p.applied && !p.rewardTargetPending).map((p) => p.id), [cartPromotions]);

  const { data: reviewsData } = useGetProductReviewsQuery(productId, { skip: !productId || !pdpDisplay.sections.reviews && !pdpDisplay.sections.customerPhotos });
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

  // When the product is already in the store on the first render (page rendered at
  // build time, and the browser hydrating it), pick the URL's variant right away so
  // the HTML carries that variant's title, price and MRP and matches the browser's
  // first render. Otherwise the layout effect below picks it once the product loads.
  const [selectedVariant, setSelectedVariant] = useState(() => {
    const details = product?.variantDetails;
    if (!details?.length) return '';
    const matched = urlVariantSku
      && (details.find((v) => v.sku === urlVariantSku) || details.find((v) => v.variantName === urlVariantSku));
    return matched ? matched.variantName : details[0].variantName;
  });
  // Same args as the header's list (entry-server globalQueries), so this reads
  // that cached list instead of embedding a second copy in the page's HTML.
  const { data: relRes } = useGetProductsQuery({ page: 1, limit: 24 });
  // Live offers for this product, shown right under the price (the full offer
  // cards sit much lower; from the top nobody knew an offer existed).
  const { data: comboRes } = useGetHomeComboOffersQuery();
  const offerLines = useMemo(() => {
    const names = new Map(productList(relRes).map((x) => [String(x.productId), x.productName]));
    return buildOfferLines(comboRes?.data?.combos || [], names).get(String(productId)) || [];
  }, [comboRes, relRes, productId]);
  // What this product unlocks, shown right above Add to Cart so the shopper
  // knows BEFORE adding (not only after opening the cart).
  const { data: pdpPromoRes } = useGetProductPromotionsQuery(productId, { skip: !productId });
  const pdpPromos = pdpPromoRes?.data?.promotions || [];
  const pdpGift = pdpPromos.find((p) => p.displayType === 'free_gift');
  const pdpDeals = pdpPromos.filter((p) => p.displayType !== 'free_gift' && p.displayType !== 'free_shipping');
  const related = useMemo(() => productList(relRes).filter((p) => p.productId !== productId).slice(0, 4), [relRes, productId]);

  // Product FAQs - use CMS-provided product.faqs if present, else generate helpful
  // defaults from the product's own data so buyers understand it before purchase.
  const productFaqs = useMemo(() => {
    if (Array.isArray(product?.faqs) && product.faqs.length) {
      return product.faqs.map((f) => ({ q: f.question || f.q, a: f.answer || f.a })).filter((f) => f.q && f.a);
    }
    if (!product) return [];
    const cat = (product.productCategory || '').toLowerCase();
    const isLamp = cat.includes('lamp');
    const list = [
      // { q: 'How long does delivery take?', a: 'Every piece is 3D-printed to order and ships pan-India within 24-48 hours, with tracking.' }, // paused: no 24-48 hr promise for now
    ];
    // Answer from the admin "Power Source" spec when set - never guess (not every lamp is USB).
    const powerSpec = [...(product.specifications || []), ...((product.variantDetails || []).flatMap((v) => v.specifications || []))]
      .find((sp) => /power/i.test(sp?.key || '') && sp?.value);
    if (powerSpec) list.push({ q: 'How is it powered?', a: `${powerSpec.value}. Just plug in and switch it on.` });
    list.push({ q: 'What is it made of?', a: `Precision 3D-printed with a durable build and a hand-finished ${isLamp ? 'glossy resin' : 'premium'} coat, so no two are exactly alike.` });
    list.push({
      q: product.isCodAvailable ? 'Is Cash on Delivery available?' : 'What payment methods do you accept?',
      a: product.isCodAvailable ? 'Partial COD is available - pay a small advance online and the rest in cash on delivery. You can also pay fully by UPI, cards, net-banking or wallets.' : 'We accept UPI, credit/debit cards, net-banking and wallets at checkout.',
    });
    list.push({ q: 'Can I return or exchange it?', a: "We don't accept returns or exchanges for change of mind, colour or preference. If your item arrives damaged, defective or wrong, report it within 3 days with an unboxing video and we'll replace it free." });
    return list;
  }, [product]);

  // Admin → SEO Pages for this URL: its intro goes under the Description and its
  // FAQs lead "Questions, answered". When both ask the same question, the
  // admin's answer wins, so the page never shows a question twice.
  const { intro: seoIntro, faqs: seoFaqs } = useSeoContent();
  // Blog post for "Know the story" (Admin → Blog): the one linked to this
  // variant's SKU, else a general post for the product. Uses the URL's SKU (not
  // the picked swatch) so it matches the server-rendered page.
  const { data: storyRes } = useGetBlogPostsQuery({ product: productId, sku: urlVariantSku, limit: 1 }, { skip: !pdpDisplay.sections.story });
  const story = storyRes?.data?.[0] || null;
  const sameQuestion = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const faqs = useMemo(() => {
    const asked = new Set(seoFaqs.map((f) => sameQuestion(f.q)));
    return [...seoFaqs, ...productFaqs.filter((f) => !asked.has(sameQuestion(f.q)))];
  }, [seoFaqs, productFaqs]);

  // (The "complete the set" pairing that used to live here was a guess in
  // code - pen stand ⇒ lamp, anything else ⇒ pen stand. The admin-configured
  // combo-banner system that later replaced it was itself removed entirely
  // 2026-10-09 - see MiniCartPreview.jsx's file-header note.)

  const currentPrice = useMemo(() => {
    if (!product?.variantDetails?.length) return 0;
    const sel = product.variantDetails.find((v) => v.variantName === selectedVariant);
    return (sel && sel.variantPrice) || product.variantDetails[0].variantPrice || 0;
  }, [product, selectedVariant]);

  // Strike-through price = the selected variant's MRP set in the admin panel
  // (variantMrp). Products without an MRP keep the old behaviour (highest variant
  // price) so nothing changes for them until an MRP is entered.
  const { maxVariantPrice, discountPercent } = useMemo(() => {
    if (!product?.variantDetails?.length) return { maxVariantPrice: 0, discountPercent: 0 };
    const sel = product.variantDetails.find((v) => v.variantName === selectedVariant);
    const hasAnyMrp = product.variantDetails.some((v) => Number(v.variantMrp) > 0);
    const compareAt = hasAnyMrp
      ? Number(sel?.variantMrp) || 0
      : Math.max(...product.variantDetails.map((v) => v.variantPrice || 0));
    const discount = compareAt > currentPrice ? Math.round(((compareAt - currentPrice) / compareAt) * 100) : 0;
    return { maxVariantPrice: compareAt, discountPercent: discount };
  }, [product, currentPrice, selectedVariant]);

  const availableVariants = useMemo(() => (product?.variantDetails ? product.variantDetails.map((v) => v.variantName) : []), [product]);
  const activeVariants = useMemo(() => (product?.variantDetails || []).filter((v) => v && v.isActive !== false), [product]);
  // Warm every variant's gallery in the browser cache once the page is idle,
  // so switching a swatch swaps to an already-decoded photo instead of a
  // blank frame while it downloads (that blank was the "flicker").
  useEffect(() => {
    if (!activeVariants.length) return undefined;
    const urls = [...new Set(activeVariants.flatMap((v) => (v.variantImage || []).slice(0, 2)))];
    const run = () => urls.forEach((u) => { const im = new Image(); im.decoding = 'async'; im.src = u; });
    const id = typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(run, { timeout: 2000 }) : setTimeout(run, 800);
    return () => (typeof window.cancelIdleCallback === 'function' ? window.cancelIdleCallback(id) : clearTimeout(id));
  }, [activeVariants]);
  const shortNames = useMemo(() => { const n = activeVariants.map((v) => v.variantName); const sh = shortVariantNames(n); return new Map(n.map((x, i) => [x, sh[i]])); }, [activeVariants]);

  // Admin-curated combo + recommendation rows (empty => sections render nothing).
  const recommendedProducts = product?.recommendedProductsDetails || [];

  // Stock state for the SELECTED variant - the page-level productStatus is
  // only half the answer; a single variant can be out while the product is in.
  const selectedVariantObj = useMemo(
    () => product?.variantDetails?.find((v) => v.variantName === (selectedVariant || availableVariants[0])) || null,
    [product, selectedVariant, availableVariants],
  );
  const selectedVariantOOS = useMemo(() => isVariantOutOfStock(selectedVariantObj), [selectedVariantObj]);

  // Warm the cache for this variant's other versions (Wooden ↔ LED) so a
  // switch renders instantly instead of swapping content after a fetch.
  const prefetchProduct = productsApi.usePrefetch('getProductById');
  useEffect(() => {
    (selectedVariantObj?.versions || []).forEach((o) => o.productId && prefetchProduct(o.productId));
  }, [selectedVariantObj, prefetchProduct]);
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
  const customLookCloser = pdpDisplay.media.lookCloserByVariant?.find((entry) => entry.sku === (selectedVariantObj?.sku || selectedVariant));
  const lookCloserImages = useMemo(() => customLookCloser ? customLookCloser.images.filter((image) => galleryImages.includes(image)) : galleryImages, [customLookCloser, galleryImages]);

  // Layout effect (not a plain effect) so a product switch lands on the URL's
  // variant before paint - no one-frame flash of the product's first variant.
  useLayoutEffect(() => {
    if (availableVariants.length > 0 && product) {
      let initial = availableVariants[0];
      if (previewMode && previewVariantName && availableVariants.includes(previewVariantName)) {
        initial = previewVariantName;
      } else if (urlVariantSku) {
        // Older/sku-less links carry the variant name instead of the sku.
        const matched = product.variantDetails?.find((v) => v.sku === urlVariantSku)
          || product.variantDetails?.find((v) => v.variantName === urlVariantSku);
        if (matched) initial = matched.variantName;
      } else {
        const saved = cartSelections[product.productId];
        if (saved?.variant && availableVariants.includes(saved.variant)) initial = saved.variant;
      }
      setSelectedVariant(initial);
    } else if (!product) setSelectedVariant('');
  }, [product?.productId, availableVariants, cartSelections, product, urlVariantSku, previewMode, previewVariantName]);

  // Reset the pincode check + share row when navigating to another product -
  // the component stays mounted, and a quote computed for product A's weight/price
  // must not display under product B.
  // Admin-set, per-variant sub tag (e.g. "BMW Inspired, 104cm") shown as a
  // small line under the main product title - blank when the selected
  // variant has none set.
  const selectedVariantSubTag = useMemo(() => {
    if (!product) return '';
    const selectedDetail = product.variantDetails?.find((v) => v.variantName === selectedVariant);
    return (selectedDetail?.variantSubTag && selectedDetail.variantSubTag.trim()) || '';
  }, [product, selectedVariant]);

  // Variant-first, product-level fallback - same rule as variantSubTag above,
  // for the two other admin-editable fields a variant can now override:
  // description and specifications. Blank/absent on the variant means "use
  // the product-level value", never "show nothing" (that would hide real
  // product-level copy just because this particular variant has no override).
  const displayDescription = useMemo(() => {
    const variantDes = selectedVariantObj?.variantDes?.trim();
    return variantDes || product?.productSubDes || product?.productDes || '';
  }, [selectedVariantObj, product]);

  const displaySpecs = useMemo(() => {
    const variantSpecs = selectedVariantObj?.specifications;
    return variantSpecs && variantSpecs.length > 0 ? variantSpecs : product?.specifications || [];
  }, [selectedVariantObj, product]);

  useEffect(() => {
    setPinStatus(null);
    setPinInput('');
    setShowShare(false);
  }, [product?.productId]);

  // Show the sticky mobile CTA only once the main Add-to-Cart box has scrolled out of view.
  useEffect(() => {
    const el = buyBoxRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setBuyBoxVisible(entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [product?.productId]);

  const viewedProductRef = useRef(null);
  useEffect(() => {
    if (!previewMode && product && selectedVariant && viewedProductRef.current !== product.productId) {
      viewedProductRef.current = product.productId;
      trackViewItem({ itemId: product.productId, sku: variantSku(product, selectedVariant), itemName: product.productName, itemVariant: selectedVariant, price: currentPrice, quantity: 1 });
    }
  }, [product, selectedVariant, currentPrice, previewMode]);

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
    setPinStatus(null); // quote was priced for the previous variant - require a re-check
    trackVariantSelect?.({ itemId: product.productId, itemName: product.productName, itemVariant: v.variantName, price: v.variantPrice });
    // keepScroll: picking a design must not jump the page back to the top
    if (v.sku) navigate(`/product/${product.productId}/${v.sku}`, { replace: true, state: { keepScroll: true } });
    // glide back up so the new design's photo and price are in view
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const variantImage = (name) => {
    const v = product?.variantDetails?.find((x) => x.variantName === name);
    return v?.variantImage?.[0] || product?.variantDetails?.[0]?.variantImage?.[0] || 'https://urbannook.in/assets/logo.webp';
  };

  // Returns true on success so Buy Now can continue straight to checkout.
  const handleInitialAddToCart = async ({ silent = false } = {}) => {
    if (!product) return false;
    const effectiveVariant = selectedVariant || availableVariants[0] || 'Standard Variant';
    const selectedImage = variantImage(effectiveVariant);
    const isLoggedIn = isAuthenticated || !!localStorage.getItem('authToken');

    if (isLoggedIn) {
      try {
        await addToCartAPI({ productId: product?.productId, quantity: 1, variant: effectiveVariant, image: selectedImage }).unwrap();
        dispatch(updateSelection({ productId: product.productId, quantity: 1, variant: effectiveVariant }));
        await refetchCart().unwrap();
        if (!silent) confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#E63329', '#C9281F', '#F3C33B', '#ffffff'] });
        setSelectedVariant(effectiveVariant);
        setFeedbackMessage('Added to cart'); setTimeout(() => setFeedbackMessage(''), 2000);
        trackAddToCart({ itemId: product.productId, sku: variantSku(product, effectiveVariant), itemName: product.productName, itemVariant: effectiveVariant, price: currentPrice, quantity: 1, placement: silent ? 'pdp_buy_now' : 'pdp_main' });
        return true;
      } catch (err) {
        showNotification(err.data?.message || 'Something went wrong', 'error');
        return false;
      }
    } else {
      dispatch(addItem({ id: product?.productId, mongoId: product?.productId, name: product?.productName, price: currentPrice, image: selectedImage, quantity: 1, selectedVariant: effectiveVariant, giftWrapEligible: !!product?.giftWrapEligible, sku: variantSku(product, effectiveVariant) }));
      setSelectedVariant(effectiveVariant);
      setFeedbackMessage('Added to cart'); setTimeout(() => setFeedbackMessage(''), 2000);
      trackAddToCart({ itemId: product.productId, sku: variantSku(product, effectiveVariant), itemName: product.productName, itemVariant: effectiveVariant, price: currentPrice, quantity: 1, placement: silent ? 'pdp_buy_now' : 'pdp_main' });
      return true;
    }
  };

  // One tap to checkout: adds qty 1 (if not already in cart) and goes straight on.
  const handleBuyNow = async () => {
    if (!isInCart && !(await handleInitialAddToCart({ silent: true }))) return;
    requestCheckout(navigate);
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
      trackRemoveFromCart({ itemId: product.productId, sku: variantSku(product, selectedVariant), itemName: product.productName, itemVariant: selectedVariant, price: currentPrice, quantity: currentCartQty || 1 });
      return;
    }
    if (isLoggedIn) {
      try { await updateCart({ productId: product.productId, quantity: 1, action: newQuantity > currentCartQty ? 'add' : 'sub', variant: selectedVariant || undefined, image: selectedImage }).unwrap(); await refetchCart(); }
      catch { window.location.reload(); }
    } else dispatch(updateQuantity({ id: product.productId, quantity: newQuantity, selectedVariant: selectedVariant || 'N/A' }));
  };

  const handleCheckoutClick = () => requestCheckout(navigate);

  // "Apply" on an offer (ProductOffers): put this product in the cart if it
  // isn't yet, then open the offer sheet for that promotion. When the product
  // was just added, the sheet also adds the reward (e.g. the stand) by itself
  // if there is exactly one to add; otherwise it shows the choice.
  const handleApplyOffer = async (promotionId) => {
    const wasInCart = isInCart;
    if (!wasInCart && !(await handleInitialAddToCart({ silent: true }))) return;
    window.dispatchEvent(new CustomEvent('un:open-offer-sheet', { detail: { promotionIds: [promotionId], autoAdd: !wasInCart } }));
  };

  // ── Pincode delivery check - same ShipMozo rate API the checkout uses ──
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
      // Dispatched within 24-48 hours; the promise date shown here is that
      // dispatch window plus a day for courier transit.
      const eta = new Date(Date.now() + 3 * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      setPinStatus({ ok: true, msg: `Delivery available to ${pin}`, charge: Number.isFinite(charge) ? charge : null, eta });
      trackDeliveryCheck({ pincode: pin, serviceable: true, shippingAmount: charge });
    } catch (err) {
      const reason = err?.data?.message || err?.message || '';
      setPinStatus({ ok: false, msg: /serviceable/i.test(reason) ? `Sorry - ${pin} isn't serviceable yet` : 'Could not check this pincode. Please try again.' });
      trackDeliveryCheck({ pincode: pin, serviceable: false, errorReason: reason });
    }
  };

  // ── Share - native sheet on mobile, social buttons on desktop ──
  // Include the selected variant - without it the link opens the product's
  // first variant (e.g. sharing Tanjiro opened Kokushibo).
  const shareVariantKey = selectedVariantObj?.sku || selectedVariantObj?.variantName;
  const shareUrl = `https://www.urbannook.in/product/${product?.productId}${shareVariantKey ? `/${encodeURIComponent(shareVariantKey)}` : ''}`;
  const shareText = `${selectedVariant || product?.productName || 'Urban Nook'} - Urban Nook`;
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
  // Reviews of the variant on screen first (variantSku is set on reviews the team adds from
  // the admin's Customer Hub → Reviews); the rest keep their newest-first order.
  const reviews = useMemo(() => {
    const list = rd.reviews || [];
    const sku = selectedVariantObj?.sku;
    return sku ? [...list].sort((a, b) => (b.variantSku === sku) - (a.variantSku === sku)) : list;
  }, [rd.reviews, selectedVariantObj?.sku]);
  const avgRating = rd.avgRating || 0;
  const totalReviews = rd.totalReviews || reviews.length;

  // Count of reviews per star (index 0 = 1★ … 4 = 5★) for the distribution bars.
  const ratingDist = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    reviews.forEach((r) => { const n = Math.round(r.rating || 0); if (n >= 1 && n <= 5) counts[n - 1]++; });
    return counts;
  }, [reviews]);

  // "In the wild" showcase: this product's own review photos first, then every photo review of the same kind of
  // product (all katanas on a katana page, all lamps on a lamp page). The wider list is only requested once the
  // shopper scrolls near the band.
  // The sentinel sits in the page body, which only exists once the product has loaded (the skeleton renders first), so
  // it is tracked with a callback ref + state: observing starts the moment the element appears.
  const [wildEl, setWildEl] = useState(null);
  const [nearWild, setNearWild] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (!wildEl || nearWild) return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNearWild(true); io.disconnect(); } }, { rootMargin: '700px 0px' });
    io.observe(wildEl);
    return () => io.disconnect();
  }, [wildEl, nearWild]);
  const { data: kindRes } = useGetPhotoReviewsQuery(productId, { skip: !nearWild || !pdpDisplay.sections.customerPhotos || Array.isArray(pdpDisplay.media.customerPhotos) });
  const communityShots = useMemo(() => {
    const own = reviewPhotos(reviews);
    const family = Array.isArray(pdpDisplay.media.customerPhotos) ? [] : reviewPhotos(kindRes?.data?.reviews || []);
    const seen = new Set();
    const available = [...own, ...family].filter(({ image }) => image && !seen.has(image) && seen.add(image));
    return orderedSelection(available, pdpDisplay.media.customerPhotos, (item) => item.id, (item) => item.image)
      .map(({ image, review }) => ({ url: image, name: review.userName || 'Customer', rating: review.rating, text: review.desc }));
  }, [reviews, kindRes, pdpDisplay.media.customerPhotos]);
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
  const handleAddReviewImage = async (e) => {
    const files = Array.from(e.target.files || []); e.target.value = '';
    // Phone photos are 2-4 MB; shrink to a 1200 px JPEG before upload (utils/compressImage.js).
    const toAdd = await Promise.all(files.slice(0, 3 - reviewImages.length).map((f) => compressImage(f)));
    setReviewImages((prev) => [...prev, ...toAdd]); setReviewImagePreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
  };
  const handleRemoveReviewImage = (idx) => { setReviewImages((p) => p.filter((_, i) => i !== idx)); setReviewImagePreviews((p) => p.filter((_, i) => i !== idx)); };

  if (isLoading && !previewDraft) return <div className="min-h-[70vh] grid place-items-center bg-paper"><div className="w-12 h-12 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>;
  if ((error && !previewDraft) || !product) return (
    <div className="min-h-[70vh] grid place-items-center bg-paper font-inter text-center px-5">
      <SEOHead title="Product not found" noIndex />
      <SsrStatus code={404} />
      <div><h1 className="text-3xl font-extrabold">Product not found</h1><button onClick={() => navigate('/products')} className="gl-press mt-5 bg-brand text-white font-bold px-7 py-3 rounded-xl hover:bg-brandHi">Back to Shop</button></div>
    </div>
  );

  const specs = displaySpecs;
  const pageDescription = displayDescription;
  // A variant URL of a "designs" product (see VARIANT_NOUN) is a page of its own:
  // canonical to itself, titled after the variant. The product URL stays the
  // collection of all its designs; its shopper-facing heading follows the
  // selected design while its SEO title remains the product-group name.
  const hasDesignVariants = !!VARIANT_NOUN[product.productCategory]
    && (product.variantDetails || []).filter((v) => v.isActive !== false).length > 1;
  const urlVariant = urlVariantSku ? (product.variantDetails || []).find((v) => v.sku === urlVariantSku) : null;
  const variantPage = hasDesignVariants && urlVariant ? urlVariant : null;
  const seoTitle = variantPage
    ? `${variantPage.variantName}${variantPage.variantSubTag ? ` (${variantPage.variantSubTag})` : ''}`
    : urlVariantSku && selectedVariant && selectedVariant !== 'N/A' ? selectedVariant : product.productName;
  const seoUrl = variantPage ? `/product/${product.productId}/${encodeURIComponent(variantPage.sku)}` : `/product/${product.productId}`;
  // The selected design is the shopper-facing title on both the product URL
  // and its variant URL. The product-group name remains in the SEO metadata.
  const sections = pdpDisplay.sections;
  const heading = pdpDisplay.titleMode === 'variant' && selectedVariant && selectedVariant !== 'N/A' ? selectedVariant : product.productName;
  // Image alt text: the selected variant's name ("BMW Brake Caliper Lamp") when there is one.
  const imageTitle = selectedVariant && selectedVariant !== 'N/A' ? selectedVariant : product.productName;
  // One ProductGroup with an Offer per variant, on the product page and on each
  // variant page (Google's multi-page variant pattern: offer url = variant page).
  const productUrl = `https://www.urbannook.in/product/${product.productId}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ProductGroup',
    '@id': `${productUrl}#product`,
    name: product.productName,
    url: productUrl,
    description: product.productSubDes || product.productDes,
    brand: { '@type': 'Brand', name: 'UrbanNook' },
    productGroupID: product.productId,
    ...(product.materialAndCare ? { material: product.materialAndCare } : {}),
    ...(totalReviews > 0 && avgRating > 0
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: Number(avgRating).toFixed(1), reviewCount: totalReviews, bestRating: 5, worstRating: 1 } }
      : {}),
    hasVariant: (product.variantDetails || []).filter((v) => v.isActive !== false).map((v) => {
      const price = Number(v.variantPrice) || 0;
      return {
        '@type': 'Product',
        name: v.variantName || product.productName,
        ...(v.sku ? { sku: v.sku } : {}),
        ...(v.variantDes ? { description: v.variantDes } : {}),
        image: v.variantImage?.length ? v.variantImage : galleryImages,
        offers: {
          '@type': 'Offer',
          url: v.sku ? `${productUrl}/${v.sku}` : productUrl,
          priceCurrency: 'INR',
          price,
          availability: product.productStatus === 'in_stock' && !isVariantOutOfStock(v) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
          ...(shippingDetails(price, freeShippingRes?.data) ? { shippingDetails: shippingDetails(price, freeShippingRes?.data) } : {}),
          hasMerchantReturnPolicy: RETURN_POLICY,
        },
      };
    }),
  };
  const variantCrumb = urlVariantSku && selectedVariant && selectedVariant !== 'N/A' && selectedVariant !== product.productName ? selectedVariant : null;
  const breadcrumbData = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.urbannook.in/' },
      product.productCategory
        ? { '@type': 'ListItem', position: 2, name: product.productCategory, item: `https://www.urbannook.in${categoryPath(product.productCategory)}` }
        : { '@type': 'ListItem', position: 2, name: 'Shop', item: 'https://www.urbannook.in/products' },
      { '@type': 'ListItem', position: 3, name: product.productName, item: `https://www.urbannook.in/product/${product.productId}` },
      // Variant URL (/product/<id>/<sku>): one more level, the variant itself.
      ...(variantCrumb ? [{ '@type': 'ListItem', position: 4, name: variantCrumb, item: `https://www.urbannook.in/product/${product.productId}/${urlVariantSku}` }] : []),
    ],
  };

  const lowerSectionNodes = {
    comparison: (sections.comparison && <ComparisonTable data={pdpDisplay.comparison} heading={pdpDisplay.headings.comparison} />),
    reviews: (sections.reviews && <div className="w-screen ml-[calc(50%-50vw)] bg-paper mt-16">
        <div id="reviews" className="max-w-[1280px] mx-auto px-5 scroll-mt-24">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{pdpDisplay.headings.reviews || 'Ratings & Reviews'}</h2>
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
            <div className="pdp-raised border border-hair rounded-2xl p-6 mb-8 bg-white">
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
                <div className="pdp-raised sm:col-span-2 text-muted text-sm bg-white border border-hair rounded-2xl p-8 text-center">No reviews yet - be the first to review this product.</div>
              ) : reviews.slice(0, visibleReviews).map((rev) => {
                const imgs = rev.imageUrls?.length ? rev.imageUrls : rev.imageUrl ? [rev.imageUrl] : [];
                return (
                  <div key={rev._id} className="pdp-raised bg-white border border-hair rounded-2xl p-5">
                    <div className="flex items-center justify-between"><Stars n={rev.rating} className="text-sm" />{rev.userId && rev.userId === currentUserId && <button onClick={() => handleEditReview(rev)} className="text-xs text-brand font-semibold">Edit</button>}</div>
                    <p className="pdp-review-copy text-muted text-sm mt-2">{rev.desc}</p>
                    {imgs.length > 0 && (
                      <div className="flex gap-2 mt-3">{imgs.map((u, i) => <button key={i} onClick={() => setLightbox({ list: imgs, idx: i })} className="w-14 h-14 rounded-lg overflow-hidden border border-hair"><img src={u} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" /></button>)}</div>
                    )}
                    <p className="pdp-review-author mt-3 text-xs font-bold">{rev.userName || 'Customer'}{rev.verified !== false ? ' · Verified' : ''}{rev.source === 'google' && <span className="font-normal text-muted"> · via Google</span>}</p>
                    {rev.variant && <p className="text-[11px] text-muted mt-0.5">Bought: {rev.variant}</p>}
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
        </div>),
    // Temporarily hide the lower "Explore other variants" section.
    // Keep its admin setting and order key so it can be restored later.
    otherVariants: null,
    related: (sections.related && related.length > 0 && (
          <div className="mt-16">
            <div className="flex items-end justify-between mb-6"><h2 className="text-2xl md:text-3xl font-bold tracking-tight">{pdpDisplay.headings.related || 'You may also like'}</h2><button onClick={() => navigate('/products')} className="text-sm font-bold underline underline-offset-4 decoration-2 hover:text-brand">View all →</button></div>
            {/* Single scrollable row (matches the old site's layout) instead
                of a multi-row grid - the card design itself is unchanged. */}
            <div
              className="flex gap-4 md:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ touchAction: 'pan-x' }}
            >
              {related.map((p, i) => (
                <div key={p.productId || i} className="snap-start shrink-0 w-[160px] sm:w-[190px] md:w-[220px]">
                  <UnProductCard p={p} index={i} listId="pdp_related" listName="Related" />
                </div>
              ))}
            </div>
          </div>
        )),
    story: (sections.story && (seoIntro.length > 0 || story) && (
          <section className="mt-16 max-w-3xl mx-auto text-center">
            <p className="gl-lbl text-brand mb-2">The story</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-5">{pdpDisplay.headings.story || 'Why fans love it'}</h2>
            {seoIntro.map((t, i) => <p key={i} className="pdp-long-copy text-muted text-sm leading-relaxed mt-2">{t}</p>)}
            {story && <Link to={`/blog/${story.slug}`} className="inline-block mt-4 text-sm font-bold text-brand hover:underline">Know the story →</Link>}
          </section>
          )),
    faq: (sections.faq && faqs.length > 0 && (
          <section className="mt-16">
            <p className="gl-lbl text-brand mb-2 text-center">Good to know</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-8 text-center">{pdpDisplay.headings.faq || 'Questions, answered'}</h2>
            <div className="max-w-3xl mx-auto divide-y divide-hair border-y border-hair">
              {faqs.map((f, i) => (
                <details key={i} className="group py-4">
                  <summary className="flex items-center justify-between gap-4 cursor-pointer font-bold list-none">
                    <span>{f.q}</span>
                    <span className="shrink-0 text-brand text-2xl leading-none transition-transform duration-300 group-open:rotate-45">＋</span>
                  </summary>
                  <p className="pdp-long-copy text-muted text-sm mt-3 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )),
  };

  const variantLinks = [...activeVariants]
    .sort((a, b) => Number(isVariantOutOfStock(a)) - Number(isVariantOutOfStock(b)))
    .map((variant) => {
      const selected = variant.variantName === selectedVariant;
      const outOfStock = isVariantOutOfStock(variant);
      return (
        <Link key={variant.sku || variant.variantName}
          to={variant.sku ? `/product/${product.productId}/${variant.sku}` : `/product/${product.productId}`}
          onClick={(event) => { event.preventDefault(); onSelectVariant(variant); }}
          aria-current={selected ? 'true' : undefined}
          title={variant.variantName}
          className={`pdp-variant-pill ${premiumPdpPurchaseDesign ? 'pdp-purchase-design-option' : 'shrink-0 whitespace-nowrap'} rounded-full border px-3.5 py-2 font-archivo text-[13px] leading-none transition-colors ${selected ? 'border-ink bg-ink font-bold text-paper' : 'border-hair bg-white font-semibold text-ink hover:border-ink'} ${outOfStock ? 'text-muted line-through' : ''}`}>
          {shortNames.get(variant.variantName) || variant.variantName}
        </Link>
      );
    });

  const purchaseOffers = <>
    {sections.offers && <SaleDealBox className="mt-4" />}
    <div id="pdp-offers" className="scroll-mt-24" />
    {sections.offers && <ProductOffers productId={productId} className="mt-3" compact={premiumPdpPurchaseDesign} cartTotal={cartTotal} appliedIds={appliedOfferIds} cartPromotions={cartPromotions} onApply={isOutOfStock ? undefined : handleApplyOffer} disabled={isAdding} />}
  </>;

  return (
    <div ref={pageRef} className={`pdp-page font-inter bg-paper text-ink min-h-screen overflow-x-clip ${premiumPdpPurchaseDesign ? 'pdp-purchase-design-active' : ''} ${floatingPdpPlatformDesign ? 'pdp-floating-platform-active' : ''}`}>
      <SEOHead title={seoTitle} description={pageDescription} url={seoUrl} image={galleryImages[0]} type="product" forceNoIndex={previewMode} structuredData={previewMode ? [] : [structuredData, breadcrumbData, ...(sections.faq && seoFaqs.length ? [faqPageJsonLd(faqs)] : [])]} />

      <div className="max-w-[1280px] mx-auto px-5 pt-3 pb-6 md:py-8">
        {/* breadcrumb */}
        <div className={`pdp-breadcrumb text-[11px] leading-snug text-faint mb-3 md:mb-5 md:pt-4 ${festiveOn ? 'pt-6' : ''}`}>{/* extra room only while the hanging festive lights are up */}
          <Link to="/" className="hover:text-brand">Home</Link> / <Link to={product.productCategory ? categoryPath(product.productCategory) : '/products'} className="hover:text-brand">{product.productCategory || 'Shop'}</Link> / {variantCrumb
            ? <><Link to={`/product/${product.productId}`} className="hover:text-brand">{product.productName}</Link> / <span className="text-ink">{variantCrumb}</span></>
            : <span className="text-ink">{product.productName}</span>}
        </div>

        <div className={`grid lg:grid-cols-2 gap-2 sm:gap-8 lg:gap-10 ${floatingPdpPlatformDesign ? 'pdp-product-layout' : ''}`}>
          {/* GALLERY - one big full-width framed image (swipe + dots on mobile, arrows on desktop) */}
          <div className="lg:sticky lg:top-24 self-start w-full min-w-0 relative">
            <ImageCarousel priority thumbs hideCounter={floatingPdpPlatformDesign} images={galleryImages} alt={(i) => `${imageTitle} - photo ${i + 1}`} onImgErr={onImgErr} onItemClick={(i) => setLightbox({ list: galleryImages, idx: i })} />
            {floatingPdpPlatformDesign && <div className="pdp-gallery-actions" aria-label="Product actions">
              <button onClick={handleShareClick} aria-label="Share this product" className="pdp-gallery-action" type="button">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.7 13.5 6.6 3.9M15.3 6.6 8.7 10.5" /></svg>
              </button>
              <WishlistButton productId={product.productId} className="pdp-gallery-wishlist" size="lg" />
            </div>}
          </div>

          {/* INFO */}
          <div className={`min-w-0 ${premiumPdpPurchaseDesign ? 'pdp-purchase-premium' : ''} ${floatingPdpPlatformDesign ? 'pdp-floating-platform' : ''}`}>
            {/* ZONE A - IDENTITY: title + share/heart, then price (left) and the reviews pill (right) */}
            <div className={`flex items-start justify-between gap-3 ${premiumPdpPurchaseDesign ? 'pdp-purchase-heading' : ''}`}>
              <div className="min-w-0">
                {/* No line-clamp - a long name used to get cut off with an
                    ellipsis after 2 lines on mobile. min-h is a MINIMUM, not
                    a cap, so it still keeps short titles' height consistent
                    without truncating a longer one. */}
                <h1 className="text-[24px] md:text-[34px] font-bold tracking-tight text-ink leading-tight min-h-[26px] md:min-h-[20px]">
                  {heading}
                </h1>
                {selectedVariantSubTag && (
                  <p className="pdp-subtitle text-base md:text-lg font-normal text-muted leading-snug mt-1">{selectedVariantSubTag}</p>
                )}
              </div>
              {!floatingPdpPlatformDesign && <div className={`shrink-0 pt-1 flex items-center gap-2 ${premiumPdpPurchaseDesign ? 'pdp-purchase-icons' : ''}`}>
                <button onClick={handleShareClick} aria-label="Share this product" className="w-9 h-9 grid place-items-center rounded-full border border-hair text-ink hover:border-ink transition-colors">
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.7 13.5 6.6 3.9M15.3 6.6 8.7 10.5" /></svg>
                </button>
                <WishlistButton productId={product.productId} />
              </div>}
            </div>
            {premiumPdpPurchaseDesign && sections.reviews && totalReviews > 0 && avgRating > 0 && (
              <button onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })} className="pdp-purchase-rating inline-flex items-center gap-1.5 text-left hover:opacity-70 transition-opacity" aria-label={`Read ${totalReviews} product reviews`}>
                <Stars n={avgRating} className="text-xs" />
                <span className="text-xs font-semibold text-ink">{Number(avgRating).toFixed(1)}</span>
                <span className="text-xs text-muted">({totalReviews} review{totalReviews === 1 ? '' : 's'})</span>
              </button>
            )}
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
            {/* {displayDescription && <p className="text-xs text-muted leading-relaxed mt-2">{displayDescription}</p>} */}

            <div className={`mt-3 flex items-start justify-between gap-3 ${premiumPdpPurchaseDesign ? 'pdp-purchase-pricing' : ''}`}>
              <div className="min-w-0">
                <div className={`flex items-center gap-2.5 ${premiumPdpPurchaseDesign ? 'pdp-purchase-price-line' : ''}`}>
                  <span className="pdp-price text-[28px] md:text-[34px] font-bold text-ink tracking-tight tabular-nums leading-none">{inr(currentPrice)}</span>
                  {discountPercent > 0 && (
                    <div className={premiumPdpPurchaseDesign ? 'pdp-purchase-saving' : 'flex flex-col items-start gap-1'}>
                      {premiumPdpPurchaseDesign ? <>
                        <span className="pdp-mrp text-sm text-faint line-through tabular-nums leading-none">{inr(maxVariantPrice)}</span>
                        <span className="pdp-discount text-[11px] font-extrabold leading-none text-sale">{discountPercent}% OFF</span>
                      </> : <>
                        <span className="pdp-discount text-[11px] font-extrabold leading-none text-sale">{discountPercent}% OFF</span>
                        <span className="pdp-mrp text-sm text-faint line-through tabular-nums leading-none">{inr(maxVariantPrice)}</span>
                      </>}
                    </div>
                  )}
                </div>
                <SaleTag />
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {!premiumPdpPurchaseDesign && sections.reviews && totalReviews > 0 && avgRating > 0 && (
                  <button onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })} className="inline-flex items-center gap-1.5 py-1 hover:opacity-70 transition-opacity" aria-label={`Read ${totalReviews} product reviews`}>
                    <Stars n={avgRating} className="text-xs" />
                    <span className="text-xs font-bold text-ink">{Number(avgRating).toFixed(1)}</span>
                    <span className="text-xs text-muted">({totalReviews})</span>
                  </button>
                )}
                {/* paused for now: {discountPercent > 0 && <p className="text-[13px] font-semibold text-save">You save {inr(maxVariantPrice - currentPrice)}</p>} */}
              </div>
            </div>

            {/* ZONE B - BUY CARD: price → savings → variants → urgency → CTA → trust, one unit.
                py only, no px: the horizontal p-4/p-5 used to indent this
                whole block (price, buttons, trust strip) further right than
                Zone A's title/kicker above it, which sit with no padding of
                their own - everything below looked shifted right instead of
                lining up to the same left edge. Vertical spacing is kept. */}
            <div className="mt-1 bg-paper pdp-purchase-body">

              {/* variants */}
              {sections.variantPicker && availableVariants.length > 0 && (
                <>
                  <div className={premiumPdpPurchaseDesign ? 'my-3' : 'my-4'} />

                  {/* Picture swatches with the picked design's name on the label
                      row. Each tile is a real link to that variant's own URL
                      (crawlable); a normal click stays on this page and swaps
                      the variant in place via onSelectVariant. The row scrolls
                      rather than wraps, so many variants stay one line. */}
                  {/* Designs as plain name pills: each design (Insoku, Rengoku…) is its
                      own piece, so photo tiles labelled "Variant" misled shoppers.
                      Real links to each design's URL; a click swaps in place. */}
                  {activeVariants.length > 1 && (
                    <div className={premiumPdpPurchaseDesign ? 'pdp-purchase-designs' : ''}>
                      {premiumPdpPurchaseDesign ? <>
                        <div className="pdp-purchase-variant-meta">
                          <span>Choose design</span>
                          <span>Selected: {shortNames.get(selectedVariant) || selectedVariant}</span>
                        </div>
                        <ScrollRow className="pdp-purchase-options-scroll" fade={floatingPdpPlatformDesign ? 'from-[#faf8f4]' : 'from-paper'} activeKey={selectedVariant}>{variantLinks}</ScrollRow>
                      </> : <ScrollRow fade="from-paper" activeKey={selectedVariant}>{variantLinks}</ScrollRow>}
                    </div>
                  )}
                </>
              )}

              {sections.variantPicker && <VersionPicker
                variant={selectedVariantObj}
                onOpen={(t) => navigate(t.sku ? `/product/${t.productId}/${t.sku}` : `/products/${t.productId}`, { state: { keepScroll: true } })}
              />}

              {/* urgency + delivery */}
              {/* <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs mt-4">
                {isOutOfStock ? (
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-faint" /><span className="text-muted font-semibold">Out of stock</span></span>
                ) : selectedVariantLowStock && selectedVariantQty !== 1 ? (
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand animate-pulse" /><span className="text-brand font-semibold">Few left - selling fast</span></span>
                ) : (
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-save" /><span className="text-ink font-semibold">In stock</span></span>
                )}
                <span className="text-muted"><i className="fa-solid fa-truck-fast mr-1" aria-hidden="true" />Ships in 24-48 hrs</span>
              </div> */}

              {floatingPdpPlatformDesign && purchaseOffers}

              {/* CTA */}
              <div ref={buyBoxRef} className={`pdp-buy-actions flex items-center gap-3 mt-4 ${premiumPdpPurchaseDesign ? 'pdp-purchase-actions' : ''}`}>
                {isOutOfStock ? (
                  <button
                    onClick={() => setShowNotifyModal(true)}
                    className="gl-press flex-1 h-12 border border-ink text-ink font-bold text-sm rounded-xl hover:bg-ink hover:text-paper transition-colors flex items-center justify-center gap-2"
                  >
                    <i className="fa-regular fa-bell text-xs" /> Notify me when back
                  </button>
                ) : isInCart ? (
                  <>
                    <div className={`flex items-center border border-ink rounded-xl h-12 shrink-0 ${premiumPdpPurchaseDesign ? 'pdp-purchase-quantity' : ''}`}>
                      <button onClick={() => handleUpdateQty(currentCartQty - 1)} aria-label={currentCartQty > 1 ? 'Decrease quantity' : 'Remove from cart'} className="w-10 h-full text-lg">−</button>
                      <span className="w-8 text-center font-bold">{currentCartQty}</span>
                      <button onClick={() => handleUpdateQty(currentCartQty + 1)} aria-label="Increase quantity" className="w-10 h-full text-lg">+</button>
                    </div>
                    <button onClick={handleCheckoutClick} className={`gl-press flex-1 h-12 bg-brand text-paper font-bold text-sm rounded-xl hover:bg-brandHi ${premiumPdpPurchaseDesign ? 'pdp-purchase-primary' : ''}`}>{premiumPdpPurchaseDesign ? 'Continue to checkout' : 'View offers & checkout'}</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleInitialAddToCart()} disabled={isAdding} className={`gl-press flex-1 h-12 border border-ink text-ink font-bold text-sm rounded-xl hover:bg-ink hover:text-paper transition-colors disabled:opacity-60 whitespace-nowrap ${premiumPdpPurchaseDesign ? 'pdp-purchase-secondary' : ''}`}>
                      Add to Cart
                    </button>
                    <button onClick={handleBuyNow} disabled={isAdding} className={`gl-press flex-1 h-12 bg-brand text-paper font-bold text-sm rounded-xl hover:bg-brandHi disabled:opacity-60 whitespace-nowrap ${premiumPdpPurchaseDesign ? 'pdp-purchase-primary' : ''}`}>
                      {isAdding ? 'Please wait…' : 'Buy Now'}
                    </button>
                  </>
                )}
              </div>

              {/* Free-shipping threshold, right under the CTA where the buy
                  decision happens - hidden unless admin's promotion is on. */}
              {sections.deliveryOffer && !isOutOfStock && <OfferProgress location="product" className="mt-3" fallback={<FreeShippingStrip cartTotal={cartTotal} variant="compact" className="mt-3" />} />}

              {/* Legacy purchase order is preserved when the design flag is off. */}
              {!premiumPdpPurchaseDesign && sections.questions && <ProductQuestions productName={product.productName} variantName={selectedVariant} url={shareUrl} className="mt-3" />}

              {/* Offers right under the buy buttons - price and variants stay clean
                  up top; the offers popup (OffersPopup) announces them on arrival. */}
              {/* live sale countdown right above the offers it belongs to */}
              {!floatingPdpPlatformDesign && purchaseOffers}

              {/* Coupons (guest list is server-rendered; see entry-server.jsx) */}
              {sections.coupons && <CouponOffersSection variant="pdp" />}

              {premiumPdpPurchaseDesign && sections.questions && <ProductQuestions productName={product.productName} variantName={selectedVariant} url={shareUrl} className="pdp-purchase-help mt-4" />}

              {/* Customization - admin opt-in per product (product.isCustomizable),
                  not every product is customisable. Carries the product (and the
                  variant they are looking at) through so the request form
                  arrives prefilled. */}
              {sections.customization && product.isCustomizable && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/customize?product=${encodeURIComponent(product.productId)}${
                        selectedVariant ? `&variant=${encodeURIComponent(selectedVariant)}` : ''
                      }`,
                    )
                  }
                  className={`mt-4 w-full flex items-center justify-between gap-3 border border-hair bg-white px-4 py-3 rounded-xl hover:border-ink transition-colors text-left ${premiumPdpPurchaseDesign ? 'pdp-customize-card' : ''}`}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-ink">Want it customised?</span>
                    <span className="block text-xs text-muted mt-0.5">
                      Different colour, your name on it, or your own livery.
                    </span>
                  </span>
                  <span className="gl-lbl text-[10px] text-brand shrink-0">Ask us →</span>
                </button>
              )}

              {/* pincode delivery check */}
              {/* <div className="mt-4 pt-4 border-t border-hair">
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
              </div> */}

              {/* trust strip inside the card */}
              {sections.trust && <><p className="pdp-trust-heading mt-5 text-sm font-bold text-ink">Shop with peace of mind</p>
              <div className="mt-2.5 grid grid-cols-3 gap-1 text-center">
                {[
                  // ['fa-truck-fast', 'Dispatch', '24-48 hrs'], // paused: no 24-48 hr promise for now
                  ['fa-money-bill-wave', 'Payment', product.isCodAvailable ? 'Partial COD' : 'Secure pay'],
                  ['fa-rotate-left', 'Replacement', 'Free if damaged*'],
                  ['fa-location-dot', 'Delivery', 'Pan-India'],
                ].map(([icon, title, sub]) => (
                  <div key={title} className="flex flex-col items-center gap-1">
                    <span className="grid h-11 w-11 place-items-center rounded-full border border-hair bg-white text-ink"><i className={`fa-solid ${icon} text-[15px]`} aria-hidden="true" /></span>
                    <span className="pdp-trust-label text-[11.5px] font-bold text-ink">{title}</span>
                    <span className="pdp-trust-sub text-[10.5px] leading-tight text-muted">{sub}</span>
                  </div>
                ))}
              </div>
              <p className="pdp-trust-note mt-1.5 text-[8px] text-faint text-center">
                *Applicable only with an unboxing video showing the damaged product and its shipping label.
              </p></>}
            </div>

            {/* OFFERS - UPI / EMI / card offers, applied via Razorpay at checkout */}
            {/* <div className="mt-4 rounded-2xl border border-hair bg-white p-4 md:max-w-md">
              <div className="flex items-center justify-between mb-3">
                <p className="gl-lbl text-brand">Available offers</p>
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Powered by Razorpay</span>
              </div>
              <ul className="space-y-2.5 text-sm text-ink">
                <li className="flex items-start gap-2.5">
                  <i className="fa-solid fa-bolt text-brand text-xs mt-1 w-4 text-center shrink-0" />
                  <span><b>UPI</b> - pay instantly with GPay, PhonePe, Paytm &amp; more</span>
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
                    <span><b>Partial COD</b> - small advance online, rest on delivery</span>
                  </li>
                )}
              </ul>
            </div> */}

            {/* ZONE C - promotion banner slot. The old combo-banner system
                (FreeShippingBanner/ProductPageBanner, reading the now-deleted
                cart-rule/offers adapter) was removed entirely 2026-10-09 -
                this surface now has no renderer yet. The data layer for a
                replacement already exists (useGetProductPromotionsQuery,
                src/store/api/userApi.js, hitting Promotion Engine V2's
                sanitized Display API) - UI here is a deliberate follow-up,
                not an oversight. */}

          </div>
        </div>

        {/* PRODUCT DETAILS - full-bleed LIGHT-GREY (surface) band: description / specs / shipping */}
        {(sections.details || sections.specifications || sections.materialCare || sections.shippingExchange) && <div className="w-screen ml-[calc(50%-50vw)] bg-paper mt-8 md:mt-12">
        <section className="max-w-3xl mx-auto px-5">
          <p className="gl-lbl text-brand mb-1.5 md:mb-2 text-center">The full rundown</p>
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-4 md:mb-5 text-center">{pdpDisplay.headings.details || 'Product details'}</h2>
          <div className="divide-y divide-hair border-y border-hair">
            {sections.details && displayDescription && (
              <details open className="group py-3 md:py-4"><summary className="flex justify-between items-center gap-4 cursor-pointer font-bold list-none">Description<span className="shrink-0 text-brand text-2xl leading-none transition-transform duration-300 group-open:rotate-45">＋</span></summary><p className="pdp-description text-muted mt-2.5 text-sm leading-relaxed">{displayDescription}</p></details>
            )}
            {sections.specifications && specs.length > 0 && (
              <details className="group py-3 md:py-4"><summary className="flex justify-between items-center gap-4 cursor-pointer font-bold list-none">Specifications<span className="shrink-0 text-brand text-2xl leading-none transition-transform duration-300 group-open:rotate-45">＋</span></summary>
                <div className="mt-3 text-sm">{specs.map((s, i) => <div key={i} className="flex justify-between py-1.5 border-b border-hair last:border-0"><span className="text-muted">{s.key}</span><span className="font-medium text-right">{s.value}</span></div>)}</div>
              </details>
            )}
            {sections.materialCare && (product.materialAndCare || product.warranty) && (
              <details className="group py-3 md:py-4"><summary className="flex justify-between items-center gap-4 cursor-pointer font-bold list-none">Material &amp; Care<span className="shrink-0 text-brand text-2xl leading-none transition-transform duration-300 group-open:rotate-45">＋</span></summary>
                {product.materialAndCare && <p className="text-muted mt-3 text-sm leading-relaxed">{product.materialAndCare}</p>}
                {product.warranty && <p className="text-muted mt-2 text-sm leading-relaxed"><span className="font-semibold text-ink">Warranty:</span> {product.warranty}</p>}
              </details>
            )}
            {sections.shippingExchange && <details className="group py-3 md:py-4"><summary className="flex justify-between items-center gap-4 cursor-pointer font-bold list-none">Shipping &amp; Exchange<span className="shrink-0 text-brand text-2xl leading-none transition-transform duration-300 group-open:rotate-45">＋</span></summary><p className="text-muted mt-3 text-sm">Made to order, ships pan-India. Free replacement if it arrives damaged or wrong .{product.isCodAvailable ? ' Partial COD available.' : ''}</p></details>}
          </div>
          {product.disclaimer && <p className="text-xs text-faint mt-4 text-center leading-relaxed">{product.disclaimer}</p>}
        </section>
        </div>}

        {/* LOOK CLOSER - full-bleed LIGHT-GREY (surface) band, auto-playing carousel (tap to zoom) */}
        {sections.lookCloser && lookCloserImages.length > 0 && (customLookCloser || lookCloserImages.length > 1) && (
          <div className="w-screen ml-[calc(50%-50vw)] bg-paper text-ink mt-4 md:mt-6">
            <div className="max-w-[1280px] mx-auto px-5 py-5 md:py-5">
              <div className="flex items-end justify-between mb-4 md:mb-6">
                <div>
                  <p className="gl-lbl text-brand mb-2">- The Details</p>
                  <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[0.95]">
                    {pdpDisplay.headings.lookCloser || <><span className="text-ink">Look</span> <span className="text-faint">closer.</span></>}
                  </h2>
                </div>
                <span className="text-xs text-faint shrink-0">Tap to zoom</span>
              </div>
              <ImageCarousel
                peek
                images={lookCloserImages}
                alt={(i) => `${imageTitle} - ${specs[i]?.key ? `${specs[i].key.toLowerCase()} detail` : `detail ${i + 1}`}`}
                onImgErr={onImgErr}
                onItemClick={(i) => setLightbox({ list: lookCloserImages, idx: i })}
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

        {/* IN THE WILD - full-bleed BLACK (ink) editorial band from customer review photos */}
        <div ref={setWildEl} aria-hidden="true" className="h-px" />
        {sections.customerPhotos && nearWild && communityShots.length > 0 && (
          <ScrollColorBand nightScopeRef={pageRef} className="w-screen ml-[calc(50%-50vw)] mt-4 md:mt-16">
            <div className="max-w-[1280px] mx-auto px-5 py-10 md:py-20">
              <p className="gl-lbl opacity-65 mb-3">- In the wild</p>
              <h2 className="text-[clamp(1.4rem,5.7vw,2rem)] md:text-5xl font-bold tracking-tight leading-tight mb-2 whitespace-nowrap">
                <span>Seen in </span><span className="opacity-80">real setups.</span>
              </h2>
              <p className="opacity-80 text-sm leading-relaxed mb-6 md:mb-8">Photos shared by customers.</p>
              <CommunityShots shots={Array.isArray(pdpDisplay.media.customerPhotos) ? communityShots : communityShots.slice(0, 8)} curated={Array.isArray(pdpDisplay.media.customerPhotos)} onImgErr={onImgErr} onOpen={(i) => setLightbox({ list: communityShotUrls, idx: i, contexts: communityShots })} />
            </div>
          </ScrollColorBand>
        )}

        {pdpDisplay.order.map((key) => lowerSectionNodes[key] ? <Fragment key={key}>{lowerSectionNodes[key]}</Fragment> : null)}
      </div>

      {/* sticky Add-to-Cart bar (mobile above the bottom nav, desktop at the very bottom) - appears after the main CTA scrolls out of view */}
      <AnimatePresence>
        {sections.stickyBuyBar && !buyBoxVisible && product && !isLoading && (
          <MotionDiv
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            data-sticky-buybar="all" // the floating Help button lifts above this bar while it is shown ("all" = desktop too)
            className={`pdp-sticky-buy fixed inset-x-0 z-30 bg-paper/95 backdrop-blur border-t border-hair px-4 py-3 flex items-center gap-3 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-0 md:px-[max(1.25rem,calc((100vw-1280px)/2+1.25rem))] ${premiumPdpPurchaseDesign ? 'pdp-purchase-sticky-premium' : ''}`}
          >
            {/* the thumbnail is the first thing to go once the bar also has to
                hold a stepper - at 390px there is not room for both */}
            {!isInCart && (
              <img src={variantImage(selectedVariant)} alt="" className="w-11 h-11 rounded-lg object-cover border border-hair shrink-0" onError={onImgErr} />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm font-bold truncate leading-tight">{product.productName}</p>
              {selectedVariant && selectedVariant !== product.productName && <p className="hidden md:block gl-lbl text-[10px] text-muted truncate">{selectedVariant}</p>}
              <p className="text-sm font-extrabold md:hidden">{inr(currentPrice)}</p>
            </div>
            {/* desktop: price + struck MRP beside the buttons, like the main buy box */}
            <div className="hidden md:flex items-baseline gap-2 shrink-0">
              <span className="text-xl font-extrabold tabular-nums">{inr(currentPrice)}</span>
              {discountPercent > 0 && <span className="text-sm text-faint line-through tabular-nums">{inr(maxVariantPrice)}</span>}
            </div>
            {isOutOfStock ? (
              <button onClick={() => setShowNotifyModal(true)} className="gl-press border border-ink text-ink font-bold text-sm px-5 h-11 rounded-xl shrink-0 hover:bg-ink hover:text-paper transition-colors">Notify me</button>
            ) : isInCart ? (
              <>
                {/* Same handleUpdateQty the main buy box uses, so the cart API
                    call (and the guest-cart dispatch) stays in one place -
                    this bar only adds a second way to reach it. */}
                <div className="flex items-center border border-ink rounded-xl h-11 shrink-0">
                  <button
                    onClick={() => handleUpdateQty(currentCartQty - 1)}
                    aria-label={currentCartQty > 1 ? 'Decrease quantity' : 'Remove from cart'}
                    className="w-8 h-full text-lg leading-none grid place-items-center"
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-bold text-sm tabular-nums">{currentCartQty}</span>
                  <button
                    onClick={() => handleUpdateQty(currentCartQty + 1)}
                    aria-label="Increase quantity"
                    className="w-8 h-full text-lg leading-none grid place-items-center"
                  >
                    +
                  </button>
                </div>
                <button onClick={handleCheckoutClick} className="gl-press bg-brand text-white font-bold text-sm px-4 h-11 rounded-xl shrink-0 hover:bg-brandHi">{premiumPdpPurchaseDesign ? 'Checkout' : 'Offers & checkout'}</button>
              </>
            ) : (
              <>
                {/* desktop has the room for both buttons, like the main buy box */}
                <button onClick={() => handleInitialAddToCart()} disabled={isAdding} className="hidden md:block gl-press border border-ink text-ink font-bold text-sm px-6 h-11 rounded-xl shrink-0 hover:bg-ink hover:text-paper transition-colors disabled:opacity-60">Add to Cart</button>
                <button onClick={handleBuyNow} disabled={isAdding} className="gl-press bg-brand text-white font-bold text-sm px-6 h-11 rounded-xl shrink-0 hover:bg-brandHi disabled:opacity-60">{isAdding ? 'Please wait…' : 'Buy Now'}</button>
              </>
            )}
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* out-of-stock notify-me */}
      {showNotifyModal && (
        <NotifyMeModal
          productName={product?.productName}
          productId={product?.productId}
          variantName={selectedVariant || availableVariants[0] || null}
          variants={(product?.variantDetails || []).map((v) => ({ name: v.variantName, outOfStock: isVariantOutOfStock(v) }))}
          onClose={() => setShowNotifyModal(false)}
        />
      )}

      {/* feedback toast */}
      {feedbackMessage && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[120] bg-ink text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg">{feedbackMessage}</div>}

      {/* lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[130] bg-black/80 grid place-items-center p-6" onClick={() => setLightbox(null)}>
          <div className="max-w-full" onClick={(e) => e.stopPropagation()}><img src={lightbox.list[lightbox.idx]} alt="" className="max-h-[75vh] max-w-full rounded-xl mx-auto" />{lightbox.contexts?.[lightbox.idx] && <p className="mt-3 max-w-xl text-center text-sm text-white"><strong>{lightbox.contexts[lightbox.idx].name}</strong> · {lightbox.contexts[lightbox.idx].rating}★<span className="block mt-1 opacity-80">{lightbox.contexts[lightbox.idx].text}</span></p>}</div>
          <button className="absolute top-5 right-5 w-10 h-10 rounded-full bg-paper text-ink grid place-items-center text-xl" onClick={() => setLightbox(null)}>×</button>
        </div>
      )}
    </div>
  );
};

// MotionRoot: reduced-motion setting for this page's animations (component/motion).
const ProductDetailPageWithMotion = () => <MotionRoot><ProductDetailPage /></MotionRoot>;

export default ProductDetailPageWithMotion;
