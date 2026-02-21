import CouponCode from "../model/coupon.code.model.js";
import { getCartService } from "../services/user.cart.service.js";
import Cart from "../model/user.cart.model.js";
const applyCouponCodeService = async ({ userId, couponCodeName }) => {
  try {
    const cartRes = await getCartService({ userId });
    if (
      !cartRes.success ||
      (cartRes.data.availableItems.length === 0 &&
        cartRes.data.unavailableItems.length === 0)
    ) {
      return {
        statusCode: 400,
        message: "Cannot calculate for empty cart",
        success: false,
      };
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
      return {
        statusCode: 400,
        message: "Coupons are not applicable on cart values of ₹99 or less",
        success: false,
      };
    }

    // --- CASE 3: Fetch and Validate Coupon ---
    const coupon = await CouponCode.findOne({
      name: couponCodeName.toUpperCase(),
      isPublished: true,
    }).lean();

    if (!coupon) {
      return {
        statusCode: 404,
        message: "Invalid or inactive coupon",
        success: false,
      };
    }

    if (cartSubtotal < coupon.minCartValue) {
      return {
        statusCode: 400,
        message: `Minimum order of ₹${coupon.minCartValue} required for this coupon`,
        success: false,
      };
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
  } catch (error) {
    console.error(`[ERROR] ApplyCoupon Error:`, error.message, error.stack);
    return {
      statusCode: 500,
      message: "Calculation failed",
      data: error.message,
      success: false,
    };
  }
};

const getAllCouponCodeService = async () => {
  try {
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
      return {
        statusCode: 400,
        message: "activeCouponCodeList can't retrived",
        data: null,
        success: false,
      };
    }
    return {
      statusCode: 200,
      message: "activeCouponCodeList",
      data: activeCouponCodeList,
      success: true,
    };
  } catch (error) {
    console.error(`[ERROR] Error from get all coupon code:`, error.message, error.stack);
    return {
      statusCode: 500,
      message: "Internal server error",
      data: null,
      success: false,
    };
  }
};
export { applyCouponCodeService, getAllCouponCodeService };
