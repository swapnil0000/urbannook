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
    const bySlug = Object.fromEntries(res.body.data.filter((c) => c.kind === "category").map((c) => [c.slug, c]));
    expect(Object.keys(bySlug).sort()).toEqual(["anime", "lamp"]);
    expect(bySlug.lamp).toMatchObject({ name: "Lamp", itemCount: 4, indexable: true });
    expect(bySlug.anime).toMatchObject({ itemCount: 1, indexable: false });
    expect(bySlug.anime.image).toBe("anime.webp");
    expect(bySlug.anime.productIds).toBeUndefined();
  });
});

describe("collection pages (series / anime katana)", () => {
  beforeEach(async () => {
    await Product.collection.insertMany([
      { productId: "wood", productName: "Anime Wooden Katana", productDes: "d", productCategory: "Anime", productSubCategory: "katana", isPublished: true,
        variantDetails: [variant("TAN", { variantName: "Tanjiro Wooden Katana" }), variant("ZEN", { variantName: "Zenitsu Wooden Katana" }),
          variant("ENM", { variantName: "Zoro Enma Wooden Katana" }), variant("VER", { variantName: "Vergil Yamato Wooden Katana" })] },
      { productId: "led", productName: "Anime LED Katana", productDes: "d", productCategory: "Anime", productSubCategory: "LedKatana", isPublished: true,
        variantDetails: [variant("LTAN", { variantName: "Tanjiro LED Katana" }), variant("LGIY", { variantName: "Giyu Tomioka LED Katana", isActive: false })] },
      { productId: "stand", productName: "Katana Display Stand", productDes: "d", productCategory: "Anime", productSubCategory: "katana", isPublished: true,
        variantDetails: [variant("STD", { variantName: "Single Katana Sword Display Stand" })] },
    ]);
  });

  it("lists franchise and katana collections next to the categories", async () => {
    const res = await request(app).get("/api/v1/categories").expect(200);
    const bySlug = Object.fromEntries(res.body.data.map((c) => [c.slug, c]));
    expect(bySlug["anime-katana"]).toMatchObject({ kind: "collection", itemCount: 5, indexable: true });
    expect(bySlug["demon-slayer"]).toMatchObject({ kind: "series", itemCount: 3, indexable: true });
    expect(bySlug["video-game-swords"]).toMatchObject({ kind: "game", itemCount: 1, indexable: false });
    expect(bySlug["demon-slayer"].variantSkus).toBeUndefined();
  });

  it("returns only the matching variants of each product", async () => {
    const res = await request(app).get("/api/v1/category/demon-slayer").expect(200);
    const skus = res.body.data.products.flatMap((p) => p.variantDetails.map((v) => v.sku)).sort();
    expect(skus).toEqual(["LTAN", "TAN", "ZEN"]); // no Zoro, no hidden Giyu, no stand
    const katanas = await request(app).get("/api/v1/category/anime-katana").expect(200);
    expect(katanas.body.data.products.map((p) => p.productId).sort()).toEqual(["led", "wood"]); // stand left out
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
