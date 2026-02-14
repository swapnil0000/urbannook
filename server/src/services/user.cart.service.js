import CouponCode from "../model/coupon.code.model.js";
import Product from "../model/product.model.js";
import Cart from "../model/user.cart.model.js";
import User from "../model/user.model.js";
import { cartDetailsMissing } from "../utlis/ValidateRes.js";
const addToCartService = async ({ userId, productId }) => {
  try {
    const userAndProductIdValidation = cartDetailsMissing(userId, productId);
    if (!userAndProductIdValidation?.success) {
      return {
        statusCode: userAndProductIdValidation?.statusCode,
        message: userAndProductIdValidation?.message,
        data: userAndProductIdValidation?.data,
        success: userAndProductIdValidation?.success,
      };
    }

    /* `.lean()` is used here because we only need raw data for validation and checks.
      It returns a plain JavaScript object instead of a full Mongoose document,
     which improves performance and reduces memory usage. */

    const userDetails = await User.findOne({ userId }).lean();
    if (!userDetails) {
      return {
        statusCode: 401,
        message: "Invalid userDetails - unauthorized",
        data: null,
        success: false,
      };
    }

    const productDetails = await Product.findOne(
      { productId },
      { productName: 1 },
    ).lean();

    if (!productDetails) {
      return {
        statusCode: 404,
        message: `productDetails not found with ${productId}`,
        success: false,
      };
    }

    const key = `products.${productId}`;

    /*
     Existing Cart check and Updating are seperated intentionally because 
     MongoDB update queries do not reliably tell whether a field already existed or was newly added, 
     which makes it difficult to return the correct business message (“Added” vs “Already in cart”).
     */
    const cart = await Cart.findOne({
      userId,
      [key]: { $exists: true },
    }).lean();

    if (cart) {
      return {
        statusCode: 200,
        message: "Already in cart",
        data: `User - ${userDetails.name}, Product - ${productDetails.productName}`,
        success: true,
      };
    }

    /* Cart Structure -> userId -> user mongooseId , product -> key : value -> product mongooseId : 1 
      Here quantity is saved with 1 always - to update we use different endpoints
    */
    await Cart.findOneAndUpdate(
      { userId },
      {
        $setOnInsert: { userId },
        $set: { [key]: 1 },
      },
      { upsert: true },
    );

    return {
      statusCode: 200,
      message: `Added to cart`,
      data: `User - ${userDetails?.name} and Product Name :${productDetails.productName}`,
      success: true,
    };
  } catch (error) {
    console.error("AddToCart Error:", error);
    return {
      statusCode: 500,
      message: "Internal server error",
      data: error.message,
      success: false,
    };
  }
};

