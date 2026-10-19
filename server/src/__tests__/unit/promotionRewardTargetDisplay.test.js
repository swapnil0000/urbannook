import { applyBestPromotionDiscount, buildCartContext, evaluatePromotions, getDiscountCandidatesForItem } from "../../utils/promotionEngine.util.js";
import { buildPromotionDisplayModel } from "../../services/promotionPresentation.service.js";
import { didAddedItemAdvancePromotion, resolveMissingRewardTargets } from "../../controller/promotion.controller.js";
import Product from "../../model/product.model.js";
import Promotion from "../../model/promotion.model.js";
import promotionRouter from "../../routes/promotion.route.js";
import express from "express";
import request from "supertest";

const promotion = {
  _id: "offer-1",
  name: "Configured combo",
  promotionType: "buy_x_get_y",
  conditionTree: { op: "AND", children: [{ field: "productList", items: [{ productId: "trigger-1", variantSku: "" }], minQuantity: 1 }] },
  rewards: [{ type: "percent_off_product", targetProductId: "reward-1", targetVariantSku: "SKU-RED", value: 3, discountAllUnits: true }],
};

function displayFor(items) {
  const ctx = buildCartContext(items);
  const result = evaluatePromotions(items, ctx, [promotion]);
  return { display: buildPromotionDisplayModel(promotion, ctx, { placement: "cart", appliedPromotionIds: new Set(result.matchedPromotions.map((p) => String(p._id))) }), result };
}

test("a configured reward target is pending after only the trigger is added", () => {
  const { display, result } = displayFor([{ productId: "trigger-1", quantity: 1, variantSku: "" }]);
  expect(display.qualifying).toBe(true);
  expect(display.rewardTargetPending).toBe(true);
  expect(display.applied).toBe(false);
  expect(getDiscountCandidatesForItem(result.discountCandidatesByProduct, "reward-1", "SKU-RED")).toHaveLength(1);
});

test("only the exact configured variant completes the reward target", () => {
  const wrong = displayFor([
    { productId: "trigger-1", quantity: 1, variantSku: "" },
    { productId: "reward-1", quantity: 1, variantSku: "SKU-BLUE" },
  ]).display;
  expect(wrong.rewardTargetPending).toBe(true);

  const right = displayFor([
    { productId: "trigger-1", quantity: 1, variantSku: "" },
    { productId: "reward-1", quantity: 1, variantSku: "SKU-RED" },
  ]).display;
  expect(right.rewardTargetPending).toBe(false);
  expect(right.applied).toBe(true);
  const items = [{ productId: "trigger-1", quantity: 1, variantSku: "" }, { productId: "reward-1", quantity: 1, variantSku: "SKU-RED" }];
  const evaluated = evaluatePromotions(items, buildCartContext(items), [promotion]);
  expect(applyBestPromotionDiscount(200, getDiscountCandidatesForItem(evaluated.discountCandidatesByProduct, "reward-1", "SKU-RED"))).toBe(194);
});

test("only an addition that advances the configured condition can open the sheet", () => {
  const empty = buildCartContext([]);
  const trigger = buildCartContext([{ productId: "trigger-1", quantity: 1, variantSku: "" }]);
  const unrelated = buildCartContext([{ productId: "unrelated", quantity: 1, variantSku: "" }]);
  expect(didAddedItemAdvancePromotion(promotion, empty, trigger)).toBe(true);
  expect(didAddedItemAdvancePromotion(promotion, empty, unrelated)).toBe(false);
  expect(didAddedItemAdvancePromotion(promotion, trigger, buildCartContext([
    { productId: "trigger-1", quantity: 1, variantSku: "" },
    { productId: "unrelated", quantity: 1, variantSku: "" },
  ]))).toBe(false);
});

