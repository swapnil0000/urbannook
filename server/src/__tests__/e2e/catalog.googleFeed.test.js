import express from "express";
import request from "supertest";
import Product from "../../model/product.model.js";
import catalogRouter from "../../routes/catalog.route.js";
import { errorHandler } from "../../middleware/errorHandler.middleware.js";

const app = express();
app.use("/api/v1", catalogRouter);
app.use(errorHandler);

afterEach(async () => { await Product.deleteMany({}); });

describe("GET /api/v1/catalog/google-feed.tsv", () => {
  it("adds color, material and size columns", async () => {
    await Product.collection.insertMany([
      { productId: "pen", uiProductId: "UN-PEN", productName: "Puffer Jacket Pen Stand", isPublished: true, productStatus: "in_stock",
        specifications: [{ key: "Base Material", value: "PLA/PLA+" }],
        variantDetails: [
          { sku: "PENLAV", variantName: "Lavender Suit Pen Stand", variantPrice: 299, variantImage: ["https://x/a.webp"], variantQuantity: 5, dimensions: { length: 12, breadth: 7.5, height: 11 } },
          { sku: "PENRBW", variantName: "Rainbow Suit Pen Stand", variantPrice: 299, variantImage: ["https://x/b.webp"], variantQuantity: 5 },
        ] },
      { productId: "kat", uiProductId: "UN-KAT", productName: "Anime Wooden Katana", isPublished: true, productStatus: "in_stock",
        specifications: [{ key: "Material", value: "Wood-Core Construction" }],
        variantDetails: [{ sku: "KATTAN", variantName: "Tanjiro Wooden Katana", variantSubTag: "104cm", variantPrice: 1499, variantImage: ["https://x/c.webp"], variantQuantity: 2 }] },
    ]);
    const res = await request(app).get("/api/v1/catalog/google-feed.tsv").expect(200);
    const [head, ...lines] = res.text.split("\n").map((l) => l.split("\t").map((c) => c.replace(/^"|"$/g, "")));
    const row = (id) => Object.fromEntries(head.map((h, i) => [h, lines.find((l) => l[0] === id)[i]]));
    expect(head.slice(-3)).toEqual(["color", "material", "size"]);
    expect(row("PENLAV")).toMatchObject({ color: "Lavender", material: "PLA/PLA+", size: "12 × 7.5 × 11 cm" });
    expect(row("PENRBW")).toMatchObject({ color: "Multicolor", size: "" });
    expect(row("KATTAN")).toMatchObject({ color: "", material: "Wood-Core Construction", size: "104 cm" });
  });
});
