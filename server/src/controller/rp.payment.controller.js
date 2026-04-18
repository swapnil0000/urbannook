import { razorpayCreateOrderService } from "../services/rp.payement.service.js";
import { ApiRes } from "../utils/index.js";
import User from "../model/user.model.js";
import Order from "../model/order.model.js";
import crypto from "crypto";
import Product from "../model/product.model.js";
import { v7 as uuidv7 } from "uuid";
import Cart from "../model/user.cart.model.js";
import env from "../config/envConfigSetup.js";
import {
  sendOrderConfirmation,
  sendPaymentReceipt,
} from "../services/email.service.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { ValidationError, NotFoundError } from "../utils/errors.js";
import { uploadInvoiceToS3 } from "../utils/s3.utils.js";
import Address from "../model/address.new.model.js";
import html_to_pdf from "html-pdf-node";
import { generateInvoiceHtmlTemplate } from "../template/invoiceTemplate.template.js";

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

const stripCountryCode = (mobile) => {
  if (!mobile) return "";
  const cleaned = mobile.toString().replace(/\D/g, "");
  return cleaned.length > 10 ? cleaned.slice(-10) : cleaned;
};

const razorpayKeyGetController = asyncHandler(async (_, res) => {
  const key_id = env.RP_KEY_ID;
  if (!key_id) {
    throw new NotFoundError("Rp - Key");
  }

  return res.status(200).json(new ApiRes(200, `Rp - Key`, key_id, true));
});

