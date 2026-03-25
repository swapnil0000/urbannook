import { v7 as uuidv7 } from "uuid";
import crypto from "crypto";
import User from "../model/user.model.js";
import Order from "../model/order.model.js";
import Cart from "../model/user.cart.model.js";
import Product from "../model/product.model.js";
import Address from "../model/address.new.model.js";
import { razorpayCreateOrderService } from "../services/rp.payement.service.js";
import { ApiRes } from "../utils/index.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { ValidationError } from "../utils/errors.js";
import { sendOrderConfirmation, sendPaymentReceipt, sendOTP } from "../services/email.service.js";
import { generateInvoiceHtmlTemplate } from "../template/invoiceTemplate.template.js";
import { uploadInvoiceToS3 } from "../utils/s3.utils.js";
import html_to_pdf from "html-pdf-node";
import env from "../config/envConfigSetup.js";

// In-memory OTP store for guest login (use Redis in production)
const guestOtpStore = new Map();
const OTP_EXPIRY = 5 * 60 * 1000; // 5 minutes

const stripCountryCode = (mobile) => {
  if (!mobile) return "";
  const cleaned = mobile.toString().replace(/\D/g, "");
  return cleaned.length > 10 ? cleaned.slice(-10) : cleaned;
};

/**
 * POST /guest/create-order
 * No auth required. Creates/finds user by email, creates Razorpay order.
 */
const guestCreateOrderController = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    mobile,
    items,
    deliveryAddress,
    couponCode,
  } = req.body;

  if (!name || !email || !mobile) {
    throw new ValidationError("Name, email, and mobile are required");
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ValidationError("Items are required");
  }
  if (!deliveryAddress || !deliveryAddress.formattedAddress) {
    throw new ValidationError("Delivery address is required");
  }

  const emailLower = email.toLowerCase().trim();
  const cleanMobile = stripCountryCode(mobile);

  if (!/^[6-9][0-9]{9}$/.test(cleanMobile)) {
    throw new ValidationError("Valid Indian mobile number required (10 digits, starting with 6-9)");
  }

  // findOrCreate user by email
  let user = await User.findOne({ email: emailLower });
  let isNewGuest = false;

  if (!user) {
    // Create guest user
    const randomPassword = crypto.randomBytes(16).toString("hex");
    user = await User.create({
      userId: uuidv7(),
      name: name.trim(),
      email: emailLower,
      password: randomPassword,
      mobileNumber: Number(cleanMobile),
      isGuest: true,
      isVerified: true, // skip email verification for guest
    });
    isNewGuest = true;
  }
  // If user exists (real account), just attach order — don't modify their account

  // Fetch products and calculate total
  const productIds = [...new Set(items.map((i) => i.productId))];
  console.log(productIds,"==productIds");
  
  const products = await Product.find({
    productId: { $in: productIds },
    productStatus: "in_stock",
  });

  if (products.length !== productIds.length) {
    throw new ValidationError("One or more products are unavailable");
  }

  // Calculate total (no cart-based pricing for guests — compute directly)
  let subtotal = 0;
  const orderItems = items.map((item) => {
    const product = products.find((p) => p.productId === item.productId);
    subtotal += product.sellingPrice * item.quantity;
    return {
      productId: product.productId,
      productSnapshot: {
        quantity: item.quantity,
        productImg: product.productImg,
        productName: product.productName,
        productCategory: product.productCategory,
        productSubCategory: product.productSubCategory,
        priceAtPurchase: product.sellingPrice,
        shipping: "50",
        selectedColor: item.color || "N/A",
      },
    };
  });

  const shipping = 50;
  const grandTotal = subtotal + shipping;

  // Create Razorpay order
  const razorpayOrder = await razorpayCreateOrderService(grandTotal * 100, "INR");

  const deliverySnapshot = {
    fullName: name.trim(),
    mobileNumber: cleanMobile,
    formattedAddress: deliveryAddress.formattedAddress,
    pinCode: deliveryAddress.pinCode || null,
    landmark: deliveryAddress.landmark || "",
    flatOrFloorNumber: deliveryAddress.flatOrFloorNumber || "",
    city: deliveryAddress.city || "",
    state: deliveryAddress.state || "",
    lat: deliveryAddress.lat || 0,
    long: deliveryAddress.long || 0,
  };

  const order = await Order.create({
    orderId: uuidv7(),
    userEmail: emailLower,
    userId: user.userId,
    userName: name.trim(),
    userMobile: cleanMobile,
    items: orderItems,
    amount: grandTotal,
    senderMobile: cleanMobile,
    receiverMobile: cleanMobile,
    deliveryAddress: deliverySnapshot,
    payment: { razorpayOrderId: razorpayOrder?.data?.id },
    status: "CREATED",
    coupon: { isApplied: false },
    note: "Guest order",
  });

  return res.status(200).json(
    new ApiRes(200, "Guest order created", {
      orderId: order.orderId,
      razorpayOrderId: razorpayOrder?.data?.id,
      amount: grandTotal * 100,
      currency: "INR",
      razorpayKey: env.RP_KEY_ID,
      isGuest: true,
      isNewGuest,
    }, true)
  );
});

