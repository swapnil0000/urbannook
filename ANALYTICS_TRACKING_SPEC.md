# UrbanNook Event-Tracking & Measurement Specification

**Owner:** Analytics Engineering · **Audience:** CTO, Growth/Marketing · **Stack:** React + Vite + Redux + React Router 7, Razorpay, GTM (`GTM-XXXXXXX` placeholder), Meta Pixel (`fbq`), GA4 via `dataLayer`. Analytics gated by `VITE_ENABLE_ANALYTICS`. **Regulatory regime: India DPDP Act 2023** (not GDPR/CCPA).

> Generated from a full-site audit: 466 candidate tracking points across 10 subsystems → synthesized → adversarial completeness review → this spec.

---

## 1. Executive Summary

UrbanNook currently fires **7 GA4 ecommerce events** (`view_item`, `add_to_cart`, `remove_from_cart`, `view_item_list`, `begin_checkout`, `purchase`, `add_to_wishlist`) from `client/src/utils/analytics.js`, wired into exactly **three** components (`WishlistButton.jsx`, `CheckoutPage.jsx`, `AllProductsPage.jsx`) with Meta Pixel mirroring. Everything else is dark.

**The core problem: most of the funnel is unmeasurable.** There is no SPA `page_view` (React Router does not auto-fire pageviews, so GA4 collapses the entire app into one session), no login/sign-up tracking, no `select_item` from lists, no checkout sub-steps (`add_shipping_info`/`add_payment_info`/payment method), no coupon events, no error/exception capture, no server-side conversion firing from the Razorpay webhook (so ad-blockers silently delete revenue and ROAS is unattributable), **no UTM/click-ID/attribution capture of any kind** (verified: zero `utm_*`/`gclid`/`fbclid`/referrer capture in the client — fatal for an SPA, where the landing query string is destroyed on the first client-side route change), and no consent layer despite a settings toggle that already exists. The GTM container ID is still a placeholder, meaning **zero data is actually being collected in production**.

**Expected outcome of fixing it:** a complete, deduplicated, consented funnel from impression → purchase → retention; accurate ROAS via server-side `purchase` (GA4 Measurement Protocol + Meta CAPI) — contingent on importing ad **spend** (Google Ads / Meta linking; see §5) since the events supply revenue only; checkout drop-off visibility to recover abandoned revenue; merchandising signals to optimize the product grid and homepage; and a **DPDP-compliant** consent posture. Conservatively, recovering attribution + closing checkout leaks is a double-digit-percent lift in measured conversion and a step-change in marketing efficiency.

---

## 2. Current-State Audit

### 2.1 Existing events

| Event | Helper in `analytics.js` | Wired in | Mirror |
|---|---|---|---|
| `view_item` | `trackViewItem` | `ProductDetailPage.jsx` (l.254-265) | Meta `ViewContent` |
| `view_item_list` | `trackViewItemList` | `AllProductsPage.jsx` (l.42-56) | — |
| `add_to_cart` | `trackAddToCart` | `ProductDetailPage.jsx` (l.365/393) | Meta `AddToCart` |
| `remove_from_cart` | `trackRemoveFromCart` | `ProductDetailPage.jsx` (qty→0) | — |
| `add_to_wishlist` | `trackAddToWishlist` | `WishlistButton.jsx` (l.39) | Meta `AddToWishlist` |
| `begin_checkout` | `trackBeginCheckout` | `CheckoutPage.jsx` (l.390-394) | Meta `InitiateCheckout` |
| `purchase` | `trackPurchase` | `CheckoutPage.jsx` (l.659-663, auth only) | Meta `Purchase` |

> **Verified code defects (not just spec gaps):** (a) no `track*` function pushes `{ ecommerce: null }` before its ecommerce push — they push `ecommerce:` directly, so stale `items[]` leaks across events; (b) `pushPixelEvent` gates only on `enableAnalytics`, **not consent**, and the base Pixel script loads unconditionally; (c) the webhook is idempotent on `order.status !== "PAID"` but emits **zero** analytics; (d) no UTM/attribution or server-side MP/CAPI code exists anywhere in the repo.

### 2.2 Top critical gaps

