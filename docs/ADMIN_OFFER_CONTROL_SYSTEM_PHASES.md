# Admin Offer Control System — Phased Build Plan

Covers the remaining scope from the "build a complete admin offer control
system" request (sections 2, 5, 6) that the two audit rounds confirmed
genuinely absent. Each phase is independently shippable (own schema/engine/
admin-UI slice, own tests, own verification pass) so work can stop between
phases without leaving anything half-wired. Living doc — update in place.

**Status key:** ⬜ not started · 🔶 in progress · ✅ done

## Ordering rationale

Phases 1–2 are foundational (every later phase either depends on them or
becomes meaningfully safer once they exist). Phases are ordered by
(how many other asks it unblocks) × (risk of leaving it half-done), not by
the order they appeared in the spec.

---

## Phase 1 — Quantity model: operators + distinct-count ⬜

**Unblocks:** min/max/exact/range quantity (ask #2), quantity tiers
(Phase 3 depends on this), "3 different products" vs "3 units of one"
(ask #2).

- [ ] `conditionTree` leaf schema (both repos' `promotion.model.js`, or
      validated at the admin controller layer same as today): `product`/
      `category`/`subcategory`/`tag` leaves gain an `operator` field
      (`gte`|`lte`|`eq`|`between`), matching the vocabulary
      `cartSubtotal`/`cartQuantity`/`orderCount` already use. `between`
      needs a `maxQuantity` alongside existing `minQuantity`/`value`.
      Default `operator: "gte"` when absent — every existing promotion's
      leaf (no operator today) behaves identically.
- [ ] `promotionEngine.util.js`'s `evaluateLeaf` — `product`/taxonomy cases
      use `compareOp`-style logic instead of a bare `>=`. `compareOp`
      already exists (`cartSubtotal`/`cartQuantity`); extend it (or add a
      sibling) to handle `between`.
- [ ] New leaf capability: **distinct-product count**. Today `qtyMatching
      Taxonomy` sums quantity across matching products; add a sibling
      `distinctMatchingTaxonomy` (counts unique productIds with qty > 0
      matching the taxonomy value) and a leaf flag (e.g. `countMode:
      "units"|"distinct"`, default `"units"` — unchanged behavior) so "any
      3 DIFFERENT products from category X" becomes expressible.
- [ ] `promotionRepeatCount` (drives `cap`/tier resolution) needs the same
      operator-awareness for `between`/`eq` conditions — a `between 2-4`
      condition shouldn't repeat infinitely past 4.
- [ ] Admin `ConditionGroup.jsx` — extend the product/category/subcategory/
      tag leaf UI with an operator select (reuse the exact UI already built
      for cartSubtotal/cartQuantity/orderCount) + a distinct-vs-units toggle
      + a second number input for `between`.
- [ ] Admin `promotionEvaluator.js` (live simulator) — mirror the same
      operator/distinct-count logic so the preview doesn't silently
      disagree with the real engine on these new leaf shapes.
- [ ] Tests: operator variants (gte/lte/eq/between) on a product leaf;
      distinct-count vs units-count on the same cart; `promotionRepeatCount`
      bounded correctly under `between`.

## Phase 2 — Exclusion (NOT) ⬜

**Unblocks:** "category-wide EXCEPT these products/variants" (ask #2).

- [ ] `conditionTree` gains a `NOT` op alongside `AND`/`OR` — wraps exactly
      one child, inverts its result. Minimal grammar change (one more
      `op` value), not a new node shape.
- [ ] `evaluateConditionTree` — one new branch:
      `node.op === "NOT" ? !evaluateConditionTree(node.children[0], ctx) : ...`
- [ ] `targetScope` gains an optional `excludeProductIds: [String]` so a
      category-wide REWARD can skip specific products within the matched
      category (distinct from condition-level NOT, which gates whether the
      promotion matches at all — reward-level exclusion gates which
      resolved productIds actually get the discount). Both are genuinely
      different asks in the spec ("exclusion" appears under both conditions
      and targets) and deserve both mechanisms, not one overloaded one.
- [ ] `resolveRewardTargetProductIds` — filter out `excludeProductIds`
      after resolving the scope.
- [ ] Admin `ConditionGroup.jsx` — a NOT toggle on any group (not leaf —
      NOT wraps a whole AND/OR subtree cleanly, matches how admins already
      think in groups).
- [ ] Admin `RewardRow.jsx` — an "except these products" multi-picker,
      shown only in scope mode.
- [ ] `promotionRepeatCount`/`promotionReferencesProduct` — confirm NOT
      nodes and `excludeProductIds` don't break repeat-count math or PDP
      relevance (a NOT'd leaf has no natural repeat count — treat like any
      other non-product leaf, i.e. doesn't limit the count).
- [ ] Tests: NOT inverts correctly standalone and nested inside AND/OR;
      `excludeProductIds` removes exactly the excluded products from a
      scoped reward's resolved target list and nothing else.

## Phase 3 — Quantity tiers (one promotion, multiple thresholds) ⬜

**Depends on:** Phase 1 (operator-aware repeat-count math).
**Unblocks:** "2+ → 10% off, 4+ → 20% off" as ONE promotion (ask #5), closes
the `TIERED_DISCOUNT` "reserved, no reward type yet" gap already flagged in
`promotionPresentation.service.js`.

- [ ] New reward shape: `tiers: [{ minQuantity, value }]` alongside (not
      replacing) the existing flat `value` field on percent/flat/discounted-
      product rewards — `tiers` optional; when absent, behaves exactly as
      today (backward compatible, zero change for every existing reward).
      When present, the actual applied `value` is whichever tier's
      `minQuantity` the live qualifying quantity has crossed, highest
      qualifying tier wins (not cumulative/stacked across tiers).
- [ ] `promotionEngine.util.js` reward-processing loop — resolve
      `reward.tiers` (if present) against the SAME quantity figure
      `promotionRepeatCount`'s underlying condition already measures,
      before pushing the discount candidate (one candidate, at the
      resolved tier's value — not one candidate per tier).
- [ ] `promotionPresentation.service.js` — `buildSavingsText`/`buildBadge`
      show the tier structure ("10–20% off, by quantity") instead of a
      single flat value when `tiers` is present.
- [ ] Admin `RewardRow.jsx` — tier rows (add/remove), each a
      {minQuantity, value} pair, shown as an alternative to the flat value
      input (toggle, same UI pattern as the Phase A `targetScope` toggle).
- [ ] Admin `promotionEvaluator.js` — tier resolution mirrored for the live
      preview.
- [ ] Tests: crossing tier 1 only, crossing tier 2 (higher value wins, not
      summed with tier 1), quantity between tiers (lower tier applies),
      below the lowest tier (no discount), tiers combined with
      `discountAllUnits`/scope.

## Phase 4 — Per-promotion ₹ discount cap ⬜

**Low risk, high value, no dependencies — can ship any time.**

- [ ] `Promotion.maxDiscountAmount: Number` (mirrors `Coupon.maxDiscountCap`
      exactly, same naming convention this codebase already uses).
- [ ] Engine — after computing a reward's discount (product-level,
      category-scope, or order-level), clamp the TOTAL ₹ this promotion
      grants across the whole order to this cap. Needs per-promotion
      running-total tracking across the discount loop (same `ruleId`-keyed
      map pattern `promoDiscountByPromotionId` from the A10 fix already
      established — reuse that exact mechanism, don't invent a second one).
- [ ] Admin `PromotionEditor.jsx` — one numeric input next to
      `maxApplications` in the Stacking & Limits section.
- [ ] Tests: a promotion whose natural discount would exceed the cap is
      clamped; one that wouldn't is unaffected; cap applies to the SUM
      across all of a promotion's reward lines/scoped products, not each
      independently.

## Phase 5 — Cheapest-item discount: activate for real ⬜

**Unblocks:** turns `cheapest_item_free`/`cheapest_item_discount` from
"computed but never consumed" into genuinely checkout-functional — a
concrete, scoped, already-half-built reward type (engine already produces
`cheapestItemAdjustments`; nothing in checkout reads it).

- [ ] `rp.payment.controller.js` (both flows) + `magic.checkout.controller.js`
      — after product-level discounts are baked in, find the single
      cheapest ORIGINAL-price line across the order (or across a
      `targetScope`-resolved subset, if the reward specifies one — reuse
      the exact same scope-resolution Phase A already built), apply `free`
      (zero it, mark `isPromotionalGift`) or `discount` (reduce by `value`
      %). Only ONE cheapest-item adjustment total per order (same
      single-winner principle as everything else) even if multiple
      `cheapestItemAdjustments` entries matched.
- [ ] `WORKING_REWARD_TYPES` — add `cheapest_item_free`/
      `cheapest_item_discount` to all 3 copies (admin client picker, admin
      server validator, storefront presentation safety net) ONLY once the
      checkout wiring above is confirmed working — never before, same
      discipline the existing list already follows.
- [ ] Admin `RewardRow.jsx` — expose these 2 types in the picker now that
      they're real.
- [ ] Tests: cheapest item correctly identified among mixed prices/
      quantities; ties broken deterministically; interacts correctly with
      already-applied product-level discounts (compares DISCOUNTED prices,
      since "cheapest" should mean cheapest-to-the-customer-right-now, not
      cheapest-at-list-price — explicit design decision, document in code).

## Phase 6 — Admin UX: multi-select pickers, health surfacing, templates ⬜

**No schema/engine changes — pure admin-client UX**, safe to do in
parallel with any phase above.

- [ ] Replace single-product `<select>` (`ProductSelect`/`ConditionGroup`'s
      product leaf, `RewardRow`'s `targetProductId`-mode) with a searchable
      multi-select where the ask is genuinely multi-product (NOT every
      single-product-target case — a reward naming ONE specific gift
      product should stay single-select; a condition like "any of these 5
      specific products" is the actual multi-select ask). Scope precisely:
      which fields become multi-select vs. stay single, before touching
      code.
- [ ] Promotion list/card view — surface the EXISTING
      `/admin/promotions/health` endpoint's per-promotion status (it
      already exists and runs `checkAllPromotionsHealth` — confirm it's
      actually rendered anywhere in `Promotions.jsx`/`PromotionCard.jsx`
      today; audit suggests it may be backend-only with no UI consumer,
      mirroring the coupon preview-validate situation from the first
      audit round — verify before assuming either way).
- [ ] Prevent save/activate on contradictory configs — e.g. `exclusive:
      true` AND a non-empty `promotionGroup` (redundant/confusing
      combination), a scoped reward with `targetVariantSku` set (already
      blocked), `tiers` with non-ascending `minQuantity`. Client-side
      validation in `PromotionEditor.jsx` before submit, mirrored
      server-side in `validateRewards`/`validateConditionTree` (never
      trust client-only validation for a save endpoint).
- [ ] Reusable templates — one exists (`buildBuyXGetYPercentTemplate`);
      add 2–3 more for the now-real capabilities (category-wide % off,
      tiered quantity discount) once Phases 1–3 land, so a template
      exists for every genuinely-supported shape, not a stale subset.

---

## Explicitly out of scope, still (confirmed, not forgotten)

- Fixed-price/mix-and-match bundles (`bundle_price`) — would need genuine
  bundle-pricing logic (allocate a fixed total price across N different
  line items proportionally) that doesn't exist anywhere in this codebase
  yet; bigger than a phase, needs its own design pass.
- `gift_choice` (pick-1-of-N) — needs an actual cart-side choice UI/step
  (storefront customer interaction), explicitly out of scope per "do not
  develop storefront UI" in the governing request.
- `store_credit` — no wallet/credit-ledger subsystem exists; stays
  disabled per the explicit instruction not to force it into a model that
  doesn't support it.
