import { packCards, stripSheetData } from "../../utils/cardTable.util.js";

const card = (sku) => ({ productId: "p1", sku, price: 100 });
describe("packCards", () => {
  it("sends a repeated card once and refers to it by index", () => {
    const data = { combos: [
      { id: "a", builder: { combos: [{ slots: [{ options: [{ productId: "p1", cards: [card("S1"), card("S2")] }] }] }] } },
      { id: "b", builder: { combos: [{ slots: [{ options: [{ productId: "p1", cards: [card("S2"), card("S3")] }] }] }] } },
    ] };
    const out = packCards(data);
    expect(out.cardTable).toEqual([card("S1"), card("S2"), card("S3")]);
    expect(out.combos[0].builder.combos[0].slots[0].options[0].cardIdx).toEqual([0, 1]);
    expect(out.combos[1].builder.combos[0].slots[0].options[0].cardIdx).toEqual([1, 2]);
    expect(JSON.stringify(out)).not.toContain('"cards"');
  });
  it("leaves non-plain values (ObjectId-like, Date) untouched", () => {
    class Oid { constructor(v) { this.v = v; } toJSON() { return this.v; } }
    const id = new Oid("abc"); const at = new Date(0);
    const out = packCards({ combos: [{ id, at, choices: [{ cards: [card("S1")] }] }] });
    expect(out.combos[0].id).toBe(id);
    expect(out.combos[0].at).toBe(at);
  });
  it("keeps everything else and handles an empty list", () => {
    const out = packCards({ combos: [{ id: "a", choices: [{ label: "x", cards: [] }] }] });
    expect(out.combos[0].choices[0].cardIdx).toEqual([]);
    expect(out.combos[0].id).toBe("a");
  });
});

describe("stripSheetData", () => {
  it("drops option cards and a combo's options, keeps the rest", () => {
    const data = { combos: [{ id: "a", title: "T", options: [{ cards: [card("S1")] }], choices: [{ label: "x", cards: [card("S1")] }],
      builder: { combos: [{ promotionId: "a", reward: { kind: "free" }, slots: [{ options: [{ productId: "p1", label: "L", cards: [card("S1")] }] }] }] } }] };
    const out = stripSheetData(data);
    const c = out.combos[0];
    expect(c.options).toBeUndefined();
    expect(c.builder.combos[0].slots[0].options[0]).toEqual({ productId: "p1", label: "L" });
    expect(c.builder.combos[0].reward).toEqual({ kind: "free" });
    expect(c.choices[0].cards).toEqual([card("S1")]);
    expect(c.title).toBe("T");
  });
});
