import Razorpay from "razorpay";
import { InternalServerError } from "../utils/errors.js";
import env from "../config/envConfigSetup.js";
// `extraOptions` carries the Razorpay Magic (1CC) fields — line_items,
// line_items_total, notes, receipt, rto_review, etc. Legacy callers pass only
// (amount, currency) and are unaffected: the spread below adds nothing.
const razorpayCreateOrderService = async (amount, currency, extraOptions = {}) => {
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
    ...extraOptions,
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

export { razorpayCreateOrderService };