| # | Gap | Where | Impact | Priority |
|---|---|---|---|---|
| 1 | **No SPA `page_view`** | `App.jsx` Router (l.119), `AppRoutes.jsx` | GA4 sees 1 session for the whole app; no traffic/flow/bounce data | **P0** |
| 2 | **GTM ID is placeholder** | `index.html`, `config/env.js` (l.43 `GTM-XXXXXXX`) | All analytics dead in prod | **P0** |
| 3 | **No UTM/click-ID/attribution capture** | client-wide (none exists) | Channel slices un-buildable; CAPI match degraded; UTMs lost on first route change | **P0** |
| 4 | **No consent gate** | `SettingsPage.jsx` toggle (l.184-187) syncs to dataLayer but does not gate GTM/Pixel; Pixel base loads unconditionally | DPDP exposure; toggle is cosmetic | **P0** |
| 5 | **No server-side `purchase`** | `rp.payment.controller.js` `razorpayWebHookController` `payment.captured` (l.382-574) | Ad-blockers delete revenue; ROAS broken; no dedup | **P0** |
| 6 | **No login/sign_up** | `LoginForm.jsx`, `SignupForm.jsx`, `GoogleLoginButton.jsx`, `OTPVerification.jsx` | Auth funnel & identity stitching invisible | **P0/P1** |
| 7 | **No `select_item`** from any list | `AllProductsPage.jsx` (l.130), `WishlistPage.jsx`, home featured | List→detail CTR unknown | **P0** |
| 8 | **No checkout sub-steps** | `CheckoutPage.jsx` step handlers (l.529, l.549), payment method (l.197) | Multi-step drop-off invisible | **P0** |
| 9 | **No payment-failure / payment-error** | `CheckoutPage.jsx` (l.608/672), `rp.payment.controller.js` (l.576-624) | Revenue leak undiagnosable | **P0** |
| 10 | **No `view_cart`** | `CartDrawer.jsx`, `NewHeader.jsx` cart icon | Cart→checkout gap unmeasured | **P0** |
| 11 | **No `search`/`view_search_results`** | absent in client; server `productListing` supports `search` | Discovery dark; no zero-result tracking | **P1** |
| 12 | **`ecommerce` never reset** | all `track*` in `analytics.js` | Stale ecommerce leaks across events → inflated revenue | **P1 (code fix)** |
| 13 | **Web-vitals collected, not sent; no INP** | `performanceMetrics.js`, `main.jsx` (l.12-18) | No perf↔conversion correlation; INP (Core Web Vital) absent | **P1** |
| 14 | **No exception tracking; no soft-404** | `ErrorBoundary.jsx` (l.37-47), `main.jsx` chunk handler (l.60-74), `NotFound` route | Crashes lose sales silently; dead-end routes invisible | **P0** |
| 15 | **No `back_in_stock`/`notify_me`** | OOS PDP (`ProductDetailPage.jsx` l.960/2073) | Highest-intent OOS signal lost; re-engagement undriveable | **P1** |

---

## 3. Event Taxonomy (Master Deliverable)

### 3.1 Parameter dictionary (standardized)

| Param | Type | Scope | Notes |
|---|---|---|---|
| `item_id` | string | item | Always `productId` (never Mongo `_id`). Required on all item events. |
| `item_name` | string | item | `productName` snapshot |
| `item_variant` | string | item | Selected variant/color; never `"N/A"` — omit if truly none |
| `item_category` / `item_category2` | string | item | `productCategory` / `productSubCategory` |
| `item_brand` / price-bucket | string | item | For SKU joins (brand/collection/price-band) |
| `price` | number | item | Effective unit price (INR, rupees not paise) |
| `quantity` | int | item | |
| `discount` | number | item & event (distinct) | Item line-discount vs event cart-discount — set both, never conflate |
| `coupon` | string | item & event | Coupon code; set in both scopes for funnels |
| `index` | int | item | Position in list (0-based) |
| `value` | number | event | Event monetary total (INR). **Must always pair with `currency`** or GA4 drops it from revenue |
| `currency` | string | event | `"INR"` |
| `list_id` / `list_name` | string | event | e.g. `all_products`, `wishlist`, `home_featured`, `cart`, `order_items` |
| `shipping` / `tax` | number | event | Shipping amount / tax (INR) |
| `payment_method` | enum | event | `PREPAID` \| `COD` |
| `transaction_id` | string | event | **Standardized = Razorpay `payment.id` on BOTH client and server** (dedup) |
| `order_id` | string | event | `order.orderId` (uuidv7) |
| `user_id` | string | event | App `userId`. Set on dataLayer + GA4 `user_id`. Hash for CAPI. Guest `purchase` carries server-resolved id. |
| `event_id` | string | event | UUID per conversion for GA4↔Meta↔server dedup |
| `is_guest` | bool | event | Set on every checkout step + purchase so the guest funnel segments end-to-end |
| `status` | enum | event | `attempt` \| `success` \| `failed` \| `timeout` — consolidates triads (OTP, coupon, payment) |
| `description` | string | event | **Reserved `exception` param** — not `error_message`. Truncate <100, scrub PII/URLs |
| `utm_*` / `gclid` / `fbclid` | string | event/session | Captured on first `page_view`, persisted |