test("quantity and AND/OR conditions advance only when the added item helps", () => {
  const tier = { ...promotion, conditionTree: { field: "productList", items: [{ productId: "trigger-1" }], minQuantity: 3 } };
  const one = buildCartContext([{ productId: "trigger-1", quantity: 1, variantSku: "" }]);
  const two = buildCartContext([{ productId: "trigger-1", quantity: 2, variantSku: "" }]);
  expect(didAddedItemAdvancePromotion(tier, one, two)).toBe(true);
  const and = { ...promotion, conditionTree: { op: "AND", children: [
    { field: "product", productId: "trigger-1", minQuantity: 1 },
    { field: "product", productId: "second", minQuantity: 1 },
  ] } };
  expect(didAddedItemAdvancePromotion(and, one, buildCartContext([
    { productId: "trigger-1", quantity: 1, variantSku: "" }, { productId: "unrelated", quantity: 1, variantSku: "" },
  ]))).toBe(false);
  expect(didAddedItemAdvancePromotion(and, one, buildCartContext([
    { productId: "trigger-1", quantity: 1, variantSku: "" }, { productId: "second", quantity: 1, variantSku: "" },
  ]))).toBe(true);
  const or = { ...promotion, conditionTree: { op: "OR", children: [
    { field: "product", productId: "trigger-1", minQuantity: 1 },
    { field: "product", productId: "second", minQuantity: 1 },
  ] } };
  expect(didAddedItemAdvancePromotion(or, one, buildCartContext([
    { productId: "trigger-1", quantity: 1, variantSku: "" }, { productId: "second", quantity: 1, variantSku: "" },
  ]))).toBe(false);
});

test("recommendations resolve only the configured, available reward variant", async () => {
  await Product.collection.insertMany([
    { productId: "reward-1", uiProductId: "ui-reward-1", productName: "Reward", productStatus: "in_stock", isPublished: true, variantDetails: [
      { variantName: "Blue", sku: "SKU-BLUE", variantPrice: 100, variantQuantity: 2 },
      { variantName: "Red", sku: "SKU-RED", variantPrice: 200, variantQuantity: 2 },
    ] },
    { productId: "unrelated", uiProductId: "ui-unrelated", productName: "Unrelated", productStatus: "in_stock", isPublished: true, variantDetails: [
      { variantName: "Other", sku: "OTHER", variantPrice: 50, variantQuantity: 2 },
    ] },
  ]);
  try {
    const ctx = buildCartContext([{ productId: "trigger-1", quantity: 1, variantSku: "" }]);
    const cards = await resolveMissingRewardTargets(promotion, ctx);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ productId: "reward-1", sku: "SKU-RED", variantName: "Red", price: 200 });
  } finally {
    await Product.deleteMany({ productId: { $in: ["reward-1", "unrelated"] } });
  }
});

test("missing and unavailable reward targets produce no product cards", async () => {
  const ctx = buildCartContext([{ productId: "trigger-1", quantity: 1, variantSku: "" }]);
  expect(await resolveMissingRewardTargets(promotion, ctx)).toEqual([]);
  await Product.collection.insertOne({
    productId: "reward-1", uiProductId: "ui-reward-1", productName: "Reward", productStatus: "in_stock", isPublished: true,
    variantDetails: [{ variantName: "Red", sku: "SKU-RED", variantPrice: 200, variantQuantity: 0 }],
  });
  try {
    expect(await resolveMissingRewardTargets(promotion, ctx)).toEqual([]);
  } finally {
    await Product.deleteMany({ productId: "reward-1" });
  }
});

test("multiple configured variants stay separate cards with the saved benefit", async () => {
  const multi = { ...promotion, rewards: [
    { type: "percent_off_product", targetProductId: "reward-1", targetVariantSku: "SKU-RED", value: 3 },
    { type: "percent_off_product", targetProductId: "reward-1", targetVariantSku: "SKU-BLUE", value: 5 },
  ] };
  await Product.collection.insertOne({
    productId: "reward-1", uiProductId: "ui-reward-1", productName: "Reward", productStatus: "in_stock", isPublished: true,
    variantDetails: [
      { variantName: "Red", sku: "SKU-RED", variantPrice: 200, variantQuantity: 2 },
      { variantName: "Blue", sku: "SKU-BLUE", variantPrice: 250, variantQuantity: 2 },
    ],
  });
  try {
    expect(await resolveMissingRewardTargets(multi, buildCartContext([{ productId: "trigger-1", quantity: 1, variantSku: "" }]))).toEqual([
      expect.objectContaining({ sku: "SKU-RED", benefitText: "3% off" }),
      expect.objectContaining({ sku: "SKU-BLUE", benefitText: "5% off" }),
    ]);
  } finally {
    await Product.deleteMany({ productId: "reward-1" });
  }
});