/**
 * GET /guest/order/:orderId/status  (public)
 * Returns order status by our internal orderId or razorpay orderId
 */
const guestOrderStatusController = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await Order.findOne({
    $or: [
      { "payment.razorpayOrderId": orderId },
      { orderId },
    ],
  }).lean();

  if (!order) {
    return res.status(404).json(new ApiRes(404, "Order not found", null, false));
  }

  return res.status(200).json(
    new ApiRes(200, "Order status", {
      orderId: order.orderId,
      status: order.status,
      userEmail: order.userEmail,
      isGuest: true,
    }, true)
  );
});

/**
 * POST /guest/send-otp
 * Sends OTP to guest email for login
 */
const guestSendOtpController = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ValidationError("Email is required");

  const emailLower = email.toLowerCase().trim();
  const user = await User.findOne({ email: emailLower });

  if (!user) {
    return res.status(404).json(new ApiRes(404, "No account found with this email", null, false));
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  guestOtpStore.set(emailLower, { otp, expiresAt: Date.now() + OTP_EXPIRY });

  await sendOTP(emailLower, otp, user.name).catch((err) => {
    console.error("[GUEST OTP] Failed to send OTP:", err.message);
  });

  return res.status(200).json(new ApiRes(200, "OTP sent to your email", { email: emailLower }, true));
});

/**
 * POST /guest/verify-otp
 * Verifies OTP and returns access token
 */
const guestVerifyOtpController = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) throw new ValidationError("Email and OTP are required");

  const emailLower = email.toLowerCase().trim();
  const stored = guestOtpStore.get(emailLower);

  if (!stored) {
    return res.status(400).json(new ApiRes(400, "OTP not found or expired. Please request a new one.", null, false));
  }

  if (Date.now() > stored.expiresAt) {
    guestOtpStore.delete(emailLower);
    return res.status(400).json(new ApiRes(400, "OTP has expired. Please request a new one.", null, false));
  }

  if (stored.otp !== otp.toString()) {
    return res.status(400).json(new ApiRes(400, "Invalid OTP", null, false));
  }

  guestOtpStore.delete(emailLower);

  const user = await User.findOne({ email: emailLower });
  if (!user) {
    return res.status(404).json(new ApiRes(404, "User not found", null, false));
  }

  const userAccessToken = user.genAccessToken();
  const userRefreshToken = user.genRefreshToken();
  user.userRefreshToken = userRefreshToken;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiRes(200, "Login successful", {
      name: user.name,
      email: user.email,
      mobileNumber: user.mobileNumber,
      role: user.role,
      isGuest: user.isGuest,
      userAccessToken,
      userRefreshToken,
    }, true)
  );
});

export {
  guestCreateOrderController,
  guestOrderStatusController,
  guestSendOtpController,
  guestVerifyOtpController,
};
