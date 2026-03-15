import {
  addToCartService,
  getCartService,
  cartQuantityService,
  clearCartService,
} from "../services/user.cart.service.js";
import { ApiRes } from "../utils/index.js";
import Order from "../model/order.model.js";
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
  const { productId, productQuanity, quantity, color } = req.body;

  const result = await addToCartService({
    userId,
    productId,
    productQuanity: productQuanity || quantity || 1,
    color,
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

const userGetCart = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const result = await getCartService({ userId });

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
  const { productId, quantity, action, color } = req.body || {};

  const result = await cartQuantityService({
    userId,
    productId,
    quantity: quantity || 1,
    action,
    color,
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

const userOrderPreviousHistory = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { userEmail } = req.body;
  
  if (!userId) {
    throw new AuthenticationError("Unauthorized");
  }

  const query = { userId };
  if (userEmail) {
    query.userEmail = userEmail;
  }  
  
  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .lean()
    .select("-_id");

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

const getOrderStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  // Validate required fields
  if (!orderId) {
    throw new ValidationError("Order ID and status are required");
  }

  // Find the order
  const order = await Order.findOne({ "payment.razorpayOrderId": orderId });

  if (!order) {
    console.log(
      `[WARN] Order not found for status update - Razorpay OrderId: ${orderId}`,
    );
    throw new NotFoundError("Order not found");
  }

  return res.status(200).json(
    new ApiRes(
      200,
      "Order status",
      {
        orderId: order.orderId,
        status: order.status,
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

export {
  userAddToCart,
  userGetCart,
  userUpdateCartQuantity,
  userClearCart,
  userOrderPreviousHistory,
  getOrderStatus,
  generateOrderInvoice,
};
