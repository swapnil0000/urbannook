import {
  addToCartService,
  getCartService,
  cartQuantityService,
  clearCartService,
} from "../services/user.cart.service.js";
import { ApiError, ApiRes } from "../utlis/index.js";
import Order from "../model/order.model.js";
const userAddToCart = async (req, res) => {
  try {
    const { userId } = req.user;
    const { productId, productQuanity } = req.body;
    // fieldMissing and adding to cart check
    const productAdditionToCart = await addToCartService({
      userId,
      productId,
      productQuanity: productQuanity || 1,
    });
    if (!productAdditionToCart?.success) {
      return res
        .status(Number(productAdditionToCart?.statusCode))
        .json(
          new ApiError(
            productAdditionToCart?.statusCode,
            productAdditionToCart?.message,
            productAdditionToCart?.data,
            productAdditionToCart?.success,
          ),
        );
    }
    return res
      .status(Number(productAdditionToCart?.statusCode))
      .json(
        new ApiRes(
          productAdditionToCart?.statusCode,
          productAdditionToCart?.message,
          productAdditionToCart?.data,
          productAdditionToCart?.success,
        ),
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

const userGetCart = async (req, res) => {
  try {
    const { userId } = req.user;
    const cartDetails = await getCartService({ userId });
    if (!cartDetails?.success) {
      return res
        .status(Number(cartDetails?.statusCode))
        .json(
          new ApiError(
            cartDetails?.statusCode,
            cartDetails?.message,
            cartDetails?.data,
            cartDetails?.success,
          ),
        );
    }
    return res
      .status(Number(cartDetails?.statusCode))
      .json(
        new ApiRes(
          cartDetails?.statusCode,
          cartDetails?.message,
          cartDetails?.data,
          cartDetails?.success,
        ),
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

const userUpdateCartQuantity = async (req, res) => {
  try {
    const { userId } = req.user;
    const { productId, quantity, action } = req.body || {};
    const productAdditionToCart = await cartQuantityService({
      userId,
      productId,
      quantity: quantity || 1,
      action,
    });
    if (!productAdditionToCart?.success) {
      return res
        .status(Number(productAdditionToCart?.statusCode))
        .json(
          new ApiError(
            productAdditionToCart?.statusCode,
            productAdditionToCart?.message,
            productAdditionToCart?.data,
            productAdditionToCart?.success,
          ),
        );
    }
    return res
      .status(Number(productAdditionToCart?.statusCode))
      .json(
        new ApiRes(
          productAdditionToCart?.statusCode,
          productAdditionToCart?.message,
          productAdditionToCart?.data,
          productAdditionToCart?.success,
        ),
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, null, false));
  }
};

const userClearCart = async (req, res) => {
  try {
    const { userId } = req.user;
    const clearCartServiceValidation = await clearCartService({ userId });
    if (!clearCartServiceValidation?.success) {
      return res
        .status(Number(clearCartServiceValidation?.statusCode))
        .json(
          new ApiError(
            clearCartServiceValidation?.statusCode,
            clearCartServiceValidation?.message,
            clearCartServiceValidation?.data,
            clearCartServiceValidation?.success,
          ),
        );
    }
    return res
      .status(Number(clearCartServiceValidation?.statusCode))
      .json(
        new ApiRes(
          clearCartServiceValidation?.statusCode,
          clearCartServiceValidation?.message,
          clearCartServiceValidation?.data,
          clearCartServiceValidation?.success,
        ),
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, null, false));
  }
};

const userOrderPreviousHistory = async (req, res) => {
  try {
    const { userId } = req.user;

    if (!userId) {
      return res
        .status(401)
        .json(new ApiError(401, "Unauthorized", null, false));
    }

    const orders = await Order.find({ userId })
      .sort({ createdAt: -1 })
      .lean()
      .select("-_id");

    return res.status(200).json(
      new ApiRes(
        200,
        orders.length === 0
          ? "No orders placed yet"
          : "Orders fetched successfully",
        {
          totalOrders: orders.length,
          orders,
        },
        true,
      ),
    );
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          `Internal Server Error - ${error.message}`,
          null,
          false,
        ),
      );
  }
};




const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status, note, trackingInfo } = req.body;

    console.log(`[INFO] Order status update requested - OrderId: ${orderId}, Status: ${status}, Note: ${note}`);

    // Validate required fields
    if (!orderId || !status) {
      return res
        .status(400)
        .json(new ApiError(400, "Order ID and status are required", null, false));
    }

    // Validate status enum
    const validStatuses = ["CREATED", "PAID", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "FAILED"];
    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json(new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(", ")}`, null, false));
    }

    // Find the order
    const order = await Order.findOne({ orderId });
    if (!order) {
      console.log(`[WARN] Order not found for status update - OrderId: ${orderId}`);
      return res
        .status(404)
        .json(new ApiError(404, "Order not found", null, false));
    }

    // Update order status
    order.status = status;
    
    // Add to status history
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      note: note || "",
    });

    // Update tracking info if provided
    if (trackingInfo) {
      if (trackingInfo.carrier) order.trackingInfo.carrier = trackingInfo.carrier;
      if (trackingInfo.trackingNumber) order.trackingInfo.trackingNumber = trackingInfo.trackingNumber;
      if (trackingInfo.estimatedDelivery) order.trackingInfo.estimatedDelivery = trackingInfo.estimatedDelivery;
    }

    await order.save();
    
    console.log(`[INFO] Order status updated successfully - OrderId: ${orderId}, Status: ${status}, UserId: ${order.userId}`);

    // Send email notification (don't fail if email fails)
    try {
      const { sendOrderStatusUpdate } = await import("../services/email.service.js");
      await sendOrderStatusUpdate(order.userId, orderId, status);
    } catch (emailError) {
      // Log error but don't fail the request
      console.error('Failed to send order status email:', emailError);
    }

    return res
      .status(200)
      .json(
        new ApiRes(
          200,
          "Order status updated successfully",
          {
            orderId: order.orderId,
            status: order.status,
            statusHistory: order.statusHistory,
            trackingInfo: order.trackingInfo,
          },
          true,
        ),
      );
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          `Internal Server Error - ${error.message}`,
          null,
          false,
        ),
      );
  }
};

export {
  userAddToCart,
  userGetCart,
  userUpdateCartQuantity,
  userClearCart,
  userOrderPreviousHistory,
  updateOrderStatus,
};
