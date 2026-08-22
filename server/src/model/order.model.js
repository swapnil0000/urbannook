import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String },
    userMobile: { type: String },

    orderId: { type: String, required: true },
    items: [
      {
        _id: false,
        productId: { type: String, required: true },


        /* Saving this because the price could be changed when the user is viewing the history */
        productSnapshot: {
          productName: { type: String, required: true },
          productImg: { type: String, required: true },
          quantity: { type: Number, required: true, min: 1 },
          productCategory: String,
          productSubCategory: String,
          priceAtPurchase: { type: Number, required: true },
          shipping: String,
          selectedVariant: { type: String, default: "N/A" },
          // Snapshotted at purchase time so a later admin edit to the
          // product's template can't retroactively change how a past order
          // reads. Blank = order predates this field, or product never set one.
          variantTitleTemplate: { type: String, default: "" },
        },
      },
    ],
    invoiceData: {
      isGenerated: { type: Boolean, default: false },
      s3FileKey: { type: String, default: null },
    },
    amount: { type: Number, required: true },
    coupon: {
      couponCodeId: { type: String, default: null },
      couponCodeName: { type: String, default: null },
      discountAmount: { type: Number, default: 0 },
      isApplied: { type: Boolean, default: false },
    },

    // Denormalized snapshot for fast order-history display — see admin
    // repo's order.model.js for the field-by-field rationale. LoyaltyLedger
    // (this collection, shared) is always the balance source of truth.
    loyalty: {
      balanceBeforeOrder: { type: Number, default: 0 },
      pointsRedeemed: { type: Number, default: 0 },
      discountFromPoints: { type: Number, default: 0 },
      balanceAfterRedeem: { type: Number, default: 0 },

      pointsEarned: { type: Number, default: 0 },
      isEarnCredited: { type: Boolean, default: false },
      earnCreditedAt: { type: Date, default: null },
      balanceAfterEarn: { type: Number, default: null },
    },
    deliveryAddress: {
      addressId: String,
      fullName: String,
      mobileNumber: String,
      addressLine: String,
      city: String,
      state: String,
      formattedAddress: String,
      deliveryAddressFull: String, // canonical user-built string for ShipMozo/couriers
      lat: Number,
      long: Number,
      landmark: String,
      flatOrFloorNumber: String,
      pinCode: Number,
    },
    shippingInfo: {
      amount: { type: Number, default: 0 },
      type: { type: String, enum: ["standard", "dynamic"], default: "standard" },
      expectedNoOfBoxes: { type: Number, default: 0 },
      totalWeight: { type: Number, default: 0 }, // in grams
      serviceName: { type: String, default: null }
    },

    senderMobile: {
      type: String,
      required: false,
      validate: {
        validator: function (v) {
          return !v || /^[0-9]{10}$/.test(v);
        },
        message: "Sender mobile must be exactly 10 digits",
      },
    },

    receiverMobile: {
      type: String,
      required: false,
      validate: {
        validator: function (v) {
          return !v || /^[0-9]{10}$/.test(v);
        },
        message: "Receiver mobile must be exactly 10 digits",
      },
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
      enum: [
        "CREATED",
        "PAID",
        "CONFIRMED",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
        "FAILED",
      ],
      default: "CREATED",
    },

    statusHistory: [
      {
        _id: false,
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String, default: "" },
      },
    ],
    trackingInfo: {
      carrier: { type: String, default: null },
      trackingNumber: { type: String, default: null },
      estimatedDelivery: { type: Date, default: null },
    },

    // Admin-owned fields (admin repo's order.controller.js is the only writer).
    // Declared here read-only so the storefront can display delivery state and
    // the loyalty earn-cron's anchor timestamp on the order-history page.
    fulfillmentStatus: {
      type: String,
      enum: ["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"],
      default: "PROCESSING",
    },
    fulfillmentDeliveredAt: { type: Date, default: null },

    paymentMethod: {
      type: String,
      enum: ["PREPAID", "COD"],
      default: "PREPAID",
    },
    codDetails: {
      partialAmountPaid: { type: Number, default: 0 },
      remainingAmount: { type: Number, default: 0 },
    },

    isGuestOrder: { type: Boolean, default: false },
    isNewGuestAccount: { type: Boolean, default: false },
    guestInfo: {
      name: { type: String, default: null },
      email: { type: String, default: null },
      mobile: { type: String, default: null },
    },
    metaTracking: {
      fbp: { type: String, default: null },
      fbc: { type: String, default: null },
      clientIp: { type: String, default: null },
      clientUserAgent: { type: String, default: null },
      eventSourceUrl: { type: String, default: null },
    },
  },
  { timestamps: true },
);

orderSchema.index({ orderId: 1 }, { unique: true });
orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ userId: 1, createdAt: -1 }); // Compound index for user order history
orderSchema.index({ "payment.razorpayOrderId": 1 });
orderSchema.index({ "payment.razorpayPaymentId": 1 });
orderSchema.index({ createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);
export default Order;
