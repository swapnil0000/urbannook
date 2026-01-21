import Product from "../model/product.model.js";
import Cart from "../model/user.cart.model.js";
import User from "../model/user.model.js";
import { cartDetailsMissing } from "../utlis/CommonResponse.js";
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

    const userDetails = await User.findOne(
      { userId },
      { _id: 1, name: 1 },
    ).lean();
    if (!userDetails) {
      return {
        statusCode: 401,
        message: "Invalid userDetails",
        data: null,
        success: false,
      };
    }

    const productDetails = await Product.findOne(
      { productId },
      { _id: 1, productName: 1 },
    ).lean();

    if (!productDetails) {
      return {
        statusCode: 404,
        message: `productDetails not found with ${productId}`,
        success: false,
      };
    }

    const key = `products.${productDetails._id}`;

    /*
     Existing Cart check and Updating are seperated intentionally because 
     MongoDB update queries do not reliably tell whether a field already existed or was newly added, 
     which makes it difficult to return the correct business message (“Added” vs “Already in cart”).
     */
    const cart = await Cart.findOne(
      { user: userDetails._id, [key]: { $exists: true } },
      { _id: 1 },
    ).lean();

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
      { user: userDetails._id },
      {
        $setOnInsert: { user: userDetails._id },
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

const previewCartService = async ({ userId }) => {
  try {
    if (!userId) {
      return {
        statusCode: 401,
        message: "Unauthorized",
        data: null,
        success: false,
      };
    }
    const userDetails = await User.findOne(
      { userId },
      { _id: 1, name: 1 },
    ).lean();
    if (!userDetails) {
      return {
        statusCode: 401,
        message: "Invalid userDetails",
        data: null,
        success: false,
      };
    }

    const cartPreview = await Cart.aggregate([
      // Match user's cart
      {
        $match: {
          user: userDetails._id,
        },
      },

      // Convert products object → array
      {
        $project: {
          products: {
            $objectToArray: "$products",
          },
        },
      },

      // 3Expand each product
      {
        $unwind: "$products",
      },

      // Convert key (string) → ObjectId
      {
        $addFields: {
          productObjectId: {
            $toObjectId: "$products.k",
          },
          quantity: "$products.v",
        },
      },

      //  Join with Product collection
      {
        $lookup: {
          from: "products",
          localField: "productObjectId",
          foreignField: "_id",
          as: "product",
        },
      },

      // Flatten product array
      {
        $unwind: "$product",
      },

      //  Shape final item
      {
        $project: {
          _id: 0,
          productId: "$product.productId",
          name: "$product.productName",
          price: "$product.sellingPrice",
          image: "$product.productImg",
          quantity: 1,
          subtotal: {
            $multiply: ["$product.sellingPrice", "$quantity"],
          },
        },
      },

      // Group back to cart summary
      {
        $group: {
          _id: null,
          items: { $push: "$$ROOT" },
          subtotal: { $sum: "$subtotal" },
          totalQuantity: { $sum: "$quantity" },
        },
      },

      // Final response format
      {
        $project: {
          _id: 0,
          items: 1,
          summary: {
            subtotal: "$subtotal",
            totalQuantity: "$totalQuantity",
            shipping: { $literal: 0 },
            tax: { $literal: 0 },
            grandTotal: "$subtotal",
          },
        },
      },
    ]);

    if (!cartPreview) {
      return {
        statusCode: 404,
        message: `Cart is empty for ${userId}`,
        data: null,
        success: false,
      };
    }

    return {
      statusCode: 200,
      message: `Cart Details for ${userId}`,
      data: cartPreview,
      success: false,
    };
  } catch (error) {
    console.error("PreviewCart Error:", error);
    return {
      statusCode: 500,
      message: "Internal server error",
      data: error.message,
      success: false,
    };
  }
};

export { addToCartService, previewCartService };
