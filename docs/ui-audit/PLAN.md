# UI revamp: gyaanstore selling patterns, UrbanNook identity

Branch `feat/ui-revamp-gyaan-patterns` (from `main` @ `c57fe1d`). This change is client-only: it doesn't touch the server, database, deploy, cache, secrets or admin.

## What already existed (so we didn't rebuild it)
- Card: % OFF pill on the image, `DIWALI SALE` tag, 2-line title, price + struck MRP, real stock dot (`UnProductCard`).
- PDP: big price, % OFF, "You save", real stock "Only N left", image swatches, "Shop with peace of mind" trust block (24-48h dispatch, partial COD, free replacement*, pan-India), WhatsApp questions, sticky ATC bar (mobile).
- Festive on/off and end date: admin → Site Campaign (server clock). No code edits are needed to switch it off.

## Done (P0/P1)
| # | Change | Files | Pages affected |
|---|---|---|---|
| 1 | Denser grid (`gap-3 md:gap-4`), tighter card padding | `UnProductCard.jsx`, `AllProductsPage.jsx`, `CategoryPage.jsx` | Shop All, categories, PDP "other variants", Home, Blog |
| 2 | Sold-out items moved to the end of lists (stable sort) | `AllProductsPage.jsx`, `CategoryPage.jsx` | Shop All, categories |
| 3 | PDP "Inclusive of all taxes" line (prices are GST-inclusive; the order page already says "Incl. GST") | `ProductDetailPage.jsx` | PDP |
| 4 | Sticky ATC bar on desktop too (Add to Cart + Buy Now); Help button lifts above it | `ProductDetailPage.jsx`, `HelpWidget.jsx` | PDP |
| 5 | Home festive offer band under the hero: "Diwali Sale · Up to N% OFF", where N is computed from real MRP/price of in-stock variants; admin countdown; Shop CTA. It renders nothing without a live campaign | `festive/FestiveOfferBand.jsx` (new), `HomePage.jsx` | Home |
| 6 | Home "Shop by category" quick tiles near the top (real categories only, crawlable links) | `HomePage.jsx` | Home |

## Done, round 2: full gyaanstore layout, UrbanNook brand
| # | Change | Files | SEO note |
|---|---|---|---|
| 7 | Collection filter sidebar (desktop) / drawer (mobile): Availability with counts, Price from–to, result count, "Clear filters"; grid 2 / 3 / 4 cols | `component/ShopFilters.jsx` (new), `utils/shopFilters.js` (new), `AllProductsPage.jsx`, `CategoryPage.jsx` | Filters are client state, **not** URL params, so there are no duplicate indexable URLs. SSR/SSG still renders the full list |
| 7b | Shop All lists **one card per sellable variant** (same `toItems` as category pages, now in `utils/shopItems.js`), so Availability counts are per variant. They were per product before, which showed "Out of stock (0)" while 6 variants were sold out | `utils/shopItems.js` (new), `AllProductsPage.jsx`, `CategoryPage.jsx` | Each card links to its variant URL (more crawlable links) |
| 7c | Grid order is **grouped by product** (all Brake Caliper variants together); sold-out items go last. This replaces the round-robin | `utils/shopItems.js` | none |
| 7d | Shop All pills come from `GET /categories` (the real category / collection / series pages, indexable only) and link to those pages; labels shared with the header (`CATEGORY_LABEL` in `utils/categoryUrl.js`) | `AllProductsPage.jsx`, `NewHeader.jsx`, `utils/categoryUrl.js` | Crawlable links to every indexable category page |
| 7e | Gyaanstore-style sale bar: shown whenever the campaign is live with a countdown, even with no admin messages (theme headline "Diwali Sale" + real "Up to N% OFF" + timer + Shop now). Before, the timer was a small chip in the right corner | `NewsTicker.jsx`, `useSiteCampaign.js` (`saleTitle`), `utils/festiveDeals.js` (new) | none |
| 8 | "SOLD OUT" pill on the card image (replaces % OFF when sold out) | `UnProductCard.jsx` | none |
| 9 | PDP: boxed category chip, "UrbanNook Assured" badge (tooltip = real policies only), green in-stock box | `ProductDetailPage.jsx` | H1 unchanged |
| 10 | PDP: image swatches with labels + selected design name (removed in `bf5a8b90`, restored gyaanstore-style). Each tile is a real `<Link>` to the variant URL; a click swaps in place | `ProductDetailPage.jsx` | Adds crawlable internal links to every variant |
| 11 | Desktop sticky bar: variant name + price with struck MRP | `ProductDetailPage.jsx` | none |
| 12 | Festive band is now a large hero (Anton headline, "Up to N% OFF", top-3 real deals photo stack). It stays **below** the hero carousel: campaign data arrives client-side, so putting it at the top would cause CLS | `festive/FestiveOfferBand.jsx` | `<h2>`, lazy images with alt text |

