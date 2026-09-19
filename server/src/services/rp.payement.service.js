import Razorpay from "razorpay";
import { InternalServerError } from "../utils/errors.js";
import env from "../config/envConfigSetup.js";
/**
 * @param {number} amount    in paise
 * @param {string} currency
 * @param {object} [extraOptions]  extra Razorpay order params. Magic Checkout
 *   (1CC) passes `line_items` + `line_items_total` here — an order is only
 *   treated as a Magic order if it carries them. Note that `one_click_checkout`
 *   is NOT an order param (Razorpay rejects it with "extra_field_sent"); it is
 *   a checkout.js option on the frontend.
 */
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

/**
 * Fetch a Razorpay order. For Magic Checkout this is how the customer's
 * shipping address reaches us: Razorpay collects it in its own modal and
 * exposes it as `customer_details` on the order once payment is done.
 *
 * Returns null instead of throwing — a fetch failure must never stop the
 * webhook from marking a paid order as PAID.
 */
const razorpayFetchOrderService = async (razorpayOrderId) => {
  const key_id = env.RP_KEY_ID;
  const key_secret = env.RP_SECRET;

  if (!key_id || !key_secret || !razorpayOrderId) return null;

  try {
    const razorpay = new Razorpay({ key_id, key_secret });
    return await razorpay.orders.fetch(razorpayOrderId);
  } catch (error) {
    console.error(
      `[ERROR] Razorpay order fetch failed for ${razorpayOrderId}: ${error.message}`,
    );
    return null;
  }
};

export { razorpayCreateOrderService, razorpayFetchOrderService };
