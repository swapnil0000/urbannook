# COD fee and the Magic-vs-standard checkout trial

Two checkout changes made to move orders from COD to prepaid (Nov 2026). In the 30 days before them:
145 COD orders paid against 119 prepaid, but 306 Magic prepaid orders failed (115 paid), and COD and
prepaid cost the customer exactly the same.

## COD fee — ₹49 on every COD order

- **Where the number lives:** `COD_FEE` in `server/src/utils/orderAmount.util.js`. Change it there only.
- **What it does:** `computeOrderCharge` adds it to the order total when the order is COD (not Magic,
  not an `INTERNAL_TEST` ₹1 order). A coupon discounts the products and never the fee.
- **Free shipping waives it:** if admin free shipping applies (the cart-value threshold, or a
  `free_shipping` promotion, e.g. on one product), COD delivery is free, fee included. The server uses
  the same `freeShippingUnlocked` that zeroes delivery. The checkout learns about a promotion's free
  shipping from `freeShipping` on `/promotions/display/checkout`. Before this change the page ignored
  promotion free shipping and showed ₹99/₹149 that the order never charged.
- **When the customer pays it:** the advance is unchanged (2× real shipping), so the fee is part of
  `codDetails.remainingAmount` and the courier collects it at the door. Admin's Shipmozo push already
  sends `remainingAmount` as `cod_amount`, so nothing changes there.
- **Stored on the order:** `codDetails.codFee` (0 on older orders).
- **Shown to the customer:**
  - The page has no copy of the number. On Review it reads `codFee` from the COD shipping quote
    (`/shipping` response); before that (Contact / Address, no quote yet) from `codFee` on
    `/free-shipping-offer`, 0 when free shipping already applies. It shows a "COD fee" row in the
    order summary (included in Total) and the real "Save ₹49" on Pay Online.
  - The "How would you like to pay?" screen does not mention the fee (Prepaid / Partial COD only).
    On every step of the COD path the fee is shown with a save button: on desktop as a "₹49 extra
    for Cash on Delivery" card above the form, on mobile as a strip in the sticky bar right above
    Continue / Pay (the mobile form sheet covers the area above the form). The COD sheet has the
    fee row and the same button. On Review the card waits for the
    COD quote to settle. Hidden when the fee is 0 (free shipping).
  - The button (`handleSwitchToPrepaid`):
    - Review: switches to prepaid and pays in one tap, and leaves the COD-only Review, so a dismissed
      Razorpay modal shows both pay buttons again.
    - Contact / Address with Magic on: opens Razorpay Magic (it collects the address).
    - Contact / Address with Magic off in the build: switches to prepaid; they pay on Review.
  - It also appears as its own line on the order page (`orderView.service.js`), the invoice and the
    order-confirmation email.
- **Prepaid** orders and **Magic** orders (prepaid-only) never carry it.

## Magic vs standard checkout — 50/50 trial (ended 2026-11-17)

- **Name:** `magic_vs_standard_2026_11`.
- **What it was:** half the shoppers ("standard") never saw Razorpay Magic: they went Contact →
  Address → Review (where COD is offered) and paid in the standard Razorpay modal. The other half
  ("magic") kept the "How would you like to pay?" screen, where Pay online opens Magic.
- **Ended:** 2026-11-17, everyone is back on Magic. The checkout shows the Express screen whenever
  `VITE_MAGIC_CHECKOUT_ENABLED` is on (`expressAvailable` in `client/src/pages/CheckoutPage.jsx`); the
  client trial code (`client/src/config/checkoutExperiment.js`) and the `checkout_experiment` GA4 event
  are gone.
- **Data kept:** orders placed during the trial still have `checkoutExperiment: { name, arm }`; the
  server still validates the field (`server/src/utils/checkoutExperiment.js`) but the checkout no longer
  sends it. Result query:
  ```js
  db.orders.aggregate([
    { $match: { "checkoutExperiment.name": "magic_vs_standard_2026_11" } },
    { $group: { _id: { arm: "$checkoutExperiment.arm", method: "$paymentMethod", status: "$status" },
                n: { $sum: 1 }, value: { $sum: "$amount" } } },
    { $sort: { "_id.arm": 1 } },
  ])
  ```
  Exclude internal test orders the way the admin reports do.

## Payment help line (call / WhatsApp)

- **When it shows:** only after a payment attempt stops. That covers a Razorpay cancel, a failed
  payment, an order-create error, or a verification failure. It appears in the checkout's
  payment-error box (review step and Express screen) and in the "What stopped you?" sheet. It never
  shows on page load: the help widget stays hidden on checkout, so the number reaches only
  shoppers who already tried to pay.
