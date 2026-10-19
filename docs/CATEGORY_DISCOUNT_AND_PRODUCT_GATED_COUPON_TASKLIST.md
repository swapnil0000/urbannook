# Task List — Category-Scoped Discounts, Product-Gated Coupons, Priority-Based Conflict Resolution

**Status key:** ⬜ not started · 🔶 in progress · ✅ done

Living doc — update in place as work lands, don't rewrite from scratch
(except the one rewrite on 2026-10-10 noted below, which replaced the
original plan with the actual, simpler design that got built).

Spans **two repos**:
- `urbannook` (storefront) — this repo
- `urbannook-admin` (admin, lives inside the `urbannook-store` checkout at
  `urbannook-admin/`)

**Sequencing (explicit instruction, 2026-10-10): admin-side first — admin
must be able to fully configure/control everything before storefront
consumption is wired.** Phase 1 (admin) is done. **Phase 2 (storefront
checkout/coupon enforcement + display) is also now done** — see §1.7, §2.3,
§3 below, all checked off and verified (full test suite, both client builds,
both server boots).

## 0. Confirmed requirements

1. **Category/subcategory/tag/all-products discount** ("buy 2+ from
   category X → 10% off everything in category X currently in the cart"):
   the discount applies **only to matching items' prices**, not the whole
   order, and not to just one admin-picked product — it must generalize to
   "every product in the cart matching category/subcategory/tag", or
   literally "every product in the cart" (all). Covers both the original
   "category order discount" ask and the separate "whole category/
   subcategory/all-products offer" ask — same mechanism, deliberately
   unified (see §1's design note for why).
2. **Product-gated coupon**: a coupon becomes usable **only when a specific
   product (or one of several) is in the cart**. Presence is **boolean, not
   quantity-scaled** — confirmed explicitly: "lamp add kiya, 1 coupon
   enable hua; quantity +1 kiya (2 lamps), same coupon dubara enable/stack
   nahi hona chahiye — ek hi coupon rehna chahiye." The gate is "≥1
   qualifying item present"; the coupon's own discount is never multiplied
   by how many qualifying units are in the cart.
3. **Priority-based single-winner per product, `stackable` actually wired**:
   if the same product qualifies under 2+ different promotions, exactly
   ONE discounts it — chosen by priority (not just "best price wins"
   automatically, which was the prior, non-admin-controlled behavior).
   `stackable` (previously schema-only, zero runtime effect) must become a
   real tiebreak signal.
4. **No money leaks, full stop** — explicit, repeated instruction. Every
   addition here reuses existing, already-battle-tested machinery
   (per-product discount candidates, shared rule budgets, coupon
   re-validation-at-charge-time) rather than inventing a parallel
   calculation path, specifically to minimize new room for a
   rounding/order-of-operations bug.

---

## 1. Feature A — Generalized scoped discount (covers category-order-discount AND category/subcategory/all-products offers)

**Design note (2026-10-10, supersedes the original plan in this doc's first
draft):** rather than a brand-new reward type + a brand-new order-level-
style accumulator (separate rounding/cap logic, separate code path), the
existing `percent_off_product` / `flat_off_product` / `discounted_product`
reward types were generalized so `targetProductId` (one specific product)
can instead be `targetScope: { field: "category"|"subcategory"|"tag"|"all",
value? }` — resolved against the live cart into however many productIds it
matches, each pushed through the exact same `discountCandidatesByProduct`
pipeline a single-product reward already uses. A percentage distributed
over several lines mathematically equals the same percentage applied to
their sum, so this reuses 100% of the already-correct per-product discount
math (`applyBestPromotionDiscount`, shared rule budgets, rounding) instead
of parallel order-level arithmetic — lower risk, not a new system to keep
in sync. "Shown as one lump deduction" becomes a **display-layer** choice
(aggregate the per-product lines into one line), not a different
calculation.

### 1.1 Schema ✅ done (storefront `server/src/model/promotion.model.js` +
    admin `server/models/promotion.model.js`, kept identical)

- [x] `rewardSchema.targetScope: { field: enum[category|subcategory|tag|all], value: String }`,
      alternative to `targetProductId` (mutually exclusive).

### 1.2 Validation ✅ done (admin `server/controllers/promotion.controller.js`'s `validateRewards`)

- [x] Exactly one of `targetProductId`/`targetScope` required for the 3
      scopable reward types.
- [x] `targetScope.field` must be category/subcategory/tag/all;
      `value` required unless `field === "all"`.
- [x] `targetVariantSku` rejected when `targetScope` is set (a variant is
      one product's own identity — meaningless once the target is a set).

### 1.3 Engine ✅ done (storefront `server/src/utils/promotionEngine.util.js`)

- [x] `resolveRewardTargetProductIds(reward, ctx)` — resolves `targetScope`
      against `ctx.qtyByProduct`/`ctx.productMeta` into the matching
      productId list (or the explicit `[targetProductId]` for the
      unchanged single-product case).
- [x] Reward-processing loop now iterates every resolved productId, pushing
      one discount candidate each — same `cap`/`ruleId`/budget-tracker
      shape as before. A scoped reward always discounts the **full** live
      quantity of every matching product (no single "trigger product" to
      cap against — `discountAllUnits` is a no-op for scoped rewards, not
      exposed in the admin UI for them).
- [x] `getDiscountCandidatesForItem`/checkout consumption needed **zero**
      changes — scoped candidates have no `variantSku`, so the existing
      `!c.variantSku || ...` filter already passes them through for any
      variant of a matching product, which is correct.

### 1.4 Edge case 3 (priority-based single-winner per product + `stackable`) ✅ done, same engine file

- [x] `resolveProductDiscountWinners(discountCandidatesByProduct, promoMetaById)`
      — when 2+ *different* promotions both have a candidate for the same
      product (whether via explicit `targetProductId` or scope
      resolution), only the single best promotion's candidate(s) survive.
      Winner chosen by: highest `priority` → `stackable:false` beats
      `stackable:true` at equal priority → earliest-created as final
      deterministic tiebreak (matches `getActivePromotions`' own sort
      convention). Never compounds two discounts on one product — a
      strict single winner, by design (compounding multiplies the surface
      for a rounding bug).
- [x] Called once at the end of `evaluatePromotions`, before return —
      applies uniformly to every caller (real checkout, cart/checkout
      preview, display API) with no per-caller changes needed.

### 1.5 Admin UI ✅ done

- [x] `RewardRow.jsx` — "1 product" / "Category / Tag / All" toggle for the
      3 scopable reward types; scope mode shows a field picker (category/
      subcategory/tag/all) + value input (hidden for "all"); the
      `discountAllUnits` checkbox is hidden in scope mode (replaced with an
      explanatory note, since it's always full-quantity).
- [x] `PromotionCard.jsx`'s `describeReward`/`describeScope` — readable
      summary for a scoped reward (e.g. `% off a product: category "Anime"
      (10%)`).
- [x] `PromotionEditor.jsx` — `stackable` checkbox now has a tooltip
      explaining its real, enforced tiebreak semantics (previously
      inert).
- [x] Admin's client-side live preview (`promotionEvaluator.js`,
      `estimatePromotionDiscounts`/`resolveScopeProductIds`) also
      understands `targetScope`, so the Section 7 test-cart simulator
      shows correct preview lines for a scoped reward instead of silently
      producing nothing.

### 1.6 Checkout application ✅ done, confirmed

- [x] No `rp.payment.controller.js` changes were needed — it already
      consumes `discountCandidatesByProduct` generically per order item,
      which is exactly what both the scoping and the priority-winner
      logic produce. Same for `magic.checkout.controller.js` (reads the
      same `evaluatePromotions` result).
- [x] Confirmed for real, not just by construction — new dedicated test
      file `promotionEngine.targetScope.test.js` (5 tests) exercises
      category/subcategory/tag/"all" scope resolution end-to-end through
      the real `evaluatePromotions`, and `promotionEngine.crossConflict
      .test.js` gained 2 new tests for the priority/stackable tiebreak
      (equal priority → earliest-created wins; equal priority, one
      non-stackable → the non-stackable one wins). All pass, zero
      regressions in the full 357-test suite.

### 1.7 Display API ✅ done

- [x] `promotionReferencesProduct` now accepts an optional 3rd `productMeta`
      param and checks `targetScope` ("all" always relevant; category/
      subcategory/tag matched against that one product's own meta). Both
      call sites (`getPromotionsForProductController`,
      `getProductDisplayController`) now build the cart context FIRST
      (`resolveItemsAndContext`) and pass `ctx.productMeta.get(productId)`
      into the filter, instead of filtering before any product-meta lookup
      existed.
- [x] `buildSavingsText`/`buildBadge` (presentation service) confirmed —
      they don't reference `targetProductId` at all, work unchanged for
      scoped rewards.

---

## 2. Feature B — Product-gated coupons (+ no quantity-scaling)

### 2.1 Schema ✅ done (storefront `server/src/model/coupon.model.js` +
    admin `server/models/coupon.model.js`, kept identical)

- [x] `eligibleProductIds: [String]` (default `[]` = no restriction, every
      existing coupon unchanged). Decided: **product-only** for v1 (not
      category-level gating) — matches the original "lamp" example
      exactly; **ANY-one-present (OR)** semantics when multiple IDs are
      set.

### 2.2 Admin ✅ done

- [x] `createCoupon`/`editCoupon` (admin `server/controllers/coupon.controller.js`)
      accept/sanitize `eligibleProductIds`.
- [x] `Coupons.jsx`'s `CouponForm` — product multi-picker (dropdown + Add +
      removable chips, same pattern as the existing assignee/email
      pickers in this file) writing to `eligibleProductIds`. Table row
      shows a "Gated: N products" badge when set.

### 2.3 Storefront validation/enforcement ✅ done

- [x] `couponProductGateOk(coupon, cartProductIds)` — new exported helper in
      `coupon.code.service.js`, the single source of truth for the gate
      (presence-only, `.some()`, never scaled by quantity).
- [x] `validateNewCoupon` now takes `cartProductIds` and calls the gate
      alongside the existing minCartValue/validity/usage checks.
- [x] `applyCouponCodeService` passes `availableItems.map(i => i.productId)`.
- [x] `magic.checkout.controller.js`'s `magicApplyPromotionController` now
      fetches `order.items` (projection added) and passes productIds via
      `cartItemsForOrder(order).map(i => i.productId)`.
- [x] `rp.payment.controller.js`'s authenticated "Coupon:PaymentRecheck"
      block (uses `uniqueProductIds`, already in scope) AND the guest
      flow's inline re-validation block (uses `productIds`, already in
      scope) both now call `couponProductGateOk` right alongside the
      existing minCartValue/usage re-checks — confirmed these blocks
      already re-derive everything fresh from the live cart at charge
      time (not a cached snapshot), so this closes the loop correctly:
      removing the product after applying genuinely invalidates the
      coupon before charge.