**Conventions:** snake_case event + param names; GA4 reserved names for ecommerce; custom events domain-prefixed (`auth_`, `coupon_`, `address_`, `payment_`, `form_`). Consolidate status triads into one event + a `status` param to stay under GA4's 500-event-name ceiling. Register only high-value params as custom dimensions (GA4 caps event-scoped at 50, ≈25 practically queryable). Param names ≤40 chars, values ≤100 chars.

### 3.2 Events by funnel stage

Destinations: **G** = GA4 · **M** = Meta Pixel · **S** = Server (CAPI + GA4 MP).

> **Enhanced Measurement reconciliation:** disable the GA4 Config tag's "Send a page view" (rely on custom SPA `page_view`); disable Enhanced Measurement scroll + site-search (they collide with custom `scroll_depth`/`view_search_results`); leave `session_start`/`first_visit` to GA4 automatic.

#### Awareness
| Event | Trigger | Key params | Dest | Pri |
|---|---|---|---|---|
| `page_view` | Any route change — `useLocation` effect in `App.jsx`/`AppRoutes.jsx`; first hit captures + persists `utm_*`/`gclid`/`fbclid`/referrer | page_location, page_path, page_title, page_referrer, utm_* | G,M | **P0** |
| `view_item_list` | List renders — `AllProductsPage` (existing), home featured, wishlist, order items | list_id, list_name, items[] | G | P0 |
| `view_promotion` | Promo/social/trust sections in viewport — hero, ticker, instagram, testimonials, popup, free-ship bar | promotion_id, promotion_name, creative_slot | G,M | P0/P1 |
| `search` | Search term submit | search_term | G | P1 |
| `view_search_results` | Results render — server `productListing` | search_term, results_count, sort_by | G | P1 |
| `scroll_depth` | 25/50/75/90% via IntersectionObserver | page_path, scroll_depth_percent, section_name | G | P1 |
| `web_vitals` | `performanceMetrics.js` — **must include INP** (LCP/INP/CLS/FCP) | metric_name, value, page_path | G | P1 |
| `slow_load` | Thresholded poor-perf bucket (LCP>4s, INP>500ms) | metric_name, value, threshold, page_path | G | P1 |
| `exception` | `ErrorBoundary.componentDidCatch`; chunk-load handler; global fetch errors | description (<100, scrubbed), error_type, fatal | G | P0 |
| `page_not_found` | Soft 404 — `NotFound` route render | page_path, page_referrer | G | P1 |

#### Acquisition
| Event | Trigger | Key params | Dest | Pri |
|---|---|---|---|---|
| `select_promotion` | Promo CTA click — hero "Shop Collection", ticker link, popup Shop-Now/copy-code, instagram follow | promotion_id, creative_slot, cta_text | G | P0 |
| `select_item` | Product card click — `AllProductsPage` (l.130), home featured, wishlist | item_id, item_name, price, list_id, index | G | P0 |
| `generate_lead` | Newsletter (`Footer`), contact form, WhatsApp FAB, testimonial submit — **PII; gate on consent** | lead_type, form_name, contact_method, source | G,M | P0/P1 |
| `share` | Product/social/WhatsApp share | content_type, item_id, method | G | P2 |
| `login_modal_open` | `setShowLoginModal(true)` — header, PDP triggers, checkout/orders login-wall | trigger_action, source_page | G | P1 |
| `sign_up` | Register success — `SignupForm.jsx` (l.81-90); server `userRegister` | method (email/google), user_id, mobile_provided | G,M,S | P0 |
| `login` | Login success — `LoginForm.jsx`, `GoogleLoginButton.jsx`; server `userLogin` | method, user_id, is_new_user | G,S | P1 |
| `login_failed` / `sign_up_failed` | Form catch blocks — modal-abandon signal | error_code, method/reason | G | P1 |
| `waitlist_join` / `community_join` | server `userWaitListController` / `userCommunityController` | email, is_duplicate | G,S | P2 |

#### Activation
| Event | Trigger | Key params | Dest | Pri |
|---|---|---|---|---|
| `otp_verify` | `OTPVerification.handleVerify`; auto-submit/paste — `status` param | email, flow_type, attempt_count, status | G | P1 |
| `otp_resend` | `OTPVerification.handleResend` (l.146) | email, resend_count | G | P2 |
| `password_reset` | `ForgotPassword.jsx` — `status` param | email, error_code, status | G | P1 |
| `mobile_number_capture` | `MobileNumberModal`; checkout `handleSaveMobileNumber` — PII, gate on consent | trigger_context, mobile_valid, status | G | P1 |
| `logout` | `authApi.js` logout mutation (l.53-76) | user_id, session_duration | G | P1 |
| `guest_account_created` | server webhook post-payment — resolves `user_id` for guest cohorting | user_id, email, is_new_guest_account | G,S | P1 |

