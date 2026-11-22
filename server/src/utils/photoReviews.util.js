// Homepage "Straight from your desks" wall: approved product reviews with a customer photo (website, Google and
// WhatsApp ones share the collection), newest first, public fields only. Cached 10 min.
import ProductReview from "../model/product.specific.testimonial.model.js";
import Product from "../model/product.model.js";
import HeroBanner from "../model/heroBanner.model.js";
import { apiCache } from "../module/cache.manager.module.js";

const PHOTO_REVIEW = { isApproved: true, $or: [{ imageUrls: { $exists: true, $ne: [] } }, { imageUrl: { $nin: [null, ""] } }] };
const PHOTO_LIST_MAX = 200;

/** Which kind of product a review belongs to, so a page only shows photos of its own kind: every katana (wooden, LED,
 *  stands) is "katana", every lamp is "lamp", anything else is grouped by its sub-category (else its category). */
export const reviewFamily = ({ productCategory, productSubCategory, productName } = {}) => {
  if (/katana/i.test(`${productSubCategory || ""} ${productName || ""}`)) return "katana";
  if (productCategory === "Lamp") return "lamp";
  return String(productSubCategory || productCategory || "").toLowerCase();
};

/** One stored review (+ the product lookup) → the public card, or null when it has no photo. */
export const toPhotoReview = (r, products = new Map()) => {
  const product = products.get(r.productId);
  const images = (r.imageUrls?.length ? r.imageUrls : r.imageUrl ? [r.imageUrl] : []).filter(Boolean);
  if (!images.length) return null;
  return {
    id: String(r._id),
    userName: r.userName,
    rating: r.rating,
    desc: r.desc,
    images,
    productId: r.productId,
    productName: product?.productName || "",
    family: product ? reviewFamily(product) : "",
    source: r.source || "website",
    createdAt: r.createdAt,
  };
};

export const computePhotoReviews = async () => {
  const recent = await ProductReview.find(PHOTO_REVIEW).sort({ createdAt: -1 }).limit(PHOTO_LIST_MAX)
    .select("productId userName rating desc imageUrl imageUrls source createdAt").lean();
  const products = await Product.find({ productId: { $in: [...new Set(recent.map((r) => r.productId))] } }).select("productId productName productCategory productSubCategory").lean();
  const byId = new Map(products.map((p) => [p.productId, p]));
  const reviews = recent.map((r) => toPhotoReview(r, byId)).filter(Boolean);
  return { count: reviews.length, reviews };
};

export const getPhotoReviews = () => apiCache.handle("photo_reviews", computePhotoReviews);

/** Keep the automatic 200-photo feed intact. Only the homepage feed adds older curated reviews. */
export const getHomePhotoReviews = () => apiCache.handle("photo_reviews_home", async () => {
  const base = await getPhotoReviews();
  const home = await HeroBanner.findOne({ key: "home" }).select("display.reviewPhotos").lean();
  const selectedIds = [...new Set((home?.display?.reviewPhotos || []).map((item) => item.id).filter((id) => /^[a-f0-9]{24}$/i.test(id)))];
  const missingIds = selectedIds.filter((id) => !base.reviews.some((review) => review.id === id));
  if (!missingIds.length) return base;
  const selected = await ProductReview.find({ ...PHOTO_REVIEW, _id: { $in: missingIds } })
    .select("productId userName rating desc imageUrl imageUrls source createdAt").lean();
  const products = await Product.find({ productId: { $in: [...new Set(selected.map((review) => review.productId))] } })
    .select("productId productName productCategory productSubCategory").lean();
  const byId = new Map(products.map((product) => [product.productId, product]));
  const reviews = [...base.reviews, ...selected.map((review) => toPhotoReview(review, byId)).filter(Boolean)];
  return { count: reviews.length, reviews };
});

/** The wall for one product page: only reviews of the same kind of product (see reviewFamily). */
export const getPhotoReviewsFor = async (productId) => {
  const all = await getPhotoReviews();
  const product = await Product.findOne({ productId }).select("productName productCategory productSubCategory").lean();
  if (!product) return { count: 0, reviews: [] };
  const family = reviewFamily(product);
  const reviews = all.reviews.filter((r) => r.family === family);
  return { count: reviews.length, reviews };
};
