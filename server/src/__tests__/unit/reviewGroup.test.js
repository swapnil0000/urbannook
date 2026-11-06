import { poolGroupReviews } from "../../services/testimonial.service.js";

const WOODEN = "wooden-katana";
const LED = "led-katana";
const r = (id, productId, createdAt, extra = {}) => ({ _id: id, productId, createdAt, rating: 5, ...extra });

describe("poolGroupReviews", () => {
  const related = new Map([[WOODEN, "Anime Wooden Katana"]]);

  it("puts the product's own reviews first, then its siblings', each newest first", () => {
    const out = poolGroupReviews(LED, [
      r("w-old", WOODEN, "2026-09-01"),
      r("l-old", LED, "2026-09-02"),
      r("w-new", WOODEN, "2026-10-20"),
      r("l-new", LED, "2026-10-01"),
    ], related);
    expect(out.map((x) => x._id)).toEqual(["l-new", "l-old", "w-new", "w-old"]);
  });

  it("labels a sibling's review with its product name, keeping an existing variant label", () => {
    const out = poolGroupReviews(LED, [
      r("w1", WOODEN, "2026-10-01"),
      r("w2", WOODEN, "2026-10-02", { variant: "Zoro Enma Wooden Katana" }),
    ], related);
    expect(out.find((x) => x._id === "w1")).toMatchObject({ variant: "Anime Wooden Katana", fromRelatedProduct: true });
    expect(out.find((x) => x._id === "w2").variant).toBe("Zoro Enma Wooden Katana");
  });

  it("never pools reviews of products outside the group", () => {
    const out = poolGroupReviews(LED, [r("x", "brake-caliper-lamp", "2026-10-01"), r("l", LED, "2026-10-02")], related);
    expect(out.map((x) => x._id)).toEqual(["l"]);
  });

  it("leaves a product without a group exactly as before", () => {
    const out = poolGroupReviews(LED, [r("a", LED, "2026-10-01"), r("b", LED, "2026-10-03")]);
    expect(out.map((x) => x._id)).toEqual(["b", "a"]);
    expect(out.every((x) => !x.fromRelatedProduct)).toBe(true);
  });
});
