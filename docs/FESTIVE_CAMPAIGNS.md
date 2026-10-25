# Festive campaigns (Diwali theme, decorations, offers section)

Admin: **Operations Hub -> Festive** writes `siteCampaigns` (admin repo
`server/models/siteCampaign.model.js`, mirrored read-only in
`server/src/model/siteCampaign.model.js`). Offer cards are ordinary Promotions
(placement "Homepage combo card" + `homeCard` fields) edited on the Promotions
page - prices are never typed, they come from the real promotion engine.

## Who decides what is live
- `GET /site-campaign/active` - the storefront server's clock vs the admin's
  Asia/Kolkata window + the enabled switch. Never cached. Expired or disabled =
  `campaign: null` = the normal site (no theme flag, decorations, festive ticker
  messages or festive section copy). The browser only runs a convenience timer
  (server-skew corrected) and re-asks the server.
- Messages/sections/page line linked to a promotion show only while that
  promotion is live.
- Preview: `GET /site-campaign/preview/:id?key=...` (random per-campaign
  `previewKey`, admin-only, constant-time compare), opened via
  `?festivePreview=<id>.<key>`; that tab only, ignores dates.

## Storefront pieces
`hooks/useSiteCampaign.js` (one request per load; `can(effect)` gates by
element / page type / device), `component/festive/*` (lights, torans, diyas,
sparkles, fireworks canvas, rangoli, countdown, section decor, gifting section),
`component/ComboOfferSection.jsx` (offers zone, 4:5 media).
Colors are site tokens only (`--gl-*`); there is no festive-only palette.
Checkout/payment pages never get decorations.

## Phuljadi progress animation

A sparkler-style progress bar that replaces the plain progress bar (`FreeShippingStrip`) in the cart drawer,
mini cart and product page **while a campaign is live**. Admin → Operations Hub → Festive → campaign →
*Phuljadi progress animation*: enable, pick the **promotion** it represents, intensity (low/medium/high),
locations (cart drawer / mini cart / product pages) and phone visibility. Opt-in (off by default).

* **Data:** `POST /promotions/display/cart` now returns `progress` and `rewardLabel` on every promotion entry
  (`promotionPresentation.service.js → buildPromotionProgress`). The Phuljadi asks for its promotion via
  `previewPromotionIds`, so it also works with an empty cart. `progress.complete` is the real engine result
  (`qualifying`); the numbers never unlock anything by themselves.
  * amount (`cartSubtotal >=`) → continuous fill; quantity (product / product list / category / cart quantity)
    → one segment per required item (≤ 12); several conditions → one segment per tracked condition.
  * Only matching products count. If the quantities are met but another condition fails (e.g. "exactly 2"
    with 3 in the cart) it caps at 98% and shows "adjust your cart" instead of falsely completing.
  * `noun` ("Katana") is looked up from the condition's product names for the promotion the Phuljadi asks for.
* **Celebration:** one SVG starburst + "Free … Unlocked!" only on an incomplete → complete change while the
  component is mounted (not on load/refresh). Reduced-motion users get no sparks or burst.
* **Expiry / disable:** the public campaign payload has `phuljadi: null` when the campaign is off or expired,
  the switch is off, or the chosen promotion is no longer live — the original bar is shown again automatically.
  Checkout/payment pages keep the original bar.
* Files: `client/src/component/festive/{Phuljadi,OfferProgress}.jsx`, `siteCampaign` model/controller in both repos,
  admin `FestiveCampaigns.jsx`.

## Offer tile → variants page → offer sheet → checkout reminder

