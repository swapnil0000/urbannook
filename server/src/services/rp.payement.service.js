import Razorpay from "razorpay";
import crypto from "crypto";
import Order from "../model/order.model.js";

const razorpayCreateOrderService = async (amount, currency) => {
  try {
    // Use production credentials if NODE_ENV is production, otherwise use test credentials
    const isProduction = process.env.NODE_ENV === 'production';
    const key_id = isProduction 
      ? process.env.RP_PROD_KEY_ID 
      : process.env.RP_LOCAL_TEST_KEY_ID;
    const key_secret = isProduction 
      ? process.env.RP_PROD_SECRET 
      : process.env.RP_LOCAL_TEST_SECRET;

    // Validate credentials exist
    if (!key_id || !key_secret) {
      throw new Error(`Razorpay credentials not configured for ${isProduction ? 'production' : 'test'} environment`);
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
    
    console.log(`[INFO] Razorpay order created in ${isProduction ? 'PRODUCTION' : 'TEST'} mode:`, orderDetails.id);
    
    return {
      statusCode: 200,
      message: `Order Created successfully`,
      data: orderDetails,
      success: true,
    };
  } catch (error) {
    console.error('[ERROR] Razorpay order creation failed:', error.message);
    return {
      statusCode: 500,
      message: `Internal server error while creating order - ${error.message} : try after some time`,
      data: null,
      success: false,
    };
  }
};

const razorpayPaymentVerificationService = async (
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
) => {
  // Use production secret if NODE_ENV is production, otherwise use test secret
  const isProduction = process.env.NODE_ENV === 'production';
  const secret = isProduction 
    ? process.env.RP_PROD_SECRET 
    : process.env.RP_LOCAL_TEST_SECRET;

  // Validate secret exists
  if (!secret) {
    console.error(`[ERROR] Razorpay secret not configured for ${isProduction ? 'production' : 'test'} environment`);
    return {
      statusCode: 500,
      message: "Payment verification configuration error",
      success: false,
    };
  }

  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update((razorpay_order_id + "|" + razorpay_payment_id).toString())
    .digest("hex");

  try {
    if (generatedSignature !== razorpay_signature) {
      console.log(`[WARN] Invalid payment signature for order: ${razorpay_order_id}`);
      return {
        statusCode: 400,
        message: "Invalid payment signature",
        success: false,
      };
    }
    const order = await Order.findOne({
      "payment.razorpayOrderId": razorpay_order_id,
    });
    
    console.log(`[INFO] Payment verified successfully in ${isProduction ? 'PRODUCTION' : 'TEST'} mode for order:`, razorpay_order_id);
    
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
    console.error('[ERROR] Payment verification failed:', error.message);
    return {
      statusCode: 500,
      message: `Internal Server Error - ${error.message}`,
      data: null,
      success: false,
    };
  }
};

export { razorpayCreateOrderService, razorpayPaymentVerificationService };
