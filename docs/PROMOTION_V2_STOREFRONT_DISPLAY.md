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

## 8. Worked example — admin creates an offer, storefront fetches it

Concrete, end-to-end, with real JSON at every step.

### 8.1 Admin creates the promotion

Say the admin opens the Promotions editor and fills in:

- Name: **"Diwali 20% Off — LED Katana"**
- Type: `product_discount`
- Condition: *product* `katana-led-01`, quantity `>= 1`
- Reward: *20% off* that same product
- Placements (the checkboxes): ✅ PDP, ✅ Cart, ✅ Mini-cart, ✅ Checkout — ❌ PLP, ❌ order confirmation, ❌ order details, ❌ customer account
- Stackable: yes, Priority: 5

Saving that writes **one document** into the `promotions` collection — this
is the actual shape (`server/src/model/promotion.model.js`):

```jsonc
{
  "_id": "671f3a2b9c1e4a0012ab34cd",
  "promotionType": "product_discount",
  "name": "Diwali 20% Off — LED Katana",
  "isActive": true,
  "startsAt": null,
  "endsAt": "2026-11-15T18:30:00.000Z",

  "stackable": true,
  "exclusive": false,
  "priority": 5,
  "promotionGroup": "",
  "maxPromotionsPerOrder": null,
  "combinesWithCoupons": true,

  "conditionTree": {
    "field": "product",
    "productId": "katana-led-01",
    "minQuantity": 1
  },
  "rewards": [
    {
      "type": "percent_off_product",
      "targetProductId": "katana-led-01",
      "value": 20,
      "discountAllUnits": false
    }
  ],

  "placements": ["pdp", "cart", "mini_cart", "checkout"],
  "maxApplications": null,
  "maxUsesTotal": null,
  "maxUsesPerUser": null,
  "usageCount": 0,
  "linkedCouponCode": "",

  "createdAt": "2026-10-10T09:00:00.000Z",
  "updatedAt": "2026-10-10T09:00:00.000Z"
}
```

Nothing else happens at save time — no cache to bust, no separate "banner"
record to also write. This one document IS the offer, everywhere.

### 8.2 Customer opens the product page (PDP)

`ProductDetailPage.jsx` (once wired) calls:

```js
const { data } = useGetProductPromotionsQuery("katana-led-01");
```

→ `GET /promotions/display/product/katana-led-01`

Server-side (`getProductDisplayController`):
1. `getActivePromotions()` — this doc qualifies (active, no date window issue).
2. Gate B: `promotionReferencesProduct(promo, "katana-led-01")` → true (the
   condition tree names this exact product). Gate A: `placements` includes
   `"pdp"` → true. Kept.
3. Context built as a **hypothetical 1-unit cart**: `{ productId:
   "katana-led-01", quantity: 1 }`, `subtotal: 0` — so the question being
   asked is "if the customer adds just this, does it qualify?"
4. Gate C: `qtyByProduct["katana-led-01"] = 1 >= minQuantity 1` → condition
   met → `qualifying: true`.

Response body:

```jsonc
{
  "statusCode": 200,
  "message": "OK",
  "success": true,
  "data": {
    "promotions": [
      {
        "id": "671f3a2b9c1e4a0012ab34cd",
        "displayType": "discount",
        "title": "Diwali 20% Off — LED Katana",
        "subtitle": "20% off",
        "badge": "20% OFF",
        "icon": "tag",
        "priority": 5,
        "displayRank": 5,
        "savingsText": "20% off",
        "progressText": null,
        "ctaText": "Applied",
        "couponCodeToEnter": null,
        "applied": true,
        "qualifying": true,
        "placement": "pdp",
        "explanation": [
          { "met": true, "text": "Needs 1+ of product katana-led-01 in cart (have 1)." }
        ],
        "fullyFunctional": true
      }
    ]
  }
}
```

A UI here would read `data.promotions[0]` and render something like a
"20% OFF" badge with "Diwali 20% Off — LED Katana" under the price — exactly
once, switching on `displayType === "discount"`.

### 8.3 Customer adds it to cart, opens the cart drawer

`CartDrawer.jsx` (once wired) calls:

```js
useGetCartPromotionsQuery({
  items: [{ productId: "katana-led-01", quantity: 1, selectedVariant: "Red" }],
  placement: "cart",
  subtotal: 2499,
});
```

→ `POST /promotions/display/cart` with that exact body.

Server-side (`getCartDisplayController`):
1. Gate A: `placements` includes `"cart"` → true.
2. Gate B: `isPromotionRelevantToCart` → the condition names
   `katana-led-01`, and that product IS in `cartProductIds` → relevant.
3. A **real** `evaluatePromotions(...)` run (the same call the actual
   checkout makes) decides `appliedPromotionIds` — this is what makes
   `applied` trustworthy rather than guessed.
