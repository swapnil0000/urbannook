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
    - Contact / Address, Magic half of the trial: opens Razorpay Magic (it collects the address).
    - Contact / Address, standard half: switches to prepaid; they pay on Review.
  - It also appears as its own line on the order page (`orderView.service.js`), the invoice and the
    order-confirmation email.
- **Prepaid** orders and **Magic** orders (prepaid-only) never carry it.

## Magic vs standard checkout — 50/50 trial

- **Name:** `magic_vs_standard_2026_11`.
- **Who sees what:**
  - "magic" half: the "How would you like to pay?" screen, where Pay online opens Razorpay Magic
    (Express).
  - "standard" half: Contact → Address → Review, then the standard Razorpay modal.
- **Assignment:** `client/src/config/checkoutExperiment.js` hashes the browser's anonymous id, so a
  shopper stays in one half across visits and login/logout. With no stable id (storage blocked) the
  browser stays on Magic. When `VITE_MAGIC_CHECKOUT_ENABLED` is off there is no trial.
- **Recorded on:**
  - Every order, as `checkoutExperiment: { name, arm }`. The server stores only names listed in
    `server/src/utils/checkoutExperiment.js`.
  - GA4, as one `checkout_experiment` event per checkout visit (`experiment_name`, `experiment_arm`).
- **Reading the result:** compare paid orders and revenue per arm (the halves are the same size, so
  orders per arm compare directly):
  ```js
  db.orders.aggregate([
    { $match: { "checkoutExperiment.name": "magic_vs_standard_2026_11" } },
    { $group: { _id: { arm: "$checkoutExperiment.arm", method: "$paymentMethod", status: "$status" },
                n: { $sum: 1 }, value: { $sum: "$amount" } } },
    { $sort: { "_id.arm": 1 } },
  ])
  ```
  Exclude internal test orders the way the admin reports do. Run it for at least 2 weeks before
  deciding.
- **Ending it:** set `magicShare` in `client/src/config/checkoutExperiment.js` to `1` (everyone on
  Magic) or `0` (no Magic), then deploy through the normal PR → Jenkins flow.
- **No new secrets or env vars.**

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
