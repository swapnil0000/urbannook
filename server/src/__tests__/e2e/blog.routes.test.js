import express from "express";
import request from "supertest";
import BlogPost from "../../model/blogPost.model.js";
import Product from "../../model/product.model.js";
import blogRouter from "../../routes/blog.route.js";
import { errorHandler } from "../../middleware/errorHandler.middleware.js";
import { apiCache } from "../../module/cache.manager.module.js";

const app = express();
app.use("/api/v1", blogRouter);
app.use(errorHandler);

beforeEach(async () => {
  apiCache.clear();
  await BlogPost.collection.insertMany([
    { slug: "zoro-swords", title: "Zoro's swords", status: "published", publishedAt: new Date("2026-10-01"), productIds: ["p1", "p2"],
      contentHtml: '<h2>Wado</h2><p onclick="x">Kuina<script>alert(1)</script></p><img src="http://x/a.webp">', updatedBy: "admin@x" },
    { slug: "older", title: "Older", status: "published", publishedAt: new Date("2026-09-01"), productIds: ["p2"], contentHtml: "<p>x</p>" },
    { slug: "draft-post", title: "Draft", status: "draft", productIds: ["p1"], contentHtml: "<p>secret</p>" },
  ]);
  await Product.collection.insertMany([
    { productId: "p1", uiProductId: "UN-P1", productName: "Wooden Katana", isPublished: true, variantDetails: [] },
    { productId: "p2", uiProductId: "UN-P2", productName: "LED Katana", isPublished: true, variantDetails: [] },
  ]);
});
afterEach(async () => { await BlogPost.deleteMany({}); await Product.deleteMany({}); });

describe("GET /api/v1/blog", () => {
  it("lists only published posts, newest first, without bodies", async () => {
    const res = await request(app).get("/api/v1/blog").expect(200);
    expect(res.body.data.map((p) => p.slug)).toEqual(["zoro-swords", "older"]);
    expect(res.body.data[0].contentHtml).toBeUndefined();
  });

  it("filters by linked product", async () => {
    const res = await request(app).get("/api/v1/blog").query({ product: "p1" }).expect(200);
    expect(res.body.data.map((p) => p.slug)).toEqual(["zoro-swords"]);
  });

  it("picks the post for a variant SKU, else the product's general posts", async () => {
    await BlogPost.collection.insertMany([
      { slug: "tanjiro", title: "Tanjiro", status: "published", publishedAt: new Date("2026-10-05"), productIds: ["p1"], skus: ["TANS"], contentHtml: "<p>x</p>" },
      { slug: "rengoku", title: "Rengoku", status: "published", publishedAt: new Date("2026-10-06"), productIds: ["p1"], skus: ["RENS"], contentHtml: "<p>x</p>" },
    ]);
    const slugs = async (q) => (await request(app).get("/api/v1/blog").query(q).expect(200)).body.data.map((p) => p.slug);
    expect(await slugs({ product: "p1", sku: "tans", limit: 1 })).toEqual(["tanjiro"]);
    expect(await slugs({ product: "p1", sku: "ZENS", limit: 1 })).toEqual(["zoro-swords"]); // no post for Zenitsu → general
    expect(await slugs({ product: "p1" })).toEqual(["zoro-swords"]); // character posts never on the base page
  });
});

describe("GET /api/v1/blog/:slug", () => {
  it("returns a sanitised post with its products in the post's order", async () => {
    const res = await request(app).get("/api/v1/blog/zoro-swords").expect(200);
    const html = res.body.data.contentHtml;
    expect(html).toContain("<h2>Wado</h2>");
    expect(html).not.toMatch(/script|onclick|http:\/\//);
    expect(res.body.data.products.map((p) => p.productId)).toEqual(["p1", "p2"]);
    expect(res.body.data.updatedBy).toBeUndefined();
  });

  it("404s for drafts and unknown slugs", async () => {
    await request(app).get("/api/v1/blog/draft-post").expect(404);
    await request(app).get("/api/v1/blog/nope").expect(404);
  });
});