- [x] `getAllCouponCodeService` — for a logged-in user, now derives
      `cartProductIds` from the server's own stored cart
      (`getCartService`, same trust boundary `applyCouponCodeService`
      already uses — never trusts client-sent items when a userId is
      present); for a guest, takes `cartProductIds` from the request body
      (`coupon.code.controller.js`'s `getAllCouponCodeController` reads
      `items` from `req.body`). A gated coupon is filtered out of the
      public list until its required product is present.
- [x] `userApi.js`'s `getAvailableCoupons` now accepts `{ userId, items }`
      (backward compatible — still accepts a bare `userId` string for any
      caller not yet updated). `CouponInput.jsx`/`CouponList.jsx` both pass
      `items` (built from `CheckoutPage.jsx`'s live `cartItems`).
- [x] Admin's own coupon preview tool (`validateCouponForOrder` /
      `previewValidate`, admin `coupon.controller.js`) also updated for
      consistency, even though nothing in the admin client currently calls
      it — so it can't become a second place that silently ignores the
      gate if it's ever wired to a UI later.

### 2.4 Tests ✅ done

New file `server/src/__tests__/unit/couponProductGate.test.js` (10 tests,
all passing) covering: no/empty `eligibleProductIds` is always a no-op,
required product present/absent, ANY-one-of-several (OR) semantics,
presence-only behavior (duplicate/repeated productIds change nothing),
`validateNewCoupon` rejecting with a clear message when gated and absent,
succeeding when present, and 2 units of the qualifying product producing
the identical discount as 1 (the literal "2 lamps ≠ 2 coupons" edge case).

