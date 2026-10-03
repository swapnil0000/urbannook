import express from "express";
import request from "supertest";
import Product from "../../model/product.model.js";
import Category from "../../model/category.model.js";
import categoryRouter from "../../routes/category.route.js";
import { errorHandler } from "../../middleware/errorHandler.middleware.js";
import { apiCache } from "../../module/cache.manager.module.js";

const app = express();
app.use("/api/v1", categoryRouter);
app.use(errorHandler);

const variant = (sku, extra = {}) => ({ variantName: sku, sku, variantPrice: 999, variantImage: ["x.webp"], ...extra });

beforeEach(async () => {
  apiCache.clear();
  await Product.collection.insertMany([
    { productId: "lamp", productName: "Brake Caliper Lamp", productDes: "d", productCategory: "Lamp", isPublished: true,
      variantDetails: [variant("BMW"), variant("FER"), variant("LAM"), variant("POR")] },
    { productId: "kat", productName: "Wooden Katana", productDes: "d", productCategory: "Anime", categoryId: "CAT-001", isPublished: true,
      variantDetails: [variant("ZORO"), variant("OLD", { isActive: false })] },
    { productId: "draft", productName: "Draft", productDes: "d", productCategory: "Anime", isPublished: false, variantDetails: [variant("D")] },
    { productId: "wrap", productName: "Gift Wrap", productDes: "d", productCategory: "Addon", isPublished: true, isAddon: true, variantDetails: [variant("W")] },
  ]);
  await Category.collection.insertOne({
    name: "Anime", slug: "anime", categoryId: "CAT-001", displayOrder: 1, isActive: true, image: "anime.webp",
  });
});

afterEach(async () => {
  await Product.deleteMany({});
  await Category.deleteMany({});
});

describe("GET /api/v1/categories", () => {
  it("lists categories of published, non-addon products with the admin Category joined", async () => {
    const res = await request(app).get("/api/v1/categories").expect(200);
    const bySlug = Object.fromEntries(res.body.data.map((c) => [c.slug, c]));
    expect(Object.keys(bySlug).sort()).toEqual(["anime", "lamp"]);
    expect(bySlug.lamp).toMatchObject({ name: "Lamp", itemCount: 4, indexable: true });
    expect(bySlug.anime).toMatchObject({ itemCount: 1, indexable: false });
    expect(bySlug.anime.image).toBe("anime.webp");
    expect(bySlug.anime.productIds).toBeUndefined();
  });
});

describe("GET /api/v1/category/:slug", () => {
  it("returns the category with its products", async () => {
    const res = await request(app).get("/api/v1/category/lamp").expect(200);
    expect(res.body.data.name).toBe("Lamp");
    expect(res.body.data.products.map((p) => p.productId)).toEqual(["lamp"]);
  });

  it("returns 404 for an unknown category", async () => {
    await request(app).get("/api/v1/category/nope").expect(404);
  });
});