#### Product Consideration
| Event | Trigger | Key params | Dest | Pri |
|---|---|---|---|---|
| `view_item` | PDP load (existing); cart items; order items | item_id, item_name, item_variant, item_category, price | G,M | P0 |
| `select_item` (variant) | Variant click — `ProductDetailPage.jsx` (l.808-851) | item_id, selected_variant, previous_variant | G | P1 |
| `gallery_navigation` / `image_zoom` | Image prev/next/thumbnail/zoom — PDP gallery | item_id, image_index, direction | G | P1/P2 |
| `accordion_toggle` | Description/Specs/Dimensions/Warranty (l.1039-1138) | item_id, section_name, state | G | P2 |
| `view_reviews` / `review_photo_open` | Reviews expand; customer-photo lightbox | item_id, review_count, photo_index | G | P1 |
| `discount_badge_view` / `flash_offer_view` | Discount badge / ProductTimer impression | item_id, discount_percent, time_remaining | G | P1 |
| `out_of_stock_click` | Disabled add-to-cart click (l.960/2073) | item_id, availability_status | G | P1 |
| `notify_me` | Back-in-stock email on OOS PDP — highest-intent OOS signal | item_id, item_variant, email, status | G,S | P1 |
| `add_to_wishlist` | `WishlistButton.jsx` (existing) + PDP/sticky | item_id, item_name, price, placement, currency | G,M | P0 |
| `remove_from_wishlist` | `WishlistButton` filled-heart; `WishlistPage.handleRemove`; PDP toggle | item_id, item_name, price | G | P1 |
| `review_submitted` | `ProductDetailPage.handleSubmitReview` (l.482-527); server | item_id, rating, has_images, image_count | G,S | P1 |

#### Cart
| Event | Trigger | Key params | Dest | Pri |
|---|---|---|---|---|
| `view_cart` | Drawer open (`CartDrawer` l.21-33) **AND** header cart-icon→checkout (`NewHeader` l.305) | value, item_count, currency, items[] | G | P0 |
| `add_to_cart` | PDP add (existing); cart qty increment; wishlist→cart; server `addToCartService` | item_id, item_variant, price, quantity, value, placement | G,M,S | P0 |
| `remove_from_cart` | Trash; qty decrement; PDP qty→0; server `cartQuantityService` | item_id, item_variant, price, quantity, value | G | P0 |
| `quantity_changed` | PDP & cart steppers | item_id, old_quantity, new_quantity, placement | G | P1 |
| `cart_api_error` | `CartDrawer` catch (l.49-50, l.65-66) | error_message, item_id, action | G | P0 |
| `cart_cleared` / `cart_closed` | `userClearCart`; backdrop/X close | value_lost, items_count, time_in_cart | G | P2 |

#### Checkout
| Event | Trigger | Key params | Dest | Pri |
|---|---|---|---|---|
| `begin_checkout` | `CheckoutPage` mount (existing); cart "Proceed"; PDP checkout; server entry | items[], value, currency, coupon, is_guest | G,M,S | P0 |
| `form_start` / `form_field_error` / `form_abandon` | Generic checkout/signup form instrumentation — `field_name` shows which field kills it | form_name, field_name, error_type | G | P1 |
| `checkout_account_method` | Guest vs Sign-in choice (l.772/794) | user_type | G | P1 |
| `add_shipping_info` | Contact step (`handleStep1Next` l.529) + Address step (`handleStep2Next` l.549) | step, pincode, shipping_amount, items[], value, is_guest | G,M | P0 |
| `add_payment_info` | Payment method select (l.197) + "Pay Now" (`handlePayment` l.568); server order create | payment_method, value, items[], event_id, is_guest | G,M,S | P0 |
| `checkout_step_completed` / `checkout_step_error` | Each step advance (`goToStep` l.546) / validation fail | step, step_label, error_type, field_name | G | P0/P1 |
| `apply_coupon` / `remove_coupon` | `CouponInput`/`CouponList`/`CheckoutPage`; server `applyCouponCodeService` — `status` param | coupon, discount, discount_type, status | G,S | P1 |
| `address_created` / `address_save_failed` | Address modal `handleSubmit` (l.445/584); server `userCreateAddress` | address_type, city, pincode, error_type | G | P1 |
| `pincode_lookup` | `GoogleAddressFormModal.fetchPincodeData`; server `pinCodeDeliverableOrNotCheck` — `status` | pincode, city, state, is_serviceable, status | G,S | P1 |
| `shipping_calculated` / `shipping_calc_failed` | `CheckoutPage` shipping effect (l.262-316); server `dynamicShippingCal` | pincode, shipping_amount, shipping_type | G,S | P1 |
| `payment_modal_opened` / `payment_modal_dismissed` | Razorpay `rp.open()` / `ondismiss` — **PREPAID only; COD never opens a modal** | gateway, order_id, amount, value | G | P0 (dismiss) |
| `payment_pending` | Razorpay `payment.authorized` (auth-not-captured) — currently invisible | order_id, payment_method, value | G,S | P1 |
| `payment_failed` | `rp.on('payment.failed')` (l.608/672); server webhook (l.576-624) | error_code, error_description, payment_method, value | G,S | P0 |
| `payment_retry` | Retry button (`showRetry` l.199/615) | previous_error, attempt_number | G | P1 |
| `order_created` / `order_creation_failed` | `createOrder`/`createGuestOrder`; server (l.299). **For COD this is the terminal client conversion step** | order_id, user_type, payment_method, error_type | G,S | P0 |
| `payment_verification` | `PaymentProcessing.checkStatus` (l.57-90) — `status` (started/verified/failed/timeout) | order_id, verification_attempts, status | G,S | P0 |

