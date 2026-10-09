# Promotion Engine V2 — Storefront Display Layer

Status: **data layer done, UI not built yet.** This doc explains what already
exists so the next step (building the actual banners/UI) can be planned.

## 1. What got removed, and why this doc exists now

Until 2026-10-09 the storefront showed discounts/banners from THREE separate,
overlapping systems:

- the legacy `offers` collection (singleton docs: free-shipping threshold,
  gift wrap, hand-typed "combo banners")
- a generic `cartRule` engine (`cartRule.util.js`, `/cart-rules/evaluate`)
  built on top of `offers`
- a thin adapter (`promotionToCartRule.adapter.js`) that faked Promotion V2
  documents into the same `cartRule` shape so old banner code could read
  them without changes

All three are now **deleted**, everywhere, on both admin and storefront,
front and back end: `cartRule.util.js`, `cartRule.controller.js`,
`cartRule.route.js`, `promotionToCartRule.adapter.js`, the `offer.model.js`
discount-adjacent routes, `FreeShippingBanner.jsx`, `ProductPageBanner.jsx`,
the admin's `/admin/offers` page, the client's
`useEvaluateCartRulesQuery`/`useGetAllFreeShippingBannersQuery` hooks, and
every render call-site that used them (PDP, cart drawer, mini-cart,
checkout, home page bundle section).

What's left, on purpose:
- **Promotion Engine V2** (`promotions` collection) — the one real engine,
  already wired into the actual charge (`rp.payment.controller.js`,
  `magic.checkout.controller.js`).
- **Free-shipping cart-value threshold** (`getFreeShippingConfig`,
  `FreeShippingStrip.jsx`) — a separate, simple, still-working feature: one
  number, "free shipping over ₹X". Not part of Promotion V2's display API,
  not touched by this doc.
- **Gift wrap add-on** (`offer.util.js`'s `getPublicOfferConfig("gift_wrap")`,
  `GiftWrapOffer.jsx`) — also separate, also still working, also not a
  discount.
- **"Complete the Set" combo** (`ComboBundleSection.jsx`, `comboProductIds`
  on the Product model) — also separate: admin picks companion products
  directly on a product, nothing to do with Promotion V2 either.

Everywhere else that used to show a discount/banner now shows **plain
prices**, with a comment pointing here. That's the gap this doc is about
closing.

## 2. The three-step pipeline

Every surface (PDP, cart, mini-cart, checkout) follows the same shape:

```
 FETCH                      FILTER                           DISPLAY
 ─────                      ──────                           ───────
 GET/POST one of the        1. placements (admin checkboxes)  Render ONE shared
 3 Display API endpoints    2. "is this relevant here"        component per
 (server does steps 1-2,    3. evaluateConditionTree          displayType —
 returns ready-to-render     (does the CURRENT cart/page       never branch on
 JSON)                       actually qualify, right now)      raw reward type
```

**Important: filtering is NOT done on the client.** The three Display API
endpoints below already do steps 1–3 server-side and return a list of
already-filtered, already-sanitized, already-sorted promotion objects. The
frontend's only job is steps "fetch" (call the right hook) and "display"
(render what comes back). This matters because a Promotion's raw
`conditionTree`/`rewards`/`linkedCouponCode` must never reach client code —
only the sanitized shape in §4 does.

## 3. Step 1 — FETCH: which endpoint, from where

Three REST endpoints exist today (`server/src/routes/promotion.route.js`),
already wrapped as RTK Query hooks in
`client/src/store/api/userApi.js` (lines ~322–341):

| Surface | Hook (client) | Endpoint (server) | Method |
|---|---|---|---|
| PDP | `useGetProductPromotionsQuery(productId)` | `GET /promotions/display/product/:productId` | GET |
| Cart drawer | `useGetCartPromotionsQuery({ items, placement: "cart", subtotal, couponCode })` | `POST /promotions/display/cart` | POST |
| Mini-cart | `useGetCartPromotionsQuery({ items, placement: "mini_cart", subtotal, couponCode })` | `POST /promotions/display/cart` | POST |
| Checkout | `useGetCheckoutPromotionsQuery({ items, subtotal, customerType, orderCount, deliveryAddress, couponCode })` | `POST /promotions/display/checkout` | POST |