- **What it offers:**
  - A call to the support number, during `SUPPORT_HOURS` only (Mon-Sat 9:00-19:00 IST).
  - WhatsApp at any time, with the amount and Razorpay order id already typed.
- **Where the number lives:** `client/src/utils/contactHelper.js`. The component is
  `client/src/component/support/CheckoutHelpLine.jsx`.
- **Tracked:**
  - `checkout_help_shown`, with `reason`, `placement`, `order_id`, `value` and `call_open`.
  - `checkout_help_click`, with the same fields plus `channel` (call | whatsapp).
  - Compare these with the paid orders that follow to see how many calls convert.

## COD → prepaid: pay-online link after a COD order

- **What the customer gets:** once a COD order's advance is paid, a Razorpay payment link for the
  balance minus the COD fee. It is open for 2 hours (`COD_LINK_WINDOW_MINUTES`). Razorpay sends it by
  SMS, and by email when the order has a real address (never a `@wa.urbannook.in` placeholder). The
  same link shows on the order page and the order confirmation page:
  "Pay ₹X online now and skip the ₹49 COD fee". The click is tracked as `cod_pay_online_click`.
- **When it is paid** (`payment_link.paid` webhook): the order becomes `PREPAID`.
  - `codDetails.remainingAmount` → 0, `codDetails.codFee` → 0, `amount` is reduced by the waived fee.
  - The second Razorpay payment id goes in `codConversion.paymentId`. A refund for that order must
    cover both payments: `payment.razorpayPaymentId` (the advance) and `codConversion.paymentId`.
    The order page shows the second one as `balancePaymentRef`.
- **The courier:** admin does not push the order while the link is being created or is open. It holds
  until expiry plus 10 minutes (`utils/codPrepaidLinkHold.js` in urbannook-admin). Auto-push skips the
  order and the hourly sweep picks it up after. A manual or bulk push gets a 409 saying until when.
- **Safety:**
  - If a link is paid but the order can no longer switch, the payment is refunded at once
    (`codConversion.status = refunded`). That covers an order already with the courier, a cancelled
    order, or a wrong amount.
  - If that refund fails, Zoho Cliq gets an alert.
  - A link Razorpay refuses leaves an ordinary COD order (`status = failed`).
- **Code:**
  - Storefront: `server/src/services/codPrepaidLink.service.js`, which has the status lifecycle.
  - The PAID write in `fulfilCapturedPayment` marks the order `pending`, in the same write that marks
    it paid.
  - Webhook cases `payment_link.paid`, `.expired` and `.cancelled` are in `razorpayWebHookController`.
- **On by default.** No setting is needed. To switch it off, set `COD_PREPAID_LINK_ENABLED=false` in
  Infisical (`/user/server`).
- **A paid link is applied two ways:**
  1. the `payment_link.paid` webhook (fast),
  2. `cron/codPrepaidLink.reconcile.js` every 5 minutes, which asks Razorpay for each open link.
  The cron also closes expired links and finishes a link creation that a restart interrupted. Because
  of it, a missing webhook subscription can never leave a paid link on an order the courier then
  collects cash for. Admin holds until expiry + 10 min, so the cron always runs first.
  - Still worth adding `payment_link.paid`, `payment_link.expired` and `payment_link.cancelled` to the
    Razorpay webhook, so conversion is instant.
- **Deploy order:** admin first (or together), then the storefront.
  - If the storefront goes first, admin does not hold yet, so COD orders can reach the courier before
    the link is paid.
  - A link paid after that is refunded automatically. That is safe, but the customer sees a refund.
- **Local testing:** `server/.env` must point at the dev DB and `rzp_test_` keys (see
  `.env.development`). With prod values, a local order is a real order and its link is a real link.
- **Guests:** they cannot open the order page, so the order-status poll (`/user/order/status/:id`)
  returns `payOnlineOffer`. The guest "Order Confirmed!" card shows the same button.
- **WhatsApp:** sent right after the link is created, once the Gupshup template is approved and
  `GUPSHUP_TEMPLATE_COD_PAY_LINK` is set in Infisical (staging and prod). The template is a Utility
  template with 4 placeholders:
  `{{1}}` name, `{{2}}` amount to pay now, `{{3}}` COD fee saved, `{{4}}` link.
  Suggested text: "Hi {{1}}, your Urban Nook order is confirmed. Pay the balance of {{2}} online now
  and skip the {{3}} COD fee: {{4}} (valid for 2 hours)."
  `codConversion.whatsappSent` records whether Gupshup accepted it. Until the template is set,
  Razorpay's SMS and email still go out.
- **Testing locally:** with test-mode keys, a COD order gets a test link straight away. After you pay
  it, the reconcile cron switches the order to prepaid within 5 minutes, even though webhooks cannot
  reach localhost.
