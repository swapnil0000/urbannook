import { fulfilCapturedPayment, UNPAID_STATUSES } from "./rp.payment.controller.js";
import { razorpayFetchOrderPaymentsService } from "../services/rp.payement.service.js";
import {
  addToCartService,
  getCartService,
  cartQuantityService,
  clearCartService,
  toggleGiftWrapService,
} from "../services/user.cart.service.js";
import { ApiRes } from "../utils/index.js";
import Order from "../model/order.model.js";
import Product from "../model/product.model.js";
import ShipmentRecord, { CUSTOMER_SHIPMENT_FIELDS } from "../model/shipment.record.model.js";
import ResolutionCase, { CUSTOMER_CASE_FIELDS } from "../model/resolution.case.model.js";
import { buildOrderView, buildOrderSummary } from "../services/orderView.service.js";
import env from "../config/envConfigSetup.js";
import { claimPaidGuestOrders } from "../services/guest.order.claim.service.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import {
  AuthenticationError,
  ValidationError,
  NotFoundError,
} from "../utils/errors.js";
import html_to_pdf from "html-pdf-node";
import { generateInvoiceHtmlTemplate } from "../template/invoiceTemplate.template.js";
import {
  getInvoicePresignedUrl,
  uploadInvoiceToS3,
} from "../utils/s3.utils.js";

const userAddToCart = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { productId, productQuanity, quantity, color, variant, image } = req.body;

  const result = await addToCartService({
    userId,
    productId,
    productQuanity: Number(productQuanity || quantity || 1),
    variant: variant || color || "N/A", 
    image,
  });

  res.setHeader("X-Server-Version", "2.0-Strict-Variant");
  return res
    .status(result.statusCode)
    .json(
      new ApiRes(
        result.statusCode,
        result.message,
        result.data,
        result.success,
      ),
    );
});

const userGetCart = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const result = await getCartService({ userId });

  res.setHeader("X-Server-Version", "2.0-Strict-Variant");
  return res
    .status(result.statusCode)
    .json(
      new ApiRes(
        result.statusCode,
        result.message,
        result.data,
        result.success,
      ),
    );
});

const userUpdateCartQuantity = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { productId, quantity, action, color, variant, image } = req.body || {};

  const result = await cartQuantityService({
    userId,
    productId,
    quantity: quantity || 1,
    action,
    variant: variant || color,
    image,
  });

  return res
    .status(result.statusCode)
    .json(
      new ApiRes(
        result.statusCode,
        result.message,
        result.data,
        result.success,
      ),
    );
});

const userClearCart = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const result = await clearCartService({ userId });

  return res
    .status(result.statusCode)
    .json(
      new ApiRes(
        result.statusCode,
        result.message,
        result.data,
        result.success,
      ),
    );
});

const userToggleGiftWrap = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { selected, noteOptions } = req.body || {};
  const result = await toggleGiftWrapService({ userId, selected, noteOptions });

  return res
    .status(result.statusCode)
    .json(new ApiRes(result.statusCode, result.message, null, result.success));
});

// The customer's orders, with the unpaid ones reconciled against Razorpay. Shared by the history and summary endpoints.
const loadUserOrderHistory = async (userId) => {
  // Ownership comes from authentication, not a mutable checkout email.
  // Retry claiming here so login-before-payment and login-after-payment both work.
  // A claim failure must not hide already-owned orders.
  try {
    await claimPaidGuestOrders(userId);
  } catch {
    console.error('[ORDER HISTORY] Guest order claim failed; serving owned orders');
  }
  const allOrders = await Order.find({ userId })
    .sort({ createdAt: -1 })
    .lean()
    .select("-_id");

  // An unpaid status here is only what the webhooks told us. A customer who
  // paid while the webhook is late or lost (or paid on a retry after a failed
  // attempt) would see "Failed" — so check recent unpaid orders with Razorpay,
  // same as the order-status poll does. Unpaid checkout attempts that never
  // took money are not orders, so they are left out of the list.
  const RECONCILE_WINDOW_MS = 48 * 60 * 60 * 1000;
  const orders = [];
  for (const o of allOrders) {
    if (!UNPAID_STATUSES.includes(o.status)) {
      orders.push(o);
      continue;
    }
    const rpOrderId = o.payment?.razorpayOrderId;
    const isRecent = Date.now() - new Date(o.createdAt).getTime() < RECONCILE_WINDOW_MS;
    if (!rpOrderId || !isRecent) continue;

    const payments = await razorpayFetchOrderPaymentsService(rpOrderId);
    const captured = payments?.find((p) => p.status === "captured");
    if (captured) {
      const doc = await Order.findOne({ "payment.razorpayOrderId": rpOrderId });
      const paid = await fulfilCapturedPayment(doc, captured);
      const { _id, ...rest } = paid.toObject ? paid.toObject() : paid;
      orders.push({ ...rest, status: "PAID" });
    } else if (payments?.some((p) => p.status === "authorized")) {
      orders.push({ ...o, status: "PROCESSING" });
    }
  }
  return orders;
};

