import {
  addToCartService,
  getCartService,
  cartQuantityService,
  clearCartService,
} from "../services/user.cart.service.js";
import { ApiRes } from "../utils/index.js";
import Order from "../model/order.model.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { AuthenticationError, ValidationError, NotFoundError } from "../utils/errors.js";

const userAddToCart = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { productId, productQuanity } = req.body;
  
  const result = await addToCartService({
    userId,
    productId,
    productQuanity: productQuanity || 1,
  });
  
  return res
    .status(result.statusCode)
    .json(
      new ApiRes(
        result.statusCode,
        result.message,
        result.data,
        result.success,
      ),
    );
});

const userGetCart = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const result = await getCartService({ userId });
  
  return res
    .status(result.statusCode)
    .json(
      new ApiRes(
        result.statusCode,
        result.message,
        result.data,
        result.success,
      ),
    );
});

const userUpdateCartQuantity = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { productId, quantity, action } = req.body || {};
  
  const result = await cartQuantityService({
    userId,
    productId,
    quantity: quantity || 1,
    action,
  });
  
  return res
    .status(result.statusCode)
    .json(
      new ApiRes(
        result.statusCode,
        result.message,
        result.data,
        result.success,
      ),
    );
});

const userClearCart = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const result = await clearCartService({ userId });
  
  return res
    .status(result.statusCode)
    .json(
      new ApiRes(
        result.statusCode,
        result.message,
        result.data,
        result.success,
      ),
    );
});

const userOrderPreviousHistory = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  if (!userId) {
    throw new AuthenticationError("Unauthorized");
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
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderId, status, note, trackingInfo } = req.body;

  console.log(
    `[INFO] Order status update requested - OrderId: ${orderId}, Status: ${status}, Note: ${note}`,
  );

  // Validate required fields
  if (!orderId || !status) {
    throw new ValidationError("Order ID and status are required");
  }

  // Validate status enum
  const validStatuses = [
    "CREATED",
    "PAID",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "FAILED",
  ];
  
  if (!validStatuses.includes(status)) {
    throw new ValidationError(
      `Invalid status. Must be one of: ${validStatuses.join(", ")}`
    );
  }

  // Find the order
  const order = await Order.findOne({ orderId });
  
  if (!order) {
    console.log(
      `[WARN] Order not found for status update - OrderId: ${orderId}`,
    );
    throw new NotFoundError("Order not found");
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
    if (trackingInfo.carrier)
      order.trackingInfo.carrier = trackingInfo.carrier;
    if (trackingInfo.trackingNumber)
      order.trackingInfo.trackingNumber = trackingInfo.trackingNumber;
    if (trackingInfo.estimatedDelivery)
      order.trackingInfo.estimatedDelivery = trackingInfo.estimatedDelivery;
  }

  await order.save();

  console.log(
    `[INFO] Order status updated successfully - OrderId: ${orderId}, Status: ${status}, UserId: ${order.userId}`,
  );

  // Send email notification (don't fail if email fails)
  try {
    const { sendOrderStatusUpdate } =
      await import("../services/email.service.js");
    await sendOrderStatusUpdate(order.userId, orderId, status);
  } catch (emailError) {
    // Log error but don't fail the request
    console.error("Failed to send order status email:", emailError);
  }

  return res.status(200).json(
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
});

export {
  userAddToCart,
  userGetCart,
  userUpdateCartQuantity,
  userClearCart,
  userOrderPreviousHistory,
  updateOrderStatus,
};