All three hooks have `keepUnusedDataFor: 0` — never cached, so an admin
toggling a promotion is reflected on the very next fetch, not held in a
stale RTK cache.

`items` is always `[{ productId, quantity, selectedVariant }]` — the
client only ever knows a variant by its **name** (e.g. "Black"); the server
resolves name → SKU internally (`resolveItemsAndContext` in
`promotion.controller.js`) before touching the condition tree, exactly the
same way the real checkout engine does.

Cart/mini-cart and checkout are the **same endpoint shape**
(`getCartDisplayController` / `getCheckoutDisplayController`), the
difference being which `placements` value gates it (`cart`/`mini_cart` vs
`checkout`) and that checkout additionally accepts
`customerType`/`orderCount`/`deliveryAddress` so pincode/state/country/
"returning customer" conditions can actually be evaluated (PDP and cart
don't have that context yet, so those conditions just won't match there —
same "optimistic, re-validated later" convention the old banner system
already used).

## 4. Step 2 — FILTER: the three gates, in order

This all happens **inside** the controller (`promotion.controller.js`),
before anything is sent to the client. You don't call these separately —
they're documented here so you know *why* a given promotion does or
doesn't show up.

### Gate A — `placements` (the admin's checkboxes)

Every Promotion document has:

```js
placements: ["pdp", "plp", "cart", "mini_cart", "checkout",
             "order_confirmation", "order_details", "customer_account"]
```

This is the literal checkbox UI in the admin Promotions editor — admin
ticks which surfaces a promotion is *allowed* to appear on. Defaults to
**all 8** so a promotion created before this field existed keeps showing
everywhere, instead of silently vanishing.

A promotion whose `placements` doesn't include the surface being queried
(e.g. a promotion scoped to `checkout` only) is dropped **before** anything
else runs — it never even reaches condition evaluation for that surface,
even though it's still fully active and still discounts the real order
if the customer gets there. This is a *display* concern only.

### Gate B — "is this even relevant to show here" (structural filter)

Before bothering to evaluate the full condition tree, each endpoint does a
cheap structural check so a completely unrelated promotion doesn't clutter
the page:

- **PDP** (`promotionReferencesProduct`): does this promotion's condition
  tree mention this product, OR does one of its rewards target this
  product? (So a PDP for Product A doesn't show a promo that's entirely
  about Product B.)
