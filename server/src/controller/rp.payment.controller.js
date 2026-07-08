import { razorpayCreateOrderService } from "../services/rp.payement.service.js";
import { ApiRes } from "../utils/index.js";
import User from "../model/user.model.js";
import Order from "../model/order.model.js";
import crypto from "crypto";
import Product from "../model/product.model.js";
import { v7 as uuidv7 } from "uuid";
import Cart from "../model/user.cart.model.js";
import env from "../config/envConfigSetup.js";
import Coupon from "../model/coupon.model.js";
import CouponUsage from "../model/couponUsage.model.js";
import {
  sendOrderConfirmation,
  sendPaymentReceipt,
  sendGuestAccountCreatedEmail,
} from "../services/email.service.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { ValidationError, NotFoundError } from "../utils/errors.js";
import { uploadInvoiceToS3 } from "../utils/s3.utils.js";
import Address from "../model/address.new.model.js";
import html_to_pdf from "html-pdf-node";
import { generateInvoiceHtmlTemplate } from "../template/invoiceTemplate.template.js";
import { calculateShippingRate } from "../services/shipping.service.js";
import { sendMetaCapiEvent } from "../services/meta.capi.service.js";

// Collect Meta CAPI match-quality signals from the order-creation request.
// The webhook (Razorpay → server) has no browser context, so we persist these on
// the order and replay them into the server-side Purchase for high match quality.
const collectMetaTracking = (req) => ({
  fbp: req.body?.fbp || null,
  fbc: req.body?.fbc || null,
  anonymousId: req.body?.anonymousId || null, // persistent device id — fallback externalId for guests
  clientIp:
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || null,
  clientUserAgent: req.headers["user-agent"] || null,
  eventSourceUrl: req.headers["referer"] || req.headers["origin"] || null,
});

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
    paymentMethod: reqPaymentMethod,
  } = req.body;
  const { userId } = req.user;
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ValidationError("Items are required");
  }
  if (!addressId && !clientAddress?.formattedAddress?.trim()) throw new ValidationError("Delivery address is required");

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

  // Handle pricing logic
  let finalAmount;
  let couponCodeId = null;
  let couponCodeName = null;
  let discountAmount = 0;
  let isApplied = false;
  let summary = {};

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

  finalAmount = grandTotal;
  couponCodeId = cart.appliedCoupon?.couponCodeId || null;
  couponCodeName = cart.appliedCoupon?.name || null;
  discountAmount = cart.appliedCoupon?.discountValue || 0;
  isApplied = cart.appliedCoupon?.isApplied || false;
  summary = cart.appliedCoupon?.summary || {};

  const productIds = items.map((i) => i.productId);
  const uniqueProductIds = [...new Set(productIds)]; // Get unique IDs

  const products = await Product.find({
    productId: { $in: uniqueProductIds },
    productStatus: "in_stock",
  });

  if (products.length !== uniqueProductIds.length) {
    throw new ValidationError("One or more products unavailable");
  }

  const orderItems = items.map((item) => {
    const product = products.find((p) => p.productId === item.productId);

    // Find the cart item to get its specific image
    let itemImage = null;
    const itemVariant = item.variant || item.color || "N/A";
    const cartKey = `${item.productId}:${itemVariant}`;

    // 1. Try to get image from Cart Snapshot (Most accurate for what user saw)
    const getCartProduct = (key) => {
      if (!cart.products) return null;
      if (typeof cart.products.get === "function") return cart.products.get(key);
      return cart.products[key];
    };

    const cartProductByVariant = getCartProduct(cartKey);
    const cartProductById = getCartProduct(item.productId);

    if (cartProductByVariant && cartProductByVariant.image) {
      itemImage = cartProductByVariant.image;
    } else if (cartProductById && cartProductById.image) {
      itemImage = cartProductById.image;
    }

    // 2. Fallback to Product Variant Details (if snapshot fails or is empty)
    if (!itemImage && product.variantDetails && product.variantDetails.length > 0) {
      const variant = product.variantDetails.find(v =>
        v.variantName === itemVariant ||
        v.variantName === item.variant ||
        v.variantName === item.color
      );
      if (variant && variant.variantImage && variant.variantImage.length > 0) {
        itemImage = variant.variantImage[0];
      }
    }

    // 3. Fallback to top-level product image (Legacy/Compatibility)
    if (!itemImage) {
      itemImage = product.productImg;
    }

    // 4. Final safety check: Ensure itemImage is not empty for validation
    if (!itemImage) {
      itemImage = "https://urbannook.in/assets/logo.webp"; // placeholder if everything fails
    }

    // Find the variant specific price
    let priceAtPurchase = 0;
    if (product.variantDetails && product.variantDetails.length > 0) {
      const variant = product.variantDetails.find(v =>
        v.variantName === itemVariant ||
        v.variantName === item.variant ||
        v.variantName === item.color
      );
      if (variant && variant.variantPrice) {
        priceAtPurchase = variant.variantPrice;
      } else {
        // Default to first variant's price if no match or no price on match
        priceAtPurchase = product.variantDetails[0].variantPrice || 0;
      }
    }

    return {
      productId: product.productId,
      productSnapshot: {
        quantity: item.quantity,
        productImg: itemImage,
        productName: product.productName,
        productCategory: product.productCategory,
        productSubCategory: product.productSubCategory,
        priceAtPurchase: priceAtPurchase,
        shipping: String(summary?.shipping ?? ""),
        selectedVariant: itemVariant,
      },
    };
  });

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

  // Re-calculate shipping to get enriched data (type, weight, boxes)
  const shippingResult = await calculateShippingRate({
    pincode: deliveryAddressSnapshot.pinCode,
    paymentType: reqPaymentMethod === "COD" ? "COD" : "PREPAID",
    cartItems: items.map(i => ({
      productId: i.productId,
      quantity: i.quantity,
      price: orderItems.find(oi => oi.productId === i.productId)?.productSnapshot.priceAtPurchase
    }))
  });

  const shippingAmount = shippingResult?.total_charges || summary?.shipping || 179;

  // Recompute subtotal from actual order items — authoritative, not from cart snapshot
  const subtotal = orderItems.reduce((s, i) => s + (i.productSnapshot.priceAtPurchase * i.productSnapshot.quantity), 0);

  // Always re-derive discount from the live coupon + current subtotal.
  // This fixes: products added after coupon was applied, COD/prepaid toggle, page not refreshed.
  let isInternalTestOrder = false;
  if (isApplied && couponCodeId) {
    const liveCoupon = await Coupon.findOne(
      { couponId: couponCodeId },
      { discountType: 1, discountValue: 1, maxDiscountCap: 1, isInternal: 1, isArchived: 1, maxUsesPerUser: 1, scope: 1 }
    ).lean();

    if (!liveCoupon || liveCoupon.isArchived) {
      // Coupon was deleted/archived after apply — reject order so user knows their discount is gone
      throw new ValidationError(
        "The coupon you applied is no longer available. Please remove it from your cart and try again."
      );
    }

    // Guard: isInternal must only be set when discountType is INTERNAL_TEST.
    // If DB data is inconsistent, treat it as a regular coupon to prevent unauthorized ₹1 orders.
    if (liveCoupon.isInternal && liveCoupon.discountType !== "INTERNAL_TEST") {
      console.error(`[Coupon:Security] Coupon ${couponCodeId} has isInternal=true but discountType=${liveCoupon.discountType} — treating as invalid`);
      discountAmount = 0; isApplied = false;
      couponCodeId = null; couponCodeName = null;
    } else if (liveCoupon.isInternal && liveCoupon.discountType === "INTERNAL_TEST") {
      // ── INTERNAL TEST: completely separate path ──────────────────────────────
      // Always ₹1 regardless of cart size, shipping, or payment method.
      isInternalTestOrder = true;
      discountAmount = Math.max(subtotal + shippingAmount - 1, 0); // stored for audit record
    } else if (liveCoupon.discountType === "PERCENTAGE") {
      let d = Math.floor((subtotal * liveCoupon.discountValue) / 100);
      if (liveCoupon.maxDiscountCap) d = Math.min(d, liveCoupon.maxDiscountCap);
      discountAmount = Math.min(d, subtotal);
    } else { // FLAT
      discountAmount = Math.min(liveCoupon.discountValue || 0, subtotal);
    }

    // ── Per-user limit re-check (race condition guard) ────────────────────────
    // The apply-time check can be beaten by simultaneous orders with the same identity.
    // Re-checking here, before the Razorpay order is created, prevents double spending.
    if (isApplied && !isInternalTestOrder) {
      const normEmailCheck  = userEmail?.toLowerCase().trim() || null;
      const normMobileCheck = finalSenderMobile || null;
      const identifiers     = [normEmailCheck, normMobileCheck].filter(Boolean);

      if (identifiers.length > 0 && liveCoupon.maxUsesPerUser) {
        const priorUses = await CouponUsage.countDocuments({
          couponId: couponCodeId,
          $or: [
            ...(normEmailCheck  ? [{ email:  normEmailCheck  }] : []),
            ...(normMobileCheck ? [{ mobile: normMobileCheck }] : []),
          ],
        });
        if (priorUses >= liveCoupon.maxUsesPerUser) {
          throw new ValidationError(
            liveCoupon.maxUsesPerUser === 1
              ? "You have already used this coupon. Please remove it from your cart."
              : `You have already used this coupon ${priorUses} time(s) (limit: ${liveCoupon.maxUsesPerUser}). Please remove it from your cart.`
          );
        }
      }
    }
  }

  finalAmount = isInternalTestOrder ? 1 : Math.max(subtotal + shippingAmount - discountAmount, 0);

  // Sync shipping in snapshots
  orderItems.forEach(i => { i.productSnapshot.shipping = String(shippingAmount); });

  // COD: charge 2x shipping upfront via Razorpay, rest collected at delivery
  const isCOD = reqPaymentMethod === "COD";
  const codPartialAmount = isCOD ? Math.min(Math.ceil(shippingAmount) * 2, Math.ceil(finalAmount)) : 0;
  const codRemainingAmount = isCOD ? Math.max(0, Math.ceil(finalAmount) - codPartialAmount) : 0;
  const razorpayChargeAmount = isCOD ? codPartialAmount : finalAmount;
  // Round to whole rupees first, then convert to paise — must match the amount
  // returned to the client/stored below, or Razorpay Checkout rejects it as a mismatch.
  const razorpayChargeAmountPaise = Math.ceil(razorpayChargeAmount) * 100;

  const razorpayOrder = await razorpayCreateOrderService(
    razorpayChargeAmountPaise,
    "INR",
  );

  const order = await Order.create({
    orderId: uuidv7(),
    userEmail,
    userId,
    userName: deliveryAddressSnapshot.fullName,
    userMobile: deliveryAddressSnapshot.mobileNumber,
    items: orderItems,
    amount: finalAmount,
    shippingInfo: {
      amount: shippingAmount,
      type: shippingResult?.type || "standard",
      expectedNoOfBoxes: shippingResult?.expectedNoOfBoxes || 0,
      totalWeight: shippingResult?.totalWeight || 0,
      serviceName: shippingResult?.serviceName || null
    },
    senderMobile: finalSenderMobile,
    receiverMobile: finalReceiverMobile,
    deliveryAddress: deliveryAddressSnapshot,
    payment: { razorpayOrderId: razorpayOrder?.data?.id },
    status: "CREATED",
    paymentMethod: isCOD ? "COD" : "PREPAID",
    codDetails: isCOD ? { partialAmountPaid: codPartialAmount, remainingAmount: codRemainingAmount } : undefined,
    coupon: {
      couponCodeId,
      couponCodeName,
      discountAmount,
      isApplied,
    },
    metaTracking: collectMetaTracking(req),
    note: "Amount is the final amount paid by the user",
  });

  return res.status(200).json(
    new ApiRes(
      200,
      "Order created",
      {
        orderId: order.orderId,
        razorpayOrderId: razorpayOrder?.data?.id,
        amount: razorpayChargeAmountPaise,
        currency: "INR",
        paymentMethod: isCOD ? "COD" : "PREPAID",
        codDetails: isCOD ? { partialAmountPaid: codPartialAmount, remainingAmount: codRemainingAmount } : null,
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

          // ── STEP 1: Create guest account BEFORE marking PAID ──────────────
          // This prevents the race condition where the client polling detects
          // PAID status before the account is created, causing "user not exist"
          // errors when the user immediately clicks "Login to Track Order".
          let guestCredentials = null;
          if (order.isGuestOrder && order.guestInfo?.email) {
            try {
              const guestEmail = order.guestInfo.email.toLowerCase();
              const guestName = order.guestInfo.name || "Customer";
              const guestMobile = order.guestInfo.mobile;
              const tempPassword = generateTempPassword();

              let accountUser = await User.findOne({ email: guestEmail });
              const isExistingUser = !!accountUser;

              if (!accountUser) {
                accountUser = new User({
                  userId: uuidv7(),
                  name: guestName,
                  email: guestEmail,
                  password: tempPassword,
                  mobileNumber: guestMobile ? parseInt(guestMobile, 10) : null,
                  isVerified: true,
                  role: "USER",
                });
                await accountUser.save();
                await Cart.create({ userId: accountUser.userId, products: {} });
              }
              // Existing user: just link the order — never overwrite their password

              await Order.updateOne(
                { _id: order._id },
                { $set: { userId: accountUser.userId, isNewGuestAccount: !isExistingUser } },
              );

              // Only send account-created email for brand-new accounts
              guestCredentials = isExistingUser ? null : { guestEmail, guestName, tempPassword };
              console.log(`[INFO] Guest account ready - Email: ${guestEmail}, isNew: ${!isExistingUser}`);
            } catch (guestAccountError) {
              console.error("[ERROR] Guest account creation failed:", guestAccountError.message, guestAccountError.stack);
            }
          }

          // ── STEP 2: Mark order as PAID (account already exists at this point) ──
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

          // ── STEP 3: Send credentials email now that order is confirmed ────
          if (guestCredentials) {
            await sendGuestAccountCreatedEmail(
              guestCredentials.guestEmail,
              guestCredentials.guestName,
              guestCredentials.tempPassword,
              order.orderId,
            ).catch((err) =>
              console.error("[ERROR] Failed to send guest account email:", err.message),
            );
          }

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

          // 1.5. COUPON REDEMPTION TRACKING — runs after payment confirmed, not at apply time
          if (order.coupon?.isApplied && order.coupon?.couponCodeId) {
            try {
              const couponId   = order.coupon.couponCodeId;
              const couponCode = order.coupon.couponCodeName;
              const discount   = order.coupon.discountAmount || 0;

              const normMobile = (order.userMobile || order.senderMobile || "")
                .replace(/\D/g, "").slice(-10) || null;
              const normEmail  = order.userEmail?.toLowerCase().trim() || null;

              // Atomically increment usageCount — respects maxTotalUses cap
              const updatedCoupon = await Coupon.findOneAndUpdate(
                {
                  couponId,
                  isArchived: false,
                  $or: [
                    { maxTotalUses: null },
                    { $expr: { $lt: ["$usageCount", "$maxTotalUses"] } },
                  ],
                },
                { $inc: { usageCount: 1 } },
                { new: true },
              );

              if (updatedCoupon) {
                const productSubtotal = order.items.reduce(
                  (s, i) => s + ((i.productSnapshot?.priceAtPurchase || 0) * (i.productSnapshot?.quantity || 0)),
                  0,
                );
                await CouponUsage.create({
                  couponId,
                  couponCode,
                  orderId:               order.orderId,
                  orderType:             "WEBSITE",
                  userId:                order.userId || null,
                  email:                 normEmail,
                  mobile:                normMobile,
                  discountAmount:        discount,
                  cartValueBeforeDiscount: productSubtotal,
                  usedAt:                new Date(),
                });

                // Mark TARGETED assignment as used (embedded in coupon document)
                if (updatedCoupon.scope === "TARGETED" && (normEmail || normMobile)) {
                  await Coupon.updateOne(
                    {
                      couponId,
                      assignedTo: {
                        $elemMatch: {
                          identifier: { $in: [normEmail, normMobile].filter(Boolean) },
                          usedAt: null,
                        },
                      },
                    },
                    { $set: { "assignedTo.$.usedAt": new Date() } },
                  );
                }

                console.log(`[Coupon:Apply] Order=${order.orderId} code=${couponCode} discount=₹${discount} usageCount=${updatedCoupon.usageCount} — tracked`);
              } else {
                console.log(`[Coupon:Apply] Order=${order.orderId} code=${couponCode} — cap already reached, skipped increment`);
              }
            } catch (couponErr) {
              console.error(`[Coupon:Apply] Failed to track coupon for order ${order.orderId}:`, couponErr.message);
            }
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
          try {
            const capiContents = order.items.map((i) => ({
              id: i.productId,
              quantity: i.productSnapshot.quantity,
            }));
            await sendMetaCapiEvent({
              eventName: "Purchase",
              eventId: order.orderId,
              eventSourceUrl: order.metaTracking?.eventSourceUrl,
              userData: {
                email: order.userEmail,
                phone: order.userMobile || order.senderMobile,
                firstName: (order.userName || order.guestInfo?.name || "").split(" ")[0],
                lastName: (order.userName || order.guestInfo?.name || "").split(" ").slice(1).join(" "),
                externalId: order.userId || order.metaTracking?.anonymousId,
                fbp: order.metaTracking?.fbp,
                fbc: order.metaTracking?.fbc,
                clientIp: order.metaTracking?.clientIp,
                clientUserAgent: order.metaTracking?.clientUserAgent,
                zip: order.deliveryAddress?.pinCode ? String(order.deliveryAddress.pinCode) : null,
                city: order.deliveryAddress?.city || null,
                state: order.deliveryAddress?.state || null,
              },
              customData: {
                currency: "INR",
                value: order.amount,
                content_ids: capiContents.map((c) => c.id),
                contents: capiContents,
                num_items: capiContents.reduce((n, c) => n + (c.quantity || 1), 0),
                order_id: order.orderId,
              },
            });
          } catch (capiError) {
            console.error("[Meta CAPI] Purchase dispatch error:", capiError.message);
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

const generateTempPassword = () => {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const guestCreateOrderController = asyncHandler(async (req, res) => {
  const { items, guestInfo, deliveryAddress, paymentMethod: reqPaymentMethod } = req.body;

  if (!guestInfo?.name?.trim()) throw new ValidationError("Full name is required");
  if (!guestInfo?.email?.trim()) throw new ValidationError("Email is required");
  if (!guestInfo?.mobile?.trim()) throw new ValidationError("Mobile number is required");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(guestInfo.email)) throw new ValidationError("Invalid email address");

  const cleanMobile = stripCountryCode(guestInfo.mobile);
  if (!/^[0-9]{10}$/.test(cleanMobile)) throw new ValidationError("Valid 10-digit mobile number is required");

  if (!items || !Array.isArray(items) || items.length === 0) throw new ValidationError("Items are required");
  if (!deliveryAddress?.formattedAddress?.trim()) throw new ValidationError("Delivery address is required");
  if (!deliveryAddress?.pinCode) throw new ValidationError("Pincode is required");

  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await Product.find({ productId: { $in: productIds }, productStatus: "in_stock" });

  if (products.length !== productIds.length) throw new ValidationError("One or more products unavailable");

  let subtotal = 0;
  const rawItemsForShipping = [];

  const orderItems = items.map((item) => {
    const product = products.find((p) => p.productId === item.productId);
    const itemVariant = item.variant || "N/A";

    let priceAtPurchase = 0;
    if (product.variantDetails && product.variantDetails.length > 0) {
      const variant = product.variantDetails.find((v) => v.variantName === itemVariant);
      priceAtPurchase = variant?.variantPrice || product.variantDetails[0].variantPrice || 0;
    }
    subtotal += priceAtPurchase * item.quantity;
    rawItemsForShipping.push({ productId: item.productId, quantity: item.quantity, price: priceAtPurchase, selectedVariant: itemVariant });

    let itemImage = null;
    if (product.variantDetails?.length > 0) {
      const variant = product.variantDetails.find((v) => v.variantName === itemVariant);
      if (variant?.variantImage?.length > 0) itemImage = variant.variantImage[0];
    }
    if (!itemImage) itemImage = product.productImg || "https://urbannook.in/assets/logo.webp";

    return {
      productId: product.productId,
      productSnapshot: {
        quantity: item.quantity,
        productImg: itemImage,
        productName: product.productName,
        productCategory: product.productCategory,
        productSubCategory: product.productSubCategory,
        priceAtPurchase,
        selectedVariant: itemVariant,
      },
    };
  });

  const shippingResult = await calculateShippingRate({
    pincode: deliveryAddress.pinCode,
    paymentType: reqPaymentMethod === "COD" ? "COD" : "PREPAID",
    cartItems: rawItemsForShipping
  });
  const shippingAmount = shippingResult?.total_charges || 179;
  const finalAmount = subtotal + shippingAmount;

  // Update orderItems with shipping value now that it's calculated
  orderItems.forEach(i => { i.productSnapshot.shipping = String(shippingAmount); });

  // COD: charge 2x shipping upfront via Razorpay, rest collected at delivery
  const isCOD = reqPaymentMethod === "COD";
  const codPartialAmount = isCOD ? Math.min(Math.ceil(shippingAmount) * 2, Math.ceil(finalAmount)) : 0;
  const codRemainingAmount = isCOD ? Math.max(0, Math.ceil(finalAmount) - codPartialAmount) : 0;
  const razorpayChargeAmount = isCOD ? codPartialAmount : finalAmount;
  // Round to whole rupees first, then convert to paise — must match the amount
  // returned to the client/stored below, or Razorpay Checkout rejects it as a mismatch.
  const razorpayChargeAmountPaise = Math.ceil(razorpayChargeAmount) * 100;

  const razorpayOrder = await razorpayCreateOrderService(razorpayChargeAmountPaise, "INR");

  const guestEmail = guestInfo.email.toLowerCase().trim();

  const order = await Order.create({
    orderId: uuidv7(),
    userEmail: guestEmail,
    userId: `guest_${uuidv7()}`,
    userName: guestInfo.name.trim(),
    userMobile: cleanMobile,
    items: orderItems,
    amount: finalAmount,
    shippingInfo: {
      amount: shippingAmount,
      type: shippingResult?.type || "standard",
      expectedNoOfBoxes: shippingResult?.expectedNoOfBoxes || 0,
      totalWeight: shippingResult?.totalWeight || 0,
      serviceName: shippingResult?.serviceName || null
    },
    senderMobile: cleanMobile,
    receiverMobile: cleanMobile,
    deliveryAddress: {
      fullName: guestInfo.name.trim(),
      mobileNumber: cleanMobile,
      formattedAddress: deliveryAddress.formattedAddress || "",
      deliveryAddressFull: deliveryAddress.deliveryAddressFull || deliveryAddress.formattedAddress || "",
      pinCode: deliveryAddress.pinCode ? parseInt(String(deliveryAddress.pinCode), 10) : null,
      landmark: deliveryAddress.landmark || "",
      flatOrFloorNumber: deliveryAddress.flatOrFloorNumber || "",
      lat: deliveryAddress.lat || 0,
      long: deliveryAddress.long || 0,
    },
    payment: { razorpayOrderId: razorpayOrder?.data?.id },
    status: "CREATED",
    paymentMethod: isCOD ? "COD" : "PREPAID",
    codDetails: isCOD ? { partialAmountPaid: codPartialAmount, remainingAmount: codRemainingAmount } : undefined,
    isGuestOrder: true,
    guestInfo: { name: guestInfo.name.trim(), email: guestEmail, mobile: cleanMobile },
    metaTracking: collectMetaTracking(req),
  });

  return res.status(200).json(
    new ApiRes(
      200,
      "Guest order created",
      {
        orderId: order.orderId,
        razorpayOrderId: razorpayOrder?.data?.id,
        amount: razorpayChargeAmountPaise,
        currency: "INR",
        paymentMethod: isCOD ? "COD" : "PREPAID",
        codDetails: isCOD ? { partialAmountPaid: codPartialAmount, remainingAmount: codRemainingAmount } : null,
        senderMobile: cleanMobile,
        receiverMobile: cleanMobile,
      },
      true,
    ),
  );
});

export {
  razorpayCreateOrderController,
  razorpayKeyGetController,
  razorpayWebHookController,
  guestCreateOrderController,
};
