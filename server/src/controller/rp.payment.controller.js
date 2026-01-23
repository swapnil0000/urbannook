import {
  razorpayCreateOrderService,
  razorpayPaymentVerificationService,
} from "../services/rp.payement.service.js";
import ApiError from "../utlis/ApiError.js";
import ApiRes from "../utlis/ApiRes.js";
import User from "../model/user.model.js";
import Order from "../model/order.model.js";
import crypto from "crypto";
import Product from "../model/product.model.js";
import { v7 as uuidv7 } from "uuid";
const razorpayKeyGetController = async (_, res) => {
  if (!process.env.RP_LOCAL_TEST_KEY_ID)
    return res.status(404).json(new ApiError(404, `Rp - Key`, null, false));
  return res
    .status(200)
    .json(new ApiRes(200, `Rp - Key`, process.env.RP_LOCAL_TEST_KEY_ID, true));
};

const razorpayCreateOrderController = async (req, res) => {
  try {
    /* Not Handling the amount because it could be manipulate at client side like 0 as amount */
    const { items } = req.body;
    const { userId } = req.user;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json(new ApiError(400, "Items are required", null, false));
    }
    // 1Fetch products
    const productIds = items.map((i) => i.productId);
    const products = await Product.find({
      productId: { $in: productIds },
      productStatus: "in_stock",
    });

    if (products.length !== productIds.length) {
      return res
        .status(400)
        .json(
          new ApiError(400, "One or more products unavailable", null, false),
        );
    }
    // order items snapshot
    let totalAmount = 0;

    const orderItems = items.map((item) => {
      const product = products.find((p) => p.productId === item.productId);
      const price = product.sellingPrice * item.quantity;
      totalAmount += price;
      return {
        productId: product.productId,
        productSnapshot: {
          quantity: item.quantity,
          productImg: product.productImg,
          productName: product.productName,
          productCategory: product.productCategory,
          productSubCategory: product.productSubCategory,
          priceAtPurchase: product.sellingPrice,
        },
      };
    });
    console.log(orderItems);

    const razorpayOrder = await razorpayCreateOrderService(
      totalAmount * 100,
      "INR", //currency
    );
    const order = await Order.create({
      orderId: uuidv7(),
      userId,
      items: orderItems,
      amount: totalAmount,
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
          orderId: order.orderId,
          razorpayOrderId: razorpayOrder?.data?.id,
          amount: totalAmount,
          currency: "INR",
        },
        true,
      ),
    );
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          `Internal Server Error - ${error.message}`,
          null,
          false,
        ),
      );
  }
};

const razorpayPaymentVerificationController = async (req, res) => {
  try {
    const { userId } = req.user;
    if (!userId) {
      return res
        .status(404)
        .json(new ApiError(404, `User not found for payment`, null, false));
    }
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      req.body;

    const isPaymentVerifiedOrNot = await razorpayPaymentVerificationService(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    );
    if (!isPaymentVerifiedOrNot) {
      return res
        .status(Number(isPaymentVerifiedOrNot?.statusCode))
        .json(
          new ApiError(
            Number(isPaymentVerifiedOrNot?.statusCode),
            isPaymentVerifiedOrNot?.message,
            isPaymentVerifiedOrNot?.data,
            isPaymentVerifiedOrNot?.success,
          ),
        );
    }
    return res
      .status(Number(isPaymentVerifiedOrNot?.statusCode))
      .json(
        new ApiRes(
          Number(isPaymentVerifiedOrNot?.statusCode),
          isPaymentVerifiedOrNot?.message,
          isPaymentVerifiedOrNot?.data,
          isPaymentVerifiedOrNot?.success,
        ),
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

const razorpayWebHookController = async (req, res) => {
  const secret = process.env.RP_WEBHOOK_TEST_SECRET;
  const signature = req.headers["x-razorpay-signature"];
  if (!signature) {
    return res.status(400).json({
      statusCode: 400,
      data: null,
      success: false,
      message: "Missing signature",
    });
  }
  // Signature verification
  const shasum = crypto.createHmac("sha256", secret);
  shasum.update(req.body);
  const expectedSignature = shasum.digest("hex");

  /* Checking specficially because the webhook url is public we cant use any guard service
because it is a ser to ser call so checking this helps us to figure the verification
*/ if (expectedSignature !== signature) {
    return res.status(400).json({
      statusCode: 400,
      success: false,
      error: "Invalid signature",
      data: null,
    });
  }

  const payload = JSON.parse(req.body.toString("utf8"));
  const event = payload.event;

  switch (event) {
    /* =======================
       PAYMENT SUCCESS
    ======================== */
    case "payment.captured": {
      const payment = payload.payload.payment.entity;
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
          },
        );
      }

      console.log("✅ Payment Captured:", payment.id);
      break;
    }

    /* =======================
       PAYMENT FAILED
    ======================== */
    case "payment.failed": {
      const payment = payload.payment.entity;
      await Order.updateOne(
        { "payment.razorpayOrderId": payment.order_id },
        { $set: { status: "FAILED" } },
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
