import Order from "../model/order.model.js";
import PaymentFeedback from "../model/paymentFeedback.model.js";
import { ApiRes } from "../utils/index.js";
import { ValidationError } from "../utils/errors.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";

const TAG = "[PaymentFeedback]";

/**
 * POST /payment-feedback — public.
 *
 * Saves the answer from the checkout "what stopped you?" form. The Razorpay
 * order id is the only link to the order; everything identifying is copied
 * from that Order so the client can't attribute feedback to someone else.
 * Paid orders are refused — feedback about a cancel only makes sense while
 * the order is still unpaid.
 */
const submitPaymentFeedbackController = asyncHandler(async (req, res) => {
  const { razorpayOrderId, reason, comment, isInAppBrowser } = req.body;

  const order = await Order.findOne(
    { "payment.razorpayOrderId": razorpayOrderId },
    "orderId userId userName userEmail userMobile guestInfo amount status isGuestOrder",
  ).lean();

  if (!order) throw new ValidationError("We couldn't find that order.");
  if (!["CREATED", "FAILED"].includes(order.status)) {
    throw new ValidationError("This order is already paid.");
  }

  await PaymentFeedback.findOneAndUpdate(
    { razorpayOrderId },
    {
      $set: {
        orderId: order.orderId,
        userId: order.userId || null,
        name: order.guestInfo?.name || order.userName || null,
        email: order.guestInfo?.email || order.userEmail || null,
        mobile: order.guestInfo?.mobile || order.userMobile || null,
        amount: order.amount ?? null,
        isGuestOrder: !!order.isGuestOrder,
        reason,
        comment: comment || "",
        isInAppBrowser: !!isInAppBrowser,
        userAgent: (req.headers["user-agent"] || "").slice(0, 400) || null,
      },
    },
    { upsert: true, new: true, runValidators: true },
  );

  console.log(`${TAG} order=${order.orderId} rp=${razorpayOrderId} reason=${reason}`);

  return res.status(200).json(new ApiRes(200, "Thanks for telling us", null, true));
});

export { submitPaymentFeedbackController };