- **Cart/Checkout** (`isPromotionRelevantToCart`): does the promotion have
  *any* product-specific condition at all?
  - If yes → at least one of those named products must actually be in the
    cart.
  - If no (a pure cart-wide rule like "spend ₹2000+" or "guest checkout
    only") → always relevant, shown regardless of which products are in
    the cart.

### Gate C — `evaluateConditionTree` (does it actually qualify, right now)

This is the real condition-tree evaluator (`promotionEngine.util.js`) — the
same recursive AND/OR/leaf evaluator the real checkout uses. It produces,
per promotion, a 3-way state:

- **`applied`** — already matching a *real, independently-run* evaluation
  of the current cart (`evaluatePromotions`), not just "conditions look
  met" — this is what makes "Applied" vs "qualifying" trustworthy.
- **`qualifying`** — conditions are met right now, would apply if the
  customer checked out this instant, but isn't (yet) the one the real
  engine picked (e.g. a better promotion won the stacking/exclusivity
  fight).
- **neither** — doesn't qualify yet; `progressText` explains how close
  (e.g. `"Add ₹250 more to unlock Free Shipping."`).

A coupon-linked promotion additionally needs `promotionCouponGateOk` (the
coupon must actually be entered/applied) before it can be `qualifying` —
conditions-met-but-no-coupon-yet shows as `needsCoupon` instead, with
`ctaText: "Enter code XYZ10"`.

## 5. Step 3 — DISPLAY: the shape you actually get back

Every promotion in every response has gone through
`promotionPresentation.service.js`'s `buildPromotionDisplayModel` — this is
the **Universal Renderer Contract**. The frontend must switch on
`displayType` only, never on the raw `rewards[].type` or `promotionType` —
that's the entire point of this layer: a 13th reward type tomorrow needs
one new `case` in `buildDisplayType()` server-side, not a frontend rewrite.

```jsonc
{
  "id": "671f...",
  "displayType": "discount",      // one of 8 values, see table below
  "title": "Diwali Sale",         // promotion.name
  "subtitle": "20% off",          // savingsText, or null
  "badge": "20% OFF",             // short badge string, e.g. "FREE SHIPPING", "FREE GIFT"
  "icon": "tag",                  // a stable KEY (not an emoji/asset) — you own the icon set
  "priority": 10,
  "displayRank": 10,              // sort by this, highest first — already sorted for you
  "savingsText": "20% off",
  "progressText": "Add ₹250 more to unlock Free Shipping.",  // or null if already qualifying
  "ctaText": "Add to cart",       // "Applied" | "Enter code X" | "Add to cart" | "View offer" | "Choose your gift"
  "couponCodeToEnter": null,      // only non-null in the exact "needs this code now" moment
  "applied": false,
  "qualifying": true,
  "placement": "cart",            // echoes which placement this result is for
  "explanation": [{ "met": false, "text": "Needs cart subtotal >= ₹999 (currently ₹750)." }],
  "fullyFunctional": true         // see §6 — NEVER show as live if false
}
```

`displayType` values and what collapses into each:

| displayType | Reward types behind it |
|---|---|
| `discount` | percent_off_product, flat_off_product, discounted_product, percent_off_order, flat_off_order, cheapest_item_free, cheapest_item_discount |
| `free_gift` | free_product |
| `gift_choice` | gift_choice (customer picks one in-cart) |
| `free_shipping` | free_shipping |
| `bundle` | bundle_price |
| `coupon` | any promotion with a `linkedCouponCode` set |
| `tiered_discount` | reserved, no reward type produces this yet |
| `promotion` | fallback — multiple different reward kinds in one promotion, or `store_credit` |

A list response is already `.sort((a,b) => b.displayRank - a.displayRank)`
— don't re-sort, just map over it in order.

## 6. One thing the UI must never get wrong: `fullyFunctional`

Not every reward type the admin can configure is actually wired into the
real checkout charge yet. `WORKING_REWARD_TYPES` (in
`promotionPresentation.service.js`) is the actually-enforced subset:
`percent_off_product, flat_off_product, discounted_product, free_product,
free_shipping, percent_off_order, flat_off_order`.

Anything outside that list (`gift_choice`, `bundle_price`,
`cheapest_item_free`, `cheapest_item_discount`, `store_credit`) comes back
with `fullyFunctional: false`, and — already forced server-side —
`qualifying: false` and `applied: false` regardless of its real condition
state. **Don't special-case this in the UI; it's already neutralized.**
Just never render a promotion as live/actionable based on anything other
than its `qualifying`/`applied` flags, and this category takes care of
itself (it'll just never show as qualifying). If you want to actively hide
these entirely rather than show a dead "View offer" card, filter on
`fullyFunctional === true` before rendering — that's a UI choice, not
something the API forces either way.

## 7. What a UI build-out still needs to decide (not done yet)

This doc stops at "data's ready, shape is stable." Still open, deliberately
not decided yet:

1. **Where exactly each `displayType` renders** — inline on the product
   card? A banner strip above reviews? A line in `PriceRows`? A toast?
2. **One shared `<PromotionCard displayType=... />`-style component**
   switching on `displayType`, reused across PDP/cart/mini-cart/checkout —
   vs. a different component per surface. The Universal Renderer Contract
   (§5) is explicitly designed so ONE component can work everywhere; that's
   the recommended direction, not a requirement.
3. **Coupon-code UX** — `couponCodeToEnter` gives you the code; whether
   tapping the card auto-fills `CouponInput.jsx` or just shows the code as
   text is a UI call.
4. **`gift_choice` picker UI** — the only reward type that needs the
   customer to make an in-cart choice (pick one of `giftOptions`); nothing
   like that exists yet anywhere in the current UI.
5. Empty-state handling (what renders when a response's `promotions` array
   is empty — most likely just nothing, but worth being explicit about).

None of the above blocks anything — the fetch+filter layer this doc
describes works today, independent of what UI eventually consumes it.
