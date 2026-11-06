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
    { name: "Anime", slug: "anime", categoryId: "CAT-001", displayOrder: 1, image: "a.webp" },
    { name: "Decor", slug: "decor", categoryId: "CAT-005", displayOrder: 5 },
    { name: "Old", slug: "old", categoryId: "CAT-009", isActive: false },
  ];

  it("gives a page to categories with no admin Category document", () => {
    const [c] = buildCategories([{ productId: "p", productCategory: "Pen Stand", variantDetails: variants(10) }], docs);
    expect(c).toMatchObject({ slug: "pen-stand", name: "Pen Stand", itemCount: 10, indexable: true });
    expect(c.image).toBe("");
  });

  it("joins the admin Category by categoryId, else by name", () => {
    const out = buildCategories([
      { productId: "a", productCategory: "Anime", categoryId: "CAT-001", variantDetails: variants(4) },
      { productId: "d", productCategory: "decor", variantDetails: variants(1) },
    ], docs);
    expect(out.map((c) => c.slug)).toEqual(["anime", "decor"]);
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
    expect(out[0].image).toBe("");
  });
});

describe("buildCategories sub-categories", () => {
  const img = (u) => [{ variantImage: [u] }];
  const products = [
    { productId: "a", productCategory: "Anime", productSubCategory: "Katana", variantDetails: [{ variantImage: ["k.webp"] }, {}] },
    { productId: "b", productCategory: "Anime", productSubCategory: "Katana", variantDetails: img("k2.webp") },
    { productId: "c", productCategory: "Anime", productSubCategory: "LED Katana", variantDetails: img("l.webp") },
    { productId: "d", productCategory: "Anime", variantDetails: img("n.webp") },
  ];
  const docs = [{ name: "Anime", slug: "anime", subcategories: [{ name: "LED Katana", slug: "led_katana", displayOrder: 1 }, { name: "Katana", slug: "katana", displayOrder: 2 }] }];

  it("lists sub-categories with counts, photo and the admin order; products without one stay at category level", () => {
    const [c] = buildCategories(products, docs);
    expect(c.subcategories.map((s) => [s.slug, s.name, s.itemCount, s.image])).toEqual([
      ["led-katana", "LED Katana", 1, "l.webp"],
      ["katana", "Katana", 3, "k.webp"],
    ]);
    expect(c.subcategories[1].productIds).toEqual(["a", "b"]);
    expect(c.itemCount).toBe(5);
    expect(c.cover).toBe("k.webp");
  });
  it("has an empty list when no product names a sub-category", () => {
    const [c] = buildCategories([{ productId: "x", productCategory: "Lamp", variantDetails: [{}] }]);
    expect(c.subcategories).toEqual([]);
  });

  it("orders categories like the admin: set orders first, unset (0) after in admin list order, unknown last", () => {
    const pr = (n) => ({ productId: n, productCategory: n, variantDetails: [{}] });
    const out = buildCategories(["Zeta", "Beta", "Alpha", "Gamma", "Other"].map(pr), [
      { name: "Zeta", slug: "zeta", displayOrder: 0 },
      { name: "Beta", slug: "beta", displayOrder: 2 },
      { name: "Alpha", slug: "alpha", displayOrder: 0 },
      { name: "Gamma", slug: "gamma", displayOrder: 1 },
    ]);
    expect(out.map((c) => c.name)).toEqual(["Gamma", "Beta", "Zeta", "Alpha", "Other"]);
  });

  it("follows the admin category by categoryId even when the product's category text is stale or empty", () => {
    const out = buildCategories(
      [{ productId: "a", categoryId: "CAT-009", productCategory: "Old Name", variantDetails: [{}] }, { productId: "b", categoryId: "CAT-009", variantDetails: [{}] }],
      [{ name: "My Custom", slug: "my_custom", categoryId: "CAT-009", displayOrder: 1 }],
    );
    expect(out.map((c) => [c.slug, c.name, c.itemCount])).toEqual([["my-custom", "My Custom", 2]]);
  });
});