4. Gate C runs against the REAL cart context this time (`subtotal: 2499`,
   real quantity), same result: qualifies.

Response is the same shape as §8.2, just `"placement": "cart"` and
`applied`/`qualifying` now driven by the real cart instead of a 1-unit
hypothetical.

### 8.4 Checkout

Identical call shape via `useGetCheckoutPromotionsQuery`, hitting
`POST /promotions/display/checkout` — the only difference is it also
accepts `customerType`/`orderCount`/`deliveryAddress`, so a promotion with
a pincode/state/"returning customer only" condition can be evaluated for
real here (PDP/cart can't check those yet). This endpoint's result is
**display only** — the actual charge still comes from
`rp.payment.controller.js`'s own independent `evaluatePromotions` call at
order-creation time; nothing here feeds the real total.

### 8.5 What if the admin had left "PLP" checked and nothing else?

Worth knowing: **PLP, order confirmation, order details, and customer
account are valid `placements` values in the schema, but none of them have
a working Display API endpoint yet** — only `pdp`, `cart`/`mini_cart`, and
`checkout` do (see §3's table; `promotion.route.js` only defines those
three routes). Ticking "PLP" in the admin editor today records the intent
correctly, but there's nothing on the storefront that calls a
`/promotions/display/plp` endpoint to read it — that endpoint doesn't
exist yet. Same gap applies to the other three. Building one for PLP
would follow the exact same pattern as `getProductDisplayController`
(structural filter: product mentioned in the promotion is anywhere in the
listed grid; placements gate: `"plp"`).




<!-- Now let me append a concrete worked example to the doc, end-to-end.

Doc update ho gaya — section §8 add kiya hai with full worked example. Ab seedha chat me bhi samjhata hoon:

Example: Admin ek offer banata hai

Maan lo admin Promotions editor me banata hai: “Diwali 20% Off — LED Katana”, condition = product katana-led-01 cart me ho, reward = us product pe 20% off, checkboxes (placements) me tick kiya: PDP, Cart, Mini-cart, Checkout.

Save karte hi promotions collection me yeh ek hi document banta hai:

{
  "_id": "671f3a2b9c1e4a0012ab34cd",
  "promotionType": "product_discount",
  "name": "Diwali 20% Off — LED Katana",
  "isActive": true,
  "conditionTree": { "field": "product", "productId": "katana-led-01", "minQuantity": 1 },
  "rewards": [{ "type": "percent_off_product", "targetProductId": "katana-led-01", "value": 20 }],
  "placements": ["pdp", "cart", "mini_cart", "checkout"],
  "priority": 5
}

Bas itna — koi alag banner record nahi banta, yeh ek doc hi poora offer hai.

Storefront kaise fetch karega

PDP pe (product page khulte hi):

useGetProductPromotionsQuery("katana-led-01")

→ yeh call karta hai GET /promotions/display/product/katana-led-01. Server check karta hai: placements me “pdp” hai? haan. Condition is product se related hai? haan. Phir ek hypothetical 1-unit cart bana ke condition evaluate karta hai → qualify ho jata hai. Jawab milta hai:

{ "displayType": "discount", "title": "Diwali 20% Off — LED Katana", "badge": "20% OFF", "ctaText": "Applied", "qualifying": true, "applied": true }

UI isko seedha displayType === "discount" pe switch karke render kar sakta hai.

Cart drawer me (jab customer product cart me daal chuka hai):

useGetCartPromotionsQuery({ items: [{productId:"katana-led-01", quantity:1}], placement:"cart", subtotal:2499 })

→ POST /promotions/display/cart. Yahan farq itna hai ki server ek real evaluatePromotions bhi chalata hai (wahi jo asli checkout use karta hai) taaki applied field trustworthy ho, sirf guess na ho.

Checkout pe same tarah useGetCheckoutPromotionsQuery se POST /promotions/display/checkout — bas yeh extra customerType/deliveryAddress/orderCount bhi bhejta hai, taaki pincode/state jaisi conditions bhi check ho sakein.

Ek important gap bhi mila mujhe isi example banate waqt: schema me plp, order_confirmation, order_details, customer_account bhi valid checkbox-values hain, lekin inke liye abhi koi API endpoint bana hi nahi hai — sirf pdp/cart/mini_cart/checkout ke liye hai. Matlab admin “PLP” tick kar sakta hai, lekin storefront par koi route nahi hai jo usse padhe — woh doc me bhi likh diya (§8.5) taaki aage jab PLP banana ho toh pata rahe exact wahi pattern follow karna hai jo PDP controller use karta hai. -->

nothing will be odne on names eb=verything will be basing on id offer be assigned id and fetch and display also basing on id or product id 