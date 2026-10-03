import express from "express";
import request from "supertest";
import SeoPage from "../../model/seoPage.model.js";
import seoRouter from "../../routes/seo.route.js";
import { errorHandler } from "../../middleware/errorHandler.middleware.js";
import { apiCache } from "../../module/cache.manager.module.js";
import { normalizeSeoPath } from "../../utils/seoPath.js";

const app = express();
app.use("/api/v1", seoRouter);
app.use(errorHandler);

beforeEach(async () => {
  apiCache.clear();
  await SeoPage.collection.insertMany([
    { urlPath: "/category/anime", isActive: true, metaTitle: "Anime Katanas | UrbanNook", robots: "default",
      faqs: [{ question: "Q?", answer: "A." }], updatedBy: "admin@x" },
    { urlPath: "/about-us", isActive: false, metaTitle: "Off" },
  ]);
});
afterEach(() => SeoPage.deleteMany({}));

describe("normalizeSeoPath", () => {
  it("maps URL variants to one key", () => {
    expect(normalizeSeoPath("https://www.urbannook.in/Category/Anime/?utm=x#top")).toBe("/category/anime");
    expect(normalizeSeoPath("category//anime")).toBe("/category/anime");
    expect(normalizeSeoPath("")).toBe("/");
    expect(normalizeSeoPath("/")).toBe("/");
  });
});

describe("GET /api/v1/seo", () => {
  it("returns the active entry for a path, matching any URL variant", async () => {
    const res = await request(app).get("/api/v1/seo").query({ path: "/Category/Anime/" }).expect(200);
    expect(res.body.data).toMatchObject({ urlPath: "/category/anime", metaTitle: "Anime Katanas | UrbanNook" });
    expect(res.body.data.faqs).toHaveLength(1);
    expect(res.body.data.updatedBy).toBeUndefined();
    expect(res.body.data._id).toBeUndefined();
  });

  it("returns null for a path without an entry, or with an inactive one", async () => {
    expect((await request(app).get("/api/v1/seo").query({ path: "/nothing" }).expect(200)).body.data).toBeNull();
    expect((await request(app).get("/api/v1/seo").query({ path: "/about-us" }).expect(200)).body.data).toBeNull();
  });
});