---

## 3. Verification checklist (run after each phase)

- [x] Admin: `node --check` on every touched server file.
- [x] Admin: client esbuild syntax check on every touched `.jsx`/`.js` file.
- [x] Admin: `npx vitest --run` (full suite) — passes.
- [x] Admin: `npm run build` (client) — clean.
- [x] Admin: server boots past its full import graph (stops only on
      missing env vars, same as every prior check this session).
- [x] Storefront: `node --check` on every touched server file.
- [x] Storefront: esbuild syntax check on every touched client `.jsx`/`.js`
      file.
- [x] Storefront: full Jest suite — 357 tests, only the known pre-existing
      failure set still fails (`errorHandler`, `order.tracking`,
      `payment.error`, `errorHandler.properties`, `rateLimiter`,
      `testimonial.properties`, `email.service`, flaky `whatsapp.auth`),
      zero new regressions. 16 new tests added across 3 new/extended files,
      all passing.
- [x] Storefront: `npm run build` (client) — clean.
- [x] Storefront: server boots past its full import graph (stops only on
      missing env vars, same as every prior check this session).

**Both phases complete as of 2026-10-10.** Remaining open item: §1.1's
"does reward scope have to match condition scope" was decided (no
coupling, same flexibility as `percent_off_product` already had) — no
further action needed there either.

