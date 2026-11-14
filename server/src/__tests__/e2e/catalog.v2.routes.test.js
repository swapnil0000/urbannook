import express from "express";
import request from "supertest";
import Product from "../../model/product.model.js";
import Category from "../../model/category.model.js";
import v2Router from "../../routes/v2/index.js";
import productRouter from "../../routes/v1-deprecated/product.route.js";
import { errorHandler } from "../../middleware/errorHandler.middleware.js";
import { apiCache } from "../../module/cache.manager.module.js";

const app = express();
app.use("/api/v1", productRouter);
app.use("/api/v2", v2Router);
app.use(errorHandler);

const variant = (sku, extra = {}) => ({
  variantName: sku, sku, variantPrice: 999, variantImage: [`${sku}-1.webp`, `${sku}-2.webp`],
  variantDes: "long variant text", specifications: [{ key: "k", value: "v" }], ...extra,
});

beforeEach(async () => {
  apiCache.clear();
  await Product.collection.insertMany([
    { productId: "lamp", uiProductId: "u1", productName: "Lamp", productDes: "long description", materialAndCare: "care",
      productCategory: "Lamp", isPublished: true, tags: ["featured"], recommendedProducts: ["kat"],
      variantDetails: [variant("A"), variant("B")] },
    { productId: "kat", uiProductId: "u2", productName: "Katana", productDes: "long description", productCategory: "Anime",
      isPublished: true, variantDetails: [variant("K")] },
    { productId: "draft", uiProductId: "u3", productName: "Draft", productDes: "d", productCategory: "Anime",
      isPublished: false, variantDetails: [variant("D")] },
  ]);
  await Category.collection.insertOne({ name: "Anime", slug: "anime", categoryId: "CAT-001", displayOrder: 1, isActive: true });
});

afterEach(async () => {
  await Product.deleteMany({});
  await Category.deleteMany({});
});

describe("GET /api/v2/catalog/products", () => {
  it("returns slim cards in the v2 envelope with pagination meta", async () => {
    const res = await request(app).get("/api/v2/catalog/products?page=1&limit=24").expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.map((p) => p.productId).sort()).toEqual(["kat", "lamp"]);
    const lamp = res.body.data.find((p) => p.productId === "lamp");
    expect(lamp.productDes).toBeUndefined();
    expect(lamp.materialAndCare).toBeUndefined();
    expect(lamp.variantDetails[0].variantDes).toBeUndefined();
    expect(lamp.variantDetails[0].variantImage).toHaveLength(2); // first variant keeps gallery
    expect(lamp.variantDetails[1].variantImage).toHaveLength(1);
    expect(res.body.meta.pagination).toMatchObject({ page: 1, limit: 24, count: 2, total: 2, totalPages: 1 });
  });

  it("caps the page size and returns [] (not null) when empty", async () => {
    const big = await request(app).get("/api/v2/catalog/products?limit=5000").expect(200);
    expect(big.body.meta.pagination.limit).toBe(48);
    const empty = await request(app).get("/api/v2/catalog/products?category=nothing").expect(200);
    expect(empty.body.data).toEqual([]);
  });

  it("filters featured", async () => {
    const res = await request(app).get("/api/v2/catalog/products?featured=true").expect(200);
    expect(res.body.data.map((p) => p.productId)).toEqual(["lamp"]);
  });
});

describe("GET /api/v2/catalog/products/:productId", () => {
  it("returns the full product with recommended products as cards", async () => {
    const res = await request(app).get("/api/v2/catalog/products/lamp").expect(200);
    expect(res.body.data.productDes).toBe("long description");
    expect(res.body.data.recommendedProductsDetails[0].productId).toBe("kat");
    expect(res.body.data.recommendedProductsDetails[0].productDes).toBeUndefined();
  });

  it("returns a v2 error body for an unknown product", async () => {
    const res = await request(app).get("/api/v2/catalog/products/draft").expect(404);
    expect(res.body).toMatchObject({ success: false, data: null, error: { code: "NOT_FOUND" } });
  });

  it("does not read by-tag as a product id", async () => {
    const res = await request(app).get("/api/v2/catalog/products/by-tag").expect(200);
    expect(res.body.data.featured[0].productId).toBe("lamp");
  });
});

describe("GET /api/v2/catalog/categories", () => {
  it("lists categories and returns one category with card products", async () => {
    const list = await request(app).get("/api/v2/catalog/categories").expect(200);
    expect(list.body.data.some((c) => c.slug === "anime")).toBe(true);
    const one = await request(app).get("/api/v2/catalog/categories/anime").expect(200);
    expect(one.body.data.products.map((p) => p.productId)).toEqual(["kat"]);
    expect(one.body.data.products[0].productDes).toBeUndefined();
  });
});

describe("v1 stays, marked deprecated", () => {
  it("keeps the v1 shape and sends Deprecation + successor Link headers", async () => {
    const res = await request(app).get("/api/v1/products?limit=24").expect(200);
    expect(res.headers.deprecation).toBe("true");
    expect(res.headers.link).toContain("/api/v2/catalog/products");
    expect(res.body.data.listofPublishedProducts).toHaveLength(2);
    expect(res.body.data.listofPublishedProducts[0].productDes).toBe("long description");
    expect(res.body.data.pagination).toMatchObject({ NolistofPublishedProducts: 2, currentPage: 1, totalProducts: 2, totalPages: 1 });
  });

  it("keeps v1 empty-list body (data: null) and v1 detail / homepage shapes", async () => {
    const empty = await request(app).get("/api/v1/products?category=nothing").expect(200);
    expect(empty.body).toMatchObject({ statusCode: 200, message: "No Published Product found", data: null, success: true });
    const one = await request(app).get("/api/v1/product/lamp").expect(200);
    expect(one.body.message).toBe("Product Details");
    expect(one.body.data.recommendedProductsDetails[0].productDes).toBe("long description");
    const tags = await request(app).get("/api/v1/products/homepage").expect(200);
    expect(tags.body.data.featured[0].productId).toBe("lamp");
  });
});