test("cart display API offers the exact saved reward variant only after the trigger add", async () => {
  const app = express();
  app.use(express.json());
  app.use(promotionRouter);
  const saved = await Promotion.collection.insertOne({
    ...promotion, _id: undefined, isActive: true, startsAt: null, endsAt: null,
    priority: 1, placements: ["cart"], exclusive: true, usageCount: 0,
  });
  await Product.collection.insertMany([
    { productId: "trigger-1", uiProductId: "ui-trigger-1", productName: "Trigger", productStatus: "in_stock", isPublished: true,
      variantDetails: [{ variantName: "Wooden", sku: "TRIGGER", variantPrice: 100, variantQuantity: 2 }] },
    { productId: "reward-1", uiProductId: "ui-reward-1", productName: "Reward", productStatus: "in_stock", isPublished: true,
      variantDetails: [
        { variantName: "Red", sku: "SKU-RED", variantPrice: 200, variantQuantity: 2 },
        { variantName: "Blue", sku: "SKU-BLUE", variantPrice: 220, variantQuantity: 2 },
      ] },
  ]);
  const competing = await Promotion.collection.insertOne({
    ...promotion, _id: undefined, name: "Losing overlap", isActive: true,
    startsAt: null, endsAt: null, priority: 0, placements: ["cart"], exclusive: true,
  });
  try {
    const noOffer = await request(app).post("/promotions/display/cart").send({
      items: [{ productId: "unrelated", quantity: 1 }], subtotal: 50, placement: "cart",
      addedItem: { productId: "unrelated", selectedVariant: "N/A", quantity: 1, previousSubtotal: 0 },
    }).expect(200);
    expect(noOffer.body.data.promotions).toEqual([]);

    const body = { items: [{ productId: "trigger-1", quantity: 1, selectedVariant: "Wooden" }],
      subtotal: 100, placement: "cart", addedItem: { productId: "trigger-1", selectedVariant: "Wooden", quantity: 1, previousSubtotal: 0 } };
    const restoredCart = await request(app).post("/promotions/display/cart").send({ ...body, addedItem: undefined }).expect(200);
    expect(restoredCart.body.data.promotions.find((p) => p.id === String(saved.insertedId)).actionableForAdd).toBe(false);
    const afterTrigger = await request(app).post("/promotions/display/cart").send(body).expect(200);
    const offer = afterTrigger.body.data.promotions.find((p) => p.id === String(saved.insertedId));
    expect(offer).toMatchObject({ actionableForAdd: true, rewardTargetPending: true, applied: false });
    expect(offer.recommendedProducts).toEqual([expect.objectContaining({ productId: "reward-1", sku: "SKU-RED", benefitText: "3% off", price: 200, offerPrice: 194 })]);
    expect(afterTrigger.body.data.pricing.savings).toBe(0);
    const loser = afterTrigger.body.data.promotions.find((p) => p.id === String(competing.insertedId));
    expect(loser.recommendedProducts).toEqual([]);
    expect(loser.applied).toBe(false);

    const unrelatedAdd = await request(app).post("/promotions/display/cart").send({ ...body,
      addedItem: { productId: "reward-1", selectedVariant: "Blue", quantity: 1, previousSubtotal: 100 },
      items: [...body.items, { productId: "reward-1", selectedVariant: "Blue", quantity: 1 }], subtotal: 320,
    }).expect(200);
    const unrelatedOffer = unrelatedAdd.body.data.promotions.find((p) => p.id === String(saved.insertedId));
    expect(unrelatedOffer.actionableForAdd).toBe(false);
    expect(unrelatedOffer.rewardTargetPending).toBe(true);

    const afterTarget = await request(app).post("/promotions/display/cart").send({ ...body,
      addedItem: { productId: "reward-1", selectedVariant: "Red", quantity: 1, previousSubtotal: 100 },
      items: [...body.items, { productId: "reward-1", selectedVariant: "Red", quantity: 1 }], subtotal: 300,
    }).expect(200);
    const applied = afterTarget.body.data.promotions.find((p) => p.id === String(saved.insertedId));
    expect(applied).toMatchObject({ rewardTargetPending: false, applied: true });
    expect(afterTarget.body.data.pricing).toMatchObject({ subtotal: 300, discountedSubtotal: 294, savings: 6 });
    expect(afterTarget.body.data.pricing.lines[1]).toMatchObject({ originalLineTotal: 200, lineTotal: 194, savings: 6 });
    expect(afterTarget.body.data.pricing.savingsByPromotion[String(saved.insertedId)]).toBe(6);
  } finally {
    await Promise.all([
      Promotion.deleteMany({ _id: { $in: [saved.insertedId, competing.insertedId] } }),
      Product.deleteMany({ productId: { $in: ["trigger-1", "reward-1"] } }),
    ]);
  }
});
