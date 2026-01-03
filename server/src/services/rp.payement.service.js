import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";
import Order from "../model/order.model.js";
dotenv.config({
  path: "./.env",
});

const razorpayCreateOrderService = async (amount, currency) => {
  try {
    const key_id = process.env.RP_LOCAL_TEST_KEY_ID;
    const key_secret = process.env.RP_LOCAL_TEST_SECRET;
    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });
    const razorpayOptions = {
      amount: amount * 100,
      currency,
    };
    const orderDetails = await razorpay.orders.create(razorpayOptions);
    return {
      statusCode: 200,
      message: `Order Created successfully`,
      data: orderDetails,
      success: true,
    };
  } catch (error) {
    return {
      statusCode: 500,
      message: `Internal server error while creating order - ${error} : try after some time`,
      data: null,
      success: false,
    };
  }
};

const razorpayPaymentVerificationService = async (
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature
) => {
  const secret = process.env.RP_LOCAL_TEST_SECRET;
  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update((razorpay_order_id + "|" + razorpay_payment_id).toString())
    .digest("hex");

  try {
    if (generatedSignature !== razorpay_signature) {
      return {
        statusCode: 400,
        message: "Invalid payment signature",
        success: false,
      };
    }
    const order = await Order.findOne({
      "payment.razorpayOrderId": razorpay_order_id,
    });
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
  } catch (error) {
    return {
      statusCode: 500,
      message: `Internal Server Error - ${error}`,
      data: null,
      success: false,
    };
  }
};

export { razorpayCreateOrderService, razorpayPaymentVerificationService };
