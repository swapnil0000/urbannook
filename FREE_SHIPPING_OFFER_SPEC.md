# Free Shipping Offer + Cross-Sell Banner — Implementation Spec

A complete, framework-agnostic guide to how the "add product X → unlock free
shipping" offer works end-to-end, so it can be rebuilt on another site. Names/
paths below are from the UrbanNook stack (Express + MongoDB backend, React +
RTK Query + Redux frontend, separate Admin panel), but the design is portable.

---

## 1. Concept in one paragraph

An admin defines a **combo**: "on product **A**'s page, show a banner that
recommends adding product **B**." On the storefront, product A's PDP (and the
checkout page) shows that cross-sell banner. **Free shipping is granted only
when the cart actually contains the combo** — i.e. **both A and B are in the
cart** (checked authoritatively at order time). The banner is a *marketing
nudge*; the money rule is a separate server check. There is also a legacy
plain "cart subtotal ≥ threshold" fallback and a generic cart-rule engine —
the final unlock is an **OR** of all three (see §5).

Two things are deliberately kept separate:
- **Display** (which banner to show, where) — driven by the `banners[]` config.
- **Eligibility** (whether shipping is actually free) — a server-side rule on
  the real cart contents. Never trust the client for this.

---

## 2. Architecture

```
┌──────────────────┐        writes         ┌───────────────────────────┐
│   ADMIN PANEL    │ ────────────────────► │   MongoDB collection      │
│ (own server+UI)  │                       │   "freeshippingoffers"    │
└──────────────────┘                       │   (single settings doc)   │
                                           └───────────────────────────┘
┌──────────────────┐        reads only              ▲
│   STOREFRONT     │ ───────────────────────────────┘
│ (own server+SPA) │
└──────────────────┘
```

- **One shared MongoDB collection**, `freeshippingoffers`, holding **one
  singleton settings document**.
- **Admin owns all writes** (CRUD on the offer + banners).
- **Storefront only reads** it (public GET endpoints + an internal eligibility
  check used at checkout/payment).
- Both apps declare the **same Mongoose schema** so they read/write an
  identical shape. (If your new site is one app, you just have one schema and
  both admin + storefront routes in the same server.)

---

## 3. Shared data model (single source of truth)

One singleton document. `banners[]` is an array of combo definitions.

```js
// bannerSchema (subdocument)
{
  sourceProductId:      String,  // required — the PDP this banner shows on (product A)
  recommendedProductId: String,  // required — the product the CTA adds (product B)
  text:                 String,  // required — banner headline, e.g. "Add a pen stand, ship FREE"
  ctaLabel:             String,  // default "Add to Cart" — button label
  isActive:             Boolean, // default true — per-banner on/off
}

// freeShippingOfferSchema (the singleton)
{
  thresholdAmount: Number,   // legacy cart-value fallback (₹). default 0
  isActive:        Boolean,  // MASTER on/off for the whole feature. default false
  banners:         [bannerSchema],
}
```

Notes:
- **`isActive` (top-level)** is the master switch. If false, nothing applies.
- **`thresholdAmount`** is the older "subtotal ≥ X → free" rule. Still honored
  as a fallback (see §5). If you want *pure* combo behavior on the new site,
  set it to a very high number or drop it from the eligibility OR.
- Product IDs are your own business product IDs (strings), not Mongo `_id`s.

---

## 4. THE RULE (eligibility) — the money logic

This is the single most important function. It runs **on the server, at order
time**, against the **real cart contents**.

