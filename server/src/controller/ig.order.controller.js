import IgOrder from "../model/ig.order.model.js";
import { razorpayCreateOrderService } from "../services/rp.payement.service.js";
import { ApiRes } from "../utils/index.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { ValidationError, NotFoundError } from "../utils/errors.js";
import env from "../config/envConfigSetup.js";

/**
 * GET /api/v1/ig-orders/:igOrderId
 * Public — returns order details or 410 if already paid
 */
const getIgOrderController = asyncHandler(async (req, res) => {
  const { igOrderId } = req.params;

  const order = await IgOrder.findOne({ orderId: igOrderId }).lean();
  if (!order) throw new NotFoundError("Order");

  if (order.status === "PAID") {
    return res.status(410).json(new ApiRes(410, "Link Expired", null, false));
  }

  return res.status(200).json(
    new ApiRes(200, "Order fetched", {
      igOrderId: order.orderId,
      productName: order.productName,
      productImg: order.productImg,
      amount: order.amount,
      status: order.status,
    }, true)
  );
});

/**
 * POST /api/v1/ig-orders/init-payment
 * Public — collects full customer details, creates Razorpay order
 * Amount is always fetched from DB — never trusted from client
 */
const initIgPaymentController = asyncHandler(async (req, res) => {
  const {
    igOrderId,
    customerName,
    customerEmail,
    customerMobile,
    customerInstaId,
    shippingAddress,
    shippingCity,
    shippingState,
    shippingPinCode,
  } = req.body;

  if (!igOrderId) throw new ValidationError("igOrderId is required");
  if (!customerName?.trim()) throw new ValidationError("Full name is required");
  if (!customerMobile?.trim()) throw new ValidationError("Mobile number is required");
  if (!/^[0-9]{10}$/.test(customerMobile.trim())) throw new ValidationError("Mobile number must be 10 digits");
  if (!shippingAddress?.trim()) throw new ValidationError("Shipping address is required");
  if (!shippingPinCode?.trim()) throw new ValidationError("Pincode is required");

  const order = await IgOrder.findOne({ orderId: igOrderId });
  if (!order) throw new NotFoundError("Order");

  if (order.status === "PAID") {
    return res.status(410).json(new ApiRes(410, "Link Expired", null, false));
  }

  // Create Razorpay order — amount from DB only
  const razorpayResult = await razorpayCreateOrderService(order.amount * 100, "INR");

  // Save all customer details
  order.customerName = customerName.trim();
  order.customerEmail = customerEmail?.trim() || null;
  order.customerMobile = customerMobile.trim();
  order.customerInstaId = customerInstaId?.trim() || null;
  order.shippingAddress = shippingAddress.trim();
  order.shippingCity = shippingCity?.trim() || null;
  order.shippingState = shippingState?.trim() || null;
  order.shippingPinCode = shippingPinCode.trim();
  order.payment.razorpayOrderId = razorpayResult.data.id;
  order.status = "PENDING";
  await order.save();

  return res.status(200).json(
    new ApiRes(200, "Payment initiated", {
      razorpayOrderId: razorpayResult.data.id,
      amount: order.amount * 100,
      currency: "INR",
      igOrderId: order.orderId,
    }, true)
  );
});

/**
 * GET /api/v1/ig-orders/rp-key
 * Public — returns Razorpay key_id for client-side checkout
 */
const getIgRpKeyController = asyncHandler(async (_, res) => {
  const key_id = env.RP_KEY_ID;
  if (!key_id) throw new NotFoundError("Razorpay key");
  return res.status(200).json(new ApiRes(200, "Key", key_id, true));
});

/**
 * GET /api/v1/admin/ig-orders
 * Admin — list all IG orders with optional status filter
 */
const listIgOrdersAdminController = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status.toUpperCase();

  const skip = (Number(page) - 1) * Number(limit);
  const [orders, total] = await Promise.all([
    IgOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    IgOrder.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiRes(200, "IG orders fetched", { orders, total, page: Number(page), limit: Number(limit) }, true)
  );
});

export {
  getIgOrderController,
  initIgPaymentController,
  getIgRpKeyController,
  listIgOrdersAdminController,
};
