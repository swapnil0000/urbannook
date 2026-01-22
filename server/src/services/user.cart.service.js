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
      // Match user's cart
      {
        $match: {
          userId,
        },
      },

      // Convert products object → array
      {
        $project: {
          items: {
            $objectToArray: "$products",
          },
        },
      },

      // 3Expand each product
      {
        $unwind: "$items",
      },

      //  Join with Product collection
      {
        $lookup: {
          from: "products",
          localField: "items.k",
          foreignField: "productId",
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
          quantity: "$items.v",
          subtotal: {
            $multiply: ["$product.sellingPrice", "$items.v"],
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
            subtotal: 1,
            totalQuantity: 1,
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

const cartQuantityService = async ({ userId, productId, quantity, action }) => {
  if (!userId) {
    return {
      statusCode: 401,
      message: "Unauthorized",
      data: null,
      success: false,
    };
  }
  if (!productId && (quantity === undefined) & !action) {
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
  previewCartService,
  cartQuantityService,
  clearCartService,
};