```js
// utils/freeShippingOffer.util.js

// Raw config for display + the threshold fallback.
export const getFreeShippingConfig = async () => {
  const offer = await FreeShippingOffer.findOne()
    .select("isActive thresholdAmount").lean();
  return {
    isActive: offer?.isActive ?? false,
    thresholdAmount: offer?.thresholdAmount ?? 0,
  };
};

// COMBO rule: free shipping only if the cart contains BOTH the source and the
// recommended product of SOME active banner. Not a cart-value rule — a random
// expensive product must NOT unlock free shipping.
export const isFreeShippingEligible = async (cartProductIds = []) => {
  const offer = await FreeShippingOffer.findOne()
    .select("isActive banners").lean();
  if (!offer?.isActive) return false;

  const ids = new Set((cartProductIds || []).map(String));
  return (offer.banners || []).some(
    (b) =>
      b.isActive &&
      ids.has(String(b.sourceProductId)) &&
      ids.has(String(b.recommendedProductId)),
  );
};
```

**Design decision that caused a real bug earlier:** originally eligibility was
*only* `subtotal > thresholdAmount`, which ignored *which* products were in the
cart — so any expensive product unlocked free shipping. The fix was this
combo check. Keep eligibility tied to **cart contents**, not cart value, unless
value-based is genuinely what you want.

---

## 5. Where the rule is applied (order/payment path)

At order creation (both logged-in and guest paths), shipping is zeroed only if
free shipping is unlocked. The unlock is an **OR** of three independent signals:

```js
// controller/rp.payment.controller.js  (same block in auth + guest paths)

const realShippingAmount = shippingResult?.total_charges || 179; // actual carrier rate

const freeShippingConfig = await getFreeShippingConfig();
const thresholdEligible  = freeShippingConfig.isActive
                        && subtotal >= freeShippingConfig.thresholdAmount;

const freeShippingUnlocked =
     (await isFreeShippingEligible(items.map((i) => i.productId)))  // (1) combo pair
  || cartRuleResult.freeShipping                                    // (2) generic cart-rule engine (separate system)
  || thresholdEligible;                                             // (3) plain subtotal ≥ threshold

const chargedShippingAmount = freeShippingUnlocked ? 0 : realShippingAmount;
```

For a fresh site you likely only need signal **(1)** (the combo). Signals (2)
and (3) are pre-existing systems OR'd in for backward compatibility.

### 5a. CRITICAL: real vs charged shipping split (COD safety)

Keep **two** shipping numbers, never collapse them into one:

- **`realShippingAmount`** — the actual carrier rate. **Always** used as the
  basis for the COD upfront advance (a fraud/RTO-risk deposit).
- **`chargedShippingAmount`** — what the customer's order total reflects; `0`
  when free shipping applies.

```js
finalAmount      = subtotal + chargedShippingAmount - discountAmount;   // customer pays this
// customer-facing snapshot uses the charged (possibly 0) amount:
orderItems.forEach(i => { i.productSnapshot.shipping = String(chargedShippingAmount); });
// COD advance MUST use the REAL rate, never the zeroed one:
const codPartialAmount = isCOD
  ? Math.min(Math.ceil(realShippingAmount) * 2, Math.ceil(finalAmount))
  : 0;
// internal order record keeps the real carrier amount for accounting:
shippingInfo.amount = realShippingAmount;
```

If you zero a single shared shipping variable, the COD advance silently drops
to 0 (or balloons) — this split prevents that.

---

## 6. Admin side

### 6a. Model
Same schema as §3 (`server/models/freeShippingOffer.model.js`). Admin writes it.

### 6b. Controllers (`getOrCreate` singleton pattern)
```js
async function getOrCreateOffer() {
  let offer = await FreeShippingOffer.findOne();
  if (!offer) offer = await FreeShippingOffer.create({ thresholdAmount: 0, isActive: false, banners: [] });
  return offer;
}
```
Endpoints:
- **getFreeShippingOffer** → returns the whole singleton (creates it on first read).
- **updateFreeShippingConfig** → sets `thresholdAmount` and/or `isActive` (validates `thresholdAmount` ≥ 0).
- **addBanner** → pushes a banner (requires `sourceProductId`, `recommendedProductId`, `text`).
- **updateBanner** (`:bannerId`) → partial update of a subdoc via `offer.banners.id(bannerId)`.
- **deleteBanner** (`:bannerId`) → `banner.deleteOne(); offer.save()`.