Verified with lint (no new issues vs `main`; compared via `-f json`), `vitest` (50/50), `vite build` and the SSR build.

## Done, round 3 (checked with Playwright screenshots on local data)
| # | Change | Files |
|---|---|---|
| 13 | Tag badge (Trending/Bestseller) only on a product's first card, no longer on all 10 pen-stand colours | `utils/shopItems.js`, shop pages |
| 14 | Header dropdowns (gyaanstore-style, UrbanNook ink/red/mono): Anime → by type + by series; single-product categories (Lamps) → their designs; others → products; featured image; "View all". Hover, keyboard focus and Esc. Every link is a real page | `component/layout/NavDropdown.jsx` (new), `utils/navMenu.js` (new), `NewHeader.jsx` |
| 15 | Cart drawer slides in smoothly. It used to mount already open; measured 1440→1010px over ~300ms | `CartDrawer.jsx` |
| 16 | Sale bar rotates **every live offer**: admin messages, or otherwise the theme headline + live combos ("Buy 3 Katanas · FREE Triple Stand") + public coupons ("₹100 off on orders above ₹1,000"). Template labels like `{save}` are skipped | `utils/saleBarMessages.js` (new), `NewsTicker.jsx` |
| 17 | Category page pills use the same labels as the header | `CategoryPage.jsx` |

## Done, round 4 (reference: the3dprintingstore.in)
| # | Change | Files |
|---|---|---|
| 18 | Store promises (owner-approved, must stay true): "Lowest prices since launch", "100% happiness guaranteed · free replacement if it arrives damaged", plus the existing evergreen lines. One constant feeds the ticker, the sale bar and the festive band | `utils/storePromises.js` (new), `NewsTicker.jsx`, `FestiveOfferBand.jsx` |
| 19 | Sale bar links fixed: combo destination = admin link → first offer choice → primary product. Combos with no destination ("Anime Figures" has none in admin) are left out instead of opening a wrong page | `utils/saleBarMessages.js` |
| 20 | Need-led sale copy: the band leads with "Gifts for every fan on your list, from katanas to lamps." and the CTA "Find a gift". Copy lives in `THEME_COPY` | `useSiteCampaign.js`, `FestiveOfferBand.jsx` |
| 21 | Sort: Our top picks / Trending / Price ↑ / Price ↓ / Biggest discount / New arrivals (sold-out always last; client state, no URL params) + quick price bands (Under ₹500 … Over ₹2,000) | `utils/shopFilters.js`, `ShopFilters.jsx`, shop pages |

## Done, round 5: sorts driven by real DB data
| # | Change | Files |
|---|---|---|
| 22 | **Server** `GET /products` now also returns `createdAt` (it was stripped before) and `soldRecent`: units sold in the last 30 days per product and per variant, from orders with status PAID / CONFIRMED / PROCESSING / SHIPPED / DELIVERED. Read-only aggregate; cached with the response (apiCache, 10 min, TTL unchanged). Admin is unaffected: no schema change, no writes, response fields are additive | `server/src/utils/productSignals.util.js` (new), `server/src/controller/product.controller.js` |
| 23 | Sorts: Trending = `soldRecent` of the card's variant; New arrivals = `createdAt`; Our top picks = admin `priority`, then admin tags. Price and discount use the real `variantPrice` / `variantMrp` | `client/src/utils/shopFilters.js` |
| 24 | Single-product category menus (Lamps) show a 2-column design grid with thumbnails instead of one big image | `navMenu.js`, `NavDropdown.jsx` |