#### Purchase
| Event | Trigger | Key params | Dest | Pri |
|---|---|---|---|---|
| `purchase` | **Primary = server webhook** `payment.captured` (l.382-574), inside the `order.status !== "PAID"` guard so retries can't double-fire. **GA4 `purchase` sent from SERVER ONLY**; client fires `purchase` only as the Meta/consent signal sharing the same `event_id` + `transaction_id`. COD revenue recognized at **DELIVERED** (reverse on RTO). FAILED→PAID resurrection emits a recovery `purchase`. | transaction_id (payment.id), value, currency, shipping, tax, coupon, items[], payment_method, user_id, event_id, is_guest | **S** (GA4+CAPI), M (client) | **P0** |
| `order_confirmed_view` | `OrderConfirm.jsx` load (l.18-51) | order_id, value, is_guest | G | P1 |
| `refund` | server post-delivery return completion only (true refund), distinct from cancellation | transaction_id, value, reason, items[] | G,S | P1 |

> `payment_modal_dismissed` and a later webhook capture can both fire for the same user (dismiss → payment completes async). Dashboards treating dismiss as abandonment must reconcile against `purchase` on the same `order_id`.

#### Returns (sub-funnel — `refund` alone can't decompose refund rate)
| Event | Trigger | Dest | Pri |
|---|---|---|---|
| `return_initiated` | Return request — `MyOrdersPage` / server return endpoint | G,S | P1 |
| `return_approved` / `return_picked_up` | Server return approval / carrier pickup | S | P2 |
| `refund_processed` | Refund settled (drives true refund rate) | G,S | P1 |
| `order_cancelled` | PAID→CANCELLED/FAILED (cancellation, not a return) — kept separate so cancellation rate ≠ refund rate | G,S | P1 |

#### Retention
| Event | Trigger | Dest | Pri |
|---|---|---|---|
| `view_order_list` | `MyOrdersPage` load; server `userOrderPreviousHistory` | G | P1 |
| `view_shipment_tracking` | Track-order / AWB click (l.281-311) | G | P1 |
| `order_status_update` | server transitions SHIPPED/DELIVERED/CANCELLED | S | P1 |
| `generate_invoice` | `MyOrdersPage` (l.59-95); server `generateOrderInvoice` | G | P2 |
| `view_wishlist` | `WishlistPage` load | G | P1 |
| `view_rewards` / `redeem_reward_attempted` | `RewardsPage.jsx` (l.12-14, l.101-111) | G | P1 |
| `profile_updated` | `MyProfilePage.handleSave` (l.88-163); server `userUpdateProfile` | G | P1 |
| `settings_updated` / `marketing_consent_updated` | `SettingsPage.jsx` toggles | G | P1 |
| `analytics_consent_updated` | `SettingsPage.jsx` analytics toggle (l.184-187) | **Consent audit log only — NOT dataLayer** | **P0** |

#### Support
| Event | Trigger | Dest | Pri |
|---|---|---|---|
| `faq_toggle` | `Faqs.jsx`, `ContactPage`, `CustomerSupportPage` | G | P1 |
| `contact_channel_click` | Phone/email/WhatsApp — `CustomerSupportPage`, `Footer`, `WhatsAppButton` | G | P1/P2 |
| `support_tab_switch` | `CustomerSupportPage` (l.86-103) | G | P2 |
| `notification_shown` / `notification_dismiss` | `Notification.jsx` (l.54-106) — no PII in payload | G | P2 |
| `navigate_section` | Header/footer nav links | G | P2 |
| `banner_impression` / `open_in_browser_click` | `OpenInBrowserBanner.jsx` (l.12-55) | G | P1/P2 |

