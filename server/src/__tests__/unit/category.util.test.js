import { buildCategories, toCategorySlug, MIN_INDEXABLE_ITEMS } from "../../utils/category.util.js";

const variants = (n) => Array.from({ length: n }, () => ({}));

describe("toCategorySlug", () => {
  it("normalises names and admin slugs to the same hyphenated slug", () => {
    expect(toCategorySlug("Pen Stand")).toBe("pen-stand");
    expect(toCategorySlug("wall_hangings")).toBe("wall-hangings");
    expect(toCategorySlug("  Desk & Lamps! ")).toBe("desk-lamps");
  });
});

describe("buildCategories", () => {
  const docs = [
    { name: "Anime", slug: "anime", categoryId: "CAT-001", displayOrder: 1, image: "a.webp",
      seo: { metaTitle: "Anime Katanas", faqs: [{ question: "Q", answer: "A" }] } },
    { name: "Decor", slug: "decor", categoryId: "CAT-005", displayOrder: 5 },
    { name: "Old", slug: "old", categoryId: "CAT-009", isActive: false },
  ];

  it("gives a page to categories with no admin Category document", () => {
    const [c] = buildCategories([{ productId: "p", productCategory: "Pen Stand", variantDetails: variants(10) }], docs);
    expect(c).toMatchObject({ slug: "pen-stand", name: "Pen Stand", itemCount: 10, indexable: true });
    expect(c.seo).toEqual({ metaTitle: "", metaDescription: "", introContent: "", faqs: [] });
  });

  it("joins admin SEO by categoryId, else by name", () => {
    const out = buildCategories([
      { productId: "a", productCategory: "Anime", categoryId: "CAT-001", variantDetails: variants(4) },
      { productId: "d", productCategory: "decor", variantDetails: variants(1) },
    ], docs);
    expect(out.map((c) => c.slug)).toEqual(["anime", "decor"]);
    expect(out[0].seo.metaTitle).toBe("Anime Katanas");
    expect(out[0].seo.faqs).toHaveLength(1);
    expect(out[0].image).toBe("a.webp");
  });

  it("counts active variants and marks thin categories non-indexable", () => {
    const [c] = buildCategories([
      { productId: "a", productCategory: "Lamp", variantDetails: [{}, {}, { isActive: false }] },
    ]);
    expect(c.itemCount).toBe(2);
    expect(MIN_INDEXABLE_ITEMS).toBe(3);
    expect(c.indexable).toBe(false);
  });

  it("ignores inactive admin categories and products without a category", () => {
    const out = buildCategories([
      { productId: "o", productCategory: "Old", categoryId: "CAT-009", variantDetails: variants(5) },
      { productId: "x", productCategory: "", variantDetails: variants(5) },
    ], docs);
    expect(out).toHaveLength(1);
    expect(out[0].seo.metaTitle).toBe("");
  });
});