### 6c. Routes + RBAC
```
GET    /free-shipping-offer                     requirePermission("products","read")
PUT    /free-shipping-offer/config              requirePermission("products","write")
POST   /free-shipping-offer/banners             requirePermission("products","write")
PUT    /free-shipping-offer/banners/:bannerId   requirePermission("products","write")
DELETE /free-shipping-offer/banners/:bannerId   requirePermission("products","delete")
```
(We reused the existing `"products"` RBAC resource since our permission system
uses a free-form resource map. Use whatever your admin auth uses.)

### 6d. Admin UI
A single settings page:
- Toggle **Active** (master `isActive`) + a **threshold** input (optional).
- A **banner list manager**: each row = source-product picker, recommended-
  product picker, headline text, CTA label, active toggle, save/delete. Product
  pickers are plain `<select>`s populated from the product catalog (catalog is
  small). Add/edit/delete call the endpoints above and re-fetch the singleton.

---

## 7. Storefront side

### 7a. Server: read-only endpoints
```
GET /free-shipping-offer                 → { isActive, thresholdAmount }        (config; for display)
GET /free-shipping-offer/banner/:productId → the active banner whose sourceProductId === productId, or null  (for PDP)
GET /free-shipping-offer/banners         → all active banners                    (for checkout)
```
- `/banner/:productId` uses a `$elemMatch` projection to return just the one
  matching active banner (first match).