* **Tile click:** a homepage offer tile opens the plain variants page `/products/<primaryProductId>` (only that
  product's variants — no offer banner, no other products) and records the shopper's interest in `localStorage`
  (7 days). `primaryProductId` = admin's *Primary product* (Admin → Promotions → home card), else the first product
  in the offer's condition (both come from `GET /promotions/display/home`).
* **After adding to the cart:** the existing offer bottom sheet (`PromotionUnlockSheet`) opens by itself when the add
  puts the shopper one step from an offer, showing the offer and the eligible products to add.
* **Checkout reminder:** on `/checkout` (`OfferCheckoutReminder`), only if the shopper opened that offer **and added
  at least one of its products**, the offer is still live, and no combination of it is complete yet, the combo sheet
  opens in *reminder* mode: items already in the cart fill their slots (locked, never added twice) and only the
  missing ones are asked for. "No thanks — continue without offer" (or ×, Esc, backdrop) dismisses it for the session;
  it never blocks or changes payment. Dismissals reset when the cart is emptied (order done).
* Completion uses the engine for every combination of the offer, not just the tile's own promotion.
* `OfferDetailsSection` (banner + all eligible products with Add to Cart) still exists but is not routed anywhere now.

## Free gifts: confirmation, fulfilment data

* **Confirmation:** when an add completes an offer (e.g. the 2nd katana → free stand) the unlock sheet opens once with
  the "Offer unlocked" moment ("<gift> is added to your order — free!"). Once per offer per cart (an emptied cart resets).
  The cart still shows the "Free gift added" banner.
* **Exact counts keep the ladder exclusive:** "Any 2 / Any 3 / Any 1" katana offers use *exactly* N, so a cart gets one
  stand only — 3 katanas = Triple only (Dual stops applying), 4 = none.
* **Shipping the gift:** a free product is a synthetic ₹0 order line (`isPromotionalGift`). Each order now also stores
  `promotionalGifts[]` = `{productId, variantSku, productName, selectedVariant, quantity, promotionId, promotionName}`
  (both order models). Admin → Orders → order detail shows a "FREE GIFTS TO SHIP" box with product id + SKU above the
  items. For a Mystery Gift the *real* product is listed here for fulfilment; the customer only ever sees "Mystery Gift".

### One free stand only (Dual → Triple switch)
The free stand is never a cart line: it is recomputed from the cart at checkout/payment, so 2 katanas → Dual, and the
moment a 3rd katana is added → Triple replaces it (the order gets one gift line). Guarded three ways: exact-count
conditions, the engine's same-product gift conflict resolution, and `promotionGroup = "katana-stand-ladder"` on the
Dual / Triple / Mystery promotions (priority Triple 7 > Dual 6 > Mystery 5), which makes them mutually exclusive even if
an admin later loosens a condition. The unlock sheet tells the shopper "This replaces your current free … — you get one,
not both." (display model field `group`).

## Explicit free-gift claiming — Phase 1 (backend)

* `server/src/services/giftClaims.service.js`: a `free_product` reward only creates an *entitlement*
  (`promotionId:productId:sku`, derived from the engine's own `freeGifts`, so admin priority / exclusivity /
  `promotionGroup` rules already apply). A claim is valid only if the CURRENT cart still has that entitlement;
  duplicates merge and are capped at the entitled quantity; tampered, expired, or no-longer-eligible claims are rejected.
* `POST /promotions/display/cart` accepts `claimedGifts` and returns `gifts` (claimable / claimed, with the admin's
  reward label + image — never the real product when the image is blank, so a Mystery Gift stays a mystery — plus the real
  product id / SKU / list price) and `invalidGiftClaims` (so the UI can tell the shopper a claimed gift is gone).
* Order creation (logged-in and guest): when the request has a `claimedGifts` array only validated claims become ₹0 lines;
  an invalid claim stops the order with `GIFT_CLAIM_INVALID` (never silently dropped or charged). Without the array
  (older clients) the previous automatic behaviour is kept until Phase 2 ships the claim UI.
* Order item snapshot: `lineType` (`PAID` | `FREE_GIFT`), `originalUnitPrice`, `giftPromotionId`, `giftEntitlementKey`
  on every line; the same SKU can be both a paid line and a gift line. Order-level `promotionalGifts[]` is unchanged.
* Tests: `server/src/__tests__/giftClaims.test.js` (`npm test -- src/__tests__/giftClaims.test.js`).
* Phase 2 (cart claim card, FREE GIFT line, persistence, ineligible notice) and Phase 3 (admin packing checklist) follow.

## Explicit free-gift claiming — Phase 2 (storefront)

- Free products are never auto-added. The cart/offer sheet shows **Claim Free Gift** (`GiftClaimList`);
  claims live in Redux (`cartSlice`, keyed by entitlement `promotionId:productId:variantSku`) and persist
  in localStorage, so they survive refresh and guest → login.
- `useGiftClaims` / `useCartPromotions` send `claimedGifts` with every cart evaluation; the server answers with
  `gifts[]` (claimable / claimed) and `invalidGiftClaims[]`.
- `GiftClaimWatcher` removes a claim the server no longer honours and shows a notice (never converts it to a paid
  line). It also lowers a stored claim quantity when the cart shrinks, so it cannot silently re-claim the larger amount.
- Claimed gift renders in cart/mini-cart/checkout with list price struck, ₹0 and a FREE GIFT badge. A full-price
  purchase of the same SKU stays a separate PAID line.
- Checkout sends `claimedGifts`; a `GIFT_CLAIM_*` error from the server refreshes claims and tells the customer.

## Explicit free-gift claiming — Phase 3 (orders, admin, tests)

- Orders store `lineType` (PAID | FREE_GIFT), `originalUnitPrice`, `giftPromotionId`, `giftEntitlementKey`,
  `isPromotionalGift` per item, plus order-level `promotionalGifts[]` (immutable snapshot).
- Admin (Manage Orders): FREE GIFT badge on rows, packing checklist separates FREE gifts from PAID products;
  Shipmozo gets the list value and a " (FREE GIFT)" name suffix.
- Tests: `server/src/__tests__/giftClaims.test.js` (`npm test -- src/__tests__/giftClaims.test.js`).
- Verified against staging promotions (script, no server): katana ladder 0–4 × mixes, claim/stale-claim sequences,
  pricing independent of claims, 5000-case garbage-claim fuzz — all pass.
- Rule: exactly 2 katanas → Dual, exactly 3 → Triple, 1 → Mystery; 4+ gives no stand (exact-count rule).
- Not verified: browser UI and the Razorpay payment path.
