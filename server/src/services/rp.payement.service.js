import Razorpay from "razorpay";
import crypto from "crypto";
import Order from "../model/order.model.js";
import { InternalServerError, ValidationError } from "../utils/errors.js";
import env from "../config/envConfigSetup.js";
const razorpayCreateOrderService = async (amount, currency) => {
  const key_id = env.RP_KEY_ID;
  const key_secret = env.RP_SECRET;

  // Validate credentials exist
  if (!key_id || !key_secret) {
    throw new InternalServerError(
      `Razorpay credentials not configured for ${env.NODE_ENV == "production" ? "production" : "test"} environment`,
    );
  }

  const razorpay = new Razorpay({
    key_id,
    key_secret,
  });

  const razorpayOptions = {
    amount,
    currency,
  };

  const orderDetails = await razorpay.orders.create(razorpayOptions);

  console.log(
    `[INFO] Razorpay order created in ${env.NODE_ENV == "production" ? "PRODUCTION" : "TEST"} mode:`,
    orderDetails.id,
  );

  return {
    statusCode: 200,
    message: `Order Created successfully`,
    data: orderDetails,
    success: true,
  };
};

const razorpayPaymentVerificationService = async (
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
) => {
  // Use production secret if NODE_ENV is production, otherwise use test secret
  const secret = env.RP_SECRET;

  // Validate secret exists
  if (!secret) {
    console.error(
      `[ERROR] Razorpay secret not configured for ${env.NODE_ENV == "production" ? "production" : "test"} environment`,
    );
    throw new InternalServerError("Payment verification configuration error");
  }

  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update((razorpay_order_id + "|" + razorpay_payment_id).toString())
    .digest("hex");

  if (generatedSignature !== razorpay_signature) {
    console.log(
      `[WARN] Invalid payment signature for order: ${razorpay_order_id}`,
    );
    throw new ValidationError("Invalid payment signature");
  }

  const order = await Order.findOne({
    "payment.razorpayOrderId": razorpay_order_id,
  });

  console.log(
    `[INFO] Payment verified successfully in ${env.NODE_ENV == "production" ? "PRODUCTION" : "TEST"} mode for order:`,
    razorpay_order_id,
  );

  return {
    statusCode: 200,
    message: "Payment verified successfully",
    data: {
      orderId: order._id,
      razorpay_order_id,
      razorpay_payment_id,
    },
    success: true,
  };
};

export { razorpayCreateOrderService, razorpayPaymentVerificationService };
