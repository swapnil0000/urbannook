/**
 * Which coupons the Razorpay Magic coupon sheet may list for ONE order.
 *
 * Razorpay renders whatever the Get Promotions callback returns, to whoever is
 * in the modal — there is no greying out. So the list must already be filtered
 * down to coupons this customer can really redeem on this order. `validate` is
 * the storefront's own eligibility check (validateNewCoupon), so the sheet can
 * never promise what Apply Promotions would refuse.
 *
 * Never listed, though still redeemable by typing the code (Apply Promotions
 * runs the same validation): hidden coupons. Never listed and never redeemable:
 * test and internal coupons.
 */
export const selectMagicSheetCoupons = async (coupons, validate) => {
  const out = [];
  for (const c of coupons) {
    if (!c?.code) continue;
    if (c.isHidden === true || c.isTest === true || c.isInternal === true) continue;
    if (c.discountType === "INTERNAL_TEST") continue;
    try {
      await validate(c);
      out.push(c);
    } catch {
      // Not redeemable by this customer on this order — keep it off their sheet.
    }
  }
  return out;
};

/**
 * Whose email / mobile a Magic coupon check is run against.
 *
 * Razorpay sends the `contact`/`email` typed in its modal — which we prefill
 * from what the customer already gave us at checkout, and which they may change.
 * Whatever Razorpay sends wins; anything it leaves out falls back to what we
 * already hold on the order, so a customer is never treated as anonymous just
 * because a callback carried no contact.
 *
 *  · signed-in order → the account's own identity ONLY (profile + WhatsApp-verified number + email, read from the
 *    user record). A number typed in the modal is unverified, so it never unlocks a coupon for a signed-in customer.
 *  · guest order     → typed-in contact, else the contact captured on the order.
 *
 * @param {object} p
 * @param {object} p.order           the Magic order ({ userId, isGuestOrder, guestInfo, senderMobile })
 * @param {string} [p.payloadEmail]
 * @param {string} [p.payloadMobile] already stripped to 10 digits
 * @param {{email: string|null, mobiles: string[]}} [p.account] from getUserCouponIdentity, signed-in orders only
 * @returns {{ email: string|null, mobile: string|string[]|null }}
 */
export const resolveMagicCouponIdentity = ({ order, payloadEmail, payloadMobile, account }) => {
  if (order?.userId && !order?.isGuestOrder && account) {
    return { email: account.email || null, mobile: [...new Set(account.mobiles || [])] };
  }
  return {
    email: payloadEmail || order?.guestInfo?.email || null,
    mobile: payloadMobile || order?.guestInfo?.mobile || order?.senderMobile || null,
  };
};