## Done, round 6: mobile-first fixes, demand chips, /offers (Playwright-verified at 390px)
| # | Change | Files |
|---|---|---|
| 25 | Price boxes accept digits only (typing "-2000" gives 2000); min > max is swapped automatically | `utils/shopFilters.js` (`sanitizePrice`, `priceBounds`), `ShopFilters.jsx` |
| 26 | Mobile toolbar fits on one line (measured 40px): compact Filter button, nowrap count, custom `SortMenu` (a native select is forced to 16px on phones by the iOS anti-zoom rule) | `component/SortMenu.jsx` (new), `ShopFilters.jsx`, shop pages |
| 27 | Pills show that they scroll: edge fade + tappable arrow, only on the side with more | `component/ScrollRow.jsx` (new), shop pages |
| 28 | Sort "Most bought" (all-time units) next to "Trending now" (30 days); Category filter on Shop All, so "most bought in Anime" works. Server also returns `soldTotal` | `productSignals.util.js`, `utils/shopFilters.js`, `ShopFilters.jsx` |
| 29 | Cards get a white "★ Most bought" / "🔥 Trending now" chip, only for the top real sellers (no data = no chip). There is no "most viewed" data, so no chip for it | `utils/shopFilters.js` (`demandChips`), `UnProductCard.jsx` |
| 30 | **`/offers` page**: every live combo, sortable (top picks / trending / price). The card opens the same chooser sheet → the same add-to-cart logic → goes straight to `/checkout` (verified: 3 items, promotion savings −₹449, Prepaid / Partial COD). Linked from the header, the mobile menu and the sale bar | `pages/shop/OffersPage.jsx` (new), `utils/offerSort.js` (new), `AppRoutes.jsx`, `pages/index.js`, `NewHeader.jsx`, `ComboOfferSection.jsx` (`onAdded`, better image fallback), `ComboBuilderSheet.jsx` (`onAdded`, 2 columns on phones) |
| 31 | SEO note for the owner: add `/offers` to `ssg.mjs` static routes | `SEO_ANALYTICS_HANDOFF.md` |

## Done, round 7: nav order, mobile menu, coupon entry, mobile speed
| # | Change | Files |
|---|---|---|
| 32 | Nav: **Offers right after Shop All** (desktop and mobile) | `NewHeader.jsx` |
| 33 | Mobile menu has the desktop dropdowns as accordions (name opens the page, chevron expands series/designs/products); the menu scrolls when expanded | `component/layout/MobileNavAccordion.jsx` (new), `NewHeader.jsx` |
| 34 | Checkout: the "Apply coupon" entry point (code box modal) shows **only when coupons exist for this cart**, from the same query as the coupon tickets (one request) | `CheckoutPage.jsx` |
| 35 | Mobile speed: cards reveal once on touch screens (no blank tiles or re-renders on flick-scroll), `content-visibility:auto` on grid cards, async image decode; festive canvas effects (sparkles, fireworks, click burst) start after load + idle; checkout code preloaded on /offers | `RevealCard.jsx`, `UnProductCard.jsx`, `festive/FestiveEffects.jsx`, `OffersPage.jsx` |

Measured (prod build, 390px, 4x CPU, CORS-proxied local API): festive layer's extra load cost went from about 2× to about 10% (median of 3: 1.9 s vs 1.7 s of long tasks); Add → checkout ready went from 1.8–2.7 s to 1.1 s; no long tasks while idle on checkout. Analytics tags (~400 ms) are the largest third-party cost; suggestion filed in `SEO_ANALYTICS_HANDOFF.md`.

Coupon sync: combo promotions are priced by the server at checkout ("Promotion savings"), so an offer picked on /offers shows there automatically (verified: −₹449). Coupons are applied at checkout from the same live list that /offers shows.