const getCartService = async ({ userId }) => {
  try {
    if (!userId) {
      return {
        statusCode: 401,
        message: "Unauthorized",
        data: null,
        success: false,
      };
    }

    const userDetails = await User.findOne({ userId }, { name: 1 }).lean();
    if (!userDetails) {
      return {
        statusCode: 401,
        message: "Invalid userDetails",
        data: null,
        success: false,
      };
    }

    const cartPreview = await Cart.aggregate([
      { $match: { userId } },

      // Converting the 'products' object (map) into an array
      // so we can loop through the items
      {
        $project: {
          items: { $objectToArray: "$products" },
          appliedCoupon: 1, // to keep the coupon info available for later stages
        },
      },

      // Breaking the array so we can process one product at a time
      { $unwind: "$items" },

      // Fetcingh product details (Name, Price, Image) from the 'products' collection
      {
        $lookup: {
          from: "products",
          localField: "items.k",
          foreignField: "productId",
          as: "product",
        },
      },

      // Flatten the product array resulting from the lookup
      { $unwind: "$product" },

      // Calculate the subtotal for each individual line item
      // (Selling Price * Quantity)
      {
        $project: {
          _id: 0,
          productId: "$product.productId",
          name: "$product.productName",
          price: "$product.sellingPrice",
          image: "$product.productImg",
          quantity: "$items.v",
          appliedCoupon: 1,
          subtotal: {
            $multiply: ["$product.sellingPrice", "$items.v"],
          },
        },
      },

      // Group the items back together into a single cart object
      {
        $group: {
          _id: null,
          //  We manually specify which fields to put in the 'items' array.
          // This ensures that 'appliedCoupon' does NOT get mixed inside the items list.
          items: {
            $push: {
              productId: "$productId",
              name: "$name",
              price: "$price",
              image: "$image",
              quantity: "$quantity",
              subtotal: "$subtotal",
            },
          },
          // Sum up the subtotal of all items to get the cart total
          subtotal: { $sum: "$subtotal" },
          totalQuantity: { $sum: "$quantity" },
          // Retain the coupon information from the cart document
          appliedCoupon: { $first: "$appliedCoupon" },
        },
      },

      //  GST (Tax)  18% of the subtotal, rounded to the nearest integer
      {
        $addFields: {
          gstAmount: { $round: [{ $multiply: ["$subtotal", 0.18] }, 0] },
        },
      },

      // Calculate the Total before Discount (PreTotal)
      // Subtotal + GST + Shipping Charges (Fixed 199)
      {
        $addFields: {
          preTotalCalc: {
            $round: [{ $add: ["$subtotal", "$gstAmount", 199] }, 0],
          },
        },
      },

      // We structure the JSON exactly how the frontend expects it
      {
        $project: {
          _id: 0,
          items: 1,

          // We place the coupon details at the root level (outside summary)
          // ensuring the structure is clean and easy to access
          coupon: {
            isApplied: "$appliedCoupon.isApplied",
            code: "$appliedCoupon.name",
            discount: { $ifNull: ["$appliedCoupon.discountValue", 0] },
          },

          summary: {
            subtotal: "$subtotal",
            totalQuantity: "$totalQuantity",
            note: "GST included in MRP",
            shipping: 199,
            gst: "$gstAmount",
            preTotal: "$preTotalCalc",

            // Calculate the Grand Total
            // PreTotal - Discount.
            // We use max with 0 to ensure the total never becomes negative.
            grandTotal: {
              $max: [
                {
                  $subtract: [
                    "$preTotalCalc",
                    { $ifNull: ["$appliedCoupon.discountValue", 0] },
                  ],
                },
                0,
              ],
            },
          },
        },
      },
    ]);

    // Handle the case where the cart is completely empty
    if (!cartPreview || cartPreview.length === 0) {
      return {
        statusCode: 200,
        message: `Cart is empty for ${userDetails?.name}`,
        data: null,
        success: true,
      };
    }

    // The database calculation is done, but we must check if the coupon
    // is still valid for the current price (e.g., if price dropped)
    let finalCartData = cartPreview[0];
    const { summary, coupon } = finalCartData;
    // Only proceed if a coupon is currently marked as applied
    if (coupon && coupon.isApplied) {
      const couponRules = await CouponCode.findOne({
        name: coupon.code,
        isPublished: true,
      }).lean();

      // Check if the coupon is invalid OR if the cart value is now too low
      // Example: Coupon needs 500 minimum, but cart is now 300
      if (!couponRules || summary.preTotal < couponRules.minCartValue) {
        // Remove the coupon from the database immediately
        await Cart.updateOne({ userId }, { $unset: { appliedCoupon: 1 } });
        // Update the response object so the user sees the coupon is gone
        finalCartData.coupon = {
          isApplied: false,
          code: null,
          discount: 0,
        };
        // Reset the Grand Total to match the PreTotal (since discount is 0)
        finalCartData.summary.grandTotal = summary.preTotal;
        finalCartData.summary.note =
          "Coupon removed: Minimum order value not met";
        // Note: We don't need to clean the 'items' array here because
        // we already handled that in the aggregation $group stage.
      }
      // If the coupon is still valid, check if it is a Percentage discount
      // Percentage discounts change based on the total, so we might need to recalculate
      else if (couponRules.discountType === "PERCENTAGE") {
        // Calculate the new discount amount based on the current total
        let newDiscount = (summary.preTotal * couponRules.discountValue) / 100;
        // Apply the maximum discount limit if one exists
        if (couponRules.maxDiscount) {
          newDiscount = Math.min(newDiscount, couponRules.maxDiscount);
        }
        newDiscount = Math.round(newDiscount);
        // If the calculated discount is different from what was stored
        if (newDiscount !== coupon.discount) {
          finalCartData.coupon.discount = newDiscount;
          finalCartData.summary.grandTotal = Math.max(
            summary.preTotal - newDiscount,
            0,
          );
          await Cart.updateOne(
            { userId },
            { $set: { "appliedCoupon.discountValue": newDiscount } },
          );
        }
      }
    }

    return {
      statusCode: 200,
      message: `Cart Details for ${userId}`,
      data: finalCartData,
      success: true,
    };
  } catch (error) {
    console.error("GetCart Error:", error);
    return {
      statusCode: 500,
      message: "Internal server error",
      data: error.message,
      success: false,
    };
  }
};