const userOrderPreviousHistory = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  if (!userId) {
    throw new AuthenticationError("Unauthorized");
  }
  const orders = await loadUserOrderHistory(userId);

  return res.status(200).json(
    new ApiRes(
      200,
      orders.length === 0
        ? "No orders placed yet"
        : "Orders fetched successfully",
      {
        totalOrders: orders.length,
        orders,
      },
      true,
    ),
  );
});

// ── Customer order view (confirmation page, details page, archive) ───────────
// One read per order: the frozen order, its shipment records and any refund /
// replacement cases, folded into the customer-safe contract of orderView.service.js.
// Financial and shipment data: never cached.
const noStore = (res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.set("Pragma", "no-cache");
};

const findOwnedOrder = async (userId, idOrRazorpayId) => {
  const key = String(idOrRazorpayId || "");
  if (!key || key.length > 80) return null;
  // The same order is linked to from checkout (Razorpay order id) and from history (our order id).
  return Order.findOne({ userId, $or: [{ orderId: key }, { "payment.razorpayOrderId": key }] }).lean();
};

const getOrderView = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  noStore(res);

  let order = await findOwnedOrder(userId, req.params.orderId);
  // Not found and not yours look identical — never confirm an order exists to someone who doesn't own it.
  if (!order) throw new NotFoundError("Order not found");

  // Same rule as the status poll: for an unpaid order ask Razorpay before saying "pending" or "failed".
  if (UNPAID_STATUSES.includes(order.status) && order.payment?.razorpayOrderId) {
    try {
      const payments = await razorpayFetchOrderPaymentsService(order.payment.razorpayOrderId);
      const captured = payments?.find((p) => p.status === "captured");
      if (captured) {
        const doc = await Order.findOne({ orderId: order.orderId });
        await fulfilCapturedPayment(doc, captured);
        order = await Order.findOne({ orderId: order.orderId }).lean();
      }
    } catch {
      console.error("[ORDER VIEW] Razorpay check failed; showing the stored state");
    }
  }

  // Tracking and refund data are optional enrichments: if either read fails the order still renders.
  const [shipments, cases] = await Promise.all([
    ShipmentRecord.find({ sourceOrderId: order.orderId }).select(CUSTOMER_SHIPMENT_FIELDS).lean().catch(() => []),
    ResolutionCase.find({ orderId: order.orderId }).select(CUSTOMER_CASE_FIELDS).lean().catch(() => []),
  ]);

  return res.status(200).json(new ApiRes(200, "Order", buildOrderView({ order, shipments, cases, trackUrlTemplate: env.SHIPMOZO_TRACK_URL }), true));
});

const getOrderSummaries = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  noStore(res);
  const orders = await loadUserOrderHistory(userId);
  const ids = orders.map((o) => o.orderId);

  // Two batched reads for the whole list; the full tracking history is left out on purpose.
  const [shipments, cases] = ids.length
    ? await Promise.all([
        ShipmentRecord.find({ sourceOrderId: { $in: ids } })
          .select("sourceOrderId cloneSeq itemIndexes shipmentStatus awbNumber isCancelled shipmentDirection expectedDeliveryDate lastTrackedAt dispatchConfirmedAt")
          .lean()
          .catch(() => []),
        ResolutionCase.find({ orderId: { $in: ids } }).select(CUSTOMER_CASE_FIELDS).lean().catch(() => []),
      ])
    : [[], []];

  const group = (rows, key) => rows.reduce((m, r) => ((m[r[key]] ||= []).push(r), m), {});
  const shipmentsByOrder = group(shipments, "sourceOrderId");
  const casesByOrder = group(cases, "orderId");

  const summaries = orders.map((order) =>
    buildOrderSummary(buildOrderView({ order, shipments: shipmentsByOrder[order.orderId] || [], cases: casesByOrder[order.orderId] || [], trackUrlTemplate: env.SHIPMOZO_TRACK_URL })),
  );
  return res.status(200).json(new ApiRes(200, "Orders", { totalOrders: summaries.length, orders: summaries }, true));
});

