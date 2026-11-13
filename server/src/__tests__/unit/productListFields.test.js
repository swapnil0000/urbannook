import { LIST_SELECT, FULL_SELECT, LIST_DROP, VARIANT_DROP } from "../../utils/productListFields.util.js";

describe("product list projection", () => {
  it("drops the page-only fields but keeps what a card needs", () => {
    const parts = LIST_SELECT.split(" ");
    for (const f of LIST_DROP) expect(parts).toContain(`-${f}`);
    for (const f of VARIANT_DROP) expect(parts).toContain(`-variantDetails.${f}`);
    for (const keep of ["productName", "productImg", "variantDetails", "variantImage", "variantPrice", "variantMrp", "tags", "secondaryImages", "createdAt", "priority"]) {
      expect(parts).not.toContain(`-${keep}`);
    }
    expect(parts.slice(0, 3)).toEqual(["-_id", "-updatedAt", "-__v"]);
  });
  it("is an exclusion-only projection (mixing include and exclude is a Mongo error)", () => {
    expect(LIST_SELECT.split(" ").every((p) => p.startsWith("-"))).toBe(true);
    expect(FULL_SELECT).toBe("-_id -updatedAt -__v");
  });
});
