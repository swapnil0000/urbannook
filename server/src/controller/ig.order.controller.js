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
    return res.status(410).json(
      new ApiRes(410, "Link Expired", null, false)
    );
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
 * Public — accepts igOrderId, customerInstaId, shippingAddress
 * Fetches amount from DB (never trusts client), creates Razorpay order
 */
const initIgPaymentController = asyncHandler(async (req, res) => {
  const { igOrderId, customerInstaId, shippingAddress } = req.body;

  if (!igOrderId) throw new ValidationError("igOrderId is required");
  if (!customerInstaId) throw new ValidationError("Instagram handle is required");
  if (!shippingAddress) throw new ValidationError("Shipping address is required");

  const order = await IgOrder.findOne({ orderId: igOrderId });
  if (!order) throw new NotFoundError("Order");

  if (order.status === "PAID") {
    return res.status(410).json(
      new ApiRes(410, "Link Expired", null, false)
    );
  }

  // Create Razorpay order — amount from DB only
  const razorpayResult = await razorpayCreateOrderService(
    order.amount * 100, // paise
    "INR"
  );

  // Update record with insta handle, address, razorpay order id
  order.customerInstaId = customerInstaId;
  order.shippingAddress = shippingAddress;
  order.payment.razorpayOrderId = razorpayResult.data.id;
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

export { getIgOrderController, initIgPaymentController, getIgRpKeyController };
