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
          // Stable identifier for the exact variant purchased — set at order
          // time and never changed afterward, unlike selectedVariant (a display
          // name an admin can rename later). Blank = order predates this field.
          variantSku: { type: String, default: "" },
        },
      },
    ],
    invoiceData: {
      isGenerated: { type: Boolean, default: false },
      s3FileKey: { type: String, default: null },
    },
    // Seasonal gift-wrap add-on (not a catalog product — see
    // utils/giftWrapOffer.util.js). price is snapshotted from the live offer
    // config at order-creation time, exactly like productSnapshot.priceAtPurchase
    // above, and is what's actually included in `amount`.
    giftWrap: {
      selected: { type: Boolean, default: false },
      price: { type: Number, default: 0 },
      quantity: { type: Number, default: 0 },
      title: { type: String, default: "" },
      // Which note(s) the customer picked when adding gift wrap (multi-select).
      noteOptions: { type: [String], default: ["none"] },
    },
    amount: { type: Number, required: true },
    coupon: {
      couponCodeId: { type: String, default: null },
      couponCodeName: { type: String, default: null },
      discountAmount: { type: Number, default: 0 },
      isApplied: { type: Boolean, default: false },
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
    // Razorpay Magic Checkout (1CC) order: the address and the final shipping
    // fee arrive from Razorpay after payment, so the webhook fills
    // deliveryAddress instead of order-create. Always PREPAID.
    isMagicOrder: { type: Boolean, default: false },
    // An INTERNAL_TEST coupon pins the order at ₹1. Kept on the order so the
    // Magic serviceability callback can answer ₹0 shipping — otherwise
    // Razorpay adds a real shipping fee on top and the test order is no
    // longer ₹1.
    isInternalTestOrder: { type: Boolean, default: false },
    // Whether free shipping was unlocked when the order was created (offer,
    // cart rule, or subtotal threshold). Magic rates shipping in a later
    // callback, which cannot see the cart rules — without this the customer
    // is charged shipping the cart told them they would not pay.
    freeShippingUnlocked: { type: Boolean, default: false },
    guestInfo: {
      name: { type: String, default: null },
      email: { type: String, default: null },
      mobile: { type: String, default: null },
    },
    metaTracking: {
      fbp: { type: String, default: null },
      fbc: { type: String, default: null },
      // Persistent per-browser device id. Declared explicitly because Mongoose
      // strict mode silently drops undeclared nested paths — collectMetaTracking
      // in rp.payment.controller.js has always sent this, but without this line
      // it never reached the DB, so the guest CAPI externalId fallback and
      // channel attribution on the server-side purchase both had nothing to use.
      anonymousId: { type: String, default: null },
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
