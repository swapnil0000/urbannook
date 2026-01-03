import {
  razorpayCreateOrderService,
  razorpayPaymentVerificationService,
} from "../services/rp.payement.service.js";
import ApiError from "../utlis/ApiError.js";
import ApiRes from "../utlis/ApiRes.js";
import dotenv from "dotenv";
import User from "../model/user.model.js";
import Order from "../model/order.model.js";
import crypto from "crypto";
dotenv.config({
  path: "./.env",
});
const razorpayKeyGetController = async (_, res) => {
  if (!process.env.RP_LOCAL_TEST_KEY_ID)
    return res.status(404).json(new ApiError(404, `Rp - Key`, null, false));
  return res
    .status(200)
    .json(new ApiRes(200, `Rp - Key`, process.env.RP_LOCAL_TEST_KEY_ID, true));
};

const razorpayCreateOrderController = async (req, res) => {
  const { amount, currency, items } = req.body;

  const { _id: userId } = req.user;

  const razorpayOrder = await razorpayCreateOrderService(amount, currency);
  const order = await Order.create({
    userId,
    amount,
    items,
    payment: {
      razorpayOrderId: razorpayOrder?.data?.id,
    },
    qunatity: items?.qunatity || 1,
    status: "CREATED",
  });
  return res.status(200).json(
    new ApiRes(
      200,
      "Order created",
      {
        razorpayOrder: razorpayOrder.data,
        orderId: order._id,
      },
      true
    )
  );
};

const razorpayPaymentVerificationController = async (req, res) => {
  try {
    const { userEmail } = req.user;
    if (!userEmail) {
      return res
        .status(404)
        .json(new ApiError(404, `User not found for payment`, null, false));
    }
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      req.body;

    const isPaymentVerifiedOrNot = await razorpayPaymentVerificationService(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );
    if (!isPaymentVerifiedOrNot) {
      return res
        .status(Number(isPaymentVerifiedOrNot?.statusCode))
        .json(
          new ApiError(
            Number(isPaymentVerifiedOrNot?.statusCode),
            isPaymentVerifiedOrNot?.message,
            isPaymentVerifiedOrNot?.data,
            isPaymentVerifiedOrNot?.success
          )
        );
    }
    return res
      .status(Number(isPaymentVerifiedOrNot?.statusCode))
      .json(
        new ApiRes(
          Number(isPaymentVerifiedOrNot?.statusCode),
          isPaymentVerifiedOrNot?.message,
          isPaymentVerifiedOrNot?.data,
          isPaymentVerifiedOrNot?.success
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

const razorpayWebHookController = async (req, res) => {
  const secret = process.env.RP_WEBHOOK_TEST_SECRET;

  // 1️⃣ Signature verification
  const shasum = crypto.createHmac("sha256", secret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest("hex");

  if (digest !== req.headers["x-razorpay-signature"]) {
    return res.status(400).json({ success: false });
  }

  const event = req.body.event;

  switch (event) {
    /* =======================
       PAYMENT SUCCESS
    ======================== */
    case "payment.captured": {
      const payment = req.body.payload.payment.entity;
      const razorpayOrderId = payment.order_id;

      const order = await Order.findOne({
        "payment.razorpayOrderId": razorpayOrderId,
      }).populate("items.productId");

      if (!order) break;

      // idempotent update
      if (order.status !== "PAID") {
        order.payment.razorpayPaymentId = payment.id;
        order.status = "PAID";
        await order.save();
        await User.findByIdAndUpdate(
          { _id: order.userId },
          {
            $push: { userPreviousOrder: order._id },
            $set: { addedToCart: [] },
          }
        );
      }

      console.log("✅ Payment Captured:", payment.id);
      break;
    }

    /* =======================
       PAYMENT FAILED
    ======================== */
    case "payment.failed": {
      const payment = req.body.payload.payment.entity;
      const razorpayOrderId = payment.order_id;

      await Order.updateOne(
        { "payment.razorpayOrderId": razorpayOrderId },
        { $set: { status: "FAILED" } }
      );

      console.log("❌ Payment Failed:", payment.id);
      break;
    }

    /* =======================
       ORDER PAID (OPTIONAL)
    ======================== */
    case "order.paid": {
      const orderEntity = req.body.payload.order.entity;
      console.log("📦 Order Paid Event:", orderEntity.id);
      break;
    }

    /* =======================
       DEFAULT
    ======================== */
    default:
      console.log("Unhandled event:", event);
  }

  return res.status(200).json({ status: "ok" });
};

export {
  razorpayCreateOrderController,
  razorpayPaymentVerificationController,
  razorpayKeyGetController,
  razorpayWebHookController,
};