const cartQuantityService = async ({ userId, productId, quantity, action }) => {
  if (!userId) {
    return {
      statusCode: 401,
      message: "Unauthorized",
      data: null,
      success: false,
    };
  }
  if (!productId && quantity === undefined && !action) {
    return {
      statusCode: 400,
      message: "productId, quantity and action are required",
      data: null,
      success: false,
    };
  }
  if (isNaN(quantity) || Number(quantity) < 0) {
    return {
      statusCode: 400,
      message: "quantity must be a non-negative number",
      data: null,
      success: false,
    };
  }

  const cartDetails = await Cart.findOne({ userId });
  const productQuanityMap = cartDetails?.products;
  const cartHasProductOrNot = productQuanityMap.has(String(productId)); // converting to string because Map has productId stored as string
  if (!cartHasProductOrNot) {
    return {
      statusCode: 400,
      message: "Product not in cart",
      data: null,
      success: false,
    };
  }

  const productQuantity = productQuanityMap.get(productId);
  switch (action) {
    case "add":
      productQuanityMap.set(productId, productQuantity + quantity);
      await cartDetails.save();
      return {
        statusCode: 200,
        message: "Quantity increased",
        success: true,
      };
    case "sub":
      if (productQuantity <= quantity && action != "remove") {
        return {
          statusCode: 400,
          message:
            "Product quantity in cart is less than or equal to requested reduction",
          success: false,
        };
      }
      productQuanityMap.set(productId, productQuantity - quantity);
      await cartDetails.save();

      return {
        statusCode: 200,
        message: "Quantity reduced",
        success: true,
      };
    case "remove":
      if (!cartHasProductOrNot) {
        return {
          statusCode: 404,
          message: "Product not found in cart",
          success: false,
        };
      }

      productQuanityMap.delete(productId);
      await cartDetails.save();

      return {
        statusCode: 200,
        message: "Product removed from cart",
        success: true,
      };
    default:
      break;
  }
  return {
    statusCode: 200,
    message: "quantity updated",
    data: userId,
    success: false,
  };
};

const clearCartService = async ({ userId }) => {
  if (!userId) {
    return {
      statusCode: 401,
      message: "Unauthorized",
      data: null,
      success: false,
    };
  }
  const cartDetails = await Cart.findOne({ userId });
  const productQuanityMap = cartDetails?.products;
  console.log(productQuanityMap);

  if (!productQuanityMap.size) {
    return {
      statusCode: 404,
      message: "Nothing to clear in cart",
      data: null,
      success: false,
    };
  }
  productQuanityMap.clear();
  await cartDetails.save();
  return {
    statusCode: 200,
    message: "Cart cleared successfully",
    data: [],
    success: true,
  };
};

export {
  addToCartService,
  getCartService,
  cartQuantityService,
  clearCartService,
};