const razorpayCreateOrderController = asyncHandler(async (req, res) => {
  /* Not Handling the amount because it could be manipulate at client side like 0 as amount */
  const {
    items,
    userEmail,
    senderMobile,
    receiverMobile,
    addressId,
    deliveryAddress: clientAddress,
  } = req.body;
  const { userId } = req.user;
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ValidationError("Items are required");
  }
  if (!addressId) throw new ValidationError("Delivery address is required");

  const user = await User.findOne({ userId }).lean();
  const stripCountryCode = (mobile) => {
    if (!mobile) return "";
    const trimmed = mobile.trim();
    // Strip +91 or 91 prefix if present
    if (trimmed.startsWith("+91")) {
      return trimmed.substring(3);
    } else if (trimmed.startsWith("91") && trimmed.length === 12) {
      return trimmed.substring(2);
    }
    return trimmed;
  };
  const selectedAddr = await Address.findOne({ addressId }).lean();

  if (!selectedAddr && !clientAddress) {
    throw new ValidationError("Selected address not found");
  }

  // Determine final mobile numbers with fallback logic
  const finalSenderMobile = stripCountryCode(
    senderMobile || user?.mobileNumber?.toString() || "",
  );
  const finalReceiverMobile = stripCountryCode(
    receiverMobile || finalSenderMobile,
  );

  // Validate sender mobile (required)
  if (!finalSenderMobile || !/^[0-9]{10}$/.test(finalSenderMobile)) {
    throw new ValidationError("Valid sender mobile number is required");
  }

  // Validate receiver mobile if provided
  if (receiverMobile && !/^[0-9]{10}$/.test(finalReceiverMobile)) {
    throw new ValidationError(
      "Receiver mobile number must be exactly 10 digits",
    );
  }

  // Fetch cart to get the calculated grand total from applyCoupon API
  const cart = await Cart.findOne({ userId }).lean();

  if (!cart) {
    throw new ValidationError("Cart not found. Please add items to your cart.");
  }

  // Check if pricing has been calculated (appliedCoupon.summary must exist with a valid grandTotal)
  const grandTotal = cart?.appliedCoupon?.summary?.grandTotal;  
  if (grandTotal == null || grandTotal <= 0) {
    throw new ValidationError(
      "Cart pricing not calculated. Please refresh the page.",
    );
  }

  const finalAmount = grandTotal;
  const productIds = items.map((i) => i.productId);
  const uniqueProductIds = [...new Set(productIds)]; // Get unique IDs

  const products = await Product.find({
    productId: { $in: uniqueProductIds },
    productStatus: "in_stock",
  });

  if (products.length !== uniqueProductIds.length) {
    throw new ValidationError("One or more products unavailable");
  }

  const couponCodeId = cart.appliedCoupon?.couponCodeId || null;
  const couponCodeName = cart.appliedCoupon?.name || null;
  const discountAmount = cart.appliedCoupon?.discountValue || 0;
  const isApplied = cart.appliedCoupon?.isApplied || false;
  const summary = cart.appliedCoupon?.summary || {};

  const orderItems = items.map((item) => {
    const product = products.find((p) => p.productId === item.productId);
    
    // Find the cart item to get its specific image
    let itemImage = product.productImg;
    const cartKey = `${item.productId}:${item.color || "N/A"}`;
    if (cart.products && cart.products[cartKey] && cart.products[cartKey].image) {
      itemImage = cart.products[cartKey].image;
    } else if (cart.products && cart.products[item.productId] && cart.products[item.productId].image) {
      itemImage = cart.products[item.productId].image;
    }

    return {
      productId: product.productId,
      productSnapshot: {
        quantity: item.quantity,
        productImg: itemImage,
        productName: product.productName,
        productCategory: product.productCategory,
        productSubCategory: product.productSubCategory,
        priceAtPurchase: product.sellingPrice,
        shipping: String(summary?.shipping ?? ""),
        selectedColor: item.color || "N/A",
      },
    };
  });

  const razorpayOrder = await razorpayCreateOrderService(
    finalAmount * 100, // Razorpay expects amount in paise
    "INR",
  );

  const deliveryAddressSnapshot = {
    addressId: addressId,
    fullName:
      clientAddress?.fullName ||
      selectedAddr?.fullName ||
      user?.userName ||
      user?.name ||
      "Customer",
    mobileNumber:
      clientAddress?.mobileNumber ||
      selectedAddr?.mobileNumber ||
      finalSenderMobile,
    addressLine:
      clientAddress?.addressLine ||
      clientAddress?.formattedAddress ||
      selectedAddr?.formattedAddress ||
      selectedAddr?.addressLine,
    city: clientAddress?.city || selectedAddr?.city || "",
    state: clientAddress?.state || selectedAddr?.state || "",
    pinCode: clientAddress?.pinCode || selectedAddr?.pinCode || null,
    formattedAddress:
      clientAddress?.formattedAddress || selectedAddr?.formattedAddress || "",
    deliveryAddressFull:
      clientAddress?.deliveryAddressFull || selectedAddr?.deliveryAddressFull || "",
    landmark: clientAddress?.landmark || selectedAddr?.landmark || "",
    flatOrFloorNumber:
      clientAddress?.flatOrFloorNumber || selectedAddr?.flatOrFloorNumber || "",
    lat:
      clientAddress?.lat ||
      selectedAddr?.location?.coordinates?.[1] ||
      selectedAddr?.lat ||
      0,
    long:
      clientAddress?.long ||
      selectedAddr?.location?.coordinates?.[0] ||
      selectedAddr?.long ||
      0,
  };

  const order = await Order.create({
    orderId: uuidv7(),
    userEmail,
    userId,
    userName: deliveryAddressSnapshot.fullName,
    userMobile: deliveryAddressSnapshot.mobileNumber,
    items: orderItems,
    amount: finalAmount,
    senderMobile: finalSenderMobile,
    receiverMobile: finalReceiverMobile,
    deliveryAddress: deliveryAddressSnapshot,
    payment: { razorpayOrderId: razorpayOrder?.data?.id },
    status: "CREATED",
    coupon: {
      couponCodeId,
      couponCodeName,
      discountAmount,
      isApplied,
    },
    note: "Amount is the final amount paid by the user",
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
        senderMobile: finalSenderMobile,
        receiverMobile: finalReceiverMobile,
      },
      true,
    ),
  );
});

