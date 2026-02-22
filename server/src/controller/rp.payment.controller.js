import {
  razorpayCreateOrderService,
  razorpayPaymentVerificationService,
} from "../services/rp.payement.service.js";
import { ApiRes } from "../utils/index.js";
import User from "../model/user.model.js";
import Order from "../model/order.model.js";
import Cart from "../model/user.cart.model.js";
import crypto from "crypto";
import Product from "../model/product.model.js";
import { v7 as uuidv7 } from "uuid";
import {
  sendOrderConfirmation,
  sendPaymentReceipt,
} from "../services/email.service.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { ValidationError, NotFoundError } from "../utils/errors.js";

// Payment error code mapping
const PAYMENT_ERROR_MESSAGES = {
  BAD_REQUEST_ERROR: "Payment failed due to invalid request. Please try again.",
  GATEWAY_ERROR:
    "Payment gateway error. Please try again or use a different payment method.",
  SERVER_ERROR: "Payment server error. Please try again later.",
  payment_failed:
    "Payment failed. Please try again or use a different payment method.",
  payment_timeout:
    "Payment timed out. Your cart has been preserved. Please try again.",
  insufficient_funds: "Insufficient funds. Please check your account balance.",
  card_declined: "Card declined. Please contact your bank or try another card.",
  network_error: "Network error. Please check your connection and try again.",
  invalid_card: "Invalid card details. Please check and try again.",
  authentication_failed: "3D Secure authentication failed. Please try again.",
  signature_verification_failed:
    "Payment verification failed. Please contact support if amount was debited.",
  default: "Payment could not be processed. Please try again later.",
};

const getErrorMessage = (errorCode) => {
  return PAYMENT_ERROR_MESSAGES[errorCode] || PAYMENT_ERROR_MESSAGES.default;
};
const razorpayKeyGetController = asyncHandler(async (_, res) => {
  if (!process.env.RP_LOCAL_TEST_KEY_ID) {
    throw new NotFoundError("Rp - Key");
  }
  return res
    .status(200)
    .json(new ApiRes(200, `Rp - Key`, process.env.RP_LOCAL_TEST_KEY_ID, true));
});

const razorpayCreateOrderController = asyncHandler(async (req, res) => {
  /* Not Handling the amount because it could be manipulate at client side like 0 as amount */
  const { items } = req.body;
  const { userId } = req.user;
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ValidationError("Items are required");
  }

  // Fetch cart to get the calculated grand total from applyCoupon API
  const cart = await Cart.findOne({ userId }).lean();

  if (!cart?.appliedCoupon?.summary?.grandTotal) {
    throw new ValidationError("Cart pricing not calculated. Please refresh the page.");
  }

  const finalAmount = cart.appliedCoupon.summary.grandTotal;

  // Fetch products for order snapshot
  const productIds = items.map((i) => i.productId);
  const products = await Product.find({
    productId: { $in: productIds },
    productStatus: "in_stock",
  });

  if (products.length !== productIds.length) {
    throw new ValidationError("One or more products unavailable");
  }

  // Create order items snapshot
  const orderItems = items.map((item) => {
    const product = products.find((p) => p.productId === item.productId);
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

  const razorpayOrder = await razorpayCreateOrderService(
    finalAmount * 100, // Razorpay expects amount in paise
    "INR", //currency
  );

  const order = await Order.create({
    orderId: uuidv7(),
    userId,
    items: orderItems,
    amount: finalAmount,
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
        amount: finalAmount * 100, // Return amount in paise for Razorpay
        currency: "INR",
      },
      true,
    ),
  );
});