---

## 4. Conversion Funnels

> **Guest segmentation:** `is_guest` is set on every checkout step + `purchase`, so every funnel splits cleanly by guest vs account at each step.

**F1 — Discovery → Purchase (macro).**
`page_view` → `view_item_list` → `select_item` → `view_item` → `add_to_cart` → `view_cart` → `begin_checkout` → `add_shipping_info` → `add_payment_info` → `purchase`.
*Answers:* where do users evaporate? *Lever:* pinpoint the single weakest stage (list→detail CTR vs cart→checkout) to prioritize fixes.

**F2 — Checkout micro-funnel.**
`begin_checkout` → `checkout_account_method` → `checkout_step_completed(contact)` → `add_shipping_info` → `add_payment_info` → branch by method:
- **PREPAID:** `payment_modal_opened` → (`payment_failed` | `payment_modal_dismissed` | `payment_pending` | `purchase`)
- **COD:** `order_created(COD)` → `purchase` (recognized at DELIVERED)

*Answers:* which step + which error codes kill checkout? COD vs PREPAID drop-off? *Lever:* form simplification (now field-level via `form_field_error`), payment retry UX, gateway fixes — recovers leaked revenue directly.

**F3 — Search → Buy** (post-search build).
`search` → `view_search_results` → `select_item` → `view_item` → `add_to_cart` → `purchase`; branch on `results_count = 0`.
*Answers:* do searches convert; how much demand hits zero-result dead-ends? *Lever:* inventory gaps + search relevance.

**F4 — Auth conversion.**
`login_modal_open` → (`login_failed`/`sign_up_failed` = abandon) vs `sign_up`/`login` (by `method`) → `otp_verify(success)` → post-action (`begin_checkout` from login-wall).
*Answers:* does the checkout login-wall convert or cost orders? OAuth vs email completion? *Lever:* guest-checkout emphasis, OTP/email provider fixes, social-login promotion.

**F5 — Cart recovery.**
`add_to_cart` → `view_cart` → (`cart_closed`/`cart_cleared` = abandon) vs `begin_checkout`.
*Window:* a cart is "abandoned" if `add_to_cart` has no matching `purchase` within **24h** (configurable). *Answers:* what % of carts are reviewed but abandoned, and at what `value`? *Lever:* abandonment email/retargeting triggers.

**F6 — Wishlist / Back-in-stock → Purchase.**
`add_to_wishlist`/`notify_me` → `view_wishlist` → `select_item`(`list_id=wishlist`) → `add_to_cart`(`placement=wishlist`) → `purchase`.
*Answers:* are wishlist saves and OOS notify-me signups converting or stalling? *Lever:* price-drop / back-in-stock re-engagement to high-intent savers.

---

## 5. Dashboards & KPIs

> **Prerequisites:** (a) **ROAS requires ad-spend import** — link Google Ads & Meta, enable GA4 cost-data import; events supply revenue only. (b) **Channel/UTM slices depend on attribution capture (§6), which ships in Phase 0** — buildable only once UTM/click-ID capture is live. (c) **Latency:** server MP/CAPI `purchase` and client events arrive on different latencies; intraday views show client events ahead of server-confirmed conversions — annotate accordingly. (d) SKU dashboards require catalog metadata joined via registered item dimensions.

**D1 — Executive / Revenue.** Revenue (server `purchase`), orders, AOV, conversion rate, ROAS (needs spend), **cancellation rate** (`order_cancelled`) and **refund rate** (`refund_processed`) tracked **separately**. Slice: channel/UTM, device, `payment_method`, new vs returning, `coupon`. Alert: daily revenue −30% vs 7-day baseline.

**D2 — Acquisition & Traffic.** Sessions, new users, signup rate, login success rate, modal-abandon rate, lead volume. Slice: source/medium, device, landing page, `method`. Alert: `login_failed`/`login` ratio spike.

**D3 — Merchandising / Product.** List→detail CTR, view_item→add_to_cart rate, top/bottom SKUs, variant mix, review submission rate, OOS click + `notify_me` volume. Slice: `item_category`, `item_brand`, price-band, `list_id`, `item_variant`. Alert: featured-product section error.

**D4 — Funnel & Conversion.** Stage-by-stage F1/F2 conversion + drop-off %, cart abandonment rate (24h window), coupon apply/success rate. Slice: device, `is_guest`, `coupon`. Alert: cart→checkout conversion drop > X%.

