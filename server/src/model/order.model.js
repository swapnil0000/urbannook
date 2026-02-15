import mongoose from "mongoose";
const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
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

    // Coupon snapshot
    coupon: {
      couponCodeId: {
        type: String,
        default: null,
      },
      couponCodeName: {
        type: String,
        default: null,
      },
      discountAmount: {
        type: Number,
        default: 0,
      },
      isApplied: {
        type: Boolean,
        default: false,
      },
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
      errorCode: String,
      errorDescription: String,
    },

    status: {
      type: String,
      enum: ["CREATED", "PAID", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "FAILED"],
      default: "CREATED",
    },

    statusHistory: [
      {
        _id: false,
        status: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        note: {
          type: String,
          default: "",
        },
      },
    ],

    trackingInfo: {
      carrier: {
        type: String,
        default: null,
      },
      trackingNumber: {
        type: String,
        default: null,
      },
      estimatedDelivery: {
        type: Date,
        default: null,
      },
    },
  },
  { timestamps: true },
);
// Indexes for performance optimization
orderSchema.index({ orderId: 1 }, { unique: true });
orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ userId: 1, createdAt: -1 }); // Compound index for user order history
orderSchema.index({ "payment.razorpayOrderId": 1 });
orderSchema.index({ "payment.razorpayPaymentId": 1 });
orderSchema.index({ createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);
export default Order;
