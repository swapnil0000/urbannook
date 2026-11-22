import { toPhotoReview, reviewFamily } from "../../utils/photoReviews.util.js";

describe("toPhotoReview", () => {
  const base = { _id: "r1", userName: "Aryan", rating: 5, desc: "Love it", productId: "p1", createdAt: "2026-01-01", userId: "secret" };
  it("uses imageUrls, falls back to the legacy imageUrl, and never leaks the userId", () => {
    const a = toPhotoReview({ ...base, imageUrls: ["a.webp", "b.webp"], source: "google" }, new Map([["p1", { productName: "Lamp", productCategory: "Lamp", productSubCategory: "Brake Caliper Lamp" }]]));
    expect(a.images).toEqual(["a.webp", "b.webp"]);
    expect(a.productName).toBe("Lamp");
    expect(a.family).toBe("lamp");
    expect(a.source).toBe("google");
    expect(a.userId).toBeUndefined();
    expect(toPhotoReview({ ...base, imageUrl: "x.webp" }).images).toEqual(["x.webp"]);
  });
  it("is null without a photo", () => {
    expect(toPhotoReview({ ...base, imageUrls: [], imageUrl: "" })).toBeNull();
  });
});

describe("reviewFamily", () => {
  it("puts every katana together, every lamp together, the rest by sub-category", () => {
    expect(reviewFamily({ productCategory: "Anime", productSubCategory: "katana" })).toBe("katana");
    expect(reviewFamily({ productCategory: "Anime", productSubCategory: "LedKatana" })).toBe("katana");
    expect(reviewFamily({ productCategory: "Lamp", productSubCategory: "Mountain Lamp" })).toBe("lamp");
    expect(reviewFamily({ productCategory: "Anime", productSubCategory: "Kunai" })).toBe("kunai");
    expect(reviewFamily({ productCategory: "Decor" })).toBe("decor");
  });
});
