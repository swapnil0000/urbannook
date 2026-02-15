import CouponCode from "../model/coupon.code.model.js";
import { getCartService } from "../services/user.cart.service.js";
import Cart from "../model/user.cart.model.js";
const applyCouponCodeService = async ({ userId, couponCodeName }) => {
  try {
    // 1. Get raw cart and current subtotal
    const cartRes = await getCartService({ userId });
    if (!cartRes.success || !cartRes.data.items.length) {
      return { statusCode: 400, message: "Cannot apply coupon to empty cart", success: false };
    }

    const { cartSubtotal, items } = cartRes.data;

    // 2. Fetch Coupon from DB
    const coupon = await CouponCode.findOne({
      name: couponCodeName.toUpperCase(),
      isPublished: true,
    }).lean();

    if (!coupon) {
      return { statusCode: 404, message: "Invalid or inactive coupon", success: false };
    }

    // 3. Min Cart Value Validation
    if (cartSubtotal < coupon.minCartValue) {
      return {
        statusCode: 400,
        message: `Minimum order of ₹${coupon.minCartValue} required for this coupon`,
        success: false,
      };
    }

    // 4. PRICE ENGINE LOGIC
    const GST_RATE = 0.18;
    const SHIPPING_CHARGES = 199;

    const gstAmount = Math.round(cartSubtotal * GST_RATE);
    const preTotal = cartSubtotal + gstAmount + SHIPPING_CHARGES;

    let discountAmount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      discountAmount = (preTotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    discountAmount = Math.round(discountAmount);
    const grandTotal = Math.max(preTotal - discountAmount, 0);

    // 5. Structure Snapshot based on Updated Model
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

    // 6. DB Update
    await Cart.updateOne(
      { userId },
      { $set: { appliedCoupon: calculationSnapshot } }
    );

    return {
      statusCode: 200,
      message: "Coupon applied successfully",
      success: true,
      data: {
        items,
        summary: calculationSnapshot.summary,
      },
    };
  } catch (error) {
    console.error("ApplyCoupon Error:", error);
    return { statusCode: 500, message: "Calculation failed", data: error.message, success: false };
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
    console.error("Error from get all coupon code:", error);
    return {
      statusCode: 500,
      message: "Internal server error",
      data: null,
      success: false,
    };
  }
};
export { applyCouponCodeService, getAllCouponCodeService };