- `/banners` returns the full active list; the client decides which one to show
  on checkout (checkout isn't tied to one PDP).
- Eligibility is **not** a public endpoint — it's computed server-side at order
  time (§5). The client mirrors it only for *preview* (§7d), never as the source
  of truth.

### 7b. Client: data layer (RTK Query)
```js
getFreeShippingOffer:        () => "free-shipping-offer",
getFreeShippingBanner:       (productId) => `free-shipping-offer/banner/${productId}`,
getAllFreeShippingBanners:   () => "free-shipping-offer/banners",
```

### 7c. Client: the cross-sell banner component (`FreeShippingBanner`)
Used on **both** the PDP (`variant="dark"`) and checkout (`variant="light"`,
`showQuantityStepper`). Same add-to-cart logic; only theme differs.

Key behaviors:
1. `useGetFreeShippingBannerQuery(productId)` → the banner config for this PDP.
2. Fetch the **recommended product** (`recommendedProductId`) to render its
   image / price / variants.
3. **"Added" state is derived from the actual cart (Redux `state.cart.items`),
   NOT a local boolean.** A local "I just added it" flag resets when the
   component unmounts (navigating PDP→checkout→back) and the banner "forgets".
   Scan the cart for the recommended product on every render instead.
4. CTA adds the recommended product (logged-in → `addToCart` API + refetch;
   guest → Redux `addItem`). On success: fire a celebration (confetti) + show a
   progress bar filling to 100% + swap CTA to "Free Shipping Unlocked!".
5. Variant swatches use a name→color map (same as the PDP), auto-cycling until
   the user picks one; after adding, they stay showing the chosen variant.

### 7d. Client: checkout integration (`CheckoutPage`)
- **Which banner to show on checkout** — show the upsell only when there's
  something left to upsell: cart contains a banner's `sourceProductId` **but
  not** its `recommendedProductId`:
  ```js
  const match = banners.find(
    (b) => cartIds.has(b.sourceProductId) && !cartIds.has(b.recommendedProductId),
  );
  ```
  (Combo complete → nothing to nudge; source absent → offer doesn't apply.)
- **Shipping preview** mirrors the server combo rule so the "Free" label matches
  what will actually be charged:
  ```js
  const isFree = offerConfig?.isActive && banners.some(
    (b) => cartIds.has(b.sourceProductId) && cartIds.has(b.recommendedProductId),
  );
  const shippingAmount = isFree ? 0 : realAmount; // keep realAmount around for COD
  ```
- **Product-ID extraction from cart items** (client): `i.mongoId || i.id?.split(":")[0]`
  (cart line ids are `"<productId>:<variant>"`).
- **Savings display**: `totalSavings = subtotal + realShippingAmount − totalToPay`
  (the freed shipping shows up automatically). When shipping is free, the UI
  strikes through the real shipping amount and shows "FREE", plus a green
  "Free shipping unlocked" savings banner.
- **Animation-safe unmount**: when the combo completes on checkout,
  `checkoutBannerProductId` flips to null in the same render — hold the last id
  for ~1.9s so the banner's fill/confetti/"unlocked" sequence finishes before it
  disappears.

---

## 8. End-to-end flow

```
Admin: set isActive = true, add banner { source: LAMP, recommended: PENSTAND, text, cta }
                                   │
Storefront PDP (LAMP):  GET /free-shipping-offer/banner/LAMP  → banner
   → render cross-sell card recommending PENSTAND
   → user taps CTA → PENSTAND added to cart (confetti, "unlocked")
                                   │
Checkout:  GET /free-shipping-offer/banners
   → if LAMP in cart but PENSTAND not → still show upsell
   → shipping preview: LAMP && PENSTAND in cart ? Free : ₹rate
                                   │
Place order (server):  isFreeShippingEligible([...cartProductIds])
   → LAMP && PENSTAND present ? chargedShipping = 0 : realShipping
   → finalAmount = subtotal + chargedShipping − discount
   → COD advance always uses realShipping (never 0)
```

---

## 9. Key decisions & gotchas (learn from our mistakes)

1. **Eligibility = cart contents, not cart value.** The original threshold-only
   rule let any expensive product unlock free shipping. Combo check fixed it.
2. **Never trust the client for eligibility.** Client mirrors it for preview
   only; the authoritative check is server-side at order time.
3. **Keep `realShippingAmount` and `chargedShippingAmount` separate** so free
   shipping never corrupts the COD advance / internal accounting.
4. **Derive "added"/"in cart" state from the real cart store**, never a local
   component flag — it survives navigation/unmount.
5. **Singleton config doc** with a `getOrCreate` pattern avoids a separate
   "not configured" state.
6. **Product IDs are business IDs (strings)**, compared with `String()` coercion
   on both sides to avoid type mismatches.
7. **Banner ≠ rule.** You can show/hide/tweak banners freely without touching
   the money logic, and vice versa.

---

## 10. Rebuild checklist (minimum viable)

Backend:
- [ ] `FreeShippingOffer` singleton schema (`isActive`, `banners[]`; threshold optional).
- [ ] Admin CRUD: get/update-config, add/update/delete banner (auth-gated).
- [ ] Public reads: config, banner-by-productId, all-active-banners.
- [ ] `isFreeShippingEligible(cartProductIds)` combo check.
- [ ] Order path: `chargedShipping = eligible ? 0 : realShipping`; real/charged split for COD.

Frontend:
- [ ] Data hooks for the 3 public reads.
- [ ] Cross-sell banner component (PDP + checkout), "added" derived from cart.
- [ ] Checkout: pick upsell banner (source in cart, recommended not), mirror
      eligibility for the shipping/"Free" preview + savings line.

API contract summary (storefront):
```
GET /free-shipping-offer                     → { isActive, thresholdAmount }
GET /free-shipping-offer/banner/:productId   → banner | null
GET /free-shipping-offer/banners             → banner[]
```
API contract summary (admin):
```
GET    /free-shipping-offer
PUT    /free-shipping-offer/config            body: { thresholdAmount?, isActive? }
POST   /free-shipping-offer/banners           body: { sourceProductId, recommendedProductId, text, ctaLabel?, isActive? }
PUT    /free-shipping-offer/banners/:bannerId body: (any subset of the above)
DELETE /free-shipping-offer/banners/:bannerId
```
```