**D5 — Checkout & Payment Health.** Payment failure rate by `error_code`, modal dismiss rate (reconciled against late `purchase`), `payment_pending` volume, COD vs PREPAID conversion, verification timeout rate, shipping/pincode failure rate, `slow_load` rate. **Denominator = `payment_modal_opened` (PREPAID) / `order_created` (COD); segment by `payment_method`.** **Alert (critical): `payment_failed` rate > 2× baseline over 15 min (per method); verification timeout spike.**

**D6 — Retention / LTV.** Repeat purchase rate, 30/60/90-day cohort retention, wishlist→purchase rate, rewards redemption, marketing consent opt-in rate. Cohorting requires durable `user_id` on **every** `purchase` including guests — guaranteed because GA4 `purchase` is server-side and carries the webhook-resolved `user_id`. Alert: opt-out surge after a release.

---

## 6. Technical Architecture & Implementation Plan

**Data-layer pattern.** Keep the `window.dataLayer.push` core in `analytics.js`. **Code fix:** every `track*` function must push `{ ecommerce: null }` immediately before its ecommerce push (none currently do), so non-ecommerce events can't carry stale `items[]`. Wrap `fbq` calls in try/catch with a `console.warn` when `fbq` is undefined.

**SPA `page_view`.** Add a `usePageViews()` hook / `<RouteTracker>` inside `<Router>` using `useLocation`; on `pathname` change fire `trackPageView(...)`. **Disable the GA4 Config tag's "Send a page view."** Single highest-leverage fix.

**Attribution capture (Phase 0, not Phase 3).** On the first `page_view`, read `window.location.search` for `utm_*`, `gclid`, `fbclid` and `document.referrer`, then **persist to sessionStorage/localStorage** (UTMs are destroyed on the first client-side route change). Register UTM/click-ID as GA4 custom dimensions; define a default channel grouping. Pass `gclid`/`fbclid` to Meta CAPI + Google Ads enhanced conversions. Add a **referral-exclusion** for Razorpay's hosted-checkout domain so the post-payment redirect doesn't create a self-referral.

**Identity stitching.** On `login`/`sign_up`/session restore (`authSlice.setCredentials`), push `user_id` to dataLayer + set GA4 `user_id`. Pass hashed `user_id`/email/phone to Meta CAPI server-side — **gated on marketing consent** (separate from analytics consent).

**Consent mode (DPDP).** Initialize GTM **Consent Mode v2** with `analytics_storage`/`ad_storage` = `denied` by default. Wire the existing `SettingsPage` toggle and a first-visit **DPDP-compliant notice** (itemized purpose, freely-given, easy withdrawal) to `gtag('consent','update',…)`. **The Meta Pixel base script must be deferred until consent is granted.** Consent Mode v2 alone does not satisfy DPDP — pair with notice, withdrawal, record-keeping, and data-principal rights. Log consent changes to a dedicated audit endpoint, **never** to dataLayer.

**GTM container & tag/trigger map.** Replace the `GTM-XXXXXXX` placeholder with a real `VITE_GTM_ID`. Variables: DLV per param, `user_id`, consent state, UTM/click-ID. Triggers: Custom Event per event name. Tags: GA4 Config (consent-gated, page_view disabled); GA4 Event tags per event; Meta Pixel base + event tags (consent-gated). All purchase/lead tags pass `event_id`. Disable Enhanced Measurement scroll + site-search.

**Meta + server dedup.** One `event_id` (UUID) per conversion. **`transaction_id` standardized as Razorpay `payment.id` on both client and server.** Client Pixel `Purchase` + server CAPI `Purchase` share `event_id` + `transaction_id`; Meta dedupes. **GA4 `purchase` server-only** — GA4 doesn't dedup event_count/revenue on `transaction_id`, so a dual send would double revenue.

**Server-side conversions (canonical).** In `razorpayWebHookController` `payment.captured`, **inside the `order.status !== "PAID"` guard**, fire GA4 **Measurement Protocol** `purchase` + **Meta CAPI** `Purchase` with hashed PII, `event_id`, full `items[]`, `payment_method`, server-resolved `user_id`, `value` (paise→rupees). Handle states the current code ignores: `payment_pending` on `payment.authorized`; distinguish `order.paid` vs `payment.captured`; recovery `purchase` on FAILED→PAID (`wasFailedByCron`); COD `purchase` at DELIVERED + `refund`/reversal on RTO. Mirror `payment_failed`, `refund_processed`, `order_cancelled`.

