import CouponCode from "../model/coupon.code.model.js";
import { getCartService } from "../services/user.cart.service.js";
import Cart from "../model/user.cart.model.js";
import { ValidationError, NotFoundError, InternalServerError } from "../utils/errors.js";

const applyCouponCodeService = async ({ userId, couponCodeName }) => {
  const cartRes = await getCartService({ userId });
  
  if (
    !cartRes.success ||
    (cartRes.data.availableItems.length === 0 &&
      cartRes.data.unavailableItems.length === 0)
  ) {
    throw new ValidationError("Cannot calculate for empty cart");
  }

  const { cartSubtotal, availableItems } = cartRes.data;
  const GST_RATE = 0.18;
  const SHIPPING_CHARGES = 199;

  const gstAmount = Math.round(cartSubtotal * GST_RATE);
  const preTotal = cartSubtotal + gstAmount + SHIPPING_CHARGES;
  let discountAmount = 0;

  // --- CASE 1: No Coupon Code Provided ---
  if (!couponCodeName || couponCodeName.trim() === "") {
    const calculationSnapshot = {
      couponCodeId: null,
      name: null,
      discountValue: 0,
      isApplied: false,
      summary: {
        subtotal: cartSubtotal,
        gst: gstAmount,
        shipping: SHIPPING_CHARGES,
        preTotal: preTotal,
        discount: 0,
        grandTotal: Math.max(preTotal, 0),
        note: "Standard calculation without coupon",
      },
    };

    await Cart.updateOne(
      { userId },
      { $set: { appliedCoupon: calculationSnapshot } },
    );

    return {
      statusCode: 200,
      message: "No Coupon present",
      success: true,
      data: { items: availableItems, summary: calculationSnapshot?.summary },
    };
  }

  // --- CASE 2: Global Rule Check (Subtotal <= 99) ---
  if (cartSubtotal <= 99) {
    throw new ValidationError("Coupons are not applicable on cart values of ₹99 or less");
  }

  // --- CASE 3: Fetch and Validate Coupon ---
  const coupon = await CouponCode.findOne({
    name: couponCodeName.toUpperCase(),
    isPublished: true,
  }).lean();

  if (!coupon) {
    throw new NotFoundError("Invalid or inactive coupon");
  }

  if (cartSubtotal < coupon.minCartValue) {
    throw new ValidationError(`Minimum order of ₹${coupon.minCartValue} required for this coupon`);
  }

  // Discount Calculation Logic
  if (coupon.discountType === "PERCENTAGE") {
    discountAmount = (preTotal * coupon.discountValue) / 100;
    if (coupon.maxDiscount)
      discountAmount = Math.min(discountAmount, coupon.maxDiscount);
  } else {
    discountAmount = coupon.discountValue;
  }

  discountAmount = Math.round(discountAmount);
  const grandTotal = Math.max(preTotal - discountAmount, 0);

  const calculationSnapshot = {
    couponCodeId: coupon.couponCodeId,
    name: coupon.name,
    discountValue: discountAmount,
    isApplied: true,
    summary: {
      subtotal: cartSubtotal,
      gst: gstAmount,
      shipping: SHIPPING_CHARGES,
      preTotal: preTotal,
      discount: discountAmount,
      grandTotal: grandTotal,
      note: "GST (18%) and Shipping included in calculations",
    },
  };

  await Cart.updateOne(
    { userId },
    { $set: { appliedCoupon: calculationSnapshot } },
  );

  return {
    statusCode: 200,
    message: "Coupon applied successfully",
    success: true,
    data: {
      items: availableItems,
      summary: calculationSnapshot.summary,
    },
  };
};

const getAllCouponCodeService = async () => {
  const activeCouponCodeList = await CouponCode.find(
    {
      isPublished: true,
    },
    {
      _id: 0,
      __v: 0,
      createdAt: 0,
      updatedAt: 0,
    },
  ).lean();

  if (!activeCouponCodeList) {
    throw new InternalServerError("activeCouponCodeList can't retrived");
  }
  
  return {
    statusCode: 200,
    message: "activeCouponCodeList",
    data: activeCouponCodeList,
    success: true,
  };
};

export { applyCouponCodeService, getAllCouponCodeService };
