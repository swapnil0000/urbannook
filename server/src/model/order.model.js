import mongoose from "mongoose";
const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    orderId: {
      type: String,
      required: true,
    },
    items: [
      {
        _id: false,
        productId: {
          type: String,
          required: true,
        },
        /* Saving this because the price could be changed when the user is viewing the history */
        productSnapshot: {
          productName: { type: String, required: true },
          productImg: { type: String, required: true },
          quantity: {
            type: Number,
            required: true,
            min: 1,
          },
          productCategory: String,
          productSubCategory: String,
          priceAtPurchase: {
            type: Number,
            required: true,
          },
        },
      },
    ],

    amount: {
      type: Number,
      required: true,
    },
    deliveryAddress: {
      addressId: String,
      formattedAddress: String,
      lat: Number,
      long: Number,
    },

    payment: {
      razorpayOrderId: String,
      razorpayPaymentId: String,
      razorpaySignature: String,
    },

    status: {
      type: String,
      enum: ["CREATED", "PAID", "FAILED"],
      default: "CREATED",
    },
  },
  { timestamps: true },
);
orderSchema.index({ userId: 1, status: 1 });
orderSchema.index({ "payment.razorpayOrderId": 1 });
orderSchema.index({ createdAt: -1 });
const Order = mongoose.model("Order", orderSchema);
export default Order;