const razorpayPaymentVerificationController = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  if (!userId) {
    throw new NotFoundError("User not found for payment");
  }
  const {
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
    error,
  } = req.body;

  console.log(
    `[INFO] Payment verification started - UserId: ${userId}, RazorpayOrderId: ${razorpay_order_id}, RazorpayPaymentId: ${razorpay_payment_id}`,
  );

  // Handle payment failure from Razorpay
  if (error) {
    const errorCode = error.code || "payment_failed";
    const errorDescription = getErrorMessage(errorCode);

    console.log(
      `[WARN] Payment failed from Razorpay - UserId: ${userId}, RazorpayOrderId: ${razorpay_order_id}, ErrorCode: ${errorCode}, ErrorDescription: ${errorDescription}`,
    );

    // Update order with error details
    await Order.updateOne(
      { "payment.razorpayOrderId": razorpay_order_id },
      {
        $set: {
          status: "FAILED",
          "payment.errorCode": errorCode,
          "payment.errorDescription": errorDescription,
        },
      },
    );

    throw new ValidationError(errorDescription, { errorCode, preserveCart: true });
  }

  const isPaymentVerifiedOrNot = await razorpayPaymentVerificationService(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  );
  if (!isPaymentVerifiedOrNot) {
    // Signature verification failed
    const errorCode = "signature_verification_failed";
    const errorDescription = getErrorMessage(errorCode);

    console.error(
      `[ERROR] Payment signature verification failed - UserId: ${userId}, RazorpayOrderId: ${razorpay_order_id}, RazorpayPaymentId: ${razorpay_payment_id}`,
    );

    await Order.updateOne(
      { "payment.razorpayOrderId": razorpay_order_id },
      {
        $set: {
          status: "FAILED",
          "payment.errorCode": errorCode,
          "payment.errorDescription": errorDescription,
        },
      },
    );

    throw new ValidationError(errorDescription, { errorCode, preserveCart: true });
  }

  console.log(
    `[INFO] Payment verification successful - UserId: ${userId}, RazorpayOrderId: ${razorpay_order_id}, RazorpayPaymentId: ${razorpay_payment_id}`,
  );

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
});

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
  shasum.update(req.body); // req.body is already a Buffer from bodyParser.raw()
  const expectedSignature = shasum.digest("hex");

  /* Checking specifically because the webhook url is public we cant use any guard service
  because it is a server to server call so checking this helps us to figure the verification */
  if (expectedSignature === signature) {
    // Signature is valid, process the webhook
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
        });

        if (!order) break;

        // idempotent update
        if (order.status !== "PAID") {
          order.payment.razorpayPaymentId = payment.id;
          order.status = "PAID";
          await order.save();
          const findingUserId = await Order.findOne(
            {
              orderId: order?.orderId,
            },
            {
              userId: 1,
            },
          ).lean();

          // Clear user's cart after successful payment
          try {
            await Cart.updateOne(
              { userId: findingUserId?.userId },
              { $set: { items: [] } },
            );
            console.log(
              `[INFO] Cart cleared after successful payment - UserId: ${findingUserId?.userId}, OrderId: ${order.orderId}`,
            );
          } catch (cartError) {
            console.error(
              `[ERROR] Failed to clear cart after payment - UserId: ${findingUserId?.userId}, OrderId: ${order.orderId}:`,
              cartError.message,
            );
            // Don't fail the payment if cart clearing fails
          }

          // Send order confirmation and payment receipt emails
          try {
            const user = await User.findOne({ userId: findingUserId?.userId });
            if (user && user.email) {
              // Prepare order details for email
              const orderDetails = {
                orderId: order.orderId,
                items: order.items.map((item) => ({
                  productName: item.productSnapshot.productName,
                  quantity: item.productSnapshot.quantity,
                  price: item.productSnapshot.priceAtPurchase,
                })),
                total: order.amount,
                orderDate: order.createdAt,
              };

              // Send order confirmation email
              sendOrderConfirmation(user.email, orderDetails).catch((err) => {
                console.error("Failed to send order confirmation email:", err);
              });

              // Send payment receipt email
              const paymentDetails = {
                paymentId: payment.id,
                amount: order.amount,
                orderId: order.orderId,
                date: new Date(),
              };
              sendPaymentReceipt(user.email, paymentDetails).catch((err) => {
                console.error("Failed to send payment receipt email:", err);
              });
            }
          } catch (emailError) {
            console.error("Error sending emails:", emailError);
          }
        }

        console.log("✅ Payment Captured:", payment.id);
        break;
      }

      /* =======================
         PAYMENT FAILED
      ======================== */
      case "payment.failed": {
        const payment = payload.payload.payment.entity;
        const errorCode = payment.error_code || "payment_failed";
        const errorDescription =
          payment.error_description || getErrorMessage(errorCode);

        await Order.updateOne(
          { "payment.razorpayOrderId": payment.order_id },
          {
            $set: {
              status: "FAILED",
              "payment.errorCode": errorCode,
              "payment.errorDescription": errorDescription,
            },
          },
        );

        console.log("❌ Payment Failed:", payment.id, errorCode);
        break;
      }

      /* =======================
         ORDER PAID (OPTIONAL)
      ======================== */
      case "order.paid": {
        const orderEntity = payload.payload.order.entity;
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
  } else {
    // Signature is invalid
    return res.status(400).json({
      statusCode: 400,
      success: false,
      error: "Invalid signature",
      data: null,
    });
  }
};

export {
  razorpayCreateOrderController,
  razorpayPaymentVerificationController,
  razorpayKeyGetController,
  razorpayWebHookController,
};