const razorpayWebHookController = async (req, res) => {
  const secret = env.RP_WEBHOOK_SECRET;

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
          const wasFailedByCron = order.status === "FAILED";

          order.payment.razorpayPaymentId = payment.id;
          order.status = "PAID";
          order.payment.errorCode = null;
          order.payment.errorDescription = "";

          const historyNote = wasFailedByCron
            ? "Late Payment Recovery: Order was FAILED by system (timeout), but payment was confirmed later via webhook."
            : "Payment successfully captured via Razorpay.";

          order.statusHistory.push({
            status: "PAID",
            timestamp: new Date(),
            note: historyNote,
          });

          await order.save();

          try {
            await Cart.updateOne(
              { userId: order.userId },
              {
                $set: { products: {} },
                $unset: { appliedCoupon: 1 },
              },
            );
            console.log(
              `[INFO] Cart cleared after successful payment - UserId: ${order.userId}, OrderId: ${order.orderId}`,
            );
          } catch (cartError) {
            console.error(
              `[ERROR] Failed to clear cart after payment - UserId: ${order.userId}, OrderId: ${order.orderId}:`,
              cartError.message,
            );
          }

          // 2. EMAIL NOTIFICATION LOGIC
          try {
            if (order.userEmail) {
              const orderDetails = {
                orderId: order.orderId,
                items: order.items.map((item) => ({
                  productName: item.productSnapshot.productName,
                  quantity: item.productSnapshot.quantity,
                  price: item.productSnapshot.priceAtPurchase,
                })),
                total: order.amount,
                orderDate: order.createdAt,
                senderMobile: order.senderMobile,
                receiverMobile: order.receiverMobile,
              };

              // Send order confirmation email
              await sendOrderConfirmation(order.userEmail, orderDetails).catch(
                (err) => {
                  console.error(
                    "Failed to send order confirmation email:",
                    err,
                  );
                },
              );

              const paymentDetails = {
                paymentId: payment.id,
                amount: order.amount,
                orderId: order.orderId,
                date: new Date(),
              };
              await sendPaymentReceipt(order.userEmail, paymentDetails).catch(
                (err) => {
                  console.error("Failed to send payment receipt email:", err);
                },
              );
            }
          } catch (emailError) {
            console.error("Error sending emails:", emailError);
          }

          try {
            if (!order.invoiceData || !order.invoiceData.isGenerated) {
              console.log(
                `[INFO] Generating PDF Invoice for Order: ${order.orderId}...`,
              );
              const invoiceHtml = generateInvoiceHtmlTemplate(order);
              const file = { content: invoiceHtml };
              const options = {
                format: "A4",
                args: [
                  "--no-sandbox",
                  "--disable-setuid-sandbox",
                  "--disable-dev-shm-usage",
                  "--disable-gpu",
                ],
              };
              const pdfBuffer = await html_to_pdf.generatePdf(file, options);
              const savedFileKey = await uploadInvoiceToS3(
                pdfBuffer,
                order.userId,
                order.orderId,
              );
              await Order.updateOne(
                { _id: order._id },
                {
                  $set: {
                    "invoiceData.isGenerated": true,
                    "invoiceData.s3FileKey": savedFileKey,
                  },
                },
              );

              console.log(
                `✅ Invoice uploaded to S3 successfully: ${savedFileKey}`,
              );
            }
          } catch (invoiceError) {
            console.error(
              "❌ Error generating or uploading invoice to S3:",
              invoiceError,
            );
          }
        }

        console.log("✅ Payment Captured:", payment.id);
        break;
      }

      case "payment.failed": {
        const payment = payload.payload.payment.entity;
        const errorCode = payment.error_code || "payment_failed";
        const errorDescription =
          payment.error_description || "Payment attempt failed.";

        await Order.updateOne(
          {
            "payment.razorpayOrderId": payment.order_id,
            status: { $nin: ["PAID", "DELIVERED", "SHIPPED"] },
          },
          {
            $set: {
              status: "FAILED",
              "payment.errorCode": errorCode,
              "payment.errorDescription": errorDescription,
            },
            $push: {
              statusHistory: {
                status: "FAILED",
                timestamp: new Date(),
                note: `Payment failed: ${errorDescription}`,
              },
            },
          },
        );

        console.log("❌ Payment Failed:", payment.id, errorCode);
        break;
      }
      case "order.paid": {
        const orderEntity = payload.payload.order.entity;
        console.log("📦 Order Paid Event:", orderEntity.id);
        break;
      }

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
  razorpayKeyGetController,
  razorpayWebHookController,
};
