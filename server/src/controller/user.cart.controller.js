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

const userAddToCart = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { productId, productQuanity, selectedColor } = req.body;

  const result = await addToCartService({
    userId,
    productId,
    productQuanity: productQuanity || 1,
    selectedColor,
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
  const { productId, quantity, action } = req.body || {};

  const result = await cartQuantityService({
    userId,
    productId,
    quantity: quantity || 1,
    action,
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

  if (!userId) {
    throw new AuthenticationError("Unauthorized");
  }

  const orders = await Order.find({ userId })
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

  // Allow invoice for any order that has been paid (not CREATED, FAILED, or CANCELLED)
  if (order.status !== "PAID")
    throw new ValidationError("Invoice only available for paid orders");

  const html = `
  <html>
  <head>
    <meta charset="UTF-8" />
    <script src="https://cdn.tailwindcss.com"></script>
  </head>

  <body class="bg-gray-100 p-10">
    <div class="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">

      <div class="bg-[#F5DEB3] p-8">
        <h1 class="text-3xl font-bold text-[#1C3026]">UrbanNook</h1>
        <p class="text-[#1C3026] mt-1">Invoice</p>
      </div>

      <div class="p-10 text-sm text-gray-700">

        <div class="flex justify-between mb-8">
          <div>
            <p><strong>Invoice No:</strong> INV-${order.orderId.slice(-6)}</p>
            <p><strong>Order ID:</strong> ${order.orderId}</p>
            <p><strong>Date:</strong> ${new Date(order.createdAt).toDateString()}</p>
            <p><strong>Status:</strong> ${order.status}</p>
          </div>
          <div class="text-right">
            <p><strong>Email:</strong> ${order.userEmail}</p>
            <p><strong>User ID:</strong> ${order.userId}</p>
            <p><strong>Payment ID:</strong> ${order.payment.razorpayPaymentId}</p>
          </div>
        </div>

        <table class="w-full border rounded-lg overflow-hidden">
          <thead>
            <tr class="bg-[#1C3026] text-white">
              <th class="p-4 text-left">Item</th>
              <th class="p-4 text-center">Qty</th>
              <th class="p-4 text-center">Price</th>
              <th class="p-4 text-center">Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items
              .map((item) => {
                const s = item.productSnapshot;
                const qty = s.quantity || 1;
                const price = s.priceAtPurchase || 0;
                const total = qty * price;
                return `
                <tr class="border-b">
                  <td class="p-4">${s.productName}</td>
                  <td class="p-4 text-center">${qty}</td>
                  <td class="p-4 text-center">₹${price}</td>
                  <td class="p-4 text-center">₹${total}</td>
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>

        ${
          order.coupon?.isApplied
            ? `
          <div class="mt-6">
            <p><strong>Coupon:</strong> ${order.coupon.couponCodeName}</p>
            <p><strong>Discount:</strong> ₹${order.coupon.discountAmount}</p>
          </div>
        `
            : ""
        }

        <div class="flex justify-end mt-8">
          <div class="bg-[#F5DEB3] p-6 rounded-xl w-72">
            <p class="flex justify-between">
              <span>Subtotal:</span>
              <span>₹${order.amount}</span>
            </p>
            <p class="flex justify-between">
              <span>Discount:</span>
              <span>₹${order.coupon?.discountAmount || 0}</span>
            </p>
            <hr class="my-3 border-[#1C3026]" />
            <p class="flex justify-between font-bold text-lg text-[#1C3026]">
              <span>Grand Total:</span>
              <span>₹${order.amount}</span>
            </p>
          </div>
        </div>

        <div class="mt-12 text-center text-gray-500 text-xs">
          Thank you for shopping with UrbanNook.
        </div>

      </div>
    </div>
  </body>
  </html>
  `;

  const file = { content: html };
  const options = { format: "A4" };

  const pdfBuffer = await html_to_pdf.generatePdf(file, options);

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename=invoice-${order.orderId}.pdf`,
  });

  res.send(pdfBuffer);
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
