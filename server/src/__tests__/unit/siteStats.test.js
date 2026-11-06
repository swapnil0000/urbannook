import { describe, it, expect, beforeAll, beforeEach } from "@jest/globals";

// The public stats endpoint used to match lowercase statuses against an UPPERCASE enum and always answered 0.
// (the in-memory MongoDB is connected by src/__tests__/setup.js)
let Order, ProductReview, Product, computeSiteStats, computeGoogleReviews;
beforeAll(async () => {
  ({ default: Order } = await import("../../model/order.model.js"));
  ({ default: ProductReview } = await import("../../model/product.specific.testimonial.model.js"));
  ({ default: Product } = await import("../../model/product.model.js"));
  ({ computeSiteStats, computeGoogleReviews } = await import("../../utils/siteStats.util.js"));
});
beforeEach(async () => { await Order.collection.deleteMany({}); await ProductReview.collection.deleteMany({}); await Product.collection.deleteMany({}); });

describe("computeSiteStats", () => {
  it("counts delivered orders and averages only approved reviews", async () => {
    await Order.collection.insertMany(["DELIVERED", "DELIVERED", "SHIPPED", "CREATED", "CANCELLED"].map((status, i) => ({ orderId: `o${i}`, status })));
    await ProductReview.collection.insertMany([{ rating: 5, isApproved: true }, { rating: 4, isApproved: true }, { rating: 1, isApproved: false }]);
    expect(await computeSiteStats()).toEqual({ totalOrders: 3, ordersDelivered: 2, ratingAvg: 4.5, ratingCount: 2, googleReviewCount: 0 });
  });
  it("is all zeros on an empty store, never invented numbers", async () => {
    expect(await computeSiteStats()).toEqual({ totalOrders: 0, ordersDelivered: 0, ratingAvg: 0, ratingCount: 0, googleReviewCount: 0 });
  });
});

describe("Google reviews", () => {
  const base = { productId: "P1", desc: "Lovely lamp, great finish", isApproved: true };
  it("lists only approved Google reviews (source or google: id), newest first, without the userId", async () => {
    await Product.collection.insertOne({ productId: "P1", productName: "Brake Caliper Lamp" });
    await ProductReview.collection.insertMany([
      { ...base, userId: "google:a", userName: "Asha K", rating: 5, imageUrls: ["https://cdn/x.webp"], createdAt: new Date("2026-10-01") },
      { ...base, userId: "u2", source: "google", userName: "Ravi", rating: 4, imageUrl: "https://cdn/y.webp", createdAt: new Date("2026-10-05") },
      { ...base, userId: "google:c", userName: "Hidden", rating: 5, isApproved: false },
      { ...base, userId: "u4", source: "website", userName: "Site user", rating: 5 },
    ]);
    const out = await computeGoogleReviews();
    expect(out.count).toBe(2);
    expect(out.average).toBe(4.5);
    expect(out.reviews.map((r) => r.userName)).toEqual(["Ravi", "Asha K"]);
    expect(out.reviews[0].images).toEqual(["https://cdn/y.webp"]);
    expect(out.reviews[1]).toMatchObject({ productName: "Brake Caliper Lamp", images: ["https://cdn/x.webp"] });
    expect(JSON.stringify(out)).not.toMatch(/google:a|userId/);
    expect((await computeSiteStats()).googleReviewCount).toBe(2);
  });
  it("is empty, never invented, when there are none", async () => {
    expect(await computeGoogleReviews()).toEqual({ count: 0, average: 0, reviews: [] });
  });
});
