/**
 * Order charge maths — the single source of truth for "what do we charge".
 *
 * Both checkouts (logged-in: razorpayCreateOrderController, guest:
 * guestCreateOrderController) used to carry their own copy of this formula.
 * Two copies of money maths is how they drift: the Magic branch was fixed in
 * one and not the other more than once. Everything here is pure — no DB, no
 * env, no Razorpay — so the whole matrix (guest / logged-in / COD / prepaid /
 * Magic × every coupon type) is testable without mocking a checkout.
 */

// Added to every COD order — what the courier charges us to collect cash, plus
// the RTO risk COD carries. Paying online skips it, which is the honest "save
// ₹X" the checkout shows. The shipping quote returns it so the page never
// keeps its own copy.
export const COD_FEE = 49;

/**
 * @param {object}  p
 * @param {number}  p.subtotal               product total after cart-rule discounts
 * @param {number}  p.giftWrapAmount         0 when not selected
 * @param {number}  p.chargedShippingAmount  what the CUSTOMER pays for shipping
 *                                           (0 on free shipping, and always 0
 *                                           on Magic — Razorpay adds its own
 *                                           shipping_fee from the serviceability
 *                                           callback after the order exists)
 * @param {number}  p.realShippingAmount     true carrier cost — the COD advance
 *                                           is based on this even when the
 *                                           customer is charged nothing
 * @param {number}  p.discountAmount         coupon discount in rupees
 * @param {boolean} p.isInternalTestOrder    INTERNAL_TEST coupon ⇒ flat ₹1
 * @param {boolean} p.isMagic
 * @param {string}  p.paymentMethod          "COD" | anything else
 * @param {boolean} p.freeShippingUnlocked   admin free shipping (threshold or a
 *                                           free_shipping promotion) — waives the COD fee too
 */
export const computeOrderCharge = ({
  subtotal = 0,
  giftWrapAmount = 0,
  chargedShippingAmount = 0,
  realShippingAmount = 0,
  discountAmount = 0,
  isInternalTestOrder = false,
  isMagic = false,
  paymentMethod = "PREPAID",
  freeShippingUnlocked = false,
} = {}) => {
  // An INTERNAL_TEST coupon pins the order at ₹1 whatever the cart holds.
  //
  // The discount is NOT zeroed for Magic any more. It used to be, on the
  // grounds that Magic collects coupons in its own modal — but the ₹1 line
  // below never had that exemption, so a Magic order went to Razorpay with
  // amount ₹1 and line_items still at full price. Razorpay bills the line
  // items, so it charged the full amount and the ₹1 silently vanished; an
  // ordinary coupon disappeared the same way. The discount now goes onto the
  // items themselves (see discountMagicLineItems), which is the only number
  // Razorpay reliably honours.
  //
  // Magic is prepaid-only: its serviceability callback always answers cod:false,
  // so a COD request can never arrive on the Magic path.
  const isCOD = !isMagic && paymentMethod === "COD";
  // Outside the coupon maths: a coupon discounts the products, never the fee.
  // Free shipping from admin (threshold or promotion) makes COD delivery free
  // too, fee included.
  const codFee = isCOD && !isInternalTestOrder && !freeShippingUnlocked ? COD_FEE : 0;

  const finalAmount = isInternalTestOrder
    ? 1
    : Math.max(subtotal + giftWrapAmount + chargedShippingAmount - discountAmount, 0) + codFee;

  // COD collects 2x the REAL shipping cost upfront as an RTO/fraud deposit.
  // Based on realShippingAmount on purpose — a free-shipping COD order must
  // still collect its advance, or the anti-fraud protection is gone.
  const codPartialAmount = isCOD
    ? Math.min(Math.ceil(realShippingAmount) * 2, Math.ceil(finalAmount))
    : 0;
  const codRemainingAmount = isCOD
    ? Math.max(0, Math.ceil(finalAmount) - codPartialAmount)
    : 0;

  const razorpayChargeAmount = isCOD ? codPartialAmount : finalAmount;

  // Whole rupees first, then paise — this must equal what is stored on the
  // order and returned to the client, or Razorpay Checkout rejects the
  // amount as a mismatch.
  const razorpayChargeAmountPaise = Math.ceil(razorpayChargeAmount) * 100;

  return {
    finalAmount,
    isCOD,
    codFee,
    codPartialAmount,
    codRemainingAmount,
    razorpayChargeAmount,
    razorpayChargeAmountPaise,
  };
};

export default computeOrderCharge;
