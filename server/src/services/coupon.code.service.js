import CouponCode from "../model/coupon.code.model.js";
import { getCartService } from "../services/user.cart.service.js";
import Cart from "../model/user.cart.model.js";
import {
  ValidationError,
  NotFoundError,
  InternalServerError,
} from "../utils/errors.js";
import User from "../model/user.model.js";
import UserWaistList from "../model/user.waitlist.model.js";

const applyCouponCodeService = async ({ userId, couponCodeName, email }) => {
  const cartRes = await getCartService({ userId });

  if (
    !cartRes.success ||
    (cartRes.data.availableItems.length === 0 &&
      cartRes.data.unavailableItems.length === 0)
  ) {
    throw new ValidationError("Cannot calculate for empty cart");
  }

  const { cartSubtotal, availableItems } = cartRes.data;
  const SHIPPING_CHARGES = 0;

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
        discount: 0,
        grandTotal: cartSubtotal,
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
    throw new ValidationError(
      "Coupons are not applicable on cart values of ₹99 or less",
    );
  }

  // --- CASE 3: Fetch and Validate Coupon ---
  const coupon = await CouponCode.findOne({
    name: couponCodeName.toUpperCase(),
    isPublished: true,
  }).lean();  

if (!coupon) {
  throw new NotFoundError("Invalid or inactive coupon");
}

// --- CASE 4: Waitlist Membership Check ---
if (!email) {
  throw new ValidationError("User email is required for coupon application");
}

const isWaitlisted = await UserWaistList.findOne({ userEmail: email });
if (!isWaitlisted) {
  throw new ValidationError(
    "This coupon is only valid for the email address used during waitlist signup."
  );
}

if (cartSubtotal < coupon.minCartValue) {
    throw new ValidationError(
      `Minimum order of ₹${coupon.minCartValue} required for this coupon`,
    );
  }

  // Discount Calculation Logic
  if (coupon.discountType === "PERCENTAGE") {
    discountAmount = (cartSubtotal * coupon.discountValue) / 100;
    if (coupon.maxDiscount)
      discountAmount = Math.min(discountAmount, coupon.maxDiscount);
  } else {
    discountAmount = coupon.discountValue;
  }

  discountAmount = Math.round(discountAmount);
  const grandTotal = Math.max(
    cartSubtotal + SHIPPING_CHARGES - discountAmount,
    0,
  );

  const calculationSnapshot = {
    couponCodeId: coupon.couponCodeId,
    name: coupon.name,
    discountValue: discountAmount,
    isApplied: true,
    summary: {
      subtotal: cartSubtotal,
      discount: discountAmount,
      grandTotal: grandTotal,
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

const getAllCouponCodeService = async ({ userId }) => {
  const allUserRegisterdAndWaitListIsJoined = await User.aggregate([
    {
      $match: {
        userId,
        isVerified: true,
      },
    },
    {
      $lookup: {
        from: "userwaistlists",
        localField: "email",
        foreignField: "userEmail",
        as: "waitlistData",
      },
    },
    {
      $match: {
        waitlistData: { $ne: [] }, // only those present in waitlist
      },
    },
    {
      $project: {
        _id: 0,
        userId: 1,
        name: 1,
        email: 1,
        role: 1,
      },
    },
  ]);

  if (allUserRegisterdAndWaitListIsJoined?.length > 0) {
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
  }

  return {
    statusCode: 200,
    message: "activeCouponCodeList",
    data: null,
    success: true,
  };
};

export { applyCouponCodeService, getAllCouponCodeService };
