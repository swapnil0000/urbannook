import CouponCode from "../model/coupon.code.model.js";
import { getCartService } from "../services/user.cart.service.js";
import Cart from "../model/user.cart.model.js";
const applyCouponCodeService = async ({ userId, couponCodeName }) => {
  try {
    if (!userId || !couponCodeName) {
      return {
        statusCode: 400,
        message: "userId & couponCodeName required",
        data: null,
        success: false,
      };
    }

    // Check if it exists and is currently published/active
    const coupon = await CouponCode.findOne({
      name: couponCodeName.toUpperCase(), // uppercase to avoid case-sensitive errors
      isPublished: true,
    }).lean();

    if (!coupon) {
      return {
        statusCode: 404,
        message: "Invalid or inactive coupon",
        data: null,
        success: false,
      };
    }

    // to ensures we are checking the coupon against the REAL current price.
    const cartRes = await getCartService({
      userId,
    });

    //cart fetch failed, stop here.
    if (!cartRes.success)
      return {
        statusCode: 409,
        message: "Failed to fetch cart details",
        data: cartRes,
        success: false,
      };

    const cartData = cartRes.data;
    // Note: applying discount on 'preTotal' (which includes Tax + Shipping)
    const subtotal = cartData.summary.preTotal;

    // Example: Coupon only works if total > 500
    if (subtotal < coupon.minCartValue) {
      return {
        statusCode: 400,
        message: `Minimum cart value ₹${coupon.minCartValue} required`,
        data: {
          minCartValue: coupon.minCartValue,
          currentValue: subtotal,
        },
        success: false,
      };
    }

    let calculatedDiscount = 0;
    let finalDiscount = 0;

    switch (coupon.discountType) {
      // Percentage (e.g., 10% off)
      case "PERCENTAGE":
        calculatedDiscount = (subtotal * coupon.discountValue) / 100;

        // Example: 10% off and it is coming 120, but maximum discount is ₹100.
        finalDiscount = coupon.maxDiscount
          ? Math.min(calculatedDiscount, coupon.maxDiscount)
          : calculatedDiscount;
        break;

      case "FLAT": // Explicitly handle FLAT
      default: // Fallback for any other case
        calculatedDiscount = coupon.discountValue;
        finalDiscount = coupon.discountValue;
        break;
    }

    finalDiscount = Math.round(finalDiscount); // to decimals in DB

    // We are NOT saving the grand total here. We only save "Which coupon" and "How much discount".
    // The 'getCartService' calculates the final Grand Total dynamically every time the user loads the page.
    await Cart.updateOne(
      { userId },
      {
        $set: {
          appliedCoupon: {
            couponCodeId: coupon.couponCodeId,
            name: coupon.name,
            discountValue: finalDiscount,
            isApplied: true,
          },
        },
      },
    );

    return {
      statusCode: 200,
      message: "Coupon applied successfully",
      success: true,
      data: {
        couponCode: coupon.name,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minCartValue: coupon.minCartValue,
        maxDiscount: coupon.maxDiscount,
        finalDiscount,
        description:
          coupon.discountType === "PERCENTAGE"
            ? `${coupon.discountValue}% off up to ₹${coupon.maxDiscount}`
            : `Flat ₹${coupon.discountValue} off`,
      },
    };
  } catch (error) {
    console.error("ApplyCoupon Error:", error);
    return {
      statusCode: 500,
      message: "Apply coupon failed",
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