**Extend `analytics.js` — new exported functions:** `trackPageView`, `trackSelectItem`, `trackViewCart`, `trackViewPromotion`, `trackSelectPromotion`, `trackRemoveFromWishlist`, `trackLogin`, `trackSignUp`, `trackLoginFailed`, `trackAddShippingInfo`, `trackAddPaymentInfo`, `trackSelectPaymentMethod`, `trackApplyCoupon`, `trackRemoveCoupon`, `trackPaymentFailed`, `trackPaymentPending`, `trackCheckoutStep`, `trackRefund`, `trackGenerateLead`, `trackShare`, `trackSearch`, `trackNotifyMe`, `trackException`, `trackWebVitals`, `trackSlowLoad`, `trackForm`, `trackEngagement`, plus helpers `clearEcommerce()`, `setUserId()`, `captureAttribution()`.

---

## 7. Phased Rollout Roadmap

**Phase 0 — Foundation (unblocks everything).** Real `VITE_GTM_ID`; SPA `page_view` (Config-tag page_view disabled); **UTM/click-ID/referrer capture + persistence + channel grouping + Razorpay referral-exclusion**; Consent Mode v2 + DPDP notice/withdrawal wired to `SettingsPage`, Pixel base deferred to consent; identity (`user_id`) on auth; `ecommerce:null` code fix; `exception` + `page_not_found`. *Nothing downstream is trustworthy until this ships.*

**Phase 1 — P0 commerce funnel.** `select_item` (lists), `view_cart` (drawer + cart-icon→checkout), checkout sub-steps, `form_*` field-level, `payment_modal_dismissed`/`payment_failed`/`payment_pending`, `order_created`, server-side GA4+CAPI `purchase` (guarded, COD-at-DELIVERED, FAILED→PAID recovery) + dedup `event_id` + standardized `transaction_id`, `login`/`sign_up`, `is_guest` everywhere. Lights up F1, F2, F5 + accurate ROAS.

**Phase 2 — P1 discovery / merch / auth.** Coupon events, `view_promotion`/`select_promotion`, variant `select_item`, reviews, `notify_me`, address/shipping/pincode, OTP/forgot-password/mobile (consolidated `status`), web_vitals(+INP)/slow_load, returns sub-funnel, search. Lights up F3, F4, F6, D3.

**Phase 3 — P2 + advanced.** Engagement micro-events, `order_status_update` + remaining returns states, retention/rewards/settings, `pwa_install_*`, full server mirroring of cart/lead events, video events, A/B/experiment params.

---

## 8. Data Governance & Quality

**Naming.** snake_case; GA4 reserved names for ecommerce; domain-prefixed custom events; status triads consolidated to one event + `status` param to stay under the 500-event-name ceiling; §3.1 param dictionary is authoritative — no event ships without its params defined there.

**GA4 limits & scope.** Register only high-value params as custom dimensions (cap 50 event-scoped, ≈25 queryable) — demote diagnostic-only params (`resend_count`, `time_in_cart`) to unregistered event params. Respect 40-char param names / 100-char values (truncate + scrub `description`/`error_*`). Honor item-scope vs event-scope (`item_variant`/`index`/item `discount`/`coupon` item-scoped; cart `discount`/event `coupon` event-scoped). Always pair `value` with `currency`.

**PII (DPDP).** Never send raw email/phone/name to GA4. For Meta CAPI, SHA-256 hash email, phone, `user_id` server-side — gated on marketing consent. GA4 `user_id` = app id, not email. Strip PII/URLs from `notification_shown`/`exception` payloads. Lead/mobile/newsletter/contact forms require DPDP notice + consent linkage. Document an age posture (adult catalog → low children's-data risk; else verifiable-parental-consent rules apply).

**Consent (DPDP, not GDPR/CCPA).** Default-deny; tags gate on Consent Mode v2 **and** the Pixel base is deferred to consent. Itemized notice, freely-given consent, easy **withdrawal**; honor the `SettingsPage` toggle as a hard override. Define behavior on withdrawal-after-collection (right to erasure), retention period, and data-principal rights (access/correct/erase/grievance) with a grievance-officer path. Consent changes → audit log, not dataLayer.

**QA.** Validate every event in **GTM Preview** + **GA4 DebugView** before publish; verify Meta via **Events Manager Test Events** and confirm client/server dedup (one `Purchase`, not two; GA4 `purchase` server-origin only). Confirm Config tag is not also sending page_view and Enhanced Measurement scroll/site-search are off. Server: assert MP/CAPI fire exactly once per `payment.captured`, inside the status guard, idempotent on `event_id`; verify `transaction_id` matches across client/server; verify COD-at-DELIVERED + FAILED→PAID recovery.

**Source of truth.** Maintain a versioned tracking plan (this doc + spreadsheet mirror): event → params → scope → destinations → owner → status. Changes go through PR review on `analytics.js` + the GTM container. Quarterly audit reconciling `order_confirmed_view` vs server `purchase`, and `order_cancelled` vs `refund_processed`.