## Done, round 8: cart offer groups, one-open mobile menu, distinct home band
| # | Change | Files |
|---|---|---|
| 36 | Cart groups each applied offer with what unlocked it: "✓ Offer applied · Buy 2 Katanas: FREE Stand · Save ₹449 → Because you added: … → You get: …", then "Also in your cart". Offers still in progress stay in the banner list, so nothing shows twice | `utils/cartOfferGroups.js` (new), `CartDrawer.jsx` |
| 37 | **Server** cart promotion display returns `triggerProductIds` per offer (from its condition tree; display only, additive) | `server/src/controller/promotion.controller.js` |
| 38 | Cart drawer scroll fixed (`min-h-0` + `overscroll-contain` on the flex scroller); footer compact on phones; "Avail coupons at checkout" badge shows only while a public coupon is live | `CartDrawer.jsx` |
| 39 | Mobile menu: only one section open at a time; tighter rows; designs in 2 columns | `MobileNavAccordion.jsx`, `NewHeader.jsx` |
| 40 | Home band is now "Biggest price drops" (real markdowns, no second countdown), so it no longer repeats the Diwali Offers section below | `FestiveOfferBand.jsx`, `useSiteCampaign.js` (`bandTitle`) |

## Done, round 9
| # | Change | Files |
|---|---|---|
| 41 | Cart offer group: solid green header, white "Save ₹X" pill, and the engine's real rule under the title (e.g. "40% off") | `CartDrawer.jsx` |
| 42 | Home: "Biggest price drops" and "Diwali Offers" merged into **one section**: sale header (Up to N% OFF, one countdown, See all offers / Find a gift, top-3 real markdowns) + the combo tiles below. `ComboOfferSection` takes a `lead`, used only in festive mode | `FestiveOfferBand.jsx`, `ComboOfferSection.jsx`, `FestiveSections.jsx`, `HomePage.jsx` |

## Done, round 10
| # | Change | Files |
|---|---|---|
| 43 | Shop cards show the product's **live offer** in one loud red chip, worded for its role: reward "Get it FREE with 2 Katanas" / "₹150 Off with a Lamp", trigger "Buy & get Single or Double Stand FREE", same-product "Buy 2: Save ₹249". No offer = the Diwali Sale tag as before | `utils/productOfferLines.js` (new), `UnProductCard.jsx`, shop pages |
| 44 | Offer cards no longer show "Save {save}": unfilled admin templates fall back to the server-resolved `benefit` | `ComboOfferSection.jsx` |
| 45 | Cart offer header: theme colours only (ink + red check), no gold | `CartDrawer.jsx` |

Admin to-do: **"Buy 2 Pen Stands at ₹480"** is set up as *40% off one of the two stands* (₹299 + ₹179 = ₹478), so the name doesn't match the rule. Rename it (e.g. "Buy 2 Pen Stands, 2nd at 40% OFF") or change the reward to a fixed bundle price of ₹480.

Admin to-do: give the "Anime Figures" promotion a CTA link or product, and it will appear in the sale bar.

## Where we are better than gyaanstore (keep it)
- Real MRP and real % off. Their Shopify `compare_at_price` is inflated (₹1,149 vs ₹4,499 = 74%); ours comes from `variantMrp`.
- Real stock ("Only N left" from `variantQuantity`). They show "29 people viewing now", which isn't backed by data.
- One indexable URL per variant (`/product/:id/:sku`), linked from grids, swatches and the menu.

## Next (not done; needs a decision)
- Sale end date: admin → Festive campaign → set end to **8 Nov 2026** (prod and staging separately; it's data, not code).
- Sort dropdown (Featured / Price / Discount) once the catalogue grows. Common on Indian D2C stores (Souled Store, Bewakoof).
- Quick add on cards (desktop hover) for single-variant products.
- Cart: "Add 1 more katana to unlock FREE stand" progress, from the combo promotion rules (`PromotionUnlockSheet` already computes this; surface it in the drawer header).
- P1: Filter sidebar (availability/price). Price sort was deliberately removed earlier because the catalogue is small (see comment in `AllProductsPage.jsx`). Revisit when the catalogue grows.
- P2: Cart nudge "Add 1 more katana for a free stand", built from the live promotion's real rule (`OfferProgress` / promotions API).
- P2: Larger category tiles with counts; review the hero carousel vs a festive hero image (needs design assets).
- P3: Remove dead `component/ProductCard.jsx` (not imported anywhere).
- Visual QA at 390 / 768 / 1440px in a browser (no browser tooling was used in this pass).

## Considered and rejected
- "N people viewing now", "X sold": no real data, so it would be fake urgency.
- gyaanstore's white theme, fonts and copy: we keep UrbanNook's ink/paper, red accent and mono labels.
- Hard-coded sale end date: the admin campaign already owns it.
- Re-adding price sort: removed on purpose earlier (see above).
