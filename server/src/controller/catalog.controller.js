import Product from "../model/product.model.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";

/**
 * Meta (Facebook) Commerce product catalog feed — CSV, VARIANT-LEVEL.
 *
 * One row per VARIANT (each with its own price + image), grouped under the parent
 * product via `item_group_id`. The Pixel sends `content_ids = productId`, and Meta
 * matches content_ids against either an item's `id` OR its `item_group_id` — so
 * setting item_group_id = productId keeps Dynamic / Advantage+ Catalog retargeting
 * working while still listing every sellable variant.
 *
 * Setup: Meta Commerce Manager → Catalog → Data Sources → Data Feed → "Scheduled
 * feed" → paste this URL → refresh hourly/daily. Meta crawls it server-side.
 */

const DOMAIN = "https://www.urbannook.in";
const BRAND = "UrbanNook";
const CURRENCY = "INR";

// RFC4180 CSV field: wrap in quotes, escape internal quotes, kill newlines.
const csv = (val) =>
  `"${(val == null ? "" : String(val)).replace(/\r?\n/g, " ").replace(/"/g, '""')}"`;

// Strip HTML + collapse whitespace (descriptions may contain markup).
const plain = (val) =>
  (val == null ? "" : String(val)).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

// Catalog needs absolute image URLs.
const absUrl = (img) => {
  if (!img) return "";
  if (/^https?:\/\//i.test(img)) return img;
  return `${DOMAIN}${img.startsWith("/") ? "" : "/"}${img}`;
};

// First available variant image on the product — used as a fallback for a
// variant that has no image of its own.
const productFallbackImage = (p) => {
  const v = (p.variantDetails || []).find(
    (vd) => vd.variantImage && vd.variantImage.length
  );
  return v ? absUrl(v.variantImage[0]) : "";
};

const HEADER = [
  "id",
  "item_group_id",
  "title",
  "description",
  "availability",
  "condition",
  "price",
  "link",
  "image_link",
  "brand",
  "product_type",
];

const metaProductFeed = asyncHandler(async (req, res) => {
  const products = await Product.find({ isPublished: true }).select(
    "productId productName productDes productStatus productCategory variantDetails"
  );

  const rows = [HEADER.join(",")];
  let skipped = 0;

  for (const p of products) {
    if (!p.productId || !p.productName) {
      skipped += 1;
      continue;
    }

    const availability = p.productStatus === "in_stock" ? "in stock" : "out of stock";
    const description = plain(p.productDes) || plain(p.productName);
    const link = `${DOMAIN}/product/${p.productId}`;
    const productType = plain(p.productCategory);
    const fallbackImage = productFallbackImage(p);
    const productName = plain(p.productName);
    const variants = p.variantDetails || [];

    if (!variants.length) {
      skipped += 1;
      continue;
    }

    variants.forEach((v, i) => {
      const price =
        typeof v.variantPrice === "number" && v.variantPrice > 0
          ? v.variantPrice
          : null;
      const image = absUrl(v.variantImage && v.variantImage[0]) || fallbackImage;
      // Meta requires price + image per item — skip the variant if either is missing.
      if (price == null || !image) {
        skipped += 1;
        return;
      }

      // Differentiate the variant in the title; item_group_id (= productId) is what
      // the Pixel's content_ids matches, so retargeting still resolves to this group.
      const vName =
        v.variantName && !/^(n\/a|default)$/i.test(v.variantName.trim())
          ? plain(v.variantName)
          : "";
      const title = vName ? `${productName} - ${vName}` : productName;

      rows.push(
        [
          // Every variant (including the first) gets an id DISTINCT from
          // item_group_id — Meta rejects an item whose own id equals its
          // group id ("ID conflicts with group ID"). Pixel retargeting still
          // resolves fine: Meta matches content_ids against item_group_id
          // too (see file header comment), which is productId for every
          // variant here regardless of this suffix.
          csv(`${p.productId}_${i + 1}`),
          csv(p.productId), // item_group_id — matches Pixel content_ids
          csv(title),
          csv(description),
          csv(availability),
          csv("new"),
          csv(`${price.toFixed(2)} ${CURRENCY}`),
          csv(link),
          csv(image),
          csv(BRAND),
          csv(productType),
        ].join(",")
      );
    });
  }

  console.log(
    `[Catalog] feed: ${rows.length - 1} variant items, ${skipped} skipped (missing price/image)`
  );

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600"); // Meta refetches on schedule
  res.status(200).send(rows.join("\n"));
});

/**
 * Google Merchant Center product feed — TSV, VARIANT-LEVEL.
 *
 * Mirrors the columns of the hand-maintained Google Sheet this replaces, and keeps
 * `id` = variant SKU so Merchant Center treats every row as the SAME item it already
 * has (approval status + performance history are kept when switching sources).
 *
 * Differences from the Meta feed, all required/recommended by Google:
 *  - link points at the variant URL (/product/<id>/<SKU>), so the landing page shows
 *    that variant's price + image (avoids "price mismatch" disapprovals)
 *  - identifier_exists = no (own-brand, no GTIN/MPN — otherwise "Missing GTIN" limits)
 *  - additional_image_link = the variant's other images (max 10)
 *  - availability uses Google's spelling (in_stock / out_of_stock) and per-variant stock
 *
 * Setup: Merchant Center → Data sources → Add product source → "Add products from a
 * file" → "Enter a link to your file" → <API_BASE>/catalog/google-feed.tsv → Daily.
 */
const GOOGLE_BRAND = "Urban Nook";

// TSV field: tabs/newlines would break the row, so flatten them to spaces.
const tsv = (val) => (val == null ? "" : String(val)).replace(/[\t\r\n]+/g, " ").trim();

const GOOGLE_HEADER = [
  "id",
  "title",
  "description",
  "link",
  "image_link",
  "additional_image_link",
  "availability",
  "price",
  "condition",
  "brand",
  "identifier_exists",
  "item_group_id",
  "product_type",
];

const variantInStock = (p, v) =>
  p.productStatus === "in_stock" &&
  !v.variantOutOfStock &&
  !(v.variantQuantity != null && Number(v.variantQuantity) <= 0);

const googleProductFeed = asyncHandler(async (req, res) => {
  const products = await Product.find({ isPublished: true, isAddon: { $ne: true } }).select(
    "productId productName productDes productStatus productCategory productSubCategory variantDetails"
  );

  const rows = [GOOGLE_HEADER.join("\t")];
  let skipped = 0;

  for (const p of products) {
    const variants = p.variantDetails || [];
    if (!p.productId || !p.productName || !variants.length) {
      skipped += 1;
      continue;
    }

    const productName = plain(p.productName);
    const description = plain(p.productDes) || productName;
    const productType = plain(p.productSubCategory) || plain(p.productCategory);
    const fallbackImage = productFallbackImage(p);
    // Single-variant products are standalone items — no item_group_id.
    const groupId = variants.length > 1 ? p.productId : "";

    variants.forEach((v, i) => {
      const price =
        typeof v.variantPrice === "number" && v.variantPrice > 0 ? v.variantPrice : null;
      const images = (v.variantImage || []).map(absUrl).filter(Boolean);
      const image = images[0] || fallbackImage;
      if (price == null || !image) {
        skipped += 1;
        return;
      }

      const sku = (v.sku || "").trim();
      const vName =
        v.variantName && !/^(n\/a|default)$/i.test(v.variantName.trim())
          ? plain(v.variantName)
          : "";

      rows.push(
        [
          sku || `${p.productId}_${i + 1}`,
          vName && !productName.includes(vName) ? `${productName} - ${vName}` : productName,
          description,
          sku ? `${DOMAIN}/product/${p.productId}/${sku}` : `${DOMAIN}/product/${p.productId}`,
          image,
          images.slice(1, 11).join(","),
          variantInStock(p, v) ? "in_stock" : "out_of_stock",
          `${price} ${CURRENCY}`,
          "new",
          GOOGLE_BRAND,
          "no",
          groupId,
          productType,
        ]
          .map(tsv)
          .join("\t")
      );
    });
  }

  console.log(`[Catalog] google feed: ${rows.length - 1} items, ${skipped} skipped`);

  res.setHeader("Content-Type", "text/tab-separated-values; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.status(200).send(rows.join("\n"));
});

export { metaProductFeed, googleProductFeed };
export default { metaProductFeed, googleProductFeed };
