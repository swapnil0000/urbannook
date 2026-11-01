import { allocateLineSegments, createRuleBudgetTracker, withRuleBudget, spendRuleBudget, budgetSpendOrder } from "../../utils/promotionEngine.util.js";

const led = (cap, value = 100) => ({ ruleId: "led", type: "percent_off_product", value, cap });
const wood = (cap, value = 50) => ({ ruleId: "wood", type: "percent_off_product", value, cap });

describe("allocateLineSegments", () => {
  test("single rule keeps the old behaviour: best price on min(qty, cap) units", () => {
    expect(allocateLineSegments(399, 3, [led(2)])).toEqual([
      { ruleId: "led", unitPrice: 0, units: 2, candidates: [led(2)] },
    ]);
  });

  test("two rules from different groups split one line, best price first", () => {
    const segs = allocateLineSegments(399, 2, [wood(1), led(1)]);
    expect(segs.map((s) => [s.ruleId, s.unitPrice, s.units])).toEqual([["led", 0, 1], ["wood", 199, 1]]);
  });

  test("never discounts more units than the line has", () => {
    const segs = allocateLineSegments(399, 1, [led(1), wood(1)]);
    expect(segs.reduce((n, s) => n + s.units, 0)).toBe(1);
    expect(segs[0].ruleId).toBe("led");
  });

  test("no candidates or no saving -> no segments", () => {
    expect(allocateLineSegments(399, 2, [])).toEqual([]);
    expect(allocateLineSegments(399, 2, [{ ruleId: "x", type: "percent_off_product", value: 0, cap: 2 }])).toEqual([]);
  });

  test("shared budgets: a rule spent on one line is not reused on the next", () => {
    const byProduct = new Map([["stand", [led(1), wood(1)]]]);
    const budgets = createRuleBudgetTracker(byProduct);
    const first = allocateLineSegments(399, 1, withRuleBudget([led(1), wood(1)], budgets));
    first.forEach((s) => spendRuleBudget(s.candidates, budgets, s.units));
    const second = allocateLineSegments(449, 1, withRuleBudget([led(1), wood(1)], budgets));
    expect(first.map((s) => s.ruleId)).toEqual(["led"]);
    expect(second.map((s) => [s.ruleId, s.unitPrice])).toEqual([["wood", 224]]);
  });
});

describe("stand limits: unitWeight, maxUnits, spend order", () => {
  const S = { ruleId: "led", type: "percent_off_product", value: 100, cap: 3, variantSku: "S" };
  const D = { ...S, variantSku: "D", maxUnits: 2 };
  const T = { ...S, variantSku: "T", unitWeight: 3 };
  const run = (lines) => {
    const budgets = createRuleBudgetTracker(new Map([["stand", [S, D, T]]]));
    return budgetSpendOrder(lines, (l) => l.price).map(({ item }) => {
      const segs = allocateLineSegments(item.price, item.qty, withRuleBudget([item.c], budgets));
      segs.forEach((s) => spendRuleBudget(s.candidates, budgets, s.units));
      return [item.c.variantSku, segs.reduce((n, s) => n + s.units, 0)];
    });
  };

  test("a Triple uses the whole budget of 3", () => {
    expect(run([{ price: 399, qty: 1, c: S }, { price: 649, qty: 1, c: T }])).toEqual([["T", 1], ["S", 0]]);
    expect(run([{ price: 649, qty: 3, c: T }])).toEqual([["T", 1]]);
  });

  test("at most 2 Doubles, the third katana covers a Single", () => {
    expect(run([{ price: 449, qty: 3, c: D }])).toEqual([["D", 2]]);
    expect(run([{ price: 399, qty: 1, c: S }, { price: 449, qty: 2, c: D }])).toEqual([["D", 2], ["S", 1]]);
  });

  test("same result whatever order the lines are in", () => {
    const a = [{ price: 399, qty: 1, c: S }, { price: 449, qty: 1, c: D }];
    expect(run(a)).toEqual(run([...a].reverse()));
  });
});

describe("rounding: every unit in the customer's favour", () => {
  const W = { ruleId: "wood", type: "percent_off_product", value: 50, cap: 3 };
  test("each Single is 199 (save 200), wherever it sits", () => {
    const segs = allocateLineSegments(399, 3, [W], new Map([["wood", 3]]));
    expect(segs).toEqual([{ ruleId: "wood", unitPrice: 199, units: 3, candidates: [W] }]);
  });
  test("Double + Single = 224 + 199", () => {
    const budgets = new Map([["wood", 3]]);
    expect([449, 399].map((p) => allocateLineSegments(p, 1, [W], budgets)[0].unitPrice)).toEqual([224, 199]);
  });
});

describe("limitWhen: with any Double, at most 1 Single", () => {
  const S = { ruleId: "led", type: "percent_off_product", value: 100, cap: 3, variantSku: "S", limitWhen: { variantSku: "D", maxUnits: 1 } };
  const D = { ...S, variantSku: "D", maxUnits: 2, limitWhen: undefined };
  const run = (lines) => {
    const budgets = createRuleBudgetTracker(new Map([["stand", [S, D]]]));
    return budgetSpendOrder(lines, (l) => l.price).map(({ item }) => {
      const segs = allocateLineSegments(item.price, item.qty, withRuleBudget([item.c], budgets));
      segs.forEach((sg) => spendRuleBudget(sg.candidates, budgets, sg.units));
      return [item.c.variantSku, segs.reduce((n, sg) => n + sg.units, 0)];
    });
  };
  test("3 katanas, 1D + 2S: only D + 1S are discounted", () => {
    expect(run([{ price: 399, qty: 2, c: S }, { price: 449, qty: 1, c: D }])).toEqual([["D", 1], ["S", 1]]);
  });
  test("3 Singles with no Double stay fully discounted", () => {
    expect(run([{ price: 399, qty: 3, c: S }])).toEqual([["S", 3]]);
  });
  test("2D + 1S still allowed", () => {
    expect(run([{ price: 399, qty: 1, c: S }, { price: 449, qty: 2, c: D }])).toEqual([["D", 2], ["S", 1]]);
  });
});
