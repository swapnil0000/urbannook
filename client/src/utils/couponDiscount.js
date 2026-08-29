/**
 * What a coupon is worth on a given cart subtotal, client-side.
 *
 * Mirrors the server's calculateDiscount in coupon.code.service.js — the two
 * must agree or a guest sees one number and gets charged another. Shared so the
 * coupon input, the coupon list and the checkout offer block cannot drift apart.
 *
 * Accepts both shapes we hold coupons in: `maxDiscountCap` on coupon documents,
 * `maxDiscount` on the campaign terms returned by /offer/campaign.
 *
 * @returns {number} discount in rupees, 0 when the cart does not qualify
 */
export function calcLocalDiscount(coupon, subtotal) {
  if (!coupon || !subtotal || subtotal < (coupon.minCartValue || 0)) return 0;

  if (coupon.discountType === 'PERCENTAGE') {
    let amount = Math.floor((subtotal * coupon.discountValue) / 100);
    const cap = coupon.maxDiscountCap ?? coupon.maxDiscount;
    if (cap) amount = Math.min(amount, cap);
    return Math.min(amount, subtotal);
  }

  return Math.min(coupon.discountValue || 0, subtotal);
}

export default calcLocalDiscount;