---

## 4. Second audit round (2026-10-10, "build a complete admin offer control
    system" request) — fixes landed

A full code-verified correctness audit (double-application, quantity
controls, coupon gaps beyond `eligibleProductIds`, reward-type drift,
placements, admin-simulator-vs-engine agreement) was run. Full findings are
in that audit's own report (not duplicated here) — only the 5 it ranked
highest were implemented this round, all done + tested:

- [x] **A9 — Magic Checkout coupon miscalculation**: was computing %/
      minCartValue off `order.amount` (final charge, includes gift wrap),
      not product subtotal. Now sums straight from the order's own items
      (`magic.checkout.controller.js`).
- [x] **A6 — `free_product` reward hardcoded to 1 unit**: now scales with
      the promotion's own repeat count (same `cap` product-level rewards
      use), clamped by `maxApplications` — "buy 2 get 1 free" crossed twice
      now correctly grants 2. Guarded against the one real bug this
      introduced during testing: a cart-subtotal-only condition (no
      product leaf) has no natural repeat count, so `cap` is an
      "effectively unlimited" sentinel safe for product-discount rewards
      (always clamped downstream by real cart quantity) but NOT safe to
      use directly as a free-gift quantity — would have granted ~9
      quadrillion units. Fixed before shipping; see
      `promotionEngine.util.js`'s `free_product` case and
      `promotionEngine.freeProductQuantity.test.js` (4 tests, including the
      one that caught it).
- [x] **A3 — `promotionGroup` drops the ENTIRE losing promotion**, not just
      its overlap with the winner, across the whole order — intentionally
      left as-is (changing it would silently alter live promotion
      semantics, against the explicit safety rules for this round); instead
      clarified in the admin editor with a tooltip explaining this is
      whole-order exclusivity, not per-product, and pointing to
      Priority/Stackable for the per-product case.
- [x] **A10 — `PromotionUsage.discountAmount` was never populated** (always
      ₹0) and `cartValueBeforeDiscount` silently held the POST-discount
      figure under a "before discount" name. Added
      `Order.appliedPromotions[].discountAmount` and a new
      `Order.promotionGrossProductSubtotal` field, both snapshotted at
      order-creation time (product-level + order-level discount
      attribution, tracked per promotionId through the existing discount
      loop), and wired into the webhook's `PromotionUsage.create()` call.
      Admin's "Total discount given" analytics will now be correct for
      every order created from this point forward (historical orders
      remain ₹0 — no retroactive backfill was done, per "no production
      migrations").
- [x] **F — Admin simulator cross-promotion blind spot**: the live
      test-cart preview only ever evaluates the one draft promotion being
      edited, with no warning that a higher-priority or non-stackable live
      promotion could fully override it in production (winner-take-all,
      not reduced). Added a visible disclaimer in the editor rather than
      rebuilding the simulator to run the real cross-promotion resolution
      (a bigger, riskier change deferred as out-of-scope for this round).

Also cleaned up several stale comments across `promotionEngine.util.js`/
`rp.payment.controller.js`/`promotion.controller.js` that claimed the
deleted legacy cart-rule adapter "still exists" (A2, low severity but
actively misleading to a future reader/AI).

**Explicitly NOT done this round** (real, multi-week scope — see the
audit's own §B/§C for the full list, not re-copied here): product/variant
EXCLUSION in condition trees, distinct-SKU-vs-summed-quantity taxonomy
conditions, quantity tiers in one promotion, a ₹ discount cap per
promotion, coupon variant/quantity-based restriction, and rebuilding the
admin simulator to run real cross-promotion resolution. All confirmed
genuinely absent (not regressions), each a deliberate backlog item, not an
oversight.

**Verification**: full Jest suite — 361 tests (8 new this round), same
known pre-existing failure set only (`errorHandler`, `order.tracking`,
`payment.error`, `errorHandler.properties`, `rateLimiter`,
`testimonial.properties`, `email.service`), zero new regressions
(`payment.properties.test.js` flaked once on an unrelated, self-contained
fast-check property test hitting the string `"toString"` as a random
counterexample — confirmed passing on 3 immediate re-runs, nothing to do
with this round's changes). Both repos' clients build clean, both servers
boot past their full import graph.
