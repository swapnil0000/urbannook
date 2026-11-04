import { describe, it, expect, beforeAll, beforeEach } from "@jest/globals";

// The public stats endpoint used to match lowercase statuses against an UPPERCASE enum and always answered 0.
// (the in-memory MongoDB is connected by src/__tests__/setup.js)
let Order, ProductReview, computeSiteStats;
beforeAll(async () => {
  ({ default: Order } = await import("../../model/order.model.js"));
  ({ default: ProductReview } = await import("../../model/product.specific.testimonial.model.js"));
  ({ computeSiteStats } = await import("../../utils/siteStats.util.js"));
});
beforeEach(async () => { await Order.collection.deleteMany({}); await ProductReview.collection.deleteMany({}); });

describe("computeSiteStats", () => {
  it("counts delivered orders and averages only approved reviews", async () => {
    await Order.collection.insertMany(["DELIVERED", "DELIVERED", "SHIPPED", "CREATED", "CANCELLED"].map((status, i) => ({ orderId: `o${i}`, status })));
    await ProductReview.collection.insertMany([{ rating: 5, isApproved: true }, { rating: 4, isApproved: true }, { rating: 1, isApproved: false }]);
    expect(await computeSiteStats()).toEqual({ totalOrders: 3, ordersDelivered: 2, ratingAvg: 4.5, ratingCount: 2 });
  });
  it("is all zeros on an empty store, never invented numbers", async () => {
    expect(await computeSiteStats()).toEqual({ totalOrders: 0, ordersDelivered: 0, ratingAvg: 0, ratingCount: 0 });
  });
});
