import { ApiRes } from "../utils/index.js";
import BlogPost from "../model/blogPost.model.js";
import Product from "../model/product.model.js";
import ProductReview from "../model/product.specific.testimonial.model.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { NotFoundError } from "../utils/errors.js";
import { apiCache } from "../module/cache.manager.module.js";
import { cleanBlogHtml, youtubeId } from "../utils/blogHtml.js";
import { SERIES, seriesOf } from "../utils/series.util.js";

// The franchise a post is about (Demon Slayer, One Piece, … or a video game),
// from its title, else its tags — the same table as the /category/<series>
// collection pages, so a post links to its series page and shows under it.
// Posts about no single franchise (gift guides, lamps, desk decor) get null.
const postSeries = (post) => {
  const s = seriesOf(post.title) || seriesOf((post.tags || []).join(" "));
  return s ? { slug: s.slug, name: s.name, kind: s.kind } : null;
};

// Published blog posts (Admin → Blog). Behind the same 10-min API cache as the
// product endpoints (System Guide §7). Bodies are sanitised again here.
const LIST_FIELDS = "-_id slug title excerpt coverImage coverAlt tags productIds skus author publishedAt updatedAt readingMinutes";
const PRODUCT_FIELDS = "-_id productId productName productCategory variantDetails tags isPublished";

// Posts with no SKUs are about the whole product (e.g. a buying guide).
const NO_SKUS = { $or: [{ skus: { $exists: false } }, { skus: { $size: 0 } }] };

// GET /blog?product=<productId>&sku=<SKU>&series=<slug>&limit= — newest first,
// each post with its `series` (see postSeries). With series: only that
// franchise's posts (the "stories" row on /category/<series>).
// With sku: posts linked to that variant; if there are none, the product's
// general posts. With product only: the product's general posts, so a
// character's story never shows on another character's page.
const listBlogPosts = asyncHandler(async (req, res) => {
  const product = /^[a-zA-Z0-9_-]{1,64}$/.test(String(req.query.product || "")) ? String(req.query.product) : null;
  const sku = /^[a-zA-Z0-9_-]{1,40}$/.test(String(req.query.sku || "")) ? String(req.query.sku).toUpperCase() : null;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
  // A series filter for a page that is no franchise (/category/decor) → no posts.
  const series = req.query.series === undefined ? null : String(req.query.series).slice(0, 40);
  const find = (filter) => BlogPost.find({ status: "published", ...filter })
    .select(LIST_FIELDS).sort({ publishedAt: -1 }).limit(limit).lean();
  const data = await apiCache.handle({ route: "blog:list", product, sku, series, limit }, async () => {
    const withSeries = (posts) => posts.map((p) => ({ ...p, series: postSeries(p) }));
    if (series !== null) {
      if (!SERIES.some((s) => s.slug === series)) return [];
      // Few posts in all: read them all, keep this franchise's, newest first.
      const all = withSeries(await BlogPost.find({ status: "published" }).select(LIST_FIELDS).sort({ publishedAt: -1 }).lean());
      return all.filter((p) => p.series?.slug === series).slice(0, limit);
    }
    if (sku) {
      const forSku = await find({ skus: sku });
      if (forSku.length || !product) return withSeries(forSku);
    }
    return withSeries(await find(product ? { productIds: product, ...NO_SKUS } : {}));
  });
  return res.status(200).json(new ApiRes(200, "Blog posts", data, true));
});

// GET /blog/:slug — one published post with its linked products, a YouTube
// id (videoUrl) and up to 8 approved customer reviews with photos for those
// products (first name only).
const blogPostDetails = asyncHandler(async (req, res) => {
  const slug = String(req.params.slug || "").toLowerCase().slice(0, 100);
  const data = await apiCache.handle({ route: "blog:post", slug }, async () => {
    const post = await BlogPost.findOne({ slug, status: "published" }).select("-_id -__v -updatedBy").lean();
    if (!post) return null;
    const products = post.productIds?.length
      ? await Product.find({ productId: { $in: post.productIds }, isPublished: true }).select(PRODUCT_FIELDS).lean()
      : [];
    const reviews = post.productIds?.length
      ? await ProductReview.find({
          productId: { $in: post.productIds }, isApproved: true,
          $or: [{ "imageUrls.0": { $exists: true } }, { imageUrl: { $nin: [null, ""] } }],
        }).select("-_id productId userName rating desc imageUrl imageUrls createdAt").sort({ rating: -1, createdAt: -1 }).limit(8).lean()
      : [];
    const order = new Map(post.productIds.map((id, i) => [id, i]));
    return {
      ...post,
      videoId: youtubeId(post.videoUrl) || null,
      series: postSeries(post),
      reviews: reviews.map((r) => ({
        productId: r.productId,
        name: String(r.userName || "").trim().split(/\s+/)[0] || "Customer",
        rating: r.rating,
        text: r.desc,
        images: (r.imageUrls?.length ? r.imageUrls : [r.imageUrl]).filter((u) => /^https:\/\//.test(u || "")).slice(0, 3),
      })).filter((r) => r.images.length),
      contentHtml: cleanBlogHtml(post.contentHtml || ""),
      products: products.sort((a, b) => order.get(a.productId) - order.get(b.productId)),
    };
  });
  if (!data) throw new NotFoundError("Post doesn't exist");
  return res.status(200).json(new ApiRes(200, "Blog post", data, true));
});

export { listBlogPosts, blogPostDetails };