// "Complete your collection": what the shop owner linked to the products in this order, minus what was already bought.
const getOrderRecommendations = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  noStore(res);
  const order = await findOwnedOrder(userId, req.params.orderId);
  if (!order) throw new NotFoundError("Order not found");

  const bought = [...new Set((order.items || []).map((i) => String(i.productId)))];
  const owned = await Product.find({ productId: { $in: bought } }).select("recommendedProducts").lean();
  const recIds = [];
  for (const p of owned) for (const id of p.recommendedProducts || []) if (id && !bought.includes(String(id)) && !recIds.includes(String(id))) recIds.push(String(id));
  if (!recIds.length) return res.status(200).json(new ApiRes(200, "Recommendations", { products: [] }, true));

  const recs = await Product.find({ productId: { $in: recIds.slice(0, 24) }, isPublished: true, productStatus: { $ne: "out_of_stock" } })
    .select("-_id -createdAt -updatedAt -__v")
    .lean();
  const byId = new Map(recs.map((p) => [String(p.productId), p]));
  const products = recIds.map((id) => byId.get(id)).filter(Boolean).slice(0, 8);
  return res.status(200).json(new ApiRes(200, "Recommendations", { products }, true));
});

const getOrderStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  // Validate required fields
  if (!orderId) {
    throw new ValidationError("Order ID and status are required");
  }

  // Find the order
  let order = await Order.findOne({ "payment.razorpayOrderId": orderId });

  if (!order) {
    console.log(
      `[WARN] Order not found for status update - Razorpay OrderId: ${orderId}`,
    );
    throw new NotFoundError("Order not found");
  }

  // Our status only moves when a webhook lands. A retry that paid after a
  // failed first attempt, a late webhook or a lost one would otherwise show a
  // paying customer "failed" — so for anything unpaid, ask Razorpay directly.
  let status = order.status;
  if (UNPAID_STATUSES.includes(order.status)) {
    const payments = await razorpayFetchOrderPaymentsService(orderId);
    if (payments) {
      const captured = payments.find((p) => p.status === "captured");
      if (captured) {
        order = await fulfilCapturedPayment(order, captured);
        status = "PAID";
      } else if (payments.some((p) => p.status === "authorized" || p.status === "created")) {
        // Money is on its way (authorized, capture pending) — keep polling
        status = "PROCESSING";
      }
    }
  }

  return res.status(200).json(
    new ApiRes(
      200,
      "Order status",
      {
        orderId: order.orderId,
        status,
        isGuestOrder: order.isGuestOrder ?? false,
        ...(order.isGuestOrder && status === "PAID" && order.guestInfo?.email
          ? { guestEmail: order.guestInfo.email, isNewGuestAccount: order.isNewGuestAccount ?? true }
          : {}),
      },
      true,
    ),
  );
});

const generateOrderInvoice = asyncHandler(async (req, res) => {
  const { razorpayOrderId } = req.body;
  const { userId } = req.user;

  if (!razorpayOrderId) {
    throw new ValidationError("Order ID is required");
  }

  const order = await Order.findOne({
    "payment.razorpayOrderId": razorpayOrderId,
    userId,
  }).lean();

  if (!order) throw new NotFoundError("Order not found");

  if (order.status !== "PAID")
    throw new ValidationError("Invoice only available for paid orders");

  let fileKey = order.invoiceData?.s3FileKey;
  if (!order.invoiceData || !order.invoiceData.isGenerated || !fileKey) {
    console.log(
      `[INFO] Invoice not found in S3 for Order ${order.orderId}. Generating now...`,
    );

    const html = generateInvoiceHtmlTemplate(order);
    const file = { content: html };
    const options = {
      format: "A4",
      printBackground: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process",
      ],
    };

    const pdfBuffer = await html_to_pdf.generatePdf(file, options);

    fileKey = await uploadInvoiceToS3(pdfBuffer, order.userId, order.orderId);
    order.invoiceData = {
      isGenerated: true,
      s3FileKey: fileKey,
    };
    await order.save();
  }
  const downloadUrl = await getInvoicePresignedUrl(fileKey);
  return res.status(200).json({
    success: true,
    data: {
      url: downloadUrl,
    },
    message: "Invoice ready for download",
  });
});

// NEW: Merge guest cart items with user cart
const userMergeGuestCart = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { guestItems } = req.body;

  if (!guestItems || !Array.isArray(guestItems)) {
    throw new ValidationError("guestItems must be an array");
  }

  const { mergeGuestCartService } = await import("../services/user.cart.service.js");
  const result = await mergeGuestCartService({ userId, guestItems });

  return res
    .status(result.statusCode)
    .json(
      new ApiRes(
        result.statusCode,
        result.message,
        result.data,
        result.success,
      ),
    );
});

export {
  userAddToCart,
  userGetCart,
  userUpdateCartQuantity,
  userClearCart,
  userOrderPreviousHistory,
  getOrderStatus,
  getOrderView,
  getOrderSummaries,
  getOrderRecommendations,
  generateOrderInvoice,
  userMergeGuestCart,
  userToggleGiftWrap,
};
